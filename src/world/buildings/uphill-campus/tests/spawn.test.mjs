// 驗證山居站牌、公車停靠區與下車出生點的位置，確保一下車不在建築裡也不貼著牆。
import test from 'node:test';
import assert from 'node:assert/strict';
import { LAYOUT, STOP } from '../layout.js';
import { pointInPoly, projectToPath } from '../terrain.js';

const road = LAYOUT.roads.find(r => r.osm === 510739838);

test('山居站牌在建築輪廓外，公車停靠區落在山居南側道路上', () => {
  for (const b of LAYOUT.buildings) assert(!pointInPoly(STOP.x, STOP.z, b.pts), `站牌在 ${b.name || b.osm} 裡`);
  // 停靠區黃框中心在站牌南側 3.2 公尺（map.js busStop），要在六公尺寬的道路內。
  assert(projectToPath(STOP.x, STOP.z + 3.2, road.pts).distance <= 3 ** 2);
});

test('候車亭整個頂棚範圍不壓道路也不壓建築，離站牌十公尺內', async () => {
  const { BUS_SHELTER } = await import('../layout.js');
  const { greyboxColliders } = await import('../greybox.js');
  // 頂棚 4.4×2.0 是候車亭最大的投影範圍（map.js busStop）。
  const { x, z } = BUS_SHELTER, hx = 2.2, hz = 1.0;
  const corners = [[x - hx, z - hz], [x + hx, z - hz], [x + hx, z + hz], [x - hx, z + hz]];
  const samples = [...corners, [x, z], [x, z - hz], [x, z + hz], [x - hx, z], [x + hx, z]];
  for (const r of LAYOUT.roads) for (const p of samples) {
    assert(projectToPath(...p, r.pts).distance >= 3 ** 2, `壓到道路 ${r.osm}`);
  }
  for (const b of LAYOUT.buildings) for (const p of samples) assert(!pointInPoly(...p, b.pts), `壓到 ${b.name}`);
  for (const c of greyboxColliders().filter(c => c.kind === 'building')) {
    assert(Math.abs(c.cx - x) > c.hx + hx + 0.3 || Math.abs(c.cz - z) > c.hz + hz + 0.3
      || c.th !== 0, `碰到建築碰撞 ${c.cx},${c.cz}`);
  }
  assert(Math.hypot(x - STOP.x, z - STOP.z) <= 10);
});

test('下車出生點站在路邊：離建築一點五公尺以上、不被碰撞推開、地面十二公尺、面向北到東北', async () => {
  const { SPAWN } = await import('../layout.js');
  const { heightAt } = await import('../terrain.js');
  const { greyboxColliders } = await import('../greybox.js');
  const { landmarkColliders } = await import('../landmarks.js');
  const { resolve, setActiveColliders, setRoomClamp } = await import('../../../../core/collision.js');
  for (const b of LAYOUT.buildings) {
    assert(!pointInPoly(SPAWN.x, SPAWN.z, b.pts), `在 ${b.name} 裡`);
    assert(projectToPath(SPAWN.x, SPAWN.z, [...b.pts, b.pts[0]]).distance >= 1.5 ** 2, `離 ${b.name || b.osm} 太近`);
  }
  assert.equal(heightAt(SPAWN.x, SPAWN.z), 12);
  setActiveColliders([...greyboxColliders(), ...landmarkColliders().map(c => ({ ...c, obb: true, cs: Math.cos(c.th), sn: Math.sin(c.th) }))]);
  setRoomClamp(() => {});
  try {
    const p = { x: SPAWN.x, y: 12, z: SPAWN.z }; resolve(p);
    assert(Math.hypot(p.x - SPAWN.x, p.z - SPAWN.z) < 1e-6, '出生點在碰撞裡');
  } finally { setActiveColliders([]); setRoomClamp(null); }
  // 角色 rotation.y＝face，面向 (sin face, cos face)；π 是正北，往東偏不超過 45 度。
  const fx = Math.sin(SPAWN.face), fz = Math.cos(SPAWN.face);
  assert(fz < 0 && fx >= -1e-9 && Math.atan2(fx, -fz) <= Math.PI / 4 + 1e-9, '面向不在北到東北之間');
  // 鏡頭 yaw 與角色面向一致（山下預設 yaw 0 對 face π）。
  assert(Math.abs(Math.cos(SPAWN.face - Math.PI - SPAWN.yaw) - 1) < 1e-9);
});

test('出生點不在搭公車下山的觸發範圍內，避免一下車就跳出提示', async () => {
  const { SPAWN } = await import('../layout.js');
  // index.js 的 exit 是 { x: STOP.x, z: STOP.z - 0.8, r: 3 }；index.js 依賴瀏覽器引擎，Node 不直接載入。
  assert(Math.hypot(SPAWN.x - STOP.x, SPAWN.z - (STOP.z - 0.8)) > 3);
});

test('建築入口的出生設定讀取 SPAWN，entrance 與 returnTo 不變', async () => {
  // index.js 會載入瀏覽器引擎，這裡讀原始碼確認接線，不在 Node 執行它。
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  assert.match(source, /spawn:\s*\{\s*\.\.\.SPAWN,\s*pitch:/);
  assert.match(source, /exit:\s*\{\s*x:\s*STOP\.x,\s*z:\s*STOP\.z - 0\.8,\s*r:\s*3/);
  assert.match(source, /entrance:\s*\{\s*x:\s*BOARD\.x,\s*z:\s*BOARD\.z,\s*r:\s*3/);
  assert.match(source, /returnTo:\s*\{\s*x:\s*BOARD\.x - 1\.2,\s*z:\s*BOARD\.z,\s*yaw:\s*Math\.PI \/ 2/);
});
