/**
 * 研究大樓與後方米色高塔。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { BOX, GRAD, basic, block, canvasTex, outline, plane, toon, vText } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';

/* ---------- 研究大樓：白色小磁磚、頂層退縮、右後方米色高塔 ---------- */
function facTex(o){ return canvasTex(128,128,(g,w,h)=>{
  g.fillStyle=o.base; g.fillRect(0,0,w,h);
  g.strokeStyle=o.grout; g.lineWidth=1.2;
  for(let i=0;i<=w;i+=8){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,h); g.stroke(); g.beginPath(); g.moveTo(0,i); g.lineTo(w,i); g.stroke(); }
  if(o.pink){ g.fillStyle='#e0a594'; g.fillRect(92,18,26,86); }
  if(o.ww){
    g.fillStyle='#c3c6bf'; g.fillRect(o.wx-5,o.wy-9,o.ww+10,7);
    g.fillStyle='#4b6370'; g.fillRect(o.wx,o.wy,o.ww,o.wh);
    g.fillStyle='rgba(255,255,255,.22)'; g.fillRect(o.wx+3,o.wy+3,o.ww*0.35,o.wh-6);
    g.fillStyle=o.base; g.fillRect(o.wx+o.ww/2-1.5,o.wy,3,o.wh);
  }
},o.rep); }
const tmat=t=>new THREE.MeshToonMaterial({map:t,gradientMap:GRAD});
const ROOFTOP=toon('#c4c7c0');
function mbox(x,y,z,sx,sy,sz,front,right,left,out){
  const m=new THREE.Mesh(BOX,[right,left,ROOFTOP,ROOFTOP,front,right]);
  m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.castShadow=m.receiveShadow=true; scene.add(m);
  if(out){ const o=outline(m,0); o.scale.set(1+2*out/sx,1+2*out/sy,1+2*out/sz); }
  return m;
}
const W1={base:'#eef1ed',grout:'#d6dbd6',wx:28,wy:36,ww:58,wh:50};
const rp=(o,a,b,extra)=>Object.assign({},o,extra||{},{rep:[a,b]});
mbox(-29,10,-3,24,20,12, tmat(facTex(rp(W1,8,6))), tmat(facTex(rp(W1,4,6))), tmat(facTex(rp(W1,4,6,{pink:true}))),0.08);
block(-29,20.3,-3,25.8,0.6,13.8,'#c6c9c2',0.05);
mbox(-29,23.9,-3,19,6.6,9, tmat(facTex(rp(W1,6,2))), tmat(facTex(rp(W1,3,2))), tmat(facTex(rp(W1,3,2))),0.07);
block(-29,27.5,-3,20.6,0.6,10.6,'#c6c9c2',0.05);
mbox(-29,29.3,-3,10,3,5, tmat(facTex({base:'#e6e9e4',grout:'#d0d5cf',wx:20,wy:30,ww:88,wh:60,rep:[3,1]})), ROOFTOP, ROOFTOP,0.05);
block(-29,31,-3,11,0.4,6,'#c6c9c2',0.04);
mbox(-28,19,2.75,6.4,12,2.5, tmat(facTex({base:'#e9ece8',grout:'#d4d9d4',wx:12,wy:22,ww:104,wh:84,rep:[2,4]})), toon('#e3e6e1'), toon('#e3e6e1'),0.05);
const yjTex=vText('研究大樓','#4f5357','700 90px "Noto Serif TC","Songti TC",serif',128,110);
plane(1.4,5.2,basic({map:yjTex,transparent:true}),-21.2,23.9,1.53);
const W2={base:'#e4ddd2',grout:'#d4ccc0',wx:26,wy:52,ww:74,wh:24};
mbox(-13,17,-4.5,10,34,9, tmat(facTex(rp(W2,3,10))), tmat(facTex(rp(W2,3,10))), tmat(facTex(rp(W2,3,10))),0.08);
[25,28.5,32,34.2].forEach(y=>block(-13,y,-4.5,10.8,0.5,9.8,'#a8786d',0.03));
mbox(-13,35.8,-4.5,6,3,5, tmat(facTex({base:'#e4ddd2',grout:'#d4ccc0',rep:[2,1]})), ROOFTOP, ROOFTOP,0.05);
block(-13,37.4,-4.5,6.6,0.3,5.6,'#a8786d',0.02);
boxC(-41,-17,-9,4.1);
boxC(-18,-8,-9,0);

export { mbox };
