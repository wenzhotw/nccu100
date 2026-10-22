import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
test('達賢材質是本區獨立副本，清水模遮陽板與咖啡木頭有不同本色',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');
 const template=new THREE.MeshToonMaterial({color:'#ffffff'}),before=template.color.clone();
 const f=createDahMaterialFactory({toon:()=>template});
 assert.notEqual(f('louver'),template);assert.ok(template.color.equals(before));
 const concrete=f('louver').color,wood=f('timber').color;
 assert.ok(Math.max(concrete.r,concrete.g,concrete.b)-Math.min(concrete.r,concrete.g,concrete.b)<.06);
 assert.ok(wood.r>wood.b*1.5);assert.equal(f('louver'),f('louver'));
});
test('紋理是低對比原創資料，玻璃透光不寫深度，夜間發光局限燈具與窗面',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const f=createDahMaterialFactory();
 for(const role of ['concrete','louver','timber','wood','paving','carpet']){
  const map=f(role).map;assert.ok(map?.isDataTexture,role);const data=map.image.data;let lo=255,hi=0;
  for(let i=0;i<data.length;i+=4){lo=Math.min(lo,data[i]);hi=Math.max(hi,data[i]);}assert.ok(hi-lo<40&&hi>lo,role);
 }
 assert.equal(f('clear').transparent,true);assert.equal(f('clear').depthWrite,false);assert.ok(f('clear').opacity<.3);
 const lamp=f('lamp'),wall=f('concrete'),glass=f('glass');f.setEnvironment({night:0});const before=lamp.emissiveIntensity;
 f.setEnvironment({night:1});assert.ok(lamp.emissiveIntensity>before);assert.equal(wall.emissiveIntensity,0);assert.ok(glass.emissiveIntensity>0);
});
test('桌下接觸暗部貼在正確樓板，柔邊透明材質不當碰撞或投影實體',async()=>{
 const {addDahContactShadows}=await import('../src/world/buildings/dah-hsian/materials.js');
 const root=new THREE.Group(),table=new THREE.Mesh(new THREE.BoxGeometry(2,.1,1),new THREE.MeshToonMaterial());table.name='閱讀桌面';table.position.set(3,.71,4);root.add(table);
 const controller=addDahContactShadows(root,{interior:true}),shadow=root.getObjectByName('柔和接觸暗部');assert.ok(shadow);
 assert.ok(shadow.position.y>0&&shadow.position.y<.04);assert.equal(shadow.userData.noOcc,true);assert.equal(shadow.material.depthWrite,false);assert.ok(shadow.material.alphaMap.isDataTexture);
 const d=shadow.material.alphaMap.image.data;assert.ok(d[(32*64+32)*4]>d[0]);controller.update({night:1});assert.ok(shadow.material.opacity<.3);
});
test('牆腳暗部沿實牆與樓板交界，透明窗邊不產生整片黑帶',async()=>{
 const {addDahContactShadows}=await import('../src/world/buildings/dah-hsian/materials.js');const root=new THREE.Group();
 for(const [x,transparent]of [[0,false],[4,true]]){const wall=new THREE.Mesh(new THREE.BoxGeometry(.3,4,10),new THREE.MeshToonMaterial({transparent}));wall.name='2樓邊界牆';wall.position.set(x,2,0);root.add(wall);}
 addDahContactShadows(root,{interior:true});const shadows=root.children.filter(x=>x.name==='牆腳接觸暗部');assert.equal(shadows.length,1);assert.ok(shadows[0].geometry.parameters.height>=10);assert.ok(shadows[0].position.y<.04);
});
test('相同材質跨大牆與小家具使用世界座標紋理，避免木紋隨尺寸放大',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const m=createDahMaterialFactory()('wood');const shader={uniforms:{},vertexShader:THREE.ShaderLib.toon.vertexShader,fragmentShader:THREE.ShaderLib.toon.fragmentShader};m.onBeforeCompile(shader);
 assert.ok(shader.vertexShader.includes('vDahWorldPosition'));assert.ok(shader.fragmentShader.includes('dahMapUv'));assert.ok(shader.fragmentShader.includes('texture2D( map, dahMapUv )'));assert.doesNotMatch(shader.fragmentShader,/[^\s]#(?:ifdef|endif|include)/,'GLSL前處理必須獨立行');
});
test('遠處閱讀桌保留柔和暖光，亮斑透明不寫深度，混凝土不整面發光',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const f=createDahMaterialFactory(),glow=f('taskGlow');assert.equal(glow.transparent,true);assert.equal(glow.depthWrite,false);assert.ok(glow.alphaMap?.isDataTexture);f.setEnvironment({night:0});const before=glow.opacity;f.setEnvironment({night:1});assert.ok(glow.opacity>before);assert.equal(f('concrete').emissiveIntensity,0);
});
test('桌島與書架框夜間維持暖色層次，暗背板不發光，接地暗部獨立透明',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const f=createDahMaterialFactory();f.setEnvironment({night:1});
 assert.ok(f('litWood').emissiveIntensity>=.3);assert.ok(f('wood').emissiveIntensity>0);assert.equal(f('woodDark').emissiveIntensity,0);
 assert.ok(f('litWood').color.r>f('litWood').color.b*3);assert.equal(f('contact').transparent,true);assert.equal(f('contact').depthWrite,false);assert.ok(f('contact').alphaMap?.isDataTexture);
});
