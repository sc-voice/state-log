import { MerkleJson } from "merkle-json/index.js"

/**
 * Class for periodically logging state changes
 */
export class StateLog {
  /**
   * Create a StateLog for a given interval.
   * Create a StateLog from its serialized JSON representation.
   * @param {object} opts - REQUIRED: named options
   * @param {milliseconds} opts.interval - REQUIRED: sampling period in millisecods (1000)
   * @param {StateLogProperties} opts.properties - see normalizeState() 
   * @param {Date} opts.date - JSON: current sample state date (current Date)
   * @param {JSON} opts.state - JSON: sample state (undefined)
   * @param {array} opts.history - JSON: past states ([])
   * @param {guid} opts.hash - JSON: Merkle hash of state
   * @param {numberOfIntervals} opts.age - JSON: state duration (1)
   *
   */
  constructor(opts={}) {
    const msg = 'StateLog.ctor()';
    if (typeof opts === 'string') {
      opts = JSON.parse(opts);
    }
    let { 
      interval=1000, 
      date=new Date(),
      state, 
      history,
      hash,
      age=1,
      properties,
    } = opts;

    if (history == null) {
      history = [];
    }
    if (typeof date === 'string') {
      date = new Date(date);
    }

    if (properties && Object.keys(properties).length===0) {
      let eMsg = `${msg} properties argument has no keys`;
      throw new Error(eMsg);
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
   * Normalize given state for storage.
   * Normalization can remove unwanted properties.
   * Normalization can also trim property values. 
   * @param {serializable} state - raw state to be normalized
   * @param {StateLogProperties} properties - normalization parameters. 
   * @returns {serializable} normalized object
   *
   * * If properties.xyz is true, that property is included.
   * * If properties.xyz is a string, 
   * the string is converted to a regular expression and
   * the state value of that property is stripped of 
   * anything that does not matchthat regular expression.
   * * If properties.xyz is anything else an Error is thrown.
   * * If properties is null, the entire state is left as is.
   */
  static normalizeState(state, properties) {
    const msg = `StateLog.normalizeState()`;

    if (properties == null) {
      return state; 
    }

    if (typeof state === "object") {
      let normalized = {};
      Object.entries(properties).forEach(entry=>{
        let [ key, value ] = entry;
        let stateValue = state[key];

        if (value === true) {
          normalized[key] = stateValue;
        } else if (typeof value === 'string') {
          let re = new RegExp(value);
          if (stateValue != null) {
            let match = stateValue.match(re);
            normalized[key] = match ? match[0] : 'no-match';
          }
        } else {
          let emsg = `${msg} cannot normalize "${key}"`;
          console.log({entry, value, key, normalized});
          throw new Error(emsg);
        }
      });
      state = normalized;
    }
    return state;
  }

  /**
   * Update StateLog with new state for given date/time.
   * For proper synchronization, update the StateLog
   * at the interval defined for the StateLog.
   * 
   * @param {serializable} newState - state at given date
   * @param {Date} newDate - date of given state
   *
   * ### Syncronization
   * It's important to keep updates synchronized to
   * the expected intervals.
   * The given date doesn't need to be exact,
   * but it should "reasonably close".
   * For historical accuracy, the given dates must not deviate
   * from ideal "no-lag" update intervals by less than
   * one interval.
   * In particular, "known" state is only defined for
   * the single interval ending with the update.
   * Updates made after multiple intervals will
   * therefore automatically result in the *undefined*
   * state being logged for all the missing updates
   * prior to the actual update.
   */
  update(newState, newDate=new Date()) {
    const msg = 'StateLog.update() ';
    let { interval, age, ml, hash, date, properties } = this;
    let state = StateLog.normalizeState(newState, properties);
    let newHash = ml.hash(state);
    if (newDate < date) {
      let emsg = `${msg} newDate must be after ${date}`;
      throw new Error(emsg);
    }
    let dtime = newDate.getTime() - date.getTime();
    let dinterval = Math.floor(dtime / interval);
    let dAge = Math.max(1, dinterval);
    
    if (hash !== newHash) {
      this.history.push({ age, state:this.state, });
      if (dAge > 1) {
        this.history.push({ age: dAge-1, state: undefined, });
      }
      this.state = state;
      this.hash = newHash;
      this.age = 1;
    } else {
      if (dAge > 1) {
        this.history.push({ age: dAge-1, state: undefined, });
        this.age = 1;
      } else {
        this.age += dAge;
      }
    }

    // NOTE: logged date is synchronized to interval date
    this.date = new Date(date.getTime() + dAge * interval);

    return this;
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
