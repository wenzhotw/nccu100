/** 山坡的網格、坡道路面、欄杆與碰撞（純幾何，可在 Node 測試）。 */
import * as THREE from 'three';
import { LAYOUT, R, STAIRS } from './layout.js';
import { FOOT, FOOT_H, HILL_ROADS, HAIRPIN, HILL_GRID, ROAD_HALF, hillNode, hillVertex, hillRoadAt, inHill, projectLine, HILL_SIDE, STONE, stairJoints } from './hillside.js';
import { heightAt, stairHeight } from './terrain.js';

const ROAD_SIDES = [-ROAD_HALF, ROAD_HALF];

function surface(positions) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

/** 草地網格：任一角落在山坡內就畫，範圍外的角落吸附到邊界線；整格都在路面下的格子省略。 */
function grassGeometry() {
  const { x0, z0, step } = HILL_GRID, positions = [], normals = [], colors = [];
  // 照片 9126 到 9132：擋土牆上方是一段灰色噴漿坡面，再往上才是草坡。
  const grassColor = new THREE.Color('#8fca6c'), shotcrete = new THREE.Color('#b8b4a6');
  const tint = ([x, y, z]) => {
    const d = projectLine(x, z, FOOT).d;
    return d < 6 && y < FOOT_H + 4.2 && y > 0.05 ? shotcrete : grassColor;
  };
  // 法線取周圍網格點的坡度，草坡明暗連續，不會一格一格地深淺交錯。
  const normal = (a, b) => {
    const nx = -(hillNode(a + 1, b) - hillNode(a - 1, b)) / (2 * step), nz = -(hillNode(a, b + 1) - hillNode(a, b - 1)) / (2 * step);
    const l = Math.hypot(nx, 1, nz);
    return [nx / l, 1 / l, nz / l];
  };
  const nx = Math.round((HILL_GRID.x1 - x0) / step), nz = Math.round((HILL_GRID.z1 - z0) / step);
  // 環山二道以南高度只沿路線變化，2×2 格併成一格，省下手機的三角形預算。
  const ring = HILL_ROADS.find(r => r.id === 'ring2');
  const south = (i, j) => { const x = x0 + i * step, z = z0 + j * step, p = projectLine(x, z, ring.pts);
    return p.side > 0 && p.d > ROAD_HALF + 2 && inHill(x, z); };
  const merged = new Set();
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (merged.has(`${i},${j}`)) continue;
    let size = 1;
    if (i % 2 === 0 && j % 2 === 0 && i + 2 <= nx && j + 2 <= nz
      && [0, 1, 2].every(a => [0, 1, 2].every(b => south(i + a, j + b)))) {
      size = 2; ['1,0', '0,1', '1,1'].forEach(k => { const [a, b] = k.split(','); merged.add(`${i + +a},${j + +b}`); });
    }
    const corners = [[i, j], [i + size, j], [i + size, j + size], [i, j + size]].map(([a, b]) => [x0 + a * step, z0 + b * step, a, b]);
    if (!corners.some(([x, z]) => inHill(x, z))) continue;
    if (corners.every(([x, z]) => underRoad(x, z) || underStair(x, z))) continue;
    const v = corners.map(([, , a, b]) => hillVertex(a, b)), n = corners.map(([, , a, b]) => normal(a, b));
    positions.push(...v[0], ...v[2], ...v[1], ...v[0], ...v[3], ...v[2]);
    normals.push(...n[0], ...n[2], ...n[1], ...n[0], ...n[3], ...n[2]);
    for (const k of [0, 2, 1, 0, 3, 2]) { const c = tint(v[k]); colors.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return g;
}

/** 整格都在好漢坡踏面底下的草地不畫（踏面蓋住，省三角形）。 */
function underStair(x, z) {
  return STAIRS.some(s => (s.id === 'haohanpo' || s.id === 'haohanpo-east') && projectLine(x, z, s.path).d < s.width / 2 - 0.3);
}

function underRoad(x, z) {
  if (Math.hypot(x - HAIRPIN.x, z - HAIRPIN.z) < HAIRPIN.r - 0.5) return true;
  return HILL_ROADS.some(r => projectLine(x, z, r.pts).d < ROAD_HALF - 0.5);
}

/** 沿路每公尺一段，路面橫向水平、縱向照坡度；只畫在山坡範圍內那幾段。 */
function roadGeometry() {
  const positions = [];
  for (const road of HILL_ROADS) for (let i = 1; i < road.pts.length; i++) {
    const a = road.pts[i - 1], b = road.pts[i], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const nx = -dz / l, nz = dx / l, n = Math.ceil(l / 2);
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n, mid = (t0 + t1) / 2;
      if (!inHill(a[0] + dx * mid, a[1] + dz * mid)) continue;
      const at = (t, o) => [a[0] + dx * t + nx * o, a[2] + (b[2] - a[2]) * t, a[1] + dz * t + nz * o];
      const [l0, r0, l1, r1] = [at(t0, ROAD_SIDES[0]), at(t0, ROAD_SIDES[1]), at(t1, ROAD_SIDES[0]), at(t1, ROAD_SIDES[1])];
      // 頂點順序讓法線朝上，從上方看得到路面。
      positions.push(...l0, ...r1, ...l1, ...l0, ...r0, ...r1);
    }
  }
  const disc = (x, z, h, r, segments) => {
    for (let k = 0; k < segments; k++) {
      const a0 = k / segments * Math.PI * 2, a1 = (k + 1) / segments * Math.PI * 2;
      // 外圈頂點取該處的路面高度，轉角路面順著兩段的坡度，不凸起也不凹陷。
      // 多邊形外接圓形，邊緣中點也不比查詢半徑小；外圈高度在圓內取樣。
      const R = r / Math.cos(Math.PI / segments);
      const ring = t => { const px = x + Math.cos(t) * R, pz = z + Math.sin(t) * R;
        return [px, hillRoadAt(x + Math.cos(t) * r * 0.999, z + Math.sin(t) * r * 0.999) ?? h, pz]; };
      positions.push(x, h, z, ...ring(a1), ...ring(a0));
    }
  };
  // 髮夾彎是整片圓形水平路面；其他轉角補一塊圓形路面，兩段路之間不露出草地缺口。
  disc(HAIRPIN.x, HAIRPIN.z, HAIRPIN.h, HAIRPIN.r, 14);
  for (const road of HILL_ROADS) road.pts.slice(1, -1).forEach(([x, z, h]) => { if (inHill(x, z)) disc(x, z, h, ROAD_HALF, 12); });
  return surface(positions);
}

export function hillsideGeometry() {
  return { grass: [grassGeometry()], roads: [roadGeometry()] };
}

/** 偏移後的折線，回傳每公尺取樣點與該點地面高度。 */
function along(pts, offset, height, step = 2) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(l / step));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const t = k / n, x = a[0] + dx * t - dz / l * offset, z = a[1] + dz * t + dx / l * offset;
      out.push({ x, z, y: height(a, b, t) });
    }
  }
  return out;
}

/**
 * 欄杆清單（每段兩根柱之間）：
 * - 五六舍往西下坡路的外側（觀景步道邊，照片 9127 到 9132 坡頂的欄杆）。
 * - 好漢坡外側木色扶手（照片 9108 到 9115）。
 * - 髮夾彎外側白色欄杆（照片 9088、9089）。
 */
export function hillRails() {
  const rails = [];
  const west = HILL_ROADS.find(r => r.id === 'west');
  const top = STAIRS.find(s => s.id === 'haohanpo');
  const roadRail = along(west.pts, 3.3, (a, b, t) => a[2] + (b[2] - a[2]) * t);
  for (let i = 1; i < roadRail.length; i++) {
    const p = roadRail[i - 1], q = roadRail[i], m = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
    // 好漢坡頂與髮夾彎留出路口。
    if (projectLine(m.x, m.z, top.path).d < top.width / 2 + 1) continue;
    if (Math.hypot(m.x - HAIRPIN.x, m.z - HAIRPIN.z) < HAIRPIN.railR + 1) continue;
    rails.push({ a: p, b: q, color: '#c4cdcf', kind: 'road' });
  }
  for (const stair of STAIRS.filter(s => s.id === 'haohanpo' || s.id === 'haohanpo-east')) {
    const hill = HILL_SIDE[stair.id];
    for (let i = 1; i < stair.path.length; i++) {
      const seg = [stair.path[i - 1], stair.path[i]], base = stair.path.slice(0, i - 1)
        .reduce((s, p, k) => s + Math.hypot(stair.path[k + 1][0] - p[0], stair.path[k + 1][1] - p[1]), 0);
      const l = Math.hypot(seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]);
      // 外側（不靠山）那一邊：右手邊符號的相反。
      const pts = along(seg, -hill[i - 1] * (stair.width / 2 + 0.08), (a, b, t) => stairHeight(stair, base + t * l), 1.6);
      for (let k = 1; k < pts.length; k++) {
        const p = pts[k - 1], q = pts[k];
        if (!inHill((p.x + q.x) / 2, (p.z + q.z) / 2)) continue;
        // 兩支線交會處不擋路。
        const other = STAIRS.find(s => s.id !== stair.id && (s.id === 'haohanpo' || s.id === 'haohanpo-east'));
        if (projectLine((p.x + q.x) / 2, (p.z + q.z) / 2, other.path).d < other.width / 2 + 0.6) continue;
        rails.push({ a: p, b: q, color: '#8a5a3c', kind: 'stair' });
      }
    }
  }
  const [a0, a1] = HAIRPIN.arc, n = 12;
  for (let k = 0; k < n; k++) {
    const p = a0 + (a1 - a0) * k / n, q = a0 + (a1 - a0) * (k + 1) / n;
    const at = t => ({ x: HAIRPIN.x + Math.cos(t) * HAIRPIN.railR, z: HAIRPIN.z + Math.sin(t) * HAIRPIN.railR, y: HAIRPIN.h });
    rails.push({ a: at(p), b: at(q), color: '#eef0ee', kind: 'hairpin' });
  }
  return rails;
}

/**
 * 好漢坡踏面（照片 9108 到 9115）：每一階、每個休息平台各是一整塊沿路線方向的踏板，
 * 轉角補一塊方形平台；取代 0.25 公尺小格拼出的鋸齒邊。踏板往下延伸到兩側地面以下。
 * 回傳 { x, z, y（中心）, length（沿路線）, width, height, rot }。
 */
export function stairBoxes() {
  const boxes = [];
  for (const stair of STAIRS.filter(s => HILL_SIDE[s.id])) {
    let base = 0;
    const lengths = stair.path.slice(1).map((b, i) => Math.hypot(b[0] - stair.path[i][0], b[1] - stair.path[i][1]));
    const total = lengths.reduce((a, b) => a + b, 0);
    for (let i = 1; i < stair.path.length; i++) {
      const a = stair.path[i - 1], b = stair.path[i], l = lengths[i - 1];
      const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l, rot = -Math.atan2(uz, ux);
      const push = (s0, s1, h) => {
        // 跨過轉角的那一階被切成碎片，碎片落在轉角平台範圍內，由平台蓋住。
        const atJoint = (s0 <= 1e-9 && i > 1) || (s1 >= l - 1e-9 && i < stair.path.length - 1);
        if (s1 - s0 < 0.4 && atJoint) return;
        const m = (s0 + s1) / 2, x = a[0] + ux * m, z = a[1] + uz * m;
        // 好漢坡頂落在柏油路面上的部分由路面蓋住。
        if (hillRoadAt(x, z) !== null) return;
        const sideGround = [1, -1].map(k => heightAt(x - uz * k * (stair.width / 2 + 0.4), z + ux * k * (stair.width / 2 + 0.4)));
        const bottom = Math.min(h - 0.3, ...sideGround) - 0.3;
        boxes.push({ x, z, y: (h + bottom) / 2, length: s1 - s0 + 0.02, width: stair.width, height: h - bottom, rot });
      };
      let s0 = 0, h0 = stairHeight(stair, base);
      for (let s = 0.02; s <= l + 1e-9; s += 0.02) {
        const h = stairHeight(stair, Math.min(total, base + s));
        if (Math.abs(h - h0) > 1e-9) { push(s0, s, h0); s0 = s; h0 = h; }
      }
      push(s0, l, h0);
      base += l;
    }
  }
  // 轉角平台：取兩段方向的角平分線擺正，高度取轉角處的踏面高度（stairJoints 與地面查詢共用）。
  for (const j of stairJoints()) {
    if (hillRoadAt(j.x, j.z) !== null) continue;
    const bottom = Math.min(j.h - 0.3, heightAt(j.x + j.uz * 2.2, j.z - j.ux * 2.2), heightAt(j.x - j.uz * 2.2, j.z + j.ux * 2.2)) - 0.3;
    boxes.push({ x: j.x, z: j.z, y: (j.h + bottom) / 2, length: j.size, width: j.size, height: j.h - bottom, rot: -Math.atan2(j.uz, j.ux) });
  }
  return boxes;
}

/**
 * 好漢坡靠山側的石砌擋土牆（照片 9109、9110、9113）：沿踏面外緣每段一塊，
 * 牆腳埋到踏面下、牆頂比踏面高 STONE.h，和山坡網格的隆起接在一起。
 */
export function stoneWalls() {
  const pieces = [];
  for (const stair of STAIRS.filter(s => HILL_SIDE[s.id])) {
    const other = STAIRS.find(s => s !== stair && HILL_SIDE[s.id]);
    let base = 0;
    for (let i = 1; i < stair.path.length; i++) {
      const a = stair.path[i - 1], b = stair.path[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const side = HILL_SIDE[stair.id][i - 1], off = stair.width / 2 + 0.2;
      const nx = -(b[1] - a[1]) / l * side, nz = (b[0] - a[0]) / l * side, n = Math.max(1, Math.round(l));
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n, at = t => ({ x: a[0] + (b[0] - a[0]) * t + nx * off, z: a[1] + (b[1] - a[1]) * t + nz * off });
        const p = at(t0), q = at(t1), m = at((t0 + t1) / 2);
        if (!inHill(m.x, m.z)) continue;
        // 兩支線交會處與路面留出開口。
        if (projectLine(m.x, m.z, other.path).d < other.width / 2 + 0.6 || hillRoadAt(m.x, m.z) !== null) continue;
        // 折返處：牆不能伸進同一座樓梯其他段的走道。
        if (stair.path.slice(1).some((c, j) => j !== i - 1 && projectLine(m.x, m.z, [stair.path[j], c]).d < stair.width / 2 + 0.6)) continue;
        // 牆頂沿整段坡度連續升高（踏面高度在段落兩端之間線性內插），不跟著每一階起伏。
        const top = t => stairHeight(stair, base) + (stairHeight(stair, base + l) - stairHeight(stair, base)) * t + STONE.h;
        const h0 = stairHeight(stair, base + t0 * l), h1 = stairHeight(stair, base + t1 * l);
        pieces.push({ a: p, b: q, low: Math.min(h0, h1) - 0.3, high: Math.max(top(t0), top(t1)), top0: top(t0), top1: top(t1) });
      }
      base += l;
    }
  }
  return pieces;
}

function beam(a, b, ya, yb, t) {
  const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
  const g = new THREE.BoxGeometry(Math.hypot(l, yb - ya), t, t);
  g.rotateZ(Math.atan2(yb - ya, l)).rotateY(-Math.atan2(dz, dx)).translate((a.x + b.x) / 2, (ya + yb) / 2, (a.z + b.z) / 2);
  return g;
}

/**
 * 環山一道（第一層）的路面標線與路邊設施，依照片 9120、9125 到 9132：
 * 雙黃中線、白色邊線、紅色禁停線；外側（河岸側）路燈；銅像段外側護欄與黃色反光柱；擋土牆邊停一排車。
 * 三條路依行進方向排列，右手邊是外側（河岸），左手邊靠山。
 */
const RING = [881545320, 668072720, 261595331];
function ringSegments() {
  const segs = [];
  for (const osm of RING) {
    const pts = LAYOUT.roads.find(r => r.osm === osm).pts;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ osm, i, a, b, l, ux: (b[0] - a[0]) / l, uz: (b[1] - a[1]) / l });
    }
  }
  return segs;
}
const inMap = (x, z) => x >= R.x0 + 1 && x <= R.x1 - 1 && z >= R.z0 + 1 && z <= R.z1 - 1;

export function ringRoadProps() {
  const parts = [], colliders = [];
  const at = (g, t, off) => ({ x: g.a[0] + g.ux * t - g.uz * off, z: g.a[1] + g.uz * t + g.ux * off });
  const strip = (g, off, width, color) => {
    const p = at(g, 0, off), q = at(g, g.l, off), m = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
    if (!inMap(p.x, p.z) || !inMap(q.x, q.z)) return;
    parts.push({ geometry: new THREE.BoxGeometry(g.l, 0.02, width).rotateY(-Math.atan2(g.uz, g.ux)).translate(m.x, 0.045, m.z), color });
  };
  for (const g of ringSegments()) {
    strip(g, 0.13, 0.1, '#f2c230'); strip(g, -0.13, 0.1, '#f2c230');
    strip(g, 2.55, 0.12, '#f4f4ee'); strip(g, -2.55, 0.12, '#f4f4ee');
    strip(g, 2.85, 0.14, '#d65a4f'); strip(g, -2.85, 0.14, '#d65a4f');
    // 外側路燈每 20 公尺一盞。
    for (let t = 6; t < g.l; t += 20) {
      const p = at(g, t, 4.2);
      if (!inMap(p.x, p.z)) continue;
      parts.push({ geometry: new THREE.BoxGeometry(0.16, 5, 0.16).translate(p.x, 2.5, p.z), color: '#5d6470' });
      const head = at(g, t, 3.4);
      parts.push({ geometry: new THREE.BoxGeometry(0.5, 0.18, 0.32).rotateY(-Math.atan2(g.uz, g.ux)).translate(head.x, 4.95, head.z), color: '#fff1c4' });
      colliders.push({ x: p.x, z: p.z, hx: 0.12, hz: 0.12, th: 0, kind: 'lamp' });
    }
    // 銅像段（668072720）外側人行道：黃色反光柱與金屬護欄（照片 9120、9125）。
    if (g.osm === 668072720) {
      for (let t = 2; t < g.l - 2; t += 1.8) {
        const p = at(g, t, 3.3);
        parts.push({ geometry: new THREE.BoxGeometry(0.14, 0.8, 0.14).translate(p.x, 0.4, p.z), color: k(t) });
      }
      const p = at(g, 1, 5.4), q = at(g, g.l - 1, 5.4);
      for (const y of [0.5, 1]) parts.push({ geometry: beam({ x: p.x, z: p.z }, { x: q.x, z: q.z }, y, y, 0.05), color: '#c9b46a' });
      for (let t = 1; t <= g.l - 1; t += 3) {
        const c = at(g, t, 5.4);
        parts.push({ geometry: new THREE.BoxGeometry(0.07, 1, 0.07).translate(c.x, 0.5, c.z), color: '#c9b46a' });
      }
      colliders.push({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, hx: Math.hypot(q.x - p.x, q.z - p.z) / 2, hz: 0.06,
        th: -Math.atan2(q.z - p.z, q.x - p.x), kind: 'ring-rail' });
    }
    // 擋土牆邊的路邊停車（照片 9131、9132）：環山一道西段前兩段靠山側。
    if (g.osm === 261595331 && g.i <= 2) {
      const cars = ['#f2f2ee', '#3b3f46', '#c5c9cc', '#8a9096', '#f2f2ee'];
      for (let t = 4, n = 0; t < g.l - 3 && n < cars.length; t += 6, n++) {
        const p = at(g, t, -1.9), rot = -Math.atan2(g.uz, g.ux);
        parts.push({ geometry: new THREE.BoxGeometry(4.2, 0.75, 1.8).rotateY(rot).translate(p.x, 0.55, p.z), color: cars[n] });
        parts.push({ geometry: new THREE.BoxGeometry(2.2, 0.6, 1.6).rotateY(rot).translate(p.x, 1.2, p.z), color: '#2f3a48' });
        colliders.push({ x: p.x, z: p.z, hx: 2.1, hz: 0.9, th: rot, kind: 'car' });
      }
    }
  }
  return { parts, colliders };
}
const k = t => Math.round(t / 1.8) % 2 ? '#f2c230' : '#f7d84a';

/** 欄杆與髮夾彎黃黑路緣，交給 ramp-details 併入同一份有頂點顏色的設施網格。 */
export function hillProps() {
  const parts = [];
  hillRails().forEach(({ a, b, color, kind }, i) => {
    for (const h of kind === 'stair' ? [0.95] : [0.5, 1]) parts.push({ geometry: beam(a, b, a.y + h, b.y + h, kind === 'stair' ? 0.09 : 0.05), color });
    // 柱子隔段一根（約 3 到 4 公尺），橫桿仍連續。
    if (i % 2 === 0) parts.push({ geometry: new THREE.BoxGeometry(0.08, 1, 0.08).translate(a.x, a.y + 0.5, a.z), color });
  });
  for (const { a, b, low, top0, top1 } of stoneWalls()) {
    const l = Math.hypot(b.x - a.x, b.z - a.z), g = new THREE.BoxGeometry(l + 0.05, 1, 0.45), v = g.attributes.position;
    // 頂面兩端各取自己的牆頂高度，底面埋到踏面下，相鄰兩塊接成一道連續斜牆。
    for (let i = 0; i < v.count; i++) v.setY(i, v.getY(i) > 0 ? (v.getX(i) < 0 ? top0 : top1) : low);
    g.computeVertexNormals();
    parts.push({ geometry: g.rotateY(-Math.atan2(b.z - a.z, b.x - a.x)).translate((a.x + b.x) / 2, 0, (a.z + b.z) / 2), color: '#8f8a7a' });
  }
  parts.push(...ringRoadProps().parts);
  const [a0, a1] = HAIRPIN.arc, n = 16;
  for (let k = 0; k < n; k++) {
    const t = a0 + (a1 - a0) * (k + 0.5) / n, len = (a1 - a0) / n * 6.55;
    parts.push({ geometry: new THREE.BoxGeometry(len, 0.25, 0.25).rotateY(-t - Math.PI / 2)
      .translate(HAIRPIN.x + Math.cos(t) * 6.55, HAIRPIN.h + 0.125, HAIRPIN.z + Math.sin(t) * 6.55),
    color: k % 2 ? '#2b2b2b' : '#f2c230' });
  }
  return parts;
}

export function hillColliders() {
  const stone = stoneWalls().map(({ a, b }) => ({ a, b, kind: 'stone' }));
  const ring = ringRoadProps().colliders.map(c => ({ kind: 'hill-rail', rail: c.kind, obb: true, cx: c.x, cz: c.z, hx: c.hx, hz: c.hz,
    th: c.th, cs: Math.cos(c.th), sn: Math.sin(c.th) }));
  return [...ring, ...[...hillRails(), ...stone].map(({ a, b, kind }) => {
    const th = -Math.atan2(b.z - a.z, b.x - a.x);
    return { kind: 'hill-rail', rail: kind, obb: true, cx: (a.x + b.x) / 2, cz: (a.z + b.z) / 2,
      hx: Math.hypot(b.x - a.x, b.z - a.z) / 2, hz: kind === 'stone' ? 0.25 : 0.06, th, cs: Math.cos(th), sn: Math.sin(th) };
  })];
}
