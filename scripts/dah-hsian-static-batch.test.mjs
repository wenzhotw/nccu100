import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {collectCameraOccluders} from '../src/systems/camera-occluders.js';
import {assertDahModelBudget} from './lib/dah-model-budget.mjs';
test('固定不透明構件合成少數真正繪製批次，同時保留原牆體的名稱、位置與相機射線',async()=>{
 const module=await import('../src/world/buildings/dah-hsian/static-batch.js');
 const root=new THREE.Group(),material=new THREE.MeshToonMaterial(),geometry=new THREE.BoxGeometry(2,2,2);
 for(let i=0;i<10;i++){const m=new THREE.Mesh(geometry,material);m.position.set(i*3,1,0);m.name='source-wall-'+i;m.userData.cameraOccluder=true;root.add(m);}root.updateMatrixWorld(true);
 const original=root.getObjectByName('source-wall-0'),before=new THREE.Raycaster(new THREE.Vector3(-2,1,0),new THREE.Vector3(1,0,0)).intersectObject(original)[0].distance;assert.equal(before,1,'calibrate real original wall');
 const result=module.batchDahStatic(root,{cellSize:64});assert.equal(result.sourceMeshes,10);assert.equal(result.renderBatches,1,'ten fixed boxes use one material submission');
 assert.equal(root.getObjectByName('source-wall-0'),original,'semantic geometry stays available');assert.equal(original.visible,false,'source geometry no longer renders twice');
 root.updateMatrixWorld(true);assert.equal(new THREE.Raycaster(new THREE.Vector3(-2,1,0),new THREE.Vector3(1,0,0)).intersectObject(original)[0].distance,before,'original exact surface still usable for raycasts');
 assert.ok(collectCameraOccluders(root).includes(original),'camera keeps the real wall');
 const render=root.getObjectByName('達賢靜態繪製合批');assert.ok(render?.isGroup);assert.equal(render.children[0].geometry.index.count/3,120,'all ten cubes retain their exact triangles');assert.equal(render.children[0].material,material,'same shader, material and shared lighting uniforms');assert.ok(!collectCameraOccluders(root).includes(render.children[0]),'large merged bounds do not become a false invisible wall');
});
test('合批保留玻璃排序、動態分支與真正燈具，父構件不能把獨立燈具一起隱藏',async()=>{
 const {batchDahStatic}=await import('../src/world/buildings/dah-hsian/static-batch.js'),root=new THREE.Group(),box=new THREE.BoxGeometry(1,1,1),opaque=new THREE.MeshToonMaterial(),glass=new THREE.MeshToonMaterial({transparent:true,opacity:.12}),light=new THREE.MeshToonMaterial();light.userData.dahKind='light';
 const independent=[];
 for(let i=0;i<3;i++){
  const frame=new THREE.Mesh(box,opaque),lamp=new THREE.Mesh(box,light);frame.position.x=i*2;lamp.position.y=1;frame.add(lamp);root.add(frame);independent.push(frame,lamp);
  const pane=new THREE.Mesh(box,glass);pane.position.x=i;root.add(pane);independent.push(pane);
 }
 const moving=new THREE.Group();moving.userData.noOcc=true;root.add(moving);for(let i=0;i<2;i++){const m=new THREE.Mesh(box,opaque);moving.add(m);independent.push(m);}
 const result=batchDahStatic(root);assert.equal(result.sourceMeshes,0,'nothing here is safe to hide or merge');for(const o of independent)assert.equal(o.visible,true,'independent render/fixture stays visible through its ancestors');
});
test('固定合批按空間分區，視野外區塊可被裁切而不是全棟一次畫',async()=>{
 const {batchDahStatic}=await import('../src/world/buildings/dah-hsian/static-batch.js'),root=new THREE.Group(),box=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshToonMaterial();
 for(const x of [2,4,202,204]){const m=new THREE.Mesh(box,material);m.position.set(x,1,-5);root.add(m);}
 const result=batchDahStatic(root);assert.equal(result.renderBatches,2);
 const camera=new THREE.PerspectiveCamera(55,1,.1,40);camera.position.set(3,1,0);camera.lookAt(3,1,-5);camera.updateMatrixWorld();
 const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 const batches=root.getObjectByName('達賢靜態繪製合批').children;root.updateMatrixWorld(true);assert.equal(batches.filter(o=>frustum.intersectsObject(o)).length,1,'known near cell visible and far cell excluded');
});
test('合批後的實體仍投射與接收陰影，不能靠意外關閉陰影得到較低負擔',async()=>{
 const {batchDahStatic}=await import('../src/world/buildings/dah-hsian/static-batch.js'),{configureDahShadows}=await import('../src/world/buildings/dah-hsian/daylight.js');
 const root=new THREE.Group(),material=new THREE.MeshToonMaterial(),geometry=new THREE.BoxGeometry(1,1,1);for(const x of [2,4]){const m=new THREE.Mesh(geometry,material);m.position.x=x;root.add(m);}
 batchDahStatic(root);configureDahShadows(root);const batch=root.getObjectByName('達賢靜態繪製合批').children[0];assert.equal(batch.castShadow,true);assert.equal(batch.receiveShadow,true);assert.ok(!collectCameraOccluders(root).includes(batch),'render geometry stays excluded from camera queries without disabling shadows');
});
test('實際達賢室內可見靜態提交有預算，合批前後構件表面與燈具來源保持一致',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js'),{batchDahStatic}=await import('../src/world/buildings/dah-hsian/static-batch.js');
 const root=createInteriorModel(createDahMaterialFactory());root.updateMatrixWorld(true);
 const triangleCount=r=>{let n=0;r.traverseVisible(o=>{if(o.isMesh)n+=(o.geometry.index?.count||o.geometry.getAttribute('position').count)/3*(o.isInstancedMesh?o.count:1);});return n;};
 const triangles=triangleCount(root),cameraBefore=collectCameraOccluders(root),lamps=[];root.traverse(o=>{if(o.isMesh&&o.material?.userData?.dahKind==='light')lamps.push(o);});
 const result=batchDahStatic(root);assert.ok(result.sourceMeshes>1000,'actual room content is included');
 const workload=assertDahModelBudget(root);assert.equal(workload.triangles,triangles,'quick budget uses expanded visible geometry, not draw object count alone');
 assert.equal(triangleCount(root),triangles,'no visible detail or triangles silently removed');assert.deepEqual(collectCameraOccluders(root),cameraBefore,'same real source surfaces continue blocking the camera');
 for(const lamp of lamps)assert.equal(lamp.visible,true,'every real emitter remains separately discoverable');
});
test('鏡射縮放構件保留原本正反面，不能把反向頂點直接烘成消失的外牆',async()=>{
 const {batchDahStatic}=await import('../src/world/buildings/dah-hsian/static-batch.js'),root=new THREE.Group(),material=new THREE.MeshToonMaterial(),geometry=new THREE.BoxGeometry(1,1,1);
 for(const x of [2,4]){const m=new THREE.Mesh(geometry,material);m.position.x=x;m.scale.x=-1;root.add(m);}
 batchDahStatic(root);assert.ok(root.children.filter(o=>o.isMesh).every(o=>o.visible),'mirrored parts stay on the original renderer winding path');
});

test('快速預警計入所有實例的三角形，單一大型書本批次也不能繞過幾何預算',async()=>{
 const box=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshToonMaterial(),root=new THREE.Group(),small=new THREE.InstancedMesh(box,material,2);root.add(small);
 assert.deepEqual(assertDahModelBudget(root),{meshes:1,triangles:24},'known two cubes calibrate expanded instance triangles');
 root.remove(small);const dense=new THREE.InstancedMesh(box,material,25001);root.add(dense);
 assert.throws(()=>assertDahModelBudget(root),/三角形.*300012/,'one draw object still contains 300012 real triangles');
});

test('來源父網格的非網格燈光與圖元不可被合批隱藏',async()=>{
 const {batchDahStatic}=await import('../src/world/buildings/dah-hsian/static-batch.js');
 const root=new THREE.Group(),box=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshToonMaterial();
 const children=[new THREE.PointLight(),new THREE.Sprite(),new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial()),new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial())];
 for(const child of children){const frame=new THREE.Mesh(box,material);frame.add(child);root.add(frame);}
 batchDahStatic(root);
 const visible=[];root.traverseVisible(o=>visible.push(o));
 for(const child of children)assert.ok(visible.includes(child),'non-mesh render/light child remains effectively visible');
});
