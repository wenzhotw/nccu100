/**
 * 玩家狀態、地面高度、互動點、區域名稱。
 */
import * as THREE from 'three';
import { state } from './state.js';
import { late } from './late.js';
import { $ } from './dom.js';
import { AU } from '../systems/audio.js';
import { bdZ, inLot, swZ } from '../world/layout.js';
import { hemi, sun } from '../world/environment/sky.js';
import { FZ } from '../world/terrain/fountain.js';
import { LBX } from '../world/buildings/library/index.js';
import { BZA, BZK } from '../world/buildings/business-school/index.js';
import { TRK } from '../world/buildings/track/index.js';
import { GYM, gymH } from '../world/buildings/gym/index.js';
import { ZH } from '../world/buildings/zonghe/index.js';
import { BD, BN, BR, riverDist } from '../world/terrain/river.js';
import { IX, inLight } from '../world/buildings/siwei-hall/interior.js';
import { player } from '../actors/player.js';
import { bubble } from '../actors/pangolin.js';
import { crystals } from '../systems/stories.js';
import { dlg, openDialog, toast } from '../ui/dialog.js';

/* ---------- gameplay ---------- */
const pos=new THREE.Vector3(-2,0,21), vel=new THREE.Vector3();
state.vy=0; state.grounded=true; state.walkPh=0; state.near=null; state.zone='';
const indoor=()=>pos.x>200;
function groundH(x,z){
  if(x>200){ if(z<-18.05) return 1.2; if(z<-16.6&&Math.abs(x-IX)<2.5) return 0.6; return 0; }
  { const dx=x-BR.x, dz=z-BR.z, u=dx*BD.x+dz*BD.z, v=dx*BN.x+dz*BN.z; if(Math.abs(u)<2.3&&Math.abs(v)<4.5) return 0.4; }
  if(Math.abs(x-BZA.x)<8.2*BZK){ const zl=BZA.z+(z-BZA.z)/BZK; if(zl<=-49&&zl>-56.2) return 1.4*BZK; if(zl<=-56.2&&zl>-59.7) return BZK*Math.max(0,1.4-0.2*Math.ceil((-56.2-zl)/0.5)); }
  if(x>38&&x<52){ if(z<=-68&&z>-71.4) return 1.2; if(z<=-67&&z>-68) return 0.9; if(z<=-66&&z>-67) return 0.6; if(z<=-65&&z>-66) return 0.3; }
  { const dx=Math.abs(x-LBX);
    if(dx<11&&z<=-78&&z>-82) return Math.min(1.4,0.2*Math.ceil((-78-z)/0.57));
    if(dx<11&&z<=-82&&z>-86) return 1.4;
    if(dx<9&&z<=-86&&z>-94) return Math.min(3.6,1.4+0.2*Math.ceil((-86-z)/0.727));
    if(dx<20&&z<=-94&&z>-104) return 3.6; }
  { const gh=gymH(x,z); if(gh!==null) return gh; }
  return 0;
}
function jump(){ if(state.grounded&&dlg.hidden&&!state.busy&&!state.driving){ AU.sfx('jump'); state.vy=6.6; state.grounded=false; } }
function dogLines(){
  if(state.found===3) return ['全部找到啦？那你已經比大部分新生更認識政大了。','快去四維堂告訴校長吧，我要回後山睡午覺了。'];
  if(state.dogTalked) return [`還差 ${3-state.found} 個喔。校名碑、醉夢溪，還有四維堂裡面都找找看。`];
  return ['你好，我是小穿，平常住在後山，今天出來散步。','旁邊那根紅色的是校名碑，門外是指南路二段。','沿著紅磚的四維道一直走，中間有座噴水池，走到底就是四維堂，門開著可以進去。','四維堂左邊是中正圖書館，右邊是行政大樓，再往右後方走就是田徑場，旁邊是體育館，跑道另一頭的兩棟高樓是綜合院館。','中正圖書館後面有一條小溪，地圖上叫指南溪，流進校園的這一段大家叫它醉夢溪，是1970年代新聞系學生取的名字。','附近藏著三個校園故事，找齊了再來找我。我會在四維道上走來走去。'];
}
function transition(fn){
  state.busy=true; AU.sfx('door'); $('act').hidden=true; $('act2').hidden=true;
  late.iris(true,520,()=>{ fn(); vel.set(0,0,0); camT.set(pos.x,pos.y+0.9,pos.z); state.camD=state.dist; setTimeout(()=>late.iris(false,560,()=>{ state.busy=false; }),160); });
}
const spots=[
  {x:0,z:0,r:2.6,label:'交談',ok:()=>!indoor(),fn:()=>openDialog('小穿．政大穿山甲',dogLines(),()=>{ state.dogTalked=true; })},
  {x:0,z:-74.8,r:2.8,label:'進入四維堂',ok:()=>!indoor(),fn:()=>transition(()=>{ pos.set(IX,0,21.5); state.yaw=0; state.pitch=0.22; player.rotation.y=Math.PI; inLight.visible=true; sun.visible=false; hemi.intensity=1.0; })},
  {x:IX,z:23.2,r:2.6,label:'離開四維堂',ok:()=>indoor(),fn:()=>transition(()=>{ pos.set(0,0,-72.5); state.yaw=0; state.pitch=0.3; player.rotation.y=0; inLight.visible=false; sun.visible=true; hemi.intensity=0.75; })}
];
crystals.forEach(c=>spots.push({x:c.g.position.x,z:c.g.position.z,r:2.1,label:'拾取',ok:()=>!c.got,fn:()=>{
  c.got=true; state.found++; $('fragn').textContent=state.found; AU.sfx('gem');
  openDialog(c.name,c.lines,()=>{ if(state.found===3){ toast('三個校園故事都收集齊了，回四維堂告訴校長吧'); bubble.visible=true; } else toast(`獲得校園故事 ${state.found}／3`); });
}}));
state.talkFocus=null;
function interact(){ if(state.near&&dlg.hidden&&!state.busy){ state.talkFocus=(state.near.label==='交談'&&state.near.x!==undefined)?{x:state.near.x,z:state.near.z}:null; state.near.fn(); } }
function interactAlt(){ if(state.near&&state.near.alt&&dlg.hidden&&!state.busy) state.near.alt.fn(); }
function zoneOf(p){ if(p.x>200) return '四維堂'; if(p.z>18) return '指南路二段'; if(p.z>9) return '正門';
  if(riverDist(p.x,p.z)<9) return '指南溪畔';
  if(Math.hypot(p.x-ZH.x,p.z-ZH.z)<24) return '綜合院館';
  if(Math.hypot(p.x-TRK.x,p.z-TRK.z)<34) return '田徑場';
  if(Math.hypot(p.x-GYM.x,p.z-GYM.z)<27) return '體育館';
  if(p.x<-36&&p.x>-72&&p.z<-17&&p.z>-64) return '商學院';
  if(Math.abs(p.x+88)<2.8&&p.z<18) return '環山一道';
  if(Math.abs(p.x-96)<2.4&&p.z<18) return '校內道路';
  { const l=inLot(p.x,p.z); if(l) return l.name+'．預定地'; }
  if(Math.hypot(p.x,p.z-FZ)<10) return '噴水池';
  if(Math.abs(p.z-bdZ(p.x))<2.4) return '八德道';
  if(Math.abs(p.z-swZ(p.x))<5.2) return '四維道';
  if(p.x>19.5&&p.x<27.3&&p.z<-62) return '行政大樓旁車道';
  if(p.x>14&&p.x<=19.5&&p.z<-62&&p.z>-105) return '四維堂廊道';
  if(p.x<-19&&p.z<swZ(p.x)) return '中正圖書館前';
  if(p.x>27.3&&p.z<swZ(p.x)) return '行政大樓前';
  if(p.z<swZ(p.x)) return '四維堂前'; return '校園大道'; }
const lerpA=(a,b,t)=>{ let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*t; };
const camT=new THREE.Vector3(pos.x,0.9,pos.z);
player.rotation.y=Math.PI;

// 讓較早載入的模組也能在執行時呼叫到這裡定義的東西
late.pos = pos;
late.indoor = indoor;
late.jump = jump;
late.spots = spots;
late.interact = interact;
late.interactAlt = interactAlt;
late.lerpA = lerpA;
late.camT = camT;

export { camT, groundH, indoor, lerpA, pos, spots, transition, vel, zoneOf };
