import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Vector3,Group,Box3} from 'three';
import {OBB} from 'three/examples/jsm/math/OBB.js';
import {state} from '../../src/core/state.js';
import {activateArticulatedArms,ARM_POSES} from '../../src/actors/articulated-arms.js';
import {getActorRigIdentity,TRIAL_IDS} from '../../src/actors/actor-rig-identity.js';
const captures=[];
const world=n=>n.getWorldPosition(new Vector3());
const hook=Symbol.for('nccu100.articulated-arms-test');
globalThis[hook]=(id,root,serialize,worldList,context)=>{
  if(!TRIAL_IDS.includes(id))return;
  const identity=getActorRigIdentity(root), input={id,root,body:identity.body,joints:identity.joints,headCenter:identity.headCenter};
  const before=serialize(root), neutral=worldList(root), matrices=new Map();
  root.updateWorldMatrix(true,true);root.traverse(n=>{if(n.isMesh)matrices.set(n,[...n.matrixWorld.elements]);});
  // A failure after the left side has moved must restore exact sibling order.
  const attach=Group.prototype.attach;
  const moveCount=id==='player'?2:id==='bz26-D12'?5:id==='bz26-D23'?8:4;
  for(let failAt=1;failAt<=moveCount;failAt++) {
    let calls=0;
    try {
      Group.prototype.attach=function(n){if(++calls===failAt)throw new Error('injected attach failure');return attach.call(this,n);};
      assert.throws(()=>activateArticulatedArms(input),/injected attach failure/);
    }finally{Group.prototype.attach=attach;}
    assert.deepEqual(serialize(root),before,`${id} failed activation atomic restore at ${failAt}`);
    assert.deepEqual(worldList(root),neutral);
  }
  for(let repeat=0;repeat<3;repeat++) {
    const rig=activateArticulatedArms(input);
    assert.equal(activateArticulatedArms(input),rig);
    const forearm=identity.arms.L.forearm;
    identity.body.add(forearm);
    assert.throws(()=>activateArticulatedArms(input),/Articulated hierarchy changed/);
    rig.elbows.L.add(forearm);
    root.updateWorldMatrix(true,true);
    for(const [n,elements] of matrices) n.matrixWorld.elements.forEach((v,i)=>assert.ok(Math.abs(v-elements[i])<1e-10,`${id} zero angle world matrix`));
    for(const side of ['L','R']) {
      assert.equal(identity.arms[side].forearm.parent,rig.elbows[side]);
      const elbow=world(rig.elbows[side]), tip=world(rig.hands[side]);
      rig.elbows[side].rotation.x=-Math.PI/2;root.updateWorldMatrix(true,true);
      assert.ok(world(rig.hands[side]).distanceTo(tip)>.1,`${id} real elbow moves hand`);
      assert.ok(Math.abs(world(rig.hands[side]).distanceTo(elbow)-tip.distanceTo(elbow))<1e-10);
    }
    if(id==='bz26-D12')assert.equal(root.getObjectByName('bz26-costume-finance-market-tablet').parent,rig.hands.L);
    if(id==='bz26-D23')for(const [side,s] of [['L',-1],['R',1]])for(const key of ['sleeve','cuff'])assert.equal(root.getObjectByName(`bz26-costume-doublet-${key}-${s}`).parent,rig.elbows[side]);
    for(const pose of ARM_POSES){rig.setPose(pose);root.traverse(n=>assert.ok(n.matrixWorld.elements.every(Number.isFinite)));}
    for(const bad of [-1,91,NaN,Infinity])assert.throws(()=>rig.setBendDegrees(bad),/Bend degrees/);
    for(const pose of ARM_POSES) {
      rig.setPose(pose);
      for(let angle=0;angle<=90;angle++) {
        const result=rig.setBendDegrees(angle);
        assert.equal(result.requestedDegrees,angle);assert.equal(result.leftDegrees,angle);assert.equal(result.rightDegrees,angle);assert.equal(result.limited,false);
        assert.ok(Math.abs(rig.elbows.L.rotation.x+angle*Math.PI/180)<1e-10);
        if(id==='bz26-D12' && angle>=4) {
          const tablet=root.getObjectByName('bz26-costume-finance-market-tablet');
          const tie=identity.body.children.find(n=>n.isMesh&&Math.abs(n.position.y-.57)<1e-8&&Math.abs(n.scale.x-.035)<1e-8);
          assert.ok(tie,'actual tie mesh fixture');
          const obb=n=>{n.geometry.computeBoundingBox();return new OBB().fromBox3(n.geometry.boundingBox).applyMatrix4(n.matrixWorld);};
          const tieBox=obb(tie),bounds=new Box3();
          tablet.traverse(n=>{if(n.isMesh){assert.equal(obb(n).intersectsOBB(tieBox),false,`${pose} ${angle} tablet/tie OBB`);const p=n.geometry.attributes.position;for(let i=0;i<p.count;i++)bounds.expandByPoint(identity.body.worldToLocal(new Vector3().fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld)));}});
          assert.ok(bounds.max.y<.718,`${pose} ${angle} tablet below head sphere`);
        }
      }
    }
    rig.setPose('neutral');
    for(const [n,elements] of matrices)n.matrixWorld.elements.forEach((v,i)=>assert.ok(Math.abs(v-elements[i])<1e-10,`${id} neutral after bending world matrix`));
    assert.throws(()=>rig.setPose('invalid'),/Unknown/);
    // 外部將自有暫存節點重掛到角色或另一個容器，仍需清乾淨再啟用。
    const foreign=new Group();root.add(rig.hands.L);foreign.add(rig.hands.R);foreign.add(rig.elbows.R);
    assert.throws(()=>rig.validate(),/hierarchy changed/);

    rig.dispose();rig.dispose();
    for(const n of [...Object.values(rig.hands),...Object.values(rig.elbows)])assert.equal(n.parent,null);
    assert.equal(foreign.children.length,0);
    assert.deepEqual(serialize(root),before,`${id} complete local hierarchy restore`);
    assert.deepEqual(worldList(root),neutral,`${id} complete world restore`);
    assert.throws(()=>rig.setPose('neutral'),/disposed/);
  }
  if(id==='player'){
    const rig=activateArticulatedArms(input);rig.setPose('wave');
    context.setOutfit('swim');assert.equal(activateArticulatedArms(input),rig);
    context.setOutfit('normal');rig.dispose();
    assert.deepEqual(worldList(root),neutral);
  }
  // Real next-frame shoulder animation must not detach the articulated children.
  state.time=1;state.walkPh=0;state.grounded=true;state.yaw=0;
  const live=activateArticulatedArms(input);live.setPose('wave');
  const distances=['L','R'].map(side=>world(live.elbows[side]).distanceTo(world(live.hands[side])));
  if(id==='player')context.animateHero(1/60,3,true);
  else {const n=context.NPCS.find(n=>n.g===root);state.room=n.room||null;context.npcUpdate(n,1/60);}
  root.updateWorldMatrix(true,true);
  for(const [i,side] of ['L','R'].entries()) {
    assert.equal(identity.arms[side].forearm.parent,live.elbows[side]);
    assert.ok(Math.abs(world(live.elbows[side]).distanceTo(world(live.hands[side]))-distances[i])<1e-10);
  }
  if(id==='bz26-D12')assert.equal(root.getObjectByName('bz26-costume-finance-market-tablet').parent,live.hands.L);
  live.dispose();
  captures.push(id);
};
const build=new URL('./build.mjs',import.meta.url), original=fs.readFileSync(build,'utf8').replace('{ NPCS, addNPC }','{ NPCS, addNPC, npcUpdate }').replace('{ H, player, setOutfit, becomeEagle }','{ H, player, setOutfit, becomeEagle, animateHero }');
const token='const add = (id, root) => {';assert.equal(original.split(token).length,2);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nccu100-arms-'));
try{
  const instrumented=original.replace(token,`${token}\n globalThis[Symbol.for('nccu100.articulated-arms-test')](id,root,serialize,worldList,{setOutfit,animateHero,npcUpdate,NPCS});`);
  const relocated=instrumented.replace(/((?:from\s+|import\s+)['"])([^'"]+)(['"])/g,(_,a,b,c)=>a+(b.startsWith('.')?new URL(b,build).href:import.meta.resolve(b))+c);
  fs.writeFileSync(path.join(dir,'build.mjs'),relocated);await import(pathToFileURL(path.join(dir,'build.mjs')).href);
}finally{fs.rmSync(dir,{recursive:true,force:true});delete globalThis[hook];}
test('four real constructors: elbow motion, garment/hand binding, six poses, repeated full rollback',()=>assert.deepEqual(captures.sort(),[...TRIAL_IDS].sort()));
const {player,rig,H,headCenter}=await import('../../src/actors/player.js');
test('eagle rejects human elbow activation without mutations',()=>{
  const count=()=>{let n=0;player.traverse(()=>n++);return n;},before=count();
  assert.throws(()=>activateArticulatedArms({id:'player',root:player,body:rig,joints:H,headCenter}),/Unsupported player form/);assert.equal(count(),before);
});
