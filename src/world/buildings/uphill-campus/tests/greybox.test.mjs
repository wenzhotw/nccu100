/** 灰盒以真實碰撞與射線驗證行走、地表及手機幾何預算，不載入瀏覽器引擎。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { registerHooks } from 'node:module';
import { resolve, setActiveColliders, setRoomClamp, colliders } from '../../../../core/collision.js';
import { R, STAIRS, RAMPS, LAYOUT, FLOOR_H, LEVELS, ANCHORS, BUILDING_FLOORS, LOBBY, ZQ10, footprintOf } from '../layout.js';
import { heightAt, platformLevel, wallSegments, rampHeight, projectToPath, landscapeAt } from '../terrain.js';
import {isInsideLobby} from '../lobby.js';

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
  group.traverseVisible(o => {
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
    // 8c 大廳地板與安全開口由 lobby.test 的正式射線及穿越測試覆蓋。
    if(isInsideLobby(x,z))continue;
    if (walls.some(w => project(x, z, [w.a, w.b]) < 1)) continue;
    ray.set(new THREE.Vector3(x, 40, z), new THREE.Vector3(0, -1, 0));
    const hits = ray.intersectObjects(surfaces, false);
    assert(hits.length, `地表缺口：${x},${z}`);
    // 地表以 0.25 公尺小格取中心高度，階梯邊緣的小格最多外凸半條對角線（約 0.18 公尺），落在側牆底下。
    const stair = STAIRS.some(s => project(x, z, s.path) <= s.width / 2 + 0.25 * Math.SQRT1_2);
    // 坡道東側人行道與草坡是每 0.5 公尺一格的帶狀面，轉角附近線性內插與投影高度最多差幾公分，比照坡道容差。
    const ramp = RAMPS.some(s => project(x, z, s.path) <= s.width / 2 + 4.2);
    // 樓梯旁草坡是平滑曲面，以 0.5 公尺格線性內插，最多差約 0.1 公尺。
    // 草坡格與平台交界的那一格會略為跨出地景範圍，半公尺內也比照曲面容差。
    const bank = [[0,0],[0.5,0],[-0.5,0],[0,0.5],[0,-0.5]].some(([dx,dz]) => ['bank', 'grass-slope'].includes(landscapeAt(x + dx, z + dz)?.kind));
    const tolerance = stair ? 0.31 : bank ? 0.1 : ramp ? 0.06 : 0.01;
    assert(Math.abs((hits[0].point.y - (hits[0].object.userData.surfaceOffset ?? 0)) - heightAt(x, z)) <= tolerance,
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
    const floors = BUILDING_FLOORS[b.osm] ?? (/十舍/.test(b.name) ? 8 : /九舍/.test(b.name) ? 6 : /五舍|六舍|七八舍/.test(b.name) ? 5 : 2);
    assert.equal(info.height, floors * FLOOR_H);
    assert.equal(info.base, b.osm === LOBBY.osm ? 15 : Math.min(...b.pts.map(([x, z]) => LEVELS[platformLevel(x, z)])));
    const boxes = colliders.filter(c => c.building === b.osm);
    // 十舍 C 棟西翼整棟一樓架空（照片 8998），改由柱子與中庭邊沿擋人。
    if (ZQ10.lifted.some(l => l.building === b.osm && l.fromX === undefined)) { assert.equal(boxes.length, 0); continue; }
    // A 棟一樓挖出門廊與走廊，分兩塊實心各自擋人。
    assert(boxes.length >= 1 && boxes.length <= (ZQ10.groundFloor?.building === b.osm ? 8 : 4));
    for (const c of boxes) assert(c.hx > 0 && c.hz > 0);
  }
  assert.equal(colliders.filter(c => c.kind === 'wall').length, wallChains().filter(c => !c.ramp).length + 2);
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
  const context = new Proxy({ measureText() { return { width: 20 }; }, createLinearGradient() { return {addColorStop(){}}; } }, { get(t,k) { return t[k] ?? (()=>{}); }, set(t,k,v) {t[k]=v;return true;} });
  globalThis.document = { createElement() { return { width: 0, height: 0, getContext() { return context; } }; } };
  try {
    const { buildMap, mapHeight, mapZone, mapLight } = await import('../map.js');
    hooks.deregister();
    assert.equal(mapHeight(0, 0), 12);
    assert.equal(mapHeight(-0.6, -34.9), 15);
    const {flushPrefabs}=await import('../../../prefabs/index.js');
    flushPrefabs();
    buildMap();
    const scene = globalThis.__uphillScene; scene.updateMatrixWorld(true);
    assert(scene.getObjectByName('山上校區灰盒'));
    assert.ok(scene.getObjectByName('九舍中庭植栽'));
    assert.equal(scene.getObjectByName('九舍中庭植栽').userData.trees,6);
    assert.equal(scene.getObjectByName('九舍中庭植栽').userData.lamps,6);
    let visibleMeshes=0;
    for(const root of [scene.getObjectByName('山上校區灰盒'),scene.getObjectByName('九舍中庭植栽')]) root.traverseVisible(o=>{if(o.isMesh)visibleMeshes++;});
    assert.ok(visibleMeshes<=30, '中庭合批後可見網格超過 8a 基線二十加十');
    assert.ok(scene.getObjectByName('九舍大廳橫幅').material.map);
    assert.ok(scene.getObjectByName('九舍中庭車道').material.map);
    const { GRAD } = await import('../../../../render/kit.js');
    for(const name of ['坡道斜面','東側人行道','東側草坡','不鏽鋼欄杆','九舍磚砌踏面']) {
      const m=scene.getObjectByName(name); assert.ok(m.material.gradientMap===GRAD,name);
    }
    assert.ok(scene.getObjectByName('東側人行道').material.map);

    assert.equal(scene.getObjectByName('uphill-bus-sign').position.y, 14.2);
    assert(colliders.some(c => c.top === 14.5));
    // 站牌在 STOP，候車亭碰撞以 BUS_SHELTER 為中心（Task 7 移到山居南側）。
    const { STOP, BUS_SHELTER } = await import('../layout.js');
    const sign = scene.getObjectByName('uphill-bus-sign');
    assert.deepEqual([sign.position.x, sign.position.z], [STOP.x, STOP.z]);
    assert(colliders.some(c => c.top === 14.5 && Math.abs((c.x0 + c.x1) / 2 - BUS_SHELTER.x) < 1e-9
      && Math.abs(c.z0 - (BUS_SHELTER.z - 1.1)) < 1e-9), '候車亭碰撞不在 BUS_SHELTER');
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
    assert.equal(mapZone(STOP), '山居學習中心');
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
    assert(hits.length && hits[0].distance <= 1 - 0.45 / 2 + 1e-4, `牆太薄：${JSON.stringify(w)}，射線 ${hits[0]?.distance}`);
    assert(boxes.some(c => distance({ x: center.x, z: center.z }, c) < 1e-6 && c.hz >= 0.25));
  }
});

test('D4 連續牆串減半，每段中點仍被碰撞擋住', async () => {
  const { wallChains, greyboxColliders, createGreybox } = await import('../greybox.js');
  const segments = wallSegments(), chains = wallChains();
  assert(chains.length < segments.length / 2);
  assert.equal(chains.reduce((n, c) => n + c.segments.length, 0), segments.length);
  const walls = greyboxColliders().filter(c => c.kind === 'wall');
  assert.equal(walls.length, chains.filter(c => !c.ramp).length + 2);
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
  const { greyboxColliders, clipBuildingX } = await import('../greybox.js');
  const boxes = greyboxColliders().filter(c => c.kind === 'building');
  const buildings = LAYOUT.buildings.filter(b => b.pts.every(([x, z]) => x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1))
    // 大廳建物只剩大廳以南（z ≥ LOBBY.bounds.z1）是實心，取該段輪廓驗收碰撞覆蓋。
    .map(b=>b.osm===LOBBY.osm?{...b,pts:[[25.58,LOBBY.bounds.z1],[36.78,LOBBY.bounds.z1],[37,-10.4],[25.8,-10.1]]}:b);
  // A 棟凸出段挑高架空（照片 8988），只驗切線西側的實心段。
  for (const b of buildings.filter(b => !ZQ10.lifted.some(l => l.building === b.osm && l.fromX === undefined))
    .map(b => { const l = ZQ10.lifted.find(l => l.building === b.osm); return l ? { ...b, pts: clipBuildingX(footprintOf(b), l.fromX, false) } : b; })) {
    const own = boxes.filter(c => c.building === b.osm);
    assert(own.length >= 1 && own.length <= (ZQ10.groundFloor?.building === b.osm ? 8 : 4));
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


test('7a ramp surface follows continuous height without instanced steps', async () => {
  const { createGreybox } = await import('../greybox.js');
  const model = createGreybox(); model.updateMatrixWorld(true);
  const surfaces = model.children.filter(m => m.userData.surface);
  const ray = new THREE.Raycaster();
  for (let z = -9; z >= -19; z -= 0.1) {
    const x = -11.8 + (z + 8.1) * 0.2 / 12.2;
    ray.set(new THREE.Vector3(x, 40, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(surfaces)[0];
    assert(hit && Math.abs(hit.point.y - heightAt(x, z)) < 1e-4, `smooth surface: ${z}, ${hit?.point.y}`);
    assert(!hit.object.isInstancedMesh);
  }
});


test('7a elevated connection leaves the asphalt route clear at ground level', async () => {
  const { createGreybox, greyboxColliders } = await import('../greybox.js');
  const model = createGreybox(); model.updateMatrixWorld(true);
  const boxes = greyboxColliders();
  const route = [[-92,18.1],[-84.6,9.4],[-73.7,-1.3],[-68.3,-5.2],[-60.5,-8.1],[-45.5,-8],[-39.6,-7.9],[-11.8,-8.1]];
  for (let i = 1; i < route.length; i++) {
    const [a,b] = [route[i-1],route[i]], n = Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.25);
    for (let j = 0; j <= n; j++) {
      const x = a[0]+(b[0]-a[0])*j/n, z = a[1]+(b[1]-a[1])*j/n;
      assert.equal(heightAt(x,z),12);
      assert(boxes.every(c => distance({x,z},c) >= 0.4), `road blocked: ${x},${z}`);
      const hits = new THREE.Raycaster(new THREE.Vector3(x,12.5,z),new THREE.Vector3(0,-1,0))
        .intersectObject(model.getObjectByName('道路'));
      assert(hits.length && Math.abs(hits[0].point.y-12.03)<1e-4, `road missing: ${x},${z}`);
    }
  }
  const {p,visited} = path(route,boxes);
  assert(Math.hypot(p.x+11.8,p.z+8.1)<0.01);
  assert(visited.every(v=>Math.abs(heightAt(v.x,v.z)-12)<1e-9));
  const bridge = model.getObjectByName('高架連通段'); assert(bridge);
  const hits = new THREE.Raycaster(new THREE.Vector3(-42.5,40,-8), new THREE.Vector3(0,-1,0))
    .intersectObjects([bridge,model.getObjectByName('道路')]);
  assert(hits.some(h=>Math.abs(h.point.y-24)<1e-4));
  assert(hits.some(h=>Math.abs(h.point.y-15.4)<1e-4));
  assert(Math.abs(hits.at(-1).point.y-12.03)<1e-4);
  const visible = new THREE.Raycaster(new THREE.Vector3(-42.5,40,-8), new THREE.Vector3(0,-1,0))
    .intersectObjects([bridge,model.getObjectByName('建築描邊'),model.getObjectByName('道路')]);
  assert(visible.filter(h=>h.point.y>12.04).every(h=>h.point.y>=15.4-1e-4), '描邊也必須保留 3.4 m 淨空');
});


test('7a sloping wall top follows endpoint profiles without half-metre ledges', async () => {
  const {createGreybox,wallChains} = await import('../greybox.js');
  const model=createGreybox(); model.updateMatrixWorld(true);
  const mesh=model.getObjectByName('擋土牆');
  let samples=0;
  for(const chain of wallChains().filter(c=>c.ramp)) for(const s of chain.segments) {
    for(const t of [0.2,0.8]) {
      const x=s.a[0]+(s.b[0]-s.a[0])*t, z=s.a[1]+(s.b[1]-s.a[1])*t;
      const hits=new THREE.Raycaster(new THREE.Vector3(x,40,z),new THREE.Vector3(0,-1,0)).intersectObject(mesh);
      const expected=s.highA+(s.highB-s.highA)*t+1.1;
      assert(hits.length && Math.abs(hits[0].point.y-expected)<1e-4, `wall profile: ${x},${z}, ${hits[0]?.point.y} != ${expected}`);
      samples++;
    }
  }
  assert(samples>20);
});


test('7a 玩家沿坡道雙向通行，側牆兩側往返不穿牆或卡住', async () => {
  const {greyboxColliders} = await import('../greybox.js');
  const boxes=greyboxColliders();
  for(const points of [RAMPS[0].path,[...RAMPS[0].path].reverse()]) {
    const {p,visited}=path(points,boxes), end=points.at(-1);
    assert(Math.hypot(p.x-end[0],p.z-end[1])<0.01);
    for(let i=1;i<visited.length;i++) {
      const v=visited[i],previous=visited[i-1];
      assert(project(v.x,v.z,points)<0.01);
      assert(Math.abs(heightAt(v.x,v.z)-heightAt(previous.x,previous.z))<0.3);
    }
  }
  for(const c of boxes.filter(c=>c.ramp)) {
    const nx=c.sn,nz=c.cs;
    for(const side of [-1,1]) {
      const {p}=path([[c.cx+nx*side,c.cz+nz*side],[c.cx-nx*side,c.cz-nz*side]],boxes);
      assert((p.x-c.cx)*nx*side+(p.z-c.cz)*nz*side>0);
      assert(distance(p,c)>=0.4-1e-6);
    }
  }
});


test('照片坡道以柏油材質接回道路', async () => {
  const { createGreybox } = await import('../greybox.js');
  const model = createGreybox();
  assert.equal(model.getObjectByName('坡道斜面').material.color.getHexString(), model.getObjectByName('道路').material.color.getHexString());
});


test('東側步道欄杆有實體且保留九舍樓梯全程中線', async () => {
  const { createGreybox, greyboxColliders } = await import('../greybox.js');
  const model = createGreybox();
  assert.ok(model.getObjectByName('東側人行道'));
  assert.ok(model.getObjectByName('不鏽鋼欄杆'));
  assert.ok(model.getObjectByName('東側草坡'));
  const boxes=greyboxColliders();
  assert.ok(boxes.some(c=>c.kind==='sidewalk-rail'));
  const jiu=STAIRS.find(s=>s.id==='jiu-plaza');
  const {visited}=path(jiu.path,boxes);
  for(const p of visited.slice(1)) assert.ok(Math.hypot(p.x-p.intended.x,p.z-p.intended.z)<1e-6);
});


test('坡道西側護欄、樓梯磁磚矮牆花台及三角錐完整，碰撞逐個能繞也擋住', async () => {
  const {createGreybox,greyboxColliders}=await import('../greybox.js');
  const model=createGreybox();
  for(const name of ['紐澤西護欄','九舍磁磚側牆','九舍入口花台','入口三角錐','東支線矮牆']) assert.ok(model.getObjectByName(name),name);
  const boxes=greyboxColliders().filter(c=>['sidewalk-rail','jersey','stair-wall','planter','cone','east-stair-wall','slope-fence'].includes(c.kind));
  assert.ok(boxes.some(c=>c.kind==='jersey'));
  assert.ok(boxes.some(c=>c.kind==='slope-fence'));
  assert.equal(boxes.filter(c=>c.kind==='planter').length,2);
  assert.equal(boxes.filter(c=>c.kind==='cone').length,2);
  for(const c of boxes) {
    // 在中心橫穿應受阻，沿外側平行走過應暢通。已知 OBB 法線由旋轉定義取得。
    const nx=c.sn,nz=c.cs,clear=c.hz+0.6;
    const crossed=path([[c.cx+nx*2,c.cz+nz*2],[c.cx-nx*2,c.cz-nz*2]],[c]);
    assert.ok((crossed.p.x-c.cx)*nx+(crossed.p.z-c.cz)*nz > c.hz);
    const a=[c.cx-c.cs*(c.hx+0.6)+nx*clear,c.cz+c.sn*(c.hx+0.6)+nz*clear];
    const b=[c.cx+c.cs*(c.hx+0.6)+nx*clear,c.cz-c.sn*(c.hx+0.6)+nz*clear];
    const pass=path([a,b],[c]);
    assert.ok(Math.hypot(pass.p.x-b[0],pass.p.z-b[1])<1e-6,c.kind);
  }
  const jiu=STAIRS.find(s=>s.id==='jiu-plaza');
  const {visited}=path(jiu.path,greyboxColliders());
  for(const p of visited.slice(1)) assert.ok(Math.hypot(p.x-p.intended.x,p.z-p.intended.z)<1e-6);
});


test('照片細節包含坡頂圍籬、紅色禁停線、排水溝及磚砌踏面',async()=>{
  const {createGreybox}=await import('../greybox.js');const model=createGreybox();
  for(const name of ['坡頂圍籬','紅色禁停線','西側排水溝','九舍磚砌踏面']) {
    const item=model.getObjectByName(name);assert.ok(item,name);
    assert.ok(item.geometry.attributes.position.count>0);
  }
});


test('坡道禁停線與排水溝頂點連續貼坡面，不形成鋸齒浮線',async()=>{
  const {createGreybox}=await import('../greybox.js');const model=createGreybox(),ramp=RAMPS[0];
  for(const name of ['紅色禁停線','西側排水溝']) {
    const p=model.getObjectByName(name).geometry.attributes.position;
    for(let i=0;i<p.count;i++) {
      const h=rampHeight(ramp,projectToPath(p.getX(i),p.getZ(i),ramp.path).s);
      assert.ok(Math.abs(p.getY(i)-h-0.025)<0.003,name);
    }
  }
});


test('樓梯頂花台的底座向下接地，不懸浮在草坡上',async()=>{
  const {createGreybox}=await import('../greybox.js');const {rampProps}=await import('../ramp-details.js');
  const model=createGreybox();model.updateMatrixWorld(true);
  const mesh=model.getObjectByName('坡道與樓梯設施');
  for(const p of rampProps().filter(p=>p.kind==='planter')) {
    const hit=new THREE.Raycaster(new THREE.Vector3(p.x,10,p.z),new THREE.Vector3(0,1,0)).intersectObject(mesh)[0];
    assert.ok(hit && hit.point.y<=heightAt(p.x,p.z)+0.03,`花台懸空：${hit?.point.y}`);
  }
});


test('西側護欄落在柏油路緣，不浮在低層平台上',async()=>{
  const {rampProps}=await import('../ramp-details.js');
  for(const p of rampProps().filter(p=>p.kind==='jersey')) assert.ok(Math.abs(p.base-heightAt(p.x,p.z))<0.15);
});


test('草坡與九舍樓梯旁不露出舊平台的內部直立側面',async()=>{
  const {createGreybox}=await import('../greybox.js');const model=createGreybox();model.updateMatrixWorld(true);
  const mesh=model.getObjectByName('平台側面'),jiu=STAIRS.find(s=>s.id==='jiu-plaza');
  const [a,b]=jiu.path,dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);
  for(const t of [0.25,0.5,0.75]) {
    const x=a[0]+dx*t,z=a[1]+dz*t,h=heightAt(x,z);
    const ray=new THREE.Raycaster(new THREE.Vector3(x,h+1,z),new THREE.Vector3(-dz/l,0,dx/l),0,4);
    assert.equal(ray.intersectObject(mesh).length,0,'樓梯側露出高於矮牆的舊平台壁');
  }
});

test('九舍照片樓層表控制實際量體，大廳從十五公尺起蓋', async () => {
  const { createGreybox } = await import('../greybox.js');
  const model = createGreybox();
  for (const [osm, base, height] of [[510739853,12,12],[510739854,15,9.6],[510739855,15,2.4]]) {
    const info = model.userData.buildings.find(b => b.osm === osm);
    assert.equal(info.base, base);
    assert.equal(info.height, height);
  }
});

test('大廳有鏤空屋頂欄杆與西面淺綠玻璃入口，招牌可供場景接線', async () => {
  const { createGreybox } = await import('../greybox.js');
  const model=createGreybox(); model.updateMatrixWorld(true);
  const rails=model.getObjectByName('九舍大廳欄杆'); assert.ok(rails);
  const rb=new THREE.Box3().setFromObject(rails);
  assert.ok(Math.abs(rb.max.y-rb.min.y-0.9)<0.001);
  const door=model.getObjectByName('九舍大廳入口'); assert.ok(door);
  const db=new THREE.Box3().setFromObject(door), center=db.getCenter(new THREE.Vector3());
  assert.ok(Math.hypot(center.x-LOBBY.door.x,center.z-LOBBY.door.z)<=0.5);
  assert.equal(door.material.transparent,true);
  assert.ok(model.getObjectByName('九舍大廳橫幅'));
  assert.ok(model.getObjectByName('九舍大廳直式牌'));
  // 西面欄杆的空隙應能被水平射線穿過，橫桿高度應有命中。
  // 西面欄杆柱沿邊每約 0.65 公尺一根，射線取兩根柱子中間（2026-10-22 大廳範圍改由 LOBBY.bounds 決定）。
  const {z0:wz0,z1:wz1}=LOBBY.bounds,posts=Math.ceil((wz1-wz0)/0.65),gapZ=wz1-(wz1-wz0)/posts*(Math.floor(posts/2)+0.5);
  const cast=y=>new THREE.Raycaster(new THREE.Vector3(LOBBY.bounds.x0-1.5,y,gapZ),new THREE.Vector3(1,0,0),0,2).intersectObject(rails);
  assert.equal(cast(LOBBY.base+LOBBY.ceiling+0.4).length,0);
  assert.ok(cast(LOBBY.base+LOBBY.ceiling+0.85).length>0);
});

test('大廳底部頂點低於十五公尺，填充體補到南端十二公尺平台', async () => {
  const {createGreybox}=await import('../greybox.js');const model=createGreybox();model.updateMatrixWorld(true);
  const b=LAYOUT.buildings.find(b=>b.osm===510739855);
  for(const [x,z] of b.pts)assert.ok(heightAt(x,z)<=15);
  const fill=model.getObjectByName('九舍大廳下層填充');assert.ok(fill);
  const bounds=new THREE.Box3().setFromObject(fill);
  assert.equal(bounds.min.y,12);assert.equal(bounds.max.y,15);
  for(const [x,z] of [[26,-11],[36,-11],[31,-14]]) {
    const hit=new THREE.Raycaster(new THREE.Vector3(x,11,z),new THREE.Vector3(0,1,0)).intersectObject(fill)[0];
    assert.ok(hit && hit.point.y<=heightAt(x,z)+0.01,`牆底浮空：${x},${z}`);
  }
});

test('中庭紅磚車道連到西側廣場，新增設施逐個能繞行且擋住', async () => {
  const {createGreybox,greyboxColliders}=await import('../greybox.js');
  const model=createGreybox();model.updateMatrixWorld(true);
  const lane=model.getObjectByName('九舍中庭車道');assert.ok(lane);
  const bounds=new THREE.Box3().setFromObject(lane);
  assert.ok(Math.abs(bounds.min.x-8)<0.001 && Math.abs(bounds.max.x-LOBBY.door.x)<0.001);
  assert.ok(Math.abs(bounds.max.z-bounds.min.z-3.6)<0.001);
  const plaza=model.getObjectByName('九舍北側廣場');assert.ok(plaza);
  const pb=new THREE.Box3().setFromObject(plaza);
  // 2026-10-22：廣場網格另含往西接到樓梯頂的磚道，西界因此延伸到樓梯頂。
  assert.ok(pb.min.x<=0.001 && Math.abs(pb.max.x-15)<0.001);
  assert.ok(Math.abs(pb.min.z+35)<0.001 && pb.max.z>=-24-0.001);
  const boxes=greyboxColliders().filter(c=>c.courtyard);
  assert.ok(boxes.some(c=>c.kind==='bike-rack'));
  // 2026-10-22 審查：草地上零散的廣場護欄已移除（照片 9026 只有機車架與路緣護欄）。
  assert.ok(!boxes.some(c=>c.kind==='plaza-jersey'));
  for(const c of boxes) {
    const nx=c.sn,nz=c.cs,clear=c.hz+0.6;
    const crossed=path([[c.cx+nx*(c.hz+1),c.cz+nz*(c.hz+1)],[c.cx-nx*(c.hz+1),c.cz-nz*(c.hz+1)]],[c]);
    assert.ok((crossed.p.x-c.cx)*nx+(crossed.p.z-c.cz)*nz>c.hz,c.kind);
    const a=[c.cx-c.cs*(c.hx+0.6)+nx*clear,c.cz+c.sn*(c.hx+0.6)+nz*clear];
    const b=[c.cx+c.cs*(c.hx+0.6)+nx*clear,c.cz-c.sn*(c.hx+0.6)+nz*clear];
    const pass=path([a,b],[c]);assert.ok(Math.hypot(pass.p.x-b[0],pass.p.z-b[1])<1e-6,c.kind);
  }
  const pass=path([[8,-27.8],[24,-27.8]],greyboxColliders());
  assert.ok(Math.hypot(pass.p.x-24,pass.p.z+27.8)<1e-6);
});

// 2026-10-21 照片補件：9027 坡頂以東的道路西側護欄、9022／9027 九舍 D 區西端圓弧樓梯間。
const ROAD_NE = [[-0.6, -34.9], [4.9, -43.9]];
function walkLine(a, b, boxes) {
  setActiveColliders(boxes); setRoomClamp(() => {});
  let pushed = 0;
  try {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2);
    for (let i = 1; i <= n; i++) {
      const p = { x: a[0] + (b[0] - a[0]) * i / n, z: a[1] + (b[1] - a[1]) * i / n, y: 15 };
      const x = p.x, z = p.z; resolve(p); pushed += Math.hypot(p.x - x, p.z - z);
    }
  } finally { setActiveColliders([]); setRoomClamp(null); }
  return pushed;
}

test('照片 9027：坡頂以東道路西側的紐澤西護欄延續到九舍 D 區西端，路中線仍可通行', async () => {
  const { rampProps } = await import('../ramp-details.js');
  const { greyboxColliders } = await import('../greybox.js');
  const [a, b] = ROAD_NE, dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
  const beyond = rampProps().filter(p => p.kind === 'jersey').filter(p => {
    const t = ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / length ** 2;
    return t > 0.05 && t <= 1;
  });
  assert.ok(beyond.length >= 4, `坡頂以東只有 ${beyond.length} 塊護欄`);
  for (const p of beyond) {
    const side = ((p.x - a[0]) * -dz + (p.z - a[1]) * dx) / length;
    // 與坡道段相同，護欄在道路左側（西側），離中線 2.7 公尺。
    assert.ok(side < 0 && Math.abs(Math.abs(side) - 2.7) < 0.05, `護欄偏離西側路緣：${p.x},${p.z}`);
    assert.ok(Math.abs(p.base - heightAt(p.x, p.z)) < 0.15);
  }
  const boxes = greyboxColliders().map(c => ({ ...c, obb: true, cs: Math.cos(c.th), sn: Math.sin(c.th) }));
  assert.ok(walkLine(a, b, boxes) < 1e-6, '路中線被擋住');
  // 從路面往西直走會被新護欄擋下。
  const mid = beyond[Math.floor(beyond.length / 2)], nx = -dz / length, nz = dx / length;
  const from = [mid.x - nx * 1.5, mid.z - nz * 1.5], to = [mid.x + nx * 1.5, mid.z + nz * 1.5];
  setActiveColliders(boxes); setRoomClamp(() => {});
  try {
    const p = { x: from[0], z: from[1], y: 15 };
    for (let i = 1; i <= 15; i++) { p.x += (to[0] - from[0]) / 15; p.z += (to[1] - from[1]) / 15; resolve(p); }
    assert.ok(((p.x - mid.x) * nx + (p.z - mid.z) * nz) < 0, '穿過護欄');
  } finally { setActiveColliders([]); setRoomClamp(null); }
});

test('照片 9022／9027：九舍 D 區西端有四層高的圓弧樓梯間，擋得住也繞得過', async () => {
  const { createGreybox, greyboxColliders } = await import('../greybox.js');
  const model = createGreybox(); model.updateMatrixWorld(true);
  // 從西側草地朝東打射線：牆面原在 x=5.7，圓弧樓梯間讓命中點提早到半徑 1.4 的圓上；四層樓都打得到。
  const ray = new THREE.Raycaster(), targets = model.children.filter(m => m.name === '建築');
  for (const floor of [0.5, 1.5, 2.5, 3.5]) {
    const y = 15 + floor * FLOOR_H;
    ray.set(new THREE.Vector3(2, y, -37.4), new THREE.Vector3(1, 0, 0));
    const hit = ray.intersectObjects(targets, false)[0];
    assert.ok(hit && Math.abs(hit.point.x - (6.4 - 1.4)) < 0.05, `第 ${floor + 0.5} 層沒有圓弧樓梯間：${hit?.point.x}`);
  }
  ray.set(new THREE.Vector3(2, 15 + BUILDING_FLOORS[510739854] * FLOOR_H + 0.3, -37.4), new THREE.Vector3(1, 0, 0));
  assert.ok(!ray.intersectObjects(targets, false).some(h => h.point.x < 5.5), '樓梯間高過四層');
  // 陽台帶在樓層交界外凸 0.08 公尺。
  const bands = model.children.filter(m => m.name === '廣場機車架與護欄');
  ray.set(new THREE.Vector3(2, 15 + FLOOR_H, -37.4), new THREE.Vector3(1, 0, 0));
  const band = ray.intersectObjects(bands, false)[0];
  assert.ok(band && Math.abs(band.point.x - (6.4 - 1.48)) < 0.05, '缺少樓層陽台帶');
  const boxes = greyboxColliders().map(o => ({ ...o, obb: true, cs: Math.cos(o.th), sn: Math.sin(o.th) }));
  setActiveColliders(boxes); setRoomClamp(() => {});
  try {
    const p = { x: 3.6, z: -37.4, y: 15 };
    for (let i = 0; i < 20; i++) { p.x += 0.15; resolve(p); }
    assert.ok(p.x < 6.4 - 1.4 + 0.05, '走進圓弧樓梯間');
  } finally { setActiveColliders([]); setRoomClamp(null); }
  // 沿樓梯間外側的草地往南北走不被擋。
  assert.ok(walkLine([4.4, -35.2], [4.4, -39.6], boxes) < 1e-6, '樓梯間外側草地被擋');
});

test('十舍：由馬路走樓梯上磚地中庭，再從咖啡廳旁樓梯下到花園；花園不能直接爬上中庭', async () => {
  // 照片 8992、9001 與使用者說明（2026-10-23）：花園與馬路同高，中庭抬高，兩處樓梯連接。
  const { greyboxColliders } = await import('../greybox.js');
  const all = greyboxColliders();
  // 平面圖 8990：樓梯貼著 A 棟主翼東牆，從橘色雨遮通道西端往北下到花園。
  const route = [[56.7, -35], [66.8, -35], [70, -31], [71.1, -31], [71.1, -36.8], [71.1, -45.2], [73, -47.5]];
  const { p, visited } = path(route, all);
  assert(Math.hypot(p.x - 73, p.z + 47.5) <= 0.5, `未抵達花園：${p.x},${p.z}`);
  assert(visited.some(v => v.y === ZQ10.deck), '沒有登上磚地中庭');
  assert.equal(heightAt(73, -47.5), 15);
  const blocked = path([[87, -40], [87, -30]], all).p;
  assert(blocked.z < -35.7, `花園直接走上中庭：${blocked.z}`);
  // 花園東北角另一座樓梯貼著 D 棟登上中庭（照片 9001 遠處）。
  const east = path([[89.8, -46], [89.8, -35.5], [89.8, -30]], all);
  assert(Math.hypot(east.p.x - 89.8, east.p.z + 30) <= 0.5, `東北角樓梯走不上去：${east.p.x},${east.p.z}`);
  assert.equal(heightAt(89.8, -30), ZQ10.deck);
  // 挑高層裡的咖啡廳木平台，從花園可以直接走到店門口。
  const cafe = path([[73.6, -48], [73.6, -41.2]], all).p;
  assert(Math.hypot(cafe.x - 73.6, cafe.z + 41.2) <= 0.5, `走不進挑高層：${cafe.x},${cafe.z}`);
  assert.equal(heightAt(73.6, -41.2), 15);
  // 從木平台不能直接翻上通道或穿過樓梯側牆。
  const side = path([[73.6, -43], [70.6, -43]], all).p;
  assert(side.x > 72, `從木平台穿過樓梯擋牆：${side.x}`);
  // 使用者說明（2026-10-24）：門廊北通道是走廊，穿過 A 棟到十字路口，往北是萊爾富走道、往東沿花園直走。
  const entry = path([[58, -39.6], [65.5, -39.6], [65.5, -45.5], [69.4, -45.5], [69.4, -54]], all);
  assert(Math.hypot(entry.p.x - 69.4, entry.p.z + 54) <= 0.5, `走廊走不到萊爾富走道：${entry.p.x},${entry.p.z}`);
  assert(entry.visited.slice(1).every(v => v.y === 15), '門廊與走廊應與馬路同高');
  const straight = path([[69.4, -45.6], [80, -45.6]], all).p;
  assert(Math.hypot(straight.x - 80, straight.z + 45.6) <= 0.5, `十字路口往東走不通：${straight.x},${straight.z}`);
  // 南通道盡頭是玻璃幕牆，公告欄牆把兩條通道隔開。
  const curtain = path([[61, -37], [69, -37]], all).p;
  assert(curtain.x < 66.4, `穿過玻璃幕牆：${curtain.x}`);
  const notice = path([[61, -38.3], [66, -38.3]], all).p;
  assert(notice.x < 63, `穿過公告欄牆：${notice.x}`);
  const fromRoad = path([[59.5, -30], [64, -30]], all).p;
  assert(fromRoad.x < 60.5, `由馬路穿過異想食堂店面：${fromRoad.x}`);
});
