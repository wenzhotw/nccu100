import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createOutdoorModel} from '../src/world/buildings/dah-hsian/model.js';
import * as layout from '../src/world/buildings/dah-hsian/layout.js';
import {resolve,setActiveColliders,setRoomClamp} from '../src/core/collision.js';
test('湖岸細幹幼樹有三角支撐、疏葉與落地樹幹，實體阻擋但不封住步道',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);const row=m.getObjectByName('湖岸疏葉幼樹列');assert.ok(row,'實景湖畔的細幹支撐樹列不能只剩球狀灌木');
 const trees=row.children;assert.ok(trees.length>1);setActiveColliders(layout.coreColliders());setRoomClamp(layout.keepOnLand);
 try{for(const tree of trees){
  const trunk=tree.getObjectByName('湖岸幼樹樹幹'),bounds=new THREE.Box3().setFromObject(trunk),center=bounds.getCenter(new THREE.Vector3());
  assert.ok(Math.abs(bounds.min.y-layout.groundHeight(center.x,center.z))<.01,'樹幹須落地');assert.ok(bounds.max.y-bounds.min.y>3&&bounds.max.x-bounds.min.x<.3,'保留細幹而非矮粗球樹');assert.ok(!layout.insidePolygon(center.x,center.z,layout.POND),'植栽在陸地');
  const braces=[];tree.traverse(o=>{if(o.name==='幼樹三角支撐')braces.push(o);});assert.equal(braces.length,3);
  for(const brace of braces){const b=new THREE.Box3().setFromObject(brace);assert.ok(b.min.y>=layout.groundHeight(center.x,center.z)-.06&&b.min.y<.1,'支撐腳貼地');}
  const p={x:center.x,y:0,z:center.z};resolve(p);assert.ok(Math.hypot(p.x-center.x,p.z-center.z)>.4,'樹幹與角色不可互穿');
 }
 for(const [x,z]of [[27,-57],[30,-89],[35,-25],[20,-34]]){const p={x,y:0,z};resolve(p);assert.ok(Math.hypot(p.x-x,p.z-z)<.02,'原有公共路線保持可走');}
 }finally{setRoomClamp(null);setActiveColliders([]);}
});
