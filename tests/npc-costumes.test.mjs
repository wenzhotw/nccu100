import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { COSTUME_NPC_IDS, costumeLook, costumeProfile } from '../src/systems/baozhong/npc-costume-profiles.js';
import { mountNpcCostume } from '../src/systems/baozhong/npc-costumes.js';
const materials = new Map();
const deps = { toon: color => {
  if (!materials.has(color)) materials.set(color, new THREE.MeshToonMaterial({ color }));
  return materials.get(color);
}, OUT: new THREE.MeshBasicMaterial({ color: '#2a2c4a', side: THREE.BackSide }) };
function rig(id) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const P = {};
  for (const [key, xyz] of [['head',[0,.99,0]],['shL',[-.21,.65,0]],['shR',[.21,.65,0]],['hipL',[-.085,.33,0]],['hipR',[.085,.33,0]]]) {
    P[key] = new THREE.Group(); P[key].position.set(...xyz); body.add(P[key]);
  }
  return { id, g, rig: body, P, fear: 0, state: 'idle', home: {x:0,z:0}, spot: { fn() {}, ok() {return true;} } };
}
test('exact 23 activity NPCs, including business and law masters but not language master', () => {
  const wanted = ['D01','D11','D12','D13','D14','D15','D16','D17','D18','D19','D21','D23','D24','D25','D26','D27','D28','D29','D30','D31','D37','C03','C06'].map(id => `bz26-${id}`).sort();
  assert.deepEqual(COSTUME_NPC_IDS, wanted);
  assert.equal(costumeProfile('bz26-C05'), null);
  assert.equal(costumeProfile('cop'), null);
  assert.equal(costumeProfile('D26'), null);
});
test('look overrides are immutable and all nine business NPCs use native suit option', () => {
  const original={top:'#123456',hairStyle:'long'};
  for (const id of COSTUME_NPC_IDS) {
    const look=costumeLook(id, original); assert.notEqual(look, original); assert.deepEqual(original,{top:'#123456',hairStyle:'long'});
    if (costumeProfile(id).kind==='suit') assert.equal(look.suit,true,id);
  }
  assert.equal(COSTUME_NPC_IDS.filter(id=>costumeProfile(id).kind==='suit').length,9);
  assert.equal(costumeLook('cop', original), original);
});
test('costumes mount once onto original skeleton and do not replace interaction or legs', () => {
  const metrics=[];
  for(const id of COSTUME_NPC_IDS) {
    const n=rig(id), P=n.P, spot=n.spot, children=[...n.rig.children];
    const ctx=mountNpcCostume(n,deps); assert.ok(ctx,id);
    assert.equal(n.P,P);assert.equal(n.spot,spot);assert.ok(children.every(c=>c.parent===n.rig));
    const count=()=>{let v=0;n.g.traverse(()=>v++);return v;};const before=count();
    assert.equal(mountNpcCostume(n,deps),null);assert.equal(count(),before,id);
    let meshes=0,triangles=0;
    n.g.traverse(o=>{assert.ok(!o.isLight);if(o.isMesh){meshes++;const geo=o.geometry;
      assert.ok(['MeshToonMaterial','MeshBasicMaterial'].includes(o.material.type));
      assert.ok(Array.from(geo.attributes.position.array).every(Number.isFinite));
      assert.ok(o.scale.toArray().every(v=>Number.isFinite(v)&&v>0));
      triangles+=(geo.index?.count??geo.attributes.position.count)/3;
    }});
    assert.ok(triangles<6500,id); if(costumeProfile(id).kind!=='suit')assert.ok(meshes>5,id);
    n.g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(n.g);
    if(meshes) {assert.ok(bounds.min.y>-.03,`${id} below feet`);assert.ok(bounds.max.y<1.55,`${id} above name tag`);assert.ok(bounds.max.x-bounds.min.x<1.4,`${id} too wide`);}
    metrics.push({id,kind:costumeProfile(id).kind,meshes,triangles,bounds:meshes?{min:bounds.min.toArray(),max:bounds.max.toArray()}:null});
  }
  if(process.env.NPC_COSTUME_METRICS) fs.writeFileSync(process.env.NPC_COSTUME_METRICS,JSON.stringify(metrics,null,2)+'\n');
});
test('unknown campus NPCs are untouched',()=>{
  const n=rig('cop'),before=n.rig.children.length;assert.equal(mountNpcCostume(n,deps),null);assert.equal(n.rig.children.length,before);assert.equal(n.after,undefined);assert.equal(n.g.userData.bz26Costume,undefined);
});
test('held items leave right shoulder alone and preserve panic, movement and existing callbacks',()=>{
  for(const id of ['bz26-D19','bz26-D37']) {
    const n=rig(id);let calls=0;n.after=()=>calls++;mountNpcCostume(n,deps);
    n.P.shR.rotation.set(-.15,0,2.55);n.after(n,.016);assert.equal(calls,1);assert.ok(n.P.shL.rotation.x<-.8);assert.equal(n.P.shR.rotation.z,2.55);
    n.fear=1;n.P.shL.rotation.set(.2,0,-2.5);n.after(n,.016);assert.equal(n.P.shL.rotation.z,-2.5);
    n.fear=0;n.g.position.x+=.1;n.P.shL.rotation.set(.4,0,-.12);n.after(n,.016);assert.equal(n.P.shL.rotation.x,.4);
    n.state='return';n.P.shL.rotation.set(.5,0,-.12);n.after(n,.016);assert.equal(n.P.shL.rotation.x,.5);
  }
});
test('only activity construction is wired and shared NPC core remains independent',()=>{
  const activity=fs.readFileSync(new URL('../src/systems/baozhong/index.js',import.meta.url),'utf8');
  const core=fs.readFileSync(new URL('../src/actors/npc.js',import.meta.url),'utf8');
  assert.match(activity,/look: costumeLook\(o.id, o.look\)/);assert.match(activity,/mountNpcCostume\(n, \{ toon, OUT \}\)/);
  assert.doesNotMatch(core,/costume|baozhong/);
});
