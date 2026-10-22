/**
 * 電算中心後面的校內道路（地圖上電算中心 A14、資訊大樓 B14 和集英樓 D17、新聞館 B18 中間那條南北向道路）。
 * 依照片：
 * - 雙向兩線道，中間雙黃線，兩側紅線，路面有直行、左轉箭頭、「慢」字和斑馬線
 * - 兩側紅磚人行道，靠車道那邊一排水泥花台（種矮灌木），另一邊是灰色路燈和行道樹
 * - 東側是電算中心後棟的方柱框架（在 computer-center 資料夾），行道樹種在柱子前的樹穴；
 *   往北接上八德道（bade-road.js），兩條路的人行道和方柱框架在路口轉角相接
 * - 北端：八德道從東邊接進來，往西有一條彎進集英樓前面的路；再往北是灰色棋盤格的行人廣場，
 *   入口一排黃色反光柱，東邊是有綠色鋼構雨遮的店面，西邊是白色圍牆和公告欄，出去就是指南路
 * - 指南路對面很高的漢堡店（麥當勞）招牌；店面本身在 shop-street.js
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { GRAD, SPH, basic, block, canvasTex, flat, hText, mk, plane, toon } from '../../render/kit.js';
import { boxC, circC } from '../../core/collision.js';
import { palm, tree } from '../vegetation.js';
import { swZ } from '../layout.js';
import { asPrefab } from '../prefabs/index.js';

const X = 96;                 // 道路中心線
const HW = 3.5;               // 半個路寬（兩線道）
const SW = 2.6;               // 人行道寬
const BZ = -1.5, BHW = 2.2;   // 往西彎進集英樓前面那條路：中心 z、半寬
const ZN = BZ + BHW;          // 路口北緣，再往北是行人廣場
const ZS = swZ(X) + 2.3;      // 南端接四維道延伸的步道
const ZG = 12.6;              // 指南路人行道南緣
const RED = '#d9566a', WHITE = '#f4f4ee', YELLOW = '#f2c84b', ASPHALT = '#5b6270';

/* ---------- 材質 ---------- */
// 紅磚人行道（人字形鋪面）
function brickMat(rx, ry) {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#b8624f'; g.fillRect(0, 0, w, h);
    const cols = ['#c06a55', '#ad5a48', '#b9654f', '#a95646'];
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
      const k = ((x + y) / 16) % 2;
      g.fillStyle = cols[(x * 7 + y * 3) / 16 % 4 | 0];
      if (k) { g.fillRect(x + 1, y + 1, 14, 6); g.fillRect(x + 1, y + 9, 14, 6); }
      else { g.fillRect(x + 1, y + 1, 6, 14); g.fillRect(x + 9, y + 1, 6, 14); }
    }
  }, [rx, ry]);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}
// 側門廣場的灰色棋盤格地磚
function checkerMat(rx, ry) {
  const t = canvasTex(128, 128, (g, w, h) => {
    const tones = ['#8d9095', '#b9bcbf', '#a3a6aa', '#c9cbcd'];
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      g.fillStyle = tones[((i + j) % 2) * 2 + ((i * 3 + j) % 2)]; g.fillRect(i * 16, j * 16, 16, 16);
    }
    g.strokeStyle = 'rgba(80,80,80,.35)'; g.lineWidth = 1;
    for (let k = 0; k <= 128; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, h); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(w, k); g.stroke(); }
  }, [rx, ry]);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}
/** 平放在路面上的貼圖（箭頭、字），rz 是在地面上的旋轉：0 = 貼圖上方朝 -z（往南） */
function decal(tex, w, h, x, z, rz) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.set(-Math.PI / 2, 0, rz || 0); m.position.set(x, 0.027, z); scene.add(m); return m;
}
const arrowTex = canvasTex(64, 256, (g, w) => {
  g.fillStyle = WHITE; g.fillRect(w / 2 - 7, 70, 14, 180);
  g.beginPath(); g.moveTo(w / 2, 4); g.lineTo(w - 6, 80); g.lineTo(6, 80); g.closePath(); g.fill();
});
const leftTex = canvasTex(160, 256, (g) => {
  g.fillStyle = WHITE; g.fillRect(98, 90, 14, 160);
  g.beginPath(); g.moveTo(98, 90); g.quadraticCurveTo(98, 50, 60, 50); g.lineTo(60, 64); g.quadraticCurveTo(112, 64, 112, 104); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(8, 57); g.lineTo(64, 18); g.lineTo(64, 96); g.closePath(); g.fill();
});
const slowTex = hText('慢', WHITE, '900 150px "Noto Sans TC",sans-serif', 160, 170, 80);

/* ---------- 主路：南北向兩線道 ---------- */
{
  const len = ZN - ZS, c = (ZN + ZS) / 2;
  const road = flat(HW * 2, len, ASPHALT, X, 0.022, c); road.receiveShadow = true;
  // 兩側紅線
  [-1, 1].forEach(s => flat(0.22, len, RED, X + s * (HW - 0.15), 0.025, c));
  // 中間雙黃線（路口和斑馬線那段不畫）
  const y0 = -16.2, y1 = ZS + 0.6;   // 北端從八德道路口（z 約 -12.8）往南才開始畫
  [-0.15, 0.15].forEach(dx => flat(0.12, y0 - y1, YELLOW, X + dx, 0.025, (y0 + y1) / 2));
  // 斑馬線：北端路口、中段（集英樓／新聞館到電算中心）、南端
  [-5.2, -21, ZS + 3].forEach(z => { for (let k = -HW + 0.6; k < HW - 0.3; k += 1.05) flat(0.5, 2.6, WHITE, X + k + 0.25, 0.026, z); });
  // 停止線
  flat(HW - 0.3, 0.3, WHITE, X - HW / 2, 0.026, -7.0);
  flat(HW - 0.3, 0.3, WHITE, X + HW / 2, 0.026, -19.3);
  flat(HW - 0.3, 0.3, WHITE, X + HW / 2, 0.026, ZS + 4.8);
  // 箭頭：東半邊往北、西半邊往南；南端前有左轉（往東接四維道）
  [-13, -29].forEach(z => decal(arrowTex, 0.7, 2.8, X - HW / 2, z, Math.PI));
  [-7.8, -27].forEach(z => decal(arrowTex, 0.7, 2.8, X + HW / 2, z, 0));   // 第一個箭頭在八德道路口和側門路口之間
  decal(leftTex, 1.3, 2.1, X + HW / 2, ZS + 7.5, 0);
  decal(slowTex, 1.4, 1.5, X - HW / 2, -9.2, Math.PI);
  decal(slowTex, 1.4, 1.5, X + HW / 2, -24.5, 0);
}

/* ---------- 往西彎進集英樓前面的路（接到最西側的南北向道路） ---------- */
{
  const x0 = X + HW, x1 = 178.5, len = x1 - x0, c = (x0 + x1) / 2;
  flat(len, BHW * 2, ASPHALT, c, 0.0215, BZ);
  // 路口方塊（主路和八德道、這條路交會的地方）
  flat(HW * 2, BHW * 2, ASPHALT, X, 0.0212, BZ);
  [-1, 1].forEach(s => flat(len - 6, 0.22, RED, c + 3, 0.025, BZ + s * (BHW - 0.15)));
  for (let x = x0 + 7; x < x1 - 3; x += 4) flat(2, 0.12, WHITE, x, 0.025, BZ);
  // 集英樓前的斑馬線（照片：彎道上的那一組）
  for (let k = -BHW + 0.5; k < BHW - 0.3; k += 1.05) flat(2.6, 0.5, WHITE, x0 + 3.6, 0.026, BZ + k + 0.25);
}

/* ---------- 紅磚人行道 ---------- */
{
  const E0 = X - HW - SW, W1 = X + HW + SW;
  // 東側：八德道路口以南到四維道
  { const z1 = BZ - BHW, len = z1 - ZS; flat(SW, len, brickMat(1.5, len / 1.7), E0 + SW / 2, 0.02, (z1 + ZS) / 2); }
  // 西側：集英樓轉角以南
  { const z1 = BZ - BHW - SW, len = z1 - ZS; flat(SW, len, brickMat(1.5, len / 1.7), X + HW + SW / 2, 0.02, (z1 + ZS) / 2); }
  // 集英樓前（往西那條路的南側）與對面（北側）
  { const x0 = W1, x1 = 124, len = x1 - x0; flat(len, SW, brickMat(len / 1.7, 1.5), (x0 + x1) / 2, 0.02, BZ - BHW - SW / 2); }
  { const x0 = X + HW, x1 = 124, len = x1 - x0; flat(len, SW, brickMat(len / 1.7, 1.5), (x0 + x1) / 2, 0.02, ZN + SW / 2); }
  // 轉角：四分之一圓的紅磚，邊上一道紅線（照片：集英樓前那個圓弧轉角）
  { const cx = W1, cz = BZ - BHW - SW;
    const corner = new THREE.Mesh(new THREE.CircleGeometry(SW, 16, Math.PI / 2, Math.PI / 2), brickMat(1.5, 1.5));
    corner.rotation.x = -Math.PI / 2; corner.position.set(cx, 0.021, cz); scene.add(corner);
    const arc = new THREE.Mesh(new THREE.RingGeometry(SW - 0.22, SW, 16, 1, Math.PI / 2, Math.PI / 2), toon(RED));
    arc.rotation.x = -Math.PI / 2; arc.position.set(cx, 0.024, cz); scene.add(arc);
    flat(SW, SW, ASPHALT, cx - SW / 2, 0.0205, cz + SW / 2); }
  // 東側在電算中心後棟前面加寬（柱子外緣到原本的人行道之間也鋪紅磚）
  { const z1 = -11.2, len = z1 - ZS; flat(E0 - 88.2, len, brickMat(1, len / 1.7), (E0 + 88.2) / 2, 0.0195, (z1 + ZS) / 2); }
  // 路緣石（靠車道那一邊的淺灰色長條）
  [[E0 + SW - 0.1, BZ - BHW, ZS], [X + HW + 0.1, BZ - BHW - SW, ZS]].forEach(([x, z0, z1]) => flat(0.2, z0 - z1, '#a7a7a1', x, 0.022, (z0 + z1) / 2));
}

/* ---------- 人行道上的花台、路燈、行道樹 ---------- */
const CONCRETE = toon('#7e7f7b'), SHRUBS = ['#4f8f3e', '#5c9e45', '#467f38'];
const shrubCol = n => SHRUBS[((Math.round(n) % 3) + 3) % 3];   // z 是負的，取餘數要轉正
// 花台、路燈都是工具箱的預製物件（world/prefabs），同款一次畫完
function planter(x, z, along) {   // along：'z' 表示花台沿著南北向道路擺
  const [w, d] = along === 'z' ? [0.9, 1.7] : [1.7, 0.9];
  asPrefab(() => {
    block(x, 0.28, z, w, 0.56, d, CONCRETE, 0.02);
    for (let i = 0; i < 2; i++) {
      const s = mk(SPH, toon(shrubCol(i + Math.round(z))), x + (along === 'z' ? 0 : (i - 0.5) * 0.7), 0.78, z + (along === 'z' ? (i - 0.5) * 0.7 : 0), { out: 0.03 });
      s.scale.set(0.45, 0.36, 0.45);
    }
  });
  boxC(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
}
const POLE = new THREE.CylinderGeometry(0.07, 0.09, 5.6, 7), HEAD = new THREE.ConeGeometry(0.32, 0.22, 3), BULB = new THREE.CircleGeometry(0.16, 3);
function lamp(x, z, face) {   // face：燈頭朝哪個方向（+1 朝 +x、-1 朝 -x）
  asPrefab(() => {
    mk(POLE, toon('#a3a8ae'), x, 2.8, z, { out: 0.015 });
    block(x + face * 0.22, 5.5, z, 0.5, 0.06, 0.08, '#a3a8ae', 0);
    const h = mk(HEAD, toon('#c4c8cc'), x + face * 0.42, 5.5, z, { out: 0.02 }); h.rotation.y = Math.PI / 6;
    mk(BULB, toon('#fff6dc', { emissive: '#ffe6a8', emissiveIntensity: 0.7 }), x + face * 0.42, 5.38, z).rotation.x = Math.PI / 2;
  });
  circC(x, z, 0.14);
}
{
  const ex = X - HW - 0.55, wx = X + HW + 0.55;
  [-10, -15.5, -25, -31, -36].forEach(z => planter(ex, z, 'z'));
  [-9.5, -14.5, -25.5, -31, -36].forEach(z => planter(wx, z, 'z'));
  [-17.5, -27.5, -33.6, -39.5].forEach(z => lamp(X - HW - SW + 0.4, z, 1));
  [-12, -23, -33.5].forEach(z => lamp(X + HW + SW - 0.4, z, -1));
  // 集英樓前那條路
  [[106.5, 'n'], [111, 'n'], [118, 'n']].forEach(([x]) => planter(x, ZN + 0.55, 'x'));
  lamp(114.5, ZN + SW - 0.4, 0);
  // 行道樹：東側種在電算中心後棟前面的樹穴裡（照片），西側在集英樓以南
  const pit = new THREE.RingGeometry(0.45, 0.68, 16);
  [-14.6, -20.4, -30.6, -36.6].forEach(z => {
    tree(X - HW - SW - 0.75, z, 0.95);
    const r = new THREE.Mesh(pit, toon('#8d8b85')); r.rotation.x = -Math.PI / 2; r.position.set(X - HW - SW - 0.75, 0.03, z); scene.add(r);
    flat(0.95, 0.95, '#5f5242', X - HW - SW - 0.75, 0.025, z);
  });
  [-23, -28.5, -40].forEach(z => tree(X + HW + SW + 1.1, z, 0.9));
  palm(X + HW + SW + 2.6, -33, 6.5); palm(X + HW + SW + 4.6, -36.5, 7.2);
  tree(121.8, BZ - BHW - SW / 2, 1.05);
}

/* ---------- 東側北端：黃色立牌和三角錐（擋土牆的位置現在是八德道的人行道，見 bade-road.js） ---------- */
{ const x = X - HW - SW + 0.8, z = -11.6;
  mk(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 6), toon('#d9473f'), x, 0.6, z, {});
  block(x, 0.05, z, 0.45, 0.1, 0.45, '#e8c23a', 0.01);
  block(x, 1.15, z, 0.04, 0.3, 0.5, '#f2d33f', 0.01);
  mk(new THREE.ConeGeometry(0.2, 0.6, 8), toon('#ef6c35'), x + 0.1, 0.3, z - 0.9, { out: 0.02 });
  circC(x, z, 0.2); }

/* ---------- 側門廣場：棋盤格地磚、黃色反光柱、兩邊的店面和圍牆 ---------- */
{
  const x0 = X - HW - 0.3, x1 = X + HW + 0.9, len = ZG - ZN;
  flat(x1 - x0, len, checkerMat((x1 - x0) / 2.2, len / 2.2), (x0 + x1) / 2, 0.02, (ZN + ZG) / 2);
  flat(x1 - x0, 0.25, '#cfcfca', (x0 + x1) / 2, 0.022, ZN + 0.12);
  // 入口的黃色反光柱（中間留空讓人走）
  const BOL = new THREE.CylinderGeometry(0.11, 0.13, 0.95, 10);
  [-2.9, -1.1, 0.8, 2.6].forEach(dx => {
    const x = X + dx, z = ZN + 0.6;
    mk(BOL, toon('#f2c12e'), x, 0.47, z, { out: 0.02 });
    [0.62, 0.8].forEach(y => mk(new THREE.CylinderGeometry(0.118, 0.12, 0.08, 10), toon('#f6f6f0'), x, y, z));
    circC(x, z, 0.14);
  });

  // 東側：小店面，前面有綠色鋼構雨遮和長椅
  const sx0 = 84.6, sx1 = x0 - 0.2, sz0 = ZN + 2.2, sz1 = ZG - 0.4, sh = 4.2;
  block((sx0 + sx1) / 2, sh / 2, (sz0 + sz1) / 2, sx1 - sx0, sh, sz1 - sz0, '#d9d2c4', 0.04);
  block((sx0 + sx1) / 2, sh + 0.3, (sz0 + sz1) / 2, sx1 - sx0 + 0.3, 0.6, sz1 - sz0 + 0.3, '#bfb6a6', 0.03);
  plane(sz1 - sz0 - 2, 2.4, basic({ color: '#7e98a6' }), sx1 + 0.02, 1.5, (sz0 + sz1) / 2, 0, Math.PI / 2);
  for (let z = sz0 + 1; z < sz1; z += 2.2) block(sx1 + 0.04, 1.5, z, 0.06, 2.4, 0.1, '#5b5f63', 0);
  const GREEN = toon('#2f7a4f');
  [sz0 + 0.3, (sz0 + sz1) / 2, sz1 - 0.3].forEach(z => { block(sx1 + 1.6, 1.6, z, 0.12, 3.2, 0.12, GREEN, 0.015); circC(sx1 + 1.6, z, 0.12); });
  const roof = block(sx1 + 0.85, 3.25, (sz0 + sz1) / 2, 1.9, 0.08, sz1 - sz0, toon('#a9cfc0', { transparent: true, opacity: 0.7 }), 0);
  roof.rotation.z = -0.12;
  block(sx1 + 1.75, 3.15, (sz0 + sz1) / 2, 0.12, 0.12, sz1 - sz0, GREEN, 0.01);
  block(sx1 + 0.6, 0.45, (sz0 + sz1) / 2 - 1, 0.45, 0.08, 2, '#8a6a4a', 0.01);
  [-1.7, -0.3].forEach(dz => block(sx1 + 0.6, 0.22, (sz0 + sz1) / 2 + dz, 0.4, 0.44, 0.08, '#555', 0));
  // 圓形店招（深藍底、黃色碗）
  const badge = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#1f3c78'; g.beginPath(); g.arc(w / 2, h / 2, 60, 0, 7); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#f2c84b'; g.beginPath(); g.arc(w / 2, 60, 34, 0, Math.PI); g.fill();
    g.fillStyle = '#ffffff'; g.font = '700 20px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText('校園小舖', w / 2, 112);
  });
  plane(1.1, 1.1, basic({ map: badge, transparent: true }), sx1 + 1.68, 2.6, sz0 + 1.2, 0, Math.PI / 2);
  boxC(sx0, sx1, sz0, sz1);

  // 西側：白色圍牆、公告欄、藍色直立招牌，牆後是舊的透天厝
  const wx = x1 + 0.2, wz0 = ZN + SW, wz1 = ZG - 0.3;
  block(wx, 1.1, (wz0 + wz1) / 2, 0.3, 2.2, wz1 - wz0, '#efefea', 0.03);
  boxC(wx - 0.15, wx + 0.15, wz0, wz1);
  asPrefab(() => { for (let z = wz0 + 0.8; z < wz1; z += 1.1) { const s = mk(SPH, toon(shrubCol(z * 3)), wx - 0.5, 0.35, z, { out: 0.03 }); s.scale.set(0.45, 0.4, 0.55); } });   // 灌木（工具箱）
  ['#d8433f', '#f0c94a', '#5b8ed6', '#efe6d0'].forEach((c, i) => block(wx - 0.18, 1.35, wz0 + 1.6 + i * 1.5, 0.06, 1.2, 1.1, c, 0.01));
  { const v = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#2f5fa8'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 40px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; [...'學生會'].forEach((c, i) => g.fillText(c, w / 2, 70 + i * 60)); });
    block(wx - 0.3, 1.4, wz1 - 0.7, 0.12, 2.8, 0.5, '#2f5fa8', 0.01);
    plane(0.48, 1.9, basic({ map: v }), wx - 0.37, 1.6, wz1 - 0.7, 0, -Math.PI / 2); }
  [[101.9, 5.6, 2.4, 3.6, 6.4, '#a59f95'], [102.2, 10.1, 3, 4, 7.6, '#b7aea0']].forEach(([x, z, w, d, h, c]) => {
    block(x + 0.6, h / 2, z, w, h, d, c, 0.04);
    block(x + 0.6, h + 0.1, z, w + 0.4, 0.2, d + 0.4, '#8b8478', 0.02);
    for (let y = 2.6; y < h - 0.6; y += 2.8) block(x - 0.62, y, z, 0.06, 1, d * 0.55, '#5b6168', 0);
  });
  block(102.8, 7.95, 10.1, 3.2, 0.1, 4.4, '#7e8a8f', 0.01);   // 頂樓鐵皮棚
}

/* ---------- 指南路對面：從校內道路一路看得到的店家和高招牌 ---------- */
{
  const z = 46;
  // 麥當勞和它左手邊那排店面改在 shop-street.js，這裡只留商店街右邊再過去的一棟
  [[110, 8, 7, '#9c968c']].forEach(([x, w, h, c]) => {
    block(x, h / 2, z, w, h, 8, c, 0.04);
    block(x, 2.4, z - 4.05, w - 1, 1.2, 0.1, '#5b8ed6', 0.01);
    for (let y = 4; y < h - 1; y += 2.6) block(x, y, z - 4.03, w * 0.7, 1, 0.06, '#5b6b78', 0);
    boxC(x - w / 2, x + w / 2, z - 4, z + 4);
  });
  // 很高的漢堡店招牌
  const x = 95, zz = 40.5;
  mk(new THREE.CylinderGeometry(0.22, 0.28, 13, 8), toon('#8a8f96'), x, 6.5, zz, { out: 0.03 });
  circC(x, zz, 0.3);
  const board = canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = '#d63a2f'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f6d24a'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#f6d24a'; g.beginPath(); g.ellipse(w / 2, 62, 40, 22, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#5a8f3a'; g.fillRect(w / 2 - 42, 64, 84, 6); g.fillStyle = '#7a3b1f'; g.fillRect(w / 2 - 40, 70, 80, 10);
    g.fillStyle = '#f6d24a'; g.fillRect(w / 2 - 40, 80, 80, 10);
    g.fillStyle = '#ffffff'; g.font = '900 44px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText('漢堡', w / 2, 150);
  });
  block(x, 13.6, zz, 2.2, 3.2, 0.4, '#d63a2f', 0.04);
  plane(2.1, 3.1, basic({ map: board }), x, 13.6, zz - 0.21, 0, Math.PI);
  plane(2.1, 3.1, basic({ map: board }), x, 13.6, zz + 0.21);
}

export { brickMat, lamp, shrubCol, X as BACK_ROAD_X, BZ as BACK_BRANCH_Z, ZN as BACK_PLAZA_Z0, ZG as BACK_PLAZA_Z1, HW as BACK_ROAD_HW, BHW as BACK_BRANCH_HW };
