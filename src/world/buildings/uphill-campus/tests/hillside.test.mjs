// 2026-10-28 照片 9088、9089、9101、9102、9108 到 9132：五六七八舍山丘的西、北、南側山坡。
import test from 'node:test';
import assert from 'node:assert/strict';
import { heightAt, wallSegments, projectToPath } from '../terrain.js';
import { LAYOUT, STAIRS } from '../layout.js';
import { HAIRPIN, inHill } from '../hillside.js';

const road = LAYOUT.roads.find(r => r.osm === 510739837).pts;

test('環山一道西段與外側在第一層，不再有多出來的 12 公尺高台', () => {
  for (const [x, z] of [[-102.8, 1.9], [-115.5, 19.5], [-117.6, 42.9], [-110, 0], [-118, 30], [-100, 56]]) {
    assert.equal(heightAt(x, z), 0, `（${x}，${z}）`);
  }
});

test('五六舍之間往西一路緩降：18 約 10、19 約 8.9、髮夾彎 8.4，坡度不超過 8%', () => {
  const pts = [[-47, -8], ...road.slice(1)];
  let previous = heightAt(-47, -8), walked = 0, last = [-47, -8];
  assert.equal(previous, 12);
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], l = Math.hypot(bx - ax, bz - az);
    for (let s = 1; s <= l; s++) {
      const p = [ax + (bx - ax) * s / l, az + (bz - az) * s / l], h = heightAt(...p);
      assert.ok(h <= previous + 1e-9, `上坡：${h} > ${previous}`);
      // 以兩取樣點的實際距離算坡度（轉角兩側的取樣點相距不只 1 公尺）。
      assert.ok((previous - h) / Math.hypot(p[0] - last[0], p[1] - last[1]) <= 0.08 + 1e-9, `太陡：${p}`);
      previous = h; last = p;
    }
    walked += l;
  }
  assert.ok(Math.abs(heightAt(-73.7, -1.3) - 10) < 0.3, `18：${heightAt(-73.7, -1.3)}`);
  assert.ok(Math.abs(heightAt(-84.6, 9.4) - 8.9) < 0.3, `19：${heightAt(-84.6, 9.4)}`);
  assert.equal(heightAt(HAIRPIN.x, HAIRPIN.z), 8.4);
  assert.ok(walked > 40);
});

test('18 外側是一路往下的陡坡，坡腳是約 3.2 公尺的擋土牆接環山一道', () => {
  // 由 18 路邊往西北走到環山一道。
  let previous = heightAt(-73.7 - 3.6 * 0.7, -1.3 - 3.6 * 0.7);
  for (let t = 4; t <= 22; t += 1) {
    const h = heightAt(-73.7 - t * 0.7, -1.3 - t * 0.7);
    assert.ok(h <= previous + 0.05, `坡面回升：${t}`);
    previous = h;
  }
  assert.equal(previous, 0);
  const foot = wallSegments().filter(w => w.source === 'region' && Math.abs(w.high - w.low - 3.2) < 0.01
    && projectToPath((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, [[-71.1, -33], [-84.1, -21.8], [-92.2, -10.5], [-99, -0.5]]).distance < 0.5);
  assert.ok(foot.length > 0, '缺坡腳擋土牆');
  assert.ok(foot.every(w => w.cap < 0.5), '坡腳牆頂應與坡面齊平');
});

test('好漢坡貼著山坡：外側沒有高牆、有扶手，靠山側有石砌擋土牆', async () => {
  const { greyboxColliders } = await import('../greybox.js');
  const rails = greyboxColliders().filter(c => c.kind === 'hill-rail' && c.rail === 'stair');
  assert.ok(rails.length > 10, `扶手太少：${rails.length}`);
  const stair = STAIRS.find(s => s.id === 'haohanpo');
  const walls = wallSegments().filter(w => w.source === 'passage');
  // 第三段（往西南爬升）外側是西北邊，靠山側是東南邊。
  const [a, b] = [stair.path[2], stair.path[3]], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  for (const t of [0.3, 0.5, 0.7]) {
    const c = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const out = [c[0] + n[0] * 1.6, c[1] + n[1] * 1.6], hill = [c[0] - n[0] * 1.6, c[1] - n[1] * 1.6];
    const near = p => walls.some(w => projectToPath(...p, [w.a, w.b]).distance < 0.6 ** 2);
    // 外側只允許踏面底下露出的側邊（牆頂最多比踏面高 0.2），不能是高過踏面的溝牆。
    const step = heightAt(...c);
    assert.ok(walls.filter(w => projectToPath(...out, [w.a, w.b]).distance < 0.6 ** 2)
      .every(w => w.high + w.cap <= step + 0.5), `外側有高牆：${t}`);
    // 靠山側是沿踏面外緣建模的連續石砌擋土牆（hillside-model.js 的 stoneWalls），以碰撞體確認。
    const stones = (await import('../hillside-model.js')).hillColliders().filter(c => c.rail === 'stone');
    assert.ok(stones.some(c => Math.hypot(c.cx - hill[0], c.cz - hill[1]) < 1.2), `靠山側缺擋土牆：${t}`);
    assert.ok(rails.some(r => Math.hypot(r.cx - out[0], r.cz - out[1]) < 1.5), `外側缺扶手：${t}`);
    const ground = heightAt(c[0] + n[0] * 3, c[1] + n[1] * 3);
    assert.ok(ground <= step + 0.3, `外側地面高過踏面，像埋在溝裡：${ground} > ${step}`);
  }
});

test('髮夾彎是加寬的平路面，外側有欄杆，三條路都接得上', async () => {
  const { greyboxColliders } = await import('../greybox.js');
  for (const [dx, dz] of [[0, 0], [4, 0], [-4, 2], [0, 5]]) assert.equal(heightAt(HAIRPIN.x + dx, HAIRPIN.z + dz), 8.4);
  const rails = greyboxColliders().filter(c => c.kind === 'hill-rail' && c.rail === 'hairpin');
  assert.ok(rails.length >= 8);
  // 欄杆在西北外側，不擋往東北（18）、往東（七八舍）、往南（環山二道）的路。
  for (const [x, z] of [[-87, 12], [-86, 19], [-94.5, 24]]) {
    assert.ok(rails.every(r => Math.hypot(r.cx - x, r.cz - z) > 2), `欄杆擋路：${x},${z}`);
  }
});

test('19 往南的路下到環山二道（第一層），環山二道往東爬回 12 公尺', () => {
  assert.equal(heightAt(-75.8, 67.1), 0);
  assert.ok(heightAt(-44.3, 67) > 4 && heightAt(-44.3, 67) < 6);
  assert.equal(heightAt(-4.5, 46.8), 12);
  assert.ok(inHill(-60, 60) && !inHill(-40, 20));
});

test('好漢坡踏面是沿路線方向的整塊踏板（每階一塊、轉角一塊平台），不是小方格拼成的鋸齒邊', async () => {
  const { stairBoxes } = await import('../hillside-model.js');
  const { stairHeight } = await import('../terrain.js');
  const boxes = stairBoxes();
  assert.ok(boxes.length > 40 && boxes.length < 120, `踏板數：${boxes.length}`);
  for (const b of boxes) {
    assert.ok([3.2, 2.4].includes(b.width), `踏板寬：${b.width}`);
    // 一般踏板 0.8 公尺；段落尾端可能切到半階，短於 0.4 公尺的碎片已併入轉角平台。
    assert.ok(b.length >= 0.4, `踏板太短：${b.length}`);
    assert.ok(b.height >= 0.6 - 1e-6, `踏板太薄：${b.height}`);
  }
  // 抽查主線第一階：踏板頂面就是第一階高度。
  const main = STAIRS.find(s => s.id === 'haohanpo');
  assert.ok(boxes.some(b => Math.abs(b.y + b.height / 2 - stairHeight(main, 0.4)) < 1e-9));
});

test('環山一道依照片有雙黃中線、白邊線、紅色禁停線、外側路燈與牆邊停車，停車不擋路中線', async () => {
  const { ringRoadProps } = await import('../hillside-model.js');
  const { parts, colliders } = ringRoadProps();
  const colors = new Set(parts.map(p => p.color));
  for (const c of ['#f2c230', '#f4f4ee', '#d65a4f', '#5d6470']) assert.ok(colors.has(c), `缺 ${c}`);
  const cars = colliders.filter(c => c.kind === 'car'), lamps = colliders.filter(c => c.kind === 'lamp');
  assert.ok(cars.length >= 3 && lamps.length >= 5);
  const ring = LAYOUT.roads.find(r => r.osm === 261595331).pts;
  for (const c of cars) assert.ok(projectToPath(c.x, c.z, ring).distance > 0.9 ** 2, '停車擋到路中線');
});
