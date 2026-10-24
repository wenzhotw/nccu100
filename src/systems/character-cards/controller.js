/** 真實遊戲內的 opt-in 預覽控制器。純依賴注入，不載入場景或自動啟用。 */
import {defaultCharacterCard,validateCharacterCard,CHARACTER_CARD_CATALOG} from '../../actors/character-card-config.js';
import {ownAppearanceAdapter} from '../../actors/appearance-ownership.js';
export function createCardPreviewController({store,resolveActor,createAdapter,ownership}){
 const active=new Map();
 function apply(value,{persist=true}={}){
  const card=validateCharacterCard(value),id=card.actorId;
  if(Object.values(card.parts).every(x=>x==='default')){resetActor(id,{persist});return card;}
  const actor=resolveActor(id);if(!actor)throw new Error(`活動角色尚未建立：${id}`);
  let record=active.get(id);
  if(record&&record.root!==actor.g)throw new Error('預覽角色已重建，請先還原後重新套用。');
  const fresh=!record;
  if(fresh){const adapter=ownAppearanceAdapter(ownership,id,'cards-preview',()=>createAdapter(actor));record={root:actor.g,adapter};}
  try{record.adapter.loadCard(card,{commit:persist?()=>store.writeActor(card):undefined});record.adapter.validate();}
  catch(error){if(fresh)record.adapter.dispose();throw error;}
  active.set(id,record);return record.adapter.exportCard();
 }
 function resetActor(id,{persist=true}={}){
  const record=active.get(id);defaultCharacterCard(id);
  if(record){record.adapter.reset({commit:persist?()=>store.removeActor(id):undefined});record.adapter.dispose();active.delete(id);}
  else if(persist)store.removeActor(id);
 }
 function restore(){
  const errors=[];let saved;try{saved=store.read();}catch(error){return [`預覽設定未載入：${error.message}`];}
  for(const card of Object.values(saved.actors))try{apply(card,{persist:false});}catch(error){errors.push(`${card.actorId}：${error.message}`);}
  return errors;
 }
 return Object.freeze({apply,reset:resetActor,restore,
  clear(){store.clear();for(const {adapter} of active.values())adapter.dispose();active.clear();},
  dispose(){for(const {adapter} of active.values())adapter.dispose();active.clear();},
  actorIds:Object.freeze(Object.keys(CHARACTER_CARD_CATALOG)),
 });
}
