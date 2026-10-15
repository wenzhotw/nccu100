/**
 * 環山一道、最西側道路、指南路轉彎，以及外圍樹木。電算中心後面的校內道路在 back-road.js。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { basic, canvasTex, flat, mk, toon } from '../../render/kit.js';
import { circC } from '../../core/collision.js';
import { tree } from '../vegetation.js';
import { creekRoadZ } from '../layout.js';

/* ---------- 地圖擴展：依實際地圖新增道路與預定地 ---------- */
function nsRoad(x,z0,z1,w,name){ const len=z0-z1, c=(z0+z1)/2;
  flat(w,len,'#5b6270',x,0.022,c);
  for(let z=z0-2;z>z1;z-=4) flat(0.12,2,'#f4f4ee',x,0.025,z-1);
  [-w/2+0.15,w/2-0.15].forEach(dx=>flat(0.12,len,'#f4f4ee',x+dx,0.025,c));
  for(let k=-w/2+0.4;k<w/2;k+=0.9) flat(0.45,2.2,'#f4f4ee',x+k+0.2,0.026,z0-1.4);
  if(name){ const t=canvasTex(256,64,(g,W,H)=>{ g.fillStyle='#1f6f4f'; g.fillRect(0,0,W,H); g.strokeStyle='#ffffff'; g.lineWidth=4; g.strokeRect(4,4,W-8,H-8); g.fillStyle='#fff'; g.font='700 36px "Noto Sans TC",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(name,W/2,H/2+2); });
    mk(new THREE.CylinderGeometry(0.06,0.06,3.2,6),toon('#9aa0a6'),x+w/2+0.6,1.6,z0-3,{out:0.015}); circC(x+w/2+0.6,z0-3,0.1);
    [0.03,-0.03].forEach((dz,i)=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(1.8,0.45),basic({map:t})); p.position.set(x+w/2+0.6,3.0,z0-3+dz); if(i) p.rotation.y=Math.PI; scene.add(p); }); }
}
nsRoad(-88,15,creekRoadZ(-88),5,'環山一道');
// 過了濟賢橋之後往山上校區
nsRoad(-88,-153.3,-176,5,null);
nsRoad(176,15,creekRoadZ(176),5,null);   // 往南接到沿溪道路
/* 指南路往東南轉彎 */
{ const x0=-151, z0=25, x1=-240, z1=-95, len=Math.hypot(x1-x0,z1-z0), g=new THREE.Group(); g.position.set((x0+x1)/2,0,(z0+z1)/2); g.rotation.y=Math.atan2(x1-x0,z1-z0); scene.add(g);
  const r=new THREE.Mesh(new THREE.PlaneGeometry(14,len),toon('#5b6270')); r.rotation.x=-Math.PI/2; r.position.y=0.006; g.add(r);
  [-0.3,0.3].forEach(d=>{ const l=new THREE.Mesh(new THREE.PlaneGeometry(0.15,len),toon('#f2d36b')); l.rotation.x=-Math.PI/2; l.position.set(d,0.012,0); g.add(l); });
  const sw=new THREE.Mesh(new THREE.PlaneGeometry(5,len),toon('#dccdb5')); sw.rotation.x=-Math.PI/2; sw.position.set(-9.5,0.02,0); g.add(sw);
  const ar=new THREE.Mesh(new THREE.CircleGeometry(7,24),toon('#5b6270')); ar.rotation.x=-Math.PI/2; ar.position.set(x0,0.005,z0); scene.add(ar); }
[[-100,-30],[-104,-50],[-175,-45],[-190,-75],[-200,-30],[-120,5],[-170,0],[125,-60],[160,-30],[165,-70],[188,-110],[150,-120],[130,-150],[-95,-118],[-135,-140],[-180,-150]].forEach(([x,z])=>tree(x,z,0.95+Math.random()*0.3));
