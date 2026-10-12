/**
 * 玩家狀態、地面高度、互動點、區域名稱。
 */
import * as THREE from 'three';
import { state } from './state.js';
import { late } from './late.js';
import { $ } from './dom.js';
import { AU } from '../systems/audio.js';
import { IX } from '../world/layout.js';
import { heightAt, world, zoneAt } from '../world/registry.js';
import { player } from '../actors/player.js';
import { bubble } from '../actors/pangolin.js';
import { crystals } from '../systems/stories.js';
import { dlg, openDialog, toast } from '../ui/dialog.js';

/* ---------- gameplay ---------- */
const pos=new THREE.Vector3(-2,0,21), vel=new THREE.Vector3();
state.vy=0; state.grounded=true; state.walkPh=0; state.near=null; state.zone='';
const indoor=()=>pos.x>200;
/** 地面高度：由各建築與地形登記在 world/registry.js 的 heightAt 決定 */
const groundH=heightAt;
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
  {x:0,z:-74.8,r:2.8,label:'進入四維堂',ok:()=>!indoor(),fn:()=>transition(()=>{ pos.set(IX,0,21.5); state.yaw=0; state.pitch=0.22; player.rotation.y=Math.PI; world.interiors['siwei-hall'].enter(); })},
  {x:IX,z:23.2,r:2.6,label:'離開四維堂',ok:()=>indoor(),fn:()=>transition(()=>{ pos.set(0,0,-72.5); state.yaw=0; state.pitch=0.3; player.rotation.y=0; world.interiors['siwei-hall'].exit(); })}
];
crystals.forEach(c=>spots.push({x:c.g.position.x,z:c.g.position.z,r:2.1,label:'拾取',ok:()=>!c.got,fn:()=>{
  c.got=true; state.found++; $('fragn').textContent=state.found; AU.sfx('gem');
  openDialog(c.name,c.lines,()=>{ if(state.found===3){ toast('三個校園故事都收集齊了，回四維堂告訴校長吧'); bubble.visible=true; } else toast(`獲得校園故事 ${state.found}／3`); });
}}));
state.talkFocus=null;
function interact(){ if(state.near&&dlg.hidden&&!state.busy){ state.talkFocus=(state.near.label==='交談'&&state.near.x!==undefined)?{x:state.near.x,z:state.near.z}:null; state.near.fn(); } }
function interactAlt(){ if(state.near&&state.near.alt&&dlg.hidden&&!state.busy) state.near.alt.fn(); }
/** 區域名稱：建築與道路各自登記（見 world/zones.js 與各建築 index.js），找不到就是校園大道 */
const zoneOf=p=>zoneAt(p,'校園大道');
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
