/**
 * 法學院（2025 年啟用的新院館，蓋在憩賢樓原址，地圖 D3）。
 *
 * 外觀重點（對照 photos/）：
 *   - 8 層樓的長條板樓，長邊沿四維道東西向
 *   - 西端窄面：深灰牆，北半部有白色大框，框內兩個橘色凸盒，框頂立「College of LAW」字牌
 *   - 北面：一樓深色退縮加白柱，二三樓玻璃帷幕，白色挑出厚板，上面五層是白色橫線板加橘色直格柵
 *   - 白色挑出平屋頂，屋頂上有深灰色機房
 *   - 北側入口有台階，旁邊是清水混凝土「法學院」石碑
 *
 * 座標：建築自己的座標 lx 往西為正（朝環山一道），lz 往北為正（朝四維道）。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { GRAD, basic, block, canvasTex, hText, plane, toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';

// 建築中心（世界座標）與尺寸
const LAW = { x: -118.5, z: -100 };
const L = 54;          // 東西長
const D = 16;          // 南北寬
const GROUND = 4.5;    // 一樓高度
const BAND = 11.8;     // 白色挑出厚板的頂面高度（二三樓玻璃帷幕在它下面）
const TOP = 26.8;      // 主體頂面（屋頂板在上面）
const FLOOR = 3;       // 上面五層的樓高
const FIN_FROM = -L / 2, FIN_TO = L / 2 - 12;   // 有橘色格柵的範圍（西端 12 公尺是素面灰牆）

// 入口台階（北面）
const STEP = { lx: -4, w: 9 };

const COL = {
  wall: '#666a71', dark: '#43464c', white: '#efefea', fin: '#d4915a', glass: '#a9c2cc', stone: '#c9cac5',
};

/** 灰牆＋窗戶，一格 = 3 公尺寬、一層樓高 */
function windowTex(rx, ry, offY) {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = COL.wall; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f3237'; g.fillRect(22, 34, 84, 66);
    g.fillStyle = '#8fa6b2'; g.fillRect(28, 40, 34, 54); g.fillRect(66, 40, 34, 54);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(28, 40, 34, 10);
  }, [rx, ry]);
  t.offset.y = offY || 0;
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}

/** 二三樓的玻璃帷幕：深色窗框格子 */
function curtainTex(rx, ry) {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#9db8c1'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 0, w, 30);
    g.fillStyle = '#34363b';
    for (let x = 0; x <= w; x += 32) g.fillRect(x - 3, 0, 6, h);
    for (let y = 0; y <= h; y += 42) g.fillRect(0, y - 3, w, 6);
  }, [rx, ry]);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}

/** 六面各自指定材質的方塊：順序 +x(西) -x(東) 上 下 +z(北) -z(南) */
function box6(parent, x, y, z, sx, sy, sz, mats) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mats);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}

/** 「College of LAW」白色立體字牌 */
function lawSignTex() {
  return canvasTex(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.font = '900 64px "Noto Sans TC", Arial, sans-serif';
    g.lineWidth = 10; g.strokeStyle = '#3a3d42'; g.strokeText('College of', w / 2, 62);
    g.fillStyle = '#ffffff'; g.fillText('College of', w / 2, 62);
    g.font = '900 150px Arial, sans-serif';
    g.lineWidth = 14; g.strokeText('LAW', w / 2, 172);
    g.fillText('LAW', w / 2, 172);
  });
}

function build() {
  const G = new THREE.Group();
  G.position.set(LAW.x, 0, LAW.z);
  scene.add(G);
  const W = toon(COL.white), DARK = toon(COL.dark), FIN = toon(COL.fin);

  /* 一樓：深色、往內退縮，前後各一排白柱 */
  block(0, GROUND / 2, 0, L - 3, GROUND, D - 3, DARK, 0.04, G);
  for (let lx = -L / 2 + 2; lx <= L / 2 - 2; lx += 5.5) {
    [1, -1].forEach(s => block(lx, GROUND / 2, s * (D / 2 - 0.7), 0.8, GROUND, 0.8, W, 0.03, G));
  }
  // 北面入口：玻璃門
  block(STEP.lx, 1.6, D / 2 - 1.45, 6, 3.2, 0.12, basic({ color: '#9fb9c4' }), 0, G);
  block(STEP.lx, 3.5, D / 2 - 1.4, 7, 0.5, 0.3, W, 0, G);
  // 入口白色門框，門框上方的白帶寫「College of Law」
  [-1, 1].forEach(s => block(STEP.lx + s * 4.2, GROUND / 2, D / 2 - 0.2, 0.9, GROUND, 1.2, W, 0.03, G));
  const cl = plane(9, 1.1, basic({ map: hText('College of Law', '#ffffff', '900 64px Arial, sans-serif', 1024, 120, 40), transparent: true }), 0, 0, 0);
  scene.remove(cl); cl.position.set(STEP.lx, GROUND + 0.25, D / 2 + 0.32); G.add(cl);

  /* 主體（二樓到頂樓）：灰牆＋窗戶 */
  const H = TOP - GROUND, ry = H / FLOOR, off = Math.ceil(ry) - ry;
  const longWall = windowTex(L / 3, ry, off), endWall = windowTex(D / 3, ry, off);
  const ROOFC = toon('#cfd1cc');
  box6(G, 0, GROUND + H / 2, 0, L, H, D, [toon(COL.dark), endWall, ROOFC, DARK, longWall, longWall]);

  /* 二三樓玻璃帷幕（南北兩面，格柵段）與上方白色挑出厚板 */
  const cw = FIN_TO - FIN_FROM, cmid = (FIN_TO + FIN_FROM) / 2;
  [1, -1].forEach(s => {
    block(cmid, (GROUND + BAND - 0.9) / 2 + 0.2, s * (D / 2 + 0.06), cw, BAND - 0.9 - GROUND - 0.4, 0.1, curtainTex(cw / 4, 2), 0, G);
    block(0, BAND - 0.45, s * (D / 2 + 0.45), L + 0.2, 0.9, 0.9, W, 0.03, G);
    block(0, GROUND + 0.25, s * (D / 2 + 0.15), L, 0.5, 0.3, W, 0, G);
  });

  /* 上面五層：白色橫線板＋橘色直格柵（用 InstancedMesh，手機比較順） */
  const finGeo = new THREE.BoxGeometry(0.28, TOP - BAND, 0.7);
  const fins = [];
  for (let lx = FIN_FROM + 0.8; lx <= FIN_TO - 0.4; lx += 1.6) [1, -1].forEach(s => fins.push([lx, s]));
  const inst = new THREE.InstancedMesh(finGeo, FIN, fins.length);
  const m4 = new THREE.Matrix4();
  fins.forEach(([lx, s], i) => { m4.makeTranslation(lx, (BAND + TOP) / 2, s * (D / 2 + 0.35)); inst.setMatrixAt(i, m4); });
  inst.castShadow = true; inst.receiveShadow = true; G.add(inst);
  [1, -1].forEach(s => {
    for (let y = BAND + FLOOR; y < TOP - 0.1; y += FLOOR) block(cmid, y, s * (D / 2 + 0.4), cw, 0.25, 0.8, W, 0, G);
  });

  /* 屋頂：白色挑出平板，下緣一條深色陰影線，屋頂上兩個機房 */
  block(0, TOP + 0.45, 0, L + 2.2, 0.9, D + 2.2, W, 0.05, G);
  block(0, TOP + 0.02, 0, L + 1.8, 0.1, D + 1.8, toon('#8b8e93'), 0, G);
  block(L / 2 - 4, TOP + 2.6, 2, 5, 3.4, 7, toon('#4a4d52'), 0.04, G);
  block(-6, TOP + 1.9, -1, 9, 2.2, 6, toon('#55585d'), 0.04, G);

  /* 西端：白色大框（北半部）、框內兩個橘色凸盒、框頂字牌 */
  const ex = L / 2 + 0.45, f0 = 0.2, f1 = 7.6;
  [f0, f1].forEach(lz => block(ex, (GROUND + TOP + 2.4) / 2, lz, 0.9, TOP + 2.4 - GROUND, 1, W, 0.03, G));
  block(ex, TOP + 1.9, (f0 + f1) / 2, 0.9, 1, f1 - f0 + 1, W, 0.03, G);
  block(ex, GROUND + 0.5, (f0 + f1) / 2, 0.9, 1, f1 - f0 + 1, W, 0.03, G);
  block(L / 2 + 0.05, (GROUND + TOP) / 2, (f0 + f1) / 2, 0.1, TOP - GROUND, f1 - f0 - 1, windowTex(2, ry, off), 0, G);
  [14.5, 20.5].forEach(y => block(L / 2 + 0.7, y, (f0 + f1) / 2, 1.4, 2.4, 4.6, FIN, 0.03, G));
  const sign = plane(8, 4, basic({ map: lawSignTex(), transparent: true, depthWrite: false }), 0, 0, 0, 0, Math.PI / 2);
  scene.remove(sign); sign.position.set(ex + 0.1, TOP + 4.6, (f0 + f1) / 2); G.add(sign);
  // 西端南半部：二樓的玻璃欄杆陽台
  block(L / 2 + 1, GROUND + 0.6, -4, 2, 0.15, 7.6, W, 0, G);
  block(L / 2 + 1.95, GROUND + 1.15, -4, 0.08, 1, 7.6, basic({ color: '#7fc8c4', transparent: true, opacity: 0.55 }), 0, G);

  /* 北側入口：台階與「法學院」石碑 */
  block(STEP.lx, 0.15, D / 2 + 0.6, STEP.w, 0.3, 2.4, toon('#b9b7b0'), 0.02, G);
  block(STEP.lx, 0.3, D / 2 - 0.3, STEP.w, 0.6, 1.2, toon('#c4c2bb'), 0.02, G);
  const stoneX = STEP.lx - 9;
  block(stoneX, 1.3, D / 2 + 3.2, 7, 2.6, 0.7, COL.stone, 0.03, G);
  const word = plane(5.6, 1.9, basic({ map: hText('法學院', '#7a5e3a', '900 150px "Noto Serif TC", "Noto Sans TC", serif', 640, 220, 110), transparent: true }), 0, 0, 0);
  scene.remove(word); word.position.set(stoneX, 1.3, D / 2 + 3.56); G.add(word);

  /* 碰撞：整棟外框；石碑另外一塊 */
  boxC(LAW.x - L / 2 - 1, LAW.x + L / 2 + 1, LAW.z - D / 2 - 0.5, LAW.z + D / 2 + 0.5);
  boxC(LAW.x + stoneX - 3.6, LAW.x + stoneX + 3.6, LAW.z + D / 2 + 2.8, LAW.z + D / 2 + 3.6);
}

export default defineBuilding({
  id: 'law-school',
  name: '法學院',
  build,
  // 入口台階可以走上去
  heightAt(x, z) {
    const lx = x - LAW.x, lz = z - LAW.z;
    if (Math.abs(lx - STEP.lx) < STEP.w / 2 && lz > D / 2 - 0.9 && lz <= D / 2 + 1.8) return lz > D / 2 - 0.1 ? 0.3 : 0.6;
    return null;
  },
  zones: [{ priority: 75, test: p => (Math.abs(p.x - LAW.x) < L / 2 + 2 && Math.abs(p.z - LAW.z) < D / 2 + 5) ? '法學院' : null }],
  map: [{ x: LAW.x, z: LAW.z, w: L, d: D, color: '#d9b38a', label: '法學院' }],
});
