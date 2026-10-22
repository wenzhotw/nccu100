import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {ATRIUM_STAIRS} from '../src/world/buildings/dah-hsian/atrium-layout.js';

test('D梯沿途有真實樓板與天花開口，角色身體不穿過上方實體',()=>{
 const ray=new THREE.Raycaster(new THREE.Vector3(0,-2,0),new THREE.Vector3(0,1,0),0,4);
 const known=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));known.updateMatrixWorld(true);
 assert.equal(ray.intersectObject(known)[0].point.y,-.5);
 ray.ray.origin.x=2;assert.equal(ray.intersectObject(known).length,0,'先校準實體命中與外側無交點');
 const model=createInteriorModel();model.updateMatrixWorld(true);const slabs=[];
 model.traverse(o=>{if(o.isMesh&&['可行走層退平台','閱覽窗邊天花'].includes(o.name))slabs.push(o);});
 const s=ATRIUM_STAIRS[0];
 for(let i=0;i<=40;i++)for(const side of [-.4,0,.4]){
  const t=i/40,feet=s.a.y+(s.b.y-s.a.y)*t;
  ray.ray.origin.set(s.a.x+side,feet+.26,s.a.z+(s.b.z-s.a.z)*t);ray.far=1.6;
  const hit=ray.intersectObjects(slabs,false)[0];
  assert.ok(!hit,`梯段${t}上方不得有${hit?.object.name}，交點${hit?.point.toArray()}`);
 }
});

test('D梯洞口三側有可見護欄，上端開放銜接平台且不能從側邊踏入空洞',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const model=createInteriorModel();model.updateMatrixWorld(true);const guards=[];
 model.traverse(o=>{if(o.isMesh&&o.name==='D梯洞口玻璃護欄')guards.push(o);});
 const h=nav.ENTRY_STAIR_OPENING,y=nav.ATRIUM_LEVELS[0].y+.7;
 for(const [x,z,dx,dz]of [[h.x0+.2,(h.z0+h.z1)/2,-1,0],[h.x1-.2,(h.z0+h.z1)/2,1,0],[(h.x0+h.x1)/2,h.z0+.2,0,-1]]){
  const ray=new THREE.Raycaster(new THREE.Vector3(x,y,z),new THREE.Vector3(dx,0,dz),0,.5);
  assert.ok(ray.intersectObjects(guards).length,'開口邊緣必須有看得見的護欄');
 }
 const exit=new THREE.Raycaster(new THREE.Vector3(-19,y,h.z1-.2),new THREE.Vector3(0,0,1),0,.5);
 assert.equal(exit.intersectObjects(guards).length,0,'樓梯上端不能以護欄封住');
 const p={x:h.x1+.6,y:nav.ATRIUM_LEVELS[0].y,z:21.8};
 for(let i=0;i<30;i++){p.x-=.05;nav.clampAtrium(p);p.y=nav.atriumHeight(p.x,p.z,p.y);}
 assert.equal(p.y,nav.ATRIUM_LEVELS[0].y);assert.ok(p.x>=h.x1+.39,'角色半徑不能跨過洞口側邊');
});

test('D梯每個踏步的上表面可見，不被斜向底板蓋成坡道',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);
 const group=model.getObjectByName('西南D梯封閉入口'),parts=[];
 group.traverse(o=>{if(o.isMesh&&['可見上樓階梯','斜向樓梯底板'].includes(o.name))parts.push(o);});
 const treads=parts.filter(o=>o.name==='可見上樓階梯');assert.ok(treads.length>1);
 for(const tread of treads){
  const p=tread.getWorldPosition(new THREE.Vector3());
  const ray=new THREE.Raycaster(new THREE.Vector3(p.x,p.y+1,p.z),new THREE.Vector3(0,-1,0),0,2);
  const hit=ray.intersectObjects(parts)[0];
  assert.equal(hit?.object.name,'可見上樓階梯','踏步上表面被'+hit?.object.name+'蓋住');
 }
});

test('D梯相鄰踏步之間有連續踢面，不是懸空薄片',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);const bounds=[];
 model.getObjectByName('西南D梯封閉入口').traverse(o=>{if(o.isMesh&&o.name==='可見上樓階梯')bounds.push(new THREE.Box3().setFromObject(o));});
 bounds.sort((a,b)=>a.max.y-b.max.y);
 for(let i=1;i<bounds.length;i++)assert.ok(bounds[i].min.y<=bounds[i-1].max.y+.001,'踏步之間不得露出空隙');
});

test('D梯斜扶手依真正梯段接到上下平台，上端仍高於腳底',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);const rails=[];
 model.getObjectByName('西南D梯封閉入口').traverse(o=>{if(o.isMesh&&o.name==='樓梯連續扶手')rails.push(o);});
 assert.equal(rails.length,2);const s=ATRIUM_STAIRS[0];
 for(const rail of rails){
  const a=new THREE.Vector3(0,0,-.5).applyMatrix4(rail.matrixWorld),b=new THREE.Vector3(0,0,.5).applyMatrix4(rail.matrixWorld);
  assert.ok(Math.abs(a.y-s.a.y-1.1)<.001,'下端扶手依梯段高度');
  assert.ok(Math.abs(b.y-s.b.y-1.1)<.001,'上端扶手不能降到腳邊');
  assert.ok(Math.abs(a.z-s.a.z)<.001&&Math.abs(b.z-s.b.z)<.001,'扶手端點與實際梯段對齊');
 }
});

test('D梯扶手柱從踏面連到斜扶手，中間沒有懸空接縫',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);const posts=[];
 model.getObjectByName('西南D梯封閉入口').traverse(o=>{if(o.isMesh&&o.name==='樓梯扶手柱')posts.push(o);});
 const s=ATRIUM_STAIRS[0];assert.ok(posts.length>0);
 for(const post of posts){
  const p=post.getWorldPosition(new THREE.Vector3()),t=(p.z-s.a.z)/(s.b.z-s.a.z),foot=s.a.y+(s.b.y-s.a.y)*t,b=new THREE.Box3().setFromObject(post);
  assert.ok(b.min.y<=foot+.01,'柱腳不能離開踏面');
  assert.ok(b.max.y>=foot+1.1-.02,'扶手柱必須接到斜扶手');
 }
});

test('D梯上半段不能從兩側穿過洞口護欄或被吸到3F',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),s=ATRIUM_STAIRS[0];
 for(const z of [22.5,22.9])for(const side of [-1,1]){
  const y=s.a.y+(s.b.y-s.a.y)*(z-s.a.z)/(s.b.z-s.a.z),p={x:s.a.x,y,z};let vy=0;
  for(let i=0;i<70;i++){
   const before={...p};p.x+=side*.05;nav.clampAtrium(p);vy-=18/60;p.y+=vy/60;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}
   assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<=.051,'側移不能跨護欄瞬移');
   assert.ok(Math.abs(p.y-y)<.03,'側移不能升到3F');
  }
  assert.ok(Math.abs(p.x-s.a.x)<=s.width/2-.4+.001,'身體半徑留在梯內');
 }
});

test('實際房間邊界與碰撞下可走過D梯上端平台，再沿原梯下樓',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const {INTERIOR_BOUNDS:b,interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const {resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 setActiveColliders(interiorColliders());setRoomClamp(p=>{p.x=Math.max(b.x0,Math.min(b.x1,p.x));p.z=Math.max(b.z0,Math.min(b.z1,p.z));nav.clampAtrium(p);});
 try{for(const dt of [1/60,.05]){
  const p={x:-19,y:0,z:17.1};let vy=0;
  const walk=(x,z)=>{for(let i=0;i<1000;i++){
   const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.12)return;
   const step=Math.min(d,4.6*dt);p.x+=dx/d*step;p.z+=dz/d*step;resolve(p);vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}
  }assert.fail('無法走到'+JSON.stringify({x,z,p,dt}));};
  walk(-19,23.5);walk(-16,23.5);assert.ok(Math.abs(p.y-4.5)<.03);
  walk(-19,23.5);walk(-19,17.1);
  for(let i=0;i<60;i++){vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}
  assert.ok(Math.abs(p.y)<.02,'原路落回2F');
 }}finally{setRoomClamp(null);setActiveColliders([]);}
});
