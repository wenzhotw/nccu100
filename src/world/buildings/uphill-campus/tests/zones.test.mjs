/** 驗證玩家座標對應的地標、通路、建築與層別名稱。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

test('最近八公尺內的地標使用玩家看得懂的名稱', async () => {
  const { zoneName } = await import('../zone-names.js');
  assert.equal(zoneName({ x: -90.6, z: -31.4 }), '蔣公銅像');
  assert.equal(zoneName({ x: -42.7, z: -50 }), '好漢坡站');
  assert.equal(zoneName({ x: 0, z: 0 }), '山居學習中心');
  assert.equal(zoneName({ x: 72.6, z: -36.3 }), '服務中心');
  assert.equal(zoneName({ x: 69.6, z: -15.5 }), '自強十舍');
  assert.equal(zoneName({ x: 34.3, z: -0.5 }), '安九食堂');
  assert.equal(zoneName({ x: 32.8, z: -25 }), '旋轉樓梯');
  assert.equal(zoneName({ x: 51.5, z: -45.9 }), '遮雨棚');
  assert.equal(zoneName({ x: 61.5, z: -45.9 }), '遮雨棚');
});

test('地圖區域入口回傳地標、通路、建築與空地的新名稱', async () => {
  // 只隔離 WebGL 引擎初始化，區域判斷與地形資料使用正式模組。
  const hooks = registerHooks({ resolve(specifier, context, next) {
    if (specifier.endsWith('core/engine.js')) {
      return { url: 'data:text/javascript,export const scene = null;', shortCircuit: true };
    }
    return next(specifier, context);
  } });
  try {
    const { mapZone } = await import('../map.js');
    assert.equal(mapZone({ x: 0, z: 0 }), '山居學習中心');
    assert.equal(mapZone({ x: -50, z: -25 }), '好漢坡');
    assert.equal(mapZone({ x: -11.8, z: -8.1 }), '外部斜坡');
    assert.equal(mapZone({ x: -73.7, z: -1.3 }), '觀景步道');
    assert.equal(mapZone({ x: 21.7, z: -16.5 }), '自強九舍ABC區');
    assert.equal(mapZone({ x: 110, z: 70 }), '自強九舍・十舍');
  } finally { hooks.deregister(); }
});

test('三層空地使用對應層名稱，無名建築不產生空名稱', async () => {
  const { zoneName } = await import('../zone-names.js');
  assert.equal(zoneName({ x: -110, z: -80 }), '環山一道');
  assert.equal(zoneName({ x: -100, z: 60 }), '自強宿舍區');
  assert.equal(zoneName({ x: 110, z: 70 }), '自強九舍・十舍');
  assert.equal(zoneName({ x: 32, z: -13 }), '自強宿舍區');
});

test('有名建築的輪廓內與兩公尺內顯示建築名稱，福利社參考點不搶名稱', async () => {
  const { zoneName } = await import('../zone-names.js');
  assert.equal(zoneName({ x: 21.7, z: -16.5 }), '自強九舍ABC區');
  assert.equal(zoneName({ x: -25, z: 1 }), '自強六舍');
  assert.equal(zoneName({ x: -25, z: 6.8 }), '自強六舍');
  assert.notEqual(zoneName({ x: -25, z: 6.81 }), '自強六舍');
});

test('觀景步道使用折線四公尺範圍，階梯仍優先', async () => {
  const { zoneName } = await import('../zone-names.js');
  assert.equal(zoneName({ x: -73.7, z: -1.3 }), '觀景步道');
  assert.equal(zoneName({ x: -96.1, z: 18.1 }), '觀景步道');
  assert.notEqual(zoneName({ x: -96.11, z: 18.1 }), '觀景步道');
  assert.equal(zoneName({ x: -60.5, z: -8.1 }), '好漢坡');
});

test('外部斜坡中段與全寬邊界顯示通路名稱', async () => {
  const { zoneName } = await import('../zone-names.js');
  assert.equal(zoneName({ x: -11.8, z: -8.1 }), '外部斜坡');
  assert.equal(zoneName({ x: -4.9, z: 10.3 }), '外部斜坡');
  const dx = -0.2, dz = -12.2, length = Math.hypot(dx, dz);
  const p = { x: -11.9 - dz / length * 3.5, z: -14.2 + dx / length * 3.5 };
  assert.equal(zoneName(p), '外部斜坡');
  assert.notEqual(zoneName({ x: p.x + 0.01, z: p.z }), '外部斜坡');
});

test('階梯主線與東支線優先於附近建築和觀景步道', async () => {
  const { zoneName } = await import('../zone-names.js');
  assert.equal(zoneName({ x: -50, z: -25 }), '好漢坡');
  assert.equal(zoneName({ x: -29.1, z: -25.2 }), '好漢坡');
  assert.equal(zoneName({ x: -60.5, z: -8.1 }), '好漢坡');
  // 主線第一點在站牌八公尺內，地標仍優先。
  assert.equal(zoneName({ x: -43.1, z: -43.1 }), '好漢坡站');
});
