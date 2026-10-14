/**
 * 道具：百年秘寶地圖、親愛精誠徽章。
 */
import * as THREE from 'three';
import { state } from '../core/state.js';
import { late } from '../core/late.js';
import { $ } from '../core/dom.js';
import { AU } from './audio.js';
import { basic, canvasTex } from '../render/kit.js';
import { CREEK_ROAD, SIWEI, bdZ, swZ, MAP_BOUNDS } from '../world/layout.js';
import { FZ } from '../world/terrain/fountain.js';
import { world } from '../world/registry.js';
import { registerAction } from '../content/index.js';
import { RIV } from '../world/terrain/river.js';
import { rig } from '../actors/player.js';
import { crystals } from './stories.js';
import { toast } from '../ui/dialog.js';
import { indoor, pos } from '../core/gameplay.js';
import { createMapPainter } from './map-painter.js';
import { createMapCache } from './map-cache.js';

/* ---------- 任務與道具：百年秘寶地圖 ---------- */
state.haveMap=false;
// silent：讀取存檔時用，只恢復狀態與畫面，不播音效、不跳提示
function giveMap(silent){ state.haveMap=true; $('quest').hidden=false; $('mapItem').hidden=false; if(silent===true) return; AU.sfx('gem'); toast('獲得道具：百年秘寶地圖（按 M 打開）'); }
const mapPainter=createMapPainter({ MAP_BOUNDS, RIV, SIWEI, bdZ, swZ, CREEK_ROAD, FZ });
const miniMapCache=createMapCache({ createCanvas:()=>document.createElement('canvas'), ...mapPainter });
let mapFontRevision=0;
if(document.fonts){
  const invalidateFonts=()=>{ mapFontRevision++; };
  document.fonts.ready.then(invalidateFonts);
  document.fonts.addEventListener('loadingdone',invalidateFonts);
  document.fonts.addEventListener('loadingerror',invalidateFonts);
}
function drawMap(cv,showPlayer=true){
  if(!cv) cv=$('mapc');
  mapPainter.drawBase(cv,world.mapShapes);
  mapPainter.drawDetails(cv,{ haveMap:state.haveMap, crystals, player:showPlayer&&!indoor()?pos:null });
}
function drawCachedMap(cv){
  return miniMapCache.update(cv,{ shapes:world.mapShapes, mapRevision:world.mapRevision,
    fontRevision:mapFontRevision, haveMap:state.haveMap, crystals });
}
function getMiniMapCacheStats(){ return { ...miniMapCache.stats(), pendingFontRevision:mapFontRevision }; }
function openMap(){ if(!state.haveMap) return; drawMap(); $('mapw').hidden=false; AU.sfx('open'); }
function closeMap(){ $('mapw').hidden=true; }
$('mapItem').addEventListener('click',openMap);
$('mapClose').addEventListener('click',closeMap);
$('mapw').addEventListener('click',e=>{ if(e.target.id==='mapw') closeMap(); });
/* ---------- 道具：親愛精誠徽章 ---------- */
state.haveBadge=false;
const medalTex=canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#c9952e'; g.beginPath(); g.arc(64,64,60,0,7); g.fill();
  g.fillStyle='#f3cf6b'; g.beginPath(); g.arc(64,64,52,0,7); g.fill();
  g.fillStyle='#ffffff'; for(let k=0;k<5;k++){ const a=k/5*Math.PI*2-Math.PI/2; g.beginPath(); g.arc(64+Math.cos(a)*18,64+Math.sin(a)*18,14,0,7); g.fill(); }
  g.fillStyle='#5b3c8f'; g.beginPath(); g.arc(64,64,10,0,7); g.fill();
  g.strokeStyle='#8a5f14'; g.lineWidth=4; g.beginPath(); g.arc(64,64,52,0,7); g.stroke(); });
const chestBadge=new THREE.Mesh(new THREE.CircleGeometry(0.06,24),basic({map:medalTex,transparent:true}));
chestBadge.position.set(-0.08,0.56,0.149);
chestBadge.visible=false;
rig.add(chestBadge);
function giveBadge(silent){ state.haveBadge=true; chestBadge.visible=true; $('item').hidden=false; if(silent===true) return; AU.sfx('gem'); toast('獲得道具：親愛精誠徽章'); }

// 讓較早載入的模組也能在執行時呼叫到這裡定義的東西
late.giveMap = giveMap;
late.openMap = openMap;
late.closeMap = closeMap;
late.giveBadge = giveBadge;
registerAction('giveMap', giveMap);
registerAction('giveBadge', giveBadge);

export { drawMap, drawCachedMap, getMiniMapCacheStats, giveMap, giveBadge };
