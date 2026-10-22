/**
 * 新聞館（集英樓北邊，隔著四維道延伸步道）。
 * 依 OpenNCCU 3D 模型放在集英樓北側、羅馬廣場和大勇樓之間：中心 (117, -48.5)，20 × 8 公尺，正面朝步道（+z）。
 * （原本的預定地 (114, -26) 依模型是集英樓的位置。）
 * 外觀參考 OpenNCCU 3D 模型：3 層樓、白牆；左右兩翼是褐紅色的低緩四坡屋頂，
 * 中間是平頂的入口量體，一樓內縮、紅磚色牆面配白色柱子，前面一道長雨遮。
 */
import { block, flat, mk, toon } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { hipRoof, nameSign, windowBlock } from '../../building-kit.js';

const X = 117, Z = -48.5, W = 20, D = 8;
const S = 1;                                     // 正面朝 +z（步道那側）；往外是 +S、往裡是 -S
const X0 = X - W / 2, X1 = X + W / 2, ZF = Z + S * D / 2, ZB = Z - S * D / 2;
const zr = (a, b) => [Math.min(a, b), Math.max(a, b)];
const GF = 3.6, FL = 3.2, H3 = GF + FL * 2;     // 三層樓高
const CW = 7;                                    // 中間入口量體寬
const C = { wall: '#ecebe6', band: '#d9d4ca', glass: '#7f9fb4', roof: '#b9735c', red: '#cf8670', col: '#f4f4ee' };
const WING = { style: 'band', wall: C.wall, glass: C.glass, frame: '#e2ddd3', sill: C.band };
const MID = { style: 'strip', wall: C.wall, glass: C.glass, frame: '#e2ddd3', sill: C.band };

function build() {
  const xa = X - CW / 2, xb = X + CW / 2;
  /* 兩翼：三層帶窗、四坡屋頂 */
  [[X0, xa], [xb, X1]].forEach(([x0, x1]) => {
    windowBlock(x0, x1, 0, H3, ...zr(ZF, ZB), WING, 3.3, 3);
    block((x0 + x1) / 2, H3 + 0.12, Z, x1 - x0 + 0.4, 0.24, D + 0.4, C.band, 0.03);
    mk(hipRoof(x1 - x0 + 0.8, D + 0.8, 1.7), toon(C.roof), (x0 + x1) / 2, H3 + 0.24, Z, { out: 0.05 });
  });
  /* 中間入口量體：平頂、稍高，一樓內縮成門廊 */
  windowBlock(xa, xb, GF, H3 + 0.8, ...zr(ZF + S * 0.4, ZB), MID, 2.4, 2);
  windowBlock(xa, xb, 0, GF, ...zr(ZF - S * 1.2, ZB), { ...MID, wall: C.red, sill: '#b86f5b' }, 2.4, 1);
  block(X, H3 + 1.0, Z + S * 0.2, CW + 0.3, 0.4, D + 0.7, C.band, 0.03);       // 女兒牆
  block(X + 1.6, H3 + 1.6, Z - S * 1.2, 1.8, 1.2, 1.8, '#d6d2c8', 0.03);         // 屋頂機房
  // 門廊白柱
  [xa + 0.4, X - 1.2, X + 1.2, xb - 0.4].forEach(x => { block(x, GF / 2, ZF + S * 0.2, 0.45, GF, 0.45, C.col, 0.02); circC(x, ZF + S * 0.2, 0.3); });
  // 入口玻璃門與門框
  block(X, 1.25, ZF - S * 1.16, 3.2, 2.5, 0.08, '#4f6370', 0.01);
  block(X, 1.25, ZF - S * 1.1, 0.08, 2.5, 0.06, C.col, 0);
  /* 長雨遮與招牌 */
  block(X, GF + 0.1, ZF + S * 1.0, CW + 4, 0.22, 2.0, '#e2ddd3', 0.04);
  nameSign('新聞館', X, GF + 1.25, ZF + S * 0.43, '+z', { w: 3.4, h: 0.95, color: '#5b3b2f' });
  nameSign('傳播學院', X, GF - 0.45, ZF - S * 1.14, '+z', { w: 2.6, h: 0.5, color: '#f4f4ee', font: '"Noto Sans TC",sans-serif' });
  /* 門前地坪與兩側矮灌木 */
  flat(CW + 2, 2.4, '#cfc8bb', X, 0.03, ZF + S * 1.1);
  [[X0 + 3, ZF + S * 0.7], [X1 - 3, ZF + S * 0.7]].forEach(([x, z]) => { block(x, 0.35, z, 5, 0.7, 1, '#5cb150', 0.03); boxC(x - 2.5, x + 2.5, z - 0.5, z + 0.5); });
  /* 碰撞：兩翼整棟擋住，中間只擋內縮後的一樓牆面（門廊可以走進去） */
  boxC(X0, xa, ...zr(ZF, ZB)); boxC(xb, X1, ...zr(ZF, ZB));
  boxC(xa, xb, ...zr(ZF - S * 1.2, ZB));
}

export default defineBuilding({
  id: 'journalism-hall',
  name: '新聞館',
  build,
  zones: [{ priority: 77, test: p => (Math.abs(p.x - X) < W / 2 && Math.abs(p.z - (Z + S * 1.5)) < D / 2 + 1.5) ? '新聞館' : null }],
  map: [{ x: X, z: Z, w: W, d: D, color: '#ecebe6', label: '新聞館' }],
});
