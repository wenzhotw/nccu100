/**
 * 學思樓（商學院旁，八德道與指南路之間）。
 * 位置與大小沿用原本的預定地 (-62, -2)，14 × 12 公尺；入口朝八德道（-z）。
 * 外觀參考 OpenNCCU 3D 模型：4 層樓、暖灰褐色牆、平屋頂；二樓以上是 ㄇ 字形，
 * 中間朝指南路那一側凹進去，一樓屋頂是小小的屋頂花園；入口有淺色雨遮。
 */
import { block, flat, toon } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { ROOFTOP, faceBox, nameSign, windowBlock } from '../../building-kit.js';
import { tree } from '../../vegetation.js';

const X = -62, Z = -2, W = 14, D = 12;
const X0 = X - W / 2, X1 = X + W / 2, ZF = Z - D / 2, ZB = Z + D / 2;   // ZF 正面（八德道側）、ZB 背面（指南路側）
const GF = 3.6, FL = 3.2, TOP = GF + FL * 3;                            // 一樓、二到四樓、屋頂高度
const C = { wall: '#d3c8bb', band: '#e9e4dc', glass: '#93abb8', base: '#a99d90', garden: '#7fb35c' };
const WALL = { style: 'grid', wall: C.wall, glass: C.glass, frame: C.band, sill: '#c2b6a8' };
const WING = 4.2, COURT_D = 6;                                          // ㄇ 字兩翼寬、中庭深

function build() {
  /* 一樓：完整量體，正面是玻璃入口 */
  windowBlock(X0, X1, 0, GF, ZF, ZB, { ...WALL, style: 'band', wall: C.base }, 3.5, 1);
  /* 二到四樓：ㄇ 字形（兩翼加正面橫棟），中庭朝指南路 */
  windowBlock(X0, X1, GF, TOP, ZF, ZB - COURT_D, WALL, 3.5, 3);
  windowBlock(X0, X0 + WING, GF, TOP, ZB - COURT_D, ZB, WALL, 3.5, 3);
  windowBlock(X1 - WING, X1, GF, TOP, ZB - COURT_D, ZB, WALL, 3.5, 3);
  // 每層樓之間的淺色飾帶與屋頂女兒牆
  for (let k = 1; k <= 3; k++) block(X, GF + FL * k - 0.1, ZF - 0.05, W + 0.1, 0.2, 0.12, C.band, 0);
  [[X, ZF + 0.15, W + 0.3, 0.3], [X0 + 0.15, Z, 0.3, D + 0.3], [X1 - 0.15, Z, 0.3, D + 0.3]].forEach(([x, z, w, d]) => block(x, TOP + 0.4, z, w, 0.8, d, C.band, 0.03));
  [X0 + WING - 0.15, X1 - WING + 0.15].forEach(x => block(x, TOP + 0.4, ZB - COURT_D / 2, 0.3, 0.8, COURT_D, C.band, 0.03));
  block(X, TOP + 0.4, ZB - COURT_D - 0.15, W - 2 * WING, 0.8, 0.3, C.band, 0.03);
  // 屋頂設備：水塔與兩個小機房
  block(X0 + 2.5, TOP + 1.1, ZF + 2.2, 2.4, 2.2, 2.4, '#c9c3ba', 0.04);
  block(X1 - 2.4, TOP + 0.8, ZF + 2.4, 2.2, 1.6, 1.6, '#c9c3ba', 0.03);
  /* 一樓屋頂花園（中庭） */
  faceBox(X0 + WING, X1 - WING, GF, GF + 0.35, ZB - COURT_D, ZB, ROOFTOP, null, 0.02);
  block(X, GF + 0.45, ZB - COURT_D / 2, W - 2 * WING - 0.8, 0.2, COURT_D - 0.8, C.garden, 0);
  [-1.6, 0, 1.6].forEach(dx => block(X + dx, GF + 0.75, ZB - 1.2, 0.9, 0.5, 0.9, '#5cb150', 0.02));
  block(X, GF + 0.95, ZB - 0.1, W - 2 * WING, 0.9, 0.12, '#dfe6e8', 0.01);   // 中庭欄杆
  /* 入口：雨遮、門、招牌 */
  block(X, GF - 0.35, ZF - 1.4, 6.4, 0.25, 2.8, C.band, 0.04);
  [-2.9, 2.9].forEach(dx => { block(X + dx, (GF - 0.5) / 2, ZF - 2.6, 0.25, GF - 0.5, 0.25, '#d9d6cf', 0.02); circC(X + dx, ZF - 2.6, 0.2); });
  block(X, 1.25, ZF - 0.04, 3.2, 2.5, 0.08, '#4f6370', 0.01);
  block(X, 1.25, ZF - 0.09, 0.08, 2.5, 0.06, '#d9d6cf', 0);
  nameSign('學思樓', X, GF + 0.7, ZF - 0.07, '-z', { w: 3.6, h: 1.0, color: '#4a3f33' });
  // 入口前的石磚地與兩側花台
  flat(6.4, 3, '#c8c2b6', X, 0.03, ZF - 1.5);
  [-4.6, 4.6].forEach(dx => { block(X + dx, 0.3, ZF - 0.9, 2.6, 0.6, 1.2, '#bdb3a3', 0.03); block(X + dx, 0.7, ZF - 0.9, 2.3, 0.3, 0.9, '#5cb150', 0.02); });
  tree(X0 - 2, ZB - 1, 0.9); tree(X1 + 2, ZB - 1.5, 0.85);
  /* 碰撞 */
  boxC(X0, X1, ZF, ZB);
  [-4.6, 4.6].forEach(dx => boxC(X + dx - 1.3, X + dx + 1.3, ZF - 1.5, ZF));
}

export default defineBuilding({
  id: 'xuesi-hall',
  name: '學思樓',
  build,
  zones: [{ priority: 76, test: p => (Math.abs(p.x - X) < W / 2 + 2 && p.z > ZF - 2.6 && p.z < ZB + 2) ? '學思樓' : null }],
  map: [{ x: X, z: Z, w: W, d: D, color: '#d3c8bb', label: '學思樓' }],
});
