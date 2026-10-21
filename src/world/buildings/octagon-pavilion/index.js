/**
 * 八角亭（田徑場西南角、沿溪道路旁）。
 * 位置沿用原本的預定地 (44, -150)，亭子中心往西挪 2.5 公尺，避開田徑場的「運動場使用須知」看板。
 * 外觀參考 OpenNCCU 3D 模型：八角形石砌基座、八根紅褐色柱子、兩層綠色八角屋頂，頂上一根木色寶頂。
 * 基座可以走上去（一階 0.18、平台 0.36 公尺），中間一張石桌。
 */
import * as THREE from 'three';
import { mk, toon } from '../../../render/kit.js';
import { circC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';

const X = 41.5, Z = -149.5;
const R = 3.3, STEP = 0.18, BASE = 0.36, COL_R = 2.75, COL_H = 2.7;
const C = { stone: '#c9c3b6', step: '#bdb6a8', col: '#b5624f', roof: '#6fa37a', roofTop: '#5e9469', eave: '#efe4cf', wood: '#a57a4f' };
const oct = (rt, rb, h) => new THREE.CylinderGeometry(rt, rb, h, 8);

function build() {
  const rot = m => { m.rotation.y = Math.PI / 8; return m; };   // 讓八角形的平邊對齊 x、z 軸
  rot(mk(oct(R + 0.45, R + 0.45, STEP), toon(C.step), X, STEP / 2, Z, { out: 0.02 }));
  rot(mk(oct(R, R, BASE), toon(C.stone), X, BASE / 2, Z, { out: 0.02 }));
  /* 八根柱子與柱間上緣的橫樑 */
  const COL = new THREE.CylinderGeometry(0.16, 0.18, COL_H, 8);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, x = X + Math.cos(a) * COL_R, z = Z + Math.sin(a) * COL_R;
    mk(COL, toon(C.col), x, BASE + COL_H / 2, z, { out: 0.02 });
    circC(x, z, 0.22);
  }
  rot(mk(oct(COL_R + 0.25, COL_R + 0.25, 0.3), toon(C.col), X, BASE + COL_H - 0.1, Z, { out: 0.02 }));
  /* 兩層八角屋頂：下層寬簷、上層小攢尖，屋簷下緣淺色 */
  const y0 = BASE + COL_H + 0.05;
  rot(mk(oct(R + 1.05, R + 1.05, 0.14), toon(C.eave), X, y0, Z, { out: 0.02 }));
  rot(mk(oct(1.7, R + 1.0, 1.0), toon(C.roof), X, y0 + 0.57, Z, { out: 0.04 }));
  rot(mk(oct(1.75, 1.75, 0.35), toon(C.eave), X, y0 + 1.25, Z, { out: 0.02 }));
  rot(mk(new THREE.ConeGeometry(2.25, 1.3, 8), toon(C.roofTop), X, y0 + 2.07, Z, { out: 0.04 }));
  mk(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 8), toon(C.wood), X, y0 + 2.95, Z, { out: 0.015 });
  /* 中間的石桌 */
  mk(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 12), toon('#d9d3c6'), X, BASE + 0.75, Z, { out: 0.015 });
  mk(new THREE.CylinderGeometry(0.2, 0.28, 0.7, 10), toon(C.step), X, BASE + 0.35, Z, { out: 0.015 });
  circC(X, Z, 0.75);
}

export default defineBuilding({
  id: 'octagon-pavilion',
  name: '八角亭',
  build,
  heightAt(x, z) {
    const d = Math.hypot(x - X, z - Z);
    if (d < R) return BASE;
    if (d < R + 0.45) return STEP;
    return null;
  },
  zones: [{ priority: 96, test: p => Math.hypot(p.x - X, p.z - Z) < R + 1.5 ? '八角亭' : null }],
  map: [{ x: X, z: Z, w: 8, d: 8, color: '#6fa37a', label: '八角亭' }],
});
