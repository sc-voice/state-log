import should from "should";
import { StateLog, UrlProbe } from '../index.js';

const TESTURL = 
  "http://worldtimeapi.org/api/timezone/America/Los_Angeles";

typeof describe === "function" && describe("url-probe", ()=>{
  it("default ctor", ()=>{
    let eCaught;
    try {
      new UrlProbe();
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/invalid url/i);
  });
  it("custom ctor", async()=>{
    let url = TESTURL;
    let interval = 500;
    let date0 = new Date(2000, 1, 1);
    let date1 = new Date(date0.getTime() + interval);
    let stateLog = new StateLog({interval, date:date0});

    let probe1 = new UrlProbe({
      url, jsonFilter:undefined, stateLog, type:undefined});
    should(probe1).properties({
      url, jsonFilter:undefined, stateLog, type:'heartbeat'});

    let jsonFilter = {datetime: true};
    let type = "test-type";
    let probe2 = new UrlProbe({ url, jsonFilter, stateLog, type});
    should(probe2).properties({ url, jsonFilter, stateLog, type});
  });
  it("probe()", async()=>{
    let url = TESTURL;
    let jsonFilter = {datetime: true};
    let interval = 500;
    let date0 = new Date(2000, 1, 1);
    let date1 = new Date(date0.getTime() + interval);
    let stateLog = new StateLog({interval, date:date0});
    let probe = new UrlProbe({url, jsonFilter, stateLog});

    let res = await probe.probe(date1);
    should(res.status).equal(200);
    should(stateLog.state.status).equal(200);
    should.deepEqual(Object.keys(stateLog.state.json), 
      ['datetime']);
    //console.log(stateLog);
  });
  it("normalizeState()", ()=>{
    let date = JSON.stringify(new Date()).replace(/"/g,'');
    let keepMinutes = "[-T0-9]+:[0-9]+";
    let color = 'blue';
    let age = 25;
    let rawState = {date, color, age};
    let properties = {
      date: keepMinutes,
      color: true,
    }

    let normalizedState = UrlProbe.normalizeState(rawState, properties);
    let re = new RegExp(keepMinutes);
    let [ match, index ] = date.match(re);
    let expectedDate = date.split(/:[.0-9]*Z$/)[0];
    should.deepEqual(normalizedState, {
      date: expectedDate,
      color
    });

    let unfilteredState = UrlProbe.normalizeState(rawState);
    should.deepEqual(unfilteredState, rawState);
  });
})
