import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chooseNpcCaptureStance } from './npc-capture-stance.mjs';
import { colliders, resolve } from '../src/core/collision.js';
import { departmentNpcHome } from '../src/systems/baozhong/department-npc-placement.js';
import { collidersOf } from '../src/systems/baozhong/tents-logic.js';
import { openCanopyColliders } from '../src/systems/baozhong/open-canopy-d26.js';
const tents=JSON.parse(fs.readFileSync(new URL('../src/systems/baozhong/layout.json',import.meta.url))).tents;
const project=p=>{const copy={...p,y:0};resolve(copy,.4);return copy;};
colliders.push({c:true,x:0,z:-32,r:5.8},...tents.flatMap(t=>[...collidersOf(t),...(t.id==='D26'?openCanopyColliders(t).slice(4,6):[])]));
test('D37 fixed 3m staging intersects fountain; selected stance remains collision-free and exactly 3m away',()=>{
 const t=tents.find(t=>t.id==='D37'),home=departmentNpcHome(t);
 const old={x:home.x+3*Math.sin(t.rotY),z:home.z+3*Math.cos(t.rotY)},pushed=project(old);
 assert.ok(Math.hypot(old.x-pushed.x,old.z-pushed.z)>.8);
 const choice=chooseNpcCaptureStance({position:[home.x,0,home.z],face:t.rotY},project);
 assert.notEqual(choice.offset,0);const p={x:choice.player[0],z:choice.player[2]},resolved=project(p);
 assert.ok(Math.hypot(p.x-resolved.x,p.z-resolved.z)<.005);
 assert.ok(Math.abs(Math.hypot(p.x-home.x,p.z-home.z)-3)<1e-9);
 const natural={x:home.x+1.1*Math.sin(t.rotY),z:home.z+1.1*Math.cos(t.rotY)};
 const approached=project(natural);assert.ok(Math.hypot(natural.x-approached.x,natural.z-approached.z)<.005);
});
test('all37 department staging candidates clear venue and fountain colliders without changing NPC position',()=>{
 for(const t of tents.filter(t=>t.id.startsWith('D'))){const h=departmentNpcHome(t),input={position:[h.x,0,h.z],face:t.rotY},before=JSON.stringify(input);
  const s=chooseNpcCaptureStance(input,project);assert.equal(JSON.stringify(input),before);assert.equal(s.distance,3);
 }
});
test('clear straight stance is kept; blocked candidates fail closed rather than weaken assertions',()=>{
 const input={position:[0,0,0],face:0};assert.equal(chooseNpcCaptureStance(input,p=>p).offset,0);
 assert.throws(()=>chooseNpcCaptureStance(input,p=>({x:p.x+1,z:p.z})),/No collision-free/);
});
test('capture function is self-contained for Playwright serialization',()=>{
 const serialized=Function(`return (${chooseNpcCaptureStance.toString()})`)();
 assert.deepEqual(serialized({position:[1,0,2],face:0},p=>p),{player:[1,0,5],offset:0,radius:.4,distance:3});
 const script=fs.readFileSync(new URL('./baozhong-scenery-screenshots.mjs',import.meta.url),'utf8');
 assert.match(script,/page\.evaluate\(chooseNpcCaptureStance/);
 assert.match(script,/facing > \.99995/);assert.match(script,/distance > 2\.9 && distance < 3\.1/);
});
