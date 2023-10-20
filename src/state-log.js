import { MerkleJson } from "merkle-json/index.js"

/**
 * Class for periodically logging state changes
 */
export class StateLog {
  /**
   * Create a StateLog for a given interval.
   * Create a StateLog from its serialized JSON representation.
   * @param {milliseconds} interval - REQUIRED: sampling period in millisecods (default 1000)
   * @param {Date} date - JSON: current sample date
   * @param {JSON} state - JSON: sample state
   * @param {array} history - JSON: past states
   * @param {guid} hash - JSON: Merkle hash of state
   * @param {numberOfIntervals} age - JSON: state duration
   */
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
      properties={},
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
      interval, date, state, history, hash, age, properties,
    });
  }

  /**
   * Update StateLog with new state for given date/time.
   * For proper synchronization, update the StateLog
   * at the interval defined for the StateLog.
   * The given date doesn't need to be exact,
   * but it should "reasonably close".
   * For historical accuracy, the given dates must not deviate
   * from ideal "no-lag" update intervals by less than
   * one interval.
   * 
   * @param {serializable} newState - state at given date
   * @param {Date} newDate - date of given state
   */
  update(newState, newDate=new Date()) {
    const msg = 'StateLog.update() ';
    let { interval, age, ml, hash, date, properties } = this;
    let state = this.normalizeState(newState, properties);
    let newHash = ml.hash(state);
    if (newDate < date) {
      let emsg = `${msg} newDate must be after ${date}`;
      throw new Error(emsg);
    }
    let dtime = newDate.getTime() - date.getTime();
    let dinterval = Math.floor(dtime / interval);
    let dAge = Math.max(1, dinterval);
    
    if (hash !== newHash) {
      this.history.push({
        age, 
        state:this.state,
      });
      this.state = state;
      this.hash = newHash;
      this.age = dAge;
    } else {
      this.age += dAge;
    }
    this.date = newDate;

    return this;
  }

  /**
   * Normalize given state for storage.
   * Normalization can remove unwanted properties.
   * Normalization can also trim property values. 
   * @param {serializable} state - raw state to be normalized
   * @param {object} properties - normalization parameters. 
   * @returns {serializable} normalized object
   *
   * If properties.xyz is true, that property is included.
   * If properties.xyz is a string, 
   * the string is converted to a regular expression and
   * the state value of that property is stripped of 
   * anything that does not matchthat regular expression.
   */
  normalizeState(state, properties=this.properties) {
    if (typeof state === "object") {
    }
    return state;
  }

  /**
   * Return state at given date
   * @param {Date} aDate
   */
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

  /**
   * Returns array of states corresponding to given time period
   * @param {int} intervals - number of intervals in historical period
   * @param {Date} endDate - history end date 
   */
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
