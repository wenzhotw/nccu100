/** Independent full-catalog QA. Synthetic lifecycle tests and true constructor tests are labeled separately. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {createCharacterRegistry,characterRegistry} from '../../src/actors/character-registry.js';
import {readyNpcCharacter} from '../../src/actors/character-part-sources.js';
import {createActorPartsAdapter} from '../../src/actors/actor-parts-adapter.js';
import {defaultActorPartsCard,validateActorPartsCard,parseActorPartsCard,migrateLegacyCharacterCard} from '../../src/actors/actor-parts-config.js';
import {createActorPartsStore,ACTOR_PARTS_GAME_KEY} from '../../src/systems/actor-parts/store.js';
import {createActorPartsController} from '../../src/systems/actor-parts/controller.js';
import {createAppearanceOwnership} from '../../src/actors/appearance-ownership.js';
import MANIFEST from '../../src/actors/character-manifest.json';
import {CHARACTER_CARD_CATALOG,defaultCharacterCard} from '../../src/actors/character-card-config.js';
function fixture(id='principal') {const root=new Group(),pivot=new Group(),a=new Mesh(new BoxGeometry(),new MeshBasicMaterial()),b=a.clone();root.add(pivot);pivot.add(a,b);return {id,root,kind:'humanoid',slots:{body:{sources:[a],allowNone:false},accessory:{sources:[b],allowNone:true}},anchors:{pivot}};}
function memory(){const data=new Map();let failure=false,writes=0;return {data,set failure(v){failure=v;},get writes(){return writes;},storage:{getItem:k=>data.get(k)??null,setItem(k,v){if(failure)throw Error('quota');writes++;data.set(k,v);},removeItem(k){if(failure)throw Error('quota');writes++;data.delete(k);}}};}
function live(registry,descriptor){registry.register(descriptor);return registry.ready(descriptor.id,descriptor.root);}

test('manifest is 115 unique identities including EXAM, six stable anonymous and twenty late NPCs',()=>{
 assert.equal(MANIFEST.length,115);assert.equal(new Set(MANIFEST.map(x=>x.id)).size,115);
 for(const id of ['bz26-EXAM','player','library-lion-left','library-lion-right','pangolin','old-principal.horse','biz-tsai'])assert.ok(MANIFEST.some(x=>x.id===id),id);
 assert.equal(MANIFEST.filter(x=>x.id.startsWith('students-')).length,6);assert.equal(MANIFEST.filter(x=>x.late).length,20);
});
test('strict actor card schema, UTF-8 limit, mandatory sources and registry generation reject stale operations',()=>{
 const r=createCharacterRegistry(),d=fixture(),entry=live(r,d),card=defaultActorPartsCard(entry),raw=JSON.stringify(card);
 assert.deepEqual(validateActorPartsCard(raw+' '.repeat(16384-raw.length),entry),card);assert.throws(()=>parseActorPartsCard(raw+' '.repeat(16385-raw.length)));assert.throws(()=>parseActorPartsCard('　'.repeat(6000)));
 for(const value of [null,[],{...card,extra:1},{...card,parts:{...card.parts,body:'none'}},{...card,parts:{...card.parts,constructor:'native'}},JSON.parse(raw.replace('"parts":{','"parts":{"__proto__":{},')),Object.assign(Object.create({}),card)])assert.throws(()=>validateActorPartsCard(value,entry));
 let called=false;const getter={...card};Object.defineProperty(getter,'parts',{enumerable:true,get(){called=true;return card.parts;}});assert.throws(()=>parseActorPartsCard(getter));assert.equal(called,false);
 assert.throws(()=>r.register({...d,id:'dean'}));const invalid=fixture('koko');invalid.slots.body.allowNone=true;assert.throws(()=>r.register(invalid));
 const previous=r.get(d.id),stop=r.subscribe(event=>{if(event.type==='form')throw Error('cannot release');});assert.throws(()=>r.beginForm(d.id,d.root),/release/);assert.equal(r.get(d.id),previous);stop();
 assert.throws(()=>r.register(d),/immutable/);const next=fixture();r.register(next);assert.equal(r.ready(d.id,d.root,entry.generation),null);assert.equal(r.unregister(d.id,d.root),false);assert.equal(r.get(d.id).root,next.root);assert.ok(!r.get(d.id).ready);
});
test('synthetic late lifecycle: saved-before-ready, repeat-ready, form suspend/resume, replacement and quota preserve ownership',()=>{
 const r=createCharacterRegistry(),m=memory(),store=createActorPartsStore(m.storage),ownership=createAppearanceOwnership();
 const controller=createActorPartsController({registry:r,store,ownership,createAdapter:createActorPartsAdapter});
 m.data.set('nccu100-save','sentinel');m.data.set('nccu100.wardrobe.game.v1','sentinel-v1');m.data.set('nccu100.character-card.game-preview.v1','sentinel-preview');
 for(const row of MANIFEST.filter(x=>x.late)){
  const d=fixture(row.id);let supported=true;d.supported=()=>supported;
  const card={...defaultActorPartsCard(d),parts:{body:'native',accessory:'native'}};store.writeActor(card);controller.restore();assert.equal(ownership.ownerOf(row.id),null);
  r.register(d);assert.equal(ownership.ownerOf(row.id),null);const count=m.writes;const e=r.ready(row.id,d.root);assert.equal(ownership.ownerOf(row.id),'actor-parts');assert.equal(m.writes,count);
  const clones=d.root.children[0].children.filter(n=>n.name.startsWith('actor-parts.'));assert.equal(clones.length,2);r.ready(row.id,d.root);assert.deepEqual(d.root.children[0].children.filter(n=>n.name.startsWith('actor-parts.')),clones);
  clones[0].visible=false;const children=[...d.root.children[0].children],saved=m.data.get(ACTOR_PARTS_GAME_KEY);m.failure=true;
  assert.throws(()=>controller.apply({...card,parts:{...card.parts,accessory:'none'}}),/quota/);assert.deepEqual(d.root.children[0].children,children);assert.equal(clones[0].visible,false);assert.equal(m.data.get(ACTOR_PARTS_GAME_KEY),saved);assert.throws(()=>controller.reset(row.id),/quota/);assert.equal(ownership.ownerOf(row.id),'actor-parts');m.failure=false;
  r.beginForm(row.id,d.root);assert.equal(ownership.ownerOf(row.id),null);supported=false;r.form(row.id,d.root);assert.equal(ownership.ownerOf(row.id),null);supported=true;r.form(row.id,d.root);assert.equal(ownership.ownerOf(row.id),'actor-parts');
  const replacement=fixture(row.id);r.register(replacement);assert.equal(ownership.ownerOf(row.id),null);r.ready(row.id,replacement.root);assert.equal(ownership.ownerOf(row.id),'actor-parts');assert.equal(r.unregister(row.id,d.root),false);assert.equal(ownership.ownerOf(row.id),'actor-parts');
  controller.reset(row.id);assert.equal(ownership.ownerOf(row.id),null);assert.equal(store.read().actors[row.id],undefined);r.unregister(row.id,replacement.root);
 }
 controller.dispose();assert.equal(m.data.get('nccu100-save'),'sentinel');assert.equal(m.data.get('nccu100.wardrobe.game.v1'),'sentinel-v1');assert.equal(m.data.get('nccu100.character-card.game-preview.v1'),'sentinel-preview');
});

test('native cloned descendants follow live transforms/materials; failed removal/attach preserves original refs and anchor guard',()=>{
 const r=createCharacterRegistry(),d=fixture(),child=new Mesh(new BoxGeometry(),new MeshBasicMaterial());d.slots.body.sources[0].add(child);const entry=live(r,d),adapter=createActorPartsAdapter(entry),base=adapter.exportCard(),card={...base,parts:{body:'native',accessory:'native'}};
 adapter.loadCard(card);const pivot=d.root.children[0],clones=pivot.children.filter(n=>n.name.startsWith('actor-parts.')),body=clones[0],material=new MeshBasicMaterial();child.position.x=.4;child.rotation.z=.7;child.visible=false;child.material=material;adapter.refresh();assert.equal(body.children[0].position.x,.4);assert.equal(body.children[0].rotation.z,.7);assert.equal(body.children[0].visible,false);assert.equal(body.children[0].material,material);
 const order=[...pivot.children],throwRemoval=()=>{throw Error('removed');};body.addEventListener('removed',throwRemoval);assert.throws(()=>adapter.reset(),/removed/);body.removeEventListener('removed',throwRemoval);assert.deepEqual(pivot.children,order);assert.deepEqual(adapter.exportCard(),card);
 const foreign=new Group();foreign.add(pivot);assert.throws(()=>adapter.validate(),/anchor/);d.root.add(pivot);adapter.reset();const add=Group.prototype.add;try{let count=0;Group.prototype.add=function(node){const result=add.call(this,node);if(node.name.startsWith('actor-parts.')&&++count===2)throw Error('attach');return result;};assert.throws(()=>adapter.loadCard(card),/attach/);}finally{Group.prototype.add=add;}assert.equal(pivot.children.length,2);assert.deepEqual(adapter.exportCard(),base);adapter.dispose();
});
test('pending readiness and same-root source completion preserve form suspension until explicit form completion',()=>{
 const r=createCharacterRegistry(),d=fixture();const initial=r.register(d);r.beginForm(d.id,d.root);
 assert.equal(r.get(d.id).supported(),false);r.register(d);
 assert.equal(r.get(d.id).formTransition,true,'completing pending sources must not unlock form');
 const ready=r.ready(d.id,d.root,initial.generation);assert.equal(ready.ready,true);assert.equal(ready.formTransition,true);assert.equal(ready.supported(),false);
 r.form(d.id,d.root);assert.equal(r.get(d.id).formTransition,false);assert.equal(r.get(d.id).supported(),true);
});
test('observable external source show transfers to native clone while explicit clone hiding and dress cover retain priority',()=>{
 const r=createCharacterRegistry(),d=fixture();d.slots.dress={sources:[new Mesh(new BoxGeometry(),new MeshBasicMaterial())],allowNone:true};d.root.children[0].add(d.slots.dress.sources[0]);d.rules={dress:['accessory']};
 const original=d.slots.accessory.sources[0];original.visible=false;const entry=live(r,d),a=createActorPartsAdapter(entry),card=a.exportCard();card.parts.accessory='native';a.loadCard(card);
 const clone=d.root.children[0].children.find(n=>n.name.startsWith('actor-parts.accessory.'));assert.equal(clone.visible,false);
 original.visible=true;a.refresh();assert.equal(original.visible,false);assert.equal(clone.visible,true,'external show must reach the replacement');
 clone.visible=false;a.refresh();assert.equal(clone.visible,false,'no new external show must not erase explicit clone hide');
 card.parts.dress='native';a.loadCard(card);original.visible=true;a.refresh();assert.equal(clone.visible,false,'cover owner wins over source show');
 card.parts.dress='default';a.loadCard(card);assert.equal(clone.visible,true,'cover release restores the newly observed baseline');a.dispose();assert.equal(original.visible,true);
});
test('true snapshot constructors: every available actor supports real native apply/reset without world or resource mutation',async()=>{
 const seen=[],hook=Symbol.for('nccu100.all-cards-qa');
 globalThis[hook]=(id,root,serialize,worldList,n,context)=>{
  if(id.includes('#'))return;if(n)readyNpcCharacter(n);const entry=characterRegistry.get(id);assert.ok(entry?.ready,`${id} real constructor registered ready`);assert.equal(entry.root,root);
  const before=serialize(root),world=worldList(root),refs=[];root.traverse(node=>refs.push([node,node.parent,node.visible]));let disposal=0;const geos=new Set(refs.map(([n])=>n.geometry).filter(Boolean)),onDispose=()=>disposal++;for(const g of geos)g.addEventListener('dispose',onDispose);
  const adapter=createActorPartsAdapter(entry),base=adapter.exportCard(),native={...base,parts:Object.fromEntries(Object.keys(base.parts).map(s=>[s,Object.hasOwn(entry.rules||{},s)?'default':'native']))};
  if(Object.hasOwn(CHARACTER_CARD_CATALOG,id)){const legacy=defaultCharacterCard(id);assert.throws(()=>parseActorPartsCard(legacy));assert.deepEqual(migrateLegacyCharacterCard(legacy,entry),base);const converted=migrateLegacyCharacterCard({...legacy,parts:{...CHARACTER_CARD_CATALOG[id].parts}},entry);for(const slot of Object.keys(legacy.parts))assert.equal(converted.parts[slot],'native');assert.deepEqual(serialize(root),before);}
  assert.deepEqual(serialize(root),before);adapter.loadCard(native);adapter.refresh();assert.deepEqual(worldList(root),world,`${id} native world equivalence`);
  const stable=serialize(root),owned=[];root.traverse(n=>{if(n.name.startsWith('actor-parts.'))owned.push(n);});adapter.loadCard(native);assert.deepEqual(serialize(root),stable);for(const node of owned)assert.ok(node.parent);
  assert.throws(()=>adapter.reset({commit(){throw Error('quota');}}),/quota/);assert.deepEqual(serialize(root),stable);assert.deepEqual(adapter.exportCard(),native);
  for(const [owner,targets] of Object.entries(entry.rules||{})){
   adapter.loadCard({...native,parts:{...native.parts,[owner]:'native'}});
   for(const slot of targets)for(const node of entry.slots[slot].sources)assert.equal(node.visible,false);
   adapter.loadCard(native);for(const slot of targets)for(const node of entry.slots[slot].sources)assert.equal(node.visible,false,'native slot owner survives dress owner release');
   assert.deepEqual(worldList(root),world);
  }
  for(const [slot,spec] of Object.entries(entry.slots))if(!spec.allowNone){assert.throws(()=>adapter.loadCard({...native,parts:{...native.parts,[slot]:'none'}}));assert.deepEqual(serialize(root),stable);}
  adapter.reset();adapter.dispose();assert.deepEqual(serialize(root),before);assert.deepEqual(worldList(root),world);for(const [node,parent,visible] of refs){assert.equal(node.parent,parent);assert.equal(node.visible,visible);}assert.equal(disposal,0);for(const g of geos)g.removeEventListener('dispose',onDispose);if(id==='player'){
   const mem=memory(),store=createActorPartsStore(mem.storage),ownership=createAppearanceOwnership(),controller=createActorPartsController({registry:characterRegistry,store,ownership,createAdapter:createActorPartsAdapter});controller.apply(native);const saved=mem.data.get(ACTOR_PARTS_GAME_KEY),writes=mem.writes;
   context.setOutfit('swim');assert.equal(ownership.ownerOf('player'),null);assert.equal(characterRegistry.get('player').supported(),false);assert.equal(mem.data.get(ACTOR_PARTS_GAME_KEY),saved);
   context.setOutfit('normal');assert.equal(ownership.ownerOf('player'),'actor-parts');assert.equal(mem.writes,writes);assert.deepEqual(controller.exportCard('player'),native);controller.reset('player');controller.dispose();assert.deepEqual(serialize(root),before);
  }seen.push(id);
 };
 const source=new URL('./build.mjs',import.meta.url),original=fs.readFileSync(source,'utf8'),token='const add = (id, root) => {';assert.equal(original.split(token).length,2);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nccu100-all-cards-qa-'));
 try{const injected=original.replace(token,`${token}\n globalThis[Symbol.for('nccu100.all-cards-qa')](id,root,serialize,worldList,NPCS.find(n=>n.g===root),{setOutfit});`);const relocated=injected.replace(/((?:from\s+|import\s+)['"])([^'"]+)(['"])/g,(_,a,b,c)=>a+(b.startsWith('.')?new URL(b,source).href:import.meta.resolve(b))+c);fs.writeFileSync(path.join(dir,'build.mjs'),relocated);const built=await import(pathToFileURL(path.join(dir,'build.mjs')).href);
  // These are real constructors. This is not a browser event-trigger census.
  const {addNPC}=await import('../../src/actors/npc.js'),{default:bz}=await import('../../src/content/baozhong.json');
  const exam=addNPC({id:'bz26-EXAM',title:bz.exam.npc.title,home:{x:0,z:0},look:bz.exam.npc.look,dialog:[{lines:['QA']}]});
  globalThis[hook]('bz26-EXAM',exam.g,built.serialize,built.worldList,exam);
  await import('../../src/actors/pangolin.js');const {default:library}=await import('../../src/world/buildings/library/index.js');library.build();
  for(const id of ['library-lion-left','library-lion-right','pangolin','old-principal.horse']){const entry=characterRegistry.get(id);assert.ok(entry?.ready,id);assert.notEqual(entry.kind,'humanoid');assert.ok(!entry.slots['hand.L']);globalThis[hook](id,entry.root,built.serialize,built.worldList);}
  assert.deepEqual(characterRegistry.list().map(e=>e.id).sort(),MANIFEST.map(e=>e.id).sort());

 }finally{fs.rmSync(dir,{recursive:true,force:true});delete globalThis[hook];}
 assert.equal(seen.length,115,'110 corpus roots plus EXAM and four explicit special constructors');assert.equal(new Set(seen).size,115);
});
