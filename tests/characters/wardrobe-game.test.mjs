import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createWardrobeActor} from '../../src/actors/wardrobe-factory.js';
import {createGameWardrobeController} from '../../src/systems/wardrobe/controller.js';
import {createGameWardrobeStore} from '../../src/actors/wardrobe-config.js';
import {getActorRigIdentity,TRIAL_IDS} from '../../src/actors/actor-rig-identity.js';
import {state} from '../../src/core/state.js';
const seen=[],hook=Symbol.for('nccu100.wardrobe-game-test');
globalThis[hook]=(id,root,serialize,context)=>{
 if(!TRIAL_IDS.includes(id))return;
 const identity=getActorRigIdentity(root),input={id,root,body:identity.body,joints:identity.joints,headCenter:identity.headCenter};
 let failStorage=false;const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(failStorage)throw Error('quota');data.set(k,v);},removeItem:k=>data.delete(k)};
 const store=createGameWardrobeStore(storage),manager=createGameWardrobeController({store,resolveActor:()=>input,createAdapter:createWardrobeActor,isEagle:()=>state.isEagle});
 const initial=serialize(root);assert.deepEqual(manager.restore(),[]);assert.deepEqual(serialize(root),initial);
 const cfg={schemaVersion:1,actorId:id,slots:{headwear:'cap',outerwear:'teal-vest',leftHand:'book'}};
 failStorage=true;assert.throws(()=>manager.apply(cfg),/quota/);assert.deepEqual(serialize(root),initial);assert.equal(data.size,0);failStorage=false;
 manager.apply(cfg);const cap=root.getObjectByName('wardrobe.headwear.cap');cap.visible=false;const stable=serialize(root),stored=JSON.stringify(store.read());failStorage=true;
 assert.throws(()=>manager.apply({...cfg,slots:{...cfg.slots,headwear:'beret'}}),/quota/);assert.equal(root.getObjectByName('wardrobe.headwear.cap'),cap);assert.equal(cap.visible,false);assert.deepEqual(serialize(root),stable);assert.equal(JSON.stringify(store.read()),stored);failStorage=false;cap.visible=true;
 assert.ok(root.getObjectByName('wardrobe.headwear.cap'));assert.ok(!root.getObjectByName('trial.elbow.L'));
 manager.reset(id);assert.deepEqual(serialize(root),initial);
 manager.apply(cfg);manager.dispose();assert.deepEqual(serialize(root),initial);
 assert.deepEqual(manager.restore(),[]);assert.ok(root.getObjectByName('wardrobe.leftHand.book'),'explicit saved settings rehydrate actual actor');
 const transforms=[];root.traverse(n=>transforms.push([n,n.position.clone(),n.quaternion.clone(),n.scale.clone()]));
 const prop=root.getObjectByName('wardrobe.leftHand.book'),local=prop.matrix.clone(),parent=prop.parent;
 if(id==='player')context.animateHero(1/60,3,true);
 else {const n=context.NPCS.find(n=>n.g===root);state.room=n.room||null;context.npcUpdate(n,1/60);}
 root.updateWorldMatrix(true,true);assert.equal(prop.parent,parent);assert.equal(parent,identity.joints.shL);assert.deepEqual(prop.matrix.elements,local.elements);assert.ok(!root.getObjectByName('trial.elbow.L'));
 if(id==='player'){context.setOutfit('swim');assert.equal(prop.visible,false);context.setOutfit('normal');assert.equal(prop.visible,true);}
 manager.clear();for(const [n,p,q,s] of transforms){n.position.copy(p);n.quaternion.copy(q);n.scale.copy(s);}assert.equal(data.size,0);
 seen.push(id);
};
const build=new URL('./build.mjs',import.meta.url),original=fs.readFileSync(build,'utf8').replace('{ NPCS, addNPC }','{ NPCS, addNPC, npcUpdate }').replace('{ H, player, setOutfit, becomeEagle }','{ H, player, setOutfit, becomeEagle, animateHero }');
const token='const add = (id, root) => {';assert.equal(original.split(token).length,2);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nccu100-wardrobe-game-'));
try{
 const instrumented=original.replace(token,`${token}\n globalThis[Symbol.for('nccu100.wardrobe-game-test')](id,root,serialize,{setOutfit,animateHero,npcUpdate,NPCS});`);
 const relocated=instrumented.replace(/((?:from\s+|import\s+)['"])([^'"]+)(['"])/g,(_,a,b,c)=>a+(b.startsWith('.')?new URL(b,build).href:import.meta.resolve(b))+c);
 fs.writeFileSync(path.join(dir,'build.mjs'),relocated);await import(pathToFileURL(path.join(dir,'build.mjs')).href);
}finally{fs.rmSync(dir,{recursive:true,force:true});delete globalThis[hook];}
test('four real game actors restore explicit settings, reset and retain legacy next-frame animation',()=>assert.deepEqual(seen.sort(),[...TRIAL_IDS].sort()));
