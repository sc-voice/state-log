import should from "should";
import { MerkleJson } from "merkle-json/index.js";
import { StateLog } from '../index.js';
import { Monitor } from '../node.js';
import { logger } from 'log-instance';

async function sleep(ms) {
  return new Promise((resolve,reject)=>{
    setTimeout(()=>resolve(), ms);
  });
}

logger.logLevel = 'warn';

typeof describe === "function" && describe("monitor", function(){
  let ml = new MerkleJson();

  this.timeout(20*1000);

  it("default ctor", ()=>{
    let mon = new Monitor();
    should(mon).properties({
      interval: 60 * 1000,
    });

    mon.terminate(); // IMPORTANT!!!
  })
  it("monitorUrl() ", async()=>{
    let interval = 350;
    let mon = new Monitor({interval});
    let url = "http://worldtimeapi.org/api/timezone/America/Los_Angeles";
    let jsonFilter = {
      abbreviation: true,
      client_ip: true,
      datetime: '^[-0-9T]+:[0-9]+',
    }
    let probe = mon.monitorUrl({url, jsonFilter});
    await sleep(5*interval);
    should(probe).properties({url, jsonFilter});
    let { stateLog } = probe;
    should(stateLog).properties({ age: 4, interval, });
    should(stateLog.state.status).equal(200);
    should.deepEqual(
      Object.keys(stateLog.state.json), 
      Object.keys(jsonFilter));

    mon.terminate(); // IMPORTANT!!!
  });
})
