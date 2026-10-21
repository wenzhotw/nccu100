/**
 * 四維網球場（風雩樓後方、沿溪道路北側）。
 * 位置與大小沿用原本的預定地 (1, -141)，24 × 24 公尺。
 * 外觀參考 OpenNCCU 3D 模型：紅褐色場地鋪面上兩面綠色球場，四周綠色鐵絲網圍籬；
 * 遊戲版縮成兩面並排的球場，北邊（風雩樓那側）圍籬中間留一個入口，可以走進去。
 */
import * as THREE from 'three';
import { GRAD, basic, block, canvasTex, flat, plane } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { asPrefab } from '../../prefabs/index.js';

const X = 1, Z = -141, S = 24;
const X0 = X - S / 2, X1 = X + S / 2, Z0 = Z - S / 2, Z1 = Z + S / 2;
const FH = 3.2, GATE = 3;                    // 圍籬高、入口寬
const C = { ground: '#c97a62', court: '#5aa868', line: '#f4f4ee', post: '#4f7f5a' };

/** 綠色鐵絲網：菱形網格，透明底，用 alphaTest 切掉空白 */
const meshTex = canvasTex(64, 64, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.strokeStyle = '#3f7a52'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
});
function fenceMat(len) {
  const t = meshTex.clone(); t.repeat.set(len / 0.6, FH / 0.6); t.needsUpdate = true;
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
}
const netTex = canvasTex(64, 32, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.fillStyle = '#2f3446';
  for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 1.5, h);
  for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 1.5);
  g.fillStyle = '#f4f4ee'; g.fillRect(0, 0, w, 5);
}, [12, 1]);
const NET = basic({ map: netTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });

/** 一面球場：綠色場地與白線（單位公尺，沿 z 方向長） */
function court(cx) {
  const L = 19.6, Wd = 8.6;
  flat(Wd + 1.6, L + 2, C.court, cx, 0.03, Z);
  const ln = (w, d, x, z) => flat(w, d, C.line, x, 0.034, z);
  [-1, 1].forEach(s => { ln(Wd, 0.1, cx, Z + s * L / 2); ln(0.1, L, cx + s * Wd / 2, Z); ln(0.1, L, cx + s * (Wd / 2 - 1.1), Z); ln(Wd - 2.2, 0.1, cx, Z + s * 5.4); });
  ln(0.1, 10.8, cx, Z);
  // 球網：兩根網柱加一片網
  [-1, 1].forEach(s => { block(cx + s * (Wd / 2 + 0.4), 0.55, Z, 0.1, 1.1, 0.1, '#5b5f63', 0.01); circC(cx + s * (Wd / 2 + 0.4), Z, 0.1); });
  plane(Wd + 0.8, 0.9, NET, cx, 0.5, Z);
}

function build() {
  flat(S, S, C.ground, X, 0.025, Z);
  court(X - 5.4); court(X + 5.4);
  /* 圍籬：四邊柱子、上緣橫桿、鐵絲網；北邊中間留入口 */
  const seg = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), along = Math.abs(x1 - x0) > 0.01;
    plane(len, FH, fenceMat(len), (x0 + x1) / 2, FH / 2, (z0 + z1) / 2, 0, along ? 0 : Math.PI / 2);
    block((x0 + x1) / 2, FH, (z0 + z1) / 2, along ? len : 0.08, 0.08, along ? 0.08 : len, C.post, 0);
    if (along) boxC(Math.min(x0, x1), Math.max(x0, x1), z0 - 0.1, z0 + 0.1); else boxC(x0 - 0.1, x0 + 0.1, Math.min(z0, z1), Math.max(z0, z1));
  };
  seg(X0, Z0, X1, Z0); seg(X0, Z0, X0, Z1); seg(X1, Z0, X1, Z1);
  seg(X0, Z1, X - GATE / 2, Z1); seg(X + GATE / 2, Z1, X1, Z1);
  [-1, 1].forEach(s => block(X + s * GATE / 2, FH / 2, Z1, 0.14, FH, 0.14, C.post, 0.015));   // 入口門柱
  asPrefab(() => {
    for (let k = 0; k <= 8; k++) {
      const t = -S / 2 + k * S / 8;
      [[X + t, Z0], ...(Math.abs(t) < GATE / 2 ? [] : [[X + t, Z1]]), [X0, Z + t], [X1, Z + t]].forEach(([x, z]) => block(x, FH / 2, z, 0.1, FH, 0.1, C.post, 0.015));
    }
  });
}

export default defineBuilding({
  id: 'siwei-tennis',
  name: '四維網球場',
  build,
  zones: [{ priority: 87, test: p => (Math.abs(p.x - X) < S / 2 && Math.abs(p.z - Z) < S / 2) ? '四維網球場' : null }],
  map: [{ x: X, z: Z, w: S, d: S, color: '#c97a62', label: '四維網球場' }],
});
