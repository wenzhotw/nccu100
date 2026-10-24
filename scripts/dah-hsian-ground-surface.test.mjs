import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGround} from '../src/world/buildings/dah-hsian/model.js';
import {groundHeight} from '../src/world/buildings/dah-hsian/layout.js';
function calibratedRay(){
 const ray=new THREE.Raycaster(new THREE.Vector3(0,2,0),new THREE.Vector3(0,-1,0));
 const known=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));known.updateMatrixWorld();
 assert.equal(ray.intersectObject(known)[0]?.point.y,.5);ray.ray.origin.x=2;assert.equal(ray.intersectObject(known).length,0);return ray;
}
test('西側坡道與低處草皮的交界不以斜草面蓋住角色行走高度',()=>{
 const ray=calibratedRay(),ground=createGround();ground.updateMatrixWorld(true);
 for(const x of [-29.99,-29,-28.01])for(const z of [1,14,27.99]){
  ray.ray.origin.set(x,10,z);const hit=ray.intersectObject(ground,true)[0];
  assert.ok(hit,'草皮支撐不能缺面');assert.ok(Math.abs(hit.point.y-groundHeight(x,z))<.03,JSON.stringify({x,z,visible:hit.point.y,feet:groundHeight(x,z)}));
 }
});

test('老樹廣場外緣的草坡銜接不形成角色浮空的低陷帶',async()=>{
 const {createOutdoorModel}=await import('../src/world/buildings/dah-hsian/model.js');
 const ray=calibratedRay(),model=createOutdoorModel();model.updateMatrixWorld(true);
 const supports=[model.getObjectByName('達賢地面'),model.getObjectByName('老樹廣場弧形階梯'),model.getObjectByName('老樹樹穴')];
 for(const [x,z]of [[43,76.5],[29.11208,64.76248],[56.88792,64.76248],[53.01263,72.01263],[33,76]]){
  ray.ray.origin.set(x,10,z);const hit=ray.intersectObjects(supports,true)[0];
  assert.ok(hit,'廣場外草坡不能缺面');assert.ok(Math.abs(hit.point.y-groundHeight(x,z))<.08,JSON.stringify({x,z,visible:hit.point.y,feet:groundHeight(x,z)}));
 }
});

test('弧階轉角的腳下高度與真正踏面一致，不埋入較高一級',async()=>{
 const {createOutdoorModel}=await import('../src/world/buildings/dah-hsian/model.js');
 const ray=calibratedRay(),model=createOutdoorModel();model.updateMatrixWorld(true);
 const stairs=model.getObjectByName('老樹廣場弧形階梯');
 for(const [x,z]of [[53.98479514051618,64.18501160658063],[50.91959594928933,69.91959594928933],[47.286054442489004,72.3474507641264]]){
  ray.ray.origin.set(x,10,z);const hit=ray.intersectObject(stairs)[0];assert.ok(hit);
  assert.ok(Math.abs(hit.point.y-groundHeight(x,z))<.03,JSON.stringify({x,z,tread:hit.point.y,feet:groundHeight(x,z)}));
 }
});

test('弧階接縫不把腳底抬到該位置沒有的高一級踏面',async()=>{
 const {createOutdoorModel}=await import('../src/world/buildings/dah-hsian/model.js');
 const ray=calibratedRay(),model=createOutdoorModel();model.updateMatrixWorld(true);
 for(const [x,z]of [[53.34745076412641,66.286054442489],[52.3124596577885,68.22238660981954],[49.222386609819544,71.31245965778851]]){
  ray.ray.origin.set(x,10,z);const hit=ray.intersectObject(model.getObjectByName('老樹廣場弧形階梯'))[0];assert.ok(hit);
  assert.ok(Math.abs(hit.point.y-groundHeight(x,z))<.03,JSON.stringify({x,z,tread:hit.point.y,feet:groundHeight(x,z)}));
 }
});

test('草坡區塊的確切交界仍有可見地面支撐，不留下細裂縫',()=>{
 const ray=calibratedRay(),ground=createGround();ground.updateMatrixWorld(true);
 for(const [x,z]of [[-30,14],[30,14],[-20,28],[20,28]]){
  ray.ray.origin.set(x,10,z);const hit=ray.intersectObject(ground,true)[0];
  assert.ok(hit,JSON.stringify({x,z,reason:'交界沒有地面'}));
 }
});

test('廣場北側轉角的草坡可見高度與角色腳底一致',()=>{
 const ray=calibratedRay(),ground=createGround();ground.updateMatrixWorld(true);
 for(const [x,z]of [[26,61.9],[60,61.9],[26,61.5]]){
  ray.ray.origin.set(x,10,z);const hit=ray.intersectObject(ground,true)[0];assert.ok(hit);
  assert.ok(Math.abs(hit.point.y-groundHeight(x,z))<.04,JSON.stringify({x,z,visible:hit.point.y,feet:groundHeight(x,z)}));
 }
});

test('湖岸步道保留照片中的草縫石板，而非連續整片鋪面',async()=>{
 const {createOutdoorModel}=await import('../src/world/buildings/dah-hsian/model.js');
 const m=createOutdoorModel();m.updateMatrixWorld(true);const tiles=m.getObjectByName('湖岸草縫石板步道');assert.ok(tiles,'湖岸步道缺少分離石板');
 const ray=calibratedRay();let stones=0,gaps=0;
 for(let x=33.8;x<36.2;x+=.12)for(let z=-12;z<-8;z+=.12){ray.ray.origin.set(x,10,z);const hit=ray.intersectObject(tiles)[0];if(hit){stones++;assert.ok(Math.abs(hit.point.y-groundHeight(x,z))<.03,'石板須貼地');}else gaps++;}
 assert.ok(stones>0&&gaps>0,'步道須同時有可見石板和草縫');
});
test('小屋與湖邊步道有照片中的六角鋪面島，貼住草地並避開水面',async()=>{
 const {createOutdoorModel}=await import('../src/world/buildings/dah-hsian/model.js'),{POND,insidePolygon}=await import('../src/world/buildings/dah-hsian/layout.js');
 const m=createOutdoorModel();m.updateMatrixWorld(true);const islands=m.getObjectByName('湖岸六角草縫鋪面島');assert.ok(islands,'source house-ground/lakewalk hexagonal paving islands');
 const ray=calibratedRay(),p=islands.geometry.getAttribute('position');assert.ok(p.count>100);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);assert.ok(!insidePolygon(x,z,POND),'paving must not float on the lake');assert.ok(Math.abs(y-groundHeight(x,z))<.03,'each hex corner follows actual grass height');
 }
 const centres=islands.userData.tileCentres;assert.ok(centres.length>=12,'actual separate six-corner units');
 for(const [x,z]of centres.slice(0,12)){ray.ray.origin.set(x,10,z);assert.ok(ray.intersectObject(islands).length,'actual visible hex face, not metadata only');}
});
