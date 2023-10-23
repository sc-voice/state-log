import should from "should";
import { MerkleJson } from "merkle-json/index.js"
import { StateLog } from '../index.js';

typeof describe === "function" && describe("state-log", ()=>{
  let ml = new MerkleJson();
  it("default ctor", ()=>{
    let sl = new StateLog();
    should(sl).properties({
      interval: 1000, // milliseconds
      state: undefined,
      hash: ml.hash(undefined),
      age: 1,
    });
    should(sl.date).instanceOf(Date);
    let dt = Date.now() - sl.date;
    should(dt).above(-1).below(15); // default timestamp
    should.deepEqual(sl.history, []);
  })
  it("custom ctor", ()=>{
    let date = new Date(2000,1,1);
    let interval = 100;
    let state = "test-state";
    let history = ['a', 'b'];
    let age = 5;
    let hash = ml.hash(state);
    let sl = new StateLog({date, interval, state, history, age, });
    should(sl).properties({
      date, interval, state, history, age, hash,
    });

    // serializable
    let json = JSON.stringify(sl);
    let sl2 = new StateLog(json);
    should.deepEqual(sl2, sl);
  })
  it("update()", ()=>{
    let date = new Date(2000, 1,1);
    let interval = 10;
    let states = ['a', 'a', 'b', 'c'];
    let dates = states.map(
      (s,i) => new Date(date.getTime()+(i+1)*interval));
    let iState = 0;

    // 'a'
    let sl = new StateLog({
      interval,
      date:dates[iState], 
      state:states[iState],
    });
    iState++;

    // 'a'
    should(sl.update(states[iState], dates[iState])).equal(sl);
    should(sl).properties({
      age: 2,
      state: states[iState],
      history: [],
      date: dates[iState],
    });
    iState++;

    // 'b'
    should(sl.update(states[iState], dates[iState])).equal(sl);
    should(sl).properties({
      age: 1, // age is state relative
      state: states[iState],
      history: [{age:2, state:'a'}],
      date: dates[iState],
    });
    iState++;

    // 'c'
    should(sl.update(states[iState], dates[iState])).equal(sl);
    should(sl).properties({
      age: 1, // age is state relative
      state: states[iState],
      history: [ 
        {age:2, state:'a'},
        {age:1, state:'b'},
      ],
      date: dates[iState],
    });
    iState++;

    should(sl.update('now')).equal(sl);
    should(Date.now()-sl.date.getTime()).above(-1).below(15);
  });
  it("update() skip interval", ()=>{
    let interval = 10;
    let date = new Date(2000, 1,1);
    let date0b = new Date(date.getTime() - 1);
    let date0 = date;
    let date1b = new Date(date.getTime() + 1);
    let date1 = new Date(date.getTime() + interval);
    let date1a = new Date(date1.getTime() + 1);
    let date2 = new Date(date1.getTime() + 2*interval);
    let date3 = new Date(date1.getTime() + 3*interval);
    let date4 = new Date(date1.getTime() + 4*interval);
    let date5b = new Date(date4.getTime() + 1);
    let date5 = new Date(date.getTime() + 5*interval);
    let date5a = new Date(date5.getTime() + 1);
    let sl = new StateLog({interval, state:'a', date:date0});

    // on interval
    sl.update('b', date1);
    should(sl.stateAt(date0)).equal('a');
    should(sl.stateAt(date1b)).equal('b');
    should(sl.stateAt(date1)).equal('b');
    should(sl.stateAt(date1a)).equal('b');

    // off interval
    sl.update('c', date5);
    should(sl.stateAt(date0b)).equal('a');
    should(sl.stateAt(date0)).equal('a');
    should(sl.stateAt(date1b)).equal('b');
    should(sl.stateAt(date1)).equal('b');
    should(sl.stateAt(date5b)).equal('c');
    should(sl.stateAt(date5)).equal('c');
    should(sl.stateAt(date5a)).equal('c');
  });
  it("update() squash interval", ()=>{
    let date = new Date(2000, 1,1);
    let interval = 1000;
    let states = ['a', 'a', 'b', 'c'];
    let dates = states.map(
      (s,i) => new Date(date.getTime()+(i+1)*interval));
    let iState = 0;
    let slTrue = new StateLog({state:'initial', date});
    let slLag = new StateLog({state:'initial', date});

    // Simulate lag by delaying first update by almost an interval
    // Following updates will lock back onto true time
    let maxLag = interval - 1; // MAXIMUM LAG TIME!!!
    let startTime = dates[0].getTime() + maxLag;
    let iEnd = dates.length - 1;
    let endTime = dates[iEnd].getTime();
    states.forEach((state,i) => {
      let trueDate = dates[i];
      let lagDate = new Date(((iEnd-i)*startTime + i*endTime)/iEnd);
      slTrue.update(state, trueDate);
      slLag.update(state, lagDate);
      //console.log({lagDate, trueDate});
    });

    should.deepEqual(slLag, slTrue);
  });
  it("stateAt()", ()=>{
    let interval = 1000;
    let date0b = new Date(2000, 1, 1);
    let date0 = new Date(2000, 1, 2);
    let date_a1 = new Date(date0.getTime() + 1*interval);
    let date_a2 = new Date(date0.getTime() + 2*interval);
    let date_b = new Date(date0.getTime() + 3*interval);
    let date_cb = new Date(date_b.getTime() + 1);
    let date_c = new Date(date0.getTime() + 4*interval);
    let states = ['a', 'a', 'b', 'c'];
    let sl = new StateLog({interval, state:'initial', date:date0});
    states.forEach((state,i)=>{
      let d = new Date(date0.getTime() + (i+1)*interval);
      sl.update(state, d);
    });

    // state before creation is assumed to be same as initial
    should(sl.stateAt(date0b)).equal('initial');
    should(sl.stateAt(new Date(1000))).equal('initial');

    // creation
    should(sl.stateAt(date0)).equal('initial');

    should(sl.stateAt(date_a1)).equal('a');
    should(sl.stateAt(date_a2)).equal('a');
    should(sl.stateAt(date_b)).equal('b');
    should(sl.stateAt(date_cb)).equal('c');
    should(sl.stateAt(date_c)).equal('c');

    // state is assumed to be unchanged since last update
    should(sl.stateAt()).equal('c');
    should(sl.stateAt(new Date())).equal('c');
  });
  it("stateHistory()", ()=>{
    let interval = 1000;
    let date0b = new Date(2000, 1, 1);
    let date0 = new Date(2000, 1, 2);
    let date_x1 = new Date(date0.getTime() + 1*interval);
    let date_x2 = new Date(date0.getTime() + 2*interval);
    let date_y = new Date(date0.getTime() + 3*interval);
    let date_zb = new Date(date_y.getTime() + 1);
    let date_z = new Date(date0.getTime() + 4*interval);
    let states = ['x', 'x', 'y', 'z'];
    let sl = new StateLog({interval, state:'initial', date:date0});
    states.forEach((state,i)=>{
      let d = new Date(date0.getTime() + (i+1)*interval);
      sl.update(state, d);
    });

    should.deepEqual(sl.stateHistory(1, date_x1), ['x']);
    should.deepEqual(sl.stateHistory(1, date_x2), ['x']);
    should.deepEqual(sl.stateHistory(1, date_y), ['y']);
    should.deepEqual(sl.stateHistory(1, date_z), ['z']);

    should.deepEqual(sl.stateHistory(5, date0), 
      ['initial', 'initial', 'initial','initial','initial']);
    should.deepEqual(sl.stateHistory(5, date_x1), 
      ['initial', 'initial', 'initial','initial','x']);
    should.deepEqual(sl.stateHistory(5, date_y), 
      ['initial', 'initial', 'x','x','y']);
    should.deepEqual(sl.stateHistory(5, date_zb), 
      ['initial', 'x','x','y', 'z']);
    should.deepEqual(sl.stateHistory(5, date_z), 
      ['initial', 'x','x','y', 'z']);
    should.deepEqual(sl.stateHistory(5), 
      ['z','z','z','z','z']);
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

    let normalizedState = StateLog.normalizeState(rawState, properties);
    let re = new RegExp(keepMinutes);
    let [ match, index ] = date.match(re);
    let expectedDate = date.split(/:[.0-9]*Z$/)[0];
    should.deepEqual(normalizedState, {
      date: expectedDate,
      color
    });

    let unfilteredState = StateLog.normalizeState(rawState);
    should.deepEqual(unfilteredState, rawState);
  });
  it("TESTTESTstateIterator()", ()=>{
    let interval = 10;
    let date_0 = new Date(2000, 1,1);
    let dates = [0,1,2,3,4,5]
      .map(t=>new Date(date_0.getTime()+t*interval));
    let sl = new StateLog({ interval, state:'initial', date:dates[1]});
    let expected = [{ // 0
      age_ms: 10,
      state: 'initial',
      startDate: new Date(dates[0].getTime() - 0*interval + 1),
    },{ // 1
      age_ms: 10,
      state: 'a',
      startDate: new Date(dates[1].getTime() + 1),
    },{ // 2
      age_ms: 20,
      state: undefined,
      startDate: new Date(dates[2].getTime() + 1),
    },{ // 3
      age_ms: 10,
      state: 'b',
      startDate: new Date(dates[4].getTime() + 1),
    }];
    let testIterator = (iter, done, value)=>{
      let res = iter.next();
      should(res.done).equal(done);
      if (value) {
        should(res.value).properties(value);
      } else {
        should(res.value).equal(value);
      }
    }

    let iter_0 = sl.stateIterator();
    sl.update('a', dates[2]);
    let iter_a = sl.stateIterator();
    sl.update('b', dates[5]);  // logging gap
    let iter_b = sl.stateIterator();

    // iterators can be used after additional logging
    testIterator(iter_0, false, expected[0]); // initial
    testIterator(iter_0, true, undefined);
    testIterator(iter_0, true, undefined);

    testIterator(iter_a, false, expected[1]); // a
    testIterator(iter_a, false, expected[0]); // initial
    testIterator(iter_a, true, undefined);
    testIterator(iter_a, true, undefined);

    // iterator included logging gap
    testIterator(iter_b, false, expected[3]); // b
    testIterator(iter_b, false, expected[2]); // undefined
    testIterator(iter_b, false, expected[1]); // a
    testIterator(iter_b, false, expected[0]); // initial
    testIterator(iter_b, true, undefined);
    testIterator(iter_b, true, undefined);
  });
})
