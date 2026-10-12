/**
 * 建築共用工具：多面材質方塊、四坡屋頂、窗戶材質、區域座標轉換。
 * 會被好幾棟建築用到的東西放這裡，不要放在某一棟建築的資料夾裡。
 */
import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { BOX, basic, outline, toon } from '../render/kit.js';

/** 屋頂淺灰色 */
export const ROOFTOP = toon('#c4c7c0');

/** 深色玻璃窗 */
export const winMat = basic({ color: '#5c7686' });

/**
 * 六面可分別指定材質的方塊（正面、右側、左側各自貼圖，頂部與底部用屋頂色）。
 */
export function mbox(x, y, z, sx, sy, sz, front, right, left, out) {
  const m = new THREE.Mesh(BOX, [right, left, ROOFTOP, ROOFTOP, front, right]);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; scene.add(m);
  if (out) { const o = outline(m, 0); o.scale.set(1 + 2 * out / sx, 1 + 2 * out / sy, 1 + 2 * out / sz); }
  return m;
}

/** 四坡屋頂幾何（長 L、寬 W、高 H，ridge 為屋脊半長） */
export function hipRoof(L, W, H, ridge) {
  const r = ridge !== undefined ? ridge : Math.max(0.01, (L - W) / 2), a = [-L / 2, 0, -W / 2], b = [L / 2, 0, -W / 2], c = [L / 2, 0, W / 2], d = [-L / 2, 0, W / 2], e = [-r, H, 0], f = [r, H, 0];
  const v = [].concat(d, c, f, d, f, e, b, a, e, b, e, f, c, b, f, a, d, e);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
}

/**
 * 把「建築自己的座標」轉成世界座標。T = { x, z, th }（中心點與旋轉角）。
 * 斜放的建築（田徑場、體育館、綜合院館）用這個來放碰撞與植栽。
 */
export const toW = (T, lx, lz) => [T.x + lx * Math.cos(T.th) + lz * Math.sin(T.th), T.z - lx * Math.sin(T.th) + lz * Math.cos(T.th)];
