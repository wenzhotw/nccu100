import MANIFEST from '../../actors/character-manifest.json';
import {parseActorPartsCard} from '../../actors/actor-parts-config.js';
export const ACTOR_PARTS_GAME_KEY='nccu100.actor-parts.game.v1';
const ids=new Set(MANIFEST.map(x=>x.id));
export function createActorPartsStore(storage){
 const read=()=>{const raw=storage.getItem(ACTOR_PARTS_GAME_KEY);if(!raw)return {actors:{}};if(typeof raw!=='string'||raw.length>262144||new TextEncoder().encode(raw).length>262144)throw new RangeError('Actor store too large');const v=JSON.parse(raw);if(!v||v.kind!=='nccu100.actor-parts-store'||v.schemaVersion!==1||Object.keys(v).sort().join(',')!=='actors,kind,schemaVersion'||!v.actors||Object.getPrototypeOf(v.actors)!==Object.prototype)throw new TypeError('Invalid actor store');const actors={};for(const [id,c]of Object.entries(v.actors)){if(!ids.has(id))throw new TypeError('Unknown saved actor');const card=parseActorPartsCard(c);if(card.actorId!==id)throw new TypeError('Saved actor mismatch');actors[id]=card;}return {actors};};
 const write=actors=>{const text=JSON.stringify({kind:'nccu100.actor-parts-store',schemaVersion:1,actors});if(new TextEncoder().encode(text).length>262144)throw new RangeError('Actor store too large');storage.setItem(ACTOR_PARTS_GAME_KEY,text);};
 return Object.freeze({read,writeActor(card){card=parseActorPartsCard(card);if(!ids.has(card.actorId))throw new TypeError('Unknown actor');const {actors}=read();actors[card.actorId]=card;write(actors);},removeActor(id){if(!ids.has(id))throw new TypeError('Unknown actor');const {actors}=read();delete actors[id];write(actors);},clear(){storage.removeItem(ACTOR_PARTS_GAME_KEY);}});
}
