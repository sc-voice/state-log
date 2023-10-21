#!/usr/bin/env node
import { StateLog, Monitor } from '../index.js';

const DEFAULT_SERVER = "https://www.api.sc-voice.net/scv";
const DEFAULT_URL = 
  `${DEFAULT_SERVER}/play/segment/thig1.1/en/soma/thig1.1%3A1.1/Amy`;

const [ NODE_PATH, SCRIPT_PATH, ...args ] = process.argv;
let interval = 1000;
let seconds = 60;
let url = DEFAULT_URL;

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
        in server responses. If URL is not provided, it defaults
        to a known URL.

    -s, --seconds SECONDS
        Terminate program after given number of SECONDS. If SECONDS
        is zero, repeat indefinitely.  Default for SECONDS is 60.

    -i, --interval PERIOD
        Repeat probe every PERIOD milliseconds. Default is 1000.
`);}

for (let i=0; i < args.length; i++) {
  let arg = args[i];
  switch (arg) {
    case '--seconds':
    case '-s':
      seconds = Number(args[++i]);
      break;
    case '--interval':
    case '-i':
      interval = Number(args[++i]);
      break;
    case '--help':
    case '?':
      help();
      process.exit();
      break;
    default:
      if (arg.startsWith('-')) {
        console.log(SCRIPT_NAME, `ERROR: Unknown option ${arg}`);
        process.exit(-1);
      }
      try {
        new URL(arg);
        url = arg;
      } catch(e) {
        console.log(SCRIPT_NAME, `ERROR: Invalid URL ${arg}`);
        throw e;
      }
      break;
  }
}

console.log("test-url", {NODE_PATH, SCRIPT_PATH, url, seconds});

let monitor = new Monitor({interval});
let jsonFilter = null;
let probe = monitor.probeUrl({url, jsonFilter});
let { stateLog } = probe;

monitor.start();
let hash = "nohash";
let timer = setInterval(()=>{
  if (stateLog.hash !== hash) {
    console.log(JSON.stringify(probe, null, 2));
    hash = stateLog.hash;
  } else {
    if (stateLog.age % 10 === 0) {
      let ageSeconds = (stateLog.age*interval / 1000)
      console.log(`unchanged after ${stateLog.age} probes`, 
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

