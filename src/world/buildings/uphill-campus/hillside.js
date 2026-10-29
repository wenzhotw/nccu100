/**
 * 五六七八舍山丘的西、北、南側山坡（2026-10-28 使用者核可「手工塑形」）。
 *
 * 依照片 9088、9089、9101、9102、9108 到 9132 與 OpenNCCU 地形對照：
 * - 五六舍之間往西的道路一路緩降，經 18、19 到西南路口的髮夾彎（約 8.4 公尺）。
 * - 路外側是陡坡，坡腳在環山一道邊是約 3.2 公尺的垂直擋土牆，牆上方是灰色噴漿坡面再接草坡。
 * - 環山一道西段在第一層；19 往南的路下到環山二道，環山二道往東再爬回山居一帶。
 * - 好漢坡貼著山坡：靠山側是石砌擋土牆，外側是欄杆，看得到山下。
 *
 * 地形只取控制線，不放入網站的高度資料：每條控制線給定高度，
 * 區內高度以「離控制線距離的反比加權」平滑內插，再存成 1 公尺網格供查詢與建模共用。
 */
import { STAIRS } from './layout.js';

const GRID = 2;
const ROAD_HALF = 3;
// 照片 9131、9132：坡腳垂直水泥牆約是牆邊轎車高度的兩倍。
export const FOOT_H = 3.2;

/** 坡腳擋土牆頂線（同時是新的第一層邊界），南端逐漸降到環山二道路面。 */
export const FOOT = [[-28,-38.1,FOOT_H],[-41.9,-42.7,FOOT_H],[-71.1,-33,FOOT_H],[-84.1,-21.8,FOOT_H],[-92.2,-10.5,FOOT_H],
  [-99,-0.5,FOOT_H],[-103,6,FOOT_H],[-111,18,FOOT_H],[-113.5,28.5,FOOT_H],[-113,42,2.6],[-109,46,2],
  [-106.5,48,1.4],[-92,55,0.6],[-77,63,0],[-76,64,0]];

/** 山坡道路：沿路長線性內插各折點高度（公尺），路面橫向水平；進髮夾彎前 6.5 公尺已降到彎道路面高度。 */
export const HILL_ROADS = [
  // 五六舍之間（高架連通段西側）開始往西緩降，好漢坡頂接在 11.1 公尺處。
  { id: 'west', pts: [[-47,-8,12],[-60.5,-8.1,11.1],[-68.3,-5.2],[-73.7,-1.3],[-84.6,9.4],[-87.79,13.15,8.4],[-92,18.1,8.4]] },
  // 髮夾彎往東南緩升回七八舍外環道。
  { id: 'loop', pts: [[-92,18.1,8.4],[-85.56,18.96,8.4],[-83.8,19.2],[-73.3,24.6],[-65.5,32.3,12]] },
  // 19 往南的路下到環山二道。
  { id: 'south', pts: [[-92,18.1,8.4],[-95.58,23.53,8.4],[-97.6,26.6],[-96.3,35],[-87.2,42.8],[-76.5,49.3],[-74.5,56.2],[-75.8,67.1,0]] },
  // 環山二道西段：由第一層往東爬回山居一帶的 12 公尺。
  { id: 'ring2', pts: [[-75.8,67.1,0],[-55.2,67.8,3.5],[-44.3,67,5],[-30.3,65.1,7],[-17.6,58,9.5],[-4.5,46.8,12]] },
].map(road => ({ ...road, pts: fillHeights(road.pts) }));

/** 髮夾彎（照片 9088、9089）：路面加寬成圓形轉彎，外側白色欄杆與黃黑路緣。 */
export const HAIRPIN = { x: -92, z: 18.1, r: 6.5, h: 8.4, railR: 6.8, arc: [2.75, 4.8] };

/** 好漢坡各段靠山的一側：1 為行進方向右手邊，-1 為左手邊。 */
export const HILL_SIDE = { haohanpo: [1, -1, -1, -1, -1, -1], 'haohanpo-east': [1, 1, 1] };
export const STONE = { h: 2, reach: 3 };

/** 與平台相接的邊：維持 12 公尺，平台與山坡在這裡平順接合。 */
const LOOP = [[-65.5,32.3],[-58.8,42.6],[-53.8,43.6],[-41.3,47.3],[-30.9,47.6],[-24.5,41.5],[-13.5,24.3]];
const PAD = [
  [[-28,-33],[-28,-22.5],[-54,-22.5],[-54,-11.5],[-47,-11.5],[-47,-2.4],[-63.5,-2.4],[-63.5,6],[-58,14],[-58,26],[-64,30.5]],
  [...offsetLine(LOOP, 4), [-4.5,40], [-4.5,46.8]],
];

/** 山坡與平台的接縫（不含坡腳與地圖邊），依高差長牆。 */
export const HILL_SEAMS = [[FOOT[0].slice(0, 2), ...PAD[0]], [...PAD[1], [-4.5, 100]]];

/** 山坡範圍：平台邊、環山二道以南到地圖邊、坡腳線圍成。 */
export const HILL_ZONE = [...PAD[0], ...PAD[1], [-4.5,100], [-76,100], ...FOOT.slice().reverse().map(([x, z]) => [x, z])]
  .filter((p, i, all) => i === 0 || Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1]) > 1e-6);

function fillHeights(pts) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return pts.map((p, i) => {
    if (p[2] !== undefined) return [p[0], p[1], p[2]];
    let a = i - 1; while (pts[a][2] === undefined) a--;
    let b = i + 1; while (pts[b][2] === undefined) b++;
    return [p[0], p[1], pts[a][2] + (pts[b][2] - pts[a][2]) * (s[i] - s[a]) / (s[b] - s[a])];
  });
}

/** 折線往行進方向右手邊平移，轉角取角平分線。 */
function offsetLine(pts, d) {
  const normals = pts.slice(1).map((b, i) => {
    const a = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  });
  return pts.map((p, i) => {
    const a = normals[Math.max(0, i - 1)], b = normals[Math.min(i, normals.length - 1)];
    const k = 1 + a[0] * b[0] + a[1] * b[1];
    return [p[0] + (a[0] + b[0]) / k * d, p[1] + (a[1] + b[1]) / k * d];
  });
}

/** 投影到折線：回傳距離、沿線長度、所在段與右手邊符號。 */
export function projectLine(x, z, pts) {
  let best = { d: Infinity, s: 0, i: 1, side: 0 }, walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (l * l)));
    const d = Math.hypot(x - ax - t * dx, z - az - t * dz);
    if (d < best.d) best = { d, s: walked + t * l, i, t, side: Math.sign((x - ax) * -dz + (z - az) * dx) };
    walked += l;
  }
  return best;
}

function ringHeightAtX(pts, x) {
  if (x <= pts[0][0]) return pts[0][2];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const a = pts[i - 1], b = pts[i];
    return a[2] + (b[2] - a[2]) * (x - a[0]) / (b[0] - a[0]);
  }
  return pts.at(-1)[2];
}

/** 沿線高度（第三個座標）依投影位置內插。 */
function lineHeight(pts, p) {
  const a = pts[p.i - 1], b = pts[p.i];
  return a[2] + (b[2] - a[2]) * p.t;
}

export function inHill(x, z) {
  let inside = false;
  for (let i = 0, j = HILL_ZONE.length - 1; i < HILL_ZONE.length; j = i++) {
    const [xi, zi] = HILL_ZONE[i], [xj, zj] = HILL_ZONE[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** 路面高度：在山坡道路或髮夾彎路面範圍內回傳該處路面，否則 null。 */
export function hillRoadAt(x, z, margin = 0) {
  if (Math.hypot(x - HAIRPIN.x, z - HAIRPIN.z) <= HAIRPIN.r + margin) return HAIRPIN.h;
  // 彎道內側兩段路面會重疊，畫面看到的是較高那段，查詢也取重疊處最高的路面。
  let top = null, best = null;
  for (const road of HILL_ROADS) {
    for (let i = 1; i < road.pts.length; i++) {
      const a = road.pts[i - 1], b = road.pts[i], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
      const t = ((x - a[0]) * dx + (z - a[1]) * dz) / (l * l), side = Math.abs((x - a[0]) * -dz + (z - a[1]) * dx) / l;
      if (t >= 0 && t <= 1 && side <= ROAD_HALF + margin) top = Math.max(top ?? -Infinity, a[2] + (b[2] - a[2]) * t);
    }
    // 轉角外側的扇形缺口不在任何一段的範圍內，改取最近的路線位置；路線兩端是平切的，不算端點外的半圓。
    const p = projectLine(x, z, road.pts), end = (p.i === 1 && p.t <= 0) || (p.i === road.pts.length - 1 && p.t >= 1);
    if (!end && p.d <= ROAD_HALF + margin && (!best || p.d < best.d)) best = { d: p.d, h: lineHeight(road.pts, p) };
  }
  return top ?? best?.h ?? null;
}

let stairCache = null;
function stairLines() {
  if (stairCache) return stairCache;
  // 循環相依：terrain.js 載入後才取得階梯高度函式。
  stairCache = STAIRS.filter(s => HILL_SIDE[s.id]).map(s => ({ ...s, hill: HILL_SIDE[s.id] }));
  return stairCache;
}

/** 好漢坡轉角平台：中心、邊長（踏面寬）、角平分線方向與高度；建模與地面查詢共用。 */
let jointCache = null;
export function stairJoints() {
  if (jointCache || !stairHeightFn) return jointCache ?? [];
  jointCache = [];
  for (const stair of STAIRS.filter(s => HILL_SIDE[s.id])) {
    let base = 0;
    for (let i = 1; i < stair.path.length - 1; i++) {
      const a = stair.path[i - 1], b = stair.path[i], c = stair.path[i + 1];
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      base += l1;
      const bx = (b[0] - a[0]) / l1 + (c[0] - b[0]) / l2, bz = (b[1] - a[1]) / l1 + (c[1] - b[1]) / l2, bl = Math.hypot(bx, bz) || 1;
      jointCache.push({ x: b[0], z: b[1], size: stair.width, ux: bx / bl, uz: bz / bl, h: stairHeightFn(stair, base) });
    }
  }
  return jointCache;
}
export function jointAt(x, z) {
  return stairJoints().find(j => {
    const dx = x - j.x, dz = z - j.z;
    return Math.abs(dx * j.ux + dz * j.uz) <= j.size / 2 && Math.abs(-dx * j.uz + dz * j.ux) <= j.size / 2;
  }) ?? null;
}

let stairHeightFn = null;
/** terrain.js 注入階梯高度查詢，避免兩檔互相 import。 */
export function bindStairHeight(fn) { stairHeightFn = fn; grid = null; jointCache = null; }

/** 控制線加權內插（未經網格化），只在建網格時呼叫。 */
function sculpt(x, z) {
  // 路面與路邊 1 公尺的網格點壓在路面下，2 公尺網格的草地不會從路邊冒出鋸齒。
  const road = hillRoadAt(x, z, 1);
  if (road !== null) return road - 0.15;
  // 環山二道以南：取同一個 x 的路面高度延伸到地圖邊，東端正好接回 12 公尺平台。
  const ring = HILL_ROADS.find(r => r.id === 'ring2'), pr = projectLine(x, z, ring.pts);
  if (pr.side > 0) return ringHeightAtX(ring.pts, x);
  let sum = 0, weight = 0, stone = -Infinity;
  const add = (h, d) => { const w = 1 / Math.max(d, 0.05) ** 2; sum += h * w; weight += w; };
  const foot = projectLine(x, z, FOOT);
  // 坡腳 0.6 公尺內是擋土牆頂的平台，牆高才一致。
  if (foot.d <= 0.6) return lineHeight(FOOT, foot);
  add(lineHeight(FOOT, foot), foot.d - 0.6);
  for (const pad of PAD) add(12, projectLine(x, z, pad).d);
  for (const r of HILL_ROADS) { const p = projectLine(x, z, r.pts); add(lineHeight(r.pts, p), p.d - ROAD_HALF); }
  add(HAIRPIN.h, Math.hypot(x - HAIRPIN.x, z - HAIRPIN.z) - HAIRPIN.r);
  if (stairHeightFn) for (const s of stairLines()) {
    const p = projectLine(x, z, s.path), h = stairHeightFn(s, p.s), edge = p.d - s.width / 2;
    if (edge <= 0) return h - 0.35;
    add(h, edge);
    // 靠山側緊貼石砌擋土牆：牆頂比踏面高，往外三公尺內接回山坡。
    const segmentSide = s.hill[Math.min(p.i, s.hill.length) - 1];
    // 牆腳 1.5 公尺內的網格點貼齊踏面（略低 5 公分），由石砌牆遮住，2 公尺網格不會翹過踏面邊緣。
    if (p.side === segmentSide && edge < 1.5 && p.t > 0 && p.t < 1) return h - 0.05;
    if (p.side === segmentSide && edge < STONE.reach && p.t > 0 && p.t < 1) {
      stone = Math.max(stone, h + STONE.h * (1 - (edge / STONE.reach) ** 2));
    }
  }
  return Math.max(sum / weight, stone);
}

let grid = null;
const BOX = { x0: -120, x1: -4, z0: -46, z1: 100 };
function heights() {
  if (grid) return grid;
  const nx = Math.round((BOX.x1 - BOX.x0) / GRID) + 1, nz = Math.round((BOX.z1 - BOX.z0) / GRID) + 1;
  const h = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) h[j * nx + i] = sculpt(BOX.x0 + i * GRID, BOX.z0 + j * GRID);
  grid = { nx, nz, h };
  return grid;
}

/** 網格頂點高度，建模與查詢共用同一份數值。 */
export function hillNode(i, j) {
  const g = heights();
  return g.h[Math.min(g.nz - 1, Math.max(0, j)) * g.nx + Math.min(g.nx - 1, Math.max(0, i))];
}

/** 山坡範圍內回傳地面高度：路面取路面，其餘依網格三角形內插（與建模相同）。 */
export function hillsideAt(x, z) {
  // 好漢坡轉角平台的四角略凸出踏面寬度，那裡也是平台高度。
  const joint = jointAt(x, z);
  if (joint && hillRoadAt(joint.x, joint.z) === null) return { kind: 'hillside', h: joint.h, joint: true };
  if (!inHill(x, z)) {
    // 路面寬 6 公尺，接近第一層的路段（環山二道西端、19 往南的路尾）邊緣會伸到第一層地面上，那裡以路面為準；
    // 接平台的路段高度與平台相同，仍由平台負責。
    const edge = x < -2 && z > -12 && z < 72 ? hillRoadAt(x, z) : null;
    return edge === null || edge >= 2 ? null : { kind: 'hillside', h: edge, road: true };
  }
  const road = hillRoadAt(x, z);
  if (road !== null) return { kind: 'hillside', h: road, road: true };
  // 坡腳擋土牆頂 0.6 公尺內取精確牆高，整道牆高度一致才能合併成長牆。
  const foot = projectLine(x, z, FOOT);
  if (foot.d <= 0.6) return { kind: 'hillside', h: lineHeight(FOOT, foot) };
  const fx = (x - BOX.x0) / GRID, fz = (z - BOX.z0) / GRID, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  // 與建模相同：每格沿 (i, j) 到 (i+1, j+1) 的對角線切成兩個三角形，查詢高度和看到的地面一致。
  const h00 = hillNode(i, j), h10 = hillNode(i + 1, j), h01 = hillNode(i, j + 1), h11 = hillNode(i + 1, j + 1);
  const h = u >= v ? h00 + u * (h10 - h00) + v * (h11 - h10) : h00 + u * (h11 - h01) + v * (h01 - h00);
  // 路邊網格點壓在路面下 0.15 公尺，環山二道西端（0 公尺）附近內插後不低於第一層地面。
  return { kind: 'hillside', h: Math.max(0, h) };
}

/** 範圍外的網格點吸附到最近的山坡邊界，回傳 [x, 高度, z]；邊緣格子因此貼齊坡腳線與平台邊。 */
export function hillVertex(i, j) {
  const x = BOX.x0 + i * GRID, z = BOX.z0 + j * GRID;
  if (inHill(x, z)) return [x, hillNode(i, j), z];
  let best = null;
  HILL_ZONE.forEach((a, k) => {
    const b = HILL_ZONE[(k + 1) % HILL_ZONE.length], dx = b[0] - a[0], dz = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    const px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(x - px, z - pz);
    if (!best || d < best.d) best = { d, px, pz };
  });
  // 吸附點往內縮 1 公分，取山坡這一側的高度。
  const inward = projectLine(best.px, best.pz, FOOT).d < 0.05 ? lineHeight(FOOT, projectLine(best.px, best.pz, FOOT)) : sculpt(best.px, best.pz);
  return [best.px, inward, best.pz];
}

export const HILL_GRID = { ...BOX, step: GRID };
export { ROAD_HALF };
