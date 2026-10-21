import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {resolve,setActiveColliders,setRoomClamp} from '../src/core/collision.js';
const layout=await import('../src/world/buildings/dah-hsian/interior-layout.js').catch(()=>({}));
test('2樓入口、大廳、閘門、挑空及窗邊閱覽有連通動線',()=>{
  assert.equal(typeof layout.interiorColliders,'function');
  setActiveColliders(layout.interiorColliders());
  try {
    const route=[[-21,-12],[-16,-12],[-16,-5],[-12,-3],[-12,3],[-9,8],[-9,18],[4,20]];
    for(let i=1;i<route.length;i++)for(let t=0;t<=1;t+=.02){
      const x=route[i-1][0]+(route[i][0]-route[i-1][0])*t,z=route[i-1][1]+(route[i][1]-route[i-1][1])*t,p={x,y:0,z};resolve(p);
      assert.ok(Math.hypot(p.x-x,p.z-z)<.01,`公開通道不被封住 ${x},${z}`);
    }
  }finally{setActiveColliders([]);setRoomClamp(null);}
});
test('室內可見樓板與腳底一致，入口通道及挑空頭頂沒有低天花板封住',async()=>{
  const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js').catch(()=>({}));
  assert.equal(typeof createInteriorModel,'function');
  const m=createInteriorModel();m.updateMatrixWorld(true);
  const plane=new THREE.Mesh(new THREE.BoxGeometry(2,.2,2));plane.position.y=-.1;plane.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0));
  assert.ok(Math.abs(ray.intersectObject(plane)[0].point.y)<1e-6,'已知0地板校準');
  for(const [x,z]of [[-21,-12],[-12,-2],[-9,8],[4,20]]){
    ray.ray.origin.set(x,1.4,z);
    const hit=ray.intersectObject(m,true).find(h=>h.object.material.side!==THREE.BackSide);
    assert.ok(hit&&Math.abs(hit.point.y)<.03,`可見地板 ${x},${z} ${hit?.point.y}`);
  }
  ray.ray.origin.set(-9,1.5,8);ray.ray.direction.set(0,1,0);
  const ceiling=ray.intersectObject(m,true).find(h=>h.object.material.side!==THREE.BackSide);
  assert.ok(!ceiling||ceiling.distance>12,'挑空中央不能加普通低天花板');
});
test('2樓桌椅、閘門機柱、弧形櫃台與員工區實際擋人，閘門通道可走',()=>{
  setActiveColliders(layout.interiorColliders());
  try {
    for(const [x,z]of [[-7,-5],[-13.5,-2],[-4,-17],[3,-8],[7,22]]){
      const p={x,z,y:0};resolve(p);assert.ok(Math.hypot(p.x-x,p.z-z)>.15,`物件應阻擋 ${x},${z}`);
    }
    const p={x:-12,z:-2,y:0};resolve(p);assert.deepEqual(p,{x:-12,z:-2,y:0},'閘門開口可穿過');
  }finally{setActiveColliders([]);}
});
test('跳躍時仍不能穿入櫃台後方高木柱，椅子有可見阻擋',()=>{
  setActiveColliders(layout.interiorColliders());
  try {
    for(const [x,z,y]of [[-5.8,-7.4,1.5],[7,20.8,0]]){
      const p={x,z,y};resolve(p);assert.ok(Math.hypot(p.x-x,p.z-z)>.15);
    }
  }finally{setActiveColliders([]);}
});
test('正常仰視不能穿過大廳薄天花，細柱也能擋鏡頭',async()=>{
  const {collectCameraOccluders}=await import('../src/systems/camera-occluders.js').catch(()=>({}));
  assert.equal(typeof collectCameraOccluders,'function');
  const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
  const m=createInteriorModel();m.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(-16,.9,-12),new THREE.Vector3(0,Math.sin(1.15),Math.cos(1.15)),0,6);
  const hit=ray.intersectObjects(collectCameraOccluders(m),false)[0];
  assert.ok(hit&&hit.distance<4,'正式鏡頭遮擋清單必須命中天花或樑');
  ray.ray.origin.set(-17,.9,0);ray.ray.direction.set(1,0,0);
  assert.ok(ray.intersectObjects(collectCameraOccluders(m),false).some(h=>h.object.name==='2樓清水模柱'),'細柱不能因寬度不足被漏掉');
  const ordinary=new THREE.Group();ordinary.add(new THREE.Mesh(new THREE.BoxGeometry(2,.18,2)),new THREE.Mesh(new THREE.BoxGeometry(2,1,2)));ordinary.updateMatrixWorld(true);
  assert.equal(collectCameraOccluders(ordinary).length,1,'未標記的舊場景保持原篩選規則');
});
test('未開放上樓梯的可見欄門阻擋，不影響旁邊2樓通道',()=>{
  setActiveColliders(layout.interiorColliders());
  try{
    const gate={x:18,z:17.5,y:0};resolve(gate);assert.ok(gate.z<17.11,'不能走穿欄門到未做樓層');
    const bypass={x:15,z:20,y:0};resolve(bypass);assert.deepEqual(bypass,{x:15,z:20,y:0},'窗邊通道可走');
  }finally{setActiveColliders([]);}
});
test('預約區透明玻璃不能被不透明描邊殼整面遮住',async()=>{
  const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
  const m=createInteriorModel(kind=>new THREE.MeshBasicMaterial({transparent:kind==='clear',opacity:kind==='clear'?.22:1,side:kind==='outline'?THREE.BackSide:THREE.FrontSide}));
  const glass=[];m.traverse(o=>{if(o.isMesh&&o.material.transparent)glass.push(o);});
  assert.ok(glass.length>0);
  assert.ok(glass.every(o=>!o.children.some(c=>c.isMesh&&!c.material.transparent)),'透明面不可套實心殼');
});
test('藍地毯與下方樓板不共面，兩塊地毯接縫不重疊',async()=>{
  const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
  const surface=name=>new THREE.Box3().setFromObject(m.getObjectByName(name));
  const floor=surface('2樓地板'),atrium=surface('挑空區藍地毯'),reading=surface('閱覽區藍地毯');
  assert.ok(atrium.max.y-floor.max.y>.004&&reading.max.y-floor.max.y>.004,'不可與基底樓板Z-fighting');
  assert.ok(atrium.max.z<=reading.min.z+.00001,'兩塊毯不能互相重疊');
});
