import should from "should";
import { MerkleJson } from "merkle-json/index.js";
import { StateLog, Monitor } from '../index.js';
import { logger } from 'log-instance';

async function nap(ms) {
  return new Promise((resolve,reject)=>{
    setTimeout(()=>resolve(), ms);
  });
}

logger.logLevel = 'warn';

typeof describe === "function" && describe("monitor", function(){
  let ml = new MerkleJson();

  this.timeout(20*1000);

  it("default ctor", ()=>{
    let now = new Date();
    let mon = new Monitor();
    should(mon).properties({
      interval: 60 * 1000,
      probes: [],
      started: undefined,
    });
  });
  it("start()", async()=>{
    let now = new Date();
    let mon = new Monitor();

    mon.start();
    should(mon.started).instanceOf(Date);
    should(mon).properties({
      interval: 60 * 1000,
      probes: [],
    });
    should(mon.started).instanceOf(Date);
    should(mon.started - now).above(-1).below(10);

    mon.stop(); // IMPORTANT: release resources
    should(mon).properties({
      interval: 60 * 1000,
      probes: [],
      started: undefined,
    });

  });
  it("probeUrl() ", async()=>{
    let interval = 350;
    let mon = new Monitor({interval});

    mon.start();
    let url = "http://worldtimeapi.org/api/timezone/America/Los_Angeles";
    let jsonFilter = {
      abbreviation: true,
      client_ip: true,
      datetime: '^[-0-9T]+:[0-9]+',
    }
    let probe = mon.probeUrl({url, jsonFilter});
    await nap(5*interval);
    should(probe).properties({url, jsonFilter});
    let { stateLog } = probe;
    should(stateLog).instanceOf(StateLog);
    should(stateLog).properties({ age: 4, interval, });
    should(stateLog.state.status).equal(200);
    should.deepEqual(
      Object.keys(stateLog.state.json), 
      Object.keys(jsonFilter));

    mon.stop(); // IMPORTANT: release resources
  });
})
