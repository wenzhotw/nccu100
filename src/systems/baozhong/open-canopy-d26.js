// D26 局部原型：四柱開放帳篷與落地鳥居，不改其他攤位的結構或內容。
import * as THREE from 'three';
import { TENT } from './tents-logic.js';

export const OPEN_CANOPY_D26 = Object.freeze({
  id: 'D26', z: 1.65, postX: 1.22, postWidth: 0.18,
  postHeight: 3.04, beamY: 2.55, beamHeight: 0.18,
  capY: 3.12, capWidth: 2.84, capHeight: 0.16, depth: 0.22,
});
const G = OPEN_CANOPY_D26;
// 幾何只建一次，所有模型沿用呼叫端的 toon 與專案描邊材質。
const POST = new THREE.BoxGeometry(G.postWidth, G.postHeight, G.postWidth);
const BEAM = new THREE.BoxGeometry(2.62, G.beamHeight, 0.18);
const CAP = new THREE.BoxGeometry(G.capWidth, G.capHeight, G.depth);
const TIE = new THREE.BoxGeometry(0.14, 0.48, 0.14);

/** 掛在原帳篷本地座標；不新增文字、貼圖、光源，也不改官方系名。 */
export function buildOpenCanopyTorii(group, { mesh, toon, outline }) {
  const root = new THREE.Group(); root.name = 'bz26-open-canopy-torii-D26';
  group.add(root);
  const parts = [];
  const add = (geometry, color, x, y, z) => {
    const m = mesh(geometry, toon(color), x, y, z, root);
    m.userData.bz26Torii = true;
    outline(m, 0.014); parts.push(m); return m;
  };
  for (const x of [-G.postX, G.postX]) {
    const p = add(POST, '#e8463c', x, G.postHeight / 2, G.z);
    p.userData.bz26ToriiPost = true;
  }
  add(BEAM, '#e8463c', 0, G.beamY, G.z);
  add(TIE, '#e8463c', 0, 2.84, G.z);
  add(CAP, '#2a2c4a', 0, G.capY, G.z);
  return { root, parts };
}

/** 真實柱子與桌子才有碰撞，沒有側牆、後牆或封住鳥居通道的整片碰撞。 */
export function openCanopyColliders(t, ground = 0) {
  const cs = Math.cos(t.rotY), sn = Math.sin(t.rotY), result = [];
  const box = (x, z, hx, hz, top) => result.push({ obb: true,
    cx: t.x + x * cs + z * sn, cz: t.z - x * sn + z * cs,
    hx, hz, cs, sn, top: ground + top });
  for (const x of [-TENT.pole, TENT.pole]) for (const z of [-TENT.pole, TENT.pole]) {
    box(x, z, TENT.poleR, TENT.poleR, 2.2);
  }
  for (const x of [-G.postX, G.postX]) box(x, G.z, G.postWidth / 2, G.postWidth / 2, G.postHeight);
  const T = TENT.table;
  box((T.x0 + T.x1) / 2, (T.z0 + T.z1) / 2, (T.x1 - T.x0) / 2, (T.z1 - T.z0) / 2, T.h);
  return result;
}
