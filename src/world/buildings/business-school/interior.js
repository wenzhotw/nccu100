/**
 * 商學院一樓內部（室內房間，格式見 docs/interiors.md）。
 *
 * 配置照 photos/floor-plan-1f.png（依現場「一樓平面配置暨緊急疏散方向圖」重繪），細節照其他照片：
 *   - 主要入口（玻璃立面、雙開門、門內紫紅色地墊）進來是大廳：兩根花崗岩方柱，東半邊挑高、格子天花板
 *   - 大廳北邊：「中庭側」（南面白色條紋牆，前面放鋼琴和紅色圍繩）、坐的台階、往二樓的白色樓梯
 *   - 大廳東邊是玉山國際廳（牆上有白色山脈浮雕），西邊是監控室（大理石窗口）
 *   - 大廳往西是電梯廳：黑色石材電梯間（4 部電梯、樓層簡介、配置圖），對面是兩間教室
 *   - 電梯間北邊是廁所，再往北的走道通到交誼廳：桌椅座位區、販賣部（現況是便利商店）、教師休息室
 *   - 交誼廳北邊是走廊和兩間教室，東北角是樓梯電梯和通往中庭的側入口
 *   - 地板是灰色、褐色相間的大塊花崗岩方格；一般天花板是白色礦纖板加日光燈
 *
 * 座標：直接寫平面圖（寬 1934 像素那張）上的像素 (px, py)，用 X()、Z() 換成房間座標（24 像素 = 1 公尺）。
 * 平面圖下方（主要入口）是 +z，入口玻璃門在 z = 0；平面圖往上是 -z，往右是 +x。
 * 平面圖不是實測比例，尺寸是照圖估的。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { GRAD, SPH, basic, block, canvasTex, flat, hText, mk, plane, toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';

// 平面圖像素 → 房間公尺
const S = 24;
const X = px => (px - 790) / S, Z = py => (py - 1323) / S;
const toPx = p => [p.x * S + 790, p.z * S + 1323];

export const CEIL = 3.6;   // 一般天花板
export const HALL = 9;     // 挑高大廳
// 走得到的範圍：西邊電梯廳外牆到玉山國際廳，北邊教室走廊到入口玻璃門
export const R = { x0: X(122), x1: X(1040), z0: Z(477), z1: Z(1323) };
// 主要入口（中間那組雙開門）
export const DOOR = { x: X(790), z: Z(1323) };

const WHITE = '#efeee9', CREAM = '#ece3d0', BLACK = '#1d1e22', ALU = '#a3aaaf', CLASS = '#e4e9f0';
const FONT = '"Noto Sans TC","PingFang TC",sans-serif';

/* ---------- 平面圖小工具 ---------- */
function rc(a, b, c, d) {
  const x0 = Math.min(X(a), X(c)), x1 = Math.max(X(a), X(c)), z0 = Math.min(Z(b), Z(d)), z1 = Math.max(Z(b), Z(d));
  return { x0, x1, z0, z1, x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 };
}
const cube = (r, y0, y1, mat, out) => block(r.x, (y0 + y1) / 2, r.z, r.w, y1 - y0, r.d, mat, out);
const hit = r => boxC(r.x0, r.x1, r.z0, r.z1);
function solid(a, b, c, d, mat = WHITE, y1 = CEIL) { const r = rc(a, b, c, d); cube(r, 0, y1, mat); hit(r); return r; }
// 貼在某個面上的平面：side 是平面圖上的方向（S 是圖的下面，朝 +z；N 朝 -z；E 是圖的右邊，朝 +x；W 朝 -x）
const FACE = { S: [0, 1, 0], N: [0, -1, Math.PI], E: [1, 0, Math.PI / 2], W: [-1, 0, -Math.PI / 2] };
function decal(px, py, side, w, h, y, mat, off = 0.03) {
  const [nx, nz, ry] = FACE[side];
  return plane(w, h, mat, X(px) + nx * off, y, Z(py) + nz * off, 0, ry);
}
// 貼在某個面上的薄方塊（門、門框、看板）
function slab(px, py, side, w, h, y, t, mat) {
  const [nx, nz] = FACE[side];
  return nz ? block(X(px), y, Z(py) + nz * t / 2, w, h, t, mat) : block(X(px) + nx * t / 2, y, Z(py), t, h, w, mat);
}
const tmap = t => new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
const sign = (txt, col, w, h, font = `900 64px ${FONT}`) => basic({ map: hText(txt, col, font, w, h, Math.min(60, w / (txt.length + 1))), transparent: true });

/* ---------- 材質 ---------- */
// 地板：灰色、褐色相間的大塊花崗岩（每塊約 1.2 公尺），有細細的斑點
function floorMat(w, d) {
  const t = canvasTex(256, 256, (g, W) => {
    const c = ['#8f877f', '#aaa59e'];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = c[(i + j) % 2]; g.fillRect(i * 128, j * 128, 128, 128); }
    for (let k = 0; k < 2600; k++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(40,30,25,.10)'; g.fillRect(Math.random() * W, Math.random() * W, 2, 2); }
    g.strokeStyle = 'rgba(60,55,50,.35)'; g.lineWidth = 2; [[0, 0], [128, 0], [0, 128], [128, 128]].forEach(([x, y]) => g.strokeRect(x, y, 128, 128));
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(30, 0); g.lineTo(70, 0); g.lineTo(10, 256); g.lineTo(-30, 256); g.fill();
  }, [w / 2.4, d / 2.4]);
  return tmap(t);
}
// 一般天花板：60 公分礦纖板格子，每 2.4 公尺一盞日光燈
function ceilMat(w, d) {
  const t = canvasTex(256, 256, g => {
    g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#d6d4cd'; g.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    g.fillStyle = '#ffffff'; g.fillRect(70, 70, 116, 52); g.fillStyle = '#e4ebf2'; for (let k = 0; k < 4; k++) g.fillRect(76, 76 + k * 12, 104, 5);
  }, [w / 2.4, d / 2.4]);
  return basic({ map: t });
}
// 挑高大廳的格子天花板（米白色，嵌燈）
function cofferMat(w, d) {
  const t = canvasTex(128, 128, g => {
    g.fillStyle = '#f1ead9'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#fbf6ea'; g.fillRect(14, 14, 100, 100);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(14, 14, 6, 0, 7); g.fill();
  }, [w / 2.4, d / 2.4]);
  return basic({ map: t });
}
// 淺色花崗岩（柱子、牆）
function graniteMat(rx, ry, base = '#cbc6be') {
  const t = canvasTex(128, 128, (g, W) => {
    g.fillStyle = base; g.fillRect(0, 0, W, W);
    for (let k = 0; k < 900; k++) { g.fillStyle = ['rgba(60,60,60,.25)', 'rgba(255,255,255,.35)', 'rgba(120,110,100,.25)'][k % 3]; g.fillRect(Math.random() * W, Math.random() * W, 2, 2); }
    g.strokeStyle = 'rgba(90,90,90,.25)'; g.lineWidth = 2; g.strokeRect(0, 0, W, W);
  }, [rx, ry]);
  return tmap(t);
}
const blackMat = new THREE.MeshToonMaterial({ color: BLACK, gradientMap: GRAD });
// 玻璃（不擋鏡頭）
const glassMat = basic({ color: '#d4ebf5', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
// 中庭的木棧板
function deckMat(w, d) {
  const t = canvasTex(128, 128, g => {
    for (let y = 0; y < 128; y += 16) { g.fillStyle = (y / 16) % 2 ? '#c8b59a' : '#d3c2a8'; g.fillRect(0, y, 128, 15); g.fillStyle = '#a8957c'; g.fillRect(0, y + 15, 128, 1); }
  }, [w / 2, d / 2]);
  return tmap(t);
}
// 中庭四周的大樓外牆：米褐色磁磚加窗
function facadeMat(w, h) {
  const t = canvasTex(256, 256, g => {
    g.fillStyle = '#c9b49a'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(90,70,50,.18)'; g.lineWidth = 1; for (let i = 0; i < 256; i += 8) { g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const x = c * 128 + 20, y = r * 128 + 26;
      g.fillStyle = '#e4dccd'; g.fillRect(x - 4, y - 4, 96, 72); g.fillStyle = '#56656f'; g.fillRect(x, y, 88, 64);
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x, y, 30, 64); g.fillStyle = '#e4dccd'; g.fillRect(x + 42, y, 4, 64);
    }
  }, [w / 7, h / 7]);
  return tmap(t);
}
// 鋼琴後面的白色條紋牆（長短不一的橫條）
function slatMat(w, h) {
  const t = canvasTex(256, 256, g => {
    g.fillStyle = '#f4f3ef'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#d9d7d0';
    for (let y = 0; y < 256; y += 16) { g.fillRect(0, y, 256, 2); const off = (y * 37) % 200; g.fillRect(off, y, 2, 16); g.fillRect((off + 120) % 256, y, 2, 16); }
  }, [w / 4, h / 4]);
  return tmap(t);
}
// 玉山國際廳外牆上的白色山脈浮雕
function muralTex() {
  return canvasTex(512, 256, g => {
    g.fillStyle = '#eeece6'; g.fillRect(0, 0, 512, 256);
    const ridge = (y0, amp, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, 256); for (let x = 0; x <= 512; x += 12) g.lineTo(x, y0 - Math.abs(Math.sin(x * 0.011 + y0)) * amp - Math.sin(x * 0.045) * amp * 0.2); g.lineTo(512, 256); g.fill(); };
    ridge(170, 110, '#e2dfd7'); ridge(205, 70, '#d6d2c9'); ridge(235, 35, '#cbc6bc');
    g.strokeStyle = 'rgba(160,155,145,.6)'; g.lineWidth = 1.5; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(40 + k * 52, 120); g.lineTo(70 + k * 52, 220); g.stroke(); }
  });
}
// 便利商店櫥窗：貨架和商品
function shelfTex(w) {
  return canvasTex(512, 256, g => {
    g.fillStyle = '#f6f3e8'; g.fillRect(0, 0, 512, 256);
    for (let r = 0; r < 4; r++) {
      const y = 30 + r * 52; g.fillStyle = '#d7dadd'; g.fillRect(0, y + 40, 512, 6);
      for (let x = 4; x < 512; x += 14) { g.fillStyle = ['#e8463c', '#f0c94a', '#3f8fd0', '#ffffff', '#4fae5a', '#f39a3c', '#8a5ac8'][(x * 7 + r * 3) % 7]; g.fillRect(x, y + 12 + (x % 3) * 4, 11, 28 - (x % 3) * 4); }
    }
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(60, 0); g.lineTo(160, 0); g.lineTo(80, 256); g.lineTo(-20, 256); g.fill();
  }, [w / 4, 1]);
}
// 窗外景色（交誼廳、走廊的窗）
function outsideTex(w) {
  return canvasTex(256, 128, g => {
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#eaf5fb'); gr.addColorStop(1, '#cfe6d5'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    g.fillStyle = 'rgba(80,140,80,.55)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(i * 32 + 10, 96, 22, 0, 7); g.fill(); }
    g.fillStyle = '#ffffff'; for (let x = 0; x <= 256; x += 64) g.fillRect(x - 3, 0, 6, 128); g.fillRect(0, 60, 256, 5); g.fillRect(0, 0, 256, 5); g.fillRect(0, 123, 256, 5);
  }, [w / 4, 1]);
}

/* ---------- 告示類貼圖 ---------- */
// 樓層簡介（電梯間外面）：藍框、一行一層
function directoryTex() {
  return canvasTex(256, 384, g => {
    g.fillStyle = '#2d4f9e'; g.fillRect(0, 0, 256, 384);
    g.fillStyle = '#eef1f5'; g.fillRect(10, 46, 236, 328);
    g.fillStyle = '#ffffff'; g.font = `700 22px ${FONT}`; g.textAlign = 'center'; g.fillText('商學院大樓樓層簡介', 128, 32);
    g.textAlign = 'left';
    for (let f = 0; f < 11; f++) {
      const y = 62 + f * 28;
      g.fillStyle = '#2d4f9e'; g.fillRect(18, y, 34, 22);
      g.fillStyle = '#ffffff'; g.font = `700 15px ${FONT}`; g.fillText(`${11 - f}F`, 22, y + 16);
      g.fillStyle = '#9aa6b5'; g.fillRect(62, y + 6, 120 + (f * 37) % 50, 9);
      g.fillStyle = '#4a5160'; g.fillRect(56, y + 25, 184, 1.5);
    }
  });
}
// 一樓平面配置暨緊急疏散方向圖：把平面圖簡化畫上去，紅點是「現在位置」
const PLAN_ROOMS = [
  [148, 252, 350, 475], [350, 252, 552, 475], [552, 252, 692, 497], [145, 545, 290, 653], [290, 545, 475, 653],
  [135, 873, 445, 1040], [135, 1040, 478, 1090], [120, 1222, 328, 1440], [328, 1222, 535, 1440], [538, 1248, 623, 1403],
  [655, 998, 855, 1110], [908, 1012, 997, 1108], [1040, 968, 1488, 1485], [545, 545, 692, 600], [545, 827, 588, 920],
];
function evacTex() {
  return canvasTex(512, 384, g => {
    g.fillStyle = '#2d4f9e'; g.fillRect(0, 0, 512, 384);
    g.fillStyle = '#f7f7f4'; g.fillRect(10, 44, 492, 330);
    g.fillStyle = '#fff'; g.font = `700 22px ${FONT}`; g.fillText('一樓平面配置暨緊急疏散方向圖', 70, 30);
    const k = 0.24, ox = 0, oy = -10, R0 = (a, b, c, d, col, st) => { g[st ? 'strokeStyle' : 'fillStyle'] = col; g[st ? 'strokeRect' : 'fillRect'](ox + a * k, oy + b * k, (c - a) * k, (d - b) * k); };
    R0(120, 252, 1040, 1440, '#e9ecef');
    R0(790, 475, 1620, 930, '#d9ead2');
    g.lineWidth = 1.5; PLAN_ROOMS.forEach(r => { R0(...r, '#ffffff'); R0(...r, '#55606c', true); });
    g.fillStyle = '#2d4f9e'; g.font = `700 13px ${FONT}`;
    [['大廳', 760, 1200], ['電梯廳', 270, 1160], ['交誼廳', 300, 780], ['中庭', 1150, 720], ['玉山國際廳', 1180, 1230]].forEach(([t, x, y]) => g.fillText(t, ox + x * k, oy + y * k));
    g.strokeStyle = '#c0392b'; g.lineWidth = 3;
    [[680, 1300], [770, 1300], [960, 1300]].forEach(([x, y]) => { g.beginPath(); g.moveTo(ox + x * k, oy + (y - 50) * k); g.lineTo(ox + x * k, oy + (y + 10) * k); g.stroke(); });
    g.fillStyle = '#d8342c'; g.beginPath(); g.arc(ox + 500 * k, oy + 1062 * k, 6, 0, 7); g.fill();
    g.font = `700 13px ${FONT}`; g.fillText('現在位置', ox + 512 * k, oy + 1100 * k);
  });
}
// 公告板：軟木板貼滿傳單
function corkTex() {
  return canvasTex(512, 160, g => {
    g.fillStyle = '#b58a5c'; g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#6e5038'; g.fillRect(0, 0, 512, 8); g.fillRect(0, 152, 512, 8);
    const cols = ['#ffffff', '#ffe9a8', '#cfe7ff', '#ffd1dc', '#d8f3d0', '#ffffff'];
    for (let i = 0; i < 16; i++) {
      const x = 14 + (i % 8) * 62 + (i * 13) % 9, y = i < 8 ? 18 : 84, w = 48, h = 56;
      g.fillStyle = cols[i % cols.length]; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(40,50,70,.55)'; g.fillRect(x + 6, y + 8, w - 12, 6); for (let l = 0; l < 4; l++) g.fillRect(x + 6, y + 22 + l * 8, w - 16 - (l * 7) % 12, 3);
      g.fillStyle = '#d8342c'; g.beginPath(); g.arc(x + w / 2, y + 3, 3, 0, 7); g.fill();
    }
  });
}

/* ---------- 玻璃牆：玻璃、鋁框、橫料 ---------- */
function glassLine(x0, z0, x1, z1, y0, y1, trans = [], step = 1.6) {
  const alongX = Math.abs(z1 - z0) < 0.01, L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, H = y1 - y0;
  const g = plane(L, H, glassMat, cx, (y0 + y1) / 2, cz, 0, alongX ? 0 : Math.PI / 2); g.userData.noOcc = true; g.renderOrder = 3;
  const n = Math.max(1, Math.round(L / step));
  for (let i = 0; i <= n; i++) { const f = i / n; block(x0 + (x1 - x0) * f, (y0 + y1) / 2, z0 + (z1 - z0) * f, 0.09, H, 0.09, ALU); }
  [y0 + 0.05, y1 - 0.05, ...trans].forEach(y => block(cx, y, cz, alongX ? L : 0.08, 0.08, alongX ? 0.08 : L, ALU));
}
// 平面圖上的玻璃牆：從 (a, b) 到 (c, d)，順便加碰撞
function glassPx(a, b, c, d, y1, trans, step) {
  glassLine(X(a), Z(b), X(c), Z(d), 0, y1, trans, step);
  const r = rc(a, b, c, d); boxC(r.x0 - 0.12, r.x1 + 0.12, r.z0 - 0.12, r.z1 + 0.12);
}
// 雙開玻璃門（不鏽鋼框、長把手）
function glassDoor(px, py, side, w = 2.0) {
  slab(px, py, side, w + 0.2, 0.12, 2.5, 0.14, ALU);
  [-1, 1].forEach(s => {
    const [nx] = FACE[side], along = nx ? [0, s * w / 4] : [s * w / 4, 0];
    block(X(px) + along[0], 1.25, Z(py) + along[1], nx ? 0.06 : w / 2 - 0.08, 2.4, nx ? w / 2 - 0.08 : 0.06, '#8fa0aa').material = glassMat;
    block(X(px) + along[0] * 0.25, 1.1, Z(py) + along[1] * 0.25, nx ? 0.12 : 0.04, 0.9, nx ? 0.04 : 0.12, '#c9ced3');
  });
}
// 一般的門（教室、廁所）
function door(px, py, side, col = '#8a6448', w = 1.0) { slab(px, py, side, w + 0.16, 2.3, 1.15, 0.05, '#c9c5bc'); slab(px, py, side, w, 2.2, 1.1, 0.08, col); }
// 房間門牌
const plate = (px, py, side, txt, y = 2.45, w = 1.1) => { slab(px, py, side, w + 0.08, 0.32, y, 0.03, '#2d4f9e'); decal(px, py, side, w, 0.28, y, sign(txt, '#ffffff', 320, 80, `700 40px ${FONT}`), 0.05); };

/* ---------- 家具 ---------- */
// 白色木椅（坐墊綠或黃，照片上的樣子）：先收集位置，最後用 InstancedMesh 一次畫出來
const CHAIRS = [];
const chair = (x, z, ry, cushion) => CHAIRS.push({ x, z, ry, cushion });
const CHAIR_PARTS = [   // [x, y, z, 寬, 高, 深, 顏色（null 是坐墊）]
  [0, 0.22, 0, 0.42, 0.44, 0.42, '#eee9de'], [0, 0.47, 0, 0.46, 0.07, 0.46, null], [0, 0.78, -0.2, 0.46, 0.08, 0.06, '#eee9de'],
  [-0.2, 0.66, -0.2, 0.05, 0.36, 0.05, '#eee9de'], [0.2, 0.66, -0.2, 0.05, 0.36, 0.05, '#eee9de'],
];
const chairMat = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: GRAD });
function flushChairs() {
  if (!CHAIRS.length) return;
  const geo = new THREE.BoxGeometry(1, 1, 1), m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  CHAIR_PARTS.forEach(([px, py, pz, sx, sy, sz, col]) => {
    const mesh = new THREE.InstancedMesh(geo, chairMat, CHAIRS.length);
    CHAIRS.forEach((ch, i) => {
      q.setFromAxisAngle(up, ch.ry);
      const off = new THREE.Vector3(px, py, pz).applyQuaternion(q);
      m.compose(new THREE.Vector3(ch.x + off.x, off.y, ch.z + off.z), q, new THREE.Vector3(sx, sy, sz));
      mesh.setMatrixAt(i, m); mesh.setColorAt(i, c.set(col || ch.cushion));
    });
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.noOcc = true; scene.add(mesh);
  });
  CHAIRS.length = 0;
}
// 白色方桌
function table(x, z, w = 0.75, d = 0.75) {
  block(x, 0.74, z, w, 0.05, d, '#f7f6f2', 0.012);
  block(x, 0.37, z, 0.1, 0.72, 0.1, '#9aa0a6');
  block(x, 0.03, z, 0.45, 0.05, 0.45, '#9aa0a6');
}
function tree(x, z, s = 1, y0 = 0) {
  mk(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 2.6 * s, 8), toon('#7a5b40'), x, y0 + 1.3 * s, z, { out: 0.02 });
  [[0, 3.2, 0, 1.5], [0.7, 2.7, 0.3, 1.0], [-0.6, 2.8, -0.3, 1.1]].forEach(([dx, y, dz, r]) => mk(SPH, toon('#5f9e4a'), x + dx * s, y0 + y * s, z + dz * s, { out: 0.03 }).scale.setScalar(r * s));
}
function picnic(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  block(0, 0.74, 0, 2.2, 0.08, 0.8, '#b0815a', 0.012, g);
  [-0.65, 0.65].forEach(dz => block(0, 0.44, dz, 2.2, 0.06, 0.3, '#a57650', 0, g));
  [-0.85, 0.85].forEach(dx => block(dx, 0.37, 0, 0.1, 0.74, 1.5, '#8b6444', 0, g));
}
// 樓梯（裝飾用，走不上去）：從 (a, b) 到 (c, d) 的範圍，往 dir 方向升高
function stairs(a, b, c, d, dir, top, col = '#b2ada6') {
  const r = rc(a, b, c, d), n = 10;
  for (let k = 0; k < n; k++) {
    const h = top * (k + 1) / n;
    if (dir === 'N') { const dd = r.d / n, z = r.z1 - dd * (k + 0.5); block(r.x, h / 2, z, r.w, h, dd, k % 2 ? col : '#c2bdb6'); }
    else if (dir === 'S') { const dd = r.d / n, z = r.z0 + dd * (k + 0.5); block(r.x, h / 2, z, r.w, h, dd, k % 2 ? col : '#c2bdb6'); }
    else if (dir === 'E') { const dd = r.w / n, x = r.x0 + dd * (k + 0.5); block(x, h / 2, r.z, dd, h, r.d, k % 2 ? col : '#c2bdb6'); }
    else { const dd = r.w / n, x = r.x1 - dd * (k + 0.5); block(x, h / 2, r.z, dd, h, r.d, k % 2 ? col : '#c2bdb6'); }
  }
  hit(r); return r;
}

/* ---------- 建模 ---------- */
export function buildInterior() {
  /* 外面的地面（前方廣場比一樓低一截）、中庭木棧板、室內地板 */
  flat(200, 200, '#bab4a8', 0, -1.05, -10).userData.noOcc = true;
  [[-34, -6], [-30, 14], [16, 16], [34, 10], [-12, 18]].forEach(([x, z]) => tree(x, z, 1.4, -1.05));
  { const c = rc(545, 440, 1625, 998); flat(c.w, c.d, deckMat(c.w, c.d), c.x, -0.01, c.z); }
  [[143, 475, 545, 873], [148, 475, 692, 545], [545, 497, 788, 700], [120, 873, 545, 1222], [545, 920, 1040, 1323], [655, 998, 855, 1110]].forEach(([a, b, c, d]) => {
    const r = rc(a, b, c, d); flat(r.w, r.d, floorMat(r.w, r.d), r.x, 0.01, r.z);
  });
  // 入口外面：門廊（石材）、往下的戶外階梯
  { const p = rc(623, 1323, 1040, 1435); flat(p.w, p.d, '#c9c4ba', p.x, 0.012, p.z);
    const s = rc(648, 1435, 945, 1487); for (let k = 0; k < 5; k++) block(s.x, -0.105 - 0.21 * k, s.z0 + s.d * (k + 0.5) / 5, s.w, 0.21, s.d / 5, k % 2 ? '#bdb8af' : '#c8c3ba'); }

  /* 天花板：一般區 3.6 公尺（方塊會讓鏡頭不穿出去），大廳東半邊 9 公尺 */
  [[143, 475, 545, 873], [545, 497, 788, 700], [120, 873, 545, 1222], [545, 920, 655, 1323], [655, 998, 855, 1110], [623, 1323, 1040, 1435]].forEach(([a, b, c, d]) => {
    const r = rc(a, b, c, d); cube(r, CEIL, CEIL + 0.3, '#f2f1ec');
    plane(r.w, r.d, ceilMat(r.w, r.d), r.x, CEIL - 0.005, r.z, Math.PI / 2);
  });
  [[655, 1110, 1040, 1323], [855, 998, 1040, 1110]].forEach(([a, b, c, d]) => {
    const r = rc(a, b, c, d); cube(r, HALL, HALL + 0.4, '#efe7d6');
    plane(r.w, r.d, cofferMat(r.w, r.d), r.x, HALL - 0.005, r.z, Math.PI / 2);
    for (let x = r.x0 + 1.2; x < r.x1; x += 2.4) block(x, HALL - 0.3, r.z, 0.3, 0.6, r.d, '#e6dcc6').userData.noOcc = true;
    for (let z = r.z0 + 1.2; z < r.z1; z += 2.4) block(r.x, HALL - 0.3, z, r.w, 0.6, 0.3, '#e6dcc6').userData.noOcc = true;
  });
  // 挑高和一般天花板交界的花崗岩大樑（照片上有軌道燈）
  { const g = graniteMat(6, 2); cube(rc(649, 1110, 661, 1323), CEIL, HALL, g); cube(rc(655, 1104, 855, 1116), CEIL, HALL, g); cube(rc(849, 998, 861, 1110), CEIL, HALL, g);
    block(X(661) + 0.15, CEIL - 0.08, Z(1216), 0.06, 0.06, rc(0, 1110, 0, 1323).d, '#222').userData.noOcc = true;
    for (let py = 1130; py < 1320; py += 40) mk(new THREE.CylinderGeometry(0.1, 0.1, 0.25, 10), toon('#222'), X(661) + 0.2, CEIL - 0.25, Z(py), {}); }

  /* 外牆 */
  solid(148, 246, 692, 252, CREAM);
  solid(140, 252, 148, 545, CREAM);
  solid(137, 545, 143, 873, CREAM);
  solid(126, 873, 135, 1222, CREAM);
  solid(114, 1222, 120, 1440, CREAM);
  // 交誼廳東牆（窗外是往中庭的戶外台階）
  solid(545, 698, 551, 827, CREAM);
  decal(545, 762, 'W', 4.6, 1.5, 1.8, basic({ map: outsideTex(4.6) }), 0.03);

  /* 北側：兩間教室、樓梯電梯、走廊 */
  solid(148, 252, 350, 475, CLASS); solid(350, 252, 552, 475, CLASS);
  [[175, '260106 教室'], [320, null], [377, '260105 教室'], [522, null]].forEach(([px, t]) => { door(px, 475, 'S'); if (t) plate(px + 52, 475, 'S', t); });
  solid(552, 252, 692, 497, graniteMat(3, 2));
  door(585, 497, 'S', '#5a5f66', 1.2); decal(585, 497, 'S', 0.6, 0.2, 2.5, sign('樓梯', '#2a2c35', 128, 48, `700 34px ${FONT}`), 0.1);
  slab(650, 497, 'S', 1.3, 2.3, 1.15, 0.08, '#c2c7cb'); block(X(650), 1.15, Z(497) + 0.09, 0.02, 2.3, 0.02, '#8d9296');
  // 教師休息室、販賣部（便利商店）
  solid(145, 545, 290, 653, WHITE);
  door(185, 545, 'N'); plate(240, 545, 'N', '260107 教師休息室', 2.45, 1.6);
  door(218, 653, 'S');
  solid(290, 545, 475, 653, CREAM);
  { const r = rc(290, 653, 475, 653), L = r.w;
    decal(382, 653, 'S', L - 0.6, 2.2, 1.25, basic({ map: shelfTex(L) }), 0.04);
    for (let k = 0; k <= 6; k++) block(r.x0 + 0.3 + (L - 0.6) * k / 6, 1.25, Z(653) + 0.06, 0.08, 2.4, 0.08, ALU);
    slab(330, 653, 'S', 1.8, 2.3, 1.15, 0.08, '#6c757c'); decal(330, 653, 'S', 1.6, 2.1, 1.1, glassMat, 0.1);
    slab(382, 653, 'S', L, 0.8, 3.0, 0.25, '#1f8d55');
    decal(382, 653, 'S', 4.0, 0.6, 3.0, sign('便利商店', '#ffffff', 640, 100, `900 72px ${FONT}`), 0.27);
    decal(450, 653, 'S', 1.0, 0.42, 3.0, sign('24H', '#ffe27a', 192, 80, `900 60px ${FONT}`), 0.27);
    plate(290 + 10, 653, 'S', '260108 販賣部', 2.45, 1.3); }
  // 店門口：紙箱、紅色塑膠籃、小心地滑牌、貨架
  { const z = Z(653) + 0.45;
    [[440, 0.3, '#c6a36e'], [440, 0.82, '#b82f3a'], [462, 0.25, '#b82f3a'], [462, 0.75, '#b82f3a']].forEach(([px, y, c]) => block(X(px), y, z, 0.7, 0.5, 0.6, c, 0.02));
    boxC(X(430), X(472), z - 0.35, z + 0.35);
    const ws = mk(new THREE.ConeGeometry(0.3, 0.9, 4), toon('#f2c230'), X(415), 0.45, z + 0.3, { out: 0.02 }); ws.rotation.y = Math.PI / 4;
    block(X(300), 0.65, z, 0.9, 1.3, 0.5, '#6fd0b8', 0.02); boxC(X(300) - 0.5, X(300) + 0.5, z - 0.3, z + 0.3); }
  // 東北角：往樓梯電梯的轉角牆、側入口小廳（玻璃門通中庭）
  solid(545, 545, 692, 600, WHITE); solid(545, 600, 640, 655, WHITE);
  solid(551, 698, 788, 704, WHITE);
  solid(692, 491, 788, 497, WHITE);
  glassPx(788, 497, 788, 698, CEIL, [2.5]);
  glassDoor(788, 650, 'E', 1.8);
  decal(788, 650, 'W', 1.1, 0.3, 3.0, sign('側入口', '#2a2c35', 192, 56, `700 40px ${FONT}`), 0.1);
  block(X(788) - 0.12, 3.0, Z(650), 0.06, 0.24, 0.6, '#2a8f4a');
  // 公告板（走道東側，往中庭的小門旁邊）
  solid(545, 827, 588, 920, graniteMat(2, 3));
  decal(545, 865, 'W', 2.6, 1.1, 1.6, basic({ map: corkTex() }), 0.04);
  door(566, 920, 'S', '#f4f4f0', 0.9);

  /* 廁所、電梯間（黑色石材，4 部電梯朝電梯廳） */
  solid(135, 873, 445, 1040, WHITE);
  solid(474, 873, 482, 942, WHITE); solid(474, 998, 482, 1040, WHITE);
  [[915, '女廁', '#d8608c'], [1000, '男廁', '#3f78c8']].forEach(([py, t, col]) => {
    door(445, py, 'E', '#9aa3ab');
    block(X(445) + 0.06, 2.5, Z(py), 0.04, 0.32, 0.7, col);
    decal(445, py, 'E', 0.62, 0.26, 2.5, sign(t, '#ffffff', 192, 64, `900 44px ${FONT}`), 0.09);
  });
  { const t = hText('♀ ♿ ♂', '#2a2c35', `700 44px ${FONT}`, 256, 64, 40); slab(478, 925, 'E', 1.0, 0.34, 2.6, 0.06, '#e9eaec'); decal(478, 925, 'E', 0.9, 0.3, 2.6, basic({ map: t, transparent: true }), 0.08); }
  solid(135, 1040, 478, 1090, blackMat);
  [248, 297, 346, 395].forEach(px => {
    slab(px, 1090, 'S', 1.5, 2.5, 1.25, 0.08, '#b9bec2');
    slab(px, 1090, 'S', 1.2, 2.2, 1.1, 0.1, '#c2c7cb');
    block(X(px), 1.1, Z(1090) + 0.12, 0.02, 2.2, 0.02, '#8d9296');
    block(X(px), 2.75, Z(1090) + 0.06, 0.5, 0.2, 0.04, '#111');
    block(X(px) + 0.95, 1.15, Z(1090) + 0.06, 0.12, 0.25, 0.04, '#c9ced3');
  });
  decal(180, 1090, 'S', 0.95, 1.4, 1.65, basic({ map: directoryTex() }), 0.04);
  // 配置圖（電梯間東面，平面圖上的「配置圖位置」）
  slab(478, 1065, 'E', 1.45, 1.1, 1.65, 0.04, '#2d4f9e');
  decal(478, 1065, 'E', 1.35, 1.0, 1.65, basic({ map: evacTex() }), 0.06);
  // 西邊往上的小樓梯
  stairs(128, 1093, 163, 1188, 'N', 2.2);
  block(X(165), 1.0, Z(1140), 0.05, 0.05, rc(0, 1093, 0, 1188).d, ALU);

  /* 南側：兩間教室、監控室 */
  solid(120, 1222, 328, 1440, CLASS); solid(328, 1222, 535, 1440, CLASS);
  [[190, '260101 教室'], [290, null], [400, '260102 教室'], [500, null]].forEach(([px, t]) => { door(px, 1222, 'N'); if (t) plate(px + 52, 1222, 'N', t); });
  solid(535, 1222, 538, 1248, CLASS);
  solid(538, 1248, 623, 1403, graniteMat(2, 3));
  door(570, 1248, 'N', '#7b6a58', 0.9); plate(578, 1248, 'N', '260103 監控室', 2.5, 1.2);
  // 監控室東面：大理石窗口
  { slab(623, 1290, 'E', 2.4, 1.1, 0.55, 0.35, '#ece8e1'); block(X(623) + 0.36, 1.12, Z(1290), 0.42, 0.06, 2.5, '#f6f4ef');
    decal(623, 1290, 'E', 1.8, 1.0, 1.75, basic({ color: '#5d7584' }), 0.03); slab(623, 1290, 'E', 2.0, 0.08, 2.3, 0.08, ALU); }

  /* 大廳 */
  // 入口玻璃立面（挑高的地方到 9 公尺）與五組雙開門，門內紫紅色地墊
  glassPx(623, 1323, 655, 1323, CEIL);
  glassPx(655, 1323, 1040, 1323, HALL, [2.6, 4.2, 6.2], 1.9);
  [662, 752, 800, 930, 1015].forEach(px => glassDoor(px, 1323, 'N', 1.6));
  { const r = rc(752, 1250, 846, 1321); flat(r.w, r.d, '#8c4a5a', r.x, 0.02, r.z); }
  // 兩根花崗岩方柱
  [[655, 1220], [857, 1220]].forEach(([px, py]) => { const x = X(px), z = Z(py); block(x, HALL / 2, z, 1.2, HALL, 1.2, graniteMat(1, 7)); boxC(x - 0.6, x + 0.6, z - 0.6, z + 0.6); });
  // 西北角往中庭的玻璃（照片上大廳右手邊的整排窗）
  glassPx(588, 920, 655, 920, CEIL, [2.5]);
  glassPx(655, 920, 655, 998, CEIL, [2.5]);
  // 中庭側：南面白色條紋牆、西面玻璃，裡面靠中庭也是玻璃
  { const r = rc(655, 998, 855, 1110);
    block(r.x, CEIL / 2, r.z1 - 0.15, r.w, CEIL, 0.3, slatMat(r.w, CEIL)); boxC(r.x0, r.x1, r.z1 - 0.3, r.z1);
    cube(rc(849, 998, 855, 1110), 0, CEIL, graniteMat(1, 3)); boxC(X(849), X(855), Z(998), Z(1110));
    glassPx(655, 998, 655, 1104, CEIL, [2.5]);
    glassLine(X(655), Z(998), X(849), Z(998), 0, CEIL, [2.5]);
    // 裡面的長椅
    [700, 800].forEach(px => { block(X(px), 0.22, Z(1060), 2.2, 0.44, 0.6, '#b98a5a', 0.02); });
    decal(755, 1104, 'S', 2.2, 0.3, 3.1, sign('中庭側', '#5a5f66', 256, 56, `700 36px ${FONT}`), 0.33); }
  // 鋼琴與紅色圍繩（白色條紋牆前面）
  { const px = X(745), pz = Z(1110) + 1.35, pg = new THREE.Group(); pg.position.set(px, 0, pz); pg.rotation.y = Math.PI / 2; scene.add(pg);
    block(0, 0.85, 0, 1.4, 0.32, 1.9, '#111114', 0.02, pg);
    block(0, 1.03, 0, 1.4, 0.04, 1.9, '#18181c', 0, pg);
    block(0, 0.92, 0.98, 1.3, 0.06, 0.22, '#f4f4f0', 0, pg); block(0, 0.95, 1.0, 1.25, 0.03, 0.12, '#222', 0, pg);
    [[-0.55, -0.7], [0.55, -0.7], [0, 0.75]].forEach(([dx, dz]) => block(dx, 0.35, dz, 0.1, 0.7, 0.1, '#111114', 0, pg));
    boxC(px - 1.1, px + 1.1, pz - 0.8, pz + 0.8);
    const posts = [[px - 1.3, pz + 1.0], [px + 1.3, pz + 1.0], [px - 1.3, pz - 0.6]];
    posts.forEach(([x, z]) => { mk(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 8), toon('#c9ced3'), x, 0.48, z, {}); mk(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 12), toon('#c9ced3'), x, 0.03, z, {}); mk(SPH, toon('#dfe3e6'), x, 0.98, z, {}).scale.setScalar(0.07); });
    [[0, 1], [0, 2]].forEach(([a, b]) => { const [x0, z0] = posts[a], [x1, z1] = posts[b], L = Math.hypot(x1 - x0, z1 - z0);
      const rope = mk(new THREE.CylinderGeometry(0.035, 0.035, L, 6), toon('#d22a35'), (x0 + x1) / 2, 0.82, (z0 + z1) / 2, {}); rope.rotation.z = Math.PI / 2; rope.rotation.y = -Math.atan2(z1 - z0, x1 - x0); }); }
  // 坐的台階（中庭側旁邊，照片上同學坐在這裡）
  { const st = SEAT; block(st.x, 0.12, st.z, st.w, 0.24, st.d, '#3a3b3f', 0.02); block(st.x, 0.36, st.z - 0.25, st.w, 0.24, st.d - 0.5, '#2c2d31', 0.02); }
  // 往二樓的白色樓梯（白色鋸齒側板）
  { const r = stairs(908, 1012, 997, 1108, 'N', 3.4, '#e8e6e0');
    for (let k = 0; k < 10; k++) block(r.x0 - 0.04, 3.4 * (k + 1) / 20, r.z1 - r.d * (k + 0.5) / 10, 0.08, 3.4 * (k + 1) / 10, r.d / 10, '#f6f6f3');
    block(X(997) + 0.03, 4.0, Z(1012) + 0.6, 0.04, 0.22, 0.5, '#2a8f4a'); }
  solid(855, 992, 1040, 998, graniteMat(6, 4), HALL);
  // 玉山國際廳：西牆（花崗岩加白色山脈浮雕）、兩組門
  solid(997, 968, 1040, 998, graniteMat(2, 2), HALL);
  solid(1040, 968, 1488, 1485, graniteMat(8, 4), HALL);
  decal(1040, 1170, 'W', 6.4, 3.4, 2.3, basic({ map: muralTex() }), 0.03);
  door(1040, 1080, 'W', '#4c5258', 1.6); plate(1040, 1030, 'W', '260104 玉山國際廳', 2.6, 1.9);
  door(1040, 1300, 'W', '#4c5258', 1.2);
  // 盆栽、滅火器箱
  [[1020, 1300], [640, 1305]].forEach(([px, py]) => { mk(new THREE.CylinderGeometry(0.32, 0.26, 0.6, 10), toon('#8d8a84'), X(px), 0.3, Z(py), { out: 0.02 }); mk(SPH, toon('#4f9a48'), X(px), 0.95, Z(py), { out: 0.03 }).scale.setScalar(0.5); });
  block(X(623) + 0.08, 0.9, Z(1235), 0.14, 1.2, 0.5, '#c8282e', 0.02);

  /* 交誼廳：白色方桌、綠色黃色坐墊白椅，中間一根白柱，西牆掛電視 */
  { const cush = ['#5fb59a', '#f0c94a'];
    [[185, 705], [245, 705], [185, 775], [245, 775], [185, 845], [245, 845], [360, 715], [420, 715], [360, 785], [420, 785], [360, 850], [420, 850]].forEach(([px, py], i) => {
      const x = X(px), z = Z(py); table(x, z);
      [[0, 0.58, Math.PI], [0, -0.58, 0], [0.58, 0, -Math.PI / 2], [-0.58, 0, Math.PI / 2]].forEach(([dx, dz, ry], j) => chair(x + dx, z + dz, ry, cush[(i + j) % 2]));
      boxC(x - 0.8, x + 0.8, z - 0.8, z + 0.8);
    });
    flushChairs();
    const px = X(303), pz = Z(760); block(px, CEIL / 2, pz, 1.0, CEIL, 1.0, WHITE); boxC(px - 0.5, px + 0.5, pz - 0.5, pz + 0.5);
    slab(143, 760, 'E', 1.6, 0.92, 2.0, 0.08, '#1a1b1e'); decal(143, 760, 'E', 1.5, 0.84, 2.0, basic({ color: '#2f4d6e' }), 0.09); }
  // 回收桶
  [['#2f6fd0', 0], ['#4fae5a', 0.55], ['#f0c94a', 1.1]].forEach(([c, d]) => block(X(540) - 0.3, 0.45, Z(700) + 0.5 + d, 0.5, 0.9, 0.5, c, 0.02));
  boxC(X(540) - 0.6, X(545), Z(700) + 0.2, Z(700) + 1.9);

  /* 中庭（從玻璃看出去） */
  { const f = (w, h, x, y, z, ry) => plane(w, h, facadeMat(w, h), x, y, z, 0, ry);
    const n = rc(692, 436, 1625, 436), e = rc(1625, 436, 1625, 968);
    f(n.w, 15, n.x, 7.5, n.z0, 0);
    f(e.d, 15, e.x0, 7.5, e.z, -Math.PI / 2);
    const s = rc(788, 497, 788, 700); f(s.d, 15 - CEIL, s.x0 + 0.02, (15 + CEIL) / 2, s.z, Math.PI / 2);
    const w = rc(588, 700, 588, 920); f(w.d, 15 - CEIL, X(551) + 0.02, (15 + CEIL) / 2, w.z, Math.PI / 2);
    const b = rc(588, 998, 997, 998); f(b.w, 15 - CEIL, b.x, (15 + CEIL) / 2, Z(992) - 0.02, Math.PI);
    f(rc(997, 968, 1625, 968).w, HALL, rc(997, 0, 1625, 0).x, HALL / 2, Z(968) - 0.02, Math.PI);
    stairs(545, 722, 588, 825, 'W', 0.6, '#bdb8af');
    stairs(698, 445, 788, 497, 'N', 0.8, '#bdb8af');
    [[950, 800, 0.2], [1150, 700, -0.1], [1350, 820, 0.15], [1260, 590, 0]].forEach(([px, py, ry]) => picnic(X(px), Z(py), ry));
    [[1450, 560], [1000, 580], [720, 790], [1520, 880], [880, 930]].forEach(([px, py]) => tree(X(px), Z(py), 1.15));
    block(X(760), 0.3, Z(975), 7.5, 0.6, 0.8, '#b9a68c', 0.02);
    for (let k = 0; k < 6; k++) mk(SPH, toon('#5f9e4a'), X(680) + k * 1.3, 0.75, Z(975), { out: 0.02 }).scale.setScalar(0.45);
    block(X(1580), 0.95, Z(700), 0.8, 1.9, 1.0, '#d8342c', 0.02); block(X(1580) - 0.41, 1.15, Z(700), 0.02, 1.0, 0.8, '#f4f4f0'); }
}

// 坐的台階（中庭側和白色樓梯中間）
const SEAT = rc(860, 1000, 906, 1106);

/* ---------- 房間設定用的規則 ---------- */
export function interiorHeight(x, z) {
  const st = SEAT;
  if (x > st.x0 && x < st.x1 && z > st.z0 && z < st.z1) return z < st.z1 - 0.5 ? 0.48 : 0.24;
  return 0;
}
export function interiorZone(p) {
  const [px, py] = toPx(p);
  if (py < 545) return px > 692 ? '側入口' : '北側走廊';
  if (py < 700 && px > 545) return '側入口';
  if (py < 873) return '交誼廳';
  if (px < 545) return py < 1040 ? '廁所前' : '電梯廳';
  return '大廳';
}
export function interiorLight(s) {
  s.add(new THREE.HemisphereLight('#fffaf0', '#9a948a', 1.05));
  const d = new THREE.DirectionalLight('#ffffff', 0.65); d.position.set(10, 20, 14); s.add(d);
}
