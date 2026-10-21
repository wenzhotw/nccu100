/**
 * 風雩樓（福利社，四維堂後方）。
 * 位置沿用原本的預定地 (0, -117)；量體縮成 24 × 15 公尺，和四維堂背面之間留約 4 公尺走道。
 * 正面朝四維堂（+z）。外觀參考 OpenNCCU 3D 模型：2 層樓的方正平頂建築、淺米白牆，
 * 正面一道青綠色雨遮，靠四維堂東側車道那一邊有一排綠色屋頂的有頂走廊。
 */
import { block, flat } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { nameSign, windowBlock } from '../../building-kit.js';

const X = 0, Z = -118.5, W = 24, D = 15;
const X0 = X - W / 2, X1 = X + W / 2, ZB = Z - D / 2, ZF = Z + D / 2;   // ZF 正面（+z，四維堂側）
const GF = 3.6, TOP = GF + 3.4;
const C = { wall: '#efece5', base: '#d6d1c6', band: '#c9c4b8', glass: '#8fb0bf', teal: '#5fae9f', green: '#5e9a62', post: '#8a8f86' };

function build() {
  windowBlock(X0, X1, 0, GF, ZB, ZF, { style: 'band', wall: C.base, glass: C.glass, frame: '#e9e6de', sill: C.band }, 4, 1);
  windowBlock(X0, X1, GF, TOP, ZB, ZF, { style: 'grid', wall: C.wall, glass: C.glass, frame: '#f4f4ee', sill: C.band }, 4, 1);
  block(X, TOP + 0.35, Z, W + 0.3, 0.7, D + 0.3, C.band, 0.04);                 // 女兒牆
  block(X + 5, TOP + 1.0, Z - 3, 3, 1.4, 3, '#d6d1c6', 0.03);                    // 屋頂機房
  block(X - 6, TOP + 0.9, Z + 2, 1.6, 1.2, 1.6, '#b9bcc0', 0.02);                // 屋頂水塔
  /* 正面：玻璃門、青綠色長雨遮、招牌 */
  [-4, 4].forEach(dx => block(X + dx, 1.25, ZF + 0.04, 2.8, 2.5, 0.08, '#4f6370', 0.01));
  block(X, 3.0, ZF + 0.85, 14, 0.18, 1.7, C.teal, 0.03);
  [-6.8, -2.2, 2.2, 6.8].forEach(dx => { block(X + dx, 1.45, ZF + 1.55, 0.16, 2.9, 0.16, C.post, 0.015); circC(X + dx, ZF + 1.55, 0.15); });
  nameSign('風雩樓', X, GF + 1.6, ZF + 0.07, '+z', { w: 3.4, h: 1.0, color: '#4a3f33' });
  nameSign('福利社', X, 2.55, ZF + 1.72, '+z', { w: 2.4, h: 0.55, color: '#ffffff', font: '"Noto Sans TC",sans-serif', plate: '#2f6f4f' });
  flat(14, 2.2, '#cfc8bb', X, 0.03, ZF + 1.1);
  /* 東側車道那一邊的綠色屋頂有頂走廊 */
  const cx = X0 - 0.8;
  block(cx, 2.9, Z, 1.8, 0.16, D - 1, C.green, 0.03);
  for (let z = ZB + 1; z <= ZF - 1; z += 3.25) { block(cx - 0.6, 1.4, z, 0.16, 2.8, 0.16, C.post, 0.015); circC(cx - 0.6, z, 0.15); }
  flat(1.8, D - 1, '#c8c2b6', cx, 0.03, Z);
  /* 碰撞 */
  boxC(X0, X1, ZB, ZF);
}

export default defineBuilding({
  id: 'fengyu-hall',
  name: '風雩樓（福利社）',
  build,
  zones: [{ priority: 86, test: p => (Math.abs(p.x - X) < W / 2 + 1.6 && p.z > ZB && p.z < ZF + 2) ? '風雩樓（福利社）' : null }],
  map: [{ x: X, z: Z, w: W, d: D, color: '#efece5', label: '風雩樓' }],
});
