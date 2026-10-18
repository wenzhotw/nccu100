// 驗證平台補區與擋土牆資料，保護通路開口及雙側高差。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as layout from '../layout.js';
import * as terrain from '../terrain.js';

// 獨立射線法只用於核對配置覆蓋，避免以被測查詢產生預期值。
function contains([x, z], poly) {
  let crossings = 0;
  for (let i = 0; i < poly.length; i++) {
    const [a, b] = [poly[i], poly[(i + 1) % poly.length]];
    if ((a[1] > z) !== (b[1] > z)
      && x < a[0] + (z - a[1]) * (b[0] - a[0]) / (b[1] - a[1])) crossings++;
  }
  return crossings % 2 === 1;
}

test('A4-1 全圖由明確分區覆蓋，平台查詢遵守原分區與補區優先序', () => {
  assert.equal(typeof terrain.platformLevel, 'function');
  assert.ok(layout.FILL_REGIONS?.length);
  const { R, REGIONS, FILL_REGIONS } = layout;
  for (let x = R.x0; x <= R.x1; x++) for (let z = R.z0; z <= R.z1; z++) {
    const expected = [...REGIONS, ...FILL_REGIONS].find(r => contains([x, z], r.poly));
    assert.ok(expected, `未覆蓋：${x},${z}`);
    assert.equal(terrain.platformLevel(x, z), expected.level, `${x},${z}`);
    assert.ok(Number.isFinite(terrain.heightAt(x, z)));
  }
  assert.equal(terrain.regionAt(100, 80), null);
  assert.equal(terrain.platformLevel(115, 80), 'L3');
  // 此補區位在 L3 西側，核可輪廓仍指定為 L1，不能再用最近分區猜高度。
  assert.equal(terrain.regionAt(-5, -55), null);
  assert.equal(terrain.heightAt(-5, -55), 0);
  assert.ok(Number.isFinite(terrain.heightAt(150, 150)));
});

function pairAt(a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
  const d = length < 0.2 ? 0.1 : 0.3;
  const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
  const heights = [terrain.heightAt(x - dz / length * d, z + dx / length * d),
    terrain.heightAt(x + dz / length * d, z - dx / length * d)];
  return [Math.min(...heights), Math.max(...heights)];
}

test('A4-2 牆段中點兩側高度符合 low／high，L1／L2 分區牆保留強門檻', () => {
  assert.equal(typeof terrain.wallSegments, 'function');
  const walls = terrain.wallSegments();
  assert.ok(walls.length > 0);
  let tall = 0;
  for (const { a, b, low, high, source } of walls) {
    for (const [x, z] of [a, b]) assert.ok(x >= -120 && x <= 120 && z >= -95 && z <= 100);
    const [actualLow, actualHigh] = pairAt(a, b);
    assert.ok(actualHigh - actualLow > 0.5, JSON.stringify({ a, b, actualLow, actualHigh }));
    assert.ok(Math.abs(low - actualLow) <= 0.01 && Math.abs(high - actualHigh) <= 0.01,
      JSON.stringify({ a, b, low, high, actualLow, actualHigh }));
    if (source === 'region' && high - low >= 12) {
      tall++;
      assert.ok(actualHigh - actualLow >= 3.4);
    }
  }
  assert.ok(tall > 0);
});

function intersects(a, b, c, d) {
  const cross = (u, v) => u[0] * v[1] - u[1] * v[0];
  const sub = (u, v) => u.map((n, i) => n - v[i]);
  const r = sub(b, a), s = sub(d, c), denominator = cross(r, s);
  if (Math.abs(denominator) < 1e-10) return false;
  const t = cross(sub(c, a), s) / denominator, u = cross(sub(c, a), r) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// 量距輔助先以已知三四五直角距離、交叉與不交叉的線校準。
function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}

test('A4-3 分區牆保留兩條階梯與坡道的全寬開口', () => {
  assert.equal(intersects([0, 0], [2, 0], [1, -1], [1, 1]), true);
  assert.equal(intersects([0, 0], [2, 0], [3, -1], [3, 1]), false);
  assert.equal(distanceToSegment([3, 4], [0, 0], [-1, 0]), 5);
  for (const wall of terrain.wallSegments().filter(w => w.source === 'region')) {
    for (const passage of [...layout.STAIRS, ...layout.RAMPS]) {
      for (let i = 1; i < passage.path.length; i++) {
        assert.equal(intersects(wall.a, wall.b, passage.path[i - 1], passage.path[i]), false,
          `${passage.id}：${JSON.stringify(wall)}`);
      }
      for (let t = 0; t <= 1; t += 0.25) {
        const p = wall.a.map((v, i) => v + (wall.b[i] - v) * t);
        const distance = Math.min(...passage.path.slice(1).map((b, i) => distanceToSegment(p, passage.path[i], b)));
        assert.ok(distance > passage.width / 2, `${passage.id} 開口：${JSON.stringify(wall)}`);
      }
    }
  }
});

function sidesAt(passage, s) {
  for (let i = 1; i < passage.path.length; i++) {
    const a = passage.path[i - 1], b = passage.path[i];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (s <= length) return [-1, 1].map(sign => [
      a[0] + dx * s / length - sign * dz / length * passage.width / 2,
      a[1] + dz * s / length + sign * dx / length * passage.width / 2,
    ]);
    s -= length;
  }
  throw new Error('取樣距離超過通路。');
}

test('A4-4 主線進入 L2 後，三十公尺處左右各有通路側牆', () => {
  const walls = terrain.wallSegments().filter(w => w.source === 'passage');
  for (const p of sidesAt(layout.STAIRS[0], 30)) {
    assert.ok(walls.some(w => distanceToSegment(p, w.a, w.b) <= 0.5), `缺側牆：${p}`);
  }
});

test('A4-5 坡道十公尺處有雙側牆，全程中線與頂端接縫不被牆阻擋', () => {
  const walls = terrain.wallSegments();
  const ramp = layout.RAMPS[0];
  for (const p of sidesAt(ramp, 10)) {
    assert.ok(walls.some(w => w.source === 'passage' && distanceToSegment(p, w.a, w.b) <= 0.5), `缺坡道側牆：${p}`);
  }
  for (const wall of walls) for (let i = 1; i < ramp.path.length; i++) {
    assert.equal(intersects(wall.a, wall.b, ramp.path[i - 1], ramp.path[i]), false, JSON.stringify(wall));
  }
  // 東支線與主線交會處也不能被另一座通路的側牆封住。
  for (const stair of layout.STAIRS) for (const wall of walls) {
    for (let i = 1; i < stair.path.length; i++) {
      assert.equal(intersects(wall.a, wall.b, stair.path[i - 1], stair.path[i]), false,
        `${stair.id}：${JSON.stringify(wall)}`);
    }
  }
});
