/** Explicit game wardrobe application; no game-save schema or animation ownership. */
import { validateWardrobeConfig } from '../../actors/wardrobe-config.js';
export function createGameWardrobeController({store,resolveActor,createAdapter,isEagle=()=>false}) {
  const active=new Map();
  const isDefault=config=>Object.values(config.slots).every(value=>value==='default');
  function reset(id){
    // Storage failure leaves the current live assembly untouched.
    store.removeActor(id);active.get(id)?.dispose();active.delete(id);
  }
  function apply(value,{persist=true}={}){
    const config=validateWardrobeConfig(value),id=config.actorId;
    if(isDefault(config)){if(persist)reset(id);else {active.get(id)?.dispose();active.delete(id);}return config;}
    if(id==='player'&&isEagle())throw new Error('雄鷹形態暫不支援人形換裝，原形態不會被變更。');
    const input=resolveActor(id);if(!input)throw new Error(`角色尚未就緒：${id}`);
    let adapter=active.get(id);
    if(adapter){try{adapter.validate();}catch{adapter.dispose();active.delete(id);adapter=null;}}
    const fresh=!adapter;
    if(fresh)adapter=createAdapter(input);
    try{
      adapter.loadConfig(config,{commit:persist?()=>store.writeActor(config):undefined});adapter.validate();
    }catch(error){
      if(fresh)adapter.dispose();
      throw error;
    }
    active.set(id,adapter);return adapter.exportConfig();
  }
  function restore(){
    const errors=[];let saved;
    try{saved=store.read();}catch(error){return [`換裝設定未載入：${error.message}`];}
    for(const config of Object.values(saved.actors))try{apply(config,{persist:false});}catch(error){errors.push(`${config.actorId}：${error.message}`);}
    return errors;
  }
  function clear(){store.clear();for(const adapter of active.values())adapter.dispose();active.clear();}
  return Object.freeze({apply,reset,clear,restore,dispose(){for(const adapter of active.values())adapter.dispose();active.clear();}});
}
