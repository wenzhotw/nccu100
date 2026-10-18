// 驗證外部斜坡的細台階高度、平台銜接與好漢坡東支線交會。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as layout from '../layout.js';
import * as terrain from '../terrain.js';

const lengthOf = path => path.slice(1).reduce((sum, [x, z], i) =>
  sum + Math.hypot(x - path[i][0], z - path[i][1]), 0);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9,
  `${actual} 應接近 ${expected}`);

function pointAt(path, s) {
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i];
    const length = Math.hypot(bx - ax, bz - az);
    if (s <= length) return [ax + (bx - ax) * s / length, az + (bz - az) * s / length];
    s -= length;
  }
  return path.at(-1);
}

test('坡道沿線從十二升到十五公尺，每次最多升高五公分', () => {
  assert.ok(layout.RAMPS, '需匯出坡道資料');
  assert.equal(typeof terrain.rampHeight, 'function');
  const ramp = layout.RAMPS[0];
  assert.deepEqual(ramp, { id: 'z-p', path: [[-4.9,10.3],[-7.2,-3],[-11.8,-8.1],[-12,-20.3]],
    width: 7, from: 12, to: 15, step: 0.05 });
  const length = lengthOf(ramp.path);
  close(terrain.rampHeight(ramp, -0.5), 12);
  close(terrain.rampHeight(ramp, 0), 12);
  close(terrain.rampHeight(ramp, length), 15);
  close(terrain.rampHeight(ramp, length + 0.5), 15);
  let previous = 12;
  for (let i = 1; i <= Math.ceil(length / 0.05); i++) {
    const h = terrain.rampHeight(ramp, Math.min(i * 0.05, length));
    assert.ok(h >= previous && h - previous <= 0.05 + 1e-9);
    close((h - 12) / 0.05, Math.round((h - 12) / 0.05));
    previous = h;
  }
  // 已知直線長六十公尺，每一公尺恰升一個五公分台階。
  const straight = { from: 12, to: 15, step: 0.05, path: [[0, 0], [60, 0]] };
  for (let i = 1; i < 60; i++) {
    close(terrain.rampHeight(straight, i), 12 + i * 0.05);
    close(terrain.rampHeight(straight, i - 0.001), 12 + (i - 1) * 0.05);
  }
});

test('高度入口沿坡道中線逐步上升，不被平台或階梯挖出落差', () => {
  const ramp = layout.RAMPS[0];
  const length = lengthOf(ramp.path);
  let previous = 12;
  for (let i = 0; i <= Math.ceil(length / 0.05); i++) {
    const s = Math.min(i * 0.05, length);
    const h = terrain.heightAt(...pointAt(ramp.path, s));
    close(h, terrain.rampHeight(ramp, s));
    assert.ok(h >= previous && h - previous <= 0.05 + 1e-9, `沿線 ${s}：${previous} → ${h}`);
    previous = h;
  }
});

test('坡道兩端外延半公尺銜接端點高度，北側平路維持十五公尺', () => {
  const ramp = layout.RAMPS[0];
  close(terrain.heightAt(...pointAt(ramp.path, -0.5)), 12);
  close(terrain.heightAt(...pointAt([...ramp.path].reverse(), -0.5)), 15);
  assert.equal(terrain.heightAt(-0.6, -34.9), 15);
});

// 用單位方向向量量投影與垂距，獨立於正式程式的距離平方實作。
function projectionAt(x, z, path) {
  let nearest = { distance: Infinity, s: 0 }, walked = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i];
    const length = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / length, uz = (bz - az) / length;
    const along = (x - ax) * ux + (z - az) * uz;
    const distance = along < 0 ? Math.hypot(x - ax, z - az)
      : along > length ? Math.hypot(x - bx, z - bz)
        : Math.abs((x - ax) * uz - (z - az) * ux);
    if (distance < nearest.distance) {
      nearest = { distance, s: walked + Math.max(0, Math.min(length, along)) };
    }
    walked += length;
  }
  return nearest;
}

test('坡道全寬網格採坡道高度，階梯交會處最多差一階', () => {
  // 先以三四五三角形及端點外延校準取樣方法。
  assert.deepEqual(projectionAt(3, 4, [[0, 0], [10, 0]]), { distance: 4, s: 3 });
  assert.deepEqual(projectionAt(-3, 4, [[0, 0], [10, 0]]), { distance: 5, s: 0 });
  assert.deepEqual(projectionAt(13, 4, [[0, 0], [10, 0]]), { distance: 5, s: 10 });
  const ramp = layout.RAMPS[0];
  const xs = ramp.path.map(([x]) => x), zs = ramp.path.map(([, z]) => z);
  const minX = Math.floor((Math.min(...xs) - ramp.width / 2) * 4);
  const maxX = Math.ceil((Math.max(...xs) + ramp.width / 2) * 4);
  const minZ = Math.floor((Math.min(...zs) - ramp.width / 2) * 4);
  const maxZ = Math.ceil((Math.max(...zs) + ramp.width / 2) * 4);
  let samples = 0, crossings = 0;
  for (let ix = minX; ix <= maxX; ix++) {
    for (let iz = minZ; iz <= maxZ; iz++) {
      const x = ix / 4, z = iz / 4;
      const projection = projectionAt(x, z, ramp.path);
      if (projection.distance > ramp.width / 2) continue;
      samples++;
      const expected = terrain.rampHeight(ramp, projection.s);
      const actual = terrain.heightAt(x, z);
      const inStairs = layout.STAIRS.some(stair =>
        projectionAt(x, z, stair.path).distance <= stair.width / 2);
      if (inStairs) {
        crossings++;
        assert.ok(Math.abs(actual - expected) <= 0.3 + 1e-9,
          `交會（${x}，${z}）：階梯 ${actual}，坡道 ${expected}`);
      } else close(actual, expected);
    }
  }
  assert.ok(samples > 0 && crossings > 0, '網格必須實際涵蓋坡道及階梯交會');
});

test('東支線終點外延四公尺，每十公分的高度差最多一階', () => {
  const path = [...layout.STAIRS[1].path].reverse();
  let previous = terrain.heightAt(...path[0]);
  close(previous, 15);
  for (let i = 1; i <= 40; i++) {
    const h = terrain.heightAt(...pointAt(path, -i / 10));
    assert.ok(Math.abs(h - previous) <= 0.3 + 1e-9, `外延 ${i / 10}：${previous} → ${h}`);
    previous = h;
  }
});
