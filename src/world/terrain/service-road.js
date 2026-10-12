/**
 * 四維堂兩側的車道（行政大樓側、圖書館側）、停車格與停放車輛。兩條都往南接到沿溪道路。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { BOX, basic, block, canvasTex, flat, mk, outline, plane, toon } from '../../render/kit.js';
import { circC, obbC } from '../../core/collision.js';
import { creekRoadZ, swZ } from '../layout.js';

/* ---------- 四維堂與行政大樓之間的車道 ---------- */
// 往南一路接到醉夢溪北岸的沿溪道路，盡頭是渡賢橋（校園公車往山上校區的路線）
const RD={x0:19.6,x1:27,z0:-60,z1:creekRoadZ(23.3)};
const RL=RD.z0-RD.z1, RC=(RD.z0+RD.z1)/2;
flat(RD.x1-RD.x0,RL,'#5b6270',(RD.x0+RD.x1)/2,0.019,RC);
flat(0.12,RL,'#f2d36b',24.15,0.024,RC);
flat(0.12,RL,'#f2d36b',24.45,0.024,RC);
flat(0.15,RL,'#f4f4ee',26.75,0.024,RC);
flat(0.15,RL,'#f4f4ee',21.6,0.024,RC);
for(let z=-82;z>-146;z-=5.5){ flat(2,0.12,'#f4f4ee',20.6,0.024,z); }
for(let x=RD.x0+0.5;x<RD.x1;x+=1) flat(0.5,2.4,'#f4f4ee',x,0.024,-63.6);
for(let z=-90;z>RD.z1+4;z-=6) flat(1.6,0.25,'#f2d36b',25.65,0.024,z);
block(27.15,0.08,-107,0.3,0.16,86,'#bdb3a3');
flat(1.2,86,'#d8cdb9',27.9,0.02,-107);

/* 四維堂東側的車道（圖書館這一側，照片上有一排停車格），往南接到沿溪道路。夾在四維堂和圖書館斜翼之間，只有單線寬 */
{ const x=-15.9, w=3.4, z0=swZ(x)-5, z1=creekRoadZ(x)+2.2, L=z0-z1, c=(z0+z1)/2;
  flat(w,L,'#5b6270',x,0.019,c);
  [-w/2+0.2,w/2-0.2].forEach(dx=>flat(0.12,L,'#f4f4ee',x+dx,0.024,c));
  for(let z=z0-3;z>z1+2;z-=4) flat(0.12,2,'#f4f4ee',x,0.024,z-1);
  for(let k=-w/2+0.4;k<w/2;k+=0.9) flat(0.45,2.2,'#f4f4ee',x+k+0.2,0.026,z0-1.4); }
/* 乘車處站牌 */
mk(new THREE.CylinderGeometry(0.06,0.06,2.8,6),toon('#4a5560'),27.8,1.4,-92,{out:0.02});
{ const t=canvasTex(256,128,(g,w,h)=>{ g.fillStyle='#2f6f4f'; g.fillRect(0,0,w,h); g.fillStyle='#fff'; g.font='900 64px "Noto Sans TC",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('乘車處',w/2,h/2+4); });
  block(27.8,2.75,-92,1.6,0.8,0.06,'#2f6f4f',0.02); const p=plane(1.56,0.76,basic({map:t}),27.8,2.75,-91.96); p.rotation.y=0; const q=plane(1.56,0.76,basic({map:t}),27.8,2.75,-92.04,0,Math.PI); }
circC(27.8,-92,0.15);
/* 汽車 */
function makeCar(col){
  const g=new THREE.Group();
  const b=mk(BOX,toon(col),0,0.62,0,{parent:g}); b.scale.set(1.8,0.62,4.1); outline(b,0).scale.set(1.04,1.08,1.02);
  const c=mk(BOX,toon('#3d4a56'),0,1.18,-0.25,{parent:g}); c.scale.set(1.6,0.55,2.2); outline(c,0).scale.set(1.05,1.08,1.04);
  const r=mk(BOX,toon(col),0,1.47,-0.25,{parent:g}); r.scale.set(1.62,0.08,2.0);
  [[-0.85,1.3],[0.85,1.3],[-0.85,-1.3],[0.85,-1.3]].forEach(([x,z])=>{ const w=mk(new THREE.CylinderGeometry(0.34,0.34,0.24,14),toon('#222228'),x,0.34,z,{parent:g}); w.rotation.z=Math.PI/2; });
  [-0.6,0.6].forEach(x=>{ mk(BOX,toon('#fff7d6',{emissive:'#fff2c0',emissiveIntensity:0.5}),x,0.7,2.06,{parent:g,cast:false}).scale.set(0.4,0.16,0.04); mk(BOX,toon('#d23a3a'),x,0.72,-2.06,{parent:g,cast:false}).scale.set(0.4,0.14,0.04); });
  scene.add(g); return g;
}
[['#e9eef2',-84],['#2c2f38',-92],['#c8473f',-99],['#9aa3ad',-107],['#f1f1ee',-121],['#3f6fb0',-129]].forEach(([c,z])=>{ const car=makeCar(c); car.position.set(20.6,0,z); car.rotation.y=Math.PI; obbC(20.6,z,0.95,2.1,0); });
