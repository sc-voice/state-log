import { StateLog } from "./state-log.js"
import { UrlProbe } from "./url-probe.js"
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
   * Start monitor. Currently this can only be called once
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

    for (let i=0; i < probes.length; i++) {
      probes[i].probe(date);
    }
  }

  /**
   * Add a probe to monitor the given url
   * @param {url} url - resource to monitor
   * @param {JsonFilter} jsonFilter - expect JSON response (see properties for UrlProbe.normalizeState()). If omitted, just record the status code. If null, record entire state.
   * @returns {Probe} probe
   *
   * * _probe.url_ the URL being probed
   * * _probe.jsonFilter_ see jsonFilter parameter
   * * _probe.stateLog_ StateLog instance
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
    let probe = new UrlProbe({ 
      stateLog, 
      url, 
      jsonFilter,
    });
    probes.push(probe);
    this.info(msg, url);

    return probe;
  }

}
