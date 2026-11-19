// 2026-11-06：蔣公騎馬銅像依公開報導復原（1987 年創校六十週年完工、含基座三到四層樓高、
// 馬左前腳懸空、2019 年後校友捐建雙層玻璃護欄）。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ANCHORS } from '../layout.js';
import { heightAt } from '../terrain.js';
import { STATUE, statueParts, createStatue } from '../statue.js';

const box = obj => { obj.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(obj); };

test('銅像含基座約三層樓高（遊戲高度約實際的四分之三），基座比騎馬像高', () => {
  const g = createStatue();
  const all = box(g), rider = box(g.getObjectByName('騎馬像')), base = box(g.getObjectByName('花崗石基座'));
  const h = all.max.y - all.min.y;
  assert(h > 7 && h < 9.5, `整體高度 ${h.toFixed(2)}`);
  assert(Math.abs(base.min.y) < 0.05, '基座沒有落地');
  assert(Math.abs(rider.min.y - STATUE.top) < 0.6, '騎馬像沒有站在基座頂');
  assert(STATUE.top > 3.5 && STATUE.top < 5, `基座高度 ${STATUE.top}`);
});

test('馬只有左前腳懸空，另外三隻腳踩在基座頂', () => {
  const legs = statueParts().filter(p => p.leg);
  assert.equal(legs.length, 4);
  const lifted = legs.filter(p => p.lifted);
  assert.deepEqual(lifted.map(p => p.leg), ['左前']);
  for (const p of legs.filter(p => !p.lifted)) assert(Math.abs(p.hoofY - STATUE.top) < 0.05, `${p.leg}腳沒有踩地`);
  assert(lifted[0].hoofY > STATUE.top + 0.5, '左前腳沒有抬起來');
});

test('騎士戴軍帽、披風往後飄，整座像面向好漢坡站方向', () => {
  const names = statueParts().map(p => p.name);
  for (const n of ['軍帽', '披風', '韁繩', '馬頭', '馬尾']) assert(names.includes(n), `少了${n}`);
  const g = createStatue(), a = ANCHORS['蔣公銅像'], s = ANCHORS['好漢坡站'];
  const facing = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y);
  const to = new THREE.Vector3(s.x - a.x, 0, s.z - a.z).normalize();
  assert(facing.dot(to) > 0.9, '銅像沒有面向好漢坡站');
});

test('雙層玻璃護欄圍住基座，透明、不碰到綠籬，正面有銅牌', () => {
  const g = createStatue();
  const glass = g.getObjectByName('玻璃護欄');
  assert(glass && glass.material.transparent && glass.material.opacity < 0.5);
  assert.equal(glass.userData.layers, 2);
  const gb = box(glass), base = box(g.getObjectByName('花崗石基座'));
  assert(gb.min.x < base.min.x && gb.max.x > base.max.x && gb.min.z < base.min.z && gb.max.z > base.max.z, '玻璃沒有圍住基座');
  glass.geometry.computeBoundingBox();
  const local = glass.geometry.boundingBox.clone().translate(glass.position);
  // 綠籬是正方形圓環（內緣離中心 1.9 公尺），銅像轉了角度，玻璃四角都要在內緣以內。
  const hx = Math.max(-local.min.x, local.max.x), hz = Math.max(-local.min.z, local.max.z);
  assert(Math.hypot(hx, hz) < 1.9, '玻璃壓到圓環綠籬');
  assert(g.getObjectByName('銅牌'));
  assert.equal(g.getObjectByName('銅牌').userData.text, '蔣公騎馬銅像　民國七十六年政大創校六十週年');
});

test('整座像少量網格、有描邊，放在錨點地面上', () => {
  const g = createStatue(); let meshes = 0, outlines = 0;
  g.traverse(o => { if (o.isMesh) { meshes++; if (o.material.side === THREE.BackSide) outlines++; } });
  assert(meshes <= 12, `網格太多：${meshes}`);
  assert(outlines >= 2, '騎馬像與基座要有描邊');
  const a = ANCHORS['蔣公銅像'];
  assert.equal(heightAt(a.x, a.z), 0);
});

test('環山一道的路燈不立在銅像圓環旁，燈頭不擋在銅像前面', async () => {
  const { ringRoadProps } = await import('../hillside-model.js');
  const a = ANCHORS['蔣公銅像'];
  const lamps = ringRoadProps().colliders.filter(c => c.kind === 'lamp');
  assert(lamps.length > 5);
  for (const l of lamps) assert(Math.hypot(l.x - a.x, l.z - a.z) > 7, `路燈離銅像太近：${l.x.toFixed(1)},${l.z.toFixed(1)}`);
});
