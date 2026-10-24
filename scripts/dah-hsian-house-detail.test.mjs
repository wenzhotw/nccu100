import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOutdoorModel} from '../src/world/buildings/dah-hsian/model.js';

test('小屋遠端窗列只建立一次，保留兩層實際窗面與框架',()=>{
 const house=createOutdoorModel().getObjectByName('湖濱悅讀小屋');assert.ok(house);let repeated=0,instances=0;
 const matrix=new THREE.Matrix4();house.traverse(o=>{if(!o.isInstancedMesh)return;const known=new Set();for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);const key=matrix.elements.map(v=>v.toFixed(6)).join(',');if(known.has(key))repeated++;known.add(key);instances++;}});
 assert.ok(instances>20,'完整窗框仍在');assert.equal(repeated,0,'端面不能因長邊迴圈重複兩次');
});

test('小屋遠端上下露台都有護欄和阻擋，不封閉下層草坪入口',async()=>{
 const {housePoint,keepOnLand}=await import('../src/world/buildings/dah-hsian/layout.js');
 const model=createOutdoorModel();model.updateMatrixWorld(true);
 const known=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));known.updateMatrixWorld();assert.ok(new THREE.Raycaster(new THREE.Vector3(0,2,0),new THREE.Vector3(0,-1,0)).intersectObject(known).length);
 for(const y of [.4,4]){
  const a=housePoint(12,0),b=housePoint(14,0),direction=new THREE.Vector3(b.x-a.x,0,b.z-a.z).normalize();
  const ray=new THREE.Raycaster(new THREE.Vector3(a.x,y+.94,a.z),direction,0,2);assert.ok(ray.intersectObject(model.getObjectByName('湖濱悅讀小屋'),true).length,'遠端必須有可見扶手');
  const q=housePoint(12.9,0),p={x:q.x,y,z:q.z};keepOnLand(p);assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>.1,'遠端必須擋住角色');
 }
 const open=housePoint(0,8.5),p={x:open.x,y:.4,z:open.z};keepOnLand(p);assert.ok(Math.hypot(p.x-open.x,p.z-open.z)<.01,'草坪側下層入口仍開放');
});
