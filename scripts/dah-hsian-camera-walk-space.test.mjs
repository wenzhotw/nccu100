import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cameraWalkWalls,createCameraWalkSpace,cameraWalkDeficits} from '../src/world/buildings/dah-hsian/camera-walk-space.js';
import {DAH_NAV_BODY} from '../src/world/buildings/dah-hsian/interior-space.js';
import {clampAtrium,atriumHeight} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {publicFloor,floorContains,ATRIUM_FLOOR_LEVELS,MAIN_FLOORS,CORE_STAIR_FLIGHTS} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
const settle=(p,space)=>{clampAtrium(p,DAH_NAV_BODY);space.clamp(p);};
test('H梯8F原生落腳點完整身寬承托，保留牆距且不被推回',()=>{
 const s=CORE_STAIR_FLIGHTS.filter(s=>s.coreStair==='H').at(-1),dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),p={x:s.b.x+.6*dx/len,y:s.b.y,z:s.b.z+.6*dz/len},original={...p},space=createCameraWalkSpace(DAH_NAV_BODY),floor=publicFloor('8F');
 for(let i=0;i<16;i++){const a=i*Math.PI/8;assert.ok(floorContains(floor,p.x+Math.cos(a)*DAH_NAV_BODY.radius,p.z+Math.sin(a)*DAH_NAV_BODY.radius),'落腳點完整身寬承托');}
 for(let i=0;i<20;i++)settle(p,space);
 assert.ok(Math.hypot(p.x-original.x,p.z-original.z)<.001,JSON.stringify({original,p}));assert.equal(cameraWalkDeficits(p).length,0);
});
test('估算退台新增外側帶具有實際模型樓板',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),model=createInteriorModel(()=>new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));model.updateMatrixWorld(true);let count=0;
 for(const l of ATRIUM_FLOOR_LEVELS.filter(l=>l.estimatedTerraceOnly))for(let a=-11;a<l.east+4.3;a+=1)for(const p of[{x:a,z:l.north-4.2},{x:l.east+4.2,z:a}]){
  if(!floorContains(publicFloor(l.id),p.x,p.z))continue;
  const hits=new THREE.Raycaster(new THREE.Vector3(p.x,l.y+.15,p.z),new THREE.Vector3(0,-1,0),0,.3).intersectObject(model,true);assert.ok(hits.length,JSON.stringify({floor:l.id,p}));count++;
 }assert.ok(count>=100,'至少100個原3.6範圍外的實際射線承托驗證');
});
test('九層牆側取樣夾制穩定且保持同層實際支撐',()=>{
 let count=0;
 for(const f of [MAIN_FLOORS[0],...ATRIUM_FLOOR_LEVELS]){const floor=publicFloor(f.id);for(const w of cameraWalkWalls(f.id))for(let t=.2;t<w.length;t+=.8)for(const d of [.4,.9,1.2]){
  const p={x:w.a[0]+w.ux*t+w.nx*d,y:f.y,z:w.a[1]+w.uz*t+w.nz*d};if(!floorContains(floor,p.x,p.z))continue;
  const original={...p},space=createCameraWalkSpace(DAH_NAV_BODY);for(let i=0;i<5;i++)settle(p,space);const q={...p};
  for(let i=0;i<8;i++){settle(p,space);assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<.01,JSON.stringify({floor:f.id,original,q,p}));}
  assert.ok(floorContains(floor,p.x,p.z)||Math.abs(atriumHeight(p.x,p.z,p.y)-p.y)<.02,JSON.stringify({floor:f.id,original,p}));count++;
 }}assert.ok(count>3000,'涵蓋九層至少3000個牆側位置');
});
test('8F機房西側夾道完整身寬承托與雙牆鏡頭淨空雙向可走',async()=>{
 const {UPPER_CORE_FRONTS}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js'),a=UPPER_CORE_FRONTS.find(f=>f.id==='8F-core-ac-west'),b=UPPER_CORE_FRONTS.find(f=>f.id==='8F-west-hall-service-return'),floor=publicFloor('8F');
 assert.ok((a.fixed-b.fixed)*.95>2.6,'兩側真牆間須留雙邊1.3鏡頭帶');
 for(const reverse of [false,true]){const space=createCameraWalkSpace(DAH_NAV_BODY);for(let i=0;i<=52;i++){
  const p={x:(a.fixed+b.fixed)/2,y:floor.y,z:reverse?-3.62-i*.04:-5.7+i*.04},original={...p};for(let n=0;n<16;n++){const angle=n*Math.PI/8;assert.ok(floorContains(floor,p.x+Math.cos(angle)*DAH_NAV_BODY.radius,p.z+Math.sin(angle)*DAH_NAV_BODY.radius));}
  settle(p,space);assert.ok(Math.hypot(p.x-original.x,p.z-original.z)<.001,JSON.stringify({original,p}));assert.equal(cameraWalkDeficits(p).length,0);
 }}
});
