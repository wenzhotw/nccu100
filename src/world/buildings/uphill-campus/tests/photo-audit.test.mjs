/** 2026-10-22 使用者審查：穿模、錯位與空白的回歸測試，依照片 9019～9035 的配置驗收。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LAYOUT, STAIRS, RAMPS, LOBBY } from '../layout.js';
import { heightAt, pointInPoly, projectToPath } from '../terrain.js';

const jiu = STAIRS.find(s => s.id === 'jiu-plaza');
const distanceToPoly = (x, z, pts) => Math.sqrt(projectToPath(x, z, [...pts, pts[0]]).distance);

test('坡道東側欄杆與坡頂圍籬止於九舍廣場與樓梯，不穿過紅磚廣場，也不留短於 1.5 公尺的殘段', async () => {
  const { rampRails, SLOPE_FENCE } = await import('../ramp-details.js');
  const { PLAZA } = await import('../courtyard.js');
  const inPlaza = ([x, z]) => x >= PLAZA.x0 && x <= PLAZA.x1 && z >= PLAZA.z0 && z <= PLAZA.z1;
  for (const offset of [4.2, SLOPE_FENCE]) {
    const rails = rampRails(offset);
    for (const { a, b } of rails) {
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      assert.ok(!inPlaza(m), `欄杆 ${offset} 穿過廣場：${m}`);
      assert.ok(projectToPath(...m, jiu.path).distance > (jiu.width / 2 + 0.3) ** 2, `欄杆 ${offset} 擋在樓梯上：${m}`);
    }
    // 連續段：相鄰兩段端點相接才算同一段。
    const runs = [];
    for (const r of rails) {
      const last = runs.at(-1);
      if (last && Math.hypot(last.end[0] - r.a[0], last.end[1] - r.a[1]) < 1e-6) { last.length += Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]); last.end = r.b; }
      else runs.push({ length: Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]), end: r.b });
    }
    for (const run of runs) assert.ok(run.length >= 1.5, `欄杆 ${offset} 殘段只有 ${run.length.toFixed(2)} 公尺`);
  }
});

test('中庭樹冠不碰牆、路燈不插進樹冠，紅磚車道兩側各一排', async () => {
  const { COURTYARD_TREES, COURTYARD_LAMPS } = await import('../courtyard.js');
  const walls = LAYOUT.buildings.filter(b => [510739853, 510739854, 510739855].includes(b.osm));
  for (const t of COURTYARD_TREES) {
    const canopy = 2.35 * t.scale;
    for (const b of walls) {
      assert.ok(!pointInPoly(t.x, t.z, b.pts), `樹種在 ${b.name || b.osm} 裡`);
      assert.ok(distanceToPoly(t.x, t.z, b.pts) >= canopy + 0.2, `樹冠碰到 ${b.name || b.osm}：${t.x},${t.z}`);
    }
    for (const l of COURTYARD_LAMPS) assert.ok(Math.hypot(t.x - l.x, t.z - l.z) >= canopy + 0.4, `路燈插進樹冠：${l.x},${l.z}`);
  }
  for (const l of COURTYARD_LAMPS) for (const b of walls) assert.ok(distanceToPoly(l.x, l.z, b.pts) >= 0.6, `路燈貼牆：${l.x},${l.z}`);
  const north = COURTYARD_TREES.filter(t => t.z < LOBBY.door.z), south = COURTYARD_TREES.filter(t => t.z > LOBBY.door.z);
  assert.ok(north.length >= 2 && south.length >= 2);
});

test('坡頂指路牌立在廣場西南角的路邊，不擋在廣場中間', async () => {
  const { landmarkSigns } = await import('../landmarks.js');
  const { PLAZA } = await import('../courtyard.js');
  const sign = landmarkSigns().find(s => s.anchor === '外部斜坡上');
  assert.ok(sign.x <= PLAZA.x0 + 1.5, `指路牌在廣場中間：${sign.x},${sign.z}`);
  const d = Math.sqrt(projectToPath(sign.x, sign.z, RAMPS[0].path).distance);
  assert.ok(d >= 3.5 && d <= 5, `指路牌離路中線 ${d.toFixed(2)} 公尺`);
});

test('照片 9034：九舍樓梯指標立在樓梯口西側（左手邊），不在樓梯東側草坡上', async () => {
  const { landmarkSigns } = await import('../landmarks.js');
  const sign = landmarkSigns().find(s => s.anchor === '九舍樓梯下');
  const [a, b] = jiu.path, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
  const side = ((sign.x - a[0]) * -dz + (sign.z - a[1]) * dx) / l;
  // 面向樓梯往上看，左手邊（西側）在路徑的負側。
  assert.ok(side < 0, `指標在樓梯右側：${sign.x},${sign.z}`);
  assert.ok(projectToPath(sign.x, sign.z, jiu.path).distance > (jiu.width / 2 + 0.2) ** 2, '指標擋在踏階上');
});

test('照片 9025：樓梯頂有紅磚步道接到北側廣場，中間沒有草地空白', async () => {
  const { createGreybox } = await import('../greybox.js');
  const model = createGreybox(); model.updateMatrixWorld(true);
  const bricks = model.children.filter(m => m.userData.brick || /廣場|車道|磚道/.test(m.name));
  const ray = new THREE.Raycaster(), top = jiu.path.at(-1);
  const [a, b] = jiu.path, l = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
  for (let s = 0.4; s <= 2.6; s += 0.55) {
    const x = top[0] + ux * s, z = top[1] + uz * s;
    ray.set(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(bricks, false)[0];
    assert.ok(hit && Math.abs(hit.point.y - 15) < 0.1, `樓梯頂與廣場之間是空白：${x.toFixed(1)},${z.toFixed(1)}`);
  }
});

test('九舍樓梯與東支線上端的側牆是沿坡度連續的整面牆，不是一格一格疊起來', async () => {
  const { rampProps } = await import('../ramp-details.js');
  const walls = rampProps().filter(p => p.kind === 'stair-wall');
  assert.ok(walls.length <= 4, `九舍樓梯側牆分成 ${walls.length} 段`);
  for (const w of walls) assert.ok(w.shape === 'sloped' && w.w >= 2.5, `側牆段太短或不是斜面：${w.w}`);
  const east = rampProps().filter(p => p.kind === 'east-stair-wall');
  assert.ok(east.length <= 2 && east.every(w => w.shape === 'sloped'), `東支線矮牆分成 ${east.length} 段`);
});

test('照片 9028／9030／9033：坡道第二段西側往五舍方向下降，不再出現高於路面的平台牆', () => {
  // 西側（左手邊）離路中線 4 到 6 公尺的地面要低於路面；照片只拍到路緣護欄外這一帶。
  const [a, b] = [RAMPS[0].path[1], RAMPS[0].path[2]], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
  const nx = -dz / l, nz = dx / l; // 往右（東）的法向；西側取負號。
  for (const t of [0.15, 0.4, 0.65, 0.9]) {
    const cx = a[0] + dx * t, cz = a[1] + dz * t, road = heightAt(cx, cz);
    for (const off of [4, 6]) {
      const x = cx - nx * off, z = cz - nz * off;
      if (STAIRS.some(s => projectToPath(x, z, s.path).distance <= (s.width / 2) ** 2)) continue;
      assert.ok(heightAt(x, z) <= road + 1e-9, `西側 ${off} 公尺高於路面：${x.toFixed(1)},${z.toFixed(1)} ${heightAt(x, z)} > ${road.toFixed(2)}`);
    }
  }
  // 東側土坡（坡道草坡與樓梯旁草坡以外）維持第三層。
  assert.equal(heightAt(3, -19), 15);
});

test('照片 9026：廣場西北緣只留機車架在紅磚上，不在草地放零散護欄', async () => {
  const { courtyardProps, PLAZA } = await import('../courtyard.js');
  const props = courtyardProps();
  assert.ok(!props.some(p => p.kind === 'plaza-jersey'), '草地上留有零散護欄');
  for (const p of props.filter(p => p.kind === 'bike-rack')) {
    assert.ok(p.x >= PLAZA.x0 && p.x <= PLAZA.x1 && p.z >= PLAZA.z0 && p.z <= PLAZA.z1, `機車架不在廣場上：${p.x},${p.z}`);
  }
});

test('坡道東側人行道與草坡沿路線平順，不是鋸齒狀小格', async () => {
  const { createGreybox } = await import('../greybox.js');
  const model = createGreybox();
  for (const name of ['東側人行道', '東側草坡']) {
    const mesh = model.getObjectByName(name);
    assert.ok(mesh, name);
    const p = mesh.geometry.attributes.position;
    // 平順帶狀面的每個頂點都落在某一段坡道的平行偏移線上（每 0.5 公尺內分欄）；鋸齒方格的頂點會落在線與線之間。
    const [inner, outer] = name === '東側人行道' ? [2.95, 4.2] : [4.2, 12.2];
    const cols = Math.max(1, Math.round((outer - inner) / 0.5)), allowed = Array.from({ length: cols + 1 }, (_, k) => inner + (outer - inner) * k / cols);
    const segments = RAMPS[0].path.slice(1).map((b, i) => [RAMPS[0].path[i], b]);
    let off = 0;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const ok = segments.some(([a, b]) => {
        const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), d = ((x - a[0]) * -dz + (z - a[1]) * dx) / l;
        return allowed.some(o => Math.abs(d - o) < 0.02);
      });
      if (!ok) off++;
    }
    assert.equal(off, 0, `${name} 有 ${off} 個頂點不在平行偏移線上`);
  }
});

test('照片 9034：九舍樓梯兩側是順著樓梯的草坡，不是三公尺高的直立平台牆', async () => {
  const { stairHeight } = await import('../terrain.js');
  const [a, b] = jiu.path, l = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
  // 樓梯東側（右手邊）每 0.25 公尺往外走 5 公尺，地面高度不可突然跳超過 0.5 公尺。
  for (let s = 0.5; s < l; s += 1) {
    let previous = stairHeight(jiu, s);
    for (let d = 1.4; d <= 5; d += 0.25) {
      const x = a[0] + ux * s - uz * d, z = a[1] + uz * s + ux * d, h = heightAt(x, z);
      // 碰到九舍 ABC 區外牆就停（建物內不是地面）。
      if (LAYOUT.buildings.some(bd => pointInPoly(x, z, bd.pts))) break;
      assert.ok(Math.abs(h - previous) <= 0.5, `樓梯旁 ${s.toFixed(1)}/${d.toFixed(2)} 公尺處高度從 ${previous.toFixed(2)} 跳到 ${h.toFixed(2)}`);
      previous = h;
    }
  }
});

test('九舍樓梯踏面是沿樓梯方向的整塊踏板，不是方格拼成的鋸齒邊', async () => {
  const { createGreybox } = await import('../greybox.js');
  const model = createGreybox();
  const treads = model.getObjectByName('九舍磚砌踏面');
  assert.ok(treads);
  const p = treads.geometry.attributes.position;
  const [a, b] = jiu.path, l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  // 每個頂點都落在踏面左右邊線（離樓梯中線 1.2 公尺）上。
  let off = 0;
  for (let i = 0; i < p.count; i++) {
    const d = Math.abs(((p.getX(i) - a[0]) * -(b[1] - a[1]) + (p.getZ(i) - a[1]) * (b[0] - a[0])) / l);
    if (Math.abs(d - jiu.width / 2) > 0.02) off++;
  }
  assert.equal(off, 0, `踏面有 ${off} 個頂點不在樓梯邊線上`);
});

test('中庭路燈是短燈桿，燈頭不伸進樹冠', async () => {
  const { COURTYARD_TREES, COURTYARD_LAMPS, LAMP_ARM } = await import('../courtyard.js');
  assert.ok(LAMP_ARM <= 0.4, `燈臂 ${LAMP_ARM} 公尺太長`);
  for (const t of COURTYARD_TREES) for (const l of COURTYARD_LAMPS)
    assert.ok(Math.hypot(t.x - l.x, t.z - l.z) - LAMP_ARM >= 2.35 * t.scale + 0.2, `燈頭伸進樹冠：${l.x},${l.z}`);
});

test('人行道比路面高一個路緣石（0.12 公尺），沿路邊有路緣石立面', async () => {
  const { rampHeight, CURB } = await import('../terrain.js');
  assert.equal(CURB, 0.12);
  const ramp = RAMPS[0], [a, b] = [ramp.path[1], ramp.path[2]], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
  for (const t of [0.2, 0.5, 0.8]) {
    const x = a[0] + dx * t - dz / l * 3.6, z = a[1] + dz * t + dx / l * 3.6;
    const road = rampHeight(ramp, projectToPath(x, z, ramp.path).s);
    assert.ok(Math.abs(heightAt(x, z) - (road + CURB)) < 1e-9, `人行道高度 ${heightAt(x, z)}，路面 ${road}`);
  }
  const { createGreybox } = await import('../greybox.js');
  assert.ok(createGreybox().getObjectByName('人行道路緣石'), '缺少路緣石');
});

test('東側草坡不蓋到人行道與路面，人行道不蓋到路面', async () => {
  const { createGreybox } = await import('../greybox.js');
  const model = createGreybox();
  for (const [name, min, max] of [['東側人行道', 2.94, 4.21], ['東側草坡', 4.19, Infinity]]) {
    const p = model.getObjectByName(name).geometry.attributes.position;
    let bad = 0;
    for (let i = 0; i < p.count; i++) {
      const d = Math.sqrt(projectToPath(p.getX(i), p.getZ(i), RAMPS[0].path).distance);
      if (d < min || d > max) bad++;
    }
    assert.equal(bad, 0, `${name} 有 ${bad} 個頂點跑到該帶以外`);
  }
});

test('紅色禁停線沿路緣石內側鋪，坡道轉角兩段相接不交叉凸到路面', async () => {
  const { createGreybox } = await import('../greybox.js');
  const p = createGreybox().getObjectByName('紅色禁停線').geometry.attributes.position;
  let bad = 0;
  for (let i = 0; i < p.count; i++) {
    const d = Math.sqrt(projectToPath(p.getX(i), p.getZ(i), RAMPS[0].path).distance);
    if (d < 2.8 || d > 2.9) bad++;
  }
  assert.equal(bad, 0, `紅色禁停線有 ${bad} 個頂點離路緣石超過 5 公分`);
});
