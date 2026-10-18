/** 灰盒以真實碰撞與射線驗證行走、地表及手機幾何預算，不載入瀏覽器引擎。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { registerHooks } from 'node:module';
import { resolve, setActiveColliders, setRoomClamp, colliders } from '../../../../core/collision.js';
import { R, STAIRS, RAMPS, LAYOUT, FLOOR_H, LEVELS, ANCHORS } from '../layout.js';
import { heightAt, platformLevel, wallSegments } from '../terrain.js';

function distance(p, c) {
  const dx = p.x - c.cx, dz = p.z - c.cz;
  return Math.hypot(Math.max(0, Math.abs(dx * c.cs - dz * c.sn) - c.hx),
    Math.max(0, Math.abs(dx * c.sn + dz * c.cs) - c.hz));
}

function path(points, colliders) {
  setActiveColliders(colliders);
  setRoomClamp(() => {});
  const p = { x: points[0][0], z: points[0][1], y: 0 };
  const visited = [{ ...p }];
  try {
    for (const target of points.slice(1)) {
      const start = { ...p }, length = Math.hypot(target[0] - start.x, target[1] - start.z);
      for (let i = 1; i <= Math.ceil(length / 0.02); i++) {
        const t = i / Math.ceil(length / 0.02);
        const intended = { x: start.x + (target[0] - start.x) * t, z: start.z + (target[1] - start.z) * t };
        const previous = visited.at(-1).intended ?? start;
        p.x += intended.x - previous.x; p.z += intended.z - previous.z;
        p.y = heightAt(p.x, p.z); resolve(p);
        visited.push({ ...p, intended });
      }
    }
    return { p, visited };
  } finally { setActiveColliders([]); setRoomClamp(null); }
}

test('擋土牆雙向擋住玩家，停下時不留在碰撞體裡', async () => {
  // 拿掉牆碰撞會讓兩次行走都跨越 z 約 −36.5 的分層邊界。
  const { greyboxColliders } = await import('../greybox.js');
  const walls = greyboxColliders().filter(c => c.kind === 'wall');
  assert(walls.length > 0);
  assert.equal(distance({ x: 0, z: 2 }, { cx: 0, cz: 0, cs: 1, sn: 0, hx: 1, hz: 1 }), 1);
  for (const [from, to, side] of [[-30, -40, 1], [-40, -30, -1]]) {
    const { p } = path([[-60, from], [-60, to]], walls);
    const boundary = -33 + (p.x + 71.1) / (-41.9 + 71.1) * (-42.7 + 33);
    assert((p.z - boundary) * side > 0, `穿牆：${p.z}`);
    for (const c of walls) assert(distance(p, c) >= 0.4 - 1e-6, `卡牆：${distance(p, c)}`);
  }
});

function counts(group) {
  let meshes = 0, triangles = 0;
  group.traverse(o => {
    if (!o.isMesh) return;
    meshes++;
    triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * (o.count ?? 1);
  });
  return { meshes, triangles };
}

test('灰盒含所有實例與描邊仍在手機幾何預算內', async () => {
  const calibration = new THREE.Group();
  calibration.add(new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 3));
  assert.deepEqual(counts(calibration), { meshes: 1, triangles: 36 });
  const { createGreybox } = await import('../greybox.js');
  const budget = counts(createGreybox());
  assert(budget.meshes <= 40, `Mesh ${budget.meshes} 超過 40`);
  assert(budget.triangles <= 60000, `三角形 ${budget.triangles} 超過 60000`);
});

function project(x, z, points) {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1], [bx, bz] = points[i];
    const dx = bx - ax, dz = bz - az;
    if (dx === 0 && dz === 0) continue;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

test('平台挖槽後，射線地表高度符合平台、階梯與坡道查詢', async () => {
  // 未挖槽的平台或漏畫的踏面會直接被真實 Three.js 射線抓到。
  const { createGreybox } = await import('../greybox.js');
  const model = createGreybox(); model.updateMatrixWorld(true);
  const surfaces = model.children.filter(m => m.userData.surface);
  const ray = new THREE.Raycaster(), walls = wallSegments();
  let samples = 0;
  for (let x = R.x0; x <= R.x1; x += 2) for (let z = R.z0; z <= R.z1; z += 2) {
    if (walls.some(w => project(x, z, [w.a, w.b]) < 1)) continue;
    ray.set(new THREE.Vector3(x, 40, z), new THREE.Vector3(0, -1, 0));
    const hits = ray.intersectObjects(surfaces, false);
    assert(hits.length, `地表缺口：${x},${z}`);
    const stair = STAIRS.some(s => project(x, z, s.path) <= s.width / 2);
    const ramp = RAMPS.some(s => project(x, z, s.path) <= s.width / 2);
    const tolerance = stair ? 0.31 : ramp ? 0.06 : 0.01;
    assert(Math.abs(hits[0].point.y - heightAt(x, z)) <= tolerance,
      `地表不合：${x},${z}，模型 ${hits[0].point.y}，高度 ${heightAt(x, z)}`);
    samples++;
  }
  assert(samples > 9000);
});

test('沿好漢坡主線可以從下端外半公尺走到頂端', async () => {
  const { greyboxColliders } = await import('../greybox.js');
  const points = STAIRS[0].path;
  const [a, b] = points, length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const start = [a[0] - (b[0] - a[0]) / length * 0.5, a[1] - (b[1] - a[1]) / length * 0.5];
  const { p, visited } = path([start, ...points], greyboxColliders());
  for (const v of visited) assert(project(v.x, v.z, [start, ...points]) <= 0.5, `側牆侵入中線：${v.x},${v.z}`);
  assert(Math.hypot(p.x - points.at(-1)[0], p.z - points.at(-1)[1]) <= 0.5, '未抵達階梯頂端');
});

test('範圍內建築依輪廓最低層擠出，並提供至多四個碰撞盒', async () => {
  const { createGreybox, greyboxColliders, wallChains } = await import('../greybox.js');
  const model = createGreybox(), colliders = greyboxColliders();
  const buildings = model.getObjectByName('建築');
  assert(buildings, '缺少建築模型');
  const expected = LAYOUT.buildings.filter(b => b.pts.every(([x, z]) => x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1));
  assert.equal(model.userData.buildings.length, expected.length);
  for (const b of expected) {
    const info = model.userData.buildings.find(v => v.osm === b.osm);
    const floors = /十舍/.test(b.name) ? 9 : /九舍/.test(b.name) ? 6 : /五舍|六舍|七八舍/.test(b.name) ? 5 : 2;
    assert.equal(info.height, floors * FLOOR_H);
    assert.equal(info.base, Math.min(...b.pts.map(([x, z]) => LEVELS[platformLevel(x, z)])));
    const boxes = colliders.filter(c => c.building === b.osm);
    assert(boxes.length >= 1 && boxes.length <= 4);
    for (const c of boxes) assert(c.hx > 0 && c.hz > 0);
  }
  assert.equal(colliders.filter(c => c.kind === 'wall').length, wallChains().length);
  assert(model.getObjectByName('擋土牆'));
  assert(model.getObjectByName('建築描邊'));
});

test('道路只鋪在圖內，頂面貼合地形且不產生垂直路面', async () => {
  const { createGreybox } = await import('../greybox.js');
  const model = createGreybox(); model.updateMatrixWorld(true);
  const road = model.getObjectByName('道路'); assert(road, '缺少道路');
  const p = road.geometry.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const vertices = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(p, i + k));
    for (const v of vertices) assert(v.x >= R.x0 && v.x <= R.x1 && v.z >= R.z0 && v.z <= R.z1);
    assert(Math.abs(vertices[0].y - vertices[1].y) < 1e-5 && Math.abs(vertices[0].y - vertices[2].y) < 1e-5);
    const center = vertices.reduce((sum, v) => sum.add(v), new THREE.Vector3()).divideScalar(3);
    assert(Math.abs(center.y - heightAt(center.x, center.z) - 0.03) < 0.051, `道路懸空：${center.toArray()}`);
  }
  // 這段核可道路在 L2，距中線 2.5 m 仍有路面，3.6 m 已在路外。
  const ray = new THREE.Raycaster();
  for (const [z, expected] of [[-8.03, true], [-5.53, true], [-4.43, false]]) {
    ray.set(new THREE.Vector3(-50, 40, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(road, false)[0];
    assert.equal(Boolean(hit), expected, `道路寬度：-50,${z}`);
  }
});

test('地圖入口登記灰盒與碰撞，公車站及圍籬跟隨地形高度', async () => {
  // 只隔離需要 WebGL 的引擎入口，kit、模型、碰撞均使用正式模組。
  globalThis.__uphillScene = new THREE.Scene();
  const engine = 'data:text/javascript,export const scene = globalThis.__uphillScene;';
  const hooks = registerHooks({ resolve(specifier, context, next) {
    if (specifier.endsWith('core/engine.js')) return { url: engine, shortCircuit: true };
    return next(specifier, context);
  } });
  const savedDocument = globalThis.document, savedColliders = colliders.slice();
  const context = { fillRect() {}, clearRect() {}, fillText() {}, strokeRect() {} };
  globalThis.document = { createElement() { return { width: 0, height: 0, getContext() { return context; } }; } };
  try {
    const { buildMap, mapHeight, mapZone, mapLight } = await import('../map.js');
    hooks.deregister();
    assert.equal(mapHeight(0, 0), 12);
    assert.equal(mapHeight(-0.6, -34.9), 15);
    buildMap();
    const scene = globalThis.__uphillScene; scene.updateMatrixWorld(true);
    assert(scene.getObjectByName('山上校區灰盒'));
    assert.equal(scene.getObjectByName('uphill-bus-sign').position.y, 14.2);
    assert(colliders.some(c => c.top === 14.5));
    for (const name of ['圍籬木樁', '圍籬橫木']) {
      const fence = scene.getObjectByName(name); assert(fence);
      for (let i = 0; i < fence.count; i++) {
        const matrix = new THREE.Matrix4(); fence.getMatrixAt(i, matrix);
        const v = new THREE.Vector3().setFromMatrixPosition(matrix);
        const offset = name === '圍籬木樁' ? 0.55 : i % 2 ? 0.9 : 0.45;
        if (name === '圍籬木樁') assert(Math.abs(v.y - heightAt(v.x, v.z) - offset) < 1e-4);
        else {
          const { fenceRails } = await import('../greybox.js');
          const rail = fenceRails()[i];
          assert(Math.abs(v.y - rail.y) < 1e-4);
          assert(Math.abs(v.x - (rail.a[0] + rail.b[0]) / 2) < 1e-4);
          assert(Math.abs(v.z - (rail.a[1] + rail.b[1]) / 2) < 1e-4);
        }
      }
    }
    assert.equal(mapZone({ x: 0, z: 0 }), '山居學習中心');
    const lights = new THREE.Scene(); mapLight(lights);
    assert.equal(lights.children.filter(o => o.isLight).length, 2);
    assert(lights.children.every(o => !o.castShadow));
  } finally {
    hooks.deregister(); colliders.splice(0, colliders.length, ...savedColliders);
    globalThis.document = savedDocument; delete globalThis.__uphillScene;
  }
});

test('抬高的平台外緣有從地面長起的側面', async () => {
  const { createGreybox } = await import('../greybox.js');
  const model = createGreybox(); model.updateMatrixWorld(true);
  const side = model.getObjectByName('平台側面'); assert(side);
  const ray = new THREE.Raycaster(new THREE.Vector3(121, 7, 0), new THREE.Vector3(-1, 0, 0));
  assert(Math.abs(ray.intersectObject(side)[0].point.x - 120) < 0.001);
});

function inPoly(x, z, pts) {
  let inside = false;
  pts.forEach(([ax, az], i) => {
    const [bx, bz] = pts[(i + 1) % pts.length];
    if ((az > z) !== (bz > z) && x < ax + (bx - ax) * (z - az) / (bz - az)) inside = !inside;
  });
  return inside;
}

test('D3 每段牆外觀至少厚 0.45，碰撞包住可見牆', async () => {
  const { createGreybox, greyboxColliders } = await import('../greybox.js');
  const model = createGreybox(); model.updateMatrixWorld(true);
  const mesh = model.getObjectByName('擋土牆'), boxes = greyboxColliders().filter(c => c.kind === 'wall');
  for (const w of wallSegments()) {
    const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1], length = Math.hypot(dx, dz);
    const normal = new THREE.Vector3(-dz / length, 0, dx / length);
    const center = new THREE.Vector3((w.a[0] + w.b[0]) / 2, w.high + 0.5, (w.a[1] + w.b[1]) / 2);
    const hits = new THREE.Raycaster(center.clone().add(normal), normal.clone().negate()).intersectObject(mesh);
    assert(hits.length && hits[0].distance <= 1 - 0.45 / 2 + 1e-4, '牆太薄');
    assert(boxes.some(c => distance({ x: center.x, z: center.z }, c) < 1e-6 && c.hz >= 0.25));
  }
});

test('D4 連續牆串減半，每段中點仍被碰撞擋住', async () => {
  const { wallChains, greyboxColliders, createGreybox } = await import('../greybox.js');
  const segments = wallSegments(), chains = wallChains();
  assert(chains.length < segments.length / 2);
  assert.equal(chains.reduce((n, c) => n + c.segments.length, 0), segments.length);
  const walls = greyboxColliders().filter(c => c.kind === 'wall');
  assert.equal(walls.length, chains.length);
  const model = createGreybox();
  assert.equal(model.getObjectByName('擋土牆').userData.chains, chains.length);
  assert.equal(model.getObjectByName('擋土牆描邊').userData.chains, chains.length);
  setActiveColliders(walls); setRoomClamp(() => {});
  try {
    for (const s of segments) {
      const x = (s.a[0] + s.b[0]) / 2, z = (s.a[1] + s.b[1]) / 2;
      const p = { x, z, y: s.low }; resolve(p);
      assert(Math.hypot(p.x - x, p.z - z) >= 0.4, '牆串漏擋原本的段');
    }
  } finally { setActiveColliders([]); setRoomClamp(null); }
});

test('D2 圍籬以樁距連接，懸崖斷開且橫木留在邊界', async () => {
  const { fenceRails } = await import('../greybox.js');
  const rails = fenceRails();
  const perimeter = 2 * (R.x1 - R.x0 + R.z1 - R.z0);
  assert(rails.length > 0 && rails.length <= 2 * perimeter / 2.5 + 8);
  for (const { a, b, y } of rails) {
    assert((a[0] === b[0] && [R.x0, R.x1].includes(a[0])) ||
      (a[1] === b[1] && [R.z0, R.z1].includes(a[1])));
    const ha = heightAt(...a), hb = heightAt(...b);
    assert(Math.abs(ha - hb) <= 0.5);
    assert([0.45, 0.9].some(offset => Math.abs(y - Math.max(ha, hb) - offset) < 1e-8));
    assert(Math.hypot(b[0] - a[0], b[1] - a[1]) <= 2.5 + 1e-8);
  }
});

test('D1 建築碰撞保留道路與外部錨點', async () => {
  assert(inPoly(1, 1, [[0, 0], [2, 0], [2, 2], [0, 2]]));
  assert(!inPoly(3, 1, [[0, 0], [2, 0], [2, 2], [0, 2]]));
  assert.equal(project(1, -1, [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0], [0, 0]]), 1);
  const { greyboxColliders } = await import('../greybox.js');
  const boxes = greyboxColliders().filter(c => c.kind === 'building');
  const buildings = LAYOUT.buildings.filter(b => b.pts.every(([x, z]) => x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1));
  for (const b of buildings) {
    const own = boxes.filter(c => c.building === b.osm);
    assert(own.length >= 1 && own.length <= 4);
    let total = 0, covered = 0;
    for (let x = Math.min(...b.pts.map(p => p[0])); x <= Math.max(...b.pts.map(p => p[0])); x += 0.5)
      for (let z = Math.min(...b.pts.map(p => p[1])); z <= Math.max(...b.pts.map(p => p[1])); z += 0.5)
        if (inPoly(x, z, b.pts)) { total++; if (own.some(c => distance({ x, z }, c) < 1e-8)) covered++; }
    assert(covered / total >= 0.8, `${b.name} 覆蓋率 ${covered / total}`);
  }
  const clear = (x, z, margin) => buildings.every(b => !inPoly(x, z, b.pts) && project(x, z, [...b.pts, b.pts[0]]) >= margin);
  const verify = (x, z, margin) => {
    if (!clear(x, z, margin)) return;
    setActiveColliders(boxes); setRoomClamp(() => {});
    try { const p = { x, z, y: heightAt(x, z) }; resolve(p); assert(Math.hypot(p.x - x, p.z - z) <= 0.01, `通路被擋：${x},${z}`); }
    finally { setActiveColliders([]); setRoomClamp(null); }
  };
  for (const road of LAYOUT.roads) for (let i = 1; i < road.pts.length; i++) {
    const [a, b] = [road.pts[i - 1], road.pts[i]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5);
    for (let j = 0; j <= n; j++) {
      const x = a[0] + (b[0] - a[0]) * j / n, z = a[1] + (b[1] - a[1]) * j / n;
      if (x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1) verify(x, z, 1);
    }
  }
  for (const { x, z } of Object.values(ANCHORS)) verify(x, z, 0.6);
});
