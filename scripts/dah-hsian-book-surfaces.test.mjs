import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
test('減面書本仍保留正面、頂面與兩側厚度，不反轉北翼及東翼書脊',()=>{
 const known=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial());known.updateMatrixWorld();assert.equal(new THREE.Raycaster(new THREE.Vector3(-2,0,0),new THREE.Vector3(1,0,0),0,2).intersectObject(known)[0].point.x,-.5);
 const model=createInteriorModel(),books=[];model.traverse(o=>{if(o.isInstancedMesh&&o.userData.atriumBooks)books.push(o);});assert.equal(books.length,12);
 for(const b of books){const east=b.name.endsWith(':east'),mesh=new THREE.Mesh(b.geometry,new THREE.MeshBasicMaterial());mesh.updateMatrixWorld();
  for(const normal of (east?[[-1,0,0],[0,1,0],[0,0,1],[0,0,-1]]:[[0,0,1],[0,1,0],[1,0,0],[-1,0,0]])){
   const n=new THREE.Vector3(...normal),ray=new THREE.Raycaster(n.clone().multiplyScalar(2),n.clone().negate(),0,2);assert.ok(ray.intersectObject(mesh).length,'可見書面不得缺失 '+b.name+' '+normal);
  }
  const box=new THREE.Box3().setFromBufferAttribute(b.geometry.attributes.position);assert.deepEqual(box.min.toArray(),[-.5,-.5,-.5]);assert.deepEqual(box.max.toArray(),[.5,.5,.5]);
 }
});
