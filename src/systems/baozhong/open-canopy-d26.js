// D26 開放頂棚原型：微收分雙柱、弧形笠木與島木、水平貫。只取可辨輪廓，不添祭具。
import * as THREE from 'three';
import { TENT } from './tents-logic.js';

export const OPEN_CANOPY_D26 = Object.freeze({
  id: 'D26', z: 1.65, postX: 1.22, postTopX: 1.10, postWidth: 0.22,
  postTopWidth: 0.16, postHeight: 3.04, beamY: 2.53, beamHeight: 0.14,
  capY: 3.06, capWidth: 2.84, capHeight: 0.14, capRise: 0.22, depth: 0.22,
  shimakiWidth: 2.66, shimakiY: 2.92, shimakiHeight: 0.10, segments: 16,
});
const G = OPEN_CANOPY_D26;
/** 真實幾何弧線。上緣為二次曲線，兩端上翹；底緣等厚跟隨，不用貼圖假畫。 */
export function toriiCurveY(x, width = G.capWidth, center = G.capY) {
  return center + G.capRise * (2 * x / width) ** 2;
}
function curvedBeam(width, center, thickness, depth) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= G.segments; i++) {
    const x = -width / 2 + width * i / G.segments, y = toriiCurveY(x, G.capWidth, center);
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  for (let i = G.segments; i >= 0; i--) {
    const x = -width / 2 + width * i / G.segments;
    shape.lineTo(x, toriiCurveY(x, G.capWidth, center) - thickness);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.translate(0, 0, -depth / 2); geometry.computeBoundingBox(); return geometry;
}
const lean = G.postX - G.postTopX;
const POST = new THREE.CylinderGeometry(G.postTopWidth / 2, G.postWidth / 2, Math.hypot(G.postHeight, lean), 12);
const BEAM = new THREE.BoxGeometry(2.62, G.beamHeight, 0.16);
const CAP = curvedBeam(G.capWidth, G.capY, G.capHeight, G.depth);
const SHIMAKI = curvedBeam(G.shimakiWidth, G.shimakiY, G.shimakiHeight, 0.18);
const TIE = new THREE.BoxGeometry(0.14, 0.40, 0.14);

/** 掛在原帳篷本地座標；呼叫端提供正式toon、OUT描邊。 */
export function buildOpenCanopyTorii(group, { mesh, toon, outline }) {
  const root = new THREE.Group(); root.name = 'bz26-open-canopy-torii-D26'; group.add(root);
  const parts = [];
  const add = (geometry, color, x, y, z) => {
    const m = mesh(geometry, toon(color), x, y, z, root);
    m.userData.bz26Torii = true; outline(m, 0.012); parts.push(m); return m;
  };
  for (const side of [-1, 1]) {
    const p = add(POST, '#e8463c', side * (G.postX + G.postTopX) / 2, G.postHeight / 2, G.z);
    // 柱軸向內收。最底可見外殼略低於0，以免斜柱截面出現浮地縫隙。
    p.rotation.z = side * Math.atan2(lean, G.postHeight);
    p.userData.bz26ToriiPost = true;
  }
  add(BEAM, '#e8463c', 0, G.beamY, G.z);
  add(TIE, '#e8463c', 0, 2.72, G.z);
  const shimaki = add(SHIMAKI, '#e8463c', 0, 0, G.z); shimaki.userData.bz26ToriiCurved = 'shimaki';
  const cap = add(CAP, '#2a2c4a', 0, 0, G.z); cap.userData.bz26ToriiCurved = 'kasagi';
  return { root, parts };
}

/** 僅真實柱腳與櫃檯擋行人。斜柱使用保守包絡，中央通道不設整片碰撞。 */
export function openCanopyColliders(t, ground = 0, includeTorii = true) {
  const cs = Math.cos(t.rotY), sn = Math.sin(t.rotY), result = [];
  const box = (x, z, hx, hz, top) => result.push({ obb: true,
    cx: t.x + x * cs + z * sn, cz: t.z - x * sn + z * cs,
    hx, hz, cs, sn, top: ground + top });
  for (const x of [-TENT.pole, TENT.pole]) for (const z of [-TENT.pole, TENT.pole]) box(x, z, TENT.poleR, TENT.poleR, 2.2);
  if (includeTorii) for (const side of [-1, 1]) box(side * (G.postX + G.postTopX) / 2, G.z, (lean + G.postWidth) / 2, G.postWidth / 2, G.postHeight + 0.01);
  const T = TENT.table;
  box((T.x0 + T.x1) / 2, (T.z0 + T.z1) / 2, (T.x1 - T.x0) / 2, (T.z1 - T.z0) / 2, T.h);
  return result;
}
