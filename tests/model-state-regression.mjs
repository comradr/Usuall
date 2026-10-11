import assert from 'node:assert/strict';
import {stateAt, chalkAt, TOTAL_DURATION, MESSAGES} from '../dist/model.js';

// Public pure model must work without renderer-provided asset geometry.
for(let frame=0;frame<=TOTAL_DURATION*60;frame++) {
  const s=stateAt(frame/60);
  for(const side of ['store','school']) {
    assert.ok(Number.isFinite(s[side].actor.x));
    assert.ok(Number.isFinite(s[side].actor.y));
    assert.ok(Number.isFinite(s[side].actor.hand.x));
    assert.ok(Number.isFinite(s[side].actor.hand.y));
  }
}
console.log('PASS pure model:11,341 timeline samples without asset geometry');
for(const time of [0,34.99,46.5,48,61,130.65,136,189]) {
  const board=chalkAt(time);
  assert.equal(board.contact,null);
  assert.equal(board.penDown,false);
}
assert.deepEqual(stateAt(TOTAL_DURATION).dialogue,MESSAGES);
console.log('PASS chalk outside writing interval and unchanged final dialogue');
