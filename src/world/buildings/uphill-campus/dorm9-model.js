/**
 * 自強九舍 ABC、D 區其餘外牆（純資料，不碰引擎，可在 Node 測試）。
 *
 * 依照片 9024（九舍北側）：粉灰色小方磚牆、每扇窗上下一道深灰窗楣窗台、白框四格窗、
 * 窗邊掛冷氣、一樓窗戶加鐵窗；屋頂深褐收頭與東端（照片 9005，zq10.js）一致。
 * 已有外觀的牆不重複貼：山居塔樓（shanju.js）、ABC 南面安九食堂（shanju.js）、x 大於 37 的東端（zq10.js）。
 */
import { BUILDING_FLOORS, FLOOR_H, LAYOUT, LEVELS, LOBBY, SHANJU } from './layout.js';
import { heightAt, platformLevel, pointInPoly } from './terrain.js';

/** 每間寢室一格 3 公尺寬；floors 是各棟樓層數（與灰盒一致）。 */
export const DORM9 = { bay: 3, floorH: FLOOR_H, floors: { 510739853: BUILDING_FLOORS[510739853], 510739854: BUILDING_FLOORS[510739854] } };

const BUILDINGS = LAYOUT.buildings.filter(b => b.osm in DORM9.floors)
  .map(b => ({ ...b, pts: b.osm === SHANJU.osm ? SHANJU.rest : b.pts }));
const lobby = LAYOUT.buildings.find(b => b.osm === LOBBY.osm);
/** 大廳只有一層樓：貼著大廳的高樓牆，從大廳屋頂以上才看得到。 */
export const LOBBY_TOP = LOBBY.base + BUILDING_FLOORS[LOBBY.osm] * FLOOR_H;
const tower = [[SHANJU.x0, SHANJU.z0], [SHANJU.x1, SHANJU.z0], [SHANJU.x1, SHANJU.z1], [SHANJU.x0, SHANJU.z1]];
const hidden = (x, z) => [...BUILDINGS.map(b => b.pts), tower].some(p => pointInPoly(x, z, p));

/** 牆面：{ osm, a, b, mid, n 外側法線, len, base 樓板起算高度, y0 牆底, y1 牆頂 }。 */
export function dorm9Faces() {
  const faces = [];
  for (const bld of BUILDINGS) {
    const base = Math.min(...bld.pts.map(([x, z]) => LEVELS[platformLevel(x, z)]));
    const y1 = base + DORM9.floors[bld.osm] * FLOOR_H;
    bld.pts.forEach((a, i) => {
      const b = bld.pts[(i + 1) % bld.pts.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.4 || Math.min(a[0], b[0]) >= 37) return;
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      let n = [(b[1] - a[1]) / len, -(b[0] - a[0]) / len];
      if (pointInPoly(mid[0] + n[0] * 0.3, mid[1] + n[1] * 0.3, bld.pts)) n = [-n[0], -n[1]];
      // 貼著另一區或山居塔樓的牆看不到；南面是安九食堂。
      const ox = mid[0] + n[0] * 0.4, oz = mid[1] + n[1] * 0.4;
      if (hidden(ox, oz)) return;
      if (n[1] > 0.9 && mid[1] > -4) return;
      const ground = pointInPoly(ox, oz, lobby.pts) ? LOBBY_TOP : heightAt(mid[0] + n[0] * 0.6, mid[1] + n[1] * 0.6);
      const y0 = Math.max(base, Math.min(ground, y1 - 3));
      faces.push({ osm: bld.osm, a, b, mid, n, len, base, y0, y1 });
    });
  }
  return faces;
}

/** 每層樓窗台下一道深灰飾帶（照片 9024 的橫向深色線），一樓地面以上才有。 */
export function dorm9Ledges() {
  const out = [];
  for (const f of dorm9Faces()) {
    for (let y = f.base + FLOOR_H; y < f.y1 - 0.1; y += FLOOR_H) if (y > f.y0 + 0.3) out.push({ ...f, y });
  }
  return out;
}

/**
 * 冷氣：每格寢室窗左邊一台（照片 9024），二樓以上才掛；牆面不到一格寬的不掛。
 * 回傳 { x, y, z, yaw }，yaw 讓冷氣正面朝牆外。
 */
export function dorm9AcUnits() {
  const out = [];
  for (const f of dorm9Faces()) {
    const cols = Math.floor(f.len / DORM9.bay);
    if (cols < 1) continue;
    const pad = (f.len - cols * DORM9.bay) / 2, dx = (f.b[0] - f.a[0]) / f.len, dz = (f.b[1] - f.a[1]) / f.len;
    const yaw = Math.atan2(f.n[0], f.n[1]);
    for (let c = 0; c < cols; c++) {
      const u = pad + c * DORM9.bay + 0.55;
      for (let y = f.base + FLOOR_H + 0.75; y < f.y1 - 0.5; y += FLOOR_H) {
        if (y < f.y0 + 0.5) continue;
        out.push({ x: f.a[0] + dx * u + f.n[0] * 0.24, y, z: f.a[1] + dz * u + f.n[1] * 0.24, yaw });
      }
    }
  }
  return out;
}

/** 屋頂防水層：沿輪廓蓋在牆頂上方一點點，蓋掉灰盒的亮白頂面。 */
export function dorm9Roofs() {
  return BUILDINGS.map(bld => {
    const base = Math.min(...bld.pts.map(([x, z]) => LEVELS[platformLevel(x, z)]));
    return { osm: bld.osm, pts: bld.pts, y: base + DORM9.floors[bld.osm] * FLOOR_H + 0.04 };
  });
}
