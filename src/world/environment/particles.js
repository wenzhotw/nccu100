/**
 * 空中漂浮的光點與室內灰塵。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { canvasTex } from '../../render/kit.js';
import { IX } from '../layout.js';
import { roomScene } from '../../core/rooms.js';

/* ---------- glow, motes ---------- */
const glowTex=canvasTex(64,64,(g,w,h)=>{ const r=g.createRadialGradient(32,32,0,32,32,32); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.35,'rgba(255,255,255,.45)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=r; g.fillRect(0,0,w,h); });
const PN=260, pp=new Float32Array(PN*3);
for(let i=0;i<PN;i++){ pp[i*3]=-40+Math.random()*80; pp[i*3+1]=0.4+Math.random()*7; pp[i*3+2]=-72+Math.random()*100; }
const pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position',new THREE.BufferAttribute(pp,3));
const motes=new THREE.Points(pGeo,new THREE.PointsMaterial({map:glowTex,color:'#fff0bf',size:0.32,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
scene.add(motes);
const dust=new Float32Array(120*3);
for(let i=0;i<120;i++){ dust[i*3]=IX-11+Math.random()*22; dust[i*3+1]=1+Math.random()*9; dust[i*3+2]=-17+Math.random()*40; }
const dGeo=new THREE.BufferGeometry();
dGeo.setAttribute('position',new THREE.BufferAttribute(dust,3));
// 四維堂裡的灰塵，放在四維堂房間的場景
roomScene('siwei-hall').add(new THREE.Points(dGeo,new THREE.PointsMaterial({map:glowTex,color:'#fff6dc',size:0.18,transparent:true,opacity:0.7,depthWrite:false,blending:THREE.AdditiveBlending})));

export { PN, dGeo, glowTex, pGeo };
