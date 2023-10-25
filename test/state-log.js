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
  it("stateGenerator()", ()=>{
    let interval = 10;
    let date_0 = new Date(2000, 1,1);
    let dates = [0,1,2,3,4,5]
      .map(t=>new Date(date_0.getTime()+t*interval));
    let sl = new StateLog({ interval, state:'initial', date:dates[1]});
    let expected = [{ // 0 age_ms: 10,
      state: 'initial',
      date: dates[1],
    },{ // 1
      age_ms: 10,
      state: 'a',
      date: dates[2],
    },{ // 2
      age_ms: 20,
      state: undefined,
      date: dates[4],
    },{ // 3
      age_ms: 10,
      state: 'b',
      date: dates[5],
    }];
    let testIterator = (iter, done, value)=>{
      let res = iter.next();
      if (value) {
        should(res.value).properties(value);
      } else {
        should(res.value).equal(value);
      }
      should(res.done).equal(done);
    }

    let iter_0 = sl.stateGenerator();
    sl.update('a', dates[2]);
    let iter_a = sl.stateGenerator();
    sl.update('b', dates[5]);  // logging gap
    let iter_b = sl.stateGenerator();
    let iter_end3 = sl.stateGenerator({endDate: dates[3]});
    let iter_end4 = sl.stateGenerator({endDate: dates[4]});

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

    // iterator with endDate
    testIterator(iter_end3, false, expected[3]); // b [5]
    testIterator(iter_end3, false, expected[2]); // undefined [3,4]
    //testIterator(iter_end3, false, expected[1]); // a [2]
    //testIterator(iter_end3, false, expected[0]); // initial [1]
    testIterator(iter_end3, true, undefined);
    testIterator(iter_end3, true, undefined);

    testIterator(iter_end4, false, expected[3]); // b [5]
    testIterator(iter_end4, false, expected[2]); // undefined [3,4]
    //testIterator(iter_end4, false, expected[1]); // a [2]
    //testIterator(iter_end4, false, expected[0]); // initial [1]
    testIterator(iter_end4, true, undefined);
    testIterator(iter_end4, true, undefined);

    let list = [];
    for (let item of sl.stateGenerator()) {
      list.push(item.state);
    }
    should.deepEqual(list, [ 'b', undefined, 'a', 'initial' ]);
  });
})
