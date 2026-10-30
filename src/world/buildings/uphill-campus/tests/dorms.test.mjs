// 2026-10-28 照片 9072 到 9089、9100：自強五六七八舍外觀與周圍環境、觀景步道看出去的台北市景。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LAYOUT, R, STAIRS } from '../layout.js';
import { heightAt, projectToPath } from '../terrain.js';
import { hillRoadAt } from '../hillside.js';
import { BASE, TOP, FLOORS, dormFaces, ledges, acUnits, pipes, STAIR_TOWERS, PAVED, STALLS, CARS, TANKS, LAMPS,
  bedRects, treeSpots, insideDorm, dormColliders } from '../dorms-model.js';
import { VIEW, TOWER_AT, TOWER_PARTS, RIDGES, cityBlocks, createTaipeiView, valleyDrop } from '../taipei-view.js';

const roads = LAYOUT.roads.map(r => r.pts);
const onRoad = (x, z, half = 3) => roads.some(p => projectToPath(x, z, p).distance < half ** 2) || hillRoadAt(x, z) !== null;

test('三棟宿舍每面外牆都貼立面，法線朝外，五舍高架段牆底在連通段底', () => {
  const faces = dormFaces();
  assert(faces.length >= 25, `外牆面數：${faces.length}`);
  for (const f of faces) {
    assert(!insideDorm(f.mid[0] + f.n[0] * 0.5, f.mid[1] + f.n[1] * 0.5), `法線朝內：${f.mid}`);
    assert(insideDorm(f.mid[0] - f.n[0] * 0.5, f.mid[1] - f.n[1] * 0.5), `背面不是建物：${f.mid}`);
    assert.equal(f.y1, TOP);
  }
  // 五舍北伸到六舍之間的高架段，下方是車道（道路 1313447898、1313447899 經過 z = -8）。
  const lifted = faces.filter(f => f.y0 > BASE);
  assert(lifted.length > 0 && lifted.every(f => f.osm === 230992373 && f.mid[1] > -11.1));
  // 七八舍中段大廳兩面各一。
  assert.equal(faces.filter(f => f.kind === 'lobby').length, 1);
  assert.equal(faces.filter(f => f.kind === 'lobbyBack').length, 1);
});

test('樓板飾帶每層一道，冷氣掛在一般外牆、不掛在大廳與高架段下方', () => {
  const faces = dormFaces();
  assert(ledges().length >= faces.length * (FLOORS - 1));
  const ac = acUnits();
  assert(ac.length > 150 && ac.length < 400, `冷氣數：${ac.length}`);
  for (const u of ac) {
    const f = faces.find(face => projectToPath(u.x, u.z, [face.a, face.b]).distance < 0.3 ** 2);
    assert(f && f.kind === 'dorm' && u.y > f.y0, `冷氣位置不對：${u.x},${u.z}`);
  }
  assert(pipes().every(p => p.y1 > TOP));
});

test('停車場、車、水塔、路燈、樓梯塔都在第二層平地上，不壓到道路、山坡路與階梯', () => {
  for (const { rect: [x0, z0, x1, z1] } of PAVED) {
    for (const [x, z] of [[x0, z0], [x1, z1], [x0, z1], [x1, z0], [(x0 + x1) / 2, (z0 + z1) / 2]]) {
      assert(Math.abs(heightAt(x, z) - BASE) < 0.05, `鋪面不在平地：${x},${z}`);
      assert(!insideDorm(x, z));
    }
  }
  for (const [x, z] of CARS) {
    assert(PAVED.some(({ rect: [x0, z0, x1, z1] }) => x > x0 && x < x1 && z > z0 && z < z1), `車停在鋪面外：${x},${z}`);
    assert(!onRoad(x, z), `車擋到路：${x},${z}`);
  }
  assert(STALLS.every(s => s.x1 > s.x0 && s.depth >= 4.8));
  for (const c of dormColliders()) {
    assert(!onRoad(c.cx, c.cz), `${c.kind} 擋到路：${c.cx},${c.cz}`);
    assert(STAIRS.every(s => projectToPath(c.cx, c.cz, s.path).distance > 2 ** 2), `${c.kind} 擋到階梯`);
  }
  for (const t of STAIR_TOWERS) assert(Math.abs(heightAt((t.x0 + t.x1) / 2, (t.z0 + t.z1) / 2) - BASE) < 0.3);
  assert.equal(TANKS.length, 4); assert(LAMPS.length >= 4);
  // 路燈桿立在路邊，不立在車道或停車場的柏油上。
  for (const [x, z] of LAMPS) {
    assert(!PAVED.some(({ rect: [x0, z0, x1, z1] }) => x > x0 && x < x1 && z > z0 && z < z1), `路燈在鋪面上：${x},${z}`);
    assert(!insideDorm(x, z), `路燈在建物裡：${x},${z}`);
  }
});

test('花台與樹都種在空地上：不在建物裡、不在路上，樹與樹至少相隔四公尺', () => {
  const beds = bedRects(), trees = treeSpots();
  assert(beds.length >= 8, `花台數：${beds.length}`);
  for (const [x0, z0, x1, z1] of beds) {
    const c = [(x0 + x1) / 2, (z0 + z1) / 2];
    assert(!insideDorm(...c) && !onRoad(...c), `花台位置：${c}`);
  }
  assert(trees.length >= 15, `樹數：${trees.length}`);
  for (const [x, z] of trees) {
    assert(!insideDorm(x, z) && !onRoad(x, z, 3.2), `樹位置：${x},${z}`);
    assert(trees.every(([u, v]) => (u === x && v === z) || Math.hypot(u - x, v - z) >= 4), `樹太擠：${x},${z}`);
  }
});

test('台北市景在圖外北偏西：101 對準實際方位，高過遠山與市區，全部不吃霧也沒有燈', () => {
  const view = createTaipeiView();
  const tower = view.getObjectByName('台北101'), city = view.getObjectByName('台北市區大樓');
  assert(tower && city);
  // 實際方位：山上校區往北偏西約 15 度看到 101。
  const bearing = Math.atan2(TOWER_AT[0] - VIEW.from.x, -(TOWER_AT[1] - VIEW.from.z)) * 180 / Math.PI;
  assert(bearing < -8 && bearing > -22, `101 方位：${bearing}`);
  assert(TOWER_AT[1] < R.z0 - 300, '101 要在圖外夠遠的地方');
  const eye = heightAt(VIEW.from.x, VIEW.from.z) + 1.6, d101 = Math.hypot(TOWER_AT[0] - VIEW.from.x, TOWER_AT[1] - VIEW.from.z);
  const top = VIEW.ground + Math.max(...TOWER_PARTS.map(p => p.y0 + p.h));
  const angle101 = (top - eye) / d101;
  assert(angle101 > 0.2, `101 看起來太矮：${angle101}`);
  for (const r of RIDGES) assert(Math.max(...r.pts.map(p => VIEW.ground + p[1])) - eye < angle101 * r.d, `${r.name} 比 101 高`);
  for (const [x, z, , , h] of cityBlocks()) {
    assert((VIEW.ground + h - eye) / Math.hypot(x - VIEW.from.x, z - VIEW.from.z) < angle101 * 0.75, '有大樓搶過 101');
    const dx = Math.max(R.x0 - x, 0, x - R.x1), dz = Math.max(R.z0 - z, 0, z - R.z1);
    assert(Math.hypot(dx, dz) > 250, `市區大樓離地圖太近：${x},${z}`);
  }
  // 八節竹節塔身，每節往上張開。
  const sections = TOWER_PARTS.filter(p => /^第\d節$/.test(p.name));
  assert.equal(sections.length, 8);
  assert(sections.every(p => p.r1 > p.r0));
  view.traverse(o => {
    assert(!o.isLight);
    if (o.isMesh && o.name !== '山谷樹林') assert.equal(o.material.fog, false, o.name);
  });
  // 一般相機遠端 1200 公尺：從圖上最遠的角落也看得到遠山與 101。
  for (const corner of [[R.x1, R.z1], [R.x0, R.z1], [R.x1, R.z0]]) {
    for (const r of RIDGES) for (const [b] of r.pts) {
      const x = VIEW.from.x + Math.sin(b * Math.PI / 180) * r.d, z = VIEW.from.z - Math.cos(b * Math.PI / 180) * r.d;
      assert(Math.hypot(x - corner[0], z - corner[1]) < 1180, `${r.name} 超出相機遠端`);
    }
  }
});

test('圖外北側地面往山谷下降，圍籬邊不掉、到市區底下為止', () => {
  assert.equal(valleyDrop(0, R.z0), 0);
  assert.equal(valleyDrop(0, R.z1 + 100), 0);
  assert(valleyDrop(0, R.z0 - 60) > 15);
  assert(Math.abs(-valleyDrop(0, R.z0 - 400) - (VIEW.ground - 22)) < 1e-9);
});

test('遠景整批模型符合手機預算', () => {
  let meshes = 0, triangles = 0;
  createTaipeiView().traverse(o => {
    if (!o.isMesh) return;
    meshes++;
    triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 * (o.count ?? 1);
  });
  assert(meshes <= 6, `Mesh：${meshes}`);
  assert(triangles <= 12000, `三角形：${triangles}`);
});
