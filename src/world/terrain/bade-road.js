/**
 * 八德道樂活館到電算中心這一段（x 12～92.5，斜的那段）。依照片：
 * - 雙黃線、兩側紅線、「慢」字、斑馬線
 * - 南側（電算中心、資訊大樓這邊）寬紅磚人行道：靠車道一排水泥花台和路燈，裡面一排種在樹穴裡的行道樹，
 *   最裡面是電算中心的方柱框架（在 computer-center 資料夾）
 * - 北側（樂活館這邊）窄一點的紅磚人行道
 * 柏油路面本身在 campus-roads.js（roadSeg）。座標換算用 layout.js 的 alongBd／BD_TH。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { SPH, basic, block, hText, mk, toon } from '../../render/kit.js';
import { circC, obbC } from '../../core/collision.js';
import { tree } from '../vegetation.js';
import { BD_TH, alongBd } from '../layout.js';
import { brickMat, lamp, shrubCol } from './back-road.js';
import { asPrefab } from '../prefabs/index.js';

const X0 = 12, X1 = 92.5;          // 這一段的範圍（中心線的 x）
const HALF = 2.2;                  // 半個路寬
const SOUTH = 7.0;                 // 南側人行道一路鋪到電算中心後棟的牆面（往南的偏移）
const NORTH = 4.6;                 // 北側人行道外緣
const RED = '#d9566a', YELLOW = '#f2c84b', WHITE = '#f4f4ee';
const COS = Math.cos(BD_TH);

/** 沿著八德道擺一個東西：x 是中心線上的位置，v 是往南的偏移；回傳已經轉好方向的群組 */
function at(x, v, y) {
  const [wx, wz] = alongBd(x, v), g = new THREE.Group();
  g.position.set(wx, y || 0, wz); g.rotation.y = -BD_TH; scene.add(g); return g;
}
/** 沿路鋪一條平面：x0～x1、偏移 v0～v1 */
function strip(x0, x1, v0, v1, mat, y) {
  const g = at((x0 + x1) / 2, (v0 + v1) / 2, y);
  const m = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0) / COS, Math.abs(v1 - v0)), typeof mat === 'string' ? toon(mat) : mat);
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; g.add(m); return m;
}
/** 路面貼圖：rz = -π/2 時貼圖上方朝西（往集英樓），π/2 朝東（往校門） */
function decal(tex, w, h, x, v, rz) {
  const g = at(x, v, 0.027);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.set(-Math.PI / 2, 0, rz); g.add(m);
}

/* ---------- 標線 ---------- */
[-0.15, 0.15].forEach(v => strip(X0 + 2, 86, v, v + 0.12, YELLOW, 0.025));
[-1, 1].forEach(s => strip(X0, X1 - 4, s * (HALF - 0.28), s * (HALF - 0.06), RED, 0.025));
// 斑馬線：電算中心後門前、靠路口那一組
[62.9, 88.2].forEach(x => { for (let v = -HALF + 0.45; v < HALF - 0.2; v += 1.0) strip(x - 1.3, x + 1.3, v, v + 0.5, WHITE, 0.026); });
{ const slow = hText('慢', WHITE, '900 150px "Noto Sans TC",sans-serif', 160, 170, 80);
  [[40, -1.1, -Math.PI / 2], [76, -1.1, -Math.PI / 2], [30, 1.1, Math.PI / 2], [70, 1.1, Math.PI / 2]].forEach(([x, v, r]) => decal(slow, 1.2, 1.3, x, v, r)); }

/* ---------- 人行道 ---------- */
strip(X0, 33, HALF, 4.8, brickMat(14, 1.5), 0.0193);
strip(30, 88.6, HALF, SOUTH, brickMat(34, 2.8), 0.0194);
strip(14, 92.2, -NORTH, -HALF, brickMat(46, 1.4), 0.0193);
// 跟電算中心後面那條路的東側人行道在轉角接起來（補上兩塊斜鋪面中間的縫）
{ const m = brickMat(2, 4); const f = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 7.9), m); f.rotation.x = -Math.PI / 2; f.position.set(88.1, 0.0191, -8.3); f.receiveShadow = true; scene.add(f); }
// 路緣石
strip(X0, 88.6, HALF, HALF + 0.2, '#a7a7a1', 0.022);
strip(14, 92.2, -HALF - 0.2, -HALF, '#a7a7a1', 0.022);

/* ---------- 南側：花台、路燈、樹穴裡的行道樹 ---------- */
const CONCRETE = toon('#7e7f7b'), PIT = new THREE.RingGeometry(0.45, 0.68, 16), SOIL = new THREE.CircleGeometry(0.45, 16);
function planter(x) {
  let g;
  asPrefab(() => {
    g = at(x, 2.75);
    block(0, 0.28, 0, 1.7, 0.56, 0.9, CONCRETE, 0.02, g);
    [-0.35, 0.35].forEach((u, i) => mk(SPH, toon(shrubCol(i + Math.round(x))), u, 0.78, 0, { parent: g, out: 0.03 }).scale.set(0.45, 0.36, 0.45));
  });
  obbC(g.position.x, g.position.z, 0.85, 0.45, -BD_TH);
}
const crossing = x => Math.abs(x - 62.9) < 2 || Math.abs(x - 88.2) < 2;
for (let x = 15; x < 87; x += 5.5) if (!crossing(x)) planter(x);
for (let x = 23.25; x < 87; x += 11) if (!crossing(x)) { const [wx, wz] = alongBd(x, 3.0); lamp(wx, wz, 0); }
for (let x = 36; x < 86; x += 6.6) {
  if (Math.abs(x - 62.9) < 3) continue;
  const [wx, wz] = alongBd(x, 4.85);
  tree(wx, wz, 0.95);
  asPrefab(() => {
    const r = new THREE.Mesh(PIT, toon('#8d8b85')); r.rotation.x = -Math.PI / 2; r.position.set(wx, 0.03, wz); scene.add(r);
    const soil = new THREE.Mesh(SOIL, toon('#5f5242')); soil.rotation.x = -Math.PI / 2; soil.position.set(wx, 0.028, wz); scene.add(soil);
  });
}
// 北側靠路邊幾棵行道樹（樂活館前面）
[[26, -3.8], [56, -3.8], [72, -3.8]].forEach(([x, v]) => { const [wx, wz] = alongBd(x, v); tree(wx, wz, 0.9); });

export { HALF as BADE_HALF, SOUTH as BADE_SOUTH, X0 as BADE_X0, X1 as BADE_X1 };
