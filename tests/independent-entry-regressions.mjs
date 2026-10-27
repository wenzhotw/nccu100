import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as THREE from 'three';
const SOURCE=process.env.BZ_SOURCE || new URL('../',import.meta.url).pathname;
const base=path.join(SOURCE,'src/systems/baozhong');
const load=p=>import(pathToFileURL(path.join(base,p)).href);
const {buildTents}=await load('tents.js');
const {createDecorCtx}=await load('decor-ctx.js');
const {createDecorLoader}=await load('decor-loader-core.js');
const {resolve,setActiveColliders,setRoomClamp}=await import(pathToFileURL(process.env.BZ_COLLISION || new URL('../src/core/collision.js',import.meta.url).pathname).href);
const layout=JSON.parse(fs.readFileSync(path.join(base,'layout.json')));
const content=JSON.parse(fs.readFileSync(path.join(SOURCE,'src/content/baozhong.json')));
const R=.4, eps=1e-6;
function setup(){const colliders=[];const api=buildTents(layout,content.colleges,{content,colliders});api.setActive(true);api.group.updateMatrixWorld(true);setRoomClamp(null);setActiveColliders(colliders);return {api,colliders};}
function world(t,x,z){return new THREE.Vector3(x,0,z).applyMatrix4(t.group.matrixWorld);}
function displacement(t,x,z){const p=world(t,x,z), q={x:p.x,y:p.y,z:p.z};resolve(q,R);return Math.hypot(q.x-p.x,q.z-p.z);}
// Actual constructed solid footprints, not constants copied from TENT. Ignore canopy/signs/outlines.
function solids(t){const inv=t.group.matrixWorld.clone().invert();return [...t.parts.walls,...t.parts.frame.filter(m=>m.geometry.type==='CylinderGeometry'),...t.parts.counter.filter(m=>m.geometry.type==='BoxGeometry')].map(m=>{const b=new THREE.Box3();const v=new THREE.Vector3();const M=inv.clone().multiply(m.matrixWorld);const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)b.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(M));return b;});}
function clears(boxes,x,z){return boxes.every(b=>Math.hypot(x-Math.max(b.min.x,Math.min(x,b.max.x)),z-Math.max(b.min.z,Math.min(z,b.max.z)))>=R-eps);}
function pathToInterior(t){
 const boxes=solids(t), step=.1, N=30, key=(x,z)=>`${x},${z}`, good=(x,z)=>clears(boxes,x*step,z*step)&&displacement(t,x*step,z*step)<eps;
 // Start on the front centre; search continuously with 0.025m samples per edge.
 const start=[0,25], queue=[start], seen=new Set([key(...start)]), parent=new Map();let found=null;
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];if(Math.abs(x)<=3&&z>=-3&&z<=0){found=[x,z];break;}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Z=z+dz,k=key(X,Z);if(Math.abs(X)>N||Math.abs(Z)>N||seen.has(k))continue;let ok=true;for(let s=1;s<=4;s++){const px=(x+dx*s/4)*step,pz=(z+dz*s/4)*step;if(!clears(boxes,px,pz)||displacement(t,px,pz)>eps){ok=false;break;}}if(ok){seen.add(k);parent.set(k,[x,z]);queue.push([X,Z]);}}}
 if(!found)return null;const result=[];for(let at=found;at;at=parent.get(key(...at)))result.push(at.map(v=>v*step));return result.reverse();
}
test('D26 continuous outside → actual open entrance → interior → talk range, never through solids',{skip:'User explicitly selected front-counter interaction; interior route is not required. Historical failure retained.'},()=>{
 const {api}=setup(),t=api.tents.get('D26');const route=pathToInterior(t);assert.ok(route,'No continuous radius-0.4m path from local (0,+2.5) to interior |x|<=0.3,z∈[-0.3,0]; resolver and real solid footprints both enforced');
 // Return along the same continuous path to a talk point, not teleport to NPC.
 const talk=world(t,...route[0]);assert.ok(Math.hypot(talk.x-t.layout.anchor[0],talk.z-t.layout.anchor[1])<=2.4,'Entry path must connect to existing NPC interaction radius');
});
test('all 41 layouts: render transforms and resolver preserve physical wall/counter/pillar exclusion',()=>{
 const {api}=setup();assert.equal(api.tents.size,41);const errors=[];
 for(const [id,t] of api.tents){const l=t.layout;const p=world(t,.37,.61);const expected=[l.x+.37*Math.cos(l.rotY)+.61*Math.sin(l.rotY),l.z-.37*Math.sin(l.rotY)+.61*Math.cos(l.rotY)];assert.ok(Math.hypot(p.x-expected[0],p.z-expected[1])<eps,`${id} render transform`);
 for(const [i,b] of solids(t).entries()){const x=(b.min.x+b.max.x)/2,z=(b.min.z+b.max.z)/2;const q=world(t,x,z);resolve(q,R);const local=t.group.worldToLocal(new THREE.Vector3(q.x,q.y,q.z));if(!clears([b],local.x,local.z))errors.push({id,solid:i,local:local.toArray()});}}
 assert.deepEqual(errors,[],'Resolver must eject player from real rotated solid footprint');
});
test('all 41 layouts: centred interior free space is not filled by whole-tent collision',()=>{const {api}=setup();const blocked=[];for(const [id,t] of api.tents)if(displacement(t,0,0)>eps)blocked.push(id);assert.deepEqual(blocked,[]);});
test('exit clears owned colliders, preserves foreign collider; reentry never duplicates',()=>{
 const foreign={x0:150,x1:151,z0:-100,z1:-99};const {api,colliders}=setup();colliders.push(foreign);const first=[...api.colliders];assert.ok(first.length>0);for(let i=0;i<3;i++){api.setActive(false);assert.deepEqual(colliders,[foreign]);assert.equal(displacement(api.tents.get('D26'),0,0),0);api.setActive(true);api.setActive(true);assert.equal(new Set(colliders).size,colliders.length);assert.equal(colliders.length,first.length+1);assert.ok(first.every(c=>colliders.includes(c)));}
 api.setActive(false);setActiveColliders([]);
});
test('actual mounted 41 decor: all final poster faces unobscured on 7×7 geometric sightline grid',async()=>{
 const {api}=setup();const files=Object.fromEntries(layout.tents.map(t=>[`./decor/${t.id}.js`,()=>load(`decor/${t.id}.js`)]));
 const deps={THREE,toon:c=>new THREE.MeshBasicMaterial({color:c}),outlineMat:new THREE.MeshBasicMaterial({side:THREE.BackSide}),makeSignTexture:()=>null};
 const loader=createDecorLoader({THREE,files,createCtx:(g,c)=>createDecorCtx(deps,g,c),warn:(...x)=>{throw Error(x.join(' '));}});const problems=[];let checked=0;
 for(const [id,t] of api.tents){const entry=await loader.mountDecor(id,t.group,t.collegeColor,t.parts);assert.ok(entry,`${id} mounts actual decor`);api.update({x:t.layout.x,z:t.layout.z});api.refreshSigns(id);api.group.updateMatrixWorld(true);
 for(const p of t.parts.signs.filter(p=>p.userData.bz26Poster!==undefined)){assert.ok(p.visible,`${id} poster visible`);checked++;p.geometry.computeBoundingBox();const box=p.geometry.boundingBox;let hits=0;const samples=[];
 for(let a=0;a<7;a++)for(let b=0;b<7;b++){const point=new THREE.Vector3(THREE.MathUtils.lerp(box.min.x,box.max.x,(a+.5)/7),THREE.MathUtils.lerp(box.min.y,box.max.y,(b+.5)/7),0).applyMatrix4(p.matrixWorld);const normal=new THREE.Vector3(0,0,1).transformDirection(p.matrixWorld);const origin=point.clone().addScaledVector(normal,2);const ray=new THREE.Raycaster(origin,normal.clone().negate(),0,2-1e-4);const obstacles=ray.intersectObject(entry.root,true).filter(h=>{for(let n=h.object;n;n=n.parent)if(!n.visible)return false;return true;});if(obstacles.length){hits++;samples.push([a,b,Number(obstacles[0].distance.toFixed(4))]);}}
 if(hits)problems.push({id,poster:p.userData.bz26Poster,blockedSamples:hits,totalSamples:49,posterWorld:p.getWorldPosition(new THREE.Vector3()).toArray(),samples});}
 loader.unmountAllDecor();}
 assert.equal(checked,123);fs.writeFileSync(new URL('./poster-sightline-results.json',import.meta.url),JSON.stringify({source:SOURCE,checked,problems},null,2));assert.deepEqual(problems.map(({samples,...p})=>p),[],'Real triangle ray intersections ahead of final poster surfaces, including outlines');
});
test('D26 front service approach reaches counter without phantom shell or physical penetration',()=>{
 const {api}=setup(),t=api.tents.get('D26'),boxes=solids(t);const errors=[];
 for(let i=0;i<=30;i++){const z=2.5-i*.025;assert.ok(clears(boxes,0,z),`front service point z=${z} physically clear`);const d=displacement(t,0,z);if(d>eps)errors.push({localZ:z,displacement:d});}
 const p=world(t,0,1.75);assert.ok(Math.hypot(p.x-t.layout.anchor[0],p.z-t.layout.anchor[1])<=2.4,'Physical service point reaches existing NPC');assert.deepEqual(errors,[],'Phantom whole-tent shell must not push player away from clear front service area');
});
test('D26 real-source NPC eligibility → nearest spot → interact → actual booth dialogue/choice contract',async()=>{
 // Execute the unchanged production expressions/functions with UI ports recorded, not a browser claim.
 const read=p=>fs.readFileSync(path.join(SOURCE,'src',p),'utf8');const idx=fs.readFileSync(path.join(base,'index.js'),'utf8');
 const {createFlow}=await load('flow-core.js'),L=await load('passport-logic.js'),{prepareQuiz}=await load('quiz-utils.js');const F=createFlow({logic:L,prepareQuiz,content});
 const {api}=setup(),t=api.tents.get('D26'),pos=world(t,0,2.5),state={started:true,room:null,driving:false,holdPang:false,busy:false,flags:new Set(['bz26_active'])},dlg={hidden:true};
 const data=content.booths.find(b=>b.id==='D26'),o={home:{x:t.layout.anchor[0],z:t.layout.anchor[1]},title:data.npc.title},n={fear:0,state:'idle'},venue={on:true};
 const spotCode=read('actors/npc.js').match(/n\.spot=(\{x:o\.home\.x[\s\S]*?\});\s*n\.spot\.room/);assert.ok(spotCode,'Actual NPC spot expression found');n.spot=new Function('o','n','state','pickDialog','openDialog','runAction',`return (${spotCode[1]})`)(o,n,state,()=>({lines:[]}),()=>{},()=>{});n.spot.room=null;
 const events=[];const onBoothSource=idx.slice(idx.indexOf('function onBooth(id)'),idx.indexOf('function onService()'));assert.ok(onBoothSource.startsWith('function onBooth(id)'));
 const onBooth=new Function('F','say','openChoice','openQuiz','flags','apply','AU','toast','afterResult',`${onBoothSource}; return onBooth;`)(F,(title,lines,then)=>{events.push({type:'dialog',title,lines});then();},choices=>events.push({type:'choices',choices}),()=>{},()=>state.flags,()=>{},{sfx(){}},()=>{},()=>{});
 const ok0=n.spot.ok;n.spot.ok=()=>venue.on&&ok0();n.spot.fn=()=>onBooth('D26');
 // Execute actual nearest-spot and interaction code rather than reproducing radius comparisons.
 const loop=read('core/loop.js'),start=loop.indexOf('state.near=null; let best=99;'),end=loop.indexOf('  updateInteraction(act,',start);assert.ok(start>=0&&end>start);const select=new Function('state','dlg','pos','spots','exitCar',loop.slice(start,end));
 const gameplay=read('core/gameplay.js'),interaction=gameplay.slice(gameplay.indexOf('function interact(){'),gameplay.indexOf('function interactAlt(){'));const interact=new Function('state','dlg',`${interaction};return interact;`)(state,dlg);
 // Continuous reachable segment outside the phantom shell already exists; advance, resolve, and select.
 for(let i=0;i<=20;i++){const p=world(t,0,2.5-i*.025);assert.ok(clears(solids(t),0,2.5-i*.025));resolve(p,R);pos.copy(p);select(state,dlg,pos,[n.spot],()=>{});assert.equal(state.near,n.spot);}
 interact();assert.deepEqual(events,[{type:'dialog',title:data.npc.title,lines:data.npc.lines},{type:'choices',choices:['接受挑戰','下次再來']}]);
 venue.on=false;select(state,dlg,pos,[n.spot],()=>{});assert.equal(state.near,null);state.driving=true;venue.on=true;assert.equal(n.spot.ok(),false);
});
test('actual low front decor signs remain readable after common-poster repair (no reversed occlusion)',async()=>{
 const {api}=setup(),problems=[];const deps={THREE,toon:c=>new THREE.MeshBasicMaterial({color:c}),outlineMat:new THREE.MeshBasicMaterial({side:THREE.BackSide}),makeSignTexture:()=>null};let checked=0;
 for(const [id,t] of api.tents){const root=new THREE.Group();t.group.add(root);const mod=await load(`decor/${id}.js`);mod.default(createDecorCtx(deps,root,t.collegeColor));api.update({x:t.layout.x,z:t.layout.z});api.refreshSigns(id);api.group.updateMatrixWorld(true);
 root.traverse(p=>{if(!p.isMesh||!p.userData.bz26Sign||p.userData.bz26MainSign||p.position.z<1)return;checked++;p.geometry.computeBoundingBox();const b=p.geometry.boundingBox;let hits=0;
 for(let x=0;x<7;x++)for(let y=0;y<7;y++){const target=new THREE.Vector3(THREE.MathUtils.lerp(b.min.x,b.max.x,(x+.5)/7),THREE.MathUtils.lerp(b.min.y,b.max.y,(y+.5)/7),0).applyMatrix4(p.matrixWorld),normal=new THREE.Vector3(0,0,1).transformDirection(p.matrixWorld),ray=new THREE.Raycaster(target.clone().addScaledVector(normal,2),normal.clone().negate(),0,2-1e-4);if(ray.intersectObjects(t.parts.counter,true).some(h=>h.object.visible))hits++;}if(hits)problems.push({id,blockedSamples:hits,signPosition:p.position.toArray()});});t.group.remove(root);}
 assert.ok(checked>=6,'Known low front information signs must not disappear');assert.deepEqual(problems,[],'Do not repair poster readability by hiding existing meaningful decor signs');
});
