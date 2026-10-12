/**
 * 搶警車與駕駛。
 */
import * as THREE from 'three';
import { state } from '../core/state.js';
import { AU } from './audio.js';
import { BOX, basic } from '../render/kit.js';
import { colliders, resolve } from '../core/collision.js';
import { police } from '../actors/police-car.js';
import { player, shadowBlob } from '../actors/player.js';
import { dlg, openDialog, toast } from '../ui/dialog.js';
import { keys } from '../core/input.js';
import { groundH, indoor, pos, spots, transition, vel } from '../core/gameplay.js';
import { DIALOGS } from '../content/index.js';
import { cop } from '../actors/npc.js';

/* ---------- 搶警車、開警車 ---------- */
const carHome={x:police.position.x,z:police.position.z,yaw:police.rotation.y};
police.userData.noOcc=true;
const pcA={c:true,x:0,z:0,r:1.05}, pcB={c:true,x:0,z:0,r:1.05};
colliders.push(pcA,pcB);
function syncPoliceCol(){ if(state.driving){ pcA.x=pcB.x=1e6; return; } const fx=Math.sin(police.rotation.y), fz=Math.cos(police.rotation.y);
  pcA.x=police.position.x+fx*1.15; pcA.z=police.position.z+fz*1.15; pcB.x=police.position.x-fx*1.15; pcB.z=police.position.z-fz*1.15; }
syncPoliceCol();
const sirenR=new THREE.Mesh(BOX,basic({color:'#661a1a'})), sirenB=new THREE.Mesh(BOX,basic({color:'#1a2a66'}));
sirenR.scale.set(0.5,0.17,0.3);
sirenB.scale.set(0.5,0.17,0.3);
sirenR.position.set(-0.38,1.86,-0.3);
sirenB.position.set(0.38,1.86,-0.3);
police.add(sirenR);
police.add(sirenB);
const carSpot={x:carHome.x,z:carHome.z,r:3.4,label:'搶警車',ok:()=>!state.driving&&!state.holdPang&&!indoor()&&cop.state!=='chase'&&cop.state!=='talk',fn:enterCar};
spots.push(carSpot);
function enterCar(){ state.driving=true; AU.sfx('door'); AU.siren(true); state.carYaw=police.rotation.y; state.carSpeed=0; pos.set(police.position.x,0,police.position.z); vel.set(0,0,0);
  player.visible=false; shadowBlob.visible=false; syncPoliceCol(); state.yaw=state.carYaw+Math.PI; state.pitch=Math.max(state.pitch,0.25);
  toast('你搶走了警車！W/S 油門，A/D 轉向'); cop.sp.say('喂！那是警車！'); cop.sayT=2.5; cop.state='chaseCar'; }
function exitCar(){ state.driving=false; state.carSpeed=0; AU.sfx('door'); AU.siren(false); AU.engine(false,0); const rx=-Math.cos(state.carYaw), rz=Math.sin(state.carYaw);
  pos.x=police.position.x+rx*2.1; pos.z=police.position.z+rz*2.1; resolve(pos); pos.y=groundH(pos.x,pos.z); vel.set(0,0,0);
  player.visible=true; shadowBlob.visible=true; syncPoliceCol();
  cop.state='chase'; cop.chaseT=0; AU.sfx('whistle'); cop.sp.say('站住！'); cop.sayT=2;
  cop.onCatch=()=>openDialog(DIALOGS.copStopsCar.title,DIALOGS.copStopsCar.lines,()=>transition(()=>{
    police.position.set(carHome.x,0,carHome.z); police.rotation.y=carHome.yaw; syncPoliceCol(); cop.g.position.set(cop.home.x,0,cop.home.z); cop.g.rotation.y=cop.face; cop.state='idle'; })); }
function updateDrive(dt){
  let thr=0, st=0;
  if(dlg.hidden&&!state.busy){ thr=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)+state.stickV.y; st=(keys.KeyA||keys.ArrowLeft?1:0)-(keys.KeyD||keys.ArrowRight?1:0)-state.stickV.x; }
  thr=Math.max(-1,Math.min(1,thr)); st=Math.max(-1,Math.min(1,st));
  if(thr>0) state.carSpeed+=thr*15*dt; else if(thr<0) state.carSpeed+=thr*(state.carSpeed>0?26:9)*dt;
  state.carSpeed-=state.carSpeed*0.8*dt; state.carSpeed=Math.max(-7,Math.min(19,state.carSpeed)); if(Math.abs(state.carSpeed)<0.05&&!thr) state.carSpeed=0;
  state.carYaw+=st*1.9*dt*Math.sign(state.carSpeed)*Math.min(1,Math.abs(state.carSpeed)/4);
  const ox=pos.x, oz=pos.z; pos.x+=Math.sin(state.carYaw)*state.carSpeed*dt; pos.z+=Math.cos(state.carYaw)*state.carSpeed*dt;
  const bx=pos.x, bz=pos.z; resolve(pos,1.35);
  if(groundH(pos.x,pos.z)>0.45){ pos.x=ox; pos.z=oz; state.carSpeed*=-0.25; }
  else if(Math.hypot(pos.x-bx,pos.z-bz)>0.02) state.carSpeed*=0.55;
  pos.y=groundH(pos.x,pos.z);
  AU.engine(true,state.carSpeed);
  police.position.set(pos.x,pos.y,pos.z); police.rotation.y=state.carYaw;
  police.rotation.z=-st*Math.min(1,Math.abs(state.carSpeed)/12)*0.05;
  const on=Math.sin(state.time*18)>0; sirenR.material.color.set(on?'#ff3b30':'#4a1414'); sirenB.material.color.set(on?'#1f3c8f':'#3d7dff');
}

export { carSpot, enterCar, exitCar, sirenB, sirenR, updateDrive };
