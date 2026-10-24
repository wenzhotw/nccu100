/** 驗證玩家座標對應的地標、通路、建築與層別名稱。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

test('最近八公尺內的地標使用玩家看得懂的名稱', async () => {
  const { zoneName } = await import('../zone-names.js');
  assert.equal(zoneName({ x: -90.6, z: -31.4 }), '蔣公銅像');
  assert.equal(zoneName({ x: -42.7, z: -50 }), '好漢坡站');
  assert.equal(zoneName({ x: 5, z: 6.8 }), '山居學習中心');
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
    if (specifier.endsWith('courtyard-scenery.js')) return { url: 'data:text/javascript,export function buildCourtyardScenery(){};export function batchCourtyardScene(){}', shortCircuit: true };
    if (specifier.endsWith('/zq10.js')) return { url: 'data:text/javascript,export function buildZq10(){}', shortCircuit: true };
    // 山居景觀跟中庭植栽一樣載入共用樹木，需要真的場景，這裡只測區域名稱。
    if (specifier.endsWith('/shanju.js')) return { url: 'data:text/javascript,export function buildShanju(){}', shortCircuit: true };
    if (specifier.endsWith('core/engine.js')) {
      return { url: 'data:text/javascript,export const scene = null;', shortCircuit: true };
    }
    return next(specifier, context);
  } });
  try {
    const { mapZone } = await import('../map.js');
    assert.equal(mapZone({ x: 5, z: 6.8 }), '山居學習中心');
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
  assert.equal(zoneName({ x: -4.9, z: 10.3 }), '自強宿舍區');
  const dx = -0.2, dz = -12.2, length = Math.hypot(dx, dz);
  const p = { x: -11.9 + dz / length * 3, z: -14.2 - dx / length * 3 };
  assert.equal(zoneName(p), '外部斜坡');
  assert.notEqual(zoneName({ x: p.x - 0.01, z: p.z }), '外部斜坡');
});

test('階梯主線與東支線優先於附近建築和觀景步道', async () => {
  const { zoneName } = await import('../zone-names.js');
  assert.equal(zoneName({ x: -50, z: -25 }), '好漢坡');
  assert.equal(zoneName({ x: -29.1, z: -25.2 }), '好漢坡');
  assert.equal(zoneName({ x: -60.5, z: -8.1 }), '好漢坡');
  // 主線第一點在站牌八公尺內，地標仍優先。
  assert.equal(zoneName({ x: -43.1, z: -43.1 }), '好漢坡站');
});

test('山居學習中心以搬到山居南側的站牌為準，下車出生點也顯示山居學習中心', async () => {
  const { zoneName } = await import('../zone-names.js');
  const { STOP, SPAWN } = await import('../layout.js');
  assert.equal(zoneName(STOP), '山居學習中心');
  assert.equal(zoneName(SPAWN), '山居學習中心');
  assert.equal(zoneName({ x: STOP.x + 7.9, z: STOP.z }), '山居學習中心');
  // 舊原點已不是站牌，回到建築或層別名稱。
  assert.notEqual(zoneName({ x: -4, z: -6 }), '山居學習中心');
});

test('九舍步行樓梯顯示自己的名稱，不算好漢坡', async () => {
  const { zoneName } = await import('../zone-names.js');
  // 樓梯中點 (-5.1,-18)，依 2026-10-20 照片 9034 由坡道東側通往九舍廣場。
  assert.equal(zoneName({ x: -5.1, z: -18 }), '九舍樓梯');
});

test('中庭中央顯示九舍中庭，北側廣場保留宿舍區名稱', async () => {
  const {zoneName}=await import('../zone-names.js');
  assert.equal(zoneName({x:20,z:-27.8}),'自強九舍中庭');
  assert.equal(zoneName({x:8,z:-31.7}),'自強九舍・十舍');
  assert.notEqual(zoneName({x:20,z:-20}),'自強九舍中庭');
});

test('D6 大廳使用大廳名稱，只有開口外 1.3 公尺內顯示旋轉樓梯',async()=>{
  const {zoneName}=await import('../zone-names.js');
  const {LOBBY}=await import('../layout.js');const {cx,cz,r}=LOBBY.well,B=LOBBY.bounds;
  for(const p of [{x:B.x0+1,z:B.z0+1},{x:B.x1-1,z:B.z1-1}])assert.equal(zoneName(p),'自強九舍大廳');
  assert.equal(zoneName({x:cx+r,z:cz}),'旋轉樓梯');
  assert.equal(zoneName({x:cx+r+1.3,z:cz}),'旋轉樓梯');
  assert.equal(zoneName({x:cx+r+1.31,z:cz}),'自強九舍大廳');
});
