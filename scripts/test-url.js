#!/usr/bin/env node
import { StateLog, Monitor } from '../index.js';
import { logger } from 'log-instance';
import fs from 'fs';
import JSON5 from 'json5';

const DEFAULT_SERVER = "https://www.api.sc-voice.net/scv";
const DEFAULT_URL = 
  `${DEFAULT_SERVER}/play/segment/thig1.1/en/soma/thig1.1%3A1.1/Amy`;

const [ NODE_PATH, SCRIPT_PATH, ...args ] = process.argv;
const SCRIPT_NAME = SCRIPT_PATH.split('/').pop();
let interval = 1000;
let seconds = 60;
let url = process.env.URL || DEFAULT_URL;
let heartbeatPeriod = 10;
let jsonFilter = null;

function nap(ms) {
  return new Promise(resolve => setTimeout(()=>resolve(), ms));
}

function help() {
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
        state.  If zero, do not emit heartbeat.

    -i, --interval PERIOD
        Repeat probe every PERIOD milliseconds. Default is 1000.

    -jf, --json-filter JSON5
        Normalize raw state with given JSON5 filter (see StateLog).
        Default filter is null, which does not normalize raw state.
`);}

for (let i=0; i < args.length; i++) {
  let arg = args[i];
  switch (arg) {
    case '--seconds':
    case '-s':
      seconds = Number(args[++i]);
      break;
    case '--heartbeat-period':
    case '-hp':
      heartbeatPeriod = Number(args[++i]);
      break;
    case '--help':
    case '?':
      help();
      process.exit();
      break;
    case '--interval':
    case '-i':
      interval = Number(args[++i]);
      break;
    case '--json-filter':
    case '-jf': {
      let json = args[++i];
      console.log({json});
      jsonFilter = JSON5.parse(json);
      }; break;
    default:
      if (arg.startsWith('-')) {
        console.log(SCRIPT_NAME, `ERROR: Unknown option ${arg}`);
        process.exit(-1);
      }
      url = arg;
      break;
  }
}

try {
  new URL(url);
} catch(e) {
  console.log(SCRIPT_NAME, `ERROR: Invalid URL ${url}`);
  throw e;
}
console.log("test-url", {NODE_PATH, SCRIPT_PATH, url, seconds});

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

if (seconds === 0) {
  for (;;) {}
}

await nap(seconds * 1000);
clearInterval(timer);
monitor.stop();

