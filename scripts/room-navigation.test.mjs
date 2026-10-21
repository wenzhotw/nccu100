import test from 'node:test';
import assert from 'node:assert/strict';
const navigation=await import('../src/core/room-navigation.js').catch(()=>({}));
test('房間入口只出現在指定來源區域，原校園入口仍在null',()=>{
  assert.equal(typeof navigation.entranceRoom,'function');
  assert.equal(navigation.entranceRoom({entrance:{room:'dah-hsian'}}),'dah-hsian');
  assert.equal(navigation.entranceRoom({entrance:{x:1,z:2}}),null);
});
test('子房間離開會回指定區域與門前位置，舊建築仍回校園',()=>{
  assert.equal(typeof navigation.exitDestination,'function');
  const door={x:14.5,z:13.3};
  assert.deepEqual(navigation.exitDestination({returnRoom:'dah-hsian',returnTo:door}),{room:'dah-hsian',spawn:door});
  assert.deepEqual(navigation.exitDestination({returnTo:door}),{room:null,spawn:door});
});
