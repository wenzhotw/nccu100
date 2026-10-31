import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';
test('退台下樓的身體碰到樓板底部時向下退讓，不被當成側牆推出走道',async()=>{
 const {clampAtriumCeiling}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');assert.equal(typeof clampAtriumCeiling,'function');
 const p={x:5.591,y:dahFloorY('7F')-.32-1.8+.12,z:-10.676};assert.equal(clampAtriumCeiling(p),true);assert.ok(Math.abs(p.y-(dahFloorY('7F')-.32-1.8))<1e-6);assert.equal(p.x,5.591);assert.equal(p.z,-10.676);
 const clear={x:0,y:21.2,z:0};assert.equal(clampAtriumCeiling(clear),false,'挑空中沒有假天花');assert.equal(clear.y,21.2);
 const above={x:11,y:dahFloorY('7F'),z:0};assert.equal(clampAtriumCeiling(above),false,'站在樓板上的角色不被吸到下面');assert.equal(above.y,dahFloorY('7F'));
});

test('8F新增迴廊頂板會擋住跳躍，中庭採光挑空不會有看不見的天花',async()=>{
 const {clampAtriumCeiling}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const p={x:0,y:dahFloorY('8F')+dahRoomHeight('8F')-1.8+.15,z:15.8};assert.equal(clampAtriumCeiling(p),true);assert.ok(Math.abs(p.y-(dahFloorY('8F')+dahRoomHeight('8F')-1.8))<1e-8,'新頂板底減角色高度1.8');
 const voidPoint={x:0,y:dahFloorY('8F')+dahRoomHeight('8F')-1.8+.15,z:0};assert.equal(clampAtriumCeiling(voidPoint),false);assert.equal(voidPoint.y,dahFloorY('8F')+dahRoomHeight('8F')-1.8+.15);
});

test('主樓層後區跳躍會被真正天花擋住，阻擋高度與模型底面一致',async()=>{
 const THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{clampAtriumCeiling}=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{MAIN_FLOORS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const model=createInteriorModel();model.updateMatrixWorld(true);
 for(const id of ['3F','4F','5F','7F']){
  const floor=MAIN_FLOORS.find(f=>f.id===id),x=0,z=18,ray=new THREE.Raycaster(new THREE.Vector3(x,floor.y+1,z),new THREE.Vector3(0,1,0),0,4),hit=ray.intersectObject(model,true).find(h=>h.object.name==='公開後區裸露天花'&&h.object.userData.rearCeilingFloor===id||h.object.name==='8F封閉房間樓板'&&id==='7F');assert.ok(hit,'測試站位有實體天花或上層房間底板 '+id);
  const p={x,y:hit.point.y-1.7,z};assert.equal(clampAtriumCeiling(p),true,id+'頭部不得穿出天花');assert.ok(Math.abs(p.y+1.8-hit.point.y)<1e-6,'實體與阻擋底面一致 '+id);assert.equal(p.x,x);assert.equal(p.z,z);
 }
});

test('後區天花不能穿過上方夾層樓板，也不能把站在夾層的人壓回樓下',async()=>{
 const THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{ATRIUM_LEVELS,clampAtriumCeiling}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const model=createInteriorModel();model.updateMatrixWorld(true);
 for(const id of ['3MF','4MF','6F']){const l=ATRIUM_LEVELS.find(l=>l.label===id),p={x:l.east+2.45,y:l.y,z:3},before={...p};assert.equal(clampAtriumCeiling(p),false,'站在本層地板上不能被較低天花壓下 '+id);assert.deepEqual(p,before);
 const ray=new THREE.Raycaster(new THREE.Vector3(p.x,l.y+.01,p.z),new THREE.Vector3(0,1,0),0,.3);assert.equal(ray.intersectObject(model,true).some(h=>h.object.name==='公開後區裸露天花'),false,'夾層樓板上方不能殘留低樓層天花 '+id);}
});

test('後區天花不能橫封退台梯的高段洞口，角色沿梯面有完整頭部淨空',async()=>{
 const THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{ALL_PUBLIC_STAIRS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js'),{clampAtriumCeiling}=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),model=createInteriorModel();model.updateMatrixWorld(true);
 for(const s of ALL_PUBLIC_STAIRS.filter(s=>!s.entry))for(const t of [.7,.8,.9,.98]){const p={x:s.a.x+(s.b.x-s.a.x)*t,y:s.a.y+(s.b.y-s.a.y)*t,z:s.a.z+(s.b.z-s.a.z)*t},before={...p};clampAtriumCeiling(p);assert.ok(Math.abs(p.y-before.y)<1e-6,'梯面角色不可被低樓層天花壓下 '+JSON.stringify({s,t,p,before}));const hits=new THREE.Raycaster(new THREE.Vector3(p.x,p.y+.01,p.z),new THREE.Vector3(0,1,0),0,1.79).intersectObject(model,true);assert.equal(hits.some(h=>h.object.name==='公開後區裸露天花'),false,'梯口高段不得殘留天花');}
});
