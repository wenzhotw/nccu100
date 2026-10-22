import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {resolve,setActiveColliders,setRoomClamp} from '../src/core/collision.js';
const layout=await import('../src/world/buildings/dah-hsian/interior-layout.js').catch(()=>({}));
test('從2F雙門望出去先看到同層鋪磚門廊、柱列與外欄杆，不是門檻外草坪',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const deck=m.getObjectByName('入口外2F鋪磚平台');assert.ok(deck);
 const b=new THREE.Box3().setFromObject(deck);assert.ok(b.max.x>=-22.8&&b.min.x<-35&&Math.abs(b.max.y)<.03);
 const ray=new THREE.Raycaster(new THREE.Vector3(-29,1.6,-12),new THREE.Vector3(0,-1,0));
 const first=ray.intersectObject(m,true).find(h=>h.object.material.side!==THREE.BackSide);assert.equal(first.object.name,'入口外2F鋪磚平台');
 assert.ok(m.getObjectByName('門廊外柱列'));assert.ok(m.getObjectByName('門廊外欄杆'));
});
test('2樓入口、大廳、閘門、挑空及窗邊閱覽有連通動線',()=>{
  assert.equal(typeof layout.interiorColliders,'function');
  setActiveColliders(layout.interiorColliders());
  try {
    const route=[[-21,-12],[-16,-12],[-14,-10],[-12.6,-9],[-12.6,-3],[-12,3],[-9,8],[-9,18],[4,20]];
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
    for(const [x,z]of [[-8,-5],[-13.4,-6.3],[-3.2,-6],[3,-8],[7,22]]){
      const p={x,z,y:0};resolve(p);assert.ok(Math.hypot(p.x-x,p.z-z)>.15,`物件應阻擋 ${x},${z}`);
    }
    const p={x:-12.6,z:-6.3,y:0};resolve(p);assert.deepEqual(p,{x:-12.6,z:-6.3,y:0},'閘門開口可穿過');
  }finally{setActiveColliders([]);}
});
test('跳躍時仍不能穿入櫃台後方高木柱，椅子有可見阻擋',()=>{
  setActiveColliders(layout.interiorColliders());
  try {
    for(const [x,z,y]of [[-7.3,-6.8,1.5],[7,20.8,0]]){
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
test('西南D梯開放上樓，旁邊2樓閱覽通道保持可走',()=>{
 setActiveColliders(layout.interiorColliders());
 try{
  const p={x:-19,y:0,z:18};resolve(p);assert.deepEqual(p,{x:-19,y:0,z:18},'新核可範圍開放D梯起點');
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
 m.traverse(o=>{if(o.name==='中庭可行走梯級')steps.push(new THREE.Box3().setFromObject(o));if(!o.isInstancedMesh||!o.name.startsWith('中庭批次'))return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(p,q,s);const b=new THREE.Box3().setFromCenterAndSize(p.clone(),s.clone());if(Math.abs(s.x-1.3)<.001&&Math.abs(s.y-.13)<.001)steps.push(b);if(Math.abs(s.x-2.2)<.001&&Math.abs(s.y-.1)<.001&&Math.abs(s.z-1.8)<.001)tables.push(b);}});
 assert.ok(steps.length>0&&tables.length>0,'真模型中需同時存在階板與東側桌位');
 for(const step of steps)assert.ok(!tables.some(t=>t.intersectsBox(step)),'梯槽內不可保留穿過階板的木桌');
});

test('感恩牆在入口對側的大廳側牆，沿南北方向延伸，入口眼高可以看見',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const m=createInteriorModel();m.updateMatrixWorld(true);
 const wall=m.getObjectByName('感恩牆基底'),b=new THREE.Box3().setFromObject(wall);
 assert.ok(b.max.x-b.min.x<.3&&b.max.z-b.min.z>9,'不能再把木牆放在北側採光窗前');
 const ray=new THREE.Raycaster(new THREE.Vector3(-15,1.6,-13),new THREE.Vector3(1,0,0));
 const hit=ray.intersectObject(wall,true).find(h=>h.object.material.side!==THREE.BackSide);
 assert.equal(hit?.object.name,'感恩牆基底','站在門廳前看向大廳，先看見側牆而非後方設備');
});

test('入口旁廁所前廊可由大廳抵達，實體隔間擋住角色，門位於隱私牆後',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 assert.ok(m.getObjectByName('廁所東側隱私牆'),'入口旁不能再是空大廳');
 setActiveColliders(layout.interiorColliders());
 try{
  for(let x=-14;x>=-20.4;x-=.1){const p={x,y:0,z:-16.2};resolve(p);assert.ok(Math.abs(p.x-x)<.01&&Math.abs(p.z+16.2)<.01,'公開前廊能走到廁所門前');}
  const p={x:-19,y:0,z:-20};resolve(p);assert.ok(Math.hypot(p.x+19,p.z+20)>.2,'廁所未開放隔間不可穿模');
 }finally{setActiveColliders([]);}
 for(const name of ['女廁入口門','男廁入口門'])assert.ok(m.getObjectByName(name),'需有可辨識廁所入口');
});

test('預約取書區在櫃台東側，感恩牆前方恢復大廳視線及通路',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel(k=>new THREE.MeshBasicMaterial({transparent:k==='clear',side:k==='outline'?THREE.BackSide:THREE.FrontSide}));m.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(-15,1.6,-13),new THREE.Vector3(1,0,0));
 const hit=ray.intersectObject(m,true).find(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide);
 assert.ok(hit&&hit.point.x>-3&&hit.object.parent===m.getObjectByName('大廳側面感恩牆'),'大廳與感恩牆中間不可誤放取書櫃及玻璃隔間');
 setActiveColliders(layout.interiorColliders());
 try{for(let x=-14;x<-3;x+=.2){const p={x,y:0,z:-13};resolve(p);assert.ok(Math.hypot(p.x-x,p.z+13)<.01,'感恩牆前可走近');}}
 finally{setActiveColliders([]);}
 const reserve=layout.FURNITURE.find(o=>o.kind==='lockers');assert.ok(reserve.z>-10&&reserve.x>-5,'取書櫃應在櫃台旁房間');
});

test('風除室兩道玻璃門都有門片、上亮窗及側框，開啟中央通道可穿過而側玻璃會擋人',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const doors=m.children.filter(o=>o.name==='風除室玻璃門');assert.equal(doors.length,2,'不能只留一組空門框');
 for(const g of doors){
  assert.ok(g.children.some(o=>o.name==='門上亮窗')&&g.children.some(o=>o.name==='開啟玻璃門片')&&g.children.some(o=>o.name==='門片把手'));
 }
 setActiveColliders(layout.interiorColliders());
 try{
  for(let x=-22.4;x<-18;x+=.1){const p={x,y:0,z:-12};resolve(p);assert.ok(Math.hypot(p.x-x,p.z+12)<.01,'兩道門中央通道須連通');}
  for(const x of [-22.78,-19.2]){const p={x,y:0,z:-14};resolve(p);assert.ok(Math.hypot(p.x-x,p.z+14)>.15,'門側玻璃須與可見門片同步阻擋');}
 }finally{setActiveColliders([]);}
});

test('入口南側保留B梯及還書室量體，閘門接櫃台前方，主動線繞過而非穿過樓梯',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 assert.ok(m.getObjectByName('入口南側B梯與還書室'),'不能把入口旁樓梯畫成開放大廳');
 const gate=layout.FURNITURE.find(o=>o.kind==='gate');assert.ok(gate.z<-5,'閘門須在櫃台前端，而非後移到中庭入口');
 const counter=layout.FURNITURE.find(o=>o.kind==='counter'),glass=layout.WALLS.find(o=>o.kind==='clear');
 assert.ok(counter.x+counter.w/2<glass.x-glass.w/2,'櫃台與預約區隔玻璃不能穿模');
 setActiveColliders(layout.interiorColliders());
 try{const p={x:-18,y:0,z:-4};resolve(p);assert.ok(Math.hypot(p.x+18,p.z+4)>.2,'B梯量體須擋人');}
 finally{setActiveColliders([]);}
});

test('感恩牆左端的大廳採光窗保持通透，預約室玻璃門有開口且不能繞入感恩牆後機房',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel(k=>new THREE.MeshBasicMaterial({transparent:k==='clear',side:k==='outline'?THREE.BackSide:THREE.FrontSide}));m.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(-10,1.6,-20),new THREE.Vector3(0,0,-1),0,4);
 assert.ok(!ray.intersectObject(m,true).some(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide),'大廳北窗不可仍是感恩牆後的水泥端牆');
 assert.ok(m.getObjectByName('預約室玻璃門'),'取書室不能只有一張透明板');
 setActiveColliders(layout.interiorColliders());
 try{
  const open={x:-5.3,y:0,z:-1.6};resolve(open);assert.deepEqual(open,{x:-5.3,y:0,z:-1.6},'取書室門前可通行');
  const rear={x:-1,y:0,z:-17};resolve(rear);assert.ok(Math.hypot(rear.x+1,rear.z+17)>.15,'機房空間不可繞入');
 }finally{setActiveColliders([]);}
});

test('大廳採光窗邊有長凳且保留窗前通行，角色不能走穿長凳',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const benches=layout.FURNITURE.filter(o=>o.kind==='bench');assert.ok(benches.length>1,'實景窗邊不應是空白牆');
 setActiveColliders(layout.interiorColliders());
 try{for(const o of benches){const p={x:o.x,y:0,z:o.z};resolve(p);assert.ok(Math.hypot(p.x-o.x,p.z-o.z)>.15);assert.ok(m.getObjectByName(o.name),'長凳須可見');}}
 finally{setActiveColliders([]);}
});

test('櫃台資訊螢幕露在木柱朝大廳的表面，不可埋入木柱',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const core=new THREE.Box3().setFromObject(m.getObjectByName('木色核心')),screen=new THREE.Box3().setFromObject(m.getObjectByName('櫃台資訊螢幕'));
 assert.ok(screen.max.x<core.min.x,'站在大廳看得見螢幕，而不是空白木柱');
});

test('廁所前廊西端不能留下有碰撞卻無玻璃的缺口，鏡頭也須擋在外牆內',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{collectCameraOccluders}=await import('../src/systems/camera-occluders.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(-20.3,1.6,-16.2),new THREE.Vector3(-1,0,0),0,4);
 const known=new THREE.Mesh(new THREE.BoxGeometry(.2,4,3));known.position.set(-22.9,2,-16.2);known.updateMatrixWorld(true);assert.ok(ray.intersectObject(known).length,'先確認射線命中已知外牆');
 assert.ok(ray.intersectObject(m,true).some(h=>h.object.material.side!==THREE.BackSide),'玩家被阻擋的位置須有可見玻璃或牆');
 assert.ok(ray.intersectObjects(collectCameraOccluders(m),false).length,'鏡頭不能穿出廁所前廊外側');
});


test('中庭屋頂以灰色折板長帶為主，採光限在狹長線窗而非滿版藍玻璃格',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const opaque=[],slits=[];m.traverse(o=>{if(o.name==='屋頂不透明折板')opaque.push(o);if(o.name==='屋頂狹長採光')slits.push(o);});
 assert.ok(opaque.length>=8&&slits.length>=8,'來源AJ06與建築方照片中的重複長帶');
 const covered=opaque.reduce((sum,o)=>sum+o.scale.x*o.scale.z,0),lit=slits.reduce((sum,o)=>sum+o.scale.x*o.scale.z,0);
 assert.ok(covered>lit*3,'主要屋面為灰色不透明帶，不是均勻玻璃網格');
 const ray=new THREE.Raycaster(new THREE.Vector3(-10,1.6,-9),new THREE.Vector3(0,1,0),0,40);
 assert.ok(ray.intersectObjects(opaque).length,'站在2F向上可見實際有面的折板');
});
test('上層普通鏡頭採近身站立視角，保留中庭天冠，其他房間不受影響',async()=>{
 const view=await import('../src/systems/room-view.js');assert.equal(typeof view.roomCameraAtHeight,'function');
 const base={maxDist:6,lookUpHeight:6.5,upper:{fromY:3.9,maxDist:3.2,eyeOffset:1.65,aimOffset:.5,lookUpHeight:1.8}};
 assert.equal(view.roomCameraAtHeight(base,0),base);assert.equal(view.roomCameraAtHeight(null,23),null);
 const config=view.roomCameraAtHeight(base,23.1),target=new THREE.Vector3(0,24,17.4),dir=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(55,1.6,.25,1200);
 view.roomOrbitDirection(dir,0,.28,target,config.maxDist,config);camera.position.copy(target).addScaledVector(dir,config.maxDist);view.frameRoomCamera(camera,target,.28,config);camera.updateMatrixWorld();
 assert.ok(camera.position.y>=24.75&&camera.position.y<25,'真實站立眼高，不逼近樓上板底');const crown=new THREE.Vector3(0,28.8,-6).project(camera);assert.ok(crown.y<1&&crown.y>-1,'天冠在一般視野內');
});
