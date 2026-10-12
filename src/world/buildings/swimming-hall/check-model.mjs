/** 游泳館幾何、階梯坡道、碰撞與鏡頭的離線回歸測試。 */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSwimmingHall } from './model.js';
import { SWIM, localHeightAt, localCollisionBoxes } from './layout.js';
import { colliders, boxC, resolve } from '../../../core/collision.js';
const context={ clearRect(){}, fillRect(){}, fillText(){} };
globalThis.document={createElement(tag){assert.equal(tag,'canvas');return {width:0,height:0,getContext(){return context}};}};
const model = createSwimmingHall(); model.updateMatrixWorld(true);
const counts={drawables:0,instances:0,ordinaryMeshes:0,triangles:0,uniqueGeometries:new Set(),materials:new Set(),textures:new Set(),occluders:[]};
model.traverse(o=>{if(!o.isMesh)return; counts.drawables++;if(o.isInstancedMesh)counts.instances+=o.count; else counts.ordinaryMeshes++; counts.uniqueGeometries.add(o.geometry); counts.materials.add(o.material);if(o.material.map) counts.textures.add(o.material.map); counts.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.count??1); const t=o.geometry.type; const sz=new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()); if(!o.isInstancedMesh&&(t==='BoxGeometry'||t==='ExtrudeGeometry'||t==='CylinderGeometry'&&o.geometry.parameters.radiusTop>.6)&&Math.max(sz.x,sz.z)>1.4&&sz.y>.25)counts.occluders.push(o);});
for (const b of localCollisionBoxes()) boxC(...b);
const overlap=(p,rad=.4)=>colliders.filter(c=>{let dx=p.x-Math.max(c.x0,Math.min(c.x1,p.x)),dz=p.z-Math.max(c.z0,Math.min(c.z1,p.z));return dx*dx+dz*dz<rad*rad-1e-10});
const path=(waypoints,step=.01)=>{const p=new THREE.Vector3(...waypoints[0]); const points=[{...p}], collisions=[]; for(const point of waypoints.slice(1)){const target=new THREE.Vector3(...point);let guard=10000;while(p.distanceTo(target)>step&&guard--){const prev=p.clone(); const dir=target.clone().sub(p).normalize().multiplyScalar(step);p.add(dir);resolve(p);p.y=target.y; if(overlap(p).length)collisions.push({...p});points.push({...p});if(p.distanceTo(prev)<1e-8)break;}if(guard<=0)throw Error('guard');}return {final:p.toArray(),collisions:collisions.length,heights:points.map(p=>localHeightAt(p.x,p.z)??0),points};};
let stairs=path([[-7.4,0,11.4],[-7.4,0,7.2]]);assert(stairs.final[2]<7.21);assert.equal(stairs.collisions,0); assert(stairs.heights.every((h,i,a)=>!i||h>=a[i-1]));
let ramp=path([[4.5,0,7.7],[-7.4,0,7.7]]);assert(ramp.final[0]<-7.39);assert.equal(ramp.collisions,0);assert(ramp.heights.every((h,i,a)=>!i||h>=a[i-1]-1e-12));
let centerRamp=path([[4.5,0,7.9],[-7.4,0,7.9]]);
const r=new THREE.Raycaster();let samples=0,maxError=0;const surfaces=model.children.filter(m=>m.name==='入口平台'||m.name==='可行走側坡道'||m.isInstancedMesh&&m.name.includes('入口階梯'));
for(let x=-9.5;x<=4.29;x+=.037)for(let z=7.6;z<=11.149;z+=.073){let h=localHeightAt(x,z);if(h===null)continue;r.set(new THREE.Vector3(x,3,z),new THREE.Vector3(0,-1,0));const hits=r.intersectObjects(surfaces,false);assert(hits.length,`missing geometry ${x},${z}`);const err=Math.abs(h-hits[0].point.y);maxError=Math.max(maxError,err);assert(err<.001,`height mismatch ${x},${z} ${h} vs ${hits[0].point.y}`);samples++;}
const rays=[];for(const [name,origin,dir] of [['front wall',[2,2,12],[0,0,-1]],['rear wall',[0,2,-12],[0,0,1]],['right wall',[18,2,0],[-1,0,0]],['left wall',[-18,2,0],[1,0,0]],['entrance',[SWIM.entranceX,2,9],[0,0,-1]],['canopy',[SWIM.entranceX,2,8],[0,1,0]],['upper roof',[0,14,-2],[0,-1,0]],['low roof',[0,12,5],[0,-1,0]]]){r.set(new THREE.Vector3(...origin),new THREE.Vector3(...dir));const hits=r.intersectObjects(counts.occluders,false);rays.push({name,hit:hits[0]?.object.name,distance:hits[0]?.distance,point:hits[0]?.point.toArray()});}
for (const result of rays) assert(result.hit, `camera ray missed: ${result.name}`);
const allBox=new THREE.Box3().setFromObject(model);
console.log(JSON.stringify({metadata:model.userData,counts:{...counts,uniqueGeometries:counts.uniqueGeometries.size,materials:counts.materials.size,textures:counts.textures.size,occluders:counts.occluders.map(o=>o.name)},boundingBox:{min:allBox.min.toArray(),max:allBox.max.toArray()},stairs:{final:stairs.final,levels:[...new Set(stairs.heights)]},ramp:{final:ramp.final,maxDelta:Math.max(...ramp.heights.slice(1).map((h,i)=>h-ramp.heights[i]))},centerRamp:{final:centerRamp.final,collisions:centerRamp.collisions},heightChecks:{samples,maxError},rays},null,2));
// 可達的高仰角鏡頭必須被前方低屋簷擋住。
const origin=new THREE.Vector3(16.8,.9,5),endpoint=new THREE.Vector3(13.2,8.8,5),direction=endpoint.clone().sub(origin).normalize();
r.set(origin,direction);r.far=14.6;const allHits=r.intersectObjects(model.children,false),occHits=r.intersectObjects(counts.occluders,false);console.log('LOW_ROOF_EDGE_CASE',JSON.stringify({origin:origin.toArray(),endpoint:endpoint.toArray(),pitch:Math.asin(direction.y),distance:origin.distanceTo(endpoint),actualHit:allHits[0]?.object.name,actualHitDistance:allHits[0]?.distance,occluderHit:occHits[0]?.object.name,occluderHitDistance:occHits[0]?.distance}));
const exactBounds = new THREE.Box3();
for(const o of model.children){if(!o.isMesh)continue;o.geometry.computeBoundingBox();if(o.isInstancedMesh){for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);exactBounds.union(o.geometry.boundingBox.clone().applyMatrix4(m));}}else exactBounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}
console.log('EXACT_BOUNDS',JSON.stringify({min:exactBounds.min.toArray(),max:exactBounds.max.toArray(),size:exactBounds.getSize(new THREE.Vector3()).toArray()}));
assert.equal(allHits[0]?.object.name,'前棟平屋頂');
assert.equal(occHits[0]?.object.name,'前棟平屋頂');
assert(Math.abs(allHits[0].distance-occHits[0].distance)<1e-9);
assert.equal(counts.occluders.length,12);
assert.equal(counts.drawables,33);
assert.equal(counts.triangles,588);
console.log('PASS: Swimming-hall geometry, heights, collision routes and camera regression.');

// 方位及與法學院的間距，對照主分支中的法學院位置。
const lawCenter = { x: -118.5, z: -100 };
const towardsLaw = new THREE.Vector2(lawCenter.x - SWIM.x, lawCenter.z - SWIM.z).normalize();
const facing = towardsLaw.dot(new THREE.Vector2(SWIM.frontNormal.x, SWIM.frontNormal.z));
assert(facing > .999);
assert((-108.5) - (SWIM.z + SWIM.stairStart) > 6);
for (const tex of counts.textures) { assert.equal(typeof tex.redraw, 'function'); const version = tex.version; tex.redraw(); assert(tex.version > version); }
console.log('PASS: Entrance orientation, law-school gap and font redraw hooks.');
