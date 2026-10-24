import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {FURNITURE} from '../src/world/buildings/dah-hsian/interior-layout.js';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
test('2F南窗閱覽區依館方圖包含沙發、小圓桌、菱形桌與共桌，不再以五張長桌填滿',()=>{
 const x=px=>-15+(px-415.94)*7/335.55,z=py=>-22+(py-134.64)*7/335.154007;assert.ok(Math.abs(x(751.49)+8)<1e-8);
 const objects=FURNITURE.filter(o=>o.sourceArea==='2F10');assert.ok(objects.length>10,'來源閱覽家具需獨立登錄');
 assert.ok(objects.some(o=>o.kind==='sofa'));assert.ok(objects.some(o=>o.shape==='round'&&o.h<.5));assert.equal(objects.filter(o=>o.kind==='table'&&o.angle===Math.PI/4).length,2);
 const table=objects.find(o=>o.name==='2F南窗共桌');assert.ok(table);assert.ok(Math.hypot(table.x-x(1440),table.z-z(1975))<.2,'共桌依原圖位置而非均勻排開');
 const model=createInteriorModel();model.updateMatrixWorld(true);const top=model.getObjectByName(table.name).getObjectByName('閱讀桌面'),b=new THREE.Box3().setFromBufferAttribute(top.geometry.attributes.position).applyMatrix4(top.matrixWorld);assert.ok(Math.abs(b.max.y-table.h)<.01);
 assert.ok(!FURNITURE.some(o=>o.name==='窗邊閱讀桌'),'舊通用五桌不應和新區重疊');
});
