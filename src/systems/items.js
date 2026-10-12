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

/* ---------- 任務與道具：百年秘寶地圖 ---------- */
state.haveMap=false;
function giveMap(){ state.haveMap=true; $('quest').hidden=false; $('mapItem').hidden=false; AU.sfx('gem'); toast('獲得道具：百年秘寶地圖（按 M 打開）'); }
function drawMap(cv,showPlayer){ if(!cv) cv=$('mapc'); if(showPlayer===undefined) showPlayer=true;
  const c=cv, g=c.getContext('2d'), W=c.width, H=c.height, {x0:X0,x1:X1,z0:Z0,z1:Z1}=MAP_BOUNDS;
  const mx=x=>(x-X0)/(X1-X0)*W, my=z=>(Z0-z)/(Z0-Z1)*H;
  g.fillStyle='#f3e6c6'; g.fillRect(0,0,W,H);
  for(let i=0;i<900;i++){ g.fillStyle=`rgba(150,110,60,${Math.random()*0.06})`; g.fillRect(Math.random()*W,Math.random()*H,3,3); }
  g.lineCap='round'; g.lineJoin='round';
  const road=(pts,w,col)=>{ g.strokeStyle=col; g.lineWidth=w; g.beginPath(); pts.forEach(([x,z],i)=>i?g.lineTo(mx(x),my(z)):g.moveTo(mx(x),my(z))); g.stroke(); };
  road(RIV,22,'#9cc7c9'); road(RIV,3,'#6f9fa3');
  road([[-160,25],[170,25]],24,'#cdb68d'); road([[-90,bdZ(-90)],[0,bdZ(0)],[94,bdZ(94)]],10,'#d9c49b');
  road([[-160,swZ(-160)],[170,swZ(170)]],7,'#e6dcc6');   // 四維道兩側延伸的步道
  road([[SIWEI.x0,swZ(SIWEI.x0)],[SIWEI.x1,swZ(SIWEI.x1)]],16,'#d79b7b'); road([[0,12],[0,-76]],14,'#d9c49b');
  road(CREEK_ROAD,9,'#d9c49b');   // 沿溪道路
  road([[-88,15],[-88,-176]],10,'#d9c49b'); road([[23.5,-60],[23.5,-172]],10,'#d9c49b'); road([[-16,-68],[-16,-158]],7,'#d9c49b');
  road([[96,-1.5],[96,swZ(96)]],12,'#d9c49b'); road([[96,-1.5],[176,-1.5]],8,'#d9c49b'); road([[96,-1.5],[96,15]],10,'#e6dcc6');   // 電算中心後面的校內道路、往西的路、側門廣場
  const bld=(x,z,w,d,col,name,dy)=>{ g.fillStyle=col; g.strokeStyle='#6b4a2a'; g.lineWidth=3; g.fillRect(mx(x-w/2),my(z+d/2),w/(X1-X0)*W,d/(Z0-Z1)*H); g.strokeRect(mx(x-w/2),my(z+d/2),w/(X1-X0)*W,d/(Z0-Z1)*H);
    if(name){ g.fillStyle='#4a3520'; g.font='700 22px "Noto Sans TC",sans-serif'; g.textAlign='center'; g.fillText(name,mx(x),my(z)+(dy||7)); } };
  // 建築圖示由各建築的 index.js 登記（map 欄位）
  world.mapShapes.forEach(m=>{ if(m.draw) m.draw(g,mx,my); else bld(m.x,m.z,m.w,m.d,m.color,m.label||'',m.dy); });
  g.beginPath(); g.arc(mx(0),my(FZ),9,0,7); g.fillStyle='#9cc7c9'; g.fill(); g.stroke();
  g.fillStyle='#4a3520'; g.font='700 20px "Noto Sans TC",sans-serif'; g.fillText('校門',mx(0),my(14)); g.fillText('指南路二段',mx(-100),my(30)); g.fillText('醉夢溪',mx(-175),my(-145));
  g.fillText('四維道',mx(-120),my(swZ(-120))-12);
  const spots=crystals.map(c=>[c,c.mapAt.x,c.mapAt.z]);
  if(state.haveMap) spots.forEach(([c,x,z])=>{ const X=mx(x), Y=my(z);
    if(c.got){ g.fillStyle='#3f8a4f'; g.beginPath(); g.arc(X,Y,16,0,7); g.fill(); g.strokeStyle='#fff'; g.lineWidth=5; g.beginPath(); g.moveTo(X-8,Y); g.lineTo(X-2,Y+7); g.lineTo(X+9,Y-7); g.stroke(); }
    else { g.fillStyle='#2bb5a3'; g.strokeStyle='#14524a'; g.lineWidth=3; g.beginPath(); g.moveTo(X,Y-18); g.lineTo(X+13,Y); g.lineTo(X,Y+18); g.lineTo(X-13,Y); g.closePath(); g.fill(); g.stroke(); } });
  if(state.haveMap){ const X=mx(-30), Y=my(-185); g.fillStyle='#b23a3a'; g.font='900 46px "Noto Serif TC",serif'; g.fillText('？',X,Y+16); g.strokeStyle='#b23a3a'; g.lineWidth=3; g.setLineDash([8,8]); g.beginPath(); g.arc(X,Y,30,0,7); g.stroke(); g.setLineDash([]); }
  if(showPlayer&&!indoor()){ g.fillStyle='#e8463c'; g.strokeStyle='#fff'; g.lineWidth=4; g.beginPath(); g.arc(mx(pos.x),my(pos.z),11,0,7); g.fill(); g.stroke(); }
  g.save(); g.translate(W-60,70); g.fillStyle='#4a3520'; g.beginPath(); g.moveTo(0,-34); g.lineTo(12,6); g.lineTo(0,0); g.lineTo(-12,6); g.closePath(); g.fill(); g.font='900 26px serif'; g.fillText('N',0,36); g.restore();
  g.strokeStyle='#b98a4e'; g.lineWidth=10; g.strokeRect(5,5,W-10,H-10);
}
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
function giveBadge(){ state.haveBadge=true; chestBadge.visible=true; $('item').hidden=false; AU.sfx('gem'); toast('獲得道具：親愛精誠徽章'); }

// 讓較早載入的模組也能在執行時呼叫到這裡定義的東西
late.giveMap = giveMap;
late.openMap = openMap;
late.closeMap = closeMap;
late.giveBadge = giveBadge;
registerAction('giveMap', giveMap);
registerAction('giveBadge', giveBadge);

export { drawMap };
