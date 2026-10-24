/** 遊戲內預覽使用獨立儲存，與 cards 工作台及正式 wardrobe／進度分離。 */
import {validateCharacterCard,defaultCharacterCard} from '../../actors/character-card-config.js';
export const CARD_GAME_PREVIEW_KEY='nccu100.character-card.game-preview.v1';
const LIMIT=16*1024,empty=()=>({kind:'nccu100.character-card.game-preview',schemaVersion:1,actors:{}});
function size(text){if(typeof text!=='string'||text.length>LIMIT||new TextEncoder().encode(text).length>LIMIT)throw new TypeError('Invalid preview store size');}
export function createCardPreviewStore(storage){
 if(!storage||['getItem','setItem','removeItem'].some(k=>typeof storage[k]!=='function'))throw new TypeError('Preview storage required');
 function read(){
  const raw=storage.getItem(CARD_GAME_PREVIEW_KEY);if(raw===null)return empty();size(raw);const value=JSON.parse(raw);
  if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).sort().join()!=='actors,kind,schemaVersion'||value.kind!=='nccu100.character-card.game-preview'||value.schemaVersion!==1||!value.actors||Object.getPrototypeOf(value.actors)!==Object.prototype)throw new TypeError('Invalid preview store');
  const result=empty();for(const [id,card] of Object.entries(value.actors)){defaultCharacterCard(id);result.actors[id]=validateCharacterCard(card,id);}return result;
 }
 function write(value){const raw=JSON.stringify(value);size(raw);storage.setItem(CARD_GAME_PREVIEW_KEY,raw);return value;}
 return Object.freeze({read,
  writeActor(value){const card=validateCharacterCard(value),next=read();next.actors[card.actorId]=card;return write(next);},
  removeActor(id){defaultCharacterCard(id);const next=read();if(!Object.hasOwn(next.actors,id))return next;delete next.actors[id];return write(next);},
  clear(){storage.removeItem(CARD_GAME_PREVIEW_KEY);return empty();},
 });
}
