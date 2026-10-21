import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import fs from 'node:fs';
import {createDecorLoader} from '../src/systems/baozhong/decor-loader-core.js';
import {buildTents} from '../src/systems/baozhong/tents.js';
import {resolve,setActiveColliders} from '../src/core/collision.js';
const layout=JSON.parse(fs.readFileSync(new URL('../src/systems/baozhong/layout.json',import.meta.url)));const content=JSON.parse(fs.readFileSync(new URL('../src/content/baozhong.json',import.meta.url)));
test('independent: old late load cannot attach after newer remount; per-id cancel isolated',async()=>{
 let rs=[];const l=createDecorLoader({THREE,files:{'./decor/D26.js':()=>new Promise(r=>rs.push(r))},createCtx:root=>({root})});const t=new THREE.Group();const p1=l.mountDecor('D26',t);l.unmountDecor('D26');const p2=l.mountDecor('D26',t);rs[1]({default:()=>({})});await p2;rs[0]({default:()=>({})});assert.equal(await p1,null);assert.equal(t.children.length,1);assert.equal(l.pending.size,0);l.unmountAllDecor();assert.equal(t.children.length,0);
});
test('independent: actual D26 parts restore through mount/unmount cycles',async()=>{
 const api=buildTents(layout,content.colleges,{content});const t=api.tents.get('D26');const l=createDecorLoader({THREE,files:{'./decor/D26.js':async()=>({default:()=>({hideCanopy:true,hideCounter:true})})},createCtx:root=>({root})});
 for(let i=0;i<3;i++){await l.mountDecor('D26',t.group,t.collegeColor,t.parts);assert.ok([...t.parts.canopy,...t.parts.counter].every(x=>!x.visible));l.unmountAllDecor();assert.ok([...t.parts.canopy,...t.parts.counter].every(x=>x.visible&&!x.userData.bz26Hidden));}
});
test('independent: D26 NPC anchor remains outside active tent collision; visible entrance is blocked',()=>{
 const colliders=[];const api=buildTents(layout,content.colleges,{content,colliders});api.setActive(true);setActiveColliders(colliders);const t=layout.tents.find(t=>t.id==='D26');const p={x:t.anchor[0],y:0,z:t.anchor[1]};const before={...p};resolve(p);assert.deepEqual(p,before);const v=new THREE.Vector3(0,0,1.35).applyAxisAngle(new THREE.Vector3(0,1,0),t.rotY);const front={x:t.x+v.x,y:0,z:t.z+v.z},orig={...front};resolve(front);assert.notDeepEqual(front,orig);console.log('D26 collision measurements',JSON.stringify({tent:t,anchorUnchanged:p,entranceBefore:orig,entranceResolved:front,npcInteractionRadius:2.4,scope:'tent colliders only; no navigation/render certification'}));
});
