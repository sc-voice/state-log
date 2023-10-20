import should from "should";
import { MerkleJson } from "merkle-json/index.js";
import { StateLog } from '../index.js';
import { Monitor } from '../node.js';

async function sleep(seconds) {
  let ms = Math.round(seconds * 1000);
  return new Promise((resolve,reject)=>{
    setTimeout(()=>resolve(), ms);
  });
}

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
    let interval = 1000;
    let mon = new Monitor({interval});
    let url = "http://worldtimeapi.org/api/timezone/America/Los_Angeles";
    let properties = {
      abbrevation: undefined,
      client_ip: undefined,
      day_of_year: undefined,
      datetime: {
        exclude: ":.*",
      },
    }
    mon.monitorUrl({url, properties});
    console.log("hi");
    await sleep(5);
    console.log("bye");

    mon.terminate(); // IMPORTANT!!!
  });
})
