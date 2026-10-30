/**
 * 自強五、六、七八舍的外觀與周圍環境（純資料，不碰引擎，可在 Node 測試）。
 *
 * 依 2026-10-28 照片 9072 到 9089（只放在本機，不進版本庫）：
 * - 外牆：米灰清水混凝土，每層一道水平樓板飾帶，窗旁一塊深紅褐磚牆，冷氣掛在窗下飾帶上，
 *   轉角有鏽橘色排水管，屋頂一圈女兒牆。
 * - 樓梯間：棟端凸出的高塔，一整條窄長窗（照片 9073、9082）。
 * - 七八舍中段連接棟是大廳：深紅褐牆、整排橫窗，一樓玻璃門上掛「政大學生宿舍歡迎您」橫幅（照片 9078、9082）。
 * - 周圍：棟間柏油車道與停車格、紅色禁停線、不鏽鋼水塔（照片 9074、9075、9083、9084），
 *   牆腳朱蕉花台、大樟樹、彎臂路燈、牆上暖黃壁燈、「慢」字警告牌（照片 9087）。
 * 照片沒拍到的位置（停車場確切範圍、樹的位置）依道路與空地自行補上。
 */
import { LAYOUT, BRIDGES, STAIRS } from './layout.js';
import { projectToPath } from './terrain.js';
import { hillRoadAt } from './hillside.js';

export const DORMS = [
  { osm: 230992373, name: '自強五舍' },
  { osm: 230992374, name: '自強六舍' },
  { osm: 230992375, name: '自強七八舍' },
];
/** 牆腳與屋頂高度：灰盒建物底在第二層 12 公尺，高 12 公尺，分四層、每層 3 公尺。 */
export const BASE = 12, TOP = 24, FLOOR = 3, FLOORS = 4, BAY = 3.4;

const outline = osm => {
  const pts = LAYOUT.buildings.find(b => b.osm === osm).pts.slice(0, -1);
  return pts.filter((p, i) => Math.hypot(p[0] - pts[(i + 1) % pts.length][0], p[1] - pts[(i + 1) % pts.length][1]) > 0.05);
};
export function insidePolygon(x, z, pts) {
  return pts.reduce((yes, [ax, az], i) => {
    const [bx, bz] = pts[(i + 1) % pts.length];
    return (az > z) !== (bz > z) && x < ax + (bx - ax) * (z - az) / (bz - az) ? !yes : yes;
  }, false);
}
const POLYS = DORMS.map(d => ({ ...d, pts: outline(d.osm) }));
export const insideDorm = (x, z) => POLYS.some(d => insidePolygon(x, z, d.pts));

/** 七八舍中段連接棟（大廳）的東、西兩面。 */
const LOBBY_FACES = [[[-34.5, 32.6], [-34.7, 20.5], 'lobby'], [[-40.4, 21], [-40.2, 31.4], 'lobbyBack']];
const same = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05;

/**
 * 每一面外牆：a→b 走向，n 是朝外的單位法線，y0、y1 是牆面上下緣。
 * 兩棟相貼的牆（五舍高架段北面貼著六舍）朝外半公尺就落進另一棟，不貼立面。
 */
export function dormFaces() {
  const faces = [], bridge = BRIDGES.find(b => b.building === 230992373);
  for (const d of POLYS) {
    d.pts.forEach((p, i) => {
      let a = p, b = d.pts[(i + 1) % d.pts.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1.5) return;
      let n = [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (insidePolygon(mid[0] + n[0] * 0.5, mid[1] + n[1] * 0.5, d.pts)) { [a, b] = [b, a]; n = [-n[0], -n[1]]; }
      if (POLYS.some(o => o !== d && insidePolygon(mid[0] + n[0] * 0.5, mid[1] + n[1] * 0.5, o.pts))) return;
      // 五舍北伸的高架段（cutZ 以北）牆底在連通段底，下方是車道。
      const lifted = d.osm === bridge.building && mid[1] > bridge.cutZ + 0.01;
      const special = LOBBY_FACES.find(([p0, p1]) => (same(a, p0) && same(b, p1)) || (same(a, p1) && same(b, p0)));
      faces.push({ osm: d.osm, a, b, L, n, mid, y0: lifted ? bridge.bottom : BASE, y1: TOP,
        kind: special ? special[2] : 'dorm', bays: Math.max(1, Math.round(L / BAY)) });
    });
  }
  return faces;
}

const along = (f, t, out = 0) => [f.a[0] + (f.b[0] - f.a[0]) * t + f.n[0] * out, f.a[1] + (f.b[1] - f.a[1]) * t + f.n[1] * out];
const yaw = f => -Math.atan2(f.b[1] - f.a[1], f.b[0] - f.a[0]);

/** 水平樓板飾帶與屋頂女兒牆：[中心 x, y, z, 長, 高, 深, 轉角 yaw]。 */
export function ledges() {
  const list = [];
  for (const f of dormFaces()) {
    const [x, z] = along(f, 0.5, 0.17);
    for (let k = 1; k < FLOORS; k++) {
      const y = BASE + k * FLOOR;
      if (y > f.y0 + 0.3) list.push([x, y, z, f.L + 0.34, 0.2, 0.34, yaw(f)]);
    }
    const [px, pz] = along(f, 0.5, 0.1);
    list.push([px, TOP + 0.3, pz, f.L + 0.2, 0.6, 0.3, yaw(f)]);
  }
  return list;
}

/** 冷氣：一般外牆每格窗下一台，約三成的格子空著；大廳兩面不掛。 */
export function acUnits() {
  const list = [];
  let k = 0;
  for (const f of dormFaces()) {
    if (f.kind !== 'dorm') continue;
    for (let i = 0; i < f.bays; i++) for (let fl = 0; fl < FLOORS; fl++) {
      const y = BASE + fl * FLOOR + 0.42;
      if (y < f.y0 + 0.3 || (k++ * 7) % 10 < 3) continue;
      const [x, z] = along(f, (i + 0.32) / f.bays, 0.24);
      list.push({ x, y, z, yaw: yaw(f) });
    }
  }
  return list;
}

/** 排水管：長牆兩端各一根（照片 9074、9083 的鏽橘色直管）。 */
export function pipes() {
  return dormFaces().filter(f => f.kind === 'dorm' && f.L > 8).flatMap(f =>
    [0.4 / f.L, 1 - 0.4 / f.L].map(t => { const [x, z] = along(f, t, 0.1); return { x, z, y0: f.y0, y1: TOP + 0.5 }; }));
}

/** 棟端的樓梯塔：比屋頂高 1.6 公尺，一面整條窄長窗朝外（照片 9073）。 */
export const STAIR_TOWERS = [
  { x0: -64.4, x1: -62.6, z0: -0.2, z1: 3.2, face: [-1, 0] },
  { x0: -54.8, x1: -53, z0: 17, z1: 20.4, face: [-1, 0] },
  { x0: -20.7, x1: -18.9, z0: -18.6, z1: -15.4, face: [1, 0] },
];
export const TOWER_TOP = TOP + 1.6;

/** 大廳一樓玻璃門的雨遮與兩盞壁燈。 */
export const LOBBY = { x: -34.6, z0: 23.6, z1: 29.6, canopy: { depth: 1.6, y: BASE + 3.05 } };

/** 柏油鋪面：棟間車道與停車場（[x0, z0, x1, z1]，照片 9074、9083、9084）。 */
export const PAVED = [
  // 七八舍東側三面圍起來的停車場，往東接環山車道。
  { name: '七八舍停車場', rect: [-33.9, 21.6, -21, 31.9] },
  { name: '七八舍停車場出入口', rect: [-21, 23.6, -13.2, 28.6] },
  // 六舍與七八舍之間的棟間車道，東端接九舍前道路。
  { name: '六七舍間車道', rect: [-52, 6.6, -17, 14.2] },
  { name: '六七舍間車道出口', rect: [-17, 6.6, -6.4, 9.3] },
];
/** 停車格：七八舍停車場北側一排，格寬 2.4 公尺，從 x0 排到 x1，格子佔 z 到 z + depth。
 * 六七舍間車道照片 9079、9080 只有白色邊線、沒有停車格，不畫格子。 */
export const STALLS = [{ x0: -33.4, x1: -21.4, z: 21.8, depth: 5 }];
const stall = k => STALLS[0].x0 + 1.2 + 2.4 * k;
/** 停的車：[x, z, 顏色, 休旅車, 罩車罩]；照片 9083、9084 的黑色轎車、9074 罩著銀色車罩的車。 */
export const CARS = [
  [stall(0), 24.3, '#24262b', false, false], [stall(1), 24.3, '#e9e9e6', false, false],
  [stall(2), 24.3, '#8d1f26', true, false], [stall(3), 24.3, '#c3c7cc', false, true],
];
/** 不鏽鋼水塔一排四個，放在七八舍南棟牆邊（照片 9075）。 */
export const TANKS = [-33, -31.75, -30.5, -29.25].map(x => ({ x, z: 31.1, r: 0.55, h: 1.9 }));
/** 彎臂路燈（照片 9072）與牆上壁燈。 */
export const LAMPS = [[-20.4, 21.9, -1], [-33.6, 32.2, 1], [-52.8, 7.4, 1], [-27, 14.75, -1], [-15.5, 10.2, -1]];
/** 「慢」字警告牌：七八舍南側車道轉彎外側路邊，牌面朝路（照片 9087）。 */
export const SLOW_SIGN = { x: -24.7, z: 48.3, yaw: -2.43 };

const ROADS = LAYOUT.roads.map(r => r.pts);
const inRect = (x, z, [x0, z0, x1, z1], m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
/** 空地：不在建物、道路、山坡路、階梯、鋪面上。 */
export function openGround(x, z, margin = 0) {
  if (insideDorm(x, z) || POLYS.some(d => projectToPath(x, z, [...d.pts, d.pts[0]]).distance < (1.2 + margin) ** 2)) return false;
  if (ROADS.some(p => projectToPath(x, z, p).distance < (3.6 + margin) ** 2)) return false;
  if (hillRoadAt(x, z, 1.5 + margin) !== null) return false;
  if (STAIRS.some(s => projectToPath(x, z, s.path).distance < (2.6 + margin) ** 2)) return false;
  return !PAVED.some(p => inRect(x, z, p.rect, 0.6 + margin));
}
const AREA = [-70, -32, -6, 52];

/** 牆腳花台：沿一般外牆往外 1.4 公尺，連續空地超過 3 公尺才種（照片 9076、9077、9081）。 */
export function bedRects() {
  const rects = [];
  for (const f of dormFaces()) {
    if (f.kind !== 'dorm' || f.y0 > BASE) continue;
    let run = null;
    const flush = () => {
      if (run && run[1] - run[0] >= 3) {
        const p = along(f, run[0] / f.L, 0.25), q = along(f, run[1] / f.L, 1.55);
        rects.push([Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]);
      }
      run = null;
    };
    for (let s = 0.6; s <= f.L - 0.6; s += 0.5) {
      const [x, z] = along(f, s / f.L, 0.9), [ox, oz] = along(f, s / f.L, 1.6);
      const tower = STAIR_TOWERS.some(t => inRect(x, z, [t.x0, t.z0, t.x1, t.z1], 1));
      const lobby = Math.abs(x - LOBBY.x) < 3 && z > LOBBY.z0 - 1 && z < LOBBY.z1 + 1;
      const free = !tower && !lobby && ROADS.every(p => projectToPath(x, z, p).distance >= 3.4 ** 2)
        && hillRoadAt(x, z, 0.8) === null && STAIRS.every(st => projectToPath(x, z, st.path).distance >= 2.2 ** 2)
        && !PAVED.some(p => inRect(x, z, p.rect, 0.3) || inRect(ox, oz, p.rect, 0.1)) && !TANKS.some(t => Math.hypot(t.x - x, t.z - z) < 1.6);
      if (free) run = run ? [run[0], s] : [s, s]; else flush();
    }
    flush();
  }
  return rects;
}

/** 棟間車道兩側花台裡的樹（照片 9078、9079 樹枝伸到路面上），以及停車場邊角。 */
const COURT_TREES = [[-35, -13.3, 1.5], [-26, -13.3, 1.3], [-50, -3.05, 1.4], [-28, -3.05, 1.6],
  [-56, 5.65, 1.2], [-44, 5.65, 1.4], [-30, 5.65, 1.3]];
/** 大樟樹：沿道路兩側往外約 5.5 公尺、每 11 公尺一棵，只種在空地上（照片 9073、9076、9078）。 */
export function treeSpots() {
  const spots = [], beds = bedRects(), paths = [...ROADS, ...[...PAVED].map(p => [[p.rect[0], (p.rect[1] + p.rect[3]) / 2], [p.rect[2], (p.rect[1] + p.rect[3]) / 2]])];
  for (const path of paths) {
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1], [bx, bz] = path[i], L = Math.hypot(bx - ax, bz - az), n = [-(bz - az) / L, (bx - ax) / L];
      for (let s = 3; s < L; s += 11) for (const side of [1, -1]) {
        const x = ax + (bx - ax) * s / L + n[0] * 5.6 * side, z = az + (bz - az) * s / L + n[1] * 5.6 * side;
        if (x < AREA[0] || x > AREA[2] || z < AREA[1] || z > AREA[3]) continue;
        if (!openGround(x, z, 0.4) || beds.some(r => inRect(x, z, r, 0.8))) continue;
        if (spots.some(t => Math.hypot(t[0] - x, t[1] - z) < 8.5)) continue;
        spots.push([x, z, 1.3 + ((spots.length * 7) % 5) * 0.12]);
      }
    }
  }
  return [...spots, ...COURT_TREES];
}

/** 碰撞：樓梯塔、水塔與路燈桿（樹與車由建模時一併登記）。 */
export function dormColliders() {
  const box = (cx, cz, hx, hz, kind) => ({ obb: true, kind, cx, cz, hx, hz, th: 0, cs: 1, sn: 0 });
  return [
    ...STAIR_TOWERS.map(t => box((t.x0 + t.x1) / 2, (t.z0 + t.z1) / 2, (t.x1 - t.x0) / 2, (t.z1 - t.z0) / 2, 'stair-tower')),
    ...TANKS.map(t => box(t.x, t.z, t.r, t.r, 'tank')),
    ...LAMPS.map(([x, z]) => box(x, z, 0.12, 0.12, 'lamp')),
    box(SLOW_SIGN.x, SLOW_SIGN.z, 0.1, 0.1, 'sign'),
  ];
}
