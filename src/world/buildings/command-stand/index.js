/**
 * 司令台（田徑場旁的看台），對照 photos/。
 *
 * 外觀重點：
 *   - 大片挑出的平屋頂，屋簷正面藍底、中間一條紅色長板、兩端彩繪
 *   - 屋頂下井字形樑格，四根白柱
 *   - 一樓器材室（鐵窗、中間一扇門），二樓是五階看台，中間牆面掛 NCCU 布條
 *   - 兩側各一座樓梯可以走上看台，前緣有不鏽鋼欄杆
 *
 * 區域座標：原點在看台前緣中央，-z 朝跑道，+z 朝停車場（行政大樓那側）。
 * 跟田徑場同一個方向（th = -1.25），位置在跑道直道外側。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { basic, block, canvasTex, plane, toon } from '../../../render/kit.js';
import { colliders } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';

const ST = { x: 57.23, z: -118.43, th: -1.25 };
const DECK = 3.2;                // 看台平台高度
const TIER = { n: 5, rise: 0.45, depth: 1.3, z0: 1.5 };
const STAIR = { x0: 10, x1: 12, zTop: 0.5, zBot: 8, steps: 8 };
const ROOF = { y: 10.2, w: 24, z0: -4, z1: 9 };

const cs = Math.cos(ST.th), sn = Math.sin(ST.th);
const toWorld = (lx, lz) => [ST.x + lx * cs + lz * sn, ST.z - lx * sn + lz * cs];
const toLocal = (x, z) => { const dx = x - ST.x, dz = z - ST.z; return [dx * cs - dz * sn, dx * sn + dz * cs]; };
/** 區域座標的方形碰撞；top 有值時，站得比 top 高就不會被擋（看台上可以走） */
function obb(x0, x1, z0, z1, top) {
  const [cx, cz] = toWorld((x0 + x1) / 2, (z0 + z1) / 2);
  colliders.push({ obb: true, cx, cz, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2, cs, sn, top });
}

/** 屋簷正面：藍底、紅色長板、兩端彩繪（原創圖樣） */
function fasciaTex() {
  return canvasTex(1024, 64, (g, w, h) => {
    g.fillStyle = '#2f4f9e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(150, h / 2); g.lineTo(175, 6); g.lineTo(w - 175, 6); g.lineTo(w - 150, h / 2); g.lineTo(w - 175, h - 6); g.lineTo(175, h - 6); g.closePath(); g.fill();
    g.fillStyle = '#e03a3e'; g.beginPath(); g.moveTo(158, h / 2); g.lineTo(180, 10); g.lineTo(w - 180, 10); g.lineTo(w - 158, h / 2); g.lineTo(w - 180, h - 10); g.lineTo(180, h - 10); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,0,10,.35)'; g.lineWidth = 2; for (let x = 200; x < w - 190; x += 28) { g.beginPath(); g.moveTo(x, 12); g.lineTo(x, h - 12); g.stroke(); }
    // 兩端彩繪：圓形花朵和捲草
    [70, w - 70].forEach(cx => {
      const cols = ['#e03a3e', '#f2c33d', '#3fa66b', '#59b7e8', '#ffffff'];
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.fillStyle = cols[i % 5]; g.beginPath(); g.ellipse(cx + Math.cos(a) * 30, h / 2 + Math.sin(a) * 14, 16, 9, a, 0, 7); g.fill(); }
      g.fillStyle = '#f2c33d'; g.beginPath(); g.arc(cx, h / 2, 11, 0, 7); g.fill();
      g.fillStyle = '#e03a3e'; g.beginPath(); g.arc(cx, h / 2, 5, 0, 7); g.fill();
    });
  });
}
/** 一樓正面：米色牆、四扇鐵窗、中間一扇門 */
function groundFrontTex() {
  return canvasTex(512, 96, (g, w, h) => {
    g.fillStyle = '#ece3cf'; g.fillRect(0, 0, w, h);
    const win = x => { g.fillStyle = '#3c4148'; g.fillRect(x, 26, 54, 44); g.strokeStyle = '#d9d4c6'; g.lineWidth = 3; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x + i * 11, 26); g.lineTo(x + i * 11, 70); g.stroke(); } g.beginPath(); g.moveTo(x, 48); g.lineTo(x + 54, 48); g.stroke(); };
    [70, 150, 310, 390].forEach(win);
    g.fillStyle = '#25282c'; g.fillRect(226, 18, 60, h - 18);
  });
}
/** 中間牆面的布條：白底、NCCU 字樣、紅黑色的抽象校徽（原創圖樣） */
function bannerTex() {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#f7f6f2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1e2026'; g.font = '900 72px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('NCCU', w / 2, 92);
    g.fillStyle = '#1e2026'; g.beginPath(); g.moveTo(w / 2, 120); g.lineTo(w / 2 + 62, 150); g.lineTo(w / 2 + 50, 240); g.lineTo(w / 2, 290); g.lineTo(w / 2 - 50, 240); g.lineTo(w / 2 - 62, 150); g.closePath(); g.fill();
    g.fillStyle = '#c8323a'; g.beginPath(); g.moveTo(w / 2, 140); g.lineTo(w / 2 + 44, 162); g.lineTo(w / 2 + 34, 232); g.lineTo(w / 2, 270); g.lineTo(w / 2 - 34, 232); g.lineTo(w / 2 - 44, 162); g.closePath(); g.fill();
    g.fillStyle = '#f7f6f2'; g.beginPath(); g.moveTo(w / 2 - 6, 160); g.quadraticCurveTo(w / 2 + 30, 200, w / 2 - 4, 252); g.quadraticCurveTo(w / 2 + 6, 205, w / 2 - 20, 175); g.closePath(); g.fill();
  });
}

function build() {
  const G = new THREE.Group(); G.position.set(ST.x, 0, ST.z); G.rotation.y = ST.th; scene.add(G);
  const CREAM = toon('#ece3cf'), WHITE = toon('#f3f1ea'), CON = toon('#d9d6cc'), STEEL = toon('#cfd4d8');
  const facePlane = (w, h, mat, x, y, z, ry) => { const p = plane(w, h, mat, 0, 0, 0, 0, ry || 0); scene.remove(p); p.position.set(x, y, z); G.add(p); return p; };

  /* 一樓器材室與看台平台 */
  block(0, DECK / 2, 4.75, 18, DECK, 6.5, CREAM, 0.04, G);
  facePlane(18, DECK, basic({ map: groundFrontTex() }), 0, DECK / 2, 1.49, Math.PI);
  block(0, DECK - 0.15, 0.75, 20.4, 0.3, 1.5, CON, 0.03, G);
  block(0, DECK - 0.45, 0.05, 20.4, 0.5, 0.18, CREAM, 0.02, G);
  /* 五階看台 */
  for (let i = 1; i <= TIER.n; i++) {
    const z = TIER.z0 + (i - 0.5) * TIER.depth;
    block(0, DECK + i * TIER.rise / 2, z, 18, i * TIER.rise, TIER.depth, i % 2 ? '#e3dfd3' : '#d8d4c8', 0.01, G);
  }
  /* 後牆與中間的布條牆 */
  const topTier = DECK + TIER.n * TIER.rise;
  block(0, (ROOF.y + 0) / 2, 8.2, 20, ROOF.y, 0.4, CREAM, 0.03, G);
  block(0, (topTier + ROOF.y) / 2, 6.8, 4.6, ROOF.y - topTier, 2.6, CREAM, 0.03, G);
  facePlane(3.2, 4, basic({ map: bannerTex() }), 0, topTier + 2.7, 5.48, Math.PI);
  facePlane(3.4, 0.8, toon('#d9727c'), 0, topTier + 0.5, 5.48, Math.PI);
  /* 四根白柱 */
  [-9.4, -4.4, 4.4, 9.4].forEach(x => block(x, (DECK + ROOF.y) / 2, 0.6, 0.8, ROOF.y - DECK, 0.8, WHITE, 0.03, G));
  /* 屋頂、井字樑格、屋簷 */
  const rd = ROOF.z1 - ROOF.z0, rc = (ROOF.z0 + ROOF.z1) / 2;
  block(0, ROOF.y + 0.3, rc, ROOF.w, 0.6, rd, toon('#e8e4da'), 0.05, G);
  [-2, 1, 4, 7].forEach(z => block(0, ROOF.y - 0.2, z, ROOF.w - 0.4, 0.4, 0.35, CREAM, 0, G));
  [-8, -4, 0, 4, 8].forEach(x => block(x, ROOF.y - 0.2, rc, 0.35, 0.4, rd - 0.4, CREAM, 0, G));
  block(0, ROOF.y + 0.35, ROOF.z0 - 0.15, ROOF.w + 0.3, 1.3, 0.3, toon('#2f4f9e'), 0.04, G);
  facePlane(ROOF.w + 0.2, 1.2, basic({ map: fasciaTex() }), 0, ROOF.y + 0.35, ROOF.z0 - 0.31, Math.PI);
  /* 兩側樓梯（後面從地面上去，走到前緣平台） */
  const sw = STAIR.x1 - STAIR.x0, sx = (STAIR.x0 + STAIR.x1) / 2, sd = (STAIR.zBot - STAIR.zTop) / STAIR.steps;
  [-1, 1].forEach(s => {
    for (let i = 1; i <= STAIR.steps; i++) {
      const h = i * DECK / STAIR.steps, z = STAIR.zBot - (i - 0.5) * sd;
      block(s * sx, h / 2, z, sw, h, sd, i % 2 ? '#e6e2d6' : '#dbd7cb', 0.01, G);
    }
    block(s * sx, DECK / 2, 0.25, sw, DECK, 0.5, CON, 0.02, G);
    // 外側扶手（斜的）
    const len = Math.hypot(STAIR.zBot - STAIR.zTop, DECK), rail = block(s * (STAIR.x1 - 0.05), DECK / 2 + 1, (STAIR.zBot + STAIR.zTop) / 2, 0.08, 0.08, len, STEEL, 0.01, G);
    rail.rotation.x = Math.atan2(DECK, STAIR.zBot - STAIR.zTop);
    for (let z = STAIR.zTop; z <= STAIR.zBot; z += 1.5) { const h = DECK * (STAIR.zBot - z) / (STAIR.zBot - STAIR.zTop); block(s * (STAIR.x1 - 0.05), h + 0.5, z, 0.06, 1, 0.06, STEEL, 0, G); }
  });
  /* 前緣欄杆 */
  [0.55, 1.05].forEach(y => block(0, DECK + y, 0.08, 24, 0.07, 0.07, STEEL, 0.01, G));
  for (let x = -12; x <= 12.01; x += 1.2) block(x, DECK + 0.55, 0.08, 0.05, 1.1, 0.05, STEEL, 0, G);

  /* 碰撞 */
  obb(-STAIR.x0, STAIR.x0, 0, 8, DECK);          // 一樓器材室（站上看台後不會被擋）
  obb(-12.2, 12.2, -0.05, 0.12);                  // 前緣欄杆
  [-1, 1].forEach(s => obb(s * STAIR.x1, s * STAIR.x1 + s * 0.15, 0, 8)); // 樓梯外側扶手
  obb(-10, 10, 8, 8.4);                           // 後牆
  obb(-2.3, 2.3, 5.5, 8.1);                       // 中間布條牆
  [-9.4, -4.4, 4.4, 9.4].forEach(x => obb(x - 0.4, x + 0.4, 0.2, 1));
}

export default defineBuilding({
  id: 'command-stand',
  name: '司令台',
  build,
  // 看台、前緣平台、兩側樓梯都可以走上去
  heightAt(x, z) {
    const [lx, lz] = toLocal(x, z), ax = Math.abs(lx);
    if (ax <= STAIR.x0 && lz >= 0 && lz <= TIER.z0) return DECK;
    if (ax <= 9 && lz > TIER.z0 && lz < 8) return DECK + TIER.rise * Math.min(TIER.n, Math.ceil((lz - TIER.z0) / TIER.depth));
    if (ax > STAIR.x0 && ax <= STAIR.x1 && lz >= 0 && lz <= STAIR.zBot) {
      if (lz <= STAIR.zTop) return DECK;
      return DECK / STAIR.steps * Math.min(STAIR.steps, Math.ceil((STAIR.zBot - lz) / ((STAIR.zBot - STAIR.zTop) / STAIR.steps)));
    }
    return null;
  },
  zones: [{ priority: 45, test: p => { const [lx, lz] = toLocal(p.x, p.z); return (Math.abs(lx) < 13 && lz > -1 && lz < 10) ? '司令台' : null; } }],
  map: [{ x: ST.x, z: ST.z, w: 6, d: 6, color: '#e03a3e', label: '' }],
});
