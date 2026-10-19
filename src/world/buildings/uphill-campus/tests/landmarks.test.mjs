/** 以真實模型與幾何檢查地標、通路淨空及場景接線，不啟動瀏覽器。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { spawnSync } from 'node:child_process';
import { ANCHORS, LAYOUT, STAIRS, RAMPS, R, STOP, SPAWN } from '../layout.js';
import { heightAt } from '../terrain.js';
import { createGreybox, greyboxColliders } from '../greybox.js';

const buildings = greyboxColliders().filter(c => c.kind === 'building');
function corners(c) {
  const cs = Math.cos(c.th), sn = Math.sin(c.th);
  return [[-c.hx, -c.hz], [c.hx, -c.hz], [c.hx, c.hz], [-c.hx, c.hz]]
    .map(([x, z]) => [c.cx + x * cs + z * sn, c.cz - x * sn + z * cs]);
}
function pointSegment(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}
function cross(a, b, p) { return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); }
function segmentDistance(a, b, c, d) {
  const near = Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
  if (near < 1e-9) return 0;
  return cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0 ? 0 : near;
}
function polyDistance(a, b) {
  // 凸多邊形分離軸判斷包含與相交，分離後才量邊與邊的最短距離。
  const separated = [a, b].some(poly => poly.some((p, i) => {
    const q = poly[(i + 1) % poly.length], axis = [q[1] - p[1], p[0] - q[0]];
    const pa = a.map(v => v[0] * axis[0] + v[1] * axis[1]);
    const pb = b.map(v => v[0] * axis[0] + v[1] * axis[1]);
    return Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa);
  }));
  if (!separated) return 0;
  return Math.min(...a.flatMap((p, i) => b.map((q, j) => segmentDistance(p, a[(i + 1) % a.length], q, b[(j + 1) % b.length]))));
}
function pathDistance(poly, path) {
  return Math.min(...path.slice(1).flatMap((b, i) => poly.map((p, j) => segmentDistance(path[i], b, p, poly[(j + 1) % poly.length]))));
}
function verifyClear(c, margin = 0) {
  const poly = corners(c), label = `${c.landmark}：${c.cx},${c.cz}`;
  for (const road of LAYOUT.roads) assert(pathDistance(poly, road.pts) >= 3 + margin - 1e-8, `壓道路 ${label}`);
  for (const route of [...STAIRS, ...RAMPS]) assert(pathDistance(poly, route.path) >= route.width / 2 + margin - 1e-8, `壓通路 ${label}`);
  for (const b of buildings) assert(polyDistance(poly, corners(b)) >= Math.max(1e-6, margin - 1e-8), `碰建築 ${label}`);
}
function modelBounds(model) {
  model.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3();
  model.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    for (let i = 0; i < (o.count ?? 1); i++) {
      const matrix = new THREE.Matrix4();
      if (o.isInstancedMesh) o.getMatrixAt(i, matrix);
      bounds.union(o.geometry.boundingBox.clone().applyMatrix4(matrix.premultiply(o.matrixWorld)));
    }
  });
  return bounds;
}

test('銅像以錨點落地，基座與綠籬碰撞保留圓環道路', async () => {
  // 漏掉基座碰撞、錯用固定高度或改掉錨點都會被抓到。
  const { createLandmarks, landmarkColliders } = await import('../landmarks.js');
  const square = [[0, 0], [2, 0], [2, 2], [0, 2]];
  assert.equal(polyDistance(square, [[3, 0], [4, 0], [4, 2], [3, 2]]), 1);
  assert.equal(polyDistance(square, [[1, 0], [3, 0], [3, 2], [1, 2]]), 0);
  assert.equal(pathDistance(square, [[-1, 1], [3, 1]]), 0);
  const model = createLandmarks(), statue = model.getObjectByName('蔣公銅像');
  const anchor = ANCHORS['蔣公銅像'];
  assert(statue);
  assert.deepEqual(statue.position.toArray(), [anchor.x, heightAt(anchor.x, anchor.z), anchor.z]);
  assert(statue.getObjectByName('騎馬像'));
  const boxes = landmarkColliders().filter(c => c.landmark === '蔣公銅像');
  assert(boxes.length >= 5);
  assert(boxes.some(c => c.cx === anchor.x && c.cz === anchor.z));
  boxes.forEach(c => verifyClear(c));
});

test('三座好漢坡候車亭依地形落地，黑框玻璃與藍色站牌不擋通路', async () => {
  // 少一座亭或以同一固定高度放置整排亭子都不能通過。
  const { createLandmarks, landmarkColliders } = await import('../landmarks.js');
  const station = createLandmarks().getObjectByName('好漢坡站'); assert(station);
  assert.equal(station.userData.shelters.length, 3);
  for (const s of station.userData.shelters) assert.equal(s.base, heightAt(s.x, s.z));
  assert.equal(station.getObjectByName('候車亭玻璃').material.transparent, true);
  assert(station.getObjectByName('藍色站牌'));
  const collision = landmarkColliders().filter(c => c.landmark === '好漢坡站');
  assert(collision.length >= 3); collision.forEach(c => verifyClear(c));
});

test('遮雨棚跨過道路，頂高十八公尺且只在路外立柱', async () => {
  // 棚下加整塊碰撞會擋路，頂高或柱腳使用錯誤高度也會失敗。
  const { createLandmarks, landmarkColliders } = await import('../landmarks.js');
  const roof = createLandmarks().getObjectByName('遮雨棚'); assert(roof);
  roof.updateMatrixWorld(true);
  const fixture = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 1);
  fixture.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 4, 0));
  assert.equal(modelBounds(fixture).max.y, 4.5);
  const bounds = modelBounds(roof);
  assert(Math.abs(bounds.max.y - 18) <= 0.1);
  assert(bounds.min.x <= 51.5 && bounds.max.x >= 61.5);
  for (const p of roof.userData.posts) assert.equal(p.base, heightAt(p.x, p.z));
  const posts = landmarkColliders().filter(c => c.landmark === '遮雨棚');
  assert(posts.length >= 2); posts.forEach(c => verifyClear(c));
  assert(posts.every(c => Math.abs(c.cx - 56.2) > 3));
  const ray = new THREE.Raycaster(new THREE.Vector3(56.2, 16, -45.9), new THREE.Vector3(0, 1, 0));
  const hit = ray.intersectObject(roof, true)[0];
  assert(hit && hit.point.y > 17.7);
});

test('旋轉樓梯只加既有屋頂色帶，不重複蓋銜接建築', async () => {
  const { createLandmarks, landmarkColliders } = await import('../landmarks.js');
  const marker = createLandmarks().getObjectByName('旋轉樓梯(銜接建築)'); assert(marker);
  const a = ANCHORS['旋轉樓梯(銜接建築)'];
  assert.deepEqual(marker.position.toArray(), [a.x, heightAt(a.x, a.z), a.z]);
  const bounds = modelBounds(marker);
  assert(bounds.max.y - bounds.min.y <= 0.31);
  const building = createGreybox().userData.buildings.find(b => b.osm === 510739855);
  const roof = building.base + building.height;
  assert(bounds.min.y >= roof && bounds.max.y <= roof + 0.32, `色帶未貼屋頂：${bounds.min.y}，屋頂 ${roof}`);
  assert(!landmarkColliders().some(c => c.landmark === marker.name));
});

test('五個主要路口的指路牌在可達空地，完整牌面離建築與通路半公尺', async () => {
  // 用整片牌面而非中心點驗收，避免牌腳合格但牌面伸入道路。
  const { createLandmarks, landmarkSigns, landmarkColliders } = await import('../landmarks.js');
  const signs = landmarkSigns(); assert(signs.length >= 5);
  for (const name of ['好漢坡下', '好漢坡上', '外部斜坡下', '外部斜坡上', '山居下車點']) {
    const sign = signs.find(s => s.anchor === name); assert(sign, name);
    // 山居牌跟著 Task 7 搬到山居南側的站牌 STOP，其他牌照錨點。
    const a = name === '山居下車點' ? STOP : ANCHORS[name]; assert(Math.hypot(sign.x - a.x, sign.z - a.z) < 8);
    assert.equal(sign.base, heightAt(sign.x, sign.z));
    assert(sign.text.includes('舍') || sign.text.includes('食堂'));
    const c = landmarkColliders().find(c => c.sign === name); assert(c);
    verifyClear(c, 0.5);
    assert(corners(c).every(([x, z]) => x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1));
  }
  // 山居牌不能擋出生畫面：離出生點至少 4 公尺，也不在出生點背後鏡頭方向 8 公尺、寬 4 公尺的範圍內。
  const home = signs.find(s => s.anchor === '山居下車點');
  assert(Math.hypot(home.x - SPAWN.x, home.z - SPAWN.z) >= 4, '山居牌離出生點太近');
  const back = [-Math.sin(SPAWN.face), -Math.cos(SPAWN.face)], rel = [home.x - SPAWN.x, home.z - SPAWN.z];
  const along = rel[0] * back[0] + rel[1] * back[1], across = Math.abs(rel[0] * back[1] - rel[1] * back[0]);
  assert(!(along > 0 && along < 8 && across < 2 + 1.1), '山居牌在出生點與鏡頭之間');
  const model = createLandmarks(); assert(model.getObjectByName('指路牌'));
  // 從鄰近通路到牌子前方逐步走，灰盒與新碰撞不能擋住接近路線。
  const { resolve, setActiveColliders, setRoomClamp } = await import('../../../../core/collision.js');
  setActiveColliders([...greyboxColliders(), ...landmarkColliders().map(c => ({ ...c, obb: true, cs: Math.cos(c.th), sn: Math.sin(c.th) }))]);
  setRoomClamp(() => {});
  try {
    for (const s of signs) {
      const anchor = s.anchor === '山居下車點' ? STOP : ANCHORS[s.anchor];
      const length = Math.hypot(s.x - anchor.x, s.z - anchor.z);
      const route = [[anchor.x, anchor.z], [s.x - (s.x - anchor.x) * 0.9 / length, s.z - (s.z - anchor.z) * 0.9 / length]];
      for (let i = 1; i < route.length; i++) {
        const a = route[i - 1], b = route[i], steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1);
        for (let j = 0; j <= steps; j++) {
          const p = { x: a[0] + (b[0] - a[0]) * j / steps, z: a[1] + (b[1] - a[1]) * j / steps };
          p.y = heightAt(p.x, p.z);
          const before = { ...p }; resolve(p);
          assert(Math.hypot(p.x - before.x, p.z - before.z) < 0.01, `無法接近 ${s.anchor}：${JSON.stringify({ before, p })}`);
        }
      }
    }
  } finally { setActiveColliders([]); setRoomClamp(null); }
});

test('指路牌兩面箭頭依讀者面向換算，還原世界方向後指向步行路線第一個目標', async () => {
  const { landmarkSigns } = await import('../landmarks.js');
  // 用已知方向校準：南面讀者右方是東，北面讀者右方是西。
  const direction = (yaw, arrow) => new THREE.Vector3(...({
    '↑': [0, 0, -1], '→': [1, 0, 0], '↓': [0, 0, 1], '←': [-1, 0, 0],
  }[arrow])).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  assert(direction(0, '→').distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-9);
  assert(direction(Math.PI, '→').distanceTo(new THREE.Vector3(-1, 0, 0)) < 1e-9);
  const firstSteps = {
    '好漢坡下': [ANCHORS['好漢坡下'].x, ANCHORS['好漢坡下'].z],
    '好漢坡上': [ANCHORS['五舍入口'].x, ANCHORS['五舍入口'].z],
    '外部斜坡下': RAMPS[0].path[0],
    '外部斜坡上': RAMPS[0].path.at(-1),
    // 沿山居南側道路往東走向安九。
    '山居下車點': [14.9, 4.6],
  };
  for (const sign of landmarkSigns()) {
    const [x, z] = firstSteps[sign.anchor];
    // 舊版兩面都使用 sign.text，故可直接重現背面箭頭指反的缺陷。
    for (const side of [1, -1]) {
      const face = sign.faces?.find(f => f.side === side) ?? { text: sign.text };
      const target = new THREE.Vector3(x - sign.x, 0, z - sign.z).normalize();
      const actual = direction(sign.yaw + (side < 0 ? Math.PI : 0), face.text[0]);
      assert(actual.dot(target) >= Math.SQRT1_2 - 1e-9, `${sign.anchor}，面 ${side}：${face.text}`);
      assert.deepEqual(face.toward, { x, z });
    }
    assert.equal(sign.faces.length, 2);
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

test('西北遠景在圖外約三百公尺，101 高過遠山且全批模型符合手機預算', async () => {
  // 漏掉關霧、把遠景放到圖內、漏算實例或加燈光都會失敗。
  const { createLandmarks, landmarkColliders } = await import('../landmarks.js');
  const model = createLandmarks(), city = model.getObjectByName('台北市區遠景'); assert(city);
  const tower = city.getObjectByName('台北101'); assert(tower);
  const a = ANCHORS['觀景步道'];
  assert(city.position.x < R.x0 && city.position.z < R.z0);
  const boundaryDistance = Math.hypot(city.position.x - R.x0, city.position.z - R.z0);
  assert(boundaryDistance > 250 && boundaryDistance < 350);
  assert.equal(city.position.y, heightAt(city.position.x, city.position.z));
  const top = modelBounds(tower).max.y;
  const eye = heightAt(a.x, a.z) + 1.6;
  assert((top - eye) / Math.hypot(city.position.x - a.x, city.position.z - a.z) > (52 - eye) / 160);
  city.traverse(o => { if (o.isMesh) assert.equal(o.material.fog, false); });
  assert(!landmarkColliders().some(c => c.cx < R.x0 || c.cz < R.z0));
  const fixture = new THREE.Group(); fixture.add(new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 3));
  assert.deepEqual(counts(fixture), { meshes: 1, triangles: 36 });
  const budget = counts(model);
  // 地圖入口另有每面兩張文字平面，預留十個 Mesh、二十個三角形。
  assert(budget.meshes + 10 <= 40, JSON.stringify(budget));
  assert(budget.triangles + 20 <= 15000, JSON.stringify(budget));
  model.traverse(o => { assert(!o.isLight); assert(!o.castShadow); assert(!o.receiveShadow); });
});

test('正式地圖入口接入地標、碰撞與雙面指路文字，貼圖不超過五百一十二', t => {
  // 子程序隔離既有區域測試的引擎替身，模型、碰撞及貼圖工具都用正式模組。
  const script = `
    import assert from 'node:assert/strict';
    import * as THREE from 'three';
    import { registerHooks } from 'node:module';
    globalThis.__landmarkScene = new THREE.Scene();
    const hooks = registerHooks({ resolve(specifier, context, next) {
      if (specifier.endsWith('core/engine.js')) return { url: 'data:text/javascript,export const scene = globalThis.__landmarkScene;', shortCircuit: true };
      return next(specifier, context);
    }});
    const text = [];
    globalThis.document = { createElement() { const canvas = { width: 0, height: 0, drawnText: [], getContext() { return {
      fillRect() {}, clearRect() {}, fillText(value) { text.push(value); canvas.drawnText.push(value); }
    }; } }; return canvas; } };
    const { buildMap, mapLight } = await import('./src/world/buildings/uphill-campus/map.js');
    const { landmarkSigns, landmarkColliders } = await import('./src/world/buildings/uphill-campus/landmarks.js');
    const { greyboxColliders } = await import('./src/world/buildings/uphill-campus/greybox.js');
    const { colliders } = await import('./src/core/collision.js');
    buildMap();
    const root = __landmarkScene.getObjectByName('山上校區地標'); assert(root, 'buildMap 未接入地標');
    assert.equal(colliders.length, greyboxColliders().length + landmarkColliders().length + 1);
    for (const c of landmarkColliders()) assert(colliders.some(v => v.obb && v.cx === c.cx && v.cz === c.cz && v.hx === c.hx && v.hz === c.hz && Math.abs(v.sn - Math.sin(c.th)) < 1e-9));
    for (const s of landmarkSigns()) {
      assert(text.includes(s.text));
      const sign = root.getObjectByName('指路牌：' + s.anchor);
      const faces = sign.children.filter(o => o.material?.map?.isCanvasTexture);
      assert.equal(faces.length, 2);
      assert(faces.every(o => o.material.map.image.width <= 512 && o.material.map.image.height <= 512));
      assert.equal(faces[0].rotation.y, 0); assert.equal(faces[1].rotation.y, Math.PI);
      for (const data of s.faces) {
        const face = faces.find(o => o.position.z * data.side > 0);
        assert.deepEqual(face.material.map.image.drawnText, [data.text], s.anchor + '，面 ' + data.side);
      }
      assert.notEqual(faces[0].material.map, faces[1].material.map);
    }
    let meshes = 0, triangles = 0;
    root.traverse(o => { if (o.isMesh) { meshes++; triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * (o.count ?? 1); } assert(!o.castShadow && !o.receiveShadow && !o.isLight); });
    assert(meshes <= 40 && triangles <= 15000);
    const lights = new THREE.Scene(); mapLight(lights); assert.equal(lights.children.filter(o => o.isLight).length, 2);
    console.log(JSON.stringify({meshes, triangles, colliders: landmarkColliders().length, signs: landmarkSigns().length}));
    hooks.deregister();
  `;
  // 子程序要建完整張地圖，閒置時約 27 秒；上限放寬到兩分鐘，避免電腦忙碌時誤判失敗。
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', cwd: new URL('../../../../..', import.meta.url), timeout: 120000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert(JSON.parse(result.stdout).signs >= 5);
  t.diagnostic(result.stdout.trim());
});
