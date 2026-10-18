// 驗證山上校區配置的範圍、層別與具名位置，供後續地形和建模使用。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as layout from '../layout.js';

test('配置保留規格資料與授權，包含原始零值符號', () => {
  const spec = JSON.parse(readFileSync(new URL('../../../../../docs/superpowers/specs/2026-10-18-uphill-campus-layout.json', import.meta.url), 'utf8'));
  const { _license, ...data } = layout.LAYOUT;
  assert.equal(_license, '© OpenStreetMap 貢獻者（ODbL）');
  assert.ok(Object.is(data.landmarks['山居下車點'][1], spec.landmarks['山居下車點'][1]), '保留原始負零座標');
  assert.deepEqual(data, spec);
});

const requiredAnchors = ['五舍入口', '六舍入口', '七八舍入口', '九舍D區入口', '安九正門', '十舍入口', '好漢坡下', '好漢坡上', '好漢坡東支線上', '外部斜坡下', '外部斜坡上', '觀景步道'];

test('外部斜坡下對應核可斜坡路徑的 L2 起點', () => {
  assert.deepEqual(layout.ANCHORS['外部斜坡下'], { x: -4.9, z: 10.3, level: 'L2' });
});

function contains(poly, { x, z }) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    const cross = (x - xi) * (zj - zi) - (z - zi) * (xj - xi);
    if (Math.abs(cross) < 1e-9 && x >= Math.min(xi, xj) && x <= Math.max(xi, xj)
      && z >= Math.min(zi, zj) && z <= Math.max(zi, zj)) return true;
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

test('錨點涵蓋約定名稱與地標，都在範圍內且標了層別', () => {
  const { ANCHORS, LAYOUT, R } = layout;
  assert.ok(ANCHORS);
  const landmarks = Object.entries(LAYOUT.landmarks).filter(([name]) => name !== '福利社(Google)');
  for (const name of [...requiredAnchors, ...landmarks.map(([name]) => name)]) {
    assert.ok(Object.hasOwn(ANCHORS, name), name);
  }
  for (const [name, a] of Object.entries(ANCHORS)) {
    assert.ok(Number.isFinite(a.x) && Number.isFinite(a.z), name);
    assert.ok(a.x > R.x0 && a.x < R.x1 && a.z > R.z0 && a.z < R.z1, name);
    assert.ok(['L1', 'L2', 'L3'].includes(a.level), name);
    assert.deepEqual(layout.REGIONS.filter(r => contains(r.poly, a)).map(r => r.level), [a.level], name);
  }
  for (const [name, [x, z]] of landmarks) {
    assert.equal(ANCHORS[name].x, x, name);
    assert.equal(ANCHORS[name].z, z, name);
  }
  for (const [name, level] of Object.entries({
    '山居下車點': 'L2', '安九正門': 'L2', '觀景步道': 'L2',
    '旋轉樓梯(銜接建築)': 'L3', '服務中心': 'L3', '自強十舍': 'L3',
    '蔣公銅像': 'L1', '好漢坡站': 'L1',
  })) assert.equal(ANCHORS[name].level, level, name);
});

test('三層高度與分區', () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(contains(square, { x: 5, z: 5 }), true);
  assert.equal(contains(square, { x: 15, z: 5 }), false);
  assert.equal(contains(square, { x: 0, z: 5 }), true);
  assert.equal(layout.SCALE, 0.6);
  assert.equal(layout.FLOOR_H, 2.4);
  assert.deepEqual(layout.LEVELS, { L1: 0, L2: 12, L3: 15 });
  assert.deepEqual(layout.REGIONS.map(r => r.level).sort(), ['L1', 'L2', 'L3']);
  assert.deepEqual(layout.PLATFORMS, []);
  assert.equal(layout.MAX_LEVELS, 3);
  for (const { poly } of layout.REGIONS) {
    assert.ok(poly.length >= 3);
    for (const [x, z] of poly) {
      assert.ok(x >= layout.R.x0 && x <= layout.R.x1 && z >= layout.R.z0 && z <= layout.R.z1);
    }
  }
});

test('公車站在原點，地圖範圍包含所有地標', () => {
  const { STOP, R, SIZE, LAYOUT } = layout;
  assert.deepEqual(STOP, { x: 0, z: 0 });
  assert.deepEqual(R, { x0: -120, x1: 120, z0: -95, z1: 100 });
  assert.deepEqual(SIZE, { w: 240, d: 195 });
  for (const [name, [x, z]] of Object.entries(LAYOUT.landmarks)) {
    assert.ok(x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1, name);
  }
});
