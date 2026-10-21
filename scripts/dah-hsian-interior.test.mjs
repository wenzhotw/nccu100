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
test('2樓仰視能看見有深度的層退藏書牆，上層書牆不能只有空欄杆',async()=>{
  const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
  const m=createInteriorModel(kind=>new THREE.MeshBasicMaterial({transparent:kind==='clear',opacity:kind==='clear'?.2:1,side:kind==='outline'?THREE.BackSide:THREE.FrontSide}));m.updateMatrixWorld(true);
  // 已知牆面校準：水平射線會在x=3.9命中，不把空輸出當作通透。
  const wall=new THREE.Mesh(new THREE.BoxGeometry(.2,3,4));wall.position.set(4,9,8);wall.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(-12,9,8),new THREE.Vector3(1,0,0));
  assert.ok(Math.abs(ray.intersectObject(wall)[0].point.x-3.9)<.00001);
  const shelves=[];m.traverse(o=>{if(o.isMesh&&o.userData.atriumBooks)shelves.push(o);});
  assert.ok(shelves.length>0,'需有從2樓可見的實體書牆，不只迴廊細框');
  ray.ray.origin.set(-12,1.5,8);ray.ray.direction.set(17,11.1,0).normalize();
  assert.ok(ray.intersectObjects(shelves,false).length>0,'2樓眼高仰視須命中上層藏書，而非空白背景');
  const fronts=[];m.traverse(o=>{if(o.name==='東側閱讀平台')fronts.push(new THREE.Box3().setFromObject(o));});
  fronts.sort((a,b)=>a.min.y-b.min.y);
  assert.ok(fronts.length>=4&&fronts.every((b,i)=>i===0||b.min.x>fronts[i-1].min.x+.4),'平台需逐層退後，形成真實可見深度');
});
test('2樓窗邊眼高視線能穿過玻璃看見露台與植栽，不被實心牆封住',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const m=createInteriorModel(kind=>new THREE.MeshBasicMaterial({transparent:kind==='clear',opacity:kind==='clear'?.2:1,side:kind==='outline'?THREE.BackSide:THREE.FrontSide}));m.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(4,1.5,21),new THREE.Vector3(0,0,1),0,4);
 assert.ok(!ray.intersectObject(m,true).some(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide),'窗框以外的眼高玻璃不可是實心藍牆');
 const landscape=m.getObjectByName('窗外露台與植栽');assert.ok(landscape,'窗外需有可辨識的露台與綠景');
});
test('窗邊照片中的西南側樓梯可辨識且封閉，旁邊2樓閱覽通道保持可走',()=>{
 setActiveColliders(layout.interiorColliders());
 try{
  const p={x:-19,y:0,z:18};resolve(p);assert.ok(p.z<17.2,'西南D梯不能是可穿越或可登上未開樓層的空模型');
  const beside={x:-15,y:0,z:19};resolve(beside);assert.deepEqual(beside,{x:-15,y:0,z:19});
 }finally{setActiveColliders([]);}
});
test('達賢2樓可用原有拖曳仰視上層書牆，其他場景鏡頭取景不變',async()=>{
 const {frameRoomCamera,roomOrbitDirection}=await import('../src/systems/room-view.js').catch(()=>({}));
 assert.equal(typeof frameRoomCamera,'function');
 const camera=new THREE.PerspectiveCamera(55,1.6,.25,1200),target=new THREE.Vector3(0,.9,0),book=new THREE.Vector3(0,12,-12);
 camera.position.set(0,.6,6);camera.lookAt(target);camera.updateMatrixWorld();
 assert.ok(Math.abs(book.clone().project(camera).y)>1,'先校準原鏡頭確實看不到高處目標');
 const config={lookUpHeight:6.5,eyeFloor:1.4},dir=new THREE.Vector3();roomOrbitDirection(dir,0,-.05,target,6,config);camera.position.copy(target).addScaledVector(dir,6);
 frameRoomCamera(camera,target,-.05,config);camera.updateMatrixWorld();
 assert.ok(Math.abs(book.clone().project(camera).y)<1,'站在地面仰視時，書牆應進入真正相機畫幅');
 assert.equal(camera.position.y,1.4,'相機留在站立眼高');
 const plain=new THREE.PerspectiveCamera(55,1.6,.25,1200);plain.position.set(0,.6,6);frameRoomCamera(plain,target,-.05,null);plain.updateMatrixWorld();
 assert.ok(Math.abs(book.clone().project(plain).y)>1,'未啟用的校園／房間仍沿原取景');
});
test('西南樓梯實際幾何不與窗邊閱讀桌椅穿模',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const stair=m.getObjectByName('西南D梯封閉入口'),steps=stair.children.filter(o=>o.name==='可見上樓階梯').map(o=>new THREE.Box3().setFromObject(o));
 assert.ok(steps.length>0);
 const known=new THREE.Box3(new THREE.Vector3(-20,0,17.4),new THREE.Vector3(-19,.2,17.6));assert.ok(steps.some(b=>b.intersectsBox(known)),'先校準第一階的已知位置');
 for(const g of m.children.filter(o=>['窗邊閱讀桌','窗邊閱讀椅'].includes(o.name))){
  const b=new THREE.Box3().setFromObject(g);assert.ok(!steps.some(s=>s.intersectsBox(b)),`${g.name} x=${g.position.x}不可穿入實體階梯`);
 }
});
test('2樓仰視取景須沿實際眼高路徑避開樓梯與展示框，不能事後抬入實體',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const {collectCameraOccluders}=await import('../src/systems/camera-occluders.js');
 const view=await import('../src/systems/room-view.js'),m=createInteriorModel();m.updateMatrixWorld(true);assert.equal(typeof view.roomOrbitDirection,'function');
 for(const [x,z,yaw,name]of [[-14,19,4.8,'斜向樓梯底板'],[-1,10,3,'展示螢幕黑框']]){
  const target=new THREE.Vector3(x,.9,z),dir=new THREE.Vector3(Math.sin(yaw)*Math.cos(-.05),Math.sin(-.05),Math.cos(yaw)*Math.cos(-.05));
  const config={lookUpHeight:6.5,eyeFloor:1.4};view.roomOrbitDirection(dir,yaw,-.05,target,6,config);
  const hit=new THREE.Raycaster(target,dir,0,6.6).intersectObjects(collectCameraOccluders(m),false)[0],d=hit?Math.max(.9,hit.distance-.45):6;
  const camera=new THREE.PerspectiveCamera(55,1.6,.25,1200);camera.position.copy(target).addScaledVector(dir,d);view.frameRoomCamera(camera,target,-.05,config);
  const mesh=m.getObjectByName(name);mesh.geometry.computeBoundingBox();
  assert.ok(!mesh.geometry.boundingBox.containsPoint(mesh.worldToLocal(camera.position.clone())),`合法站位${x},${z}鏡頭不可進入${name}`);
 }
});
test('實景中庭金色圖樣中央保持開放，不被誤放的體驗桌佔住',()=>{
 setActiveColliders(layout.interiorColliders());
 try{for(const [x,z]of [[-13,9],[-11.5,8],[-10,6]]){const p={x,y:0,z};resolve(p);assert.deepEqual(p,{x,y:0,z},'2F地面照片中的中庭中央可站立與穿行');}}
 finally{setActiveColliders([]);}
});
test('中庭天窗分格保留透光開口，2樓仰視不被整塊實心屋頂蓋住',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(-10,18,7),new THREE.Vector3(0,1,0),0,6);
 assert.ok(!ray.intersectObject(m,true).some(h=>h.object.material.side!==THREE.BackSide&&h.object.name==='中庭高位天頂'),'天窗分格間需有真實開口');
 const frame=[];m.traverse(o=>{if(o.name==='天窗斜撐')frame.push(o);});
 assert.ok(frame.some(o=>Math.abs(o.rotation.z)>.25&&o.scale.y>.08),'需有可辨識的桁架深度與三角斜撐');
});
test('2樓可見的上層斜梯在相鄰平台間連接，保持在玩家可走高度之外',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const flights=[];m.traverse(o=>{if(o.name==='中庭上層斜梯底板')flights.push(o);});
 assert.ok(flights.length>=4,'書牆前需有參考照片可見的跨層斜梯');
 for(const flight of flights){
  const b=new THREE.Box3().setFromObject(flight);assert.ok(b.min.y>4&&b.max.y-b.min.y>2.7,'上層斜梯有真實升高，不落在2F通道');
 }
});
test('上層斜梯不能穿過東側閱讀桌，實際批次幾何保留梯槽',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const steps=[],tables=[],matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
 m.traverse(o=>{if(!o.isInstancedMesh||!o.name.startsWith('中庭批次'))return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(p,q,s);const b=new THREE.Box3().setFromCenterAndSize(p.clone(),s.clone());if(Math.abs(s.x-1.3)<.001&&Math.abs(s.y-.13)<.001)steps.push(b);if(Math.abs(s.x-1.05)<.001&&Math.abs(s.y-.1)<.001&&Math.abs(s.z-2.2)<.001)tables.push(b);}});
 assert.ok(steps.length>0&&tables.length>0,'真模型中需同時存在階板與東側桌位');
 for(const step of steps)assert.ok(!tables.some(t=>t.intersectsBox(step)),'梯槽內不可保留穿過階板的木桌');
});
