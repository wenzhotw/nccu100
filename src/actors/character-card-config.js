/** 預覽設定卡，與正式 wardrobe schema v1 分離，不自動遷移或寫入遊戲存檔。 */
export const CHARACTER_CARD_MAX_BYTES=4096;
export const CHARACTER_CARD_PREVIEW_KEY='nccu100.character-card.preview.v1';
const entry=(label,parts,rules={})=>Object.freeze({label,parts:Object.freeze(parts),rules:Object.freeze(Object.fromEntries(Object.entries(rules).map(([owner,targets])=>[owner,Object.freeze(targets)])))});
export const CHARACTER_CARD_CATALOG=Object.freeze({
 'bz26-D26':entry('日本語文學系・和服',{top:'kimono-base-top',bottom:'kimono-base-bottom',dress:'kimono',headwear:'kimono-hair',custom:'kimono-obi'},{dress:['top','bottom']}),
 'bz26-D31':entry('法律學系・法官袍',{top:'judge-base-top',bottom:'judge-base-bottom',dress:'judge-robe',headwear:'judge-wig',custom:'judge-tabs'},{dress:['top','bottom']}),
 'bz26-D12':entry('金融學系・西裝',{top:'business-suit',bottom:'business-trousers','hand.L':'finance-tablet'}),
});
function keys(value,expected){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype)throw new TypeError('Card must be plain data');
 const actual=Reflect.ownKeys(value);
 if(actual.length!==expected.length||actual.some(k=>typeof k!=='string'||!expected.includes(k)))throw new TypeError('Unknown card fields');
 for(const k of actual){const d=Object.getOwnPropertyDescriptor(value,k);if(!d.enumerable||!Object.hasOwn(d,'value'))throw new TypeError('Card accessors are not allowed');}
}
export function defaultCharacterCard(actorId){
 if(typeof actorId!=='string'||!Object.hasOwn(CHARACTER_CARD_CATALOG,actorId))throw new TypeError('Unknown card actor');
 return {kind:'nccu100.character-card',schemaVersion:1,actorId,parts:Object.fromEntries(Object.keys(CHARACTER_CARD_CATALOG[actorId].parts).map(s=>[s,'default']))};
}
export function validateCharacterCard(value,expectedId){
 if(typeof value==='string'){
  if(value.length>CHARACTER_CARD_MAX_BYTES||new TextEncoder().encode(value).length>CHARACTER_CARD_MAX_BYTES)throw new RangeError('Card exceeds 4 KiB');
  value=JSON.parse(value);
 }
 keys(value,['kind','schemaVersion','actorId','parts']);
 if(value.kind!=='nccu100.character-card'||value.schemaVersion!==1)throw new TypeError('Unsupported character card schema');
 const result=defaultCharacterCard(value.actorId),catalog=CHARACTER_CARD_CATALOG[value.actorId].parts;
 if(expectedId!==undefined&&value.actorId!==expectedId)throw new TypeError('Card actor mismatch');
 keys(value.parts,Object.keys(catalog));
 for(const slot of Object.keys(catalog)){
  if(!['default','none',catalog[slot]].includes(value.parts[slot]))throw new TypeError(`Unknown card part: ${slot}`);
  result.parts[slot]=value.parts[slot];
 }
 return result;
}
