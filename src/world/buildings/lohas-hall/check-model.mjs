/** 樂活館的幾何、柱廊、階梯、碰撞、鏡頭、方位及字型重畫回歸測試。 */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLohasHall } from './model.js';
import { LOHAS, localHeightAt, localCollisionBoxes, localExcludesGrass } from './layout.js';
import { boxC, colliders, resolve } from '../../../core/collision.js';
import { bdZ } from '../../layout.js';

const context = { clearRect() {}, fillRect() {}, fillText() {} };
globalThis.document = { createElement(tag) { assert.equal(tag, 'canvas'); return { width: 0, height: 0, getContext() { return context; } }; } };
const model = createLohasHall(); model.updateMatrixWorld(true);
const counts = { drawables: 0, triangles: 0, instances: 0, materials: new Set(), textures: new Set(), occluders: [] };
const exactBounds = new THREE.Box3();
model.traverse(o => {
  if (!o.isMesh) return;
  counts.drawables++; counts.triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * (o.count ?? 1);
  counts.materials.add(o.material); if (o.material.map) counts.textures.add(o.material.map);
  o.geometry.computeBoundingBox();
  for (let i = 0; i < (o.isInstancedMesh ? o.count : 1); i++) {
    const m = new THREE.Matrix4(); if (o.isInstancedMesh) { o.getMatrixAt(i, m); m.premultiply(o.matrixWorld); counts.instances++; } else m.copy(o.matrixWorld);
    exactBounds.union(o.geometry.boundingBox.clone().applyMatrix4(m));
  }
  const size = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
  if (!o.isInstancedMesh && ['BoxGeometry', 'ExtrudeGeometry'].includes(o.geometry.type) && Math.max(size.x, size.z) > 1.4 && size.y > .25) counts.occluders.push(o);
});
assert(counts.drawables <= 40); assert(counts.triangles < 7000);
for (const c of localCollisionBoxes()) { assert(c[0] < c[1] && c[2] < c[3]); boxC(...c); }

const near = (a, b, e = 1e-5) => assert(Math.abs(a - b) < e, `${a} != ${b}`);
const ray = new THREE.Raycaster();
const surfaces = model.children.filter(o => o.name === '柱廊入口平台' || o.isInstancedMesh && o.material.color.getHexString() === new THREE.Color('#c7ccc1').getHexString());
let samples = 0, maxError = 0;
for (let x = LOHAS.wingLeft + .013; x < LOHAS.arcadeRight; x += .047) for (let z = LOHAS.stairFront + .023; z < LOHAS.wingBack; z += .067) {
  const h = localHeightAt(x, z); assert(h !== null);
  ray.set(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0));
  const hit = ray.intersectObjects(surfaces, false)[0]; assert(hit, `缺少行走表面：${x},${z}`);
  const e = Math.abs(hit.point.y - h); assert(e < 1e-5, `高度不一致：${x},${z}`); maxError = Math.max(maxError, e); samples++;
}
for (const [x, z] of [[0, 0], [-21, 0], [-17, -6.41], [-17, 4.61]]) assert.equal(localHeightAt(x, z), null);
// 草葉任意朝向及最大風擺的水平半徑小於 0.3 公尺，邊緣亦不可穿出樓板。
const grassReach = Math.hypot(.05 + .2, .1);
assert(grassReach < .3);
for (let x = LOHAS.wingLeft; x <= LOHAS.arcadeRight; x += .1) for (let z = LOHAS.stairFront; z <= LOHAS.wingBack; z += .1) {
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) assert(localExcludesGrass(x + Math.cos(angle) * grassReach, z + Math.sin(angle) * grassReach));
}
for (const [x, z] of [[0, 0], [-14, 0], [12.9, -5.5], [-20.55, 0], [-17, -6.65]]) assert(localExcludesGrass(x, z));
for (const [x, z] of [[-21, 0], [-17, -6.71], [-17, 4.91], [14, 0], [0, 5.36], [-17, -15], [-38, -3], [74, -11]]) assert(!localExcludesGrass(x, z));
for (let i = 0; i <= LOHAS.stairCount; i++) {
  const z = LOHAS.stairFront + i * (LOHAS.wingFront - LOHAS.stairFront) / LOHAS.stairCount;
  const h = localHeightAt(-17.2, z);
  assert(h > 0 && h <= LOHAS.landingHeight);
  if (i > 0) assert(Math.abs(h - localHeightAt(-17.2, z - 1e-8)) <= .180001);
}

/** 以遊戲原本的角色半徑及 resolve 跑一條可達路徑。 */
function path(waypoints) {
  const p = new THREE.Vector3(waypoints[0][0], 0, waypoints[0][1]); const heights = [localHeightAt(p.x, p.z) ?? 0];
  for (const [x, z] of waypoints.slice(1)) {
    const start = p.clone(), distance = Math.hypot(x - p.x, z - p.z), n = Math.ceil(distance / .015);
    for (let i = 1; i <= n; i++) { p.x = start.x + (x - start.x) * i / n; p.z = start.z + (z - start.z) * i / n; const expected = p.clone(); resolve(p); near(p.x, expected.x); near(p.z, expected.z); heights.push(localHeightAt(p.x, p.z) ?? 0); }
  }
  return { end: p.toArray(), levels: [...new Set(heights)] };
}
const stairs = path([[-17.15, -7.0], [-17.15, -3.7], [-17.15, 3.7]]);
const acrossArcade = path([[-21.5, 1.9], [-16.1, 1.9]]);
const westDoor = path([[10.75, -7], [10.75, -4.76]]);
assert(stairs.levels.every((h, i, a) => !i || h >= a[i - 1]));
for (const [x0, x1, z0, z1] of localCollisionBoxes()) { const p = { x: (x0 + x1) / 2, y: .72, z: (z0 + z1) / 2 }; const before = { ...p }; resolve(p); assert(Math.hypot(p.x - before.x, p.z - before.z) > .01); }

const rays = [];
for (const [name, origin, direction] of [
  ['南向長牆', [0, 2, -9], [0, 0, 1]], ['北向後牆', [0, 2, 8], [0, 0, -1]],
  ['西端入口後牆', [10.75, 1.5, -7], [0, 0, 1]], ['西端雨棚', [10.75, 1.2, -5.8], [0, 1, 0]],
  ['柱廊內牆', [-18, 2, 1.9], [1, 0, 0]], ['架空低翼樓板', [-18, 1.7, 1.9], [0, 1, 0]],
  ['玻璃翼牆', [-23, 6, 1], [1, 0, 0]], ['玻璃翼低屋頂', [-18, 12, 0], [0, -1, 0]],
  ['西端塔樓', [16, 10, 0], [-1, 0, 0]], ['主棟上層', [0, 8, -9], [0, 0, 1]],
]) { ray.set(new THREE.Vector3(...origin), new THREE.Vector3(...direction)); const hit = ray.intersectObjects(counts.occluders, false)[0]; assert(hit, `鏡頭漏牆：${name}`); rays.push({ name, hit: hit.object.name, distance: hit.distance }); }

// 校門在較小 X；八德道在較小 Z。擴出的低翼不侵入既有門房、樓梯、樹幹或圍籬。
assert.equal(LOHAS.frontNormal.x, 0); assert.equal(LOHAS.frontNormal.z, -1);
assert(bdZ(LOHAS.x) < LOHAS.z + LOHAS.front);
const worldBounds = exactBounds.clone().translate(new THREE.Vector3(LOHAS.x, 0, LOHAS.z));
assert(worldBounds.min.x > 16.8); assert(worldBounds.max.z < 9); assert(worldBounds.min.x > 15.2 + 1.5);
for (const [tx, tz, radius] of [[12.6, 1.5, .8], [15.5, -1.2, .8]]) for (const [x0, x1, z0, z1] of localCollisionBoxes()) {
  const dx = tx - Math.max(x0 + LOHAS.x, Math.min(x1 + LOHAS.x, tx));
  const dz = tz - Math.max(z0 + LOHAS.z, Math.min(z1 + LOHAS.z, tz));
  assert(Math.hypot(dx, dz) > radius + .4);
}
for (const [x0, x1, z0, z1] of localCollisionBoxes()) {
  assert(!(x0 + LOHAS.x < 15.2 && x1 + LOHAS.x > 4.8 && z0 + LOHAS.z < 16.2 && z1 + LOHAS.z > 7.8));
  assert(z1 + LOHAS.z < 11.3);
}
// 獨立樹冠三角形裁切與全角度掃掠的最外緣，含黑色描邊。
// 保留至少 0.15 公尺的柱／樓板間距，避免隨機樹冠轉向才出現交疊。
const soffit = new THREE.Box3().setFromObject(model.getObjectByName('低翼下緣厚樓板'));
const glassWing = new THREE.Box3().setFromObject(model.getObjectByName('玻璃低翼上層'));
assert(soffit.min.x + LOHAS.x - 17.750906 > .15);
assert(LOHAS.columnX - .22 + LOHAS.x - 17.868460 > .15);
assert(glassWing.min.x + LOHAS.x - 17.639374 > .04);
for (const t of counts.textures) { assert.equal(typeof t.redraw, 'function'); const v = t.version; t.redraw(); assert(t.version > v); }
console.log(JSON.stringify({ metadata: model.userData, drawables: counts.drawables, instances: counts.instances, triangles: counts.triangles, materials: counts.materials.size, textures: counts.textures.size, heightChecks: { samples, maxError }, localBounds: { min: exactBounds.min.toArray(), max: exactBounds.max.toArray() }, worldBounds: { min: worldBounds.min.toArray(), max: worldBounds.max.toArray() }, stairs, acrossArcade, westDoor, cameraRays: rays, colliders: colliders.length }, null, 2));
console.log('PASS：幾何、階梯高度、柱廊通行、固定障礙、鏡頭、校門間距、方位與字型重畫。');
