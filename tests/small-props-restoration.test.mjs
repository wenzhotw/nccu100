import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as THREE from 'three';
import {buildTents} from '../src/systems/baozhong/tents.js';
import {SMALL_PROP_IDS} from '../src/systems/baozhong/small-props.js';
import {colliderClearance} from '../src/systems/baozhong/tents-logic.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const layout=read('../src/systems/baozhong/layout.json'),content=read('../src/content/baozhong.json');
test('37 source props are real tabletop meshes, all old walls return, only one D26 torii remains',()=>{
 assert.deepEqual(SMALL_PROP_IDS,content.booths.map(b=>b.id).sort());
 const colliders=[],api=buildTents(layout,content.colleges,{content,restoreSmallProps:true,colliders}),old=buildTents(layout,content.colleges,{content});const metrics=[];
 for(const [id,t]of api.tents){const before=old.tents.get(id);assert.equal(t.parts.walls.length,3,id);for(const k of ['canopy','frame','counter'])assert.equal(t.parts[k].length,before.parts[k].length,id);assert.deepEqual(t.info,before.info);assert.deepEqual(t.layout,before.layout);
 let torii=0,giant=0;t.group.traverse(o=>{if(o.userData.bz26ToriiPost)torii++;if(o.name.startsWith('bz26-landmark-'))giant++;});assert.equal(giant,0,id);assert.equal(torii,id==='D26'?2:0,id);
 if(!SMALL_PROP_IDS.includes(id)){assert.equal(t.parts.smallProp,undefined);continue;}
 assert.ok(t.parts.smallProp.length>=3,id);const b=t.group.userData.bz26SmallProp.bounds;assert.ok(b.min[0]>=-.68&&b.max[0]<=.68,id);assert.ok(b.min[1]>=.779&&b.max[1]<=1.501,id);assert.ok(b.min[2]>=.749&&b.max[2]<=1.251,id);
 const root=t.group.getObjectByName(`bz26-small-prop-${id}`);assert.equal(root.userData.bz26PropSource,content.booths.find(b=>b.id===id).prop);let meshes=0,triangles=0;root.traverse(o=>{assert.ok(!o.isLight);if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;assert.ok(['MeshToonMaterial','MeshBasicMaterial'].includes(o.material.type));}});assert.ok(triangles<6000,id);metrics.push({id,meshes,triangles,scale:t.group.userData.bz26SmallProp.scale,bounds:b});
 }
 api.setActive(true);const count=colliders.length;assert.ok(count>0);api.setActive(false);assert.equal(colliders.length,0);api.setActive(true);assert.equal(colliders.length,count);
 for(const t of layout.tents){const p={x:t.anchor[0],z:t.anchor[1]};assert.ok(colliders.every(c=>colliderClearance(p,c)>=.35),`${t.id} NPC anchor`);}
 fs.writeFileSync(new URL('../docs/baozhong/small-props-metrics.json',import.meta.url),JSON.stringify(metrics,null,2));
});
test('live integration cannot remount legacy department scenery and keeps the entrance guide',()=>{
 const s=fs.readFileSync(new URL('../src/systems/baozhong/index.js',import.meta.url),'utf8');assert.match(s,/createTents\(LAYOUT, CONTENT, BOOTHS, \{ restoreSmallProps: true \}\)/);assert.match(s,/if \(SMALL_PROP_IDS.includes\(T.id\)\) continue/);assert.match(s,/const SCENERY = true/);assert.match(s,/createActivitySign/);assert.match(s,/mountActivityMap/);
});
