/**
 * 大勇樓（大仁樓南側、綜合院館北側）。
 * 位置與大小沿用原本的預定地 (148, -48)，32 × 8 公尺；正面朝北邊的四維道延伸步道（+z）。
 * 外觀參考 OpenNCCU 3D 模型：4 層樓的細長白色量體、每層方窗；
 * 背面有四座往外凸的樓梯間，正面中央是紅磚色的入口門廊。
 */
import { block, flat } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { faceBox, nameSign, windowBlock, windowWall } from '../../building-kit.js';
import { tree } from '../../vegetation.js';

const X = 148, Z = -48, W = 32, D = 8;
const X0 = X - W / 2, X1 = X + W / 2;
const ZF = Z + 3.5, ZB = Z - 2.5;          // 正面（+z）、背面；背面再往外凸 1.5 公尺的樓梯間
const GF = 3.6, FL = 3.2, TOP = GF + FL * 3;
const C = { wall: '#ecebe6', band: '#d6d2c8', glass: '#8fa9b9', red: '#d9806c', redDark: '#bd6a58' };
const GRID = { style: 'grid', wall: C.wall, glass: C.glass, frame: '#f4f4ee', sill: C.band };

function build() {
  /* 主量體 */
  windowBlock(X0, X1, 0, GF, ZB, ZF, { ...GRID, wall: '#dcd8cf' }, 3.2, 1);
  windowBlock(X0, X1, GF, TOP, ZB, ZF, GRID, 3.2, 3);
  for (let k = 1; k <= 3; k++) block(X, GF + FL * k - 0.1, ZF + 0.05, W + 0.1, 0.18, 0.12, C.band, 0);
  block(X, TOP + 0.35, (ZF + ZB) / 2, W + 0.3, 0.7, ZF - ZB + 0.3, C.band, 0.04);
  /* 背面四座凸出的樓梯間 */
  const stair = windowWall({ style: 'strip', wall: '#f0eee8', glass: C.glass, frame: '#e2ddd3', sill: C.band }, 1, 4);
  [X0 + 1.4, X - 7, X + 7, X1 - 1.4].forEach(x => {
    faceBox(x - 1.4, x + 1.4, 0, TOP + 0.9, ZB - 1.5, ZB, '#f0eee8', { nz: stair }, 0.04);
  });
  /* 正面中央的紅磚色門廊與雨遮 */
  faceBox(X - 3, X + 3, 0, GF + 0.3, ZF, ZF + 0.6, C.red, null, 0.03);
  block(X, 1.3, ZF + 0.63, 3.6, 2.6, 0.06, '#4f6370', 0.01);
  block(X, 1.3, ZF + 0.67, 0.08, 2.6, 0.04, '#ecebe6', 0);
  block(X, GF + 0.45, ZF + 1.4, 7, 0.2, 1.8, C.redDark, 0.03);
  [-3.2, 3.2].forEach(dx => { block(X + dx, (GF + 0.35) / 2, ZF + 2.1, 0.22, GF + 0.35, 0.22, '#e2ddd3', 0.02); circC(X + dx, ZF + 2.1, 0.2); });
  nameSign('大勇樓', X, GF + 1.5, ZF + 0.07, '+z', { w: 3.2, h: 0.9, color: '#4a3f33' });
  flat(7, 2.6, '#cfc8bb', X, 0.03, ZF + 1.5);
  /* 正面兩側的矮灌木與行道樹 */
  [X - 10, X + 10].forEach(x => { block(x, 0.35, ZF + 0.8, 8, 0.7, 1, '#5cb150', 0.03); boxC(x - 4, x + 4, ZF + 0.3, ZF + 1.3); });
  tree(X0 - 2.5, Z + 1, 0.95); tree(X1 + 2.5, Z + 1, 0.9);
  /* 碰撞 */
  boxC(X0, X1, ZB, ZF);
  [X0 + 1.4, X - 7, X + 7, X1 - 1.4].forEach(x => boxC(x - 1.4, x + 1.4, ZB - 1.5, ZB));
  boxC(X - 3, X + 3, ZF, ZF + 0.6);
}

export default defineBuilding({
  id: 'dayong-hall',
  name: '大勇樓',
  build,
  zones: [{ priority: 79, test: p => (Math.abs(p.x - X) < W / 2 && p.z > ZB - 1.5 && p.z < ZF + 3) ? '大勇樓' : null }],
  map: [{ x: X, z: Z - 0.25, w: W, d: D - 0.5, color: '#ecebe6', label: '大勇樓' }],
});
