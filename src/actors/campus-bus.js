/**
 * 校園公車「一路」與行駛路線。
 */
import * as THREE from 'three';
import { late } from '../core/late.js';
import { scene } from '../core/engine.js';
import { AU } from '../systems/audio.js';
import { BOX, basic, block, canvasTex, mk, outline, toon } from '../render/kit.js';
import { colliders } from '../core/collision.js';

/* 校園公車：粉紫色中型巴士，車頭跑馬燈「一路」 */
function makeBus(){
  // userData.noOcc：車身是一堆沒有名字的純色方塊，靜態烘焙（world/bake）會把它們
  // 合併成凍結的裝飾，行駛邏輯移動的卻是這個群組，公車會變成看起來不會動；
  // 用 noOcc 讓烘焙整棵跳過（石獅子、警車都是同樣的修法）。
  const g=new THREE.Group(); g.userData.noOcc=true; scene.add(g);
  const PINK='#efb9e2', LAV='#c88bd0', LAV2='#b878c4', GREY='#9a9ca3';
  const L=7.4, W=2.1;
  const lower=mk(BOX,toon(LAV),0,0.62,0,{parent:g}); lower.scale.set(W,0.7,L); outline(lower,0).scale.set(1.04,1.08,1.015);
  const upper=mk(BOX,toon(PINK),0,1.72,-0.1,{parent:g}); upper.scale.set(W,1.5,L-0.2); outline(upper,0).scale.set(1.04,1.04,1.012);
  const roof=mk(BOX,toon(PINK),0,2.6,-0.25,{parent:g}); roof.scale.set(W-0.12,0.26,L-0.6); outline(roof,0).scale.set(1.05,1.15,1.01);
  const nose=mk(BOX,toon(PINK),0,1.15,L/2-0.1,{parent:g}); nose.scale.set(W-0.04,0.9,0.4);
  block(0,0.55,L/2+0.02,W+0.02,0.36,0.3,LAV2,0.02,g);
  block(0,2.62,1.9,W-0.1,0.12,1.6,LAV,0,g);
  /* 擋風玻璃與跑馬燈 */
  const ws=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.25),toon('#2e3a46')); ws.position.set(0,1.95,L/2-0.08); ws.rotation.x=-0.12; g.add(ws);
  const hl=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.28),toon('#1d2329')); hl.position.set(0,2.5,L/2-0.13); hl.rotation.x=-0.12; g.add(hl);
  const led=canvasTex(256,64,(c,w,h)=>{ c.fillStyle='#120c0c'; c.fillRect(0,0,w,h);
    c.font='900 46px "Noto Sans TC",sans-serif'; c.textBaseline='middle'; c.fillStyle='#ff3a24'; c.shadowColor='#ff5a30'; c.shadowBlur=8; c.fillText('一路',10,h/2+3);
    c.fillStyle='#ffb12a'; c.shadowColor='#ffb12a'; c.font='700 26px "Noto Sans TC",sans-serif'; c.fillText('政大校園公車',112,h/2+2); });
  const lp=new THREE.Mesh(new THREE.PlaneGeometry(1.2,0.3),basic({map:led})); lp.position.set(-0.2,2.33,L/2-0.04); lp.rotation.x=-0.12; g.add(lp);
  /* 側面車窗 */
  [-1,1].forEach(s=>{
    const fw=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.95),toon('#2e3a46')); fw.position.set(s*(W/2+0.005),1.95,L/2-0.9); fw.rotation.y=s*Math.PI/2; g.add(fw);
    block(s*(W/2+0.01),1.88,-0.55,0.03,1.04,4.6,GREY,0,g);
    [-2.2,-1.1,0,1.1].forEach(dz=>{ const wn=new THREE.Mesh(new THREE.PlaneGeometry(1.02,0.9),toon('#3a4652')); wn.position.set(s*(W/2+0.03),1.9,dz-0.05); wn.rotation.y=s*Math.PI/2; g.add(wn); });
    const bp=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.9),toon('#181a1f')); bp.position.set(s*(W/2+0.03),1.9,-3.15); bp.rotation.y=s*Math.PI/2; g.add(bp);
    block(s*(W/2+0.005),1.0,-0.6,0.02,0.04,6.8,'#ffffff',0,g);
    [-2.6,0.4].forEach(z=>block(s*(W/2+0.01),0.42,z,0.03,0.08,0.12,'#ff9a2a',0,g));
    const m=mk(BOX,toon('#22252b'),s*1.22,1.72,L/2-0.25,{parent:g}); m.scale.set(0.08,0.38,0.14);
  });
  block(-0.9,1.6,L/2-0.55,0.04,1.6,0.04,'#22252b',0,g);
  /* 車燈、車牌、國旗 */
  [-0.72,0.72].forEach(x=>{ mk(BOX,toon('#fff7d6',{emissive:'#fff2c0',emissiveIntensity:0.6}),x,0.72,L/2+0.18,{parent:g,cast:false}).scale.set(0.42,0.2,0.04);
    mk(BOX,toon('#d23a3a'),x,0.75,-L/2-0.02,{parent:g,cast:false}).scale.set(0.3,0.25,0.04); });
  block(0,0.95,L/2+0.11,1.0,0.12,0.04,'#1d2329',0,g);
  block(0,0.55,L/2+0.18,0.62,0.22,0.03,'#2e7d5b',0,g);
  { const fl=canvasTex(96,64,(c,w,h)=>{ c.fillStyle='#d9282f'; c.fillRect(0,0,w,h); c.fillStyle='#1f3c8f'; c.fillRect(0,0,w/2,h/2); c.fillStyle='#fff'; c.beginPath(); c.arc(w/4,h/4,8,0,7); c.fill(); });
    const f=new THREE.Mesh(new THREE.PlaneGeometry(0.26,0.17),basic({map:fl})); f.position.set(0.55,1.42,L/2+0.11); g.add(f); }
  /* 輪子 */
  [[-1.02,2.3],[1.02,2.3],[-1.02,-2.1],[1.02,-2.1]].forEach(([x,z])=>{ const w=mk(new THREE.CylinderGeometry(0.42,0.42,0.28,16),toon('#222228'),x,0.42,z,{parent:g}); w.rotation.z=Math.PI/2;
    const hb=mk(new THREE.CylinderGeometry(0.22,0.22,0.3,12),toon('#c9ccd2'),x,0.42,z,{parent:g}); hb.rotation.z=Math.PI/2; });
  return g;
}
const driveCar=makeBus();
driveCar.position.set(25.65,0,-82);
const carCol={c:true,x:25.65,z:-82,r:1.4};
colliders.push(carCol);
const carCol2={c:true,x:25.65,z:-82,r:1.4};
colliders.push(carCol2);
const carPath=[[25.65,-82],[25.65,-93,3.5],[25.65,-142],[24.3,-146.5],[22.95,-142],[22.95,-84],[24.3,-79.6]];
let carIdx=1, carWait=0;
function updateCar(dt){
  const p=driveCar.position, w=carPath[carIdx], dx=w[0]-p.x, dz=w[1]-p.z, d=Math.hypot(dx,dz);
  const hx=Math.sin(driveCar.rotation.y), hz=Math.cos(driveCar.rotation.y);
  const px=late.pos.x-p.x, pz=late.pos.z-p.z, ahead=px*hx+pz*hz, side=Math.abs(px*hz-pz*hx);
  const blocked=!late.indoor()&&ahead>0&&ahead<7&&side<1.9;
  if(carWait>0) carWait-=dt;
  else if(d<0.5){ if(w[2]){ carWait=w[2]; if(Math.hypot(late.pos.x-p.x,late.pos.z-p.z)<30) AU.sfx('toot'); } carIdx=(carIdx+1)%carPath.length; }
  else if(!blocked){ const sp=d<4&&w[2]?Math.max(1.5,d*1.5):6; p.x+=dx/d*Math.min(d,sp*dt); p.z+=dz/d*Math.min(d,sp*dt); driveCar.rotation.y=late.lerpA(driveCar.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*4)); }
  const f=1.85; carCol.x=p.x+hx*f; carCol.z=p.z+hz*f; carCol2.x=p.x-hx*f; carCol2.z=p.z-hz*f;
}

export { driveCar, updateCar };
