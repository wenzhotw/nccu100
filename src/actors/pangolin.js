/**
 * 穿山甲小穿。
 */
import * as THREE from 'three';
import { state } from '../core/state.js';
import { late } from '../core/late.js';
import { scene } from '../core/engine.js';
import { OUT, SPH, basic, canvasTex, mk, toon } from '../render/kit.js';
import { outlineU, player } from './player.js';

/* ---------- 穿山甲小穿：在四維道上來回散步 ---------- */
const pang=new THREE.Group();
pang.position.set(-3,0,8);
scene.add(pang);
const pBody=new THREE.Group();
pBody.position.y=0.32;
pang.add(pBody);
const PSK='#d2ad86', PLEG='#5e4632';
const pbm=mk(SPH,toon(PSK),0,0,0,{parent:pBody});
pbm.scale.set(0.2,0.17,0.36);
outlineU(pbm,1.08);
{
  const plateGeo=new THREE.SphereGeometry(1,10,6,0,Math.PI*2,0,Math.PI/2);
  const pts=[]; for(let i=0;i<8;i++){ const t=-0.84+i*0.235, k=Math.sqrt(1-t*t); [-1.15,-0.58,0,0.58,1.15].forEach(f=>pts.push({t,f,k})); }
  const plates=new THREE.InstancedMesh(plateGeo,toon('#ffffff'),pts.length), plOut=new THREE.InstancedMesh(plateGeo,OUT,pts.length);
  plates.castShadow=true; const o=new THREE.Object3D(), c=new THREE.Color();
  pts.forEach((p,i)=>{
    o.position.set(0.2*Math.sin(p.f)*p.k,0.17*Math.cos(p.f)*p.k,0.36*p.t); o.rotation.set(-0.35,0,-p.f,'ZXY');
    const sc=0.6+0.4*p.k; o.scale.set(0.09*sc,0.045*sc,0.1*sc); o.updateMatrix(); plates.setMatrixAt(i,o.matrix);
    o.scale.multiplyScalar(1.18); o.updateMatrix(); plOut.setMatrixAt(i,o.matrix);
    plates.setColorAt(i,c.set((i+Math.floor(i/5))%2?'#9e7a52':'#87653f'));
  });
  pBody.add(plates); pBody.add(plOut);
}
const pHead=new THREE.Group();
pHead.position.set(0,-0.03,0.33);
pBody.add(pHead);
const phs=mk(SPH,toon(PSK),0,0,0,{parent:pHead});
phs.scale.set(0.12,0.105,0.13);
outlineU(phs,1.1);
mk(new THREE.ConeGeometry(0.07,0.22,10),toon(PSK),0,-0.025,0.15,{parent:pHead,out:0.012}).rotation.x=Math.PI/2;
mk(SPH,toon('#3a2a22'),0,-0.025,0.26,{parent:pHead}).scale.setScalar(0.022);
[-1,1].forEach(s=>{
  mk(SPH,basic({color:'#1b1420'}),s*0.068,0.035,0.08,{parent:pHead,cast:false}).scale.setScalar(0.024);
  mk(SPH,basic({color:'#ffffff'}),s*0.062,0.046,0.098,{parent:pHead,cast:false}).scale.setScalar(0.008);
  mk(SPH,basic({color:'#ff9a9a',transparent:true,opacity:0.5}),s*0.085,-0.01,0.07,{parent:pHead,cast:false}).scale.set(0.025,0.012,0.012);
});
const pLegs=[];
[[-1,1],[1,1],[-1,-1],[1,-1]].forEach(([sx,sz])=>{
  const g=new THREE.Group(); g.position.set(sx*0.13,-0.06,sz*0.2); pBody.add(g);
  mk(new THREE.CapsuleGeometry(0.045,0.12,3,8),toon(PLEG),0,-0.1,0,{parent:g,out:0.01});
  mk(new THREE.ConeGeometry(0.02,0.06,5),toon('#e8dccb'),0,-0.2,0.045,{parent:g}).rotation.x=Math.PI/2;
  pLegs.push({g,ph:sx*sz>0?Math.PI:0});
});
const pTail=[];
{ let parent=pBody; [0.13,0.11,0.085,0.062,0.042].forEach((r,i)=>{
    const g=new THREE.Group(); g.position.set(0,i?0:0.0,i?-0.13:-0.32); parent.add(g);
    const m=mk(SPH,toon(i%2?'#9e7a52':'#87653f'),0,0,-0.07,{parent:g}); m.scale.set(r,r*0.75,0.1); outlineU(m,1.12);
    pTail.push(g); parent=g; }); }
const bubble=new THREE.Sprite(new THREE.SpriteMaterial({map:canvasTex(128,128,(g)=>{ g.fillStyle='#f7f0e2'; g.beginPath(); g.arc(64,56,46,0,7); g.fill(); g.beginPath(); g.moveTo(50,96); g.lineTo(64,122); g.lineTo(78,96); g.fill(); g.fillStyle='#2b2436'; [44,64,84].forEach(x=>{ g.beginPath(); g.arc(x,58,7,0,7); g.fill(); }); }),depthWrite:false}));
bubble.scale.set(0.5,0.5,1);
bubble.position.set(0,0.95,0.1);
pang.add(bubble);
const pPath=[[-3,8],[3,0],[3,-16],[-9,-25],[-9,-39],[0,-45],[9,-39],[9,-25],[-3,-14],[-3,-2]];
let pIdx=1, pWalk=0;
function updatePangolin(dt){
  if(state.holdPang){ const fx=Math.sin(player.rotation.y), fz=Math.cos(player.rotation.y); pang.position.set(late.pos.x+fx*0.42,late.pos.y+0.32,late.pos.z+fz*0.42); pang.rotation.set(0,player.rotation.y+Math.PI/2,0); pBody.scale.setScalar(0.8); pLegs.forEach(l=>l.g.rotation.x=1.1); late.spots[0].x=pang.position.x; late.spots[0].z=pang.position.z; return; }
  const p=pang.position, d2p=Math.hypot(late.pos.x-p.x,late.pos.z-p.z);
  const stay=d2p<3.2||!late.dlg.hidden||late.indoor();
  let moving=false;
  if(!stay){
    const w=pPath[pIdx], dx=w[0]-p.x, dz=w[1]-p.z, d=Math.hypot(dx,dz);
    if(d<0.3) pIdx=(pIdx+1)%pPath.length;
    else { p.x+=dx/d*1.1*dt; p.z+=dz/d*1.1*dt; pang.rotation.y=late.lerpA(pang.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*5)); moving=true; }
  } else if(d2p<6&&!late.indoor()) pang.rotation.y=late.lerpA(pang.rotation.y,Math.atan2(late.pos.x-p.x,late.pos.z-p.z),1-Math.exp(-dt*4));
  if(moving) pWalk+=dt*10;
  const a=moving?1:0;
  pLegs.forEach(l=>{ l.g.rotation.x=Math.sin(pWalk+l.ph)*0.6*a; });
  pBody.position.y=0.32+Math.abs(Math.sin(pWalk))*0.018*a; pBody.rotation.z=Math.sin(pWalk)*0.04*a;
  pTail.forEach((g,i)=>{ g.rotation.x=-0.16; g.rotation.y=Math.sin(state.time*2+pWalk*0.5-i*0.6)*0.14; });
  pHead.rotation.y=moving?Math.sin(state.time*3)*0.15:0; pHead.rotation.x=Math.sin(state.time*1.5)*0.05;
  bubble.position.y=0.95+Math.sin(state.time*2.4)*0.05;
  if(state.dogTalked&&state.found<3) bubble.visible=false;
  late.spots[0].x=p.x; late.spots[0].z=p.z;
}

export { bubble, pBody, pang, updatePangolin };
