import { StateLog } from "./state-log.js"
import { logger } from "log-instance"

const CLASS = 'Monitor';
const TIMER_INTERVAL = 60 * 1000;

var timers = {};

/**
 * Class for monitoring server status.
 * Each instance defines the behavior for a particular 
 * monitoring interval.
 */
export class Monitor { 
  /**
   * Create a monitof for a time interval
   * @param {interval} monitoring period (milliseconds)
   */
  constructor(opts={}) {
    const msg = CLASS+'.ctor() ';
    let {
      interval = TIMER_INTERVAL, // milliseconds
    } = opts;
    logger.logInstance(this);

    Object.defineProperty(this, "probes", {
      value: [],
    });
    
    Object.defineProperty(this, "interval", {
      value: interval,
    });
  }

  /**
   * Start monitor
   */
  start() {
    const msg = CLASS+'.#start()';
    let { interval } = this;
    let timer = timers[interval];
    if (timer ) {
      let emsg = `${msg} existing Monitor @ ${interval}ms`;
      throw new Error(emsg);
    }
    this.started = new Date();
    timers[interval] = setInterval(()=>{ 
      this.#timerHandler(); 
    }, interval);
    this.info(msg, `@ ${interval/1000}s`);
  }

  /**
   * Stop monitoring and free up all resources.
   */
  stop() { 
    const msg = CLASS+'.clear()';
    let { interval } = this;
    let timer = timers[interval];
    if (timer) {
      this.info(msg, `shutting down monitor@${interval}`);
      clearInterval(timer);
      timers[interval] = undefined;
    }
    this.info(msg, 'monitor@${interval} is inactive');
  }

  #timerHandler() {
    const msg = CLASS+'.timerHandler() ';
    let { probes } = this;
    let date = new Date();
    let errorHandler = (e)=>{
      let state = {
        error:e.message,
        message: 'could not fetch json',
      }
    }

    for (let i=0; i < probes.length; i++) {
      let { jsonFilter, stateLog, url } = probes[i];
      fetch(url).then(res=>{
        let { status } = res;
        if (jsonFilter !== undefined) {
          res.json().then(json=>{
            json = StateLog.normalizeState(json, jsonFilter);
            let state = { status, json, };
            stateLog.update(state, date);
          }).catch(errorHandler);
        } else {
          let state = { status };
          stateLog.update(state, date);
        }
      }).catch(errorHandler);
    }
  }

  /**
   * Add a probe to monitor the given url
   * @param {url} url - resource to monitor
   * @param {StateLogProperties} jsonFilter - expect JSON response (see properties for StateLog.normalizeState()). If omitted, just record the status code. If null, record entire state.
   */
  probeUrl(opts={}) {
    const msg = CLASS+'.probeUrl() ';
    let { probes, interval } = this;
    let {
      url,
      jsonFilter,
    } = opts;

    if (probes.find(e=>e.url === url)) {
      throw new Error(`${msg} duplicate URL monitor ${url}`);
    }

    let stateLog = new StateLog({ interval });
    let probe = { 
      stateLog, 
      url, 
      jsonFilter,
    };
    probes.push(probe);
    this.info(msg, url);

    return probe;
  }

}
