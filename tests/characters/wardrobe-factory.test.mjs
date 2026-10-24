import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Group} from 'three';
import {createWardrobeActor,WARDROBE_CATALOG} from '../../src/actors/wardrobe-factory.js';
import {activateArticulatedArms,ARM_POSES} from '../../src/actors/articulated-arms.js';
import {getActorRigIdentity,TRIAL_IDS} from '../../src/actors/actor-rig-identity.js';
const seen=[];
const hook=Symbol.for('nccu100.wardrobe-test');
globalThis[hook]=(id,root,serialize,worldList,context)=>{
 if(!TRIAL_IDS.includes(id))return;
 const identity=getActorRigIdentity(root),input={id,root,body:identity.body,joints:identity.joints,headCenter:identity.headCenter};
 const before=serialize(root),worldBefore=worldList(root);
 assert.throws(()=>createWardrobeActor({...input,id:'wrong'}),/provenance/);
 for(const articulated of [false,true]){
  const arms=articulated?activateArticulatedArms(input):null;
  const initial=serialize(root),world=worldList(root);
  for(let repeat=0;repeat<3;repeat++){
   const wardrobe=createWardrobeActor(input);assert.equal(createWardrobeActor(input),wardrobe);
   const baseline=wardrobe.exportConfig();assert.deepEqual(serialize(root),initial);
   for(const [slot,items] of Object.entries(WARDROBE_CATALOG))for(const item of items){
    wardrobe.equip(slot,item.id);assert.equal(wardrobe.exportConfig().slots[slot],item.id);
    if(id==='bz26-D12')assert.equal(root.getObjectByName('bz26-costume-finance-market-tablet').visible,wardrobe.exportConfig().slots.leftHand==='default');
    for(const pose of ARM_POSES){arms?.setPose(pose);root.updateWorldMatrix(true,true);root.traverse(n=>assert.ok(n.matrixWorld.elements.every(Number.isFinite)));}
   }
   wardrobe.equip('headwear','beret');wardrobe.equip('outerwear','teal-vest');wardrobe.equip('leftHand','book');
   const saved=JSON.stringify(wardrobe.exportConfig());wardrobe.reset();wardrobe.loadConfig(saved);assert.equal(JSON.stringify(wardrobe.exportConfig()),saved);
   const book=root.getObjectByName('wardrobe.leftHand.book');book.visible=false;
   wardrobe.equip('headwear','cap');assert.equal(root.getObjectByName('wardrobe.leftHand.book'),book);assert.equal(book.visible,false);
   const cap=root.getObjectByName('wardrobe.headwear.cap');wardrobe.equip('headwear','cap');assert.equal(root.getObjectByName('wardrobe.headwear.cap'),cap);
   wardrobe.equip('headwear','beret');book.visible=true;
   if(id==='bz26-D12'){const tablet=root.getObjectByName('bz26-costume-finance-market-tablet');wardrobe.equip('leftHand','default');tablet.visible=false;wardrobe.equip('headwear','cap');assert.equal(tablet.visible,false);wardrobe.loadConfig(saved);}
   const stable=serialize(root);
   for(const bad of ['not json',' '.repeat(4097),{...baseline,actorId:'wrong'},{...baseline,schemaVersion:2},{...baseline,extra:'no'},{...baseline,slots:{...baseline.slots,headwear:'http://bad'}},{...baseline,slots:[]},JSON.parse('{"schemaVersion":1,"actorId":"'+id+'","slots":{"headwear":"default","outerwear":"default","leftHand":"default","__proto__":{}}}')]){
    assert.throws(()=>wardrobe.loadConfig(bad));assert.equal(JSON.stringify(wardrobe.exportConfig()),saved);assert.deepEqual(serialize(root),stable);
   }
   assert.throws(()=>wardrobe.equip('constructor','book'),/Unknown/);
   // 真正掛載失敗後，舊零件與資料都不可半套更新。
   const add=Group.prototype.add;
   try{Group.prototype.add=function(node){if(node?.name==='wardrobe.outerwear.gold-vest')throw new Error('injected wardrobe attach');return add.call(this,node);};assert.throws(()=>wardrobe.loadConfig({...baseline,slots:{headwear:'cap',outerwear:'gold-vest',leftHand:'tablet'}}),/injected/);}finally{Group.prototype.add=add;}
   assert.equal(JSON.stringify(wardrobe.exportConfig()),saved);assert.deepEqual(serialize(root),stable);
   const originalHat=root.getObjectByName('wardrobe.headwear.beret');
   const removalFailure=()=>{throw new Error('injected removal failure');};originalHat.addEventListener('removed',removalFailure);
   assert.throws(()=>wardrobe.equip('headwear','cap'),/injected removal failure/);originalHat.removeEventListener('removed',removalFailure);
   wardrobe.validate();assert.deepEqual(serialize(root),stable);assert.equal(JSON.stringify(wardrobe.exportConfig()),saved);
   if(id==='player'){context.setOutfit('swim');wardrobe.validate();assert.equal(originalHat.visible,false);context.setOutfit('normal');assert.equal(originalHat.visible,true);}

   const foreign=new Group(),owned=root.getObjectByName('wardrobe.headwear.beret');foreign.add(owned);assert.throws(()=>wardrobe.validate(),/reparented/);
   owned.addEventListener('removed',()=>{throw new Error('dispose listener');});
   wardrobe.dispose();wardrobe.dispose();assert.equal(owned.parent,null);assert.equal(foreign.children.length,0);
   arms?.setPose('neutral');assert.deepEqual(serialize(root),initial);assert.deepEqual(worldList(root),world);
   assert.throws(()=>wardrobe.exportConfig(),/disposed/);
  }
  arms?.dispose();assert.deepEqual(serialize(root),before);assert.deepEqual(worldList(root),worldBefore);
 }
 seen.push(id);
};
const build=new URL('./build.mjs',import.meta.url),original=fs.readFileSync(build,'utf8');
const token='const add = (id, root) => {';assert.equal(original.split(token).length,2);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nccu100-wardrobe-'));
try{
 const instrumented=original.replace(token,`${token}\n globalThis[Symbol.for('nccu100.wardrobe-test')](id,root,serialize,worldList,{setOutfit});`);
 const relocated=instrumented.replace(/((?:from\s+|import\s+)['"])([^'"]+)(['"])/g,(_,a,b,c)=>a+(b.startsWith('.')?new URL(b,build).href:import.meta.resolve(b))+c);
 fs.writeFileSync(path.join(dir,'build.mjs'),relocated);await import(pathToFileURL(path.join(dir,'build.mjs')).href);
}finally{fs.rmSync(dir,{recursive:true,force:true});delete globalThis[hook];}
test('four real actors equip/unmount, JSON rollback, swim, actual arm slots and full reset',()=>assert.deepEqual(seen.sort(),[...TRIAL_IDS].sort()));
