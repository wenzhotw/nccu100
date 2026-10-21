/**
 * 玫苑（側門內、大智樓西邊，靠指南路）。
 * 位置與大小沿用原本的預定地 (112, 7)，12 × 7 公尺；正面朝校內道路（-z）。
 * OpenNCCU 3D 模型沒有這棟，手邊也還沒有照片，先做成兩層樓的小建築：
 * 米白牆、玫瑰色飾帶與雨遮、門前兩個玫瑰花台。之後拿到實景照片再照特徵修正。
 */
import { SPH, block, flat, mk, toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { nameSign, windowBlock } from '../../building-kit.js';
import { asPrefab } from '../../prefabs/index.js';

const X = 112, Z = 7, W = 12, D = 7;
const X0 = X - W / 2, X1 = X + W / 2, ZF = Z - D / 2, ZB = Z + D / 2;
const GF = 3.6, TOP = GF + 3.2;
const C = { wall: '#f1e9dc', rose: '#d9707e', roseDark: '#b9566a', band: '#e2d6c4', glass: '#97b0bd' };

function build() {
  windowBlock(X0, X1, 0, GF, ZF, ZB, { style: 'grid', wall: C.wall, glass: C.glass, frame: '#fbf6ee', sill: C.band }, 3, 1);
  windowBlock(X0, X1, GF, TOP, ZF, ZB, { style: 'grid', wall: C.wall, glass: C.glass, frame: '#fbf6ee', sill: C.rose }, 3, 1);
  block(X, GF, ZF - 0.05, W + 0.2, 0.3, 0.14, C.rose, 0);                       // 一二樓之間的玫瑰色飾帶
  block(X, TOP + 0.3, Z, W + 0.3, 0.6, D + 0.3, C.rose, 0.04);                   // 女兒牆
  block(X + 3, TOP + 1.0, Z + 1, 2.4, 1.4, 2.4, '#e2d6c4', 0.03);                // 屋頂小屋
  /* 入口：木門、斜雨遮、招牌 */
  const DX = X - 1;   // 門偏西一點，讓開門前那根既有路燈 (114.5, 2.9)
  block(DX, 1.2, ZF - 0.04, 2, 2.4, 0.08, '#8a6a42', 0.01);
  const a = block(DX, 2.85, ZF - 0.55, 3, 0.12, 1.2, C.rose, 0.02); a.rotation.x = -0.35;   // 斜雨遮
  block(DX, 2.62, ZF - 1.1, 3, 0.22, 0.06, C.roseDark, 0);
  nameSign('玫苑', X, GF + 1.6, ZF - 0.07, '-z', { w: 2.2, h: 0.9, color: '#8a3346' });
  flat(3.2, 1.6, '#d8cbb4', DX, 0.03, ZF - 0.8);
  /* 門前兩個玫瑰花台（東邊那個在路燈外側） */
  [X - 4.2, X + 4.6].forEach(x => {
    block(x, 0.3, ZF - 0.7, 3.2, 0.6, 1.1, '#c9b79c', 0.03);
    asPrefab(() => {
      [-1.1, 0, 1.1].forEach((dx, i) => {
        mk(SPH, toon('#5cb150'), x + dx, 0.8, ZF - 0.7, { out: 0.02 }).scale.set(0.5, 0.35, 0.45);
        mk(SPH, toon(i % 2 ? '#e8463c' : '#f08aa0'), x + dx + 0.15, 1.05, ZF - 0.85, {}).scale.setScalar(0.16);
      });
    });
    boxC(x - 1.6, x + 1.6, ZF - 1.25, ZF - 0.15);
  });
  boxC(X0, X1, ZF, ZB);
}

export default defineBuilding({
  id: 'meiyuan',
  name: '玫苑',
  build,
  zones: [{ priority: 85, test: p => (Math.abs(p.x - X) < W / 2 && p.z > ZF - 2.4 && p.z < ZB) ? '玫苑' : null }],
  map: [{ x: X, z: Z, w: W, d: D, color: '#f1e9dc', label: '玫苑' }],
});
