/**
 * 商學院一樓內部（室內房間，格式見 docs/interiors.md）。
 *
 * 配置照 photos/floor-plan-1f.jpg（一樓平面圖），材質和細節照其他照片：
 *   - 主要出入口進來是挑高大廳：花崗岩方柱、格子天花板、東邊整面玻璃帷幕、紅地毯
 *   - 大廳西南角是黑色石材舞台，上面有鋼琴和紅色圍繩，後面牆上是白色山脈壁畫
 *   - 大廳往西是長廊：北邊是黑色石材電梯間（3 部電梯、樓層簡介），南邊是中庭景觀窗
 *   - 長廊盡頭是穿堂（公告板、避難方向圖），西邊是便利商店，再往南是用餐區
 *   - 服務台、往二樓的樓梯、會議室、廁所在大廳和長廊北邊
 *   - 地板是灰色、褐色相間的大塊花崗岩方格；一般天花板是白色礦纖板加日光燈
 *
 * 座標：直接用平面圖上的像素量（px, py），用 X()、Z() 換成房間座標（約 16.6 像素 = 1 公尺）。
 * 平面圖的北邊（主要出入口）是 +z，出口在 z = 0；往南（用餐區）是 -z；平面圖的東邊是 -x。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { GRAD, SPH, basic, block, canvasTex, flat, hText, mk, plane, toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';

// 平面圖像素 → 房間公尺
const S = 16.6;
const X = px => (718 - px) / S, Z = py => (222 - py) / S;
const toPx = p => [718 - p.x * S, 222 - p.z * S];

export const CEIL = 3.6;   // 一般天花板
export const HALL = 9;     // 挑高大廳
// 房間範圍（平面圖外框 px 48–810、py 215–895）
export const R = { x0: X(810), x1: X(48), z0: Z(895), z1: Z(215) };
// 主要出入口
export const DOOR = { x: X(720), z: Z(222) };

const WHITE = '#efeee9', CREAM = '#ece3d0', BLACK = '#1d1e22', ALU = '#a3aaaf';
const FONT = '"Noto Sans TC","PingFang TC",sans-serif';

/* ---------- 平面圖小工具 ---------- */
function rc(a, b, c, d) {
  const x0 = Math.min(X(a), X(c)), x1 = Math.max(X(a), X(c)), z0 = Math.min(Z(b), Z(d)), z1 = Math.max(Z(b), Z(d));
  return { x0, x1, z0, z1, x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 };
}
const cube = (r, y0, y1, mat, out) => block(r.x, (y0 + y1) / 2, r.z, r.w, y1 - y0, r.d, mat, out);
const hit = r => boxC(r.x0, r.x1, r.z0, r.z1);
function solid(a, b, c, d, mat = WHITE, y1 = CEIL) { const r = rc(a, b, c, d); cube(r, 0, y1, mat); hit(r); return r; }
// 貼在某個面上的平面：side 是平面圖的方位（S 面朝 -z、N 面朝 +z、E 面朝 -x、W 面朝 +x）
const FACE = { S: [0, -1, Math.PI], N: [0, 1, 0], E: [-1, 0, -Math.PI / 2], W: [1, 0, Math.PI / 2] };
function decal(px, py, side, w, h, y, mat, off = 0.03) {
  const [nx, nz, ry] = FACE[side];
  return plane(w, h, mat, X(px) + nx * off, y, Z(py) + nz * off, 0, ry);
}
// 貼在某個面上的薄方塊（門框、看板）
function slab(px, py, side, w, h, y, t, mat) {
  const [nx, nz] = FACE[side];
  return nz ? block(X(px), y, Z(py) + nz * t / 2, w, h, t, mat) : block(X(px) + nx * t / 2, y, Z(py), t, h, w, mat);
}
const tmap = t => new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });

/* ---------- 材質 ---------- */
// 地板：灰色、褐色相間的大塊花崗岩（每塊約 1.2 公尺），有細細的斑點
function floorMat(w, d) {
  const t = canvasTex(256, 256, (g, W) => {
    const c = ['#8f877f', '#aaa59e'];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = c[(i + j) % 2]; g.fillRect(i * 128, j * 128, 128, 128); }
    for (let k = 0; k < 2600; k++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(40,30,25,.10)'; g.fillRect(Math.random() * W, Math.random() * W, 2, 2); }
    g.strokeStyle = 'rgba(60,55,50,.35)'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128); g.strokeRect(128, 128, 128, 128); g.strokeRect(128, 0, 128, 128); g.strokeRect(0, 128, 128, 128);
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
  }, [rx, ry]);
  return tmap(t);
}
// 黑色亮面石材（電梯間）
const blackMat = new THREE.MeshToonMaterial({ color: BLACK, gradientMap: GRAD });
// 玻璃（不擋鏡頭）
const glassMat = basic({ color: '#d4ebf5', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
// 木棧板（中庭）
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

/* ---------- 玻璃牆：玻璃、鋁框、橫料 ---------- */
function glassLine(x0, z0, x1, z1, y0, y1, trans = [], step = 1.6) {
  const alongX = Math.abs(z1 - z0) < 0.01, L = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, H = y1 - y0;
  const g = plane(L, H, glassMat, cx, (y0 + y1) / 2, cz, 0, alongX ? 0 : Math.PI / 2); g.userData.noOcc = true; g.renderOrder = 3;
  const n = Math.max(1, Math.round(L / step));
  for (let i = 0; i <= n; i++) {
    const f = i / n, x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f;
    block(x, (y0 + y1) / 2, z, 0.09, H, 0.09, ALU);
  }
  [y0 + 0.05, y1 - 0.05, ...trans].forEach(y => block(cx, y, cz, alongX ? L : 0.08, 0.08, alongX ? 0.08 : L, ALU));
}

/* ---------- 家具 ---------- */
// 白色木椅（坐墊綠或黃，照片上的樣子）：先收集位置，最後用 InstancedMesh 一次畫出來
const CHAIRS = [];
const chair = (x, z, ry, cushion) => CHAIRS.push({ x, z, ry, cushion });
const CHAIR_PARTS = [   // [x, y, z, 寬, 高, 深, 顏色（null 是坐墊）]
  [0, 0.22, 0, 0.42, 0.44, 0.42, '#eee9de'], [0, 0.47, 0, 0.46, 0.07, 0.46, null], [0, 0.78, -0.2, 0.46, 0.08, 0.06, '#eee9de'],
  [-0.2, 0.66, -0.2, 0.05, 0.36, 0.05, '#eee9de'], [0.2, 0.66, -0.2, 0.05, 0.36, 0.05, '#eee9de'],
];
function flushChairs() {
  const geo = new THREE.BoxGeometry(1, 1, 1), m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  CHAIR_PARTS.forEach(([px, py, pz, sx, sy, sz, col]) => {
    const mesh = new THREE.InstancedMesh(geo, toon('#ffffff'), CHAIRS.length);
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
function table(x, z, w = 0.8, d = 0.8) {
  block(x, 0.74, z, w, 0.05, d, '#f7f6f2', 0.012);
  block(x, 0.37, z, 0.12, 0.72, 0.12, '#9aa0a6');
  block(x, 0.03, z, 0.5, 0.05, 0.5, '#9aa0a6');
}
// 樹（中庭和戶外）
function tree(x, z, s = 1) {
  mk(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 2.6 * s, 8), toon('#7a5b40'), x, 1.3 * s, z, { out: 0.02 });
  [[0, 3.2, 0, 1.5], [0.7, 2.7, 0.3, 1.0], [-0.6, 2.8, -0.3, 1.1]].forEach(([dx, y, dz, r]) => mk(SPH, toon('#5f9e4a'), x + dx * s, y * s, z + dz * s, { out: 0.03 }).scale.setScalar(r * s));
}
// 野餐桌（中庭）
function picnic(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  block(0, 0.74, 0, 2.2, 0.08, 0.8, '#b0815a', 0.012, g);
  [-0.65, 0.65].forEach(dz => block(0, 0.44, dz, 2.2, 0.06, 0.3, '#a57650', 0, g));
  [-0.85, 0.85].forEach(dx => block(dx, 0.37, 0, 0.1, 0.74, 1.5, '#8b6444', 0, g));
}
// 文字看板
const sign = (txt, col, w, h, font = `900 64px ${FONT}`) => basic({ map: hText(txt, col, font, w, h, Math.min(60, w / (txt.length + 1))), transparent: true });

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
// 一樓平面配置暨避難方向圖：把平面圖簡化畫上去，紅點是「你在這裡」
function evacTex() {
  return canvasTex(384, 288, g => {
    g.fillStyle = '#f7f7f4'; g.fillRect(0, 0, 384, 288);
    g.fillStyle = '#2d4f9e'; g.fillRect(0, 0, 384, 34);
    g.fillStyle = '#fff'; g.font = `700 17px ${FONT}`; g.fillText('一樓平面配置暨緊急避難方向圖', 12, 23);
    const k = 0.4, ox = 20, oy = -40, R0 = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(ox + a * k, oy + b * k, (c - a) * k, (d - b) * k); };
    R0(48, 215, 810, 895, '#e3e6ea');
    R0(360, 582, 810, 895, '#cfe4c6');
    [[240, 215, 548, 352], [240, 352, 310, 470], [345, 412, 535, 470], [535, 412, 630, 470], [548, 215, 630, 412], [48, 460, 235, 705], [290, 580, 360, 705]].forEach(r => R0(...r, '#9aa3ad'));
    g.strokeStyle = '#2a8f4a'; g.lineWidth = 4; g.beginPath(); g.moveTo(ox + 330 * k, oy + 640 * k); g.lineTo(ox + 330 * k, oy + 525 * k); g.lineTo(ox + 715 * k, oy + 525 * k); g.lineTo(ox + 715 * k, oy + 230 * k); g.stroke();
    g.fillStyle = '#d8342c'; g.beginPath(); g.arc(ox + 325 * k, oy + 570 * k, 7, 0, 7); g.fill();
    g.font = `700 13px ${FONT}`; g.fillText('你在這裡', ox + 340 * k, oy + 600 * k);
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
// 舞台後面的白色山脈壁畫
function muralTex() {
  return canvasTex(512, 512, g => {
    g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, 512, 512);
    const ridge = (y0, amp, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, 512); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y0 - Math.abs(Math.sin(x * 0.013 + y0)) * amp - Math.sin(x * 0.05) * amp * 0.15); g.lineTo(512, 512); g.fill(); };
    ridge(330, 150, '#e1ddd3'); ridge(400, 110, '#d1ccc1'); ridge(460, 60, '#c3beb3');
    g.strokeStyle = '#b8b2a6'; g.lineWidth = 2; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(80 + k * 70, 300); g.lineTo(110 + k * 70, 420); g.stroke(); }
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
// 戶外的窗景（用餐區的窗）
function outsideTex(w) {
  return canvasTex(256, 128, g => {
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#eaf5fb'); gr.addColorStop(1, '#cfe6d5'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    g.fillStyle = 'rgba(80,140,80,.55)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(i * 32 + 10, 96, 22, 0, 7); g.fill(); }
    g.fillStyle = '#ffffff'; for (let x = 0; x <= 256; x += 64) g.fillRect(x - 3, 0, 6, 128); g.fillRect(0, 60, 256, 5); g.fillRect(0, 0, 256, 5); g.fillRect(0, 123, 256, 5);
  }, [w / 4, 1]);
}

/* ---------- 建模 ---------- */
export function buildInterior() {
  /* 地板（室內兩塊）、中庭木棧板、外面的地面 */
  flat(180, 180, '#bab4a8', 15, -0.04, -20).userData.noOcc = true;
  flat(60, 60, '#8fbf6a', -38, -0.03, -6);                      // 東邊的草地
  flat(60, 30, '#8fbf6a', 15, -0.03, 18);                       // 北邊的草地
  { const a = rc(48, 215, 810, 580), b = rc(48, 580, 360, 895), c = rc(360, 580, 810, 895);
    flat(a.w, a.d, floorMat(a.w, a.d), a.x, 0.01, a.z);
    flat(b.w, b.d, floorMat(b.w, b.d), b.x, 0.01, b.z);
    flat(c.w, c.d, deckMat(c.w, c.d), c.x, 0.012, c.z); }

  /* 天花板：一般區 3.6 公尺（方塊會讓鏡頭不穿出去），大廳 9 公尺 */
  [[48, 215, 630, 580], [48, 580, 360, 895]].forEach(([a, b, c, d]) => {
    const r = rc(a, b, c, d); cube(r, CEIL, CEIL + 0.3, '#f2f1ec');
    plane(r.w, r.d, ceilMat(r.w, r.d), r.x, CEIL - 0.005, r.z, Math.PI / 2);
  });
  { const r = rc(630, 215, 805, 580); cube(r, HALL, HALL + 0.4, '#efe7d6');
    plane(r.w, r.d, cofferMat(r.w, r.d), r.x, HALL - 0.005, r.z, Math.PI / 2);
    // 格子天花板的大樑
    for (let x = r.x0 + 1.2; x < r.x1; x += 2.4) block(x, HALL - 0.3, r.z, 0.3, 0.6, r.d, '#e6dcc6').userData.noOcc = true;
    for (let z = r.z0 + 1.2; z < r.z1; z += 2.4) block(r.x, HALL - 0.3, z, r.w, 0.6, 0.3, '#e6dcc6').userData.noOcc = true; }

  /* 外牆：北、西、南（用餐區） */
  solid(48, 211, 630, 217, CREAM);
  solid(44, 215, 50, 895, CREAM);
  solid(48, 893, 357, 899, CREAM);
  // 用餐區的窗（南牆、西牆）
  { const a = rc(70, 893, 340, 893); decal(205, 893, 'N', a.w, 1.6, 1.75, basic({ map: outsideTex(a.w) }), 0.02);
    const b = rc(50, 720, 50, 880); decal(50, 800, 'W', b.d, 1.6, 1.75, basic({ map: outsideTex(b.d) }), 0.02); }

  /* 西北角（平面圖上空白的部分）與北邊的會議室 */
  solid(48, 215, 240, 460, CREAM);
  solid(240, 215, 548, 352, WHITE);
  [300, 395, 485].forEach((px, i) => {
    slab(px, 352, 'S', 1.0, 2.2, 1.1, 0.06, '#8a6448');
    decal(px + 26, 352, 'S', 0.5, 0.18, 1.6, sign(['研討室 101', '研討室 102', '研討室 103'][i], '#2a2c35', 256, 64, `700 40px ${FONT}`), 0.08);
  });
  // 廁所（門開在東邊的小通道）
  solid(240, 352, 310, 470, WHITE);
  [[385, '男廁', '#3f78c8'], [440, '女廁', '#d8608c']].forEach(([py, t, col]) => {
    slab(310, py, 'E', 1.0, 2.2, 1.1, 0.06, '#9aa3ab');
    block(X(310) - 0.08, 2.5, Z(py), 0.04, 0.32, 0.7, col);
    decal(310, py, 'E', 0.62, 0.26, 2.5, sign(t, '#ffffff', 192, 64, `900 44px ${FONT}`), 0.11);
  });

  /* 電梯間（黑色石材，3 部電梯朝長廊）與服務台 */
  solid(345, 412, 535, 470, blackMat);
  [405, 455, 505].forEach(px => {
    slab(px, 470, 'S', 1.5, 2.5, 1.25, 0.08, '#b9bec2');
    slab(px, 470, 'S', 1.2, 2.2, 1.1, 0.1, '#c2c7cb');
    block(X(px), 1.1, Z(470) - 0.12, 0.02, 2.2, 0.02, '#8d9296');
    block(X(px), 2.75, Z(470) - 0.06, 0.5, 0.2, 0.04, '#111');
    block(X(px) - 1.0, 1.15, Z(470) - 0.06, 0.12, 0.25, 0.04, '#c9ced3');
  });
  decal(372, 470, 'S', 0.95, 1.4, 1.65, basic({ map: directoryTex() }), 0.05);
  decal(372, 470, 'S', 1.0, 0.16, 2.48, sign('樓層簡介', '#ffffff', 256, 48, `700 32px ${FONT}`), 0.06);
  // 服務台：後面是牆，前面是 L 形櫃檯
  solid(535, 412, 630, 438, graniteMat(3, 2));
  { const r = rc(540, 442, 630, 468); cube(r, 0, 1.05, '#7d5a3e', 0.02); cube({ ...r, w: r.w + 0.1, d: r.d + 0.1 }, 1.05, 1.11, '#d9d2c4');
    hit(rc(535, 438, 630, 470));
    decal(582, 438, 'S', 3.2, 0.7, 2.55, sign('服務台 Information', '#3a3530', 640, 120, `700 58px ${FONT}`), 0.05);
    mk(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 10), toon('#2a2c35'), X(585), 0.25, Z(452), {}); }

  /* 北邊的小通道（電梯間後面）與往二樓的樓梯 */
  solid(622, 215, 632, 412, graniteMat(2, 5), HALL);            // 樓梯和大廳之間的牆（到大廳天花板）
  solid(548, 211, 622, 240, WHITE);                             // 樓梯上面的盡頭
  { const x0 = X(622), x1 = X(548), zb = Z(385);
    for (let k = 1; k <= 7; k++) block((x0 + x1) / 2, 0.085 * k, zb + 0.32 * (k - 0.5), x1 - x0, 0.17 * k, 0.32, k % 2 ? '#a29c94' : '#b2ada6');
    const zl = zb + 0.32 * 7, ze = Z(240);
    block((x0 + x1) / 2, 0.6, (zl + ze) / 2, x1 - x0, 1.19, ze - zl, '#a29c94');
    boxC(x1 - 0.02, x1 + 0.25, zb, Z(352) + 0.3);               // 樓梯西側的扶手
    block(x1 + 0.05, 1.0, (zb + ze) / 2, 0.06, 0.06, ze - zb, ALU);
    decal(585, 240, 'S', 2.2, 0.5, 2.6, sign('往二樓', '#2a2c35', 320, 80, `900 56px ${FONT}`), 0.05); }

  /* 挑高大廳 */
  // 大廳上方的牆（服務台、長廊開口上面）與花崗岩大樑
  { const r = rc(628, 412, 634, 580); cube(r, CEIL, HALL, graniteMat(1, 4)); }
  block(X(631), CEIL + 0.4, Z(525), 0.8, 0.8, rc(0, 470, 0, 580).d, graniteMat(4, 1)).userData.noOcc = true;
  // 北面：玻璃帷幕和主要出入口（紅地毯）
  glassLine(X(632), Z(215), X(805), Z(215), 0, HALL, [2.6, 6]);
  boxC(X(805), X(632), Z(215) - 0.1, Z(215) + 0.3);
  { const r = rc(690, 217, 750, 265); flat(r.w, r.d, '#9c2f3c', r.x, 0.02, r.z); }
  slab(720, 215, 'S', 3.4, 0.25, 2.75, 0.2, '#6f767c');
  // 東面：玻璃帷幕（到大廳天花板），中間有一組門
  glassLine(X(805), Z(215), X(805), Z(580), 0, HALL, [2.6, 6]);
  boxC(X(805) - 0.3, X(805) + 0.1, Z(580), Z(215));
  slab(805, 405, 'W', 3.0, 0.25, 2.75, 0.2, '#6f767c');
  decal(805, 405, 'W', 0.5, 0.18, 3.1, sign('出口', '#ffffff', 128, 48, `700 34px ${FONT}`), 0.25);
  block(X(805) + 0.25, 3.1, Z(405), 0.04, 0.2, 0.52, '#2a8f4a');
  // 南面：西段是壁畫牆，東段是通往中庭的玻璃門
  solid(630, 578, 682, 584, graniteMat(2, 6), HALL);
  decal(656, 578, 'N', rc(630, 0, 682, 0).w - 0.4, 5.2, 3.4, basic({ map: muralTex() }), 0.04);
  glassLine(X(682), Z(581), X(805), Z(581), 0, CEIL, [2.5]);
  boxC(X(805), X(682), Z(581) - 0.15, Z(581) + 0.15);
  { const r = rc(682, 578, 805, 584); cube(r, CEIL, HALL, graniteMat(5, 3)); }
  slab(728, 581, 'N', 2.6, 0.2, 2.5, 0.12, '#6f767c');
  // 兩根花崗岩方柱
  [[700, 330], [700, 455]].forEach(([px, py]) => { const x = X(px), z = Z(py); block(x, HALL / 2, z, 1.1, HALL, 1.1, graniteMat(1, 6)); boxC(x - 0.55, x + 0.55, z - 0.55, z + 0.55); });
  // 黑色石材舞台、鋼琴、紅色圍繩（照片上同學坐在舞台台階上）
  { const st = STAGE;
    block(st.x, 0.11, st.z, st.w, 0.22, st.d, '#3a3b3f', 0.02);
    block(st.x + 0.225, 0.33, st.z - 0.225, st.w - 0.45, 0.22, st.d - 0.45, '#2c2d31', 0.02);
    const px = st.x + 0.6, pz = st.z - 0.9, y = 0.44, pg = new THREE.Group(); pg.position.set(px, y, pz); pg.rotation.y = -0.5; scene.add(pg);
    block(0, 0.85, 0, 1.4, 0.32, 1.9, '#111114', 0.02, pg);
    const lid = block(0.25, 1.35, 0.1, 1.2, 0.04, 1.7, '#18181c', 0, pg); lid.rotation.z = 0.55;
    block(0, 0.92, 0.98, 1.3, 0.06, 0.22, '#f4f4f0', 0, pg); block(0, 0.95, 1.0, 1.25, 0.03, 0.12, '#222', 0, pg);
    [[-0.55, -0.7], [0.55, -0.7], [0, 0.75]].forEach(([dx, dz]) => block(dx, 0.35, dz, 0.1, 0.7, 0.1, '#111114', 0, pg));
    block(0, 0.25, 1.45, 0.9, 0.5, 0.35, '#111114', 0, pg);
    boxC(px - 1.3, px + 1.3, pz - 1.3, pz + 1.3);
    // 紅色圍繩
    const posts = [[px - 1.5, pz + 1.4], [px + 1.3, pz + 1.4], [px - 1.5, pz - 1.0]];
    posts.forEach(([x, z]) => { mk(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 8), toon('#c9a24a'), x, y + 0.48, z, {}); mk(new THREE.CylinderGeometry(0.18, 0.2, 0.05, 12), toon('#c9a24a'), x, y + 0.03, z, {}); });
    [[0, 1], [0, 2]].forEach(([a, b]) => { const [x0, z0] = posts[a], [x1, z1] = posts[b], L = Math.hypot(x1 - x0, z1 - z0);
      const rope = mk(new THREE.CylinderGeometry(0.03, 0.03, L, 6), toon('#b3202c'), (x0 + x1) / 2, y + 0.82, (z0 + z1) / 2, {}); rope.rotation.z = Math.PI / 2; rope.rotation.y = -Math.atan2(z1 - z0, x1 - x0); }); }
  // 盆栽
  [[792, 235], [792, 560], [645, 235]].forEach(([px, py]) => { mk(new THREE.CylinderGeometry(0.35, 0.28, 0.7, 10), toon('#8d8a84'), X(px), 0.35, Z(py), { out: 0.02 }); mk(SPH, toon('#4f9a48'), X(px), 1.1, Z(py), { out: 0.03 }).scale.setScalar(0.6); boxC(X(px) - 0.4, X(px) + 0.4, Z(py) - 0.4, Z(py) + 0.4); });

  /* 長廊：南邊是中庭景觀窗，窗邊有兩根花崗岩柱 */
  glassLine(X(360), Z(581), X(630), Z(581), 0, CEIL, [2.5], 1.4);
  boxC(X(630), X(360), Z(581) - 0.15, Z(581) + 0.15);
  [[470, 566], [580, 566]].forEach(([px, py]) => { const x = X(px), z = Z(py); block(x, CEIL / 2, z, 0.9, CEIL, 0.9, graniteMat(1, 3)); boxC(x - 0.45, x + 0.45, z - 0.45, z + 0.45); });

  /* 穿堂：樓梯間（公告板、避難方向圖） */
  solid(290, 580, 360, 705, blackMat);
  slab(325, 580, 'N', 1.0, 2.1, 1.05, 0.06, '#5a5f66');
  decal(325, 580, 'N', 0.5, 0.18, 2.4, sign('樓梯', '#ffffff', 128, 48, `700 34px ${FONT}`), 0.08);
  decal(290, 645, 'W', 3.6, 1.15, 1.55, basic({ map: corkTex() }), 0.05);
  decal(290, 645, 'W', 1.6, 0.28, 2.38, sign('公告板', '#ffffff', 256, 48, `900 36px ${FONT}`), 0.05);
  slab(290, 645, 'W', 3.8, 1.35, 1.55, 0.04, '#6e5038');
  decal(275, 470, 'S', 1.0, 0.75, 1.6, basic({ map: evacTex() }), 0.05);
  // 回收桶
  [['#2f6fd0', 0], ['#4fae5a', 0.55], ['#f0c94a', 1.1]].forEach(([c, d]) => { block(X(290) + 0.35, 0.45, Z(700) + 0.4 + d, 0.5, 0.9, 0.5, c, 0.02); });
  boxC(X(290), X(290) + 0.65, Z(700) + 0.1, Z(700) + 1.9);

  /* 便利商店（只做店面，門口有貨架、紙箱、塑膠籃） */
  solid(48, 460, 235, 705, CREAM);
  { const r = rc(235, 470, 235, 700), L = r.d;
    decal(235, 585, 'E', L - 0.4, 2.2, 1.25, basic({ map: shelfTex(L) }), 0.04);
    for (let k = 0; k <= 8; k++) block(X(235) - 0.06, 1.25, r.z0 + 0.2 + (L - 0.4) * k / 8, 0.08, 2.4, 0.08, ALU);
    slab(235, 532, 'E', 1.8, 2.3, 1.15, 0.08, '#6c757c');
    decal(235, 532, 'E', 1.6, 2.1, 1.1, glassMat, 0.1);
    slab(235, 585, 'E', L, 0.8, 3.0, 0.25, '#1f8d55');
    decal(235, 585, 'E', 4.6, 0.62, 3.0, sign('便利商店', '#ffffff', 640, 100, `900 72px ${FONT}`), 0.27);
    decal(235, 655, 'E', 1.2, 0.5, 3.0, sign('24H', '#ffe27a', 192, 80, `900 60px ${FONT}`), 0.27); }
  { const r = rc(55, 705, 235, 705);
    decal(145, 705, 'S', r.w - 1, 2.2, 1.25, basic({ map: shelfTex(r.w) }), 0.04);
    slab(145, 705, 'S', r.w, 0.8, 3.0, 0.25, '#1f8d55');
    decal(145, 705, 'S', 4.6, 0.62, 3.0, sign('便利商店', '#ffffff', 640, 100, `900 72px ${FONT}`), 0.27); }
  // 店門口：紙箱、紅色塑膠籃、小心地滑牌、自助機台
  { const x = X(235) - 0.5;
    [[0, 0.3, '#c6a36e'], [0, 0.9, '#c6a36e'], [0, 1.4, '#b82f3a']].forEach(([dz, y, c]) => block(x, y, Z(600) + dz, 0.6, c === '#b82f3a' ? 0.4 : 0.58, 0.8, c, 0.02));
    block(x, 0.25, Z(640), 0.6, 0.5, 0.6, '#b82f3a', 0.02); block(x, 0.75, Z(640), 0.6, 0.5, 0.6, '#b82f3a', 0.02);
    boxC(x - 0.4, x + 0.4, Z(650), Z(590));
    const ws = mk(new THREE.ConeGeometry(0.3, 0.9, 4), toon('#f2c230'), X(235) - 0.6, 0.45, Z(560), { out: 0.02 }); ws.rotation.y = Math.PI / 4;
    block(X(235) - 0.45, 0.85, Z(492), 0.55, 1.7, 0.7, '#e9ecef', 0.02); block(X(235) - 0.73, 1.2, Z(492), 0.02, 0.45, 0.5, '#2f6fd0');
    boxC(X(235) - 0.75, X(235), Z(492) - 0.4, Z(492) + 0.4); }

  /* 用餐區：左邊六張方桌（四張椅子），右邊四張長桌 */
  { const cush = ['#5fb59a', '#f0c94a'];
    [[95, 750], [170, 750], [95, 810], [170, 810], [95, 865], [170, 865]].forEach(([px, py], i) => {
      const x = X(px), z = Z(py); table(x, z);
      [[0, 0.62, Math.PI], [0, -0.62, 0], [0.62, 0, -Math.PI / 2], [-0.62, 0, Math.PI / 2]].forEach(([dx, dz, ry], j) => chair(x + dx, z + dz, ry, cush[(i + j) % 2]));
      boxC(x - 0.85, x + 0.85, z - 0.85, z + 0.85);
    });
    [[262, 770], [325, 770], [262, 840], [325, 840]].forEach(([px, py], i) => {
      const x = X(px), z = Z(py); table(x, z, 0.8, 1.5);
      [-0.38, 0.38].forEach((dz, j) => { chair(x + 0.62, z + dz, -Math.PI / 2, cush[(i + j) % 2]); chair(x - 0.62, z + dz, Math.PI / 2, cush[(i + j + 1) % 2]); });
      boxC(x - 0.85, x + 0.85, z - 0.95, z + 0.95);
    }); }
  flushChairs();
  // 東邊對中庭的景觀窗
  glassLine(X(356), Z(705), X(356), Z(893), 0, CEIL, [2.5], 1.5);
  boxC(X(356) - 0.15, X(356) + 0.15, Z(893), Z(705));

  /* 中庭（從長廊、大廳、用餐區的玻璃看出去） */
  { const c = rc(360, 582, 805, 895);
    // 四周的大樓外牆
    plane(c.w + 6, 15, facadeMat(c.w + 6, 15), c.x - 3, 7.5, c.z0 - 0.6, 0, 0);
    plane(c.d + 2, 15, facadeMat(c.d + 2, 15), c.x0 - 2.5, 7.5, c.z - 0.5, 0, Math.PI / 2);
    plane(c.w, 15 - CEIL, facadeMat(c.w, 15 - CEIL), c.x, (15 + CEIL) / 2, c.z1 - 0.18, 0, Math.PI);
    plane(c.d, 15 - CEIL, facadeMat(c.d, 15 - CEIL), X(356) - 0.18, (15 + CEIL) / 2, c.z, 0, -Math.PI / 2);
    [[450, 680, 0.2], [575, 700, -0.15], [500, 790, 0.1], [650, 820, 0]].forEach(([px, py, ry]) => picnic(X(px), Z(py), ry));
    [[720, 700], [420, 860], [760, 860]].forEach(([px, py]) => tree(X(px), Z(py), 1.15));
    // 窗邊的花台
    [[380, 600, 15], [700, 600, 5]].forEach(([px, py, n]) => { block(X(px) - n / 2, 0.3, Z(py), n, 0.6, 0.8, '#b9a68c', 0.02); for (let k = 0; k < n; k += 1.2) mk(SPH, toon('#5f9e4a'), X(px) - k - 0.4, 0.75, Z(py), { out: 0.02 }).scale.setScalar(0.45); });
    // 自動販賣機
    block(X(380), 0.95, Z(860), 1.0, 1.9, 0.8, '#d8342c', 0.02); block(X(380), 1.15, Z(860) + 0.41, 0.8, 1.0, 0.02, '#f4f4f0'); }
  // 戶外（大廳東邊、北邊）的樹
  [[-12, -3], [-14, -11], [-11, -18], [3, 8], [-5, 10], [12, 7], [22, 8]].forEach(([x, z]) => tree(x, z, 1.3));
}

// 舞台位置（大廳西南角）
const STAGE = rc(632, 505, 700, 578);

/* ---------- 房間設定用的規則 ---------- */
export function interiorHeight(x, z) {
  const st = STAGE;
  if (x > st.x0 && x < st.x1 && z > st.z0 && z < st.z1) return (x > st.x0 + 0.45 && z < st.z1 - 0.45) ? 0.44 : 0.22;
  // 往二樓的樓梯（七階，上去是平台）
  const zb = Z(385);
  if (x > X(622) && x < X(548) && z > zb && z < Z(240)) return 0.17 * Math.min(7, Math.ceil((z - zb) / 0.32));
  return 0;
}
export function interiorZone(p) {
  const [px, py] = toPx(p);
  if (px > 630) return '挑高大廳';
  if (py < 412) return px > 545 ? '樓梯' : '電梯間後面';
  if (py < 580 && px > 360) return '長廊';
  if (py > 705) return '用餐區';
  return '穿堂';
}
export function interiorLight(s) {
  s.add(new THREE.HemisphereLight('#fffaf0', '#9a948a', 1.05));
  const d = new THREE.DirectionalLight('#ffffff', 0.65); d.position.set(-10, 20, -14); s.add(d);
}
