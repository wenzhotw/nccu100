/**
 * 樂活小舖（樂活館東邊、八德道南側，靠側門）。
 * 依 OpenNCCU 3D 模型：樂活館東邊一棟 2 層樓的長條建築，屋頂有綠化，正面朝八德道（-z），一樓前面一道深色雨遮。
 * 範圍 x 60.5～84.2、z -7.6～5.4；東邊緊鄰既有的校園小舖店面（back-road.js），不重疊。
 */
import { block, flat, toon } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { nameSign, windowBlock } from '../../building-kit.js';

const X0 = 60.5, X1 = 84.2, ZF = -7.6, ZB = 5.4;
const X = (X0 + X1) / 2, Z = (ZF + ZB) / 2;
const GF = 3.6, TOP = GF + 3.4;
const C = { wall: '#f2efe4', glass: '#8fa9b9', frame: '#e2ddd3', band: '#d6d2c8', green: '#7fb35c', canopy: '#4f5b5b', post: '#6b7373' };
const TREE_X = 72;   // 八德道南側既有行道樹（bade-road.js），雨遮在這裡斷開

function build() {
  windowBlock(X0, X1, 0, GF, ZF, ZB, { style: 'band', wall: '#dcd8cc', glass: C.glass, frame: C.frame, sill: C.band }, 3.4, 1);
  windowBlock(X0, X1, GF, TOP, ZF, ZB, { style: 'grid', wall: C.wall, glass: C.glass, frame: '#fbf8f0', sill: C.band }, 3.4, 1);
  // 屋頂綠化：女兒牆內一層草皮與幾叢灌木
  block(X, TOP + 0.3, Z, X1 - X0 + 0.3, 0.6, ZB - ZF + 0.3, C.band, 0.04);
  block(X, TOP + 0.45, Z, X1 - X0 - 0.8, 0.2, ZB - ZF - 0.8, C.green, 0);
  [X0 + 4, X0 + 9, X1 - 9, X1 - 4].forEach((x, i) => block(x, TOP + 0.8, Z + (i % 2 ? 2 : -2), 1.6, 0.6, 1.4, '#5cb150', 0.02));
  /* 一樓正面：玻璃門與兩段深色雨遮 */
  [X0 + 5, X1 - 6].forEach(x => block(x, 1.25, ZF - 0.04, 2.8, 2.5, 0.08, '#4f6370', 0.01));
  [[X0 + 0.5, TREE_X - 2], [TREE_X + 2, X1 - 0.5]].forEach(([a, b]) => {
    block((a + b) / 2, 3.1, ZF - 0.6, b - a, 0.14, 1.2, C.canopy, 0.03);
    [a + 0.4, b - 0.4].forEach(x => { block(x, 1.5, ZF - 1.1, 0.12, 3, 0.12, C.post, 0.015); circC(x, ZF - 1.1, 0.12); });
  });
  nameSign('樂活小舖', X, GF + 1.7, ZF - 0.07, '-z', { w: 4.4, h: 1.0, color: '#2f6f4f', font: '"Noto Sans TC",sans-serif' });
  flat(X1 - X0, 1.4, '#cfc8bb', X, 0.031, ZF - 0.7);
  boxC(X0, X1, ZF, ZB);
}

export default defineBuilding({
  id: 'lohas-shop',
  name: '樂活小舖',
  build,
  zones: [{ priority: 74, test: p => (p.x > X0 && p.x < X1 && p.z > ZF - 1.4 && p.z < ZB) ? '樂活小舖' : null }],
  map: [{ x: X, z: Z, w: X1 - X0, d: ZB - ZF, color: '#e8eadf', label: '樂活小舖' }],
});
