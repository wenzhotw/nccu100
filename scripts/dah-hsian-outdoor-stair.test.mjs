import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createOutdoorModel} from '../src/world/buildings/dah-hsian/model.js';import * as site from '../src/world/buildings/dah-hsian/layout.js';
import {resolve,setActiveColliders,setRoomClamp} from '../src/core/collision.js';
test('樓外雙跑梯有連續混凝土底板與斜扶手，兩側實際擋人但不封住下方1F通路',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);const stairs=m.getObjectByName('樓外雙跑樓梯');assert.ok(stairs,'不能只剩空中薄階板與斷開扶手');
 const known=new THREE.Mesh(new THREE.BoxGeometry(2,.2,2));known.position.y=1;known.updateMatrixWorld();assert.ok(Math.abs(new THREE.Raycaster(new THREE.Vector3(0,0,0),new THREE.Vector3(0,1,0)).intersectObject(known)[0].point.y-.9)<1e-6,'先校準向上測量底板');
 for(const x of [-31.1,-28]){
  const h=new THREE.Raycaster(new THREE.Vector3(x,0,-30.275),new THREE.Vector3(0,1,0),0,4).intersectObject(stairs,true).find(h=>h.object.name==='樓外梯段連續底板');assert.ok(h,'梯段下方必須有真實連續斜板');
 }
 setActiveColliders(site.coreColliders());setRoomClamp(site.keepOnLand);
 try{for(const i of [3,6,9,12,15,18]){
  const s=site.OUTDOOR_STEPS[i];for(const side of [-1,1]){const p={x:s.x+side*(s.w/2-.15),y:s.y,z:s.z};resolve(p);assert.ok(side*(p.x-s.x)<=s.w/2-.395,'角色不能穿過可見梯側扶手 '+i+','+side);}
 }
 const below={x:-26.9,y:0,z:-29.45};resolve(below);assert.ok(Math.hypot(below.x+26.9,below.z+29.45)<.01,'高處扶手不能成1F隱形牆');
 }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('角色能從1F走完整個樓外雙跑梯與轉折平台至2F，再原路返回，腳下都有真踏面',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);setActiveColliders(site.coreColliders());setRoomClamp(site.keepOnLand);
 try{for(const dt of [1/60,.05]){
  const p={x:-31.1,y:0,z:-26.8};let vy=0;
  const walk=(x,z)=>{for(let n=0;n<1800;n++){
   const dx=x-p.x,dz=z-p.z,len=Math.hypot(dx,dz);if(len<.06)return;
   const step=Math.min(len,dt*4.6);p.x+=dx/len*step;p.z+=dz/len*step;resolve(p);vy-=18*dt;p.y+=vy*dt;const h=site.walkHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}
   if(h>.1){const hit=new THREE.Raycaster(new THREE.Vector3(p.x,h+.15,p.z),new THREE.Vector3(0,-1,0),0,.4).intersectObject(m,true).find(h=>h.object.material.side!==THREE.BackSide);assert.ok(hit&&Math.abs(hit.point.y-h)<.08,'腳下不能只有假導航高度 '+JSON.stringify({p,goal:[x,z],dt,hit:hit?.point.toArray()}));}
  }assert.fail('樓外梯卡住 '+JSON.stringify({x,z,p,dt}));};
  const route=[[-31.1,-27.8],[-31.1,-32.75],[-31.1,-33.6],[-28,-33.6],[-28,-32.75],[-28,-27.8],[-28,-26.9],[-24.5,-26.9],[-24.5,-27.8]];
  for(const v of route)walk(...v);assert.ok(Math.abs(p.y-4)<.04,'抵達真2F平台');
  for(const v of [...route].reverse())walk(...v);walk(-31.1,-26.8);for(let i=0;i<60;i++){vy-=18*dt;p.y+=vy*dt;const h=site.walkHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}
  assert.ok(Math.abs(p.y)<.04,'回1F地面');
 }
 }finally{setActiveColliders([]);setRoomClamp(null);}
});
