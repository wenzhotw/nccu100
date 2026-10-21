import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { COSTUME_NPC_IDS, costumeLook, costumeProfile } from '../src/systems/baozhong/npc-costume-profiles.js';
import { mountNpcCostume } from '../src/systems/baozhong/npc-costumes.js';
const materials = new Map();
const deps = { canvasTex: (w,h,draw) => { draw({fillRect(){},fillText(){}}); return new THREE.Texture(); }, toon: color => {
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
test('all 37 departments plus two activity masters, including business and law masters but not language master', () => {
  const wanted = [...Array.from({length:37},(_,i)=>`D${String(i+1).padStart(2,'0')}`),'C03','C06'].map(id => `bz26-${id}`).sort();
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
  assert.match(activity,/look: costumeLook\(o.id, o.look\)/);assert.match(activity,/mountNpcCostume\(n, \{ toon, OUT, canvasTex, groundH \}\)/);
  assert.doesNotMatch(core,/costume|baozhong/);
});

test('new department identities and all business accessories exist as real geometry',()=>{
  const required={D02:'history-yellowed-folder',D03:'philosophy-beret',D04:'soapbox',D05:'sociology-interview-board',D06:'budget',D07:'administration',D08:'survey',D09:'economics',D10:'field',D11:'trade-rolling-case',D12:'finance-market-tablet',D13:'thick-ledger',D14:'statistics-bow',D15:'management-earpiece',D16:'mis-workflow-tablet',D17:'wealth-double-breasted',D18:'insurance-shield',D20:'advertising-storyboard',D22:'communication-neck-camera',D32:'math-geometric-model',D33:'cognition-card',D34:'diplomacy-silk',D35:'education-rollbook',D36:'innovation-travel-backpack'};
  for(const [id,fragment] of Object.entries(required)){
    const n=rig(`bz26-${id}`);mountNpcCostume(n,deps);const names=[];n.g.traverse(o=>names.push(o.name));
    assert.ok(names.some(name=>name.includes(fragment)),`${id}: ${fragment}`);
    if(id==='D20'||id==='D35') n.g.traverse(o=>{
      if(o.isMesh && /(?:glasses|thin-frame).*(?:rim|side|bridge)/.test(o.name) && !o.name.endsWith('-outline')) assert.ok(o.position.z>=.29,`${id} frame ahead of head sphere`);
    });
  }
});
test('political stage stays at home during turns/movement, preserves planar interaction and exact flag text',()=>{
  const n=rig('bz26-D04');n.g.position.set(12,0,8);n.g.rotation.y=.7;n.g.scale.setScalar(1.2);
  const originalSpot=n.spot, originalHome=n.home;let prior=0;n.after=()=>prior++;
  mountNpcCostume(n,{...deps,groundH:()=>.06});
  const stage=n.g.getObjectByName('bz26-costume-campaign-stage');
  const flag=n.g.getObjectByName('bz26-costume-campaign-flag-text');
  assert.equal(flag.userData.exactText,'你們的總統 唐納川普');
  assert.equal(flag.userData.text.replace(/\n/g,' '),flag.userData.exactText);
  const back=n.g.getObjectByName('bz26-costume-campaign-flag-text-back');
  assert.equal(back.userData.exactText,flag.userData.exactText);
  assert.equal(back.rotation.y,Math.PI);assert.ok(back.position.z<flag.position.z);
  assert.equal(n.spot,originalSpot);assert.equal(n.home,originalHome);
  assert.equal(n.rig.position.y,.18);
  n.g.position.y=.06;n.rig.position.y=0;n.g.rotation.y=1.6;n.after(n,.016);n.g.updateMatrixWorld(true);
  let world=stage.getWorldPosition(new THREE.Vector3());assert.ok(world.distanceTo(new THREE.Vector3(12,.06,8))<1e-8);
  assert.equal(n.rig.position.y,.18);assert.equal(prior,1);
  n.g.position.x=13;n.rig.position.y=.03;n.fear=1;n.after(n,.016);n.g.updateMatrixWorld(true);
  world=stage.getWorldPosition(new THREE.Vector3());assert.ok(world.distanceTo(new THREE.Vector3(12,.06,8))<1e-8);
  assert.equal(n.rig.position.y,.03);assert.equal(n.g.userData.bz26PlatformLift,0);
  n.g.visible=false;assert.equal(stage.parent,n.g); // Stage shares event visibility; no scene orphan.
});
test('all document poses preserve right-hand umbrella and underlying movement',()=>{
  for(const id of COSTUME_NPC_IDS.filter(id=>costumeProfile(id).pose==='document')){
    const n=rig(id);mountNpcCostume(n,deps);n.P.shR.rotation.z=2.55;n.after(n,.016);
    assert.equal(n.P.shL.rotation.x,-1.05,id);assert.equal(n.P.shR.rotation.z,2.55,id);
    n.fear=1;n.P.shL.rotation.z=-2.4;n.after(n,.016);assert.equal(n.P.shL.rotation.z,-2.4,id);
  }
});
