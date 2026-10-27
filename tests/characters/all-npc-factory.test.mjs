/** Independent all-NPC routing/resource audit. No golden generation or renderer/FPS claim. */
import test from 'node:test';
import * as THREE from 'three';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHumanoid,getHumanoidGeometryStats,getHumanoidAssembly} from '../../src/actors/humanoid-factory.js';

// Baseline: main 080213a, tree f0916cf (same actor/build blobs as 7780b813).
// Capture each actual root once: player normal/swim/eagle are three views of ONE root.
const {createCapybara,getCapybaraAssembly}=await import('../../src/actors/capybara-factory.js');
// v2.02 加運動學程代表 bz26-pg-P05（Claude，經 wenzhotw 核可）：多 1 個角色根、36 個節點、28 個網格、3 種材質、2 張貼圖；geometries 與 attributeBytes 仍沿用原基線比大小。
const baseline={roots:111,nodes:5965,meshes:4765,geometries:1522,materials:616,textures:248,attributeBytes:19774624};
const roots=new Set(),geometries=new Set(),materials=new Set(),textures=new Set();
const routed=[],exceptions=[],ids=[];let nodes=0,meshes=0;
const hook=Symbol.for('nccu100.all-npc-resource-audit');
globalThis[hook]=(id,root,npc)=>{
 if(npc){assert.ok(npc.assembly);assert.equal(npc.assembly.root,npc.g);assert.equal(npc.assembly.body,npc.rig);assert.equal(npc.assembly.joints,npc.P);assert.equal(npc.assembly.headCenter,npc.P.head);assert.equal(npc.assembly.kind,id==='biz-tsai'?'capybara':'humanoid');assert.ok(npc.assembly.parts);assert.ok(npc.assembly.limbParts);}
 ids.push(id);
 if(roots.has(root))return;
 roots.add(root);
 const assembly=getHumanoidAssembly(root);
 if(id==='biz-tsai'){assert.equal(assembly,undefined,'capybara must not become a humanoid');const animal=getCapybaraAssembly(root);assert.ok(animal,'explicit nonhuman factory provenance');assert.equal(animal.body.parent,root);exceptions.push(id);}
 else{
  assert.ok(assembly,`${id}: real constructor must use humanoid factory`);routed.push(id);
  assert.equal(assembly.body.parent,root);
  for(const key of ['shL','shR','hipL','hipR','head'])assert.equal(assembly.joints[key].parent,assembly.body,`${id}/${key}`);
  if(id!=='player'){
   assert.equal(assembly.headCenter,assembly.joints.head,'NPC legacy center/pivot alias');
   for(const side of ['L','R'])assert.equal(assembly.joints[`sh${side}`].children[2],assembly.limbParts[`arm${side}`].hand,'legacy hand index must survive');
  }
  if(id==='old-principal')for(const side of ['L','R'])assert.equal(assembly.limbParts[`arm${side}`].hand.material.color.getHexString(),'f4f4ee','rider white gloves survive');
 }
 root.traverse(node=>{
  nodes++;
  if(node.isMesh){meshes++;geometries.add(node.geometry);}
  if(node.material)for(const material of [].concat(node.material)){materials.add(material);if(material.map)textures.add(material.map);}
 });
};
const source=new URL('./build.mjs',import.meta.url),original=fs.readFileSync(source,'utf8');
const token='const add = (id, root) => {';assert.equal(original.split(token).length,2);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nccu100-all-npc-audit-'));
try{
 const injected=original.replace(token,`${token}\n globalThis[Symbol.for('nccu100.all-npc-resource-audit')](id,root,NPCS.find(n=>n.g===root));`);
 const relocated=injected.replace(/((?:from\s+|import\s+)['"])([^'"]+)(['"])/g,(_,a,b,c)=>a+(b.startsWith('.')?new URL(b,source).href:import.meta.resolve(b))+c);
 fs.writeFileSync(path.join(dir,'build.mjs'),relocated);
 await import(pathToFileURL(path.join(dir,'build.mjs')).href);
}finally{fs.rmSync(dir,{recursive:true,force:true});delete globalThis[hook];}

test('all 109 human NPCs plus player use actual factory, capybara stays explicit exception',()=>{
 assert.equal(ids.length,113);assert.equal(roots.size,111);assert.equal(routed.length,110);
 assert.equal(routed.filter(id=>id.startsWith('students-')).length,6,'anonymous students also migrate');
 assert.deepEqual(exceptions,['biz-tsai']);
 for(const id of ['principal','dean','old-principal','missionary-a','missionary-b','fountain-crowd-7','bz26-D12','bz26-D23'])assert.ok(routed.includes(id));
 assert.equal(fs.existsSync(dir),false);
});

test('whole-corpus retained geometry/buffer bytes improve without adding meshes, materials or textures',t=>{
 let attributeBytes=0;
 for(const geometry of geometries){for(const attribute of Object.values(geometry.attributes))attributeBytes+=attribute.array.byteLength;if(geometry.index)attributeBytes+=geometry.index.array.byteLength;}
 const actual={roots:roots.size,nodes,meshes,geometries:geometries.size,materials:materials.size,textures:textures.size,attributeBytes};
 t.diagnostic(JSON.stringify({baseline,actual,scope:'retained references and vertex/index array bytes; not peak heap, GPU memory, build CPU, draw calls or FPS'}));
 for(const key of ['roots','nodes','meshes','materials','textures'])assert.equal(actual[key],baseline[key],key);
 assert.ok(actual.geometries<baseline.geometries,'canonical geometry must actually be reused');
 assert.ok(actual.attributeBytes<baseline.attributeBytes,'retained vertex/index bytes must actually decrease');
});


test('bounded geometry reuse survives detach and failed decoration without disposing live shared resources',()=>{
 const stats=getHumanoidGeometryStats();assert.ok(stats.reuses>0);assert.ok(stats.entries<=stats.limit);
 const representative=getHumanoidAssembly([...roots].find(root=>getHumanoidAssembly(root)?.profile.kind==='npc'));
 const profile=structuredClone(representative.profile);
 // Inject minimal rendering tools: no renderer, no scene, no material/texture cache growth.
 const sample=representative.parts.torso,sharedMat=sample.material;
 const sphere=representative.limbParts.legL.shoe.geometry;
 let disposed=0;const kept=sample.geometry;kept.addEventListener('dispose',()=>disposed++);
 const tools={BOX:sphere,SPH:sphere,part(geometry,color,x,y,z,parent){const node=sample.clone(false);node.geometry=geometry;node.material=sharedMat;node.position.set(x,y,z);parent.add(node);return node;},outlineU(){}};
 const a=createHumanoid(profile,tools),b=createHumanoid(profile,tools);
 assert.equal(a.parts.torso.geometry,b.parts.torso.geometry);
 a.root.removeFromParent();assert.equal(disposed,0);
 assert.throws(()=>createHumanoid(profile,{...tools,afterArms(){throw Error('audit hook failure');}}),/audit hook failure/);
 assert.equal(disposed,0);assert.equal(b.parts.torso.geometry,kept);
 const before=getHumanoidGeometryStats();
 for(let i=0;i<before.limit+2;i++){const varied=structuredClone(profile);varied.torso.geometry[1]=.3+i*.001;createHumanoid(varied,tools);}
 const after=getHumanoidGeometryStats();assert.ok(after.entries<=after.limit);assert.ok(after.requests>before.requests);assert.equal(disposed,0,'cache growth must not dispose live geometry');
 assert.equal(b.parts.torso.geometry,kept);
});


test('capybara instance isolation and attach failure preserve scene and shared render resources',()=>{
 const parent=new THREE.Group(),sentinel=new THREE.Group();parent.add(sentinel);
 const BOX=new THREE.BoxGeometry(),SPH=new THREE.SphereGeometry(),material=new THREE.MeshBasicMaterial();let calls=0,disposed=0;
 for(const geo of [BOX,SPH])geo.addEventListener('dispose',()=>disposed++);
 const tools={parent,BOX,SPH,part(geo,col,x,y,z,where){calls++;const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);where.add(m);return m;}};
 assert.throws(()=>createCapybara({}, {...tools,part:null}),TypeError);assert.equal(calls,0);assert.deepEqual(parent.children,[sentinel]);
 const first=createCapybara({},tools),second=createCapybara({},tools);
 assert.equal(getCapybaraAssembly(first.root),first);assert.equal(getHumanoidAssembly(first.root),undefined);
 assert.notEqual(first.joints,second.joints);assert.notEqual(first.joints.fm,second.joints.fm);assert.notEqual(first.parts,second.parts);assert.notEqual(first.limbParts,second.limbParts);
 for(const key of ['frontL','frontR','backL','backR']){assert.notEqual(first.limbParts[key].leg,second.limbParts[key].leg);assert.equal(first.limbParts[key].hand,undefined);}
 first.parts.torso.visible=false;first.joints.shL.rotation.x=1;assert.equal(second.parts.torso.visible,true);assert.equal(second.joints.shL.rotation.x,0);
 const before=[...parent.children],add=parent.add;let failed;
 try{parent.add=function(node){failed=node;add.call(this,node);throw Error('audit capy attach');};assert.throws(()=>createCapybara({},tools),/audit capy attach/);}
 finally{parent.add=add;}
 assert.equal(failed.parent,null);assert.equal(getCapybaraAssembly(failed),undefined);assert.deepEqual(parent.children,before);assert.equal(disposed,0);
 first.root.removeFromParent();assert.equal(disposed,0);assert.equal(second.root.parent,parent);
});
