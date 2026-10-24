import test from 'node:test';
import assert from 'node:assert/strict';
import {ATRIUM_LEVELS,atriumFurniture,clampAtrium,atriumHeight} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {publicFloor,floorContains} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
const intersects=(p,b)=>Math.hypot(p.x-Math.max(b.x0,Math.min(p.x,b.x1)),p.z-Math.max(b.z0,Math.min(p.z,b.z1)))<.4-1e-5;
test('上層家具重疊恢復不能被相鄰椅子推回桌內，恢復位置仍有同層樓板',()=>{
 const known={x0:-.5,x1:.5,z0:-.5,z1:.5};assert.equal(intersects({x:.89,z:0},known),true);assert.equal(intersects({x:.9,z:0},known),false,'已知相切圓校準');
 for(const [label,x,z]of [['3F',-1.048,2.516],['4F',2.131,-2.108],['5F',6.14,-6.414],['7F',9.67,-9.916]]){
  const l=ATRIUM_LEVELS.find(l=>l.label===label),p={x,y:l.y,z},boxes=atriumFurniture(l);
  assert.ok(boxes.some(b=>intersects(p,b)),'固定重現案例確實在家具內 '+label);
  clampAtrium(p);
  assert.ok(!boxes.some(b=>intersects(p,b)),'角色仍穿入桌／椅 '+JSON.stringify({label,p}));
  assert.equal(atriumHeight(p.x,p.z,p.y),l.y,'不能推到樓梯或其他樓層');
  for(let i=0;i<16;i++)assert.ok(floorContains(publicFloor(label),p.x+.4*Math.cos(i*Math.PI/8),p.z+.4*Math.sin(i*Math.PI/8)),'整個角色腳下仍有樓板');
  const stable={...p};clampAtrium(p);assert.ok(Math.hypot(p.x-stable.x,p.z-stable.z)<.001,'下一幀不能來回抖動');
 }
});
