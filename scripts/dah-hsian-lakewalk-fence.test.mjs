import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as site from '../src/world/buildings/dah-hsian/layout.js';
import {createOutdoorModel} from '../src/world/buildings/dah-hsian/model.js';
test('湖邊步道林地側有連續近身護欄與相應阻擋，不能把欄杆誤圍在水邊',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);const fence=m.getObjectByName('湖邊林地側護欄');assert.ok(fence,'lakewalk2020 090/180/270 outer woodland fence');
 const known=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));known.updateMatrixWorld();assert.equal(new THREE.Raycaster(new THREE.Vector3(-2,0,0),new THREE.Vector3(1,0,0)).intersectObject(known)[0].distance,1.5);
 for(const [a,b]of site.LAKE_FOREST_RAILS){
  const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=(b[1]-a[1])/len,nz=-(b[0]-a[0])/len,h=site.groundHeight(x,z);
  assert.ok(!site.insidePolygon(x,z,site.POND),'forest-side railing lies on land');
  const hit=new THREE.Raycaster(new THREE.Vector3(x+nx*2,h+.94,z+nz*2),new THREE.Vector3(-nx,0,-nz),0,3).intersectObject(fence,true)[0];assert.ok(hit,'actual continuous top rail');
  const p={x,y:h,z};site.keepOnLand(p);assert.ok(Math.hypot(p.x-x,p.z-z)>=.48,'actual rail blocks the player body');
  const inside={x:x-nx*1.5,y:h,z:z-nz*1.5},before={...inside};site.keepOnLand(inside);assert.ok(Math.hypot(inside.x-before.x,inside.z-before.z)<.001,'pondward public walk stays open');
 }
 const water={x:0,y:site.SWIM_FOOT_Y,z:-75},before={...water};assert.ok(site.insidePolygon(water.x,water.z,site.POND));site.keepOnLand(water);assert.deepEqual(water,before,'forest fence must not become a blanket pond boundary');
});
