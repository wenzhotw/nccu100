/**
 * 四維堂西側廊道與路口擺設。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { GRAD, SPH, basic, block, canvasTex, flat, mk, outline, plane, toon } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { palm, tree } from '../../vegetation.js';

/* ---------- 四維堂西側：混凝土廊道、棕櫚、路口石盆、大樹與指標 ---------- */
/* 四維堂側立面：兩排白框格子窗 */
{ const sideWin=canvasTex(256,128,(g,w,h)=>{ g.fillStyle='#8f908b'; g.fillRect(0,0,w,h);
    g.fillStyle='rgba(0,0,0,.08)'; for(let i=0;i<60;i++) g.fillRect(Math.random()*w,Math.random()*h,2,8);
    [[10,52],[72,114]].forEach(([y0,y1])=>{ for(let x=10;x<w;x+=62){ g.fillStyle='#e9ebe6'; g.fillRect(x,y0,48,y1-y0); g.fillStyle='#5c6d78'; for(let cx=0;cx<4;cx++) for(let cy=0;cy<3;cy++) g.fillRect(x+3+cx*11.3,y0+3+cy*((y1-y0-6)/3),9,(y1-y0-6)/3-2.4); } });
    g.fillStyle='#7d7e79'; g.fillRect(0,60,w,6); },[5,1]);
  [-1,1].forEach(s=>{ const p=plane(24.6,8.6,new THREE.MeshToonMaterial({map:sideWin,gradientMap:GRAD}),s*14.13,4.4,-90.5,0,s*Math.PI/2); }); }
/* 廊道地坪與種植帶 */
flat(5.4,44,'#cfcbc3',16.9,0.02,-84.5);
flat(1.0,44,'#6aa953',14.6,0.024,-84.5);
block(19.55,0.08,-84.5,0.2,0.16,44,'#bdb3a3');
flat(0.25,9,'#d8473f',19.75,0.026,-67.5);
/* 平頂混凝土廊道 */
const PG={x0:15.4,x1:18.6,z0:-64,z1:-104};
const PGC='#b9b7af';
block((PG.x0+PG.x1)/2,2.95,(PG.z0+PG.z1)/2,PG.x1-PG.x0+0.8,0.28,PG.z0-PG.z1,PGC,0.04);
[PG.x0-0.35,PG.x1+0.35].forEach(x=>block(x,2.72,(PG.z0+PG.z1)/2,0.25,0.45,PG.z0-PG.z1,'#a9a79f',0.02));
for(let z=PG.z0-0.4;z>=PG.z1+0.3;z-=3.6){
  block((PG.x0+PG.x1)/2,2.72,z,PG.x1-PG.x0+0.8,0.3,0.3,'#a9a79f',0.02);
  [PG.x0,PG.x1].forEach(x=>{ block(x,1.4,z,0.36,2.8,0.36,PGC,0.03); circC(x,z,0.25); });
}
/* 柱上的國旗 */
{ const fl=canvasTex(96,64,(c,w,h)=>{ c.fillStyle='#d9282f'; c.fillRect(0,0,w,h); c.fillStyle='#1f3c8f'; c.fillRect(0,0,w/2,h/2); c.fillStyle='#fff'; c.beginPath(); c.arc(w/4,h/4,8,0,7); c.fill(); });
  const fm=new THREE.MeshToonMaterial({map:fl,gradientMap:GRAD,side:THREE.DoubleSide});
  for(let z=PG.z0-0.4;z>=PG.z0-12;z-=3.6){ block(PG.x1+0.32,2.4,z,0.04,1.4,0.04,'#d9d9d9'); const f=new THREE.Mesh(new THREE.PlaneGeometry(0.7,0.46),fm); f.position.set(PG.x1+0.33,2.7,z-0.38); f.rotation.y=Math.PI/2; scene.add(f); } }
/* 棕櫚與灌木（建築與廊道之間） */
for(let z=-68;z>-104;z-=8) palm(14.6,z,10+Math.random()*2);
for(let z=-70;z>-104;z-=4){ const b=mk(SPH,toon(z%8?'#4f8e40':'#5f9d4a'),14.6,0.55,z,{}); b.scale.set(0.6,0.55,1.6); outline(b,0.06); }
/* 路口：石盆龍舌蘭 */
function agavePot(x,z){
  latheMesh([[0.05,0],[0.55,0.05],[0.72,0.35],[0.75,0.7],[0.68,0.85],[0.6,0.88]],'#cfc8b8',x,z);
  const lf=new THREE.ConeGeometry(0.06,1.0,4); lf.translate(0,0.5,0);
  for(let i=0;i<16;i++){ const a=i/16*Math.PI*2, t=0.35+(i%3)*0.25; const m=new THREE.Mesh(lf,toon(i%2?'#6f9a5a':'#7fae66')); m.position.set(x,0.85,z); m.rotation.set(Math.sin(a)*t,0,Math.cos(a)*-t,'XZY'); m.rotation.order='YXZ'; m.rotation.y=a; m.rotation.x=t; m.castShadow=true; scene.add(m); }
  circC(x,z,0.75);
}
function latheMesh(pts,col,x,z){ const g=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),18); const m=new THREE.Mesh(g,toon(col,{side:THREE.DoubleSide})); m.position.set(x,0,z); m.castShadow=m.receiveShadow=true; scene.add(m); outline(m,0.04); return m; }
[20.9,23.3,25.7].forEach(x=>agavePot(x,-63.4));
[[37.5,-62.2],[52.5,-62.2],[40.5,-61.2],[49.5,-61.2]].forEach(([x,z])=>agavePot(x,z));
/* 四維堂前西角：大樹花台、石椅、指標牌、校旗路燈 */
{ const cx=11.6, cz=-65.3;
  block(cx,0.2,cz,5.6,0.4,3.4,'#b9b2a4',0.03); flat(5.2,3.0,'#6f8f4a',cx,0.41,cz);
  tree(cx-0.6,cz,1.35);
  [[cx+3.6,cz+0.6],[cx+3.6,cz-1.2]].forEach(([x,z])=>{ block(x,0.25,z,0.6,0.5,1.2,'#a9a399',0.02); block(x,0.55,z,1.4,0.12,1.4,'#8a6a42',0.02); boxC(x-0.7,x+0.7,z-0.7,z+0.7); });
  const sx=cx+2.2, sz=cz+1.5;
  mk(new THREE.CylinderGeometry(0.07,0.07,3.2,6),toon('#c9c9c4'),sx,1.6,sz,{out:0.02}); circC(sx,sz,0.15);
  ['四維堂','行政大樓','中正圖書館','體育館','風雩樓'].forEach((n,i)=>{ const t=canvasTex(256,48,(g,w,h)=>{ g.fillStyle='#f4f4f0'; g.fillRect(0,0,w,h); g.fillStyle='#2c3138'; g.font='700 30px "Noto Sans TC",sans-serif'; g.textBaseline='middle'; g.fillText(n,14,h/2+2); g.beginPath(); g.moveTo(w-14,h/2); g.lineTo(w-34,h/2-12); g.lineTo(w-34,h/2+12); g.fill(); });
    const dir=i%2?1:-1, y=2.9-i*0.42;
    const b=new THREE.Mesh(new THREE.PlaneGeometry(1.5,0.3),basic({map:t,side:THREE.DoubleSide})); b.position.set(sx+dir*0.78,y,sz); if(dir<0) b.rotation.y=Math.PI; scene.add(b); });
  const lx=cx+2.6, lz=cz+2.4;
  mk(new THREE.CylinderGeometry(0.08,0.1,5,8),toon('#8f949a'),lx,2.5,lz,{out:0.02}); circC(lx,lz,0.18);
  mk(SPH,toon('#fff6dc',{emissive:'#ffe6a8',emissiveIntensity:0.6}),lx,5.15,lz,{}).scale.setScalar(0.3);
  const ban=(bg,fg,t1,t2)=>canvasTex(128,256,(g,w,h)=>{ g.fillStyle=bg; g.fillRect(0,0,w,h);
    g.fillStyle='rgba(255,255,255,.35)'; g.beginPath(); g.arc(w*0.3,h*0.85,34,0,7); g.fill();
    g.fillStyle='#ffffff'; g.beginPath(); g.arc(w/2,h*0.5,30,0,7); g.fill(); g.fillStyle='#5b3c8f'; for(let k=0;k<5;k++){ const a=k/5*Math.PI*2-Math.PI/2; g.beginPath(); g.arc(w/2+Math.cos(a)*12,h*0.5+Math.sin(a)*12,10,0,7); g.fill(); }
    g.fillStyle=fg; g.textAlign='center'; g.font='700 30px "Noto Serif TC",serif'; g.fillText(t1,w/2,h*0.22); g.font='700 22px "Noto Sans TC",sans-serif'; g.fillText(t2,w/2,h*0.78); });
  [[ban('#d8433f','#fff3c4','政治大學','NCCU'),-0.55],[ban('#efd54a','#7a4a9a','NCCU','國立政治大學'),0.55]].forEach(([t,dx])=>{
    const p=new THREE.Mesh(new THREE.PlaneGeometry(0.9,1.8),basic({map:t,side:THREE.DoubleSide})); p.position.set(lx+dx,3.3,lz); scene.add(p);
    block(lx+dx,4.25,lz,1.0,0.05,0.05,'#8f949a'); });
}
/* 車道上的「公務車」標字 */
{ const t=canvasTex(128,384,(g,w,h)=>{ g.fillStyle='#f4f4ee'; g.font='900 110px "Noto Sans TC",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; ['公','務','車'].forEach((c,i)=>g.fillText(c,w/2,64+i*128)); });
  [-74,-112].forEach(z=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(1.6,4.8),basic({map:t,transparent:true,depthWrite:false})); p.rotation.x=-Math.PI/2; p.position.set(25.65,0.03,z); scene.add(p); }); }
