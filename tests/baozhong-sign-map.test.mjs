import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {signMapModel,drawSignMap} from '../src/systems/baozhong/activity-sign-map.js';
import {signPlacement} from '../src/systems/baozhong/activity-sign-logic.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const layout=read('../src/systems/baozhong/layout.json'),content=read('../src/content/baozhong.json');
test('printed sign uses all 42 true positions and source college colors',()=>{
const m=signMapModel(layout,content,{x:0,z:-32});assert.equal(m.entries.length,42);
for(const e of m.entries.filter(e=>!['FM','X'].includes(e.id))){const t=layout.tents.find(t=>t.id===e.id);assert.equal(e.x,t.x);assert.equal(e.z,t.z);}
const texts=[]; const ctx=new Proxy({}, {get:(o,k)=>o[k]||(k==='fillText'?((t)=>texts.push(t)):(()=>{})),set:(o,k,v)=>(o[k]=v,true)});drawSignMap(ctx,1536,800,m);assert.ok(texts.includes('26'));assert.ok(texts.some(t=>t.includes('噴水池')));assert.equal(m.legend.length,13);assert.ok(texts.includes('FM'));
});
test('sign avoids real campus snapshot blocker omitted from first synthetic test',()=>{
const c=[{c:true,x:0,z:-32,r:5.8},{x0:-13.9,x1:-12.9,z0:-41.5,z1:-35.5}];
const p=signPlacement(-32,c);assert.equal(p.x,-9.6);assert.ok(p.box.x0 > -12.9+.45);assert.ok(p.box.x1 < -6.3);assert.ok(p.approach.z1 < -32);
});
test('blocked placement provides precise diagnostic and does not erase obstacles',()=>{
const obstacle={x0:-30,x1:10,z0:-50,z1:-20};const cs=[obstacle];try{signPlacement(-32,cs);assert.fail('must reject')}catch(e){assert.equal(e.placements.length,5);assert.ok(e.placements.every(p=>p.blocking[0]===obstacle));}assert.deepEqual(cs,[obstacle]);
});
