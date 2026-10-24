import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameWardrobeController} from '../src/systems/wardrobe/controller.js';
import {createGameWardrobeStore,GAME_WARDROBE_KEY} from '../src/actors/wardrobe-config.js';
const config=(actorId='player',headwear='cap')=>({schemaVersion:1,actorId,slots:{headwear,outerwear:'default',leftHand:'default'}});
function setup(){
 const data=new Map([['nccu100-save','keep'],['nccu100.wardrobe.preview.v1.player','untrusted preview']]);let fail=false,eagle=false,created=0;
 const storage={getItem:k=>data.get(k)??null,setItem(k,v){if(fail)throw Error('quota');data.set(k,v);},removeItem(k){if(fail)throw Error('quota');data.delete(k);}};
 const store=createGameWardrobeStore(storage),nodes=new Map();
 const controller=createGameWardrobeController({store,isEagle:()=>eagle,resolveActor:id=>({id}),createAdapter({id}){
  created++;let value=config(id,'default'),disposed=false;
  const a={loadConfig(v,{commit}={}){if(v.slots.outerwear==='gold-vest')throw Error('assembly');commit?.();value=structuredClone(v);},validate(){if(disposed)throw Error('disposed');},exportConfig(){a.validate();return structuredClone(value);},dispose(){disposed=true;nodes.delete(id);}};nodes.set(id,a);return a;
 }});
 return {controller,store,data,nodes,get created(){return created;},fail(v){fail=v;},eagle(v){eagle=v;}};
}
test('no saved configuration creates zero adapters and never reads preview/game progress',()=>{
 const s=setup();assert.deepEqual(s.controller.restore(),[]);assert.equal(s.created,0);assert.equal(s.data.get('nccu100-save'),'keep');
});
test('apply assembles before saving; storage failure rolls existing or fresh assembly back',()=>{
 const s=setup();s.controller.apply(config());const before=s.store.read();s.fail(true);
 assert.throws(()=>s.controller.apply(config('player','beret')),/quota/);assert.deepEqual(s.nodes.get('player').exportConfig(),config());assert.deepEqual(s.store.read(),before);
 assert.throws(()=>s.controller.apply(config('chiang')),/quota/);assert.equal(s.nodes.has('chiang'),false);s.fail(false);
 assert.throws(()=>s.controller.apply({...config(),slots:{...config().slots,outerwear:'gold-vest'}}),/assembly/);assert.deepEqual(s.store.read(),before);
});
test('reload uses only explicit saved actors; reset/default/clear preserve legacy namespaces',()=>{
 const s=setup();s.store.writeActor(config('chiang'));assert.deepEqual(s.controller.restore(),[]);assert.equal(s.created,1);
 s.controller.apply(config('chiang','default'));assert.equal(s.nodes.size,0);assert.deepEqual(s.store.read().actors,{});
 s.controller.apply(config());s.fail(true);assert.throws(()=>s.controller.reset('player'),/quota/);assert.equal(s.nodes.size,1);s.fail(false);
 s.controller.clear();assert.equal(s.nodes.size,0);assert.equal(s.data.has(GAME_WARDROBE_KEY),false);assert.equal(s.data.get('nccu100-save'),'keep');assert.equal(s.data.size,2);
});
test('malformed storage fails closed; eagle never rebuilds a human; unsupported actors rejected',()=>{
 const s=setup();s.data.set(GAME_WARDROBE_KEY,'bad');assert.equal(s.controller.restore().length,1);assert.equal(s.created,0);assert.equal(s.data.get(GAME_WARDROBE_KEY),'bad');
 s.controller.clear();s.store.writeActor(config());s.store.writeActor(config('chiang'));s.eagle(true);assert.equal(s.controller.restore().length,1);assert.equal(s.nodes.has('player'),false);assert.equal(s.nodes.has('chiang'),true);
 assert.throws(()=>s.controller.apply(config()),/雄鷹/);assert.throws(()=>s.controller.apply(config('cop')));assert.equal(s.created,1);
});
