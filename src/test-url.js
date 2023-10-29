#!/usr/bin/env node
import { StateLog, Monitor } from '../index.js';
import { logger } from 'log-instance';
import JSON5 from 'json5';

const DEFAULT_URL = 
  "http://worldtimeapi.org/api/timezone/America/Los_Angeles";

function nap(ms) {
  return new Promise(resolve => setTimeout(()=>resolve(), ms));
}

export class TestUrl {
  constructor(opts={}) {
    let {
      heartbeatPeriod = 10 ,
      interval = 1000,
      jsonFilter,
      seconds = 60,
      url = DEFAULT_URL,
    } = opts;

    Object.assign(this, {
      logger, url, seconds, jsonFilter, heartbeatPeriod, interval,
    });
  }

  help() {
    console.log(`
NAME
        test-url - probe given URL repeatedly

SYNOPSIS
        test-url [OPTIONS] [URL]

DESCRIPTION
        Probes given URL at specified interval, reporting any change
        in server responses. If URL is not provided, environment URL
        is used. If enviroment URL is not provided, a known URL is used.

    -s, --seconds SECONDS
        Terminate program after given number of SECONDS. If SECONDS
        is zero, repeat indefinitely.  Default for SECONDS is 60.

    -hp, --heartbeat-period PERIOD
        Repeat heartbeat output every PERIOD intervals of unchanged 
        state.  If zero, do not emit heartbeat. Default is 10 seconds.

    -i, --interval PERIOD
        Repeat probe every PERIOD milliseconds. Default is 1000.

    -jf, --json-filter JSON5
        Normalize raw state with given JSON5 filter (see StateLog).
        Default filter is null, which does not normalize raw state.
`);}

  parseArgs(args) {
    for (let i=0; i < args.length; i++) {
      let arg = args[i];
      switch (arg) {
        case '--seconds':
        case '-s':
          this.seconds = Number(args[++i]);
          break;
        case '--heartbeat-period':
        case '-hp':
          this.heartbeatPeriod = Number(args[++i]);
          break;
        case '--interval':
        case '-i':
          this.interval = Number(args[++i]);
          break;
        case '--help':
        case '-?':
          this.help();
          return null;
        case '--json-filter':
        case '-jf': {
          let json = args[++i];
          this.jsonFilter = JSON5.parse(json);
          }; break;
        default:
          if (arg.startsWith('-')) {
            let eMsg = `Unknown option ${arg}`;
            throw new Error(eMsg);
          }
          this.url = new URL(arg);
          break;
      }
    }
    if (this.url === DEFAULT_URL) {
      if (this.jsonFilter == null) {
        this.jsonFilter = {
          datetime:'.*T[0-9]+:[0-9]+',
        }
      }
    }

    return this;
  }

  async monitor() {
    let { 
      heartbeatPeriod, logger, interval, seconds, jsonFilter, url, 
    } = this;
    let monitor = new Monitor({interval});
    let probe = monitor.probeUrl({url, jsonFilter});
    let { stateLog } = probe;

    monitor.start();
    let hash = "nohash";
    let timer = setInterval(()=>{
      let prefix = new Date().toLocaleString();
      if (stateLog.hash !== hash) {
        let { state } = probe.stateLog;
        logger.info('state:', JSON.stringify(state, null, 2));
        hash = stateLog.hash;
      } else {
        if (heartbeatPeriod && (stateLog.age % heartbeatPeriod === 0)) {
          let ageSeconds = (stateLog.age*interval / 1000)
          logger.info(
            `state unchanged @ ${stateLog.age} probes`, 
            `${ageSeconds}s`);
        }
      }
    }, interval);

    if (seconds > 0) {
      await nap(seconds * 1000);
      clearInterval(timer);
      monitor.stop();
    } else {
      logger.info('waiting indefinitely...');
      for (;;) {
        await nap(1000);
      }
    }

    return {
      timer,
      monitor,
      probe,
    }
  }
}

