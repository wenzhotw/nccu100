import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as daylight from '../src/world/buildings/dah-hsian/daylight.js';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('clock fixed modes and auto preserve phase across a room/session sample',()=>{
 assert.equal(typeof daylight.createDahClock,'function');
 const c=daylight.createDahClock({cycleSeconds:1200}); near(c.sample(0).phase,.62);
 c.setMode('dusk',80); near(c.sample(900).phase,.78);
 c.setMode('auto',900); near(c.sample(900).phase,.78); near(c.sample(1020).phase,.88);
 assert.deepEqual(c.sample(1020),c.sample(1020));
 assert.throws(()=>c.setMode('bad',1020)); assert.equal(c.mode,'auto');near(c.sample(1020).phase,.88);
 c.setMode('night',1020);near(c.sample(8000).phase,.92);
 c.setMode('afternoon',8000);near(c.sample(8001).phase,.62);
 near(c.sample(-10).phase,.62);
});
test('cyclic lighting is finite and continuous at wrap and all keyframes',()=>{
 assert.equal(typeof daylight.sampleDahLight,'function');
 const numbers=['night','sunIntensity','hemiIntensity','localIntensity'];
 const colors=['sky','horizon','fog','sun','ambient','ground'];
 for(const phase of [0,.2,.3,.5,.62,.78,.92,1,-1,2]){
  const p=daylight.sampleDahLight(phase),a=daylight.sampleDahLight(phase-1e-7),b=daylight.sampleDahLight(phase+1e-7);
  for(const k of numbers){assert.ok(Number.isFinite(p[k]));near(a[k],b[k],1e-4);}
  for(const k of colors){assert.ok(p[k].isColor);for(const c of ['r','g','b']){assert.ok(Number.isFinite(p[k][c]));near(a[k][c],b[k][c],1e-4);}}
  near(p.sunDirection.length(),1);assert.ok(a.sunDirection.distanceTo(b.sunDirection)<1e-4);
 }
 const day=daylight.sampleDahLight(.62),night=daylight.sampleDahLight(.92);
 assert.ok(night.sunIntensity<day.sunIntensity);assert.ok(night.localIntensity>day.localIntensity);assert.ok(night.hemiIntensity>.1);
 assert.equal(daylight.createDahClock().sample(0).sky.isColor,true);
});
test('room lighting drives real scene nodes and nearby warm lamps at night',()=>{
 assert.equal(typeof daylight.createDahLighting,'function');
 const scene=new THREE.Scene(),inside=new THREE.Scene();
 const l=daylight.createDahLighting(scene),i=daylight.createDahLighting(inside,{interior:true,mobile:true});
 const night=daylight.sampleDahLight(.92),day=daylight.sampleDahLight(.62);
 l.update(night,new THREE.Vector3(10,4,7));i.update(night,new THREE.Vector3(-12,0,0));
 assert.ok(l.sun.isDirectionalLight&&l.sun.castShadow);assert.equal(l.sun.shadow.mapSize.x,2048);assert.equal(i.sun.shadow.mapSize.x,1024);
 assert.ok(scene.fog.color.equals(night.fog));assert.ok(scene.children.some(n=>n.isHemisphereLight&&n.intensity>0));
 assert.ok(scene.children.some(n=>n.isMesh&&n.material.isShaderMaterial));
 assert.ok(l.localLights.length<=4&&i.localLights.length<=2);
 assert.ok(l.localLights.some(n=>n.isPointLight&&n.intensity>.5&&n.distance>10&&!n.castShadow));
 assert.ok(i.localLights.some(n=>n.intensity>.5));
 const outsideDir=l.sun.position.clone().sub(l.sun.target.position).normalize(),insideDir=i.sun.position.clone().sub(i.sun.target.position).normalize();
 near(outsideDir.x,-insideDir.x);near(outsideDir.z,-insideDir.z);near(outsideDir.y,insideDir.y);
 const before=l.localLights[0].intensity;l.update(day,new THREE.Vector3(10,4,7));assert.ok(l.localLights[0].intensity<before);
});
test('shadow eligibility excludes overlays and camera keeps a static point stable below one texel',()=>{
 assert.equal(typeof daylight.configureDahShadows,'function');
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry();
 const opaque=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial()),instanced=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial(),1);
 const transparent=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true}));
 const backside=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.BackSide}));
 const water=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());water.name='pond-water';
 const overlay=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());overlay.userData.noOcc=true;
 const overlayGroup=new THREE.Group();overlayGroup.userData.noOcc=true;
 const nested=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());overlayGroup.add(nested);
 root.add(opaque,instanced,transparent,backside,water,overlay,overlayGroup);daylight.configureDahShadows(root);
 for(const m of [opaque,instanced])assert.ok(m.castShadow&&m.receiveShadow);
 for(const m of [transparent,backside,water,overlay,nested])assert.ok(!m.castShadow&&!m.receiveShadow);
 const l=daylight.createDahLighting(new THREE.Scene()),profile=daylight.sampleDahLight(.62);
 l.update(profile,new THREE.Vector3());
 const projected=new THREE.Vector3(3,0,2).applyMatrix4(l.sun.shadow.matrix);
 l.update(profile,new THREE.Vector3(.00001,0,.00001));
 const after=new THREE.Vector3(3,0,2).applyMatrix4(l.sun.shadow.matrix);
 near(projected.x,after.x,1e-12);near(projected.y,after.y,1e-12);
 l.update(profile,new THREE.Vector3(50,0,50));assert.ok(l.sun.target.position.distanceTo(new THREE.Vector3(50,0,50))<.1);
});
test('上層夜景的真燈取自模型燈具高度，不把一樓補光拿來照八樓',()=>{
 const scene=new THREE.Scene(),m=new THREE.Mesh(new THREE.SphereGeometry(.1),new THREE.MeshToonMaterial());m.material.userData.dahKind='light';m.position.set(2,25,12);scene.add(m);
 const l=daylight.createDahLighting(scene,{interior:true});l.update(daylight.sampleDahLight(.92),new THREE.Vector3(2,23,12));
 assert.ok(l.localLights.some(x=>x.position.distanceTo(m.position)<.01));
});
test('午後中庭主光高於填光形成採光帶，夜間採中性填光與局部暖燈',()=>{
 const scene=new THREE.Scene(),l=daylight.createDahLighting(scene,{interior:true}),hemi=scene.children.find(o=>o.isHemisphereLight);
 l.update(daylight.sampleDahLight(.62),new THREE.Vector3(1,15,3));assert.ok(l.sun.intensity>hemi.intensity*1.4);
 l.update(daylight.sampleDahLight(.92),new THREE.Vector3(1,15,3));assert.ok(hemi.color.b/hemi.color.r<1.5);assert.ok(l.localLights[0].intensity>=3);
});
test('午後東側欄杆投影落在平台內，不把全部欄影投到平台外草坡',()=>{
 const d=daylight.sampleDahLight(.62).sunDirection;
 const rail=new THREE.Vector3(29.5,5.1,12),floorY=4,shadow=rail.clone().addScaledVector(d,-(rail.y-floorY)/d.y);
 assert.ok(shadow.x<29.4&&shadow.x>26,'欄影應落在欄杆內側平台 '+shadow.x);
});
test('二樓大廳夜燈局部衰減，不能沿用上層補光把混凝土整面洗黃',()=>{
 const l=daylight.createDahLighting(new THREE.Scene(),{interior:true}),night=daylight.sampleDahLight(.92);
 l.update(night,new THREE.Vector3(-14,0,-10));const lobby=l.localLights.map(x=>({distance:x.distance,intensity:x.intensity}));l.update(night,new THREE.Vector3(-14,23.1,17));
 assert.ok(lobby.every((x,i)=>x.distance<l.localLights[i].distance&&x.intensity<l.localLights[i].intensity));assert.ok(lobby.every(x=>x.distance<=12));
});
