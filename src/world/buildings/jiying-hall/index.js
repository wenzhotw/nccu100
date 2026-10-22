/**
 * 集英樓（地圖 D17：福利社、書城、餐廳）。
 *
 * 位置與方向依 OpenNCCU 3D 模型：在電算中心後面那條校內道路東側、往側門那條路的北邊，
 * 整棟斜放（順時針約 25 度），正面朝東南邊的路口；量體約 26 × 16 公尺、3 層樓加屋頂退縮層。
 * 外觀沿用 photos/ 照片的特徵（從路口看正面）：
 * - 左半部：高的素面白牆量體，牆上直排「集英樓」；一樓是綠色招牌的校園書局，前面有鋼構棚架
 * - 右半部：二、三樓往外挑出的褐色水平帶窗，一樓退縮成騎樓，掛深藍色「集英樓餐廳」招牌，前面一道黃色矮牆
 * - 屋頂是模型上的藍灰色；正面一樓上方一道深色鋼構雨遮
 *
 * 座標：整棟放在群組裡，區域座標 lx 沿長邊（從正面看往右為正），lz 往正面為正。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { BOX, GRAD, SPH, basic, block, canvasTex, mk, outline, toon, vText } from '../../../render/kit.js';
import { circC, obbC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { windowWall } from '../../building-kit.js';

const JY = { x: 117.5, z: -20, th: 0.436 };    // 中心、旋轉（rotation.y）
const L = 26, D = 16;                            // 長邊、短邊
const LX0 = -L / 2, LX1 = L / 2, LZB = -D / 2, LZG = D / 2 - 1.6, LZF = D / 2;   // 背面、一樓牆面、二三樓挑出後的正面
const LXM = -3;                                  // 左邊白色高量體和右邊挑出量體的分界
const GF = 3.6, TOP = 13;
const C = { wall: '#e2dccf', ground: '#cbbfae', brown: '#a8957c', brownDark: '#8f7d66', dark: '#3c4148', roof: '#9aa8b5', steel: '#5d6a6a' };
const cs = Math.cos(JY.th), sn = Math.sin(JY.th);
/** 區域座標轉世界座標（和 rotation.y = th 一致） */
const toW = (lx, lz) => [JY.x + lx * cs + lz * sn, JY.z - lx * sn + lz * cs];
const toL = (x, z) => { const dx = x - JY.x, dz = z - JY.z; return [dx * cs - dz * sn, dx * sn + dz * cs]; };

/** 水平帶窗：深色窗框、灰藍玻璃、室內暖光 */
function bandMat(rx) {
  const t = canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#6f8796'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 6, w, 10);
    g.fillStyle = '#e8b86a'; g.fillRect(10, 30, 26, 26); g.fillRect(74, 34, 20, 22);
    g.fillStyle = C.dark; for (let x = 0; x <= w; x += 32) g.fillRect(x, 0, 4, h); g.fillRect(0, 0, w, 3); g.fillRect(0, h - 4, w, 4);
  }, [rx, 1]);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}

function build() {
  const G = new THREE.Group(); G.position.set(JY.x, 0, JY.z); G.rotation.y = JY.th; scene.add(G);
  /** 群組裡的方塊（以區域座標邊界指定），faces = { px, nx, py, ny, pz, nz } */
  const box = (x0, x1, y0, y1, z0, z1, base, faces, out = 0.04) => {
    if (typeof base === 'string') base = toon(base);
    const f = faces || {}, m = new THREE.Mesh(BOX, ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(k => f[k] || base));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.scale.set(x1 - x0, y1 - y0, z1 - z0);
    m.castShadow = m.receiveShadow = true; G.add(m);
    if (out) { const o = outline(m, 0); o.scale.set(1 + 2 * out / (x1 - x0), 1 + 2 * out / (y1 - y0), 1 + 2 * out / (z1 - z0)); }
    return m;
  };
  const sign = (w, h, map, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic({ map, transparent: true })); m.position.set(x, y, z); m.renderOrder = 1; G.add(m); return m; };
  const roof = toon(C.roof);
  const side = windowWall({ style: 'grid', wall: C.wall, glass: '#8fa9b9', frame: '#efeae0', sill: '#d6d0c2' }, 4, 3);

  /* 一樓：整排退縮，書局玻璃店面（左）和餐廳鐵窗（右） */
  box(LX0 + 0.2, LX1 - 0.2, 0, GF, LZB, LZG, C.ground, { py: roof });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(LXM - LX0 - 1.6, 2.6), basic({ color: '#87a2ad' }));
  glass.position.set((LX0 + LXM) / 2 + 0.3, 1.5, LZG + 0.02); G.add(glass);
  for (let x = LX0 + 1; x < LXM; x += 1.4) block(x, 1.5, LZG + 0.05, 0.08, 2.6, 0.06, C.dark, 0, G);
  const bars = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#5d6a72'; g.fillRect(0, 0, w, h); g.fillStyle = '#d9d6cf'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h); g.fillRect(0, 0, w, 4); g.fillRect(0, 30, w, 3); }, [10, 1]);
  const barP = new THREE.Mesh(new THREE.PlaneGeometry(LX1 - LXM - 1.4, 2.2), new THREE.MeshToonMaterial({ map: bars, gradientMap: GRAD }));
  barP.position.set((LXM + LX1) / 2, 1.9, LZG + 0.02); G.add(barP);

  /* 左邊白色高量體：素面白牆，直排「集英樓」，側面與背面有窗 */
  box(LX0, LXM, GF, TOP + 1.6, LZB, LZG - 0.4, C.wall, { nx: side, nz: side, py: roof });
  block((LX0 + LXM) / 2, TOP + 1.75, (LZB + LZG) / 2 - 0.2, LXM - LX0 + 0.3, 0.3, LZG - LZB - 0.1, '#cfc8ba', 0.03, G);
  sign(1.0, 3.4, vText('集英樓', '#6b5a3e', '700 64px "Noto Serif TC","Noto Sans TC",serif', 96, 80), LX0 + 1.5, 10.4, LZG - 0.36);
  for (let y = GF + 0.8; y < TOP; y += 2.8) block(LXM - 0.6, y + 0.6, LZG - 0.36, 1, 1.6, 0.08, '#6f8796', 0.02, G);

  /* 右邊二、三樓挑出：褐色水平帶加整排窗戶，背面一般窗牆 */
  const band = bandMat((LX1 - LXM) / 2.2), bandS = bandMat((LZF - LZB) / 2.2);
  [[GF + 0.9, 6.6], [7.5, 9.6]].forEach(([y0, y1]) => box(LXM, LX1, y0, y1, LZB, LZF - 0.5, C.brown, { pz: band, px: bandS, nz: side }));
  [[GF, GF + 0.9], [6.6, 7.5], [9.6, 10.5]].forEach(([y0, y1]) => block((LXM + LX1) / 2, (y0 + y1) / 2, (LZB + LZF) / 2, LX1 - LXM + 0.3, y1 - y0, LZF - LZB, C.brown, 0.04, G));
  block((LXM + LX1) / 2, 5.5, LZF - 0.08, LX1 - LXM, 0.06, 0.06, '#d9d6cf', 0, G);
  for (let x = LXM + 0.3; x < LX1; x += 0.5) block(x, 5.1, LZF - 0.08, 0.04, 0.8, 0.04, '#d9d6cf', 0, G);
  [LXM + 2.5, LXM + 8, LXM + 12.5].forEach(x => block(x, 5.05, LZF - 0.3, 0.8, 0.55, 0.35, '#e8e6e0', 0.015, G));
  // 屋頂退縮層（模型上的藍灰色屋頂）
  box(LXM + 0.6, LX1 - 0.4, 10.5, TOP, LZB + 0.4, LZF - 3, C.wall, { pz: bandMat(5), py: roof });
  block((LXM + LX1) / 2 + 0.1, TOP + 0.15, (LZB + LZF) / 2 - 1.3, LX1 - LXM - 0.6, 0.3, LZF - LZB - 2.8, '#cfc8ba', 0.03, G);
  // 騎樓柱
  [LXM + 0.6, LXM + 5.6, LXM + 10.6, LX1 - 0.4].forEach(x => block(x, GF / 2, LZF - 0.4, 0.5, GF, 0.5, '#d6cfc1', 0.02, G));

  /* 正面一樓上方的深色鋼構雨遮（模型上的深色長條） */
  block((LX0 + LXM) / 2 - 0.5, GF + 0.1, LZG + 1.2, LXM - LX0 + 1, 0.16, 2.4, C.steel, 0.03, G);

  /* 招牌 */
  const navy = canvasTex(512, 96, (g, w, h) => {
    g.fillStyle = '#1d2a55'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8b06a'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#ffffff'; g.font = '900 64px "Noto Serif TC","Noto Sans TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('集 英 樓 餐 廳', w / 2, h / 2 + 3);
  });
  block(LXM + 5.4, GF - 0.48, LZF - 0.12, 4.6, 0.86, 0.12, '#1d2a55', 0.02, G);
  sign(4.5, 0.82, navy, LXM + 5.4, GF - 0.48, LZF - 0.05);
  const green = canvasTex(512, 96, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#1f7a4a'); gr.addColorStop(0.75, '#3a9a5a'); gr.addColorStop(1, '#8cc63f');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.font = '900 46px "Noto Sans TC",sans-serif'; g.textBaseline = 'middle'; g.fillText('校園書局', 24, 38);
    g.font = '700 22px "Noto Sans TC",sans-serif'; g.fillText('Campus Bookstore', 26, 76);
  });
  block(LX0 + 3.6, GF - 0.45, LZG + 0.1, 5.2, 0.86, 0.12, '#1f7a4a', 0.02, G);
  sign(5.1, 0.82, green, LX0 + 3.6, GF - 0.45, LZG + 0.17);

  /* 黃色矮牆與前面的植栽 */
  block((LXM + 2.6 + LX1 - 0.4) / 2, 0.65, LZF + 0.35, LX1 - LXM - 3, 1.3, 0.3, '#ecc944', 0.03, G);
  for (let x = LXM + 3; x < LX1 - 0.5; x += 1.1) { const s = mk(SPH, toon(['#4f8f3e', '#5c9e45'][Math.round(x) % 2]), x, 0.45, LZF + 0.85, { out: 0.03, parent: G }); s.scale.set(0.5, 0.45, 0.4); }

  /* 書局前的鋼構棚架 */
  const steel = toon('#8e9499');
  const px0 = LX0 - 1.2, px1 = LX0 + 2.6, pz0 = LZG + 0.2, pz1 = LZF + 0.6;
  [[px0, pz1], [px1, pz1]].forEach(([x, z]) => { block(x, 1.5, z, 0.12, 3, 0.12, steel, 0.015, G); circC(...toW(x, z), 0.12); });
  [pz0, pz1].forEach(z => block((px0 + px1) / 2, 3.0, z, px1 - px0 + 0.2, 0.1, 0.1, steel, 0.01, G));
  for (let x = px0; x <= px1 + 0.01; x += 0.95) block(x, 3.05, (pz0 + pz1) / 2, 0.08, 0.08, pz1 - pz0, steel, 0, G);

  /* 碰撞：整棟主體（到一樓牆面），騎樓柱、黃色矮牆 */
  const ob = (x0, x1, z0, z1) => { const [cx, cz] = toW((x0 + x1) / 2, (z0 + z1) / 2); obbC(cx, cz, (x1 - x0) / 2, (z1 - z0) / 2, JY.th); };
  ob(LX0, LX1, LZB, LZG);
  [LXM + 0.6, LXM + 5.6, LXM + 10.6, LX1 - 0.4].forEach(x => circC(...toW(x, LZF - 0.4), 0.3));
  ob(LXM + 2.6, LX1 - 0.4, LZF + 0.2, LZF + 0.5);
}

/** 群組四個角的世界座標（小地圖用） */
const corners = [[LX0, LZB], [LX1, LZB], [LX1, LZF], [LX0, LZF]].map(([x, z]) => toW(x, z));

export default defineBuilding({
  id: 'jiying-hall',
  name: '集英樓',
  build,
  zones: [{ priority: 74, test: p => { const [lx, lz] = toL(p.x, p.z); return (lx > LX0 - 1.5 && lx < LX1 + 1 && lz > LZB - 1 && lz < LZF + 1.2) ? '集英樓' : null; } }],
  map: [{ draw(g, mx, my) {
    g.fillStyle = '#d9cdb6'; g.strokeStyle = '#6b4a2a'; g.lineWidth = 3; g.beginPath();
    corners.forEach(([x, z], i) => i ? g.lineTo(mx(x), my(z)) : g.moveTo(mx(x), my(z))); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#4a3520'; g.font = '700 22px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText('集英樓', mx(JY.x), my(JY.z) + 7);
  } }],
});
