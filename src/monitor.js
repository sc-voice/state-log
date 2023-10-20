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

    this.#start(interval);

    Object.defineProperty(this, "probes", {
      value: [],
    });
    
    Object.assign(this, {
      interval,
    });
  }

  /**
   * Stop monitoring and free up all resources.
   */
  terminate() { 
    const msg = CLASS+'.clear()';
    let { interval } = this;
    let timer = timers[interval];
    if (timer) {
      logger.info(msg, `shutting down monitor@${interval}`);
      clearInterval(timer);
    }
    logger.info(msg, 'monitor@${interval} is inactive');
  }

  #start(interval=TIMER_INTERVAL) {
    const msg = CLASS+'.#start()';
    let timer = timers[interval];
    if (timer ) {
      let emsg = `${msg} existing Monitor @ ${interval}ms`;
      throw new Error(emsg);
    }
    timers[interval] = setInterval(()=>{ 
      this.#timerHandler(); 
    }, interval);
    logger.info(msg, `@ ${interval/1000}s`);
  }

  async #timerHandler() {
    const msg = CLASS+'.timerHandler() ';
    let { probes } = this;
    for (let i=0; i < probes.length; i++) {
      let { stateLog, url } = probes[i];
      //let res = await fetch(url);
      console.log(msg, url, ); //res.status);
    }
  }

  monitorUrl(opts={}) {
    const msg = CLASS+'.monitorUrl() ';
    let { probes, interval } = this;
    let {
      url,
      properties,
    } = opts;

    if (probes.find(e=>e.url === url)) {
      throw new Error(`${msg} duplicate URL monitor ${url}`);
    }

    let stateLog = new StateLog({ interval, properties });
    let probe = { 
      stateLog, 
      url, 
    };
    probes.push(probe);
    logger.info(msg, url);

    return this;
  }

}
