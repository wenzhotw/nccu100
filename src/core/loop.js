/**
 * 每一幀的更新與畫面輸出。
 */
import * as THREE from 'three';
import { state } from './state.js';
import { $ } from './dom.js';
import { camera, renderer, scene } from './engine.js';
import { AU } from '../systems/audio.js';
import { POST, qualityTick } from '../render/post.js';
import { resolve } from './collision.js';
import { SUN, clouds, sky, sun } from '../world/environment/sky.js';
import { waterU } from '../render/water.js';
import { palms } from '../world/vegetation.js';
import { police } from '../actors/police-car.js';
import { driveCar, updateCar } from '../actors/campus-bus.js';
import { IX } from '../world/layout.js';
import { grassU } from '../world/environment/grass.js';
import { PN, dGeo, pGeo } from '../world/environment/particles.js';
import { H, animateHero, player, shadowBlob } from '../actors/player.js';
import { pang, updatePangolin } from '../actors/pangolin.js';
import { crystals } from '../systems/stories.js';
import { banner, dlg } from '../ui/dialog.js';
import { keys } from './input.js';
import { camT, groundH, indoor, lerpA, pos, spots, vel, zoneOf } from './gameplay.js';
import { NPCS, npcUpdate } from '../actors/npc.js';
import { carSpot, exitCar, sirenB, sirenR, updateDrive } from '../systems/police-drive.js';
import { buildOccluders, camDir, camRay } from '../systems/camera-occlusion.js';
import { cameraFov, drawMini, heroJuice, placePrompt, puff, updatePuffs } from '../systems/feel.js';

/* ---------- 標題畫面環繞鏡頭 ---------- */
function titleCamera(t){ const a=t*0.07+0.6; camera.position.set(Math.sin(a)*58,22+Math.sin(t*0.13)*3,-38+Math.cos(a)*58); camera.lookAt(0,7,-48); }
state.time=0;
const clock=new THREE.Clock();
function update(dt){
  state.time+=dt; grassU.value=state.time; waterU.t.value=state.time;
  const mapOpen=!$('mapw').hidden; if(mapOpen){ keys.KeyW=keys.KeyA=keys.KeyS=keys.KeyD=false; }
  if(state.driving){ updateDrive(dt); } else {
  let ix=0, iy=0, run=false;
  if(state.started&&dlg.hidden&&!state.busy){
    ix=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+state.stickV.x;
    iy=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)+state.stickV.y;
    const m=Math.hypot(ix,iy); if(m>1){ix/=m;iy/=m;}
    run=keys.ShiftLeft||keys.ShiftRight||Math.hypot(state.stickV.x,state.stickV.y)>0.92;
  }
  const spd=run?8.2:4.6;
  const fx=-Math.sin(state.yaw), fz=-Math.cos(state.yaw), rx=Math.cos(state.yaw), rz=-Math.sin(state.yaw);
  const tvx=(fx*iy+rx*ix)*spd, tvz=(fz*iy+rz*ix)*spd;
  const k=1-Math.exp(-dt*12); vel.x+=(tvx-vel.x)*k; vel.z+=(tvz-vel.z)*k;
  pos.x+=vel.x*dt; pos.z+=vel.z*dt; resolve(pos);
  state.vy-=18*dt; pos.y+=state.vy*dt; const gh=groundH(pos.x,pos.z);
  if(pos.y<=gh){ if(!state.grounded&&state.vy<-4) AU.sfx('land'); pos.y=gh; state.vy=0; state.grounded=true; }
  player.position.copy(pos);
  const sp=Math.hypot(vel.x,vel.z);
  if(sp>0.3) player.rotation.y=lerpA(player.rotation.y,Math.atan2(vel.x,vel.z),1-Math.exp(-dt*14));
  { const before=Math.floor(state.walkPh/Math.PI); animateHero(dt,sp,run); if(state.grounded&&sp>1&&Math.floor(state.walkPh/Math.PI)!==before){ AU.sfx('step'); if(run&&sp>6) puff(pos.x,pos.y,pos.z,1,0.6,0.26); } }
  heroJuice(dt,sp,run); cameraFov(dt,sp,run);
  shadowBlob.position.set(pos.x,gh+0.03,pos.z); shadowBlob.scale.setScalar(1-Math.min(0.5,(pos.y-gh)*0.3));
  if(state.holdPang){ H.shL.rotation.x=-1.35; H.shR.rotation.x=-1.35; H.shL.rotation.z=-0.35; H.shR.rotation.z=0.35; }
  }

  updatePangolin(dt);
  updateCar(dt);
  NPCS.forEach(n=>npcUpdate(n,dt));
  if(!state.driving){ const on=Math.sin(state.time*2)>2; sirenR.material.color.set('#661a1a'); sirenB.material.color.set('#1a2a66'); }
  carSpot.x=police.position.x; carSpot.z=police.position.z;
  palms.forEach((c,i)=>{ c.rotation.z=Math.sin(state.time*0.9+i)*0.04; c.rotation.x=Math.sin(state.time*0.7+i*1.7)*0.03; });

  crystals.forEach((c,i)=>{
    if(c.got){ c.g.scale.multiplyScalar(Math.max(0,1-dt*5)); c.g.position.y+=dt*1.5; if(c.g.scale.x<0.02) c.g.visible=false; return; }
    c.g.position.y=c.base+Math.sin(state.time*2+i)*0.12; c.m.rotation.y+=dt*1.2; c.ring.rotation.z-=dt*0.8;
  });

  state.near=null; let best=99;
  if(state.driving){ if(dlg.hidden&&!state.busy) state.near={label:'下車',fn:exitCar}; }
  else if(state.started&&dlg.hidden&&!state.busy) spots.forEach(s=>{ if(!s.ok()) return; const d=Math.hypot(pos.x-s.x,pos.z-s.z); if(d<s.r&&d<best){ best=d; state.near=s; } });
  if(state.near){ $('actText').textContent=state.near.label; $('act').hidden=false; } else $('act').hidden=true;
  if(state.near&&state.near.alt){ $('act2Text').textContent=state.near.alt.label; $('act2').hidden=false; } else $('act2').hidden=true;
  updatePuffs(dt); drawMini(dt); qualityTick(dt);

  const z=zoneOf(pos); if(z!==state.zone){ const first=state.zone===''; state.zone=z; $('locname').textContent=z; if(state.started&&!first){ banner(z); AU.sfx('chime'); } }

  const a=pGeo.attributes.position;
  for(let i=0;i<PN;i++){ let y=a.getY(i)+dt*0.35; if(y>8) y=0.4; a.setY(i,y); a.setX(i,a.getX(i)+Math.sin(state.time*0.6+i)*dt*0.15); }
  a.needsUpdate=true;
  const da=dGeo.attributes.position;
  for(let i=0;i<120;i++){ let y=da.getY(i)-dt*0.12; if(y<0.8) y=10; da.setY(i,y); }
  da.needsUpdate=true;
  clouds.forEach((c,i)=>{ c.position.x+=dt*(1.0+i%3*0.4); if(c.position.x>340) c.position.x=-340; });

  if(!state.started){ titleCamera(state.time); sky.position.copy(camera.position); sun.position.set(SUN.x*70,SUN.y*70,-40+SUN.z*70); sun.target.position.set(0,0,-40); return; }
  if(state.driving&&Math.abs(state.carSpeed)>1&&state.camPtr===null) state.yaw=lerpA(state.yaw,state.carYaw+(state.carSpeed>0?Math.PI:0),1-Math.exp(-dt*2.5));
  const tf=(!dlg.hidden&&state.talkFocus)?state.talkFocus:null;
  camT.lerp(tf?new THREE.Vector3((pos.x+tf.x)/2,pos.y+1.05,(pos.z+tf.z)/2):new THREE.Vector3(pos.x,pos.y+(state.driving?1.5:0.9),pos.z),1-Math.exp(-dt*(tf?3:8)));
  const cp=Math.cos(state.pitch); let dWant=indoor()?Math.min(state.dist,6.5):(state.driving?Math.max(state.dist,10):state.dist); if(tf) dWant=Math.min(dWant,4.6);
  camDir.set(Math.sin(state.yaw)*cp,Math.sin(state.pitch),Math.cos(state.yaw)*cp);
  if(state.OCC.length){ camRay.set(camT,camDir); camRay.far=dWant+0.6; const hit=camRay.intersectObjects(state.OCC,false)[0]; if(hit) dWant=Math.max(0.9,hit.distance-0.45); }
  state.camD=dWant<state.camD?dWant:state.camD+(dWant-state.camD)*(1-Math.exp(-dt*3));
  camera.position.copy(camT).addScaledVector(camDir,state.camD);
  if(indoor()){ camera.position.x=Math.max(IX-11.3,Math.min(IX+11.3,camera.position.x)); camera.position.z=Math.max(-21.3,Math.min(24.6,camera.position.z)); camera.position.y=Math.min(10.4,camera.position.y); }
  if(camera.position.y<0.5) camera.position.y=0.5;
  camera.lookAt(camT);
  // 除錯用的自由視角（__game.view），平常不會用到
  if(state.viewCam){ const v=state.viewCam; camera.position.set(v[0],v[1],v[2]); camera.lookAt(v[3],v[4],v[5]); }
  sky.position.copy(camera.position);
  sun.position.set(pos.x+SUN.x*70,SUN.y*70,pos.z+SUN.z*70); sun.target.position.set(pos.x,0,pos.z);
  placePrompt();
}
function loop(){ update(Math.min(clock.getDelta(),0.05)); if(POST) POST.render(scene,camera,state.time,indoor()); else renderer.render(scene,camera); requestAnimationFrame(loop); }
addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); if(POST) POST.size(); });
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ scene.traverse(o=>{ const m=o.material; if(m&&m.map&&m.map.redraw) m.map.redraw(); }); });
player.userData.noOcc=true;
pang.userData.noOcc=true;
driveCar.userData.noOcc=true;
crystals.forEach(c=>c.g.userData.noOcc=true);
buildOccluders();
loop();
