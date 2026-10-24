import test from 'node:test';
import assert from 'node:assert/strict';
import {player,rig,H,headCenter,setOutfit,becomeEagle,limbParts} from '../../src/actors/player.js';
import {activateArticulatedArms} from '../../src/actors/articulated-arms.js';
const input={id:'player',root:player,body:rig,joints:H,headCenter};
test('active human arms restore before irreversible eagle transformation',()=>{
  const oldChildren=new Map();player.traverse(n=>oldChildren.set(n,[...n.children]));
  const trial=activateArticulatedArms(input);trial.setPose('wave');
  setOutfit('swim');assert.equal(limbParts.armL.forearm.parent,trial.elbows.L);
  setOutfit('normal');becomeEagle();
  assert.throws(()=>trial.setPose('neutral'),/disposed/);
  assert.throws(()=>activateArticulatedArms(input),/Unsupported player form/);
  for(const [node,children] of oldChildren)assert.deepEqual(node.children,children);
  assert.equal(limbParts.armL.forearm.parent,H.shL);
  assert.ok(!player.getObjectByName('trial.elbow.L'));
});
