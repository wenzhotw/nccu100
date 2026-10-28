// 2026-10-29：山上校區日夜時鐘，夜晚在觀景步道告示牌互動，台北 101 施放跨年煙火。
import test from 'node:test';
import assert from 'node:assert/strict';
import { ANCHORS } from '../layout.js';
import { heightAt } from '../terrain.js';
import { hillRoadAt } from '../hillside.js';
import { CYCLE, createSkyClock, sampleSky } from '../day-night.js';
import { VIEW, TOWER_AT, TOWER_PARTS } from '../taipei-view.js';
import { SIGN, SHOW_SECONDS, fireworksSchedule, createFireworks } from '../fireworks.js';

test('天色自動繞一圈：一開始是白天，二十分鐘內會經過夜晚，固定夜晚就是夜晚', () => {
  const clock = createSkyClock();
  assert.equal(clock.mode, 'auto');
  assert(!clock.isNight(0));
  let sawNight = false;
  for (let t = 0; t < CYCLE; t += 10) sawNight ||= clock.isNight(t);
  assert(sawNight, '自動日夜沒有經過夜晚');
  clock.setMode('night', 100); assert(clock.isNight(100));
  clock.setMode('day', 100); assert(!clock.isNight(100));
  assert.equal(sampleSky(0.5).sky, '#bfe4f6');
  assert.equal(sampleSky(0).night, 1);
});

test('按鈕依序切換自動、白天、黃昏、夜晚，切回自動時天色從當下接著走', () => {
  const clock = createSkyClock();
  assert.deepEqual([1, 2, 3, 4].map(() => clock.next(50)), ['day', 'dusk', 'night', 'auto']);
  // 從夜晚切回自動：同一時刻天色不跳。
  assert(Math.abs(clock.sample(50).phase - 0.02) < 1e-9);
  assert(clock.sample(60).phase > 0.02);
});

test('告示牌立在觀景步道路邊（不在路面上），面向道路', () => {
  const a = ANCHORS['觀景步道'];
  assert(Math.hypot(SIGN.x - a.x, SIGN.z - a.z) < 7, '告示牌離觀景步道太遠');
  assert.equal(hillRoadAt(SIGN.x, SIGN.z, 0.3), null, '告示牌在路面上');
  // 互動範圍要伸到路面，站在路上就按得到。
  const reach = [SIGN.x + Math.sin(SIGN.yaw) * SIGN.reach, SIGN.z + Math.cos(SIGN.yaw) * SIGN.reach];
  assert.notEqual(hillRoadAt(...reach), null, '站在路上按不到告示牌');
  assert(Math.abs(heightAt(SIGN.x, SIGN.z) - heightAt(a.x, a.z)) < 2.5);
});

test('煙火從 101 塔身與塔頂噴出，三十秒內放完，最後一波最密', () => {
  const bursts = fireworksSchedule();
  const top = Math.max(...TOWER_PARTS.map(p => p.y0 + p.h));
  assert(bursts.length >= 40, `煙火太少：${bursts.length}`);
  for (const b of bursts) {
    assert(b.t >= 0 && b.t < SHOW_SECONDS);
    assert(Math.hypot(b.x - TOWER_AT[0], b.z - TOWER_AT[1]) < 90, '煙火離 101 太遠');
    assert(b.y > VIEW.ground + top * 0.3 && b.y < VIEW.ground + top * 1.45, `煙火高度：${b.y}`);
    assert(b.count >= 30 && /^#[0-9a-f]{6}$/.test(b.color));
  }
  const finale = bursts.filter(b => b.t > SHOW_SECONDS - 4).length, early = bursts.filter(b => b.t < 4).length;
  assert(finale >= 8 && finale > early, `最後一波：${finale}，開頭：${early}`);
});

test('還沒施放時看不到煙火，施放中有亮點，放完就收起來；不吃霧也沒有燈', () => {
  const fw = createFireworks();
  const visible = () => fw.points.geometry.drawRange.count;
  fw.update(10); assert.equal(visible(), 0); assert(!fw.playing(10));
  fw.start(10);
  assert(fw.playing(12));
  fw.update(16); assert(visible() > 50, `施放中亮點：${visible()}`);
  fw.update(10 + SHOW_SECONDS + 4); assert.equal(visible(), 0); assert(!fw.playing(10 + SHOW_SECONDS + 4));
  assert.equal(fw.points.material.fog, false);
  fw.points.traverse(o => assert(!o.isLight));
  // 施放中再按一次不會重來。
  const again = createFireworks();
  again.start(20); again.start(25); assert(again.playing(20 + SHOW_SECONDS - 1)); assert(!again.playing(20 + SHOW_SECONDS + 4));
});
