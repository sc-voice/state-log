import { MerkleJson } from "merkle-json/index.js"

/**
 * StateLog is a logger that uses a compact JSON data representation
 * for applications requiring periodic logging.
 * StateLog instances only grow when state changes.
 * 
 * ### Discrete Time Axis
 * StateLog relies on an infinite discrete time axis to log 
 * periodic events separated by a client-defined interval. 
 * The client must therefore provide exactly one state update 
 * for each interval. Logged states increases in age until
 * they change. State change is determined by a Merkle tree hash.
 * The default state is *undefined*.
 *
 * ### Syncronization
 * Synchronization of updates is a responsibility shared between
 * client and StateLog. The client is responsible for periodic
 * logging--StateLog is NOT designed for intermittent ad-hoc logging.
 * Although periodic logging is required, strict adherence to 
 * discrete time points is not required. StateLog will deduce the
 * discrete time point correspoinding to each update.
 * Clients should therefore be aware that the time of any logged event
 * is recorded at the granularity of the logging interval, not the actual
 * time of the event. Updates made at the beginning of an interval
 * will have the *same discrete timestamp* as updates made at the
 * end of an interval.
 * 
 * Because discrete time points are used for logging, StateLog 
 * will handle delayed logging provided the delay does not
 * exceed a full interval. 
 *
 * Finally, if logging is interrupted for more than an interval,
 * Statelog will automatically an *undefined* state for the duration
 * of the logging gap as soon as the next update arrives.
 */
export class StateLog {
  /**
   * Create a StateLog for a given interval.
   * Create a StateLog from its serialized JSON representation.
   * @param {object} opts - REQUIRED: named options
   * @param {milliseconds} opts.interval - REQUIRED: sampling period in millisecods (1000)
   * @param {Date} opts.date - JSON: current sample state date (current Date)
   * @param {JSON} opts.state - JSON: sample state (undefined)
   * @param {array} opts.history - JSON: past states ([])
   * @param {guid} opts.hash - JSON: Merkle hash of state
   * @param {numberOfIntervals} opts.age - JSON: state duration (1)
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

  /**
   * Update StateLog with new state for given date/time.
   * For proper synchronization, update the StateLog
   * at the interval defined for the StateLog.
   * 
   * @param {serializable} newState - state at given date
   * @param {Date} newDate - date of given state
   * @returns this
   */
  update(newState, newDate=new Date()) {
    const msg = 'StateLog.update() ';
    let { interval, age, ml, hash, date, } = this;
    let state = newState;
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
    }

    if (hash !== newHash) {
      if (dAge > 1) {
        this.history.push({ age: dAge-1, state: undefined, });
        this.age = 1;
      }
      this.state = state;
      this.hash = newHash;
      this.age = 1;
    } else {
      if (dAge > 1) {
        this.history.push({ age: dAge-1, state: undefined });
        this.age = 1;
      } else {
        this.age += dAge;
      }
    }

    // synchronized to interval date
    let syncDate = new Date(date.getTime() + dAge * interval);

    this.date = syncDate;

    return this;
  }

  /**
   * Generate an iterator over logged states
   * @param {object} opts - options
   * @param {Date} opts.endDate - do not show states older than endDate
   * @returns {Iterator} 
   */
  stateGenerator(opts={}) {
    const msg = 'StateLog.stateGenerator() ';
    let { history, interval, date, age, state } = this;
    let { endDate } = opts;
    let length = history.length;
    let age_ms = age * interval;
    let startDate = new Date(date.getTime() - age_ms + 1);
    let iHistory = length;

    return (function* () {
      if (iHistory === length) {
        iHistory--;
        yield  {
          age_ms, 
          date, 
          state,
        }
      }
     while (0 <= iHistory && (!endDate || endDate < startDate)) {
        let hist = history[iHistory];
        let age_ms = hist.age * interval;
        let date = new Date(startDate.getTime() - 1);
        startDate = new Date(startDate.getTime() - age_ms);
        iHistory--;
        yield {
          age_ms: hist.age * interval,
          state: hist.state,
          date,
        }
      }
    })();
  }

}
