/** Independent preview-card QA. Uses actual constructors/costumes, never rewrites goldens. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Group} from 'three';
import {capturePoseSnapshots} from './poses.mjs';
import {CHARACTER_CARD_CATALOG as C,defaultCharacterCard,validateCharacterCard,characterCardPartChoices} from '../../src/actors/character-card-config.js';
import {createCharacterCardActor} from '../../src/actors/character-card-actor.js';
import {createVisibilityRules} from '../../src/actors/visibility-rules.js';
import {validateWardrobeConfig} from '../../src/actors/wardrobe-config.js';

const ids=['bz26-D26','bz26-D31','bz26-D12'];
test('card catalog is frozen plain JSON, strict schema and raw UTF-8 limits stay isolated from wardrobe v1',()=>{
 assert.deepEqual(Object.keys(C).sort(),[...ids].sort());assert.deepEqual(JSON.parse(JSON.stringify(C)),C);
 for(const id of ids){
  assert.ok(Object.isFrozen(C[id]));assert.ok(Object.isFrozen(C[id].parts));
  const card=defaultCharacterCard(id),raw=JSON.stringify(card);
  assert.deepEqual(validateCharacterCard(raw),card);
  assert.deepEqual(validateCharacterCard(raw+' '.repeat(4096-raw.length)),card);
  assert.throws(()=>validateCharacterCard(raw+' '.repeat(4097-raw.length)),/4 KiB/);
  assert.throws(()=>validateCharacterCard('　'.repeat(1400)),/4 KiB/);
  assert.throws(()=>validateWardrobeConfig(card));
  for(const bad of [null,[],{...card,kind:'wardrobe'},{...card,schemaVersion:2},{...card,actorId:'player'},{...card,extra:0},{...card,parts:[]},{...card,parts:{...card.parts,extra:'none'}},JSON.parse(raw.replace('"parts":{','"parts":{"__proto__":{},')),Object.assign(Object.create({evil:1}),card),{schemaVersion:1,actorId:id,slots:{headwear:'default',outerwear:'default',leftHand:'default'}}])assert.throws(()=>validateCharacterCard(bad));
  let read=false;const getter={...card};Object.defineProperty(getter,'parts',{enumerable:true,get(){read=true;return card.parts;}});assert.throws(()=>validateCharacterCard(getter));assert.equal(read,false);
  const copy=validateCharacterCard(card);copy.parts.top=C[id].parts.top;assert.equal(card.parts.top,'default');
  for(const slot of Object.keys(card.parts)){assert.deepEqual(characterCardPartChoices(id,slot),['top','bottom'].includes(slot)?['default',C[id].parts[slot]]:['default','none',C[id].parts[slot]]);}
  for(const slot of ['top','bottom'])assert.throws(()=>validateCharacterCard({...card,parts:{...card.parts,[slot]:'none'}}));
  for(const slot of Object.keys(card.parts))assert.throws(()=>validateCharacterCard({...card,parts:{...card.parts,[slot]:'foreign-item'}}));
 }
});

test('visibility leases keep overlapping owners, initial hidden state and invalid updates atomic',()=>{
 const a=new Group(),b=new Group();b.visible=false;const rules=createVisibilityRules();
 rules.sync(new Map([['one',[a,b]],['two',[a]]]));assert.equal(a.visible,false);
 rules.sync(new Map([['two',[a]]]));assert.equal(a.visible,false);assert.equal(b.visible,false);
 assert.throws(()=>rules.sync(new Map([['bad',[{}]]])));assert.equal(a.visible,false);
 rules.clear();assert.equal(a.visible,true);assert.equal(b.visible,false);
 a.visible=false;rules.sync(new Map([['one',[a]]]));a.visible=true;rules.sync(new Map([['one',[a]]]));assert.equal(a.visible,false);rules.clear();assert.equal(a.visible,true);
});

test('three actual costumes preserve native refs/defaults and rollback partial mounts/storage without disposal',async()=>{
const seen=[],hook=Symbol.for('nccu100.card-independent-qa');
globalThis[hook]=(id,root,serialize,worldList,npc)=>{
 if(!ids.includes(id))return;
 const before=serialize(root),world=worldList(root),refs=[];root.traverse(n=>refs.push([n,n.parent,n.visible]));
 const after=npc.after,P=npc.P,assembly=npc.assembly;
 const poseBaseline=capturePoseSnapshots('chiang',root,P,worldList);
 const assertBodyRemovalRejected=actor=>{
  const card=actor.exportCard(),snapshot=serialize(root),worldSnapshot=worldList(root),poses=capturePoseSnapshots('chiang',root,P,worldList),nodes=[];root.traverse(node=>nodes.push([node,node.parent,node.visible]));
  for(const slot of ['top','bottom'])for(const value of [{...card,parts:{...card.parts,[slot]:'none'}},JSON.stringify({...card,parts:{...card.parts,[slot]:'none'}})]){
   let committed=false;assert.throws(()=>actor.loadCard(value,{commit(){committed=true;}}));assert.equal(committed,false);assert.deepEqual(actor.exportCard(),card);assert.deepEqual(serialize(root),snapshot);assert.deepEqual(worldList(root),worldSnapshot);assert.deepEqual(capturePoseSnapshots('chiang',root,P,worldList),poses);
   for(const [node,parent,visible] of nodes){assert.equal(node.parent,parent);assert.equal(node.visible,visible);}
   for(const side of ['L','R']){assert.equal(assembly.limbParts['arm'+side].hand.parent,P['sh'+side]);assert.equal(assembly.limbParts['leg'+side].leg.parent,P['hip'+side]);}
  }
 };
 const geometries=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);});let disposed=0;
 const listener=()=>disposed++;for(const g of geometries)g.addEventListener('dispose',listener);
 const actor=createCharacterCardActor(npc),base=actor.exportCard();assertBodyRemovalRejected(actor);
 assert.deepEqual(serialize(root),before);assert.throws(()=>createCharacterCardActor(npc),/active/);
 {const anchor=actor.anchors['costume.head'],parent=anchor.parent,index=parent.children.indexOf(anchor),foreign=new Group();foreign.add(anchor);
 try{assert.throws(()=>actor.validate(),/hierarchy|anchor|reparent/i,'reparented costume anchor must reject before mutation');}finally{foreign.remove(anchor);parent.add(anchor);parent.children.splice(parent.children.indexOf(anchor),1);parent.children.splice(index,0,anchor);}}
 for(const slot of Object.keys(C[id].parts)){
  const next={...base,parts:{...base.parts,[slot]:C[id].parts[slot]}};
  actor.loadCard(next);actor.validate();
  if(slot!=='dress'){assert.deepEqual(worldList(root),world,`${id}/${slot}: native clone must retain world shape`);assert.deepEqual(capturePoseSnapshots('chiang',root,P,worldList),poseBaseline,`${id}/${slot}: six real-joint poses retain native shape`);}
  const stable=serialize(root),owned=[];root.traverse(n=>{if(n.name.startsWith('character-card.'))owned.push(n);});
  actor.loadCard(next);assert.deepEqual(serialize(root),stable);for(const n of owned)assert.ok(n.parent);
  assert.throws(()=>actor.reset({commit(){throw new Error('quota');}}),/quota/);assert.deepEqual(serialize(root),stable);assert.deepEqual(actor.exportCard(),next);for(const n of owned)assert.ok(n.parent);
  actor.reset();assert.deepEqual(serialize(root),before);
 }
 const all={...base,parts:{...C[id].parts}};actor.loadCard(all);assertBodyRemovalRejected(actor);const stable=serialize(root),saved=actor.exportCard();
 for(const invalid of ['x',' '.repeat(4097),{...base,actorId:'player'}]){assert.throws(()=>actor.loadCard(invalid));assert.deepEqual(serialize(root),stable);}
 assert.throws(()=>actor.reset({commit:async()=>{}}),/synchronous/);assert.deepEqual(serialize(root),stable);
 assert.throws(()=>actor.reset({commit:()=>Promise.resolve()}),/Promise/);assert.deepEqual(serialize(root),stable);
 const existing=[];root.traverse(n=>{if(n.name.startsWith('character-card.'))existing.push(n);});
 {const node=existing.find(n=>n.name.startsWith('character-card.top.')),visible=node.visible;node.visible=false;
 const changed={...saved,parts:{...saved.parts,bottom:'default'}};actor.loadCard(changed);assert.equal(node.visible,false);assert.ok(node.parent);actor.loadCard(saved);node.visible=visible;}
 {const node=existing[0],parent=node.parent,index=parent.children.indexOf(node),foreign=new Group();foreign.add(node);
 try{assert.throws(()=>actor.loadCard(base),/reparent/i);}finally{foreign.remove(node);parent.add(node);parent.children.splice(parent.children.indexOf(node),1);parent.children.splice(index,0,node);}}
 const throwRemoved=()=>{throw new Error('removed callback');};existing[0].addEventListener('removed',throwRemoved);
 assert.throws(()=>actor.reset(),/removed callback/);existing[0].removeEventListener('removed',throwRemoved);assert.deepEqual(serialize(root),stable);assert.deepEqual(actor.exportCard(),saved);
 if(base.parts.dress!==undefined){
  actor.loadCard({...all,parts:{...all.parts,dress:'default'}});assert.equal(assembly.parts.torso.visible,false,'top owner must keep original hidden after dress releases');actor.loadCard(all);
 }
 actor.reset();const add=Group.prototype.add;
 try{let count=0;Group.prototype.add=function(node){const result=add.call(this,node);if(node?.name.startsWith('character-card.')&&++count===2)throw new Error('partial attach');return result;};assert.throws(()=>actor.loadCard(all),/partial attach/);}finally{Group.prototype.add=add;}
 assert.deepEqual(serialize(root),before);assert.deepEqual(actor.exportCard(),base);
 actor.loadCard(saved);actor.reset();
 const torso=assembly.parts.torso,oldVisible=torso.visible;torso.visible=false;actor.loadCard({...base,parts:{...base.parts,top:C[id].parts.top}});actor.reset();assert.equal(torso.visible,false,'original externally hidden before lease remains hidden');torso.visible=oldVisible;
 actor.dispose();actor.dispose();
 assert.deepEqual(serialize(root),before);assert.deepEqual(worldList(root),world);
 for(const [n,parent,visible] of refs){assert.equal(n.parent,parent);assert.equal(n.visible,visible);}
 assert.equal(npc.after,after);assert.equal(npc.P,P);assert.equal(npc.assembly,assembly);assert.equal(disposed,0);
 for(const g of geometries)g.removeEventListener('dispose',listener);
 for(const op of [()=>actor.exportCard(),()=>actor.reset(),()=>actor.refresh(),()=>actor.validate(),()=>actor.loadCard(base)])assert.throws(op,/disposed/);
 const reload=createCharacterCardActor(npc);reload.loadCard(saved);reload.reset();reload.dispose();assert.deepEqual(serialize(root),before);seen.push(id);
};
const build=new URL('./build.mjs',import.meta.url),original=fs.readFileSync(build,'utf8'),token='const add = (id, root) => {';
assert.equal(original.split(token).length,2);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nccu100-cards-qa-'));
try{
 const injected=original.replace(token,`${token}\n globalThis[Symbol.for('nccu100.card-independent-qa')](id,root,serialize,worldList,NPCS.find(n=>n.g===root));`);
 const relocated=injected.replace(/((?:from\s+|import\s+)['"])([^'"]+)(['"])/g,(_,a,b,c)=>a+(b.startsWith('.')?new URL(b,build).href:import.meta.resolve(b))+c);
 fs.writeFileSync(path.join(dir,'build.mjs'),relocated);await import(pathToFileURL(path.join(dir,'build.mjs')).href);
}finally{fs.rmSync(dir,{recursive:true,force:true});delete globalThis[hook];}
assert.deepEqual(seen.sort(),[...ids].sort());
});
