/**
 * 集英樓（地圖 D17：福利社、書城、餐廳）。
 * 依照片：在電算中心後面那條校內道路北段的西側，正面朝北，對著彎進來的路口。
 * - 東半部：高的素面白牆量體，牆上直排「集英樓」，一樓是綠色招牌的校園書局，前面有鋼構棚架
 * - 西半部：二、三樓往外挑出的褐色水平帶窗，一樓退縮成騎樓，掛深藍色「集英樓餐廳」招牌，前面一道黃色矮牆
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { GRAD, SPH, basic, block, canvasTex, mk, plane, toon, vText } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';

// 外框（世界座標）：東邊靠校內道路、北邊靠往西的那條路
const X0 = 104, X1 = 120;      // 東緣、西緣
const ZB = -19;                // 背面（南）
const ZG = -8.2;               // 一樓牆面
const ZF = -6.6;               // 二、三樓挑出後的正面
const XM = 111;                // 東邊高量體和西邊挑出量體的分界
const GF = 3.6;                // 一樓高

const C = { wall: '#e2dccf', ground: '#cbbfae', brown: '#a8957c', brownDark: '#8f7d66', dark: '#3c4148' };

/** 水平帶窗：深色窗框、灰藍玻璃 */
function bandMat(rx) {
  const t = canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#6f8796'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 6, w, 10);
    g.fillStyle = '#e8b86a'; g.fillRect(10, 30, 26, 26); g.fillRect(74, 34, 20, 22);   // 室內燈光
    g.fillStyle = C.dark; for (let x = 0; x <= w; x += 32) g.fillRect(x, 0, 4, h); g.fillRect(0, 0, w, 3); g.fillRect(0, h - 4, w, 4);
  }, [rx, 1]);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}
/** 只有某些面要用不同材質的方塊：faces = { px, nx, py, ny, pz, nz } */
function boxFaces(x0, x1, y0, y1, z0, z1, base, faces) {
  const m = ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(k => (faces && faces[k]) || base);
  const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
  b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); b.castShadow = b.receiveShadow = true;
  return b;
}

function build() {
  const add = m => { scene.add(m); return m; };
  const wall = toon(C.wall), ground = toon(C.ground), brown = toon(C.brown);

  /* 一樓 */
  add(boxFaces(X0 + 0.2, X1 - 0.2, 0, GF, ZB, ZG, ground));
  // 書局的玻璃店面（東半）、餐廳的鐵窗（西半，在黃色矮牆後面）
  plane(XM - X0 - 1.6, 2.6, basic({ color: '#87a2ad' }), (X0 + XM) / 2 + 0.3, 1.5, ZG + 0.02);
  for (let x = X0 + 1; x < XM; x += 1.4) block(x, 1.5, ZG + 0.05, 0.08, 2.6, 0.06, C.dark, 0);
  const bars = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#5d6a72'; g.fillRect(0, 0, w, h); g.fillStyle = '#d9d6cf'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h); g.fillRect(0, 0, w, 4); g.fillRect(0, 30, w, 3); }, [6, 1]);
  plane(X1 - XM - 1.4, 2.2, new THREE.MeshToonMaterial({ map: bars, gradientMap: GRAD }), (XM + X1) / 2, 1.9, ZG + 0.02);

  /* 東邊的高量體：素面白牆，直排「集英樓」 */
  add(boxFaces(X0, XM, GF, 14.6, ZB, ZG - 0.4, wall));
  block((X0 + XM) / 2, 14.75, (ZB + ZG) / 2 - 0.2, XM - X0 + 0.3, 0.3, ZG - ZB - 0.1, '#cfc8ba', 0.03);
  const name = plane(0.9, 3.1, basic({ map: vText('集英樓', '#6b5a3e', '700 64px "Noto Serif TC","Noto Sans TC",serif', 96, 80), transparent: true }), X0 + 1.4, 10.6, ZG - 0.36);
  name.renderOrder = 1;
  // 兩個量體之間的直條窗
  for (let y = GF + 0.8; y < 13.5; y += 2.8) block(XM - 0.6, y + 0.6, ZG - 0.36, 1, 1.6, 0.08, '#6f8796', 0.02);

  /* 西邊二、三樓挑出：褐色水平帶＋整排窗戶 */
  const band = bandMat((X1 - XM) / 2.2), side = bandMat((ZF - ZB) / 2.2);
  [[GF + 0.9, 6.4], [7.3, 9.3]].forEach(([y0, y1]) => add(boxFaces(XM, X1, y0, y1, ZB, ZF - 0.5, brown, { pz: band, px: side })));
  [[GF, GF + 0.9], [6.4, 7.3], [9.3, 10.2]].forEach(([y0, y1]) => block((XM + X1) / 2, (y0 + y1) / 2, (ZB + ZF) / 2, X1 - XM + 0.3, y1 - y0, ZF - ZB, C.brown, 0.04));
  block((XM + X1) / 2, 6.85, ZF + 0.02, X1 - XM + 0.3, 0.12, 0.06, C.brownDark, 0);
  // 二樓窗前的欄杆
  block((XM + X1) / 2, 5.4, ZF - 0.08, X1 - XM, 0.06, 0.06, '#d9d6cf', 0);
  for (let x = XM + 0.3; x < X1; x += 0.5) block(x, 5.0, ZF - 0.08, 0.04, 0.8, 0.04, '#d9d6cf', 0);
  // 冷氣機
  [XM + 2, XM + 6.5].forEach(x => block(x, 4.95, ZF - 0.3, 0.8, 0.55, 0.35, '#e8e6e0', 0.015));
  // 四樓：往後退一點的白色量體
  add(boxFaces(XM + 0.6, X1 - 0.3, 10.2, 13.2, ZB + 0.3, ZF - 2.2, wall, { pz: bandMat(4) }));
  block((XM + X1) / 2 + 0.15, 13.35, (ZB + ZF) / 2 - 1, X1 - XM - 0.5, 0.3, ZF - ZB - 1.6, '#cfc8ba', 0.03);

  // 騎樓柱
  [XM + 0.6, XM + 4.6, X1 - 0.4].forEach(x => { block(x, GF / 2, ZF - 0.4, 0.5, GF, 0.5, '#d6cfc1', 0.02); circC(x, ZF - 0.4, 0.3); });

  /* 招牌 */
  const navy = canvasTex(512, 96, (g, w, h) => {
    g.fillStyle = '#1d2a55'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8b06a'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#ffffff'; g.font = '900 64px "Noto Serif TC","Noto Sans TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('集 英 樓 餐 廳', w / 2, h / 2 + 3);
  });
  block(XM + 4.4, GF - 0.48, ZF - 0.12, 4.6, 0.86, 0.12, '#1d2a55', 0.02);
  plane(4.5, 0.82, basic({ map: navy }), XM + 4.4, GF - 0.48, ZF - 0.05);
  const green = canvasTex(512, 96, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#1f7a4a'); gr.addColorStop(0.75, '#3a9a5a'); gr.addColorStop(1, '#8cc63f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.font = '900 46px "Noto Sans TC",sans-serif'; g.textBaseline = 'middle'; g.fillText('校園書局', 24, 38);
    g.font = '700 22px "Noto Sans TC",sans-serif'; g.fillText('Campus Bookstore', 26, 76);
  });
  block(X0 + 3.4, GF - 0.45, ZG + 0.1, 5.2, 0.86, 0.12, '#1f7a4a', 0.02);
  plane(5.1, 0.82, basic({ map: green }), X0 + 3.4, GF - 0.45, ZG + 0.17);

  /* 黃色矮牆與前面的植栽 */
  block((XM + 2.6 + X1 - 0.4) / 2, 0.65, ZG + 0.35, X1 - XM - 3, 1.3, 0.3, '#ecc944', 0.03);
  boxC(XM + 2.6, X1 - 0.4, ZG + 0.2, ZG + 0.5);
  for (let x = XM + 3; x < X1 - 0.5; x += 1.1) { const s = mk(SPH, toon(['#4f8f3e', '#5c9e45'][Math.round(x) % 2]), x, 0.45, ZG + 0.85, { out: 0.03 }); s.scale.set(0.5, 0.45, 0.4); }

  /* 書局前的鋼構棚架 */
  const steel = toon('#8e9499');
  const px0 = X0 - 1.2, px1 = X0 + 2.6, pz0 = ZG + 0.2, pz1 = ZF + 0.1;
  [[px0, pz1], [px1, pz1]].forEach(([x, z]) => { block(x, 1.5, z, 0.12, 3, 0.12, steel, 0.015); circC(x, z, 0.12); });
  [pz0, pz1].forEach(z => block((px0 + px1) / 2, 3.0, z, px1 - px0 + 0.2, 0.1, 0.1, steel, 0.01));
  for (let x = px0; x <= px1 + 0.01; x += 0.95) block(x, 3.05, (pz0 + pz1) / 2, 0.08, 0.08, pz1 - pz0, steel, 0);

  boxC(X0, X1, ZB, ZG);
}

export default defineBuilding({
  id: 'jiying-hall',
  name: '集英樓',
  build,
  zones: [{ priority: 74, test: p => (p.x > X0 - 1.5 && p.x < X1 + 1 && p.z < ZF + 0.6 && p.z > ZB - 1) ? '集英樓' : null }],
  map: [{ x: (X0 + X1) / 2, z: (ZB + ZF) / 2, w: X1 - X0, d: ZF - ZB, color: '#d9cdb6', label: '集英樓' }],
});
