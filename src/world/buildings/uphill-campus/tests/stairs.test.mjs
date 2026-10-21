// 驗證好漢坡階梯的踏面、休息平台、支線銜接與平面投影。
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

test('主線每次升高 0.3，四十階踏面至少 0.8 公尺', () => {
  assert.ok(layout.STAIRS, '需匯出階梯資料');
  assert.equal(typeof terrain.stairHeight, 'function');
  const stair = layout.STAIRS[0];
  const length = lengthOf(stair.path);
  assert.equal(stair.id, 'haohanpo');
  assert.equal(stair.width, 3.2);
  assert.equal(terrain.stairHeight(stair, -1), 0);
  assert.equal(terrain.stairHeight(stair, 0), 0);
  assert.equal(terrain.stairHeight(stair, length), 12);
  assert.equal(terrain.stairHeight(stair, length + 1), 12);
  let previous = 0, rises = 0;
  for (let i = 1; i <= Math.ceil(length * 10); i++) {
    const s = Math.min(i / 10, length);
    const h = terrain.stairHeight(stair, s);
    assert.ok(h >= previous && h - previous <= 0.3 + 1e-9);
    if (h > previous) {
      close(h - previous, 0.3);
      rises++;
    }
    previous = h;
  }
  assert.equal(rises, 40);
  // 最後一個取樣間距不足 0.1，不能拿取樣位置差當實際踏面深度。
  // 以高度轉換的二分定位量踏面，另用第一階 0.8 公尺校準。
  let lastRise = 0;
  for (let step = 1; step <= 40; step++) {
    let low = 0, high = length;
    for (let i = 0; i < 45; i++) {
      const mid = (low + high) / 2;
      if (terrain.stairHeight(stair, mid) < step * 0.3 - 1e-9) low = mid;
      else high = mid;
    }
    if (step === 1) close(high, 0.8);
    assert.ok(high - lastRise >= 0.8 - 1e-9);
    lastRise = high;
  }
});

test('主線範圍優先於平台，兩端往外半公尺沒有高度跳躍', () => {
  const stair = layout.STAIRS[0];
  const length = lengthOf(stair.path);
  close(terrain.heightAt(...pointAt(stair.path, 1)), 0.3);
  close(terrain.heightAt(...pointAt(stair.path, -0.5)), 0);
  const reverse = [...stair.path].reverse();
  close(terrain.heightAt(...pointAt(reverse, -0.5)), 12);
  close(terrain.heightAt(...pointAt(stair.path, length)), 12);
  // 第一段北側，距中線 1.59 公尺仍在範圍，1.61 公尺已在 L1 平台。
  const [x, z] = pointAt(stair.path, 2);
  const [a, b] = stair.path;
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  close(terrain.heightAt(x + dz / len * 1.59, z - dx / len * 1.59), 0.6);
  close(terrain.heightAt(x + dz / len * 1.61, z - dx / len * 1.61), 0);
});

test('東支線由主線接點的實際階高起步，依坡道接點階數接上斜坡', () => {
  const [main, east] = layout.STAIRS;
  const joinS = lengthOf(main.path.slice(0, 5));
  close(terrain.stairHeight(main, joinS), 6.3);
  assert.equal(Object.hasOwn(east, 'from'), false);
  close(terrain.stairHeight(east, -1), 6.3);
  close(terrain.stairHeight(east, 0), terrain.stairHeight(main, joinS));
  close(terrain.heightAt(...east.path[0]), 6.3);
  const length = lengthOf(east.path);
  const ramp = layout.RAMPS[0];
  const top = terrain.rampHeight(ramp, terrain.projectToPath(...east.path.at(-1), ramp.path).s);
  close(terrain.stairHeight(east, length), top);
  close(terrain.heightAt(...east.path.at(-1)), top);
  let previous = 6.3, rises = 0;
  for (let i = 1; i <= Math.ceil(length * 10); i++) {
    const s = Math.min(i / 10, length);
    const h = terrain.stairHeight(east, s);
    assert.ok(h >= previous && h - previous <= 0.3 + 1e-9);
    if (h > previous) { assert.ok(h - previous <= 0.3 + 1e-9); rises++; }
    previous = h;
  }
  assert.equal(rises, Math.round((top - 6.3) / 0.3));
  close(terrain.heightAt(...pointAt(east.path, 2)), 6.9);
});

test('路徑太短連踏面與最低休息平台都放不下時拒絕計算', () => {
  const short = { from: 0, to: 3.9, path: [[0, 0], [11, 0]] };
  for (const s of [-1, 0, 5, 11, 12]) {
    assert.throws(() => terrain.stairHeight(short, s), /路徑太短/);
  }
});

test('每十二階之後平均分配休息平台，最後一階不另加平台', () => {
  // 二十五階共需二十公尺踏面，剩餘六公尺平均分成兩個三公尺平台。
  const stair = { from: 0, to: 7.5, path: [[0, 0], [26, 0]] };
  for (const [s, h] of [[0.799, 0], [0.8, 0.3], [9.6, 3.6], [12.6, 3.6],
    [13.399, 3.6], [13.4, 3.9], [22.2, 7.2], [25.2, 7.2], [25.999, 7.2], [26, 7.5]]) {
    close(terrain.stairHeight(stair, s), h);
  }
  // 十二階的最後一步不加休息平台，足長 9.6 公尺即可。
  close(terrain.stairHeight({ from: 0, to: 3.6, path: [[0, 0], [9.6, 0]] }, 9.6), 3.6);
});

function withStairs(stairs, check) {
  const saved = [...layout.STAIRS];
  try {
    layout.STAIRS.splice(0, layout.STAIRS.length, ...stairs);
    check();
  } finally {
    layout.STAIRS.splice(0, layout.STAIRS.length, ...saved);
  }
}

test('同座階梯折返重疊時選最近段，等距選較小的沿線距離', () => {
  withStairs([{ from: 0, to: 9.6, width: 3.2,
    path: [[0, 0], [16, 0], [16, 2], [0, 2]] }], () => {
    close(terrain.heightAt(2, 0.9), 0.6);
    close(terrain.heightAt(2, 1), 0.6);
    close(terrain.heightAt(2, 1.1), 8.7);
  });
});

test('多座階梯重疊時選最近中線，等距保留配置順序', () => {
  withStairs([
    { from: 0, to: 9.6, width: 3.2, path: [[0, 0], [32, 0]] },
    { from: 3, to: 12.6, width: 3.2, path: [[0, 2], [32, 2]] },
  ], () => {
    close(terrain.heightAt(2, 0.9), 0.6);
    close(terrain.heightAt(2, 1), 0.6);
    close(terrain.heightAt(2, 1.1), 3.6);
    // 距中線剛好半寬仍屬階梯，超過邊界改回 L2 平台。
    close(terrain.heightAt(2, -1.6), 0.6);
    close(terrain.heightAt(2, -1.601), 12);
  });
});


test('九舍直樓梯從坡道東側人行道高度起步，逐階接上廣場，兩端半公尺連續且退讓坡道與建築', () => {
  const jiu = layout.STAIRS.find(s => s.id === 'jiu-plaza');
  assert.ok(jiu);
  assert.deepEqual(jiu.path, [[-7.6,-14],[-2.6,-22]]);
  assert.equal(jiu.width, 2.4);
  assert.equal(jiu.fromRamp, 'z-p');
  assert.deepEqual(layout.ANCHORS['九舍樓梯下'], { x: -7.6, z: -14, level: 'L2' });
  const ramp = layout.RAMPS[0];
  // 樓梯口緊貼人行道，起步高度等於坡道在樓梯口旁的高度，玩家從人行道走上第一階不會陷進地面。
  const from = terrain.rampHeight(ramp, terrain.projectToPath(...jiu.path[0], ramp.path).s);
  const length = lengthOf(jiu.path);
  close(terrain.stairHeight(jiu, 0), from);
  close(terrain.stairHeight(jiu, length), 15);
  let previous = from, rises = 0;
  for (let s = -0.5; s <= length + 0.5; s += 0.05) {
    const p = s <= length ? pointAt(jiu.path, s) : pointAt([...jiu.path].reverse(), length - s);
    const h = terrain.heightAt(...p);
    assert.ok(Math.abs(h - previous) <= 0.3 + 1e-9, `高度跳 ${previous}→${h}`);
    // 起步高度不是 0.3 的整數倍，最後一階與廣場只差幾公分，不算一階。
    if (h > previous + 0.1) rises++;
    if (s >= 0 && s <= length) assert.ok(Math.sqrt(terrain.projectToPath(...p, ramp.path).distance) > 4.2);
    assert.ok(!layout.LAYOUT.buildings.some(b => terrain.pointInPoly(...p,b.pts)));
    previous = h;
  }
  assert.equal(rises, Math.round((15 - from) / 0.3));
});
