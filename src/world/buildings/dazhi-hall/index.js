/**
 * 大智樓（側門內、指南路與校內道路之間）。
 * 位置與大小沿用原本的預定地 (150, 7)，26 × 7 公尺；正面朝校內道路（-z）。
 * 外觀參考 OpenNCCU 3D 模型：4 層樓的長條量體、灰白牆、每層一條水平帶窗；
 * 中央入口是紅磚色門框，屋頂兩端各有一個樓梯間小屋。
 */
import { block, flat } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { faceBox, nameSign, windowBlock, windowWall } from '../../building-kit.js';

const X = 150, Z = 7, W = 26, D = 7;
const X0 = X - W / 2, X1 = X + W / 2, ZF = Z - D / 2, ZB = Z + D / 2;
const GF = 3.6, FL = 3.2, TOP = GF + FL * 3;
const C = { wall: '#e4e2dc', band: '#cfccc4', glass: '#88a7b8', red: '#d07a6e', redDark: '#b46357' };
const BAND = { style: 'band', wall: C.wall, glass: C.glass, frame: '#d9d6cf', sill: C.band };

function build() {
  /* 主量體：一樓加二到四樓 */
  windowBlock(X0, X1, 0, GF, ZF, ZB, { ...BAND, wall: '#d6d2c8' }, 3.6, 1);
  windowBlock(X0, X1, GF, TOP, ZF, ZB, BAND, 3.6, 3);
  block(X, TOP + 0.35, Z, W + 0.3, 0.7, D + 0.3, C.band, 0.04);                // 女兒牆
  /* 兩端樓梯間：正面一條直窗，突出屋頂 */
  const stair = windowWall({ style: 'strip', wall: '#ece9e2', glass: C.glass, frame: '#d9d6cf', sill: C.band }, 1, 4);
  [X0 + 1.6, X1 - 1.6].forEach(x => {
    faceBox(x - 1.6, x + 1.6, 0, TOP + 0.4, ZF - 0.5, ZF + 0.2, '#ece9e2', { nz: stair }, 0.04);
    block(x, TOP + 1.3, ZF + 1.8, 3.2, 2.6, 3.2, '#d6d2c8', 0.04);             // 屋頂樓梯間小屋
  });
  /* 中央入口：紅磚色門框、雨遮、招牌 */
  faceBox(X - 2.6, X + 2.6, 0, GF + 0.4, ZF - 0.6, ZF, C.red, null, 0.03);
  block(X, 1.3, ZF - 0.63, 3.4, 2.6, 0.06, '#4f6370', 0.01);
  block(X, 1.3, ZF - 0.67, 0.08, 2.6, 0.04, '#e4e2dc', 0);
  block(X, GF + 0.55, ZF - 1.3, 6, 0.2, 1.6, C.redDark, 0.03);
  nameSign('大智樓', X, GF + 1.5, ZF - 0.06, '-z', { w: 3.2, h: 0.9, color: '#4a3f33' });
  flat(6, 2.2, '#cfc8bb', X, 0.03, ZF - 1.4);
  [-1.5, 1.5].forEach(dx => { block(X + dx, 0.25, ZF - 2.4, 0.5, 0.5, 0.5, '#bdb3a3', 0.02); circC(X + dx, ZF - 2.4, 0.3); });
  /* 碰撞 */
  boxC(X0, X1, ZF, ZB);
  [X0 + 1.6, X1 - 1.6].forEach(x => boxC(x - 1.6, x + 1.6, ZF - 0.5, ZF));
  boxC(X - 2.6, X + 2.6, ZF - 0.6, ZF);
}

export default defineBuilding({
  id: 'dazhi-hall',
  name: '大智樓',
  build,
  zones: [{ priority: 78, test: p => (Math.abs(p.x - X) < W / 2 && p.z > ZF - 2.6 && p.z < ZB) ? '大智樓' : null }],
  map: [{ x: X, z: Z, w: W, d: D, color: '#e4e2dc', label: '大智樓' }],
});
