// GPT author B tests. Independent reviewer must retain separate regressions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { TENT, collidersOf, colliderOf, relocateSign } from '../src/systems/baozhong/tents-logic.js';
import { buildTents } from '../src/systems/baozhong/tents.js';
import { createDecorCtx } from '../src/systems/baozhong/decor-ctx.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const layout=read('../src/systems/baozhong/layout.json');
const content=read('../src/content/baozhong.json');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const deps={THREE,toon:c=>new THREE.MeshBasicMaterial({color:c}),outlineMat:new THREE.MeshBasicMaterial({side:THREE.BackSide}),makeSignTexture:()=>null};
const affected=['D13','D16','D17','D18','F01','F02'];
test('8 finite physical OBBs per tent use exact rendered rotations, dimensions, and ground offsets',()=>{
 const api=buildTents(layout,content.colleges,{content,heightAt:()=>3,colliders:[]});
 api.group.updateMatrixWorld(true);
 for(const [id,t] of api.tents){const cs=collidersOf(t.layout,3);assert.equal(cs.length,8);
 const meshes=[...t.parts.walls,...t.parts.frame.filter(m=>m.geometry.type==='CylinderGeometry'),t.parts.counter[0]];
 for(let i=0;i<8;i++){const c=cs[i],m=meshes[i],world=m.getWorldPosition(new THREE.Vector3());close(c.cx,world.x);close(c.cz,world.z);close(c.cs,Math.cos(t.layout.rotY));close(c.sn,Math.sin(t.layout.rotY));
 assert.ok([c.cx,c.cz,c.hx,c.hz,c.cs,c.sn,c.top].every(Number.isFinite));assert.ok(c.hx>0&&c.hz>0);
 close(c.top,3+(i<3?1.8:i<7?2.2:.75));
 }
 close(cs[0].hx,.005);close(cs[0].hz,1.45);close(cs[1].hx,1.45);close(cs[1].hz,.005);
 for(const c of cs.slice(3,7)){close(c.hx,.035);close(c.hz,.035);}
 close(cs[7].hx,.8);close(cs[7].hz,.3);
 assert.deepEqual(colliderOf(t.layout),Object.fromEntries(['x0','x1','z0','z1','top'].map((k,i)=>[k,t.layout.box[i]])));
 }
});
test('counter header relocation is bounded, idempotent, keeps main-sign marker semantics',()=>{
 const input={x:0,y:.45,z:1.32,w:.9,h:.2};const at=relocateSign(input);close(at.y,.78);assert.equal(at.moved,false);assert.deepEqual(relocateSign({...input,...at}),at);
 for(const change of [{z:1},{z:1.4},{x:1},{y:1},{ry:.5}]){const o={...input,...change};const a=relocateSign(o);assert.deepEqual(a,{x:o.x,y:o.y,z:o.z,ry:o.ry||0,moved:false});}
 assert.deepEqual(relocateSign({x:0,y:3.25,z:0}),{x:0,y:2.22,z:1.5,ry:0,moved:true});
});
test('all 40 actual modules: exactly six secondary labels move; every other decor mesh stays authored',async()=>{
 const changed=[];
 for(const t of layout.tents){const root=new THREE.Group(),ctx=createDecorCtx(deps,root,'#777777');
 const captured=[];const wrapper={...ctx,sign:(text,o)=>{const m=ctx.sign(text,o);captured.push({text,o,m});return m;}};
 const mod=await import(`../src/systems/baozhong/decor/${t.id}.js`);mod.default(wrapper);
 for(const {o,m} of captured){if(o.x===0&&o.y===3.25&&o.z===0){assert.equal(m.userData.bz26MainSign,true);continue;}
 if(Math.abs(m.position.y-(o.y||0))>1e-6){changed.push(t.id);close(m.position.y,.78);close(m.position.x,o.x);close(m.position.z,o.z);assert.ok(!m.userData.bz26MainSign);close(m.geometry.parameters.width,.9);close(m.geometry.parameters.height,.2);}else{assert.deepEqual(m.position.toArray(),[o.x||0,o.y||0,o.z||0]);close(m.rotation.y,o.ry||0);}}
 }
 assert.deepEqual(changed.sort(),affected.sort());
});
test('lifted six label planes physically clear all authored solids and retain plausible table-edge mounting',async()=>{
 for(const id of affected){const root=new THREE.Group();(await import(`../src/systems/baozhong/decor/${id}.js`)).default(createDecorCtx(deps,root,'#777777'));root.updateMatrixWorld(true);
 const label=root.children.find(m=>m.userData.bz26Sign&&!m.userData.bz26MainSign);assert.ok(label);const lb=new THREE.Box3().setFromObject(label);
 assert.ok(lb.min.y>TENT.posters.y+TENT.posters.h/2);assert.ok(lb.min.y<TENT.table.h&&lb.max.y>TENT.table.h);assert.ok(lb.min.x>=TENT.table.x0&&lb.max.x<=TENT.table.x1);close(lb.min.z-TENT.table.z1,.02);
 root.traverse(m=>{if(!m.isMesh||m===label)return;const b=new THREE.Box3().setFromObject(m);assert.ok(!(b.min.x<lb.max.x&&b.max.x>lb.min.x&&b.min.y<lb.max.y&&b.max.y>lb.min.y&&b.min.z<lb.min.z&&b.max.z>lb.max.z),`${id} label intersects a decor mesh`);});
 }
});
test('frozen content, API/state dependencies and all 40 decor source bytes preserved',()=>{
 // 保留原候選的不可變檔案契約，但不複製整份舊基線到新 main。
 const baseline=read('./baozhong-baseline-sha256.json');
 for(const [rel,hash] of Object.entries(read('./baozhong-v2-lock.json'))) {
   assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+rel,import.meta.url))).digest('hex'),hash,rel);
 }
 const mutable=['systems/baozhong/tents-logic.js','systems/baozhong/tents.js','systems/baozhong/index.js','systems/baozhong/deps.js'];
 for(const [rel,hash] of Object.entries(baseline)) if(!mutable.includes(rel)) {
   assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../src/'+rel,import.meta.url))).digest('hex'),hash,rel);
 }
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../src/content/baozhong.json',import.meta.url))).digest('hex'),'a686d5565cd8d36319d58e20579a4b5b713c4bfbd5c8f67541345a1d9fc9ca72');
});
