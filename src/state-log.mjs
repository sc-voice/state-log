import { MerkleJson } from "merkle-json/index.js"
export default class StateLog {
  constructor(opts={}) {
    if (typeof opts === 'string') {
      opts = JSON.parse(opts);
    }
    let { 
      interval=1000, 
      date=Date.now(), 
      state, 
      history,
      hash,
      age=1,
    } = opts;

    if (history == null) {
      history = [];
    }
    if (typeof date === 'string') {
      date = new Date(date);
    }

    let ml = new MerkleJson();
    Object.defineProperty(this, "ml", {
      value: ml,
    });
    hash = hash || ml.hash(state);

    Object.assign(this, {
      interval, date, state, history, hash, age,
    });
  }

  update(newState, newDate=new Date()) {
    const msg = 'StateLog.update() ';
    let { interval, age, ml, hash, date } = this;
    let newHash = ml.hash(newState);
    if (newDate < date) {
      let emsg = `${msg} newDate must be after ${date}`;
      throw new Error(emsg);
    }
    let dtime = newDate.getTime() - date.getTime();
    let dinterval = Math.floor(dtime / interval);
    
    if (hash !== newHash) {
      this.history.push({
        age, 
        state:this.state,
      });
      this.state = newState;
      this.hash = newHash;
      this.age = Math.max(1,  dinterval);
    } else {
      this.age += Math.max(1, dinterval);
    }
    this.date = newDate;

    return this;
  }

  stateAt(aDate=new Date()) {
    const msg = 'StateLog.stateAt() ';
    let { interval, age, history, date, state:result } = this;
    let curDate = new Date(date.getTime() - interval*age + 1);
    for (let i=history.length-1; aDate < curDate && i>=0; i--) {
      let { age, state } = history[i];
      result = state;
      curDate = new Date(curDate.getTime() - interval*age);
    }
    return result;
  }

  stateHistory(intervals=1, endDate=new Date()) {
    const msg = 'StateLog.stateHistory() ';
    let history = [];
    let date = endDate;
    let { interval } = this;

    while (intervals-- > 0) {
      let state = this.stateAt(date);
      history.push(state);
      date = new Date(date.getTime() - interval);
    }
    return history.reverse();
  }
}
