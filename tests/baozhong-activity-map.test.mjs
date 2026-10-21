import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activityEntries,filterActivity,activityDirection,activityBounds} from '../src/systems/baozhong/activity-map-logic.js';
import {signPlacement} from '../src/systems/baozhong/activity-sign-logic.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const layout=read('../src/systems/baozhong/layout.json'),content=read('../src/content/baozhong.json');
const entries=activityEntries(layout,content);
test('地圖四十攤完全沿用配置座標及內容學院色',()=>{
  assert.equal(entries.length,40); assert.equal(entries.filter(e=>e.id.startsWith('D')).length,37);
  for(const e of entries){const t=layout.tents.find(t=>t.id===e.id);assert.equal(e.x,t.x);assert.equal(e.z,t.z);assert.deepEqual(e.anchor,t.anchor);}
  const d=entries.find(e=>e.id==='D26');const b=content.booths.find(b=>b.id==='D26');assert.equal(d.name,b.dept);assert.equal(d.color,content.colleges.find(c=>c.id===b.college).color);
});
test('搜尋、學院篩選及 D26 指引只讀，不傳送',()=>{
  assert.equal(filterActivity(entries,'d26')[0].id,'D26');
  assert.equal(filterActivity(entries,'不存在的攤位').length,0);
  const d=entries.find(e=>e.id==='D26');assert.ok(filterActivity(entries,'',d.college).every(e=>e.college===d.college));
  const p=Object.freeze({x:0,z:-32});const direction=activityDirection(p,d);assert.ok(direction.distance>0);assert.ok(direction.dx<0);assert.ok(direction.dz<0);assert.equal(activityDirection({x:d.anchor[0],z:d.anchor[1]},d).label,'已到攤位附近');
});
test('玩家在範圍外仍可繪製，室內不混入座標',()=>{
  const b=activityBounds(entries,{x:170,z:20});assert.ok(b.maxX>170);assert.ok(b.maxZ>20);assert.ok(activityBounds(entries,null).maxX<100);
});
test('噴水池西側看板不碰池緣、大道或現存碰撞，無空位拒絕建立',()=>{
  const fountain={c:true,x:0,z:-32,r:5.8};const p=signPlacement(-32,[fountain]);assert.equal(p.z,-35.7);assert.ok(p.box.x1 < -6.3);assert.ok(p.box.z1 < -34.2);
  const obstacle={x0:-7.5,x1:-7,z0:-36,z1:-35.5};assert.ok(signPlacement(-32,[fountain,obstacle]).x < -10.2);
  assert.throws(()=>signPlacement(-32,[{x0:-20,x1:-6,z0:-40,z1:-20}]));
});

test('看板避開所有實際配置帳篷與近旁樹幹，保留橫向步道',()=>{
  const futureTents=layout.tents.map(t=>({x0:t.box[0],x1:t.box[1],z0:t.box[2],z1:t.box[3]}));
  const fixed=[{c:true,x:0,z:-32,r:5.8},{c:true,x:-10.5,z:-39.5,r:.48},{c:true,x:-17.5,z:-36.5,r:.4}];
  const p=signPlacement(-32,[...futureTents,...fixed]);assert.equal(p.x,-10.2);assert.equal(p.z,-35.7);assert.ok(p.box.z1 < -34.2);
});
