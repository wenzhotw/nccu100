import {defaultActorPartsCard,validateActorPartsCard,parseActorPartsCard} from '../../actors/actor-parts-config.js';
import {ownAppearanceAdapter} from '../../actors/appearance-ownership.js';
export function createActorPartsController({registry,store,ownership,createAdapter}){
 const active=new Map(),errors=new Map();let disposed=false;
 const assert=()=>{if(disposed)throw new Error('Actor controller disposed');};
 function release(id){const item=active.get(id);if(item){item.adapter.dispose();active.delete(id);}}
 function apply(value,{persist=true}={}){
  assert();const id=parseActorPartsCard(value).actorId,entry=registry.get(id);if(!entry?.ready)throw new Error('角色尚未生成或服裝尚未完成');
  const card=validateActorPartsCard(value,entry);if(Object.values(card.parts).every(x=>x==='default'))return reset(id,{persist});
  if(entry.supported&&!entry.supported())throw new Error('角色目前形態暫不支援零件編輯');
  let item=active.get(id);if(item&&item.root!==entry.root)throw new Error('角色實例已更換，請先還原');const fresh=!item;
  if(fresh){item={root:entry.root,adapter:ownAppearanceAdapter(ownership,id,'actor-parts',()=>createAdapter(entry))};}
  try{item.adapter.loadCard(card,{commit:persist?()=>store.writeActor(card):undefined});active.set(id,item);errors.delete(id);return item.adapter.exportCard();}catch(error){if(fresh)item.adapter.dispose();throw error;}
 }
 function reset(id,{persist=true}={}){assert();const entry=registry.get(id),item=active.get(id);if(item){item.adapter.reset({commit:persist?()=>store.removeActor(id):undefined});release(id);}else if(persist)store.removeActor(id);errors.delete(id);return entry?defaultActorPartsCard(entry):null;}
 function restoreOne(id){const entry=registry.get(id);if(!entry?.ready||entry.supported&&!entry.supported())return;const card=store.read().actors[id];if(card)apply(card,{persist:false});}
 function restore(){assert();const saved=store.read().actors;for(const id of Object.keys(saved))try{restoreOne(id);}catch(error){errors.set(id,error.message);}return [...errors].map(([id,m])=>`${id}: ${m}`);}
 const unsubscribe=registry.subscribe(event=>{if(disposed)return;const id=event.entry.id;try{if(event.type==='remove'||event.type==='form')release(id);if(event.type==='ready'||event.type==='form')restoreOne(id);}catch(error){errors.set(id,error.message);if(event.type==='form'&&event.entry.formTransition)throw error;}});
 return Object.freeze({apply,reset,restore,exportCard(id){assert();return active.get(id)?.adapter.exportCard()||defaultActorPartsCard(registry.get(id));},status(id){return errors.get(id)||'';},clear(){assert();store.clear();for(const id of [...active.keys()])release(id);errors.clear();},refresh(){assert();for(const [id,item]of active)try{item.adapter.refresh();}catch(error){errors.set(id,error.message);}},dispose(){if(disposed)return;for(const id of [...active.keys()])release(id);unsubscribe();disposed=true;}});
}
