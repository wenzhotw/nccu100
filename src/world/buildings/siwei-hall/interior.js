/**
 * 四維堂內部（禮堂、舞台）。放在 x=300 的獨立空間。
 */
import * as THREE from 'three';
import { late } from '../../../core/late.js';
import { scene } from '../../../core/engine.js';
import { GRAD, basic, block, canvasTex, flat, hText, plane } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';

/* ---------- 四維堂內部（另一區域） ---------- */
const IX=300;
const inLight=new THREE.DirectionalLight('#fff4e2',0.95);
inLight.position.set(IX+6,22,14);
inLight.target.position.set(IX,0,-6);
inLight.visible=false;
scene.add(inLight);
scene.add(inLight.target);
const floorTex=canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#a7a9a8'; g.fillRect(0,0,w,h); for(let i=0;i<2200;i++){ g.fillStyle=['#8e9091','#c3c4c2','#7b7d7f','#b6b7b5'][i%4]; g.fillRect(Math.random()*w,Math.random()*h,2,2); } g.strokeStyle='#959796'; g.lineWidth=2; g.strokeRect(0,0,w,h); },[6,12]);
flat(24,50,new THREE.MeshToonMaterial({map:floorTex,gradientMap:GRAD}),IX,0.01,0);
const WHITE='#efede6', MAROON='#6a2b2e';
[-1,1].forEach(s=>{
  block(IX+s*12.2,5.5,0,0.4,11,50,WHITE);
  block(IX+s*11.95,0.7,0,0.15,1.4,50,MAROON);
  for(let z=-15;z<=23;z+=5) block(IX+s*11.7,5,z,0.7,10,0.8,MAROON,0.03);
});
const hallWin=canvasTex(128,160,(g,w,h)=>{ g.fillStyle='#f5f9ff'; g.fillRect(0,0,w,h); g.fillStyle='#d4d6d2'; for(let x=0;x<=w;x+=w/3) g.fillRect(x-4,0,8,h); for(let y=0;y<=h;y+=h/5) g.fillRect(0,y-4,w,8); });
const hallWinMat=basic({map:hallWin});
for(let z=-12.5;z<=20.5;z+=5) [-1,1].forEach(s=>plane(3.9,5.4,hallWinMat,IX+s*11.98,6.3,z,0,-s*Math.PI/2));
block(IX,11.2,0,24.8,0.4,50.8,WHITE);
const stripTex=canvasTex(64,64,(g,w,h)=>{ g.fillStyle='#e7dcc0'; g.fillRect(0,0,w,h); g.fillStyle='#d2c39f'; for(let x=4;x<w;x+=10) for(let y=4;y<h;y+=10) g.fillRect(x,y,5,5); },[3,46]);
[-7.5,-2.5,2.5,7.5].forEach(x=>plane(2.6,44,basic({map:stripTex}),IX+x,10.98,1,Math.PI/2));
block(IX,5.5,25.2,24.8,11,0.4,WHITE);
plane(3.2,3.4,basic({color:'#fff6df'}),IX,1.7,24.98,0,Math.PI);
block(IX,3.55,24.95,3.8,0.3,0.2,MAROON);
block(IX,5.5,-25.2,24.8,11,0.4,WHITE);
/* 舞台 */
block(IX,0.6,-21.5,24,1.2,7,'#8a5a3a',0.03);
block(IX,0.3,-17.3,5,0.6,1.4,'#8a5a3a',0.03);
block(IX-10,6.5,-18,4,11,0.6,WHITE);
block(IX+10,6.5,-18,4,11,0.6,WHITE);
block(IX,9.3,-18,16,3.4,0.6,WHITE);
block(IX,7.55,-17.66,16.6,0.4,0.12,MAROON);
[-8.2,8.2].forEach(x=>block(IX+x,4.4,-17.66,0.4,6.4,0.12,MAROON));
const curtTex=canvasTex(512,64,(g,w,h)=>{ for(let x=0;x<w;x++){ const s=0.72+0.28*Math.sin(x/w*Math.PI*2*22); g.fillStyle=`rgb(${Math.round(222*s)},${Math.round(178*s)},${Math.round(72*s)})`; g.fillRect(x,0,1,h); } });
plane(16,6.4,basic({map:curtTex}),IX,4.4,-21.9);
[-7.2,7.2].forEach(x=>plane(1.8,6.4,basic({color:'#4f1a1e'}),IX+x,4.4,-21.8));
const valTex=canvasTex(512,64,(g,w,h)=>{ g.fillStyle='#5a1a1e'; g.fillRect(0,0,w,26); for(let x=0;x<w;x+=64){ g.beginPath(); g.arc(x+32,24,32,0,Math.PI); g.fill(); } g.fillStyle='#d8b05c'; g.fillRect(0,22,w,3); });
plane(16,1.1,basic({map:valTex,transparent:true,alphaTest:0.5}),IX,7.05,-21.75);
const mottoTex=hText('誠精愛親','#b98a2e','900 120px "Noto Serif TC",serif',900,160,120);
plane(8,1.4,basic({map:mottoTex,transparent:true}),IX,9.4,-17.68);
[-4.5,4.5].forEach(x=>block(IX+x,10.4,-17.4,0.9,1,0.6,'#26242c',0.02));
[-1,1].forEach(s=>{ block(IX+s*10.7,4.3,-15,2.6,0.25,4,WHITE,0.02); for(let z=-16.8;z<=-13.2;z+=0.6) block(IX+s*9.45,4.85,z,0.06,0.9,0.06,'#d97a7a'); block(IX+s*9.45,5.3,-15,0.1,0.08,4,'#d97a7a');
  plane(1.6,2.8,basic({color:'#3a2e2e'}),IX+s*11.98,1.4,-15,0,-s*Math.PI/2); });
for(let i=0;i<5;i++) block(IX-10.8,0.55+i*0.12,10+i*0.02,0.9,0.1,0.8,'#6b7076');
block(IX-10.8,0.5,12,0.9,1,4,'#7d838a',0.03);
const chairSt=[];
for(let k=0;k<3;k++) chairSt.push(block(IX-10.8,0.5,6+k*1.1,0.9,1,0.9,'#7d838a',0.03));
boxC(IX-11.3,IX-10.3,5.5,14.1);

// 讓較早載入的模組也能在執行時呼叫到這裡定義的東西
late.IX = IX;

export { IX, inLight };
