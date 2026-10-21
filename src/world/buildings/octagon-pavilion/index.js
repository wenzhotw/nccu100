/**
 * 八角亭（田徑場西南角、沿溪道路旁，B、C 類停車場邊）。
 * 位置沿用原本的預定地 (44, -150)，亭子中心往西挪 2.5 公尺，避開田徑場的「運動場使用須知」看板。
 * 外觀依 photos/ 實景照片（名字叫八角亭，其實是方形的現代風涼亭）：
 * - 白色方形平頂薄屋頂，屋頂底面從柱子往四邊斜上去，邊緣很薄
 * - 四根白色圓柱
 * - 抬高的深灰色地坪，前面兩階，三面是深色低矮牆可以坐
 * - 四周一圈黃綠色矮樹籬，入口那側留開口，旁邊一根「B.C類停車場」牌子
 * 入口朝 +z。地坪可以走上去（一階 0.2、地坪 0.4 公尺）。
 */
import * as THREE from 'three';
import { basic, block, canvasTex, mk, plane, toon } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';

const X = 41.5, Z = -149.5;
const P = 3.0;                    // 地坪半寬（6 × 6）
const STEP = 0.2, FLOOR = 0.4;    // 前階、地坪高度
const COL = 1.9, COL_H = 2.9;     // 柱子離中心、柱高
const ROOF = 3.9;                 // 屋頂半寬（7.8 × 7.8）
const C = { white: '#f2f1ec', soffit: '#e6e4dc', floor: '#7a7f84', base: '#b9b6ae', wall: '#4f565c', hedge: '#8dbb4c', hedgeDark: '#7fb045' };
const COLUMN = new THREE.CylinderGeometry(0.2, 0.2, COL_H + 0.2, 12);   // 多 0.2 伸進斜的屋頂底面
// 屋頂底面：四角錐台，倒過來放（上寬下窄），轉 45 度讓四邊對齊 x、z 軸
const SOFFIT = new THREE.CylinderGeometry(ROOF * Math.SQRT2, 1.2 * Math.SQRT2, 0.55, 4, 1);

function build() {
  /* 基座、前階、深灰地坪 */
  block(X, FLOOR / 2, Z, P * 2, FLOOR, P * 2, C.base, 0.02);
  block(X, FLOOR + 0.01, Z, P * 2 - 0.3, 0.02, P * 2 - 0.3, C.floor, 0);
  block(X, STEP / 2, Z + P + 0.35, 3.2, STEP, 0.7, C.base, 0.015);
  /* 三面深色低矮牆（入口那面 +z 不擋） */
  [[X, Z - P + 0.15, P * 2 - 0.4, 0.3], [X - P + 0.15, Z, 0.3, P * 2 - 0.4], [X + P - 0.15, Z, 0.3, P * 2 - 0.4]].forEach(([x, z, w, d]) => {
    block(x, FLOOR + 0.25, z, w, 0.5, d, C.wall, 0.02);
    boxC(x - w / 2, x + w / 2, z - d / 2, z + d / 2, FLOOR + 0.5);
  });
  // 入口兩側的短矮牆
  [-1, 1].forEach(s => { block(X + s * 2.1, FLOOR + 0.25, Z + P - 0.15, 1.4, 0.5, 0.3, C.wall, 0.02); boxC(X + s * 2.1 - 0.7, X + s * 2.1 + 0.7, Z + P - 0.3, Z + P, FLOOR + 0.5); });
  /* 四根白色圓柱 */
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    mk(COLUMN, toon(C.white), X + sx * COL, FLOOR + (COL_H + 0.2) / 2, Z + sz * COL, { out: 0.02 });
    circC(X + sx * COL, Z + sz * COL, 0.25);
  });
  /* 屋頂：倒角錐台的底面加上面一片薄平板 */
  const top = FLOOR + COL_H;
  const s = mk(SOFFIT, toon(C.soffit), X, top + 0.275, Z, { out: 0.03 }); s.rotation.y = Math.PI / 4;
  block(X, top + 0.62, Z, ROOF * 2, 0.14, ROOF * 2, C.white, 0.04);
  /* 四周矮樹籬（入口那側中間留開口） */
  const H = 0.8, G = P + 1.0;
  [[X, Z - G, G * 2 + 0.9, 0.9], [X - G, Z, 0.9, G * 2 + 0.9], [X + G, Z, 0.9, G * 2 + 0.9],
   [X - (G + 2) / 2 - 0.2, Z + G, G - 1.6, 0.9], [X + (G + 2) / 2 + 0.2, Z + G, G - 1.6, 0.9]].forEach(([x, z, w, d], i) => {
    block(x, H / 2, z, w, H, d, i % 2 ? C.hedge : C.hedgeDark, 0.04);
    boxC(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  });
  /* 入口旁的「B.C類停車場」牌子 */
  const t = canvasTex(64, 192, (g, w, h) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c0392b'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#c0392b'; g.textAlign = 'center'; g.font = '900 20px Arial,sans-serif'; g.fillText('B.C', w / 2, 30);
    g.font = '900 26px "Noto Sans TC",sans-serif'; ['類', '停', '車', '場'].forEach((c, i) => g.fillText(c, w / 2, 64 + i * 32));
  });
  const sx = X - 2.4, sz = Z + G + 1.0;
  block(sx, 0.9, sz, 0.08, 1.8, 0.08, '#7a5a43', 0.01);
  plane(0.35, 1.05, basic({ map: t }), sx, 1.45, sz + 0.05);
  circC(sx, sz, 0.1);
}

export default defineBuilding({
  id: 'octagon-pavilion',
  name: '八角亭',
  build,
  heightAt(x, z) {
    const dx = Math.abs(x - X), dz = z - Z;
    if (dx < P && Math.abs(dz) < P) return FLOOR;
    if (dx < 1.6 && dz >= P && dz < P + 0.7) return STEP;
    return null;
  },
  zones: [{ priority: 96, test: p => (Math.abs(p.x - X) < P + 1.5 && Math.abs(p.z - Z) < P + 1.5) ? '八角亭' : null }],
  map: [{ x: X, z: Z, w: ROOF * 2, d: ROOF * 2, color: '#f2f1ec', label: '八角亭' }],
});
