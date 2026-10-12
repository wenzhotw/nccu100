/**
 * 電算中心與資訊大樓（地圖 A14、B14），兩棟連在一起，當成一個建築群。
 *
 * 外觀重點（對照 photos/）：
 *   電算中心塔樓（西側，約 8 層）
 *     - 正面朝南，一樓退縮有柱子和玻璃門，前面有台階
 *     - 二樓一圈帶狀窗，中段白色磁磚實牆，中間灰色石框，框內四扇窗與兩個菱形
 *     - 頂部兩層往內退，有格柵窗；最上方中央凸起的帽頂，帽頂下有通風格柵
 *     - 東側一根半圓柱，上方有扇形窗
 *   連接翼（四層，正面是一層層的開放走廊）
 *   資訊大樓（東北端，頂上「資訊大樓」四個字，屋頂一個圓形水塔）
 *
 * 座標：各部位的區域座標 lx 往西為正，lz 往北為正；正面（南）是 -lz。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { GRAD, basic, block, canvasTex, hText, mk, plane, toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';

// 三個部位的中心（世界座標）與尺寸
const TOWER = { x: 64, z: -30, w: 18, d: 16 };
const WING = { x: 51, z: -25, w: 8, d: 9, h: 13 };
const INFO = { x: 40, z: -17, w: 14, d: 12, h: 15.5 };
const STEPS = { w: 12, depth: 3.6 };   // 塔樓正面台階

const C = { tile: '#e9eae7', trim: '#a9a8a2', dark: '#3a3d42', glass: '#9eb6c0', shadow: '#d9d8d2' };

/** 白色馬賽克磁磚（很淡的格紋，讓大片白牆不會太空） */
function tileMat(rx, ry) {
  const t = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = C.tile; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(150,150,140,.12)';
    for (let i = 0; i < w; i += 8) { g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); }
  }, [rx, ry]);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}

/** 一排窗戶（白牆上的深色窗框），一格 = 3 公尺寬、3 公尺高 */
function windowRowMat(rx, ry) {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = C.tile; g.fillRect(0, 0, w, h);
    g.fillStyle = C.dark; g.fillRect(14, 40, 100, 56);
    g.fillStyle = C.glass; g.fillRect(20, 46, 42, 44); g.fillRect(66, 46, 42, 44);
    g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(20, 46, 88, 10);
  }, [rx, ry]);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}

/** 連接翼正面：一層層的開放走廊（白色樓板＋深色走廊＋藍色欄杆） */
function corridorMat(rx, ry) {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#4b4f55'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7d8a94'; g.fillRect(0, 30, w, 44);
    g.fillStyle = '#5c86b8'; g.fillRect(0, 74, w, 8);
    g.fillStyle = '#e9e8e3'; g.fillRect(0, 82, w, 46);
    g.fillStyle = '#cfcfca'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 6, 82);
  }, [rx, ry]);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}

/** 菱形裝飾（轉 45 度的小方塊） */
function diamond(parent, x, y, z) {
  const m = block(x, y, z, 1.1, 1.1, 0.25, C.trim, 0.02, parent);
  m.rotation.z = Math.PI / 4;
}

function buildTower() {
  const G = new THREE.Group(); G.position.set(TOWER.x, 0, TOWER.z); scene.add(G);
  const { w: W, d: D } = TOWER, F = -D / 2;   // F = 正面的 lz
  const TILE = tileMat(W / 2, 8), TRIM = toon(C.trim);

  /* 一樓：退縮的玻璃門廳、柱子、石材基座 */
  block(0, 2.1, 1, W - 3, 4.2, D - 3, toon('#5d6168'), 0.03, G);
  block(0, 1.8, F + 1.56, 8, 3, 0.1, basic({ color: C.glass }), 0, G);
  block(-6, 1.8, F + 1.56, 2.6, 3, 0.1, basic({ color: '#7fa7b5' }), 0, G);
  [-W / 2 + 0.6, -3.4, 3.4, W / 2 - 0.6].forEach(lx => block(lx, 2.1, F + 0.6, 1.1, 4.2, 1.1, TILE, 0.03, G));
  block(0, 0.4, F + 1.2, W, 0.8, 0.5, toon('#8d8c86'), 0.02, G);
  /* 二樓：帶狀窗，上面一道灰色石材線板 */
  block(0, 5.9, 0, W, 3.4, D, windowRowMat(W / 3, 1), 0.04, G);
  block(0, 7.75, 0, W + 0.6, 0.3, D + 0.6, TRIM, 0.02, G);
  /* 中段：白色實牆，正面灰色石框、四扇窗、兩個菱形 */
  block(0, 13.3, 0, W, 11, D, TILE, 0.05, G);
  const fz = F - 0.05;
  [[-3.3, 0.4], [3.3, 0.4]].forEach(([lx]) => block(lx, 13.3, fz, 0.6, 8.6, 0.25, TRIM, 0.02, G));
  [8.7, 17.9].forEach(y => block(0, y, fz, 7.2, 0.6, 0.25, TRIM, 0.02, G));
  block(0, 13.3, fz, 0.15, 8, 0.15, toon(C.shadow), 0, G);
  const win = basic({ color: '#7f9aa6' });
  [[-1.6, 16], [1.6, 16], [-1.6, 10.8], [1.6, 10.8]].forEach(([lx, y]) => {
    block(lx, y, fz - 0.02, 2.2, 2.2, 0.12, toon(C.dark), 0, G);
    block(lx, y + 0.1, fz - 0.06, 1.9, 1.7, 0.06, win, 0, G);
  });
  diamond(G, -1.6, 13.4, fz - 0.1); diamond(G, 1.6, 13.4, fz - 0.1);
  block(0, 18.95, 0, W + 0.6, 0.3, D + 0.6, TRIM, 0.02, G);
  /* 頂部兩層：往內退，前面三個格柵框 */
  block(0, 22.3, 1.2, W, 6.4, D - 2.4, windowRowMat(W / 3, 2), 0.04, G);
  [-W / 2 + 0.6, -3, 3, W / 2 - 0.6].forEach(lx => block(lx, 22.3, F + 0.6, 1.2, 6.4, 1.2, TILE, 0.03, G));
  block(0, 21.8, F + 0.7, W, 0.9, 1.3, TILE, 0.02, G);
  for (let lx = -1.5; lx <= 1.5; lx += 1.5) block(lx, 23.3, F + 1.2, 0.35, 3.4, 0.35, TILE, 0, G);
  block(0, 25.65, 0, W, 0.7, D, TILE, 0.04, G);
  /* 帽頂：中央凸起的方塊，下緣通風格柵，上緣挑出的蓋板 */
  block(0, 27.3, 0, 7, 2.6, D - 4, TILE, 0.04, G);
  block(0, 26.5, F + 2 - 0.06, 6, 0.6, 0.1, toon('#55585d'), 0, G);
  block(0, 28.85, 0, 8.2, 0.5, D - 2.8, TILE, 0.04, G);
  /* 東南角的圓柱：整棟高，頂端扇形窗，下面一個圓形裝飾 */
  const CX = -W / 2 - 0.6, CZ = F + 2.4, CR = 2.2;
  mk(new THREE.CylinderGeometry(CR, CR, 27.4, 24), TILE, CX, 13.7, CZ, { parent: G, out: 0.04 });
  block(CX, 27.5, CZ, CR * 2 + 0.3, 0.3, CR * 2 + 0.3, TRIM, 0.02, G);
  const fan = canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#8a8983';
    g.beginPath(); g.moveTo(w / 2, h - 6); g.arc(w / 2, h - 6, 120, Math.PI * 1.22, Math.PI * 1.78); g.closePath(); g.fill();
    g.fillStyle = '#3f5560'; g.beginPath(); g.moveTo(w / 2, h - 14); g.arc(w / 2, h - 14, 104, Math.PI * 1.25, Math.PI * 1.75); g.closePath(); g.fill();
  });
  const fp = plane(2.6, 2.6, basic({ map: fan, transparent: true }), 0, 0, 0, 0, Math.PI);
  scene.remove(fp); fp.position.set(CX, 23.6, CZ - CR - 0.02); G.add(fp);
  mk(new THREE.TorusGeometry(0.42, 0.12, 8, 20), TRIM, CX, 21.6, CZ - CR - 0.05, { parent: G });
  /* 西側：較低的階梯量體 */
  block(W / 2 + 2.5, 8.5, 2, 5, 17, D - 4, windowRowMat(4, 5), 0.04, G);
  /* 正面台階 */
  for (let i = 0; i < 3; i++) block(0, 0.1 * (i + 1), F - (STEPS.depth - i * 1.2) / 2, STEPS.w, 0.2 * (i + 1), STEPS.depth - i * 1.2, toon('#b9b7b0'), 0.01, G);
  /* 「電子計算機中心」石牌 */
  block(-8.5, 0.9, F - 5.5, 4.4, 1.6, 0.4, toon('#d5d4cf'), 0.02, G);
  const sign = plane(4, 0.9, basic({ map: hText('電子計算機中心', '#2f4f7a', '900 72px "Noto Sans TC", sans-serif', 720, 130, 50), transparent: true }), 0, 0, 0, 0, Math.PI);
  scene.remove(sign); sign.position.set(-8.5, 1, F - 5.72); G.add(sign);
}

function buildWing() {
  const G = new THREE.Group(); G.position.set(WING.x, 0, WING.z); scene.add(G);
  const { w, d, h } = WING;
  const front = corridorMat(w / 3, h / 3.2), side = windowRowMat(d / 3, h / 3.2), roof = toon('#d7d6d0');
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roof, roof, side, front]);
  m.position.y = h / 2; m.castShadow = m.receiveShadow = true; G.add(m);
  block(0, h + 0.3, 0, w + 0.4, 0.6, d + 0.4, tileMat(w / 2, 1), 0.03, G);
}

function buildInfo() {
  const G = new THREE.Group(); G.position.set(INFO.x, 0, INFO.z); scene.add(G);
  const { w, d, h } = INFO;
  block(0, (h - 4) / 2, 0, w, h - 4, d, windowRowMat(w / 3, (h - 4) / 3), 0.05, G);
  // 頂上的實牆帶，正面寫「資訊大樓」
  block(0, h - 2, 0, w, 4, d, tileMat(w / 2, 2), 0.05, G);
  block(0, h + 0.15, 0, w + 0.4, 0.3, d + 0.4, toon(C.trim), 0.02, G);
  const word = plane(9.5, 2.2, basic({ map: hText('資訊大樓', '#3e4248', '900 150px "Noto Serif TC", "Noto Sans TC", serif', 900, 210, 90), transparent: true }), 0, 0, 0, 0, Math.PI);
  scene.remove(word); word.position.set(0, h - 1.9, -d / 2 - 0.05); G.add(word);
  // 屋頂的圓形水塔
  mk(new THREE.CylinderGeometry(2.4, 2.4, 1.6, 24), tileMat(4, 1), w / 2 - 3, h + 1.1, -1, { parent: G, out: 0.04 });
  mk(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 12), toon('#c9c8c2'), w / 2 - 3, h + 0.6, -1, { parent: G });
  // 一樓入口
  block(-2, 1.5, -d / 2 - 0.05, 4, 3, 0.1, basic({ color: C.glass }), 0, G);
}

function build() {
  buildTower(); buildWing(); buildInfo();
  const box = (o, pad) => boxC(o.x - o.w / 2 - pad, o.x + o.w / 2 + pad, o.z - o.d / 2 - pad, o.z + o.d / 2 + pad);
  box(TOWER, 0.3); box(WING, 0.2); box(INFO, 0.2);
  boxC(TOWER.x + TOWER.w / 2, TOWER.x + TOWER.w / 2 + 5, TOWER.z - TOWER.d / 2 + 2, TOWER.z + TOWER.d / 2);   // 西側階梯量體
  boxC(TOWER.x - TOWER.w / 2 - 3, TOWER.x - TOWER.w / 2, TOWER.z - TOWER.d / 2 + 0.2, TOWER.z - TOWER.d / 2 + 4.6); // 東南角圓柱
  boxC(TOWER.x - 8.5 - 2.3, TOWER.x - 8.5 + 2.3, TOWER.z - TOWER.d / 2 - 5.8, TOWER.z - TOWER.d / 2 - 5.2);     // 石牌
}

export default defineBuilding({
  id: 'computer-center',
  name: '電算中心與資訊大樓',
  build,
  // 塔樓正面三階台階
  heightAt(x, z) {
    const lx = x - TOWER.x, lz = z - TOWER.z, F = -TOWER.d / 2;
    if (Math.abs(lx) > STEPS.w / 2 || lz > F || lz < F - STEPS.depth) return null;
    const k = Math.floor((lz - (F - STEPS.depth)) / 1.2);   // 0, 1, 2
    return 0.2 + Math.min(2, Math.max(0, k)) * 0.2;
  },
  zones: [
    { priority: 72, test: p => (Math.abs(p.x - TOWER.x) < TOWER.w / 2 + 4 && p.z > TOWER.z - TOWER.d / 2 - 5 && p.z < TOWER.z + TOWER.d / 2 + 2) ? '電算中心' : null },
    { priority: 73, test: p => (p.x > INFO.x - INFO.w / 2 - 2 && p.x < WING.x + WING.w / 2 && p.z > TOWER.z - 4 && p.z < INFO.z + INFO.d / 2 + 1) ? '資訊大樓' : null },
  ],
  map: [
    { x: TOWER.x, z: TOWER.z, w: TOWER.w, d: TOWER.d, color: '#ecebe6', label: '電算中心' },
    { x: WING.x, z: WING.z, w: WING.w, d: WING.d, color: '#ecebe6' },
    { x: INFO.x, z: INFO.z, w: INFO.w, d: INFO.d, color: '#ecebe6', label: '資訊大樓' },
  ],
});
