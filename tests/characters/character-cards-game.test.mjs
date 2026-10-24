/** Independent opt-in game-card transaction/ownership QA; actual NPC constructors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createAppearanceOwnership,ownAppearanceAdapter} from '../../src/actors/appearance-ownership.js';
import {createCardPreviewController} from '../../src/systems/character-cards/controller.js';
import {createCardPreviewStore,CARD_GAME_PREVIEW_KEY} from '../../src/systems/character-cards/store.js';
import {createCharacterCardActor} from '../../src/actors/character-card-actor.js';
import {CHARACTER_CARD_CATALOG as C,CHARACTER_CARD_PREVIEW_KEY,defaultCharacterCard} from '../../src/actors/character-card-config.js';
import {createGameWardrobeController} from '../../src/systems/wardrobe/controller.js';
import {createGameWardrobeStore,GAME_WARDROBE_KEY} from '../../src/actors/wardrobe-config.js';
import {createWardrobeActor} from '../../src/actors/wardrobe-factory.js';
import {state} from '../../src/core/state.js';
import {isCardGamePreviewEnabled} from '../../src/systems/character-cards/gate.js';
function memory(){const data=new Map();let fail=false;return {data,set fail(v){fail=v;},storage:{getItem:k=>data.get(k)??null,setItem(k,v){if(fail)throw Error('quota');data.set(k,v);},removeItem(k){if(fail)throw Error('quota');data.delete(k);}}};}

test('query gate requires exactly one explicit 1, production wiring restores v1 before conditional dynamic import',()=>{
 for(const value of ['',undefined,null,'?characterCardsPreview','?characterCardsPreview=0','?characterCardsPreview=true','?characterCardsPreview=01','?characterCardsPreview=1&characterCardsPreview=1','?characterCardsPreview=0&characterCardsPreview=1','?other=1'])assert.equal(isCardGamePreviewEnabled(value),false);
 for(const value of ['?characterCardsPreview=1','?foo=2&characterCardsPreview=1'])assert.equal(isCardGamePreviewEnabled(value),true);
 const source=fs.readFileSync(new URL('../../src/systems/wardrobe/index.js',import.meta.url),'utf8');
 assert.ok(source.indexOf('const errors=controller.restore()')<source.indexOf("import('../character-cards/index.js')"));
 assert.match(source,/if\(isCardGamePreviewEnabled\(location.search\)\)\{\s*import\('\.\.\/character-cards\/index.js'\)/);
 assert.doesNotMatch(source,/import\s+[^;]+from\s*['"][^'"]*character-cards\/index/);
});
test('ownership is exclusive, failed creation releases only its lease, disposal is idempotent',()=>{
 const r=createAppearanceOwnership();let disposed=0;
 assert.throws(()=>ownAppearanceAdapter(r,'bz26-D12','cards-preview',()=>{throw Error('factory');}),/factory/);assert.equal(r.ownerOf('bz26-D12'),null);
 const first=ownAppearanceAdapter(r,'bz26-D12','wardrobe-v1',()=>({dispose(){disposed++;}}));
 assert.throws(()=>ownAppearanceAdapter(r,'bz26-D12','cards-preview',()=>assert.fail('must not call factory')),/管理/);
 first.dispose();assert.equal(disposed,1);const lease=r.acquire('bz26-D12','cards-preview');first.dispose();assert.equal(r.ownerOf('bz26-D12'),'cards-preview');lease.release();lease.release();assert.equal(r.ownerOf('bz26-D12'),null);
 let fail=true;const bad=ownAppearanceAdapter(r,'bz26-D12','cards-preview',()=>({dispose(){if(fail)throw Error('partial cleanup');}}));assert.throws(()=>bad.dispose(),/cleanup/);assert.equal(r.ownerOf('bz26-D12'),'cards-preview');assert.throws(()=>r.acquire('bz26-D12','wardrobe-v1'));fail=false;bad.dispose();assert.equal(r.ownerOf('bz26-D12'),null);
});
test('preview storage never reads or changes workbench, wardrobe or game progress; malformed stores fail closed',()=>{
 const m=memory(),s=createCardPreviewStore(m.storage),sentinels={'nccu100-save':'legacy', [GAME_WARDROBE_KEY]:'wardrobe', [CHARACTER_CARD_PREVIEW_KEY+'.bz26-D12']:'workbench'};
 for(const [k,v] of Object.entries(sentinels))m.data.set(k,v);assert.deepEqual(s.read().actors,{});
 const card=defaultCharacterCard('bz26-D12');s.writeActor(card);s.removeActor(card.actorId);s.clear();for(const [k,v] of Object.entries(sentinels))assert.equal(m.data.get(k),v);
 for(const raw of [' '.repeat(16385),'　'.repeat(6000),'{}','{"kind":"nccu100.character-card.game-preview","schemaVersion":1,"actors":{"__proto__":{}}}',JSON.stringify({kind:'nccu100.character-card.game-preview',schemaVersion:1,actors:{'bz26-D26':card}})]){m.data.set(CARD_GAME_PREVIEW_KEY,raw);assert.throws(()=>s.read());assert.equal(m.data.get(CARD_GAME_PREVIEW_KEY),raw);}
});
test('three actual game NPCs retain refs on storage failures; D12 appearance systems cannot dismantle each other',async()=>{
 const seen=[],hook=Symbol.for('nccu100.card-game-qa');
 globalThis[hook]=(id,root,serialize,n,npcUpdate)=>{
  if(!Object.hasOwn(C,id))return;
  const originalRefs=[];root.traverse(n=>originalRefs.push([n,n.parent,n.visible]));const geos=new Set(originalRefs.map(([n])=>n.geometry).filter(Boolean));let disposeCalls=0;const onDispose=()=>disposeCalls++;for(const g of geos)g.addEventListener('dispose',onDispose);
  const initial=serialize(root),m=memory(),ownership=createAppearanceOwnership(),store=createCardPreviewStore(m.storage);
  m.data.set('nccu100-save','keep-progress');m.data.set(CHARACTER_CARD_PREVIEW_KEY+'.'+id,'keep-workbench');
  const controller=createCardPreviewController({store,ownership,resolveActor:()=>n,createAdapter:createCharacterCardActor});
  const base=defaultCharacterCard(id),card={...base,parts:{...C[id].parts}};
  assert.deepEqual(controller.restore(),[]);controller.apply(base);assert.equal(ownership.ownerOf(id),null);assert.deepEqual(serialize(root),initial);
  m.fail=true;assert.throws(()=>controller.apply(card),/quota/);assert.equal(ownership.ownerOf(id),null);assert.deepEqual(serialize(root),initial);m.fail=false;
  controller.apply(card);assert.equal(ownership.ownerOf(id),'cards-preview');const owned=[];root.traverse(n=>{if(n.name.startsWith('character-card.'))owned.push(n);});
  const held=owned.find(n=>n.name.startsWith('character-card.top.')),visible=held.visible;held.visible=false;
  const stable=serialize(root),saved=m.data.get(CARD_GAME_PREVIEW_KEY);
  for(const slot of ['top','bottom']){assert.throws(()=>controller.apply({...card,parts:{...card.parts,[slot]:'none'}}));assert.deepEqual(serialize(root),stable);assert.equal(m.data.get(CARD_GAME_PREVIEW_KEY),saved);assert.equal(ownership.ownerOf(id),'cards-preview');for(const node of owned)assert.ok(node.parent);}
  m.fail=true;
  for(const change of [()=>controller.apply({...card,parts:{...card.parts,top:'default'}}),()=>controller.reset(id),()=>controller.apply(base),()=>controller.clear()]){
   assert.throws(change,/quota/);assert.equal(ownership.ownerOf(id),'cards-preview');assert.deepEqual(serialize(root),stable);assert.equal(m.data.get(CARD_GAME_PREVIEW_KEY),saved);for(const n of owned)assert.ok(n.parent);
  }
  m.fail=false;held.visible=visible;
  {const transforms=[];root.traverse(node=>transforms.push([node,node.position.clone(),node.quaternion.clone(),node.scale.clone(),node.visible]));const room=state.room,fields={blink:n.blink,sayT:n.sayT,ph:n.ph},map=n.P.fm.map;n.blink=1;n.sayT=1;state.room=n.room||null;
   try{npcUpdate(n,1/60);for(const node of owned)assert.ok(node.parent,'next real game frame must keep equipped nodes');root.updateMatrixWorld(true);root.traverse(node=>assert.ok(node.matrixWorld.elements.every(Number.isFinite)));}finally{state.room=room;Object.assign(n,fields);n.P.fm.map=map;for(const [node,p,q,s,v] of transforms){node.position.copy(p);node.quaternion.copy(q);node.scale.copy(s);node.visible=v;}}}
  controller.reset(id);assert.equal(ownership.ownerOf(id),null);assert.deepEqual(serialize(root),initial);
  controller.apply(card);controller.dispose();assert.equal(ownership.ownerOf(id),null);assert.deepEqual(serialize(root),initial);assert.deepEqual(controller.restore(),[]);controller.reset(id);
  if(id==='bz26-D12'){
   const input={id,root,body:n.rig,joints:n.P,headCenter:n.P.head},oldStore=createGameWardrobeStore(m.storage);
   const old=createGameWardrobeController({store:oldStore,resolveActor:()=>input,createAdapter:value=>ownAppearanceAdapter(ownership,id,'wardrobe-v1',()=>createWardrobeActor(value))});
   const cfg={schemaVersion:1,actorId:id,slots:{headwear:'cap',outerwear:'teal-vest',leftHand:'book'}};
   oldStore.writeActor(cfg);store.writeActor(card);assert.deepEqual(old.restore(),[]);assert.equal(ownership.ownerOf(id),'wardrobe-v1');
   const oldRefs=[];root.traverse(n=>{if(n.name.startsWith('wardrobe.'))oldRefs.push(n);});const oldState=serialize(root);
   assert.equal(controller.restore().length,1);assert.throws(()=>controller.apply(card),/管理/);controller.apply(base);controller.dispose();assert.deepEqual(serialize(root),oldState);for(const n of oldRefs)assert.ok(n.parent);assert.equal(ownership.ownerOf(id),'wardrobe-v1');
   old.reset(id);assert.equal(ownership.ownerOf(id),null);controller.apply(card);const cardState=serialize(root);
   assert.throws(()=>old.apply(cfg),/管理/);old.reset(id);old.dispose();assert.deepEqual(serialize(root),cardState);assert.equal(ownership.ownerOf(id),'cards-preview');
   controller.reset(id);old.apply(cfg);old.dispose();assert.deepEqual(serialize(root),initial);assert.equal(ownership.ownerOf(id),null);
  }
  assert.equal(m.data.get('nccu100-save'),'keep-progress');assert.equal(m.data.get(CHARACTER_CARD_PREVIEW_KEY+'.'+id),'keep-workbench');controller.dispose();assert.equal(disposeCalls,0);for(const g of geos)g.removeEventListener('dispose',onDispose);for(const [node,parent,visible] of originalRefs){assert.equal(node.parent,parent);assert.equal(node.visible,visible);}seen.push(id);
 };
 const source=new URL('./build.mjs',import.meta.url),original=fs.readFileSync(source,'utf8').replace('{ NPCS, addNPC }','{ NPCS, addNPC, npcUpdate }'),token='const add = (id, root) => {';assert.equal(original.split(token).length,2);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nccu100-card-game-qa-'));
 try{const injected=original.replace(token,`${token}\n globalThis[Symbol.for('nccu100.card-game-qa')](id,root,serialize,NPCS.find(n=>n.g===root),npcUpdate);`);
 const relocated=injected.replace(/((?:from\s+|import\s+)['"])([^'"]+)(['"])/g,(_,a,b,c)=>a+(b.startsWith('.')?new URL(b,source).href:import.meta.resolve(b))+c);
 fs.writeFileSync(path.join(dir,'build.mjs'),relocated);await import(pathToFileURL(path.join(dir,'build.mjs')).href);
 }finally{fs.rmSync(dir,{recursive:true,force:true});delete globalThis[hook];}
 assert.deepEqual(seen.sort(),Object.keys(C).sort());
});
