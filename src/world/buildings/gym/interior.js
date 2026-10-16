/**
 * 體育館內部（室內房間，格式見 docs/interiors.md）。依 photos/ 的實景照片與平面示意圖：
 * - 從大門進來是一樓大廳：木紋條紋地板、左右兩座上 2F 看台的樓梯（踏階貼「NCCU GRIFFINS」「雄起來打」），
 *   中間是電子看板，兩側是獎盃櫃，右邊有身高牆，左邊是證件查驗桌。大廳天花板就是南側看台的底面，斜斜的大樑
 * - 大廳左右兩個柵欄門通往一樓球場：楓木地板、深藍色場邊和防撞軟墊、藍色桁架籃架
 * - 球場三面是橘、灰、白混排的看台，上面是一片片錯落的木質吸音板，北面牆掛著冠軍錦旗和 NCCU 布條
 *
 * 房間座標從原點算：出口在 +z（z = 12），越往 -z 越裡面。球場長邊沿 x，籃框在東西兩端。
 * 打球的人、籃球、投籃挑戰的規則在 systems/gym。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { GRAD, basic, block, canvasTex, flat, hText, mk, plane, toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';

// 大廳與球場的範圍
export const R = { x0: -16.5, x1: 16.5, z0: -25, z1: 12, lobbyX: 12, wallZ: -3 };
// 球場（FIBA 28 × 15 公尺），中心在 z = -13.5
export const COURT = { x0: -14, x1: 14, z0: -21, z1: -6, cz: -13.5 };
// 東西兩個籃框（離底線 1.575 公尺、高 3.05 公尺）
export const RIMS = [{ x: -12.425, y: 3.05, z: COURT.cz }, { x: 12.425, y: 3.05, z: COURT.cz }];
// 大廳到球場的兩個柵欄門（x 範圍）
const GATES = [[-11.4, -8.2], [8.2, 11.4]];
// 大廳往 2F 看台的兩座樓梯（中心 x、底端 z）
const STAIRS = [-5.2, 5.2], STAIR = { w: 2.2, z0: 4.8, n: 12, run: 0.62, rise: 0.3 };

const NAVY = '#2b3478', PAD = '#2f3a86', STEEL = '#5f86b8', CONCRETE = '#b9b5ad', SEAT_COLORS = ['#ee7a2c', '#ee7a2c', '#f08d47', '#ee7a2c', '#e9e6df', '#e9e6df', '#8d919b'];

/* ---------- 材質 ---------- */
// 球場地板：楓木條、籃球線、羽球（青綠）與排球（紅）的線、中間 NCCU 字樣
function courtMat() {
  const S = 40, W = 28 * S, H = 15 * S;
  const t = canvasTex(W, H, g => {
    let seed = 3; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let y = 0; y < H; y += 6) {
      let x = -rnd() * 120;
      while (x < W) { const len = 60 + rnd() * 110, l = (rnd() - 0.5) * 10; g.fillStyle = `hsl(${33 + (rnd() - 0.5) * 5},${62 + l}%,${64 + l}%)`; g.fillRect(x, y, len, 6); g.fillStyle = 'rgba(120,70,30,.18)'; g.fillRect(x, y, 1.5, 6); x += len; }
    }
    // 羽球場、排球場
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(40,160,160,.85)';
    [[2.8, 1.6], [8.2, 1.6], [2.8, 8.2], [8.2, 8.2], [14.2, 1.6], [19.6, 1.6], [14.2, 8.2], [19.6, 8.2]].forEach(([x, y]) => g.strokeRect(x * S, y * S, 5.2 * S, 5.2 * S));
    g.strokeStyle = 'rgba(205,50,40,.85)'; g.strokeRect(5 * S, 3 * S, 18 * S, 9 * S); g.beginPath(); g.moveTo(14 * S, 3 * S); g.lineTo(14 * S, 12 * S); g.stroke();
    // 籃球線
    g.strokeStyle = '#ffffff'; g.lineWidth = 4;
    g.strokeRect(2, 2, W - 4, H - 4);
    g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
    g.beginPath(); g.arc(W / 2, H / 2, 1.8 * S, 0, Math.PI * 2); g.stroke();
    const cy = H / 2, r3 = 6.75 * S, bx = 1.575 * S, a = Math.asin((7.5 - 0.9) / 6.75);
    [[0, 1], [W, -1]].forEach(([ex, s]) => {
      g.fillStyle = 'rgba(43,52,120,.55)'; g.fillRect(s > 0 ? 0 : W - 5.8 * S, cy - 2.45 * S, 5.8 * S, 4.9 * S);
      g.strokeRect(s > 0 ? 0 : W - 5.8 * S, cy - 2.45 * S, 5.8 * S, 4.9 * S);
      g.beginPath(); g.arc(ex + s * 5.8 * S, cy, 1.8 * S, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI * 1.5); g.stroke();
      const cx = ex + s * bx;
      g.beginPath(); g.moveTo(ex, 0.9 * S); g.lineTo(cx + s * Math.cos(a) * r3, 0.9 * S);
      if (s > 0) g.arc(cx, cy, r3, -a, a); else g.arc(cx, cy, r3, Math.PI + a, Math.PI - a, true);
      g.lineTo(ex, H - 0.9 * S); g.stroke();
    });
    g.fillStyle = 'rgba(43,52,120,.9)'; g.font = '900 120px "M PLUS Rounded 1c","Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('NCCU', W / 2, H / 2 + 6);
  });
  t.anisotropy = 8;
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}
// 大廳地板：照片上淺色、深色木紋長條交錯
function lobbyFloorMat(rx, ry) {
  const t = canvasTex(64, 128, (g, w, h) => {
    [['#e2c79a', 0], ['#cfae7c', 24], ['#e8d2ab', 52], ['#c9a571', 76], ['#dcc092', 100]].forEach(([c, y]) => { g.fillStyle = c; g.fillRect(0, y, w, 28); });
    g.fillStyle = 'rgba(120,80,40,.12)'; for (let i = 0; i < 24; i++) g.fillRect(Math.random() * w, Math.random() * h, 18, 1);
  }, [rx, ry]);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}
// 身高牆：深藍底、刻度、NCCU
function heightWallMat() {
  const t = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#25285e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.font = '700 14px Arial,sans-serif';
    for (let cm = 0; cm <= 300; cm += 5) { const y = h - 8 - cm * (h - 30) / 300; g.fillRect(70, y, cm % 10 ? 10 : 20, 2); if (cm % 20 === 0) g.fillText(String(cm), 96, y + 5); }
    g.fillRect(68, 18, 2, h - 26);
    g.font = '900 34px "M PLUS Rounded 1c",sans-serif'; g.fillText('NCCU', 140, 50);
    g.save(); g.translate(30, h / 2); g.rotate(-Math.PI / 2); g.font = '900 22px Arial,sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)'; g.textAlign = 'center'; g.fillText('MEASURE UP', 0, 0); g.restore();
  });
  return basic({ map: t });
}
// 電子看板
function screenMat() {
  const t = canvasTex(320, 180, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a3fa8'); gr.addColorStop(1, '#16206a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.font = '900 64px "M PLUS Rounded 1c",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NCCU', w / 2, h / 2 - 18);
    g.font = '900 30px "Noto Sans TC",sans-serif'; g.fillStyle = '#ffd25e'; g.fillText('雄起來打', w / 2, h / 2 + 42);
  });
  return basic({ map: t });
}
// 布條、錦旗
function bannerMat(title, sub, bg) {
  const t = canvasTex(256, 384, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8c547'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 64px "M PLUS Rounded 1c","Noto Sans TC",sans-serif'; g.fillText(title, w / 2, h / 2 - 20);
    g.font = '700 28px "Noto Sans TC",sans-serif'; g.fillStyle = '#e8c547'; g.fillText(sub, w / 2, h / 2 + 50);
  });
  return basic({ map: t, side: THREE.DoubleSide });
}
function pennantMat(year) {
  const t = canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = '#1b1d2e'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h - 40); g.lineTo(w / 2, h); g.lineTo(0, h - 40); g.closePath(); g.fill();
    g.fillStyle = '#e8c547'; g.textAlign = 'center'; g.font = '900 26px "M PLUS Rounded 1c",sans-serif'; g.fillText('CHAMPION', w / 2, 60); g.font = '900 34px Arial,sans-serif'; g.fillText(year, w / 2, 110);
  });
  return basic({ map: t, transparent: true, side: THREE.DoubleSide });
}
function textPlate(txt, w, h, col, bg) {
  const t = hText(txt, col, '900 72px "M PLUS Rounded 1c","Noto Sans TC",sans-serif', 64 * txt.length + 80, 120, 40);
  const g = new THREE.Group();
  if (bg) block(0, 0, -0.02, w, h, 0.04, bg, 0, g);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.8), basic({ map: t, transparent: true })); p.position.z = 0.01; g.add(p);
  scene.add(g); return g;
}

/* ---------- 看台：一排一排的階梯、椅子用 InstancedMesh ---------- */
const seatPan = new THREE.BoxGeometry(0.44, 0.08, 0.4), seatBack = new THREE.BoxGeometry(0.44, 0.42, 0.07);
const seatMat = toon('#ffffff');
/**
 * side：'n' 北、'e' 東、'w' 西、's' 南（在大廳上面）
 * rows：排數；y0：第一排高度；front：第一排前緣（北、南是 z，東、西是 x）；a、b：沿著看台方向的範圍
 */
function stand(side, rows, y0, front, a, b, seats, holes = []) {
  const dir = side === 'n' ? -1 : side === 's' ? 1 : side === 'e' ? 1 : -1, alongX = side === 'n' || side === 's';
  const len = b - a, mid = (a + b) / 2, D = 0.85, RISE = 0.42;
  for (let k = 0; k < rows; k++) {
    const y = y0 + k * RISE, c = front + dir * (k + 0.5) * D;
    // 南側看台蓋在大廳上面：只做一片樓板，下面就是大廳斜斜的天花板；其他三面做實心的階梯
    const h = side === 's' ? 0.32 : y, cy = side === 's' ? y - 0.16 : y / 2;
    // holes：南側看台在樓梯正上方前幾排留洞口，樓梯才上得去
    const cut = k < 7 ? holes : [];
    const segs = []; let from = a;
    cut.forEach(([h0, h1]) => { segs.push([from, h0]); from = h1; }); segs.push([from, b]);
    segs.forEach(([s0, s1]) => {
      if (alongX) block((s0 + s1) / 2, cy, c, s1 - s0, h, D + 0.01, k % 2 ? '#a9a59d' : CONCRETE);
      else block(c, cy, (s0 + s1) / 2, D + 0.01, h, s1 - s0, k % 2 ? '#a9a59d' : CONCRETE);
    });
    for (let s = a + 0.45; s < b - 0.3; s += 0.56) {
      const n = Math.round((s - a) / 0.56); if (n % 14 === 13) continue;   // 每十四個位子留一條走道
      if (cut.some(([h0, h1]) => s > h0 - 0.3 && s < h1 + 0.3)) continue;
      seats.push({ alongX, s, c: c + dir * 0.06, y, dir, col: SEAT_COLORS[(n * 7 + k * 3 + (side.charCodeAt(0) % 5)) % SEAT_COLORS.length] });
    }
  }
}
function flushSeats(seats) {
  const n = seats.length, pan = new THREE.InstancedMesh(seatPan, seatMat, n), back = new THREE.InstancedMesh(seatBack, seatMat, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), col = new THREE.Color();
  seats.forEach((st, i) => {
    // 椅子面向球場
    e.set(0, st.alongX ? (st.dir < 0 ? 0 : Math.PI) : (st.dir > 0 ? -Math.PI / 2 : Math.PI / 2), 0); q.setFromEuler(e);
    const x = st.alongX ? st.s : st.c, z = st.alongX ? st.c : st.s;
    m.compose(p.set(x, st.y + 0.36, z), q, one); pan.setMatrixAt(i, m);
    const bx = st.alongX ? 0 : st.dir * 0.2, bz = st.alongX ? st.dir * 0.2 : 0;
    m.compose(p.set(x + bx, st.y + 0.6, z + bz), q, one); back.setMatrixAt(i, m);
    col.set(st.col); pan.setColorAt(i, col); back.setColorAt(i, col);
  });
  [pan, back].forEach(o => { o.userData.noOcc = true; scene.add(o); });
}

/* ---------- 建模 ---------- */
export function buildInterior() {
  const { x0, x1, z0, z1, lobbyX, wallZ } = R;
  const wall = (x, z, w, d, h, col) => { block(x, h / 2, z, w, h, d, col); boxC(x - w / 2, x + w / 2, z - d / 2, z + d / 2); };

  /* ===== 一樓大廳 ===== */
  flat(lobbyX * 2, z1 - wallZ, lobbyFloorMat(6, 4), 0, 0.01, (z1 + wallZ) / 2);
  // 大門（玻璃門）與兩側牆
  wall(0, z1 + 0.2, lobbyX * 2, 0.4, 7.6, '#e9ecef');
  [-1.8, 0, 1.8].forEach(x => block(x, 1.4, z1 - 0.02, 1.7, 2.8, 0.06, '#7fa5bd'));
  block(0, 2.95, z1 - 0.04, 5.6, 0.2, 0.1, '#3b4652');
  flat(2.4, 1.4, '#b23a35', 0, 0.02, z1 - 1.2);   // 門口紅地墊
  [-lobbyX - 0.2, lobbyX + 0.2].forEach(x => wall(x, (z1 + wallZ) / 2, 0.4, z1 - wallZ, 7.6, '#9ec7e8'));
  // 牆面上半部照片裡是淺藍、薄荷綠的色塊
  [-1, 1].forEach(s => { for (let i = 0; i < 4; i++) block(s * (lobbyX - 0.01), 5.4, wallZ + 2 + i * 3.6, 0.04, 1.6, 3.6, i % 2 ? '#9fe0d0' : '#8fc4ef'); });
  // 大廳後面靠大門的天花板（看台最後一排後面）
  plane(lobbyX * 2, z1 - 5.6, toon('#e4e2dc', { side: THREE.DoubleSide }), 0, 7.4, (z1 + 5.6) / 2, Math.PI / 2);

  // 南側看台蓋在大廳上面，底下露出斜斜的大樑（照片上白色的斜樑）
  for (let x = -lobbyX + 1.2; x < lobbyX; x += 3.4) {
    const len = 9.4, b = block(x, 4.05, wallZ + 4.3, 0.35, 0.5, len, '#f1f0eb', 0.02); b.rotation.x = -Math.atan2(0.42, 0.85);
  }

  // 中間：電子看板
  block(0, 1.3, wallZ + 0.21, 7.2, 2.6, 0.06, '#5a3b28');   // 看板後面的木牆
  block(0, 1.6, wallZ + 0.3, 3.6, 2.1, 0.14, '#2a1f18', 0.02);
  plane(3.2, 1.8, screenMat(), 0, 1.6, wallZ + 0.38);
  // 左右兩座樓梯（往 2F 看台）。踏階立面貼「NCCU GRIFFINS」「雄起來打」
  const riserA = hText('NCCU GRIFFINS', '#2b2f6e', '900 54px "M PLUS Rounded 1c",sans-serif', 640, 80, 40);
  const riserB = hText('雄起來打', '#ffffff', '900 60px "Noto Sans TC",sans-serif', 420, 80, 80);
  const matA = basic({ map: riserA, transparent: true }), matB = basic({ map: riserB, transparent: true });
  STAIRS.forEach(cx => {
    const { w, z0: sz, n, run, rise } = STAIR;
    for (let i = 0; i < n; i++) {
      const z = sz - i * run, top = (i + 1) * rise;
      block(cx, top / 2, z - run / 2, w, top, run, i % 2 ? '#a0663f' : '#8c5735', 0.01);
      block(cx, top - 0.02, z - run / 2, w, 0.04, run, '#3a3d48');
      if (i < 6) {
        const odd = i % 2;
        block(cx, top - rise / 2, z + 0.01, w, rise, 0.02, odd ? '#f4f4f0' : '#2f3a9e');
        plane(w * 0.9, rise * 0.85, odd ? matA : matB, cx, top - rise / 2, z + 0.03);
      }
    }
    // 扶手
    [-1, 1].forEach(s => {
      const len = n * run + 0.6, h = n * rise, r = block(cx + s * (w / 2 + 0.05), h / 2 + 0.95, sz - n * run / 2, 0.08, 0.08, Math.hypot(len, h), '#6b4a33', 0.01);
      r.rotation.x = Math.atan2(h, len);
      for (let i = 0; i <= n; i += 2) block(cx + s * (w / 2 + 0.05), (i * rise) + 0.5, sz - i * run, 0.04, 0.9, 0.04, '#3a3530');
    });
    boxC(cx - w / 2 - 0.15, cx + w / 2 + 0.15, sz - n * run, sz + 0.1);
  });
  // 樓梯間的牆（看台底下，大廳和球場之間）
  [[-lobbyX, GATES[0][0]], [GATES[0][1], GATES[1][0]], [GATES[1][1], lobbyX]].forEach(([a, b]) => wall((a + b) / 2, wallZ, b - a, 0.35, 2.6, '#f2f1ec'));
  // 柵欄門（打開的，兩側收著一排鐵條）
  GATES.forEach(([a, b]) => {
    block((a + b) / 2, 2.3, wallZ, b - a, 0.6, 0.35, '#f2f1ec');
    [a + 0.15, b - 0.15].forEach(x => { for (let k = -2; k <= 2; k++) block(x, 1.05, wallZ + k * 0.1, 0.05, 2.1, 0.05, '#2f3238'); });
  });
  // 獎盃櫃（大廳兩側）
  const trophyGold = toon('#e8b931'), trophySilver = toon('#d7dbe0');
  [-1, 1].forEach(s => {
    const x = s * (lobbyX - 0.45);
    block(x, 1.3, 5.4, 0.8, 2.6, 4.6, '#5a3b28', 0.02); boxC(x - 0.4, x + 0.4, 3.1, 7.7);
    block(x - s * 0.41, 1.4, 5.4, 0.02, 2.1, 4.2, basic({ color: '#cfe6f2', transparent: true, opacity: 0.35 }));
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
      const z = 3.6 + i * 0.72, y = 0.55 + r * 0.7, tall = 0.25 + ((i + r) % 3) * 0.08;
      mk(new THREE.CylinderGeometry(0.05, 0.08, tall, 8), (i + r) % 4 ? trophyGold : trophySilver, x - s * 0.1, y + tall / 2, z, {});
      mk(new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), (i + r) % 4 ? trophyGold : trophySilver, x - s * 0.1, y + tall, z, {}).rotation.x = Math.PI;
    }
  });
  // 身高牆（右邊柵欄門旁）
  plane(3.4, 3.2, heightWallMat(), lobbyX - 0.03, 1.7, wallZ + 2.4, 0, -Math.PI / 2);
  // 證件查驗桌與立牌（左邊柵欄門旁，靠牆）
  block(-lobbyX + 0.5, 0.45, 0.9, 0.9, 0.9, 1.7, '#c9a874', 0.02); boxC(-lobbyX, -lobbyX + 0.95, 0.05, 1.75);
  { const sg = textPlate('請主動出示證件', 1.2, 0.5, '#2b3478', '#ffffff'); sg.position.set(-9.9, 1.35, -0.4); sg.rotation.y = 0.35;
    mk(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), toon('#c9ced3'), -9.9, 0.55, -0.42, {}); }
  // 廁所（大門兩側角落，門關著）
  [-1, 1].forEach(s => { block(s * (lobbyX - 1.6), 1.2, z1 - 0.05, 1.1, 2.4, 0.06, '#8f9aa5'); const t = textPlate('廁所', 0.9, 0.35, '#ffffff', '#4e5a66'); t.position.set(s * (lobbyX - 1.6), 2.65, z1 - 0.1); t.rotation.y = Math.PI; });

  /* ===== 一樓球場 ===== */
  const hz0 = z0, hz1 = wallZ;
  flat(x1 - x0, hz1 - hz0, '#24306e', 0, 0.005, (hz0 + hz1) / 2);   // 深藍場邊
  flat(28, 15, courtMat(), 0, 0.012, COURT.cz);
  // 場邊防撞軟墊（深藍）與上面的標語
  [[0, hz0 - 0.15, x1 - x0 + 0.6, 0.3], [x0 - 0.15, (hz0 + hz1) / 2, 0.3, hz1 - hz0], [x1 + 0.15, (hz0 + hz1) / 2, 0.3, hz1 - hz0]].forEach(([x, z, w, d]) => wall(x, z, w, d, 1.35, PAD));
  // 南側（大廳那面）球場這邊的軟墊，柵欄門要留空
  [[x0, GATES[0][0]], [GATES[0][1], GATES[1][0]], [GATES[1][1], x1]].forEach(([a, b]) => block((a + b) / 2, 0.68, hz1 - 0.2, b - a, 1.35, 0.1, PAD));
  [[-6, hz0 + 0.01, 0], [6, hz0 + 0.01, 0], [x0 + 0.01, -16, Math.PI / 2], [x1 - 0.01, -10, -Math.PI / 2]].forEach(([x, z, ry], i) => {
    const t = textPlate(i % 2 ? 'NCCU GRIFFINS' : '雄起來打', 3.6, 0.7, '#ffffff', null); t.position.set(x, 0.85, z); t.rotation.y = ry; });
  // 軟墊上面的看台前牆與欄杆
  const rail = (ax, az, bx, bz, y) => { const len = Math.hypot(bx - ax, bz - az), r = block((ax + bx) / 2, y, (az + bz) / 2, len, 0.07, 0.07, STEEL, 0.01); r.rotation.y = -Math.atan2(bz - az, bx - ax); r.userData.noOcc = true; };
  // 南面那條欄杆架在大廳上面的看台第一排邊上，比較高，下面不做前牆（柵欄門要過人）
  [[x0 - 0.3, hz0 - 0.3, x1 + 0.3, hz0 - 0.3, 2.25], [x0 - 0.3, hz0 - 0.3, x0 - 0.3, hz1, 2.25], [x1 + 0.3, hz0 - 0.3, x1 + 0.3, hz1, 2.25], [-lobbyX, hz1 + 0.3, lobbyX, hz1 + 0.3, 2.65]].forEach(([ax, az, bx, bz, top]) => {
    const vert = ax === bx;
    if (top < 2.5) block((ax + bx) / 2, 1.8, (az + bz) / 2, vert ? 0.3 : bx - ax, 0.9, vert ? bz - az : 0.3, '#3c4250');
    [top + 0.35, top + 0.9].forEach(y => rail(ax, az, bx, bz, y));
    const len = Math.hypot(bx - ax, bz - az);
    for (let d = 0; d <= len; d += 1.6) { const k = d / len, p = block(ax + (bx - ax) * k, top + 0.5, az + (bz - az) * k, 0.06, 0.9, 0.06, STEEL); p.userData.noOcc = true; }
  });

  // 看台：北面矮一點（後面是掛錦旗的木牆），東西兩邊長看台，南面蓋在大廳上
  const seats = [];
  stand('n', 5, 2.25, hz0 - 0.45, x0 - 0.3, x1 + 0.3, seats);
  stand('w', 10, 2.25, x0 - 0.45, hz0 - 0.3, hz1 + 0.3, seats);
  stand('e', 10, 2.25, x1 + 0.45, hz0 - 0.3, hz1 + 0.3, seats);
  stand('s', 10, 2.65, hz1 + 0.25, -lobbyX, lobbyX, seats, STAIRS.map(x => [x - STAIR.w / 2 - 0.2, x + STAIR.w / 2 + 0.2]));
  flushSeats(seats);
  // 看台角落與後牆
  const backN = hz0 - 0.45 - 5 * 0.85, backW = x0 - 0.45 - 10 * 0.85, backE = x1 + 0.45 + 10 * 0.85;
  [[backW, x0 - 0.45, backN, hz0 - 0.3], [x1 + 0.45, backE, backN, hz0 - 0.3]].forEach(([a, b, c, d]) => block((a + b) / 2, 3, (c + d) / 2, b - a, 6, d - c, '#4a4f5c'));
  [[backW, -lobbyX - 0.4, hz1 + 0.3, z1 + 0.4], [lobbyX + 0.4, backE, hz1 + 0.3, z1 + 0.4]].forEach(([a, b, c, d]) => {
    const w = Math.abs(b - a); if (w < 0.5) return; block((a + b) / 2, 3.5, (c + d) / 2, w, 7, d - c, '#4a4f5c'); });
  // 北面的木牆、布條（左 NCCU、右 雄起來打）、冠軍錦旗
  const woodWall = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#b98454'; g.fillRect(0, 0, w, h); g.fillStyle = '#a7744a'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 2, h); }, [8, 2]);
  plane(x1 - x0 + 4, 7, new THREE.MeshToonMaterial({ map: woodWall, gradientMap: GRAD }), 0, 4.4 + 3.5, backN + 0.02);
  block(0, 2.2, backN - 0.2, x1 - x0 + 4, 4.4, 0.4, '#4a4f5c');
  plane(3.2, 4.4, bannerMat('NCCU', '政大雄鷹', '#3d2f8f'), -2.4, 7.4, backN + 0.15);
  plane(3.2, 4.4, bannerMat('雄起來打', 'GRIFFINS', '#3d2f8f'), 2.4, 7.4, backN + 0.15);
  ['2019', '2021', '2022', '2023', '2024', '2025'].forEach((y, i) => plane(1, 1.5, pennantMat(y), -5.5 + i * 2.2, 10.6, backN + 0.16));
  // 計分板（東西兩邊看台上方）
  const score = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#0d0f14'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff4a3a'; g.font = '64px "Courier New",monospace'; g.textAlign = 'center'; g.fillText('17:56', w / 2, 82); g.fillStyle = '#f2c84b'; g.font = '22px Arial'; g.fillText('HOME   GUEST', w / 2, 116); });
  [[backW + 0.3, Math.PI / 2], [backE - 0.3, -Math.PI / 2]].forEach(([x, ry]) => { block(x, 8.6, -14, 0.4, 1.8, 3.2, '#22252c'); plane(3, 1.5, basic({ map: score }), x + (ry > 0 ? 0.21 : -0.21), 8.6, -14, 0, ry); });
  // 外牆的高窗
  const winTex = canvasTex(128, 32, (g, w, h) => { g.fillStyle = '#26303d'; g.fillRect(0, 0, w, h); g.fillStyle = '#6f879c'; for (let x = 0; x < w; x += 32) g.fillRect(x + 3, 4, 26, h - 8); }, [10, 1]);
  [[backW, Math.PI / 2], [backE, -Math.PI / 2]].forEach(([x, ry]) => { block(x - Math.sign(ry) * 0.2, 7, -14, 0.4, 14, 40, '#3b404c'); plane(36, 1.4, basic({ map: winTex }), x + (ry > 0 ? 0.01 : -0.01), 8.3, -14, 0, ry); });

  // 籃架：藍色桁架底座在底線後面，伸出手臂掛籃板
  const blue = toon('#3e8fd6'), white = basic({ color: '#ffffff', transparent: true, opacity: 0.85 });
  RIMS.forEach(r => {
    const s = Math.sign(r.x), bx = s * 15.7;
    block(bx, 0.7, r.z, 1.1, 1.4, 1.6, blue, 0.03); boxC(bx - 0.6, bx + 0.6, r.z - 0.85, r.z + 0.85);
    block(bx, 0.15, r.z, 1.4, 0.3, 2.2, '#2a2d38', 0.02);
    const arm = block((bx + s * 12.9) / 2, 3.55, r.z, Math.abs(bx - s * 12.9), 0.2, 0.2, blue, 0.02); arm.userData.noOcc = true;
    const strut = block(bx - s * 0.6, 2.4, r.z, 0.15, 2.4, 0.15, blue, 0.02); strut.rotation.z = s * 0.45;
    block(bx, 2.3, r.z, 0.25, 2.2, 0.25, blue, 0.02);
    const bb = block(s * 12.83, 3.45, r.z, 0.06, 1.05, 1.8, white); bb.userData.noOcc = true;
    const sq = new THREE.Mesh(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.01, 0.45, 0.59)), new THREE.LineBasicMaterial({ color: '#d63a2f' })); sq.position.set(s * 12.79, 3.28, r.z); scene.add(sq);
    const rim = mk(new THREE.TorusGeometry(0.23, 0.02, 6, 20), toon('#ff6a1a'), r.x, r.y, r.z, {}); rim.rotation.x = Math.PI / 2; rim.userData.noOcc = true;
    const net = mk(new THREE.CylinderGeometry(0.23, 0.14, 0.42, 12, 1, true), basic({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.8 }), r.x, r.y - 0.22, r.z, { cast: false }); net.userData.noOcc = true;
  });

  // 天花板：深色屋面、一片片錯落的木質吸音板、燈
  plane(backE - backW + 2, z1 - backN + 2, toon('#1c1f2b', { side: THREE.DoubleSide }), 0, 14.5, (z1 + backN) / 2, Math.PI / 2);
  { const geo = new THREE.BoxGeometry(1.25, 0.06, 0.42), mat = toon('#c99062'), list = [];
    for (let x = x0 - 1; x <= x1 + 1; x += 1.45) for (let z = hz0 - 1; z <= hz1 - 0.5; z += 0.78) list.push([x + ((Math.round(z / 0.78)) % 2) * 0.7, 11.6 + Math.sin(x * 0.7 + z * 0.4) * 0.35, z]);
    const inst = new THREE.InstancedMesh(geo, mat, list.length), m = new THREE.Matrix4(), col = new THREE.Color();
    list.forEach(([x, y, z], i) => { m.makeTranslation(x, y, z); inst.setMatrixAt(i, m); inst.setColorAt(i, col.setHSL(0.075, 0.42, 0.52 + ((i * 37) % 11) / 110)); });
    inst.userData.noOcc = true; scene.add(inst);
    const lamp = new THREE.CircleGeometry(0.28, 12), lm = basic({ color: '#fffbe8' }), lamps = [];
    for (let x = -12; x <= 12; x += 6) for (let z = -22; z <= -5; z += 5.5) lamps.push([x, z]);
    const li = new THREE.InstancedMesh(lamp, lm, lamps.length);
    lamps.forEach(([x, z], i) => { m.makeRotationX(Math.PI / 2); m.setPosition(x, 11.1, z); li.setMatrixAt(i, m); });
    li.userData.noOcc = true; scene.add(li); }
}

/* ---------- 房間設定用的規則 ---------- */
export function interiorZone(p) { return p.z > R.wallZ ? '體育館一樓大廳' : '體育館球場'; }
/** 大廳比球場窄：在大廳那一段（z > 牆）時，x 不能超出大廳；過牆只能走柵欄門 */
export function interiorClamp(p) {
  if (p.z > R.wallZ - 0.3) p.x = Math.max(-R.lobbyX + 0.4, Math.min(R.lobbyX - 0.4, p.x));
}
export function interiorLight(s) {
  s.add(new THREE.HemisphereLight('#fff6e6', '#8a6e58', 1.05));
  const d = new THREE.DirectionalLight('#ffffff', 0.75); d.position.set(-8, 20, 6); s.add(d);
}
