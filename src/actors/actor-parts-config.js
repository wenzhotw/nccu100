/** 通用零件卡：資料與舊 wardrobe/card 保存隔離；原衣身一體部件不可卸下。 */
export const ACTOR_PARTS_MAX_BYTES=16384;
function exact(value,keys){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype)throw new TypeError('Expected plain actor data');
 const own=Reflect.ownKeys(value);if(own.length!==keys.length||own.some(k=>typeof k!=='string'||!keys.includes(k)))throw new TypeError('Unknown actor fields');
 for(const k of own){const d=Object.getOwnPropertyDescriptor(value,k);if(!d.enumerable||!Object.hasOwn(d,'value'))throw new TypeError('Actor accessors rejected');}
}
export function parseActorPartsCard(value){
 if(typeof value==='string'){if(value.length>ACTOR_PARTS_MAX_BYTES||new TextEncoder().encode(value).length>ACTOR_PARTS_MAX_BYTES)throw new RangeError('設定超過 16 KiB');value=JSON.parse(value);}
 exact(value,['kind','schemaVersion','actorId','parts']);
 if(value.kind!=='nccu100.actor-parts'||value.schemaVersion!==1||typeof value.actorId!=='string'||!value.actorId||value.actorId.length>100)throw new TypeError('Unsupported actor card');
 if(!value.parts||Object.getPrototypeOf(value.parts)!==Object.prototype)throw new TypeError('Invalid actor parts');
 const keys=Reflect.ownKeys(value.parts);if(keys.length>64||keys.some(k=>typeof k!=='string'||['__proto__','prototype','constructor'].includes(k)))throw new TypeError('Invalid actor slots');exact(value.parts,keys);
 const parts={};for(const k of keys){if(!['default','native','none'].includes(value.parts[k]))throw new TypeError('Unknown actor part');parts[k]=value.parts[k];}
 return {kind:value.kind,schemaVersion:1,actorId:value.actorId,parts};
}
export function defaultActorPartsCard(entry){if(!entry?.id||!entry.slots)throw new TypeError('Missing actor metadata');return {kind:'nccu100.actor-parts',schemaVersion:1,actorId:entry.id,parts:Object.fromEntries(Object.keys(entry.slots).map(k=>[k,'default']))};}
export function validateActorPartsCard(value,entry){
 const card=parseActorPartsCard(value);if(!entry||card.actorId!==entry.id)throw new TypeError('角色不符或尚未登記');exact(card.parts,Object.keys(entry.slots));
 for(const [slot,choice] of Object.entries(card.parts))if(choice==='none'&&!entry.slots[slot].allowNone)throw new TypeError(`${slot} 是身體或動作必要部件，尚不能安全卸下`);
 return card;
}
/** 明確操作的舊三角色卡轉換；只回資料，不套用、不清除任何保存。 */
export function migrateLegacyCharacterCard(value,entry){
 const old=validateLegacyCard(value,entry?.id),next=defaultActorPartsCard(entry);
 for(const [slot,choice]of Object.entries(old.parts)){
  if(!Object.hasOwn(next.parts,slot)){if(choice!=='default')throw new TypeError(`此角色尚無相容槽位 ${slot}`);continue;}
  next.parts[slot]=choice==='default'||choice==='none'?choice:'native';
 }
 return validateActorPartsCard(next,entry);
}
import {validateCharacterCard as validateLegacyCard} from './character-card-config.js';
