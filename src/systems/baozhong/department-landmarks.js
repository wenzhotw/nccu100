// 六院大型代表物預覽。只取既有 Dxx 佈景的物件意象，不新增活動機制或文字。
// 預覽通過前不擴至其他學系。所有尺寸為帳篷本地公尺，前方為 +z。
import * as THREE from 'three';
import { createDecorCtx } from './decor-ctx.js';
import { openCanopyColliders } from './open-canopy-d26.js';

export const LANDMARK_SAMPLE_IDS = Object.freeze(['D01', 'D11', 'D21', 'D31', 'D32', 'D37']);
export const LANDMARK_PREVIEW_IDS = Object.freeze([...LANDMARK_SAMPLE_IDS, 'D26']);
export const LANDMARK_MOUNT = Object.freeze({ x: -1.14, z: 1.82, footWidth: 0.46, footDepth: 0.38, armY: 2.62 });
export const LANDMARK_SOURCES = Object.freeze({
  D01: 'D01.js：硯台與同軸毛筆', D11: 'D11.js：地球儀與航線環',
  D21: 'D21.js：雙膠捲盤與四瓣輪槽', D31: 'D31.js：正義天平，無法槌',
  D32: 'D32.js：兩腳一橫的 π', D37: 'D37.js：七節點二元樹',
});
const M = LANDMARK_MOUNT;

/** 使用正式 decor ctx 的共用幾何與呼叫端材質，碰撞取實際低處零件。 */
export function buildDepartmentLandmark(group, id, { toon, OUT }) {
  if (!LANDMARK_SAMPLE_IDS.includes(id)) return null;
  const root = new THREE.Group(); root.name = `bz26-landmark-${id}`;
  root.userData.noOcc = true; group.add(root);
  const ctx = createDecorCtx({ THREE, toon, outlineMat: OUT }, root, '#1f3c8f');
  const solids = [];
  const box = (w, h, d, color, x, y, z = M.z) => ctx.box(w, h, d, color, x, y, z, { out: Math.min(0.02, w / 12, h / 12, d / 12) });
  const cyl = (r, h, color, x, y, z = M.z, o = {}) => ctx.cyl(r, r, h, color, x, y, z, { seg: 12, out: Math.min(0.02, r / 6, h / 12), ...o });
  const foot = x => solids.push(box(M.footWidth, 0.12, M.footDepth, '#546e7a', x, 0.06));
  const stand = () => {
    foot(M.x); solids.push(box(0.14, 2.62, 0.14, '#78909c', M.x, 1.31));
    box(1.28, 0.14, 0.14, '#78909c', -0.57, M.armY);
  };
  if (id === 'D01') {
    // 放大原毛筆，筆尖立於硯台，非屋頂圖示或桌上裝飾。
    foot(M.x);
    solids.push(ctx.cyl(0.21, 0.035, 0.68, '#ece6d8', M.x, 0.46, M.z, { seg: 12, out: 0.006 }));
    solids.push(cyl(0.16, 2.54, '#8a6a42', M.x, 2.05));
    cyl(0.19, 0.14, '#e8463c', M.x, 0.85);
    cyl(0.19, 0.14, '#e8463c', M.x, 3.29);
  } else if (id === 'D32') {
    // 巨型 π 兩腳落地，中間維持櫃檯與互動通道。
    for (const x of [M.x, -M.x]) {
      foot(x); solids.push(box(0.18, 3.05, 0.18, '#1565c0', x, 1.525));
    }
    box(2.68, 0.24, 0.22, '#1565c0', 0, 3.05);
  } else {
    stand();
    if (id === 'D11') {
      const globe = ctx.sphere(0.6, '#4fc3f7', 0, 3.32, M.z, { out: 0.02 });
      // 扁厚立體地球保留體積，放在前簷之外，不穿頂棚。
      globe.scale.z = 0.42;
      const ring = ctx.torus(0.72, 0.035, '#f0c94a', 0, 3.32, M.z);
      ring.userData.bz26RouteRing = true;
      box(0.35, 0.25, 0.04, '#66bb6a', -0.16, 3.48, M.z + 0.23);
      box(0.22, 0.29, 0.04, '#66bb6a', 0.2, 3.19, M.z + 0.23);
      box(0.12, 0.3, 0.12, '#78909c', 0, 2.77);
    } else if (id === 'D21') {
      for (const z of [M.z - 0.08, M.z + 0.08]) {
        cyl(0.62, 0.09, '#90a4ae', 0, 3.31, z, { rx: Math.PI / 2, seg: 16 });
      }
      cyl(0.13, 0.3, '#263238', 0, 3.31, M.z, { rx: Math.PI / 2 });
      // 只用四個大槽，遠看保有膠捲輪廓，不加細碎花紋。
      for (const [x, y] of [[-0.3, 3.31], [0.3, 3.31], [0, 3.01], [0, 3.61]]) {
        cyl(0.14, 0.012, '#2a2c4a', x, y, M.z + 0.135, { rx: Math.PI / 2 });
      }
      box(0.12, 0.18, 0.12, '#78909c', 0, 2.72);
    } else if (id === 'D31') {
      box(0.13, 1.05, 0.13, '#c69b3c', 0, 3.15);
      box(1.9, 0.12, 0.14, '#c69b3c', 0, 3.6);
      for (const x of [-0.73, 0.73]) {
        box(0.06, 0.53, 0.06, '#78909c', x, 3.3);
        ctx.cyl(0.29, 0.16, 0.12, '#c69b3c', x, 3.0, M.z, { seg: 12, out: 0.01 });
      }
    } else if (id === 'D37') {
      const points = [[0, 3.85], [-0.49, 3.3], [0.49, 3.3], [-0.76, 2.79], [-0.25, 2.79], [0.25, 2.79], [0.76, 2.79]];
      box(1.66, 0.1, 0.12, '#78909c', 0, 2.67);
      for (const [x, y] of points) ctx.sphere(0.14, '#00bfa5', x, y, M.z, { out: 0.012 });
      for (let i = 1; i < points.length; i++) {
        const [x, y] = points[i], [px, py] = points[Math.floor((i - 1) / 2)];
        const edge = cyl(0.035, Math.hypot(x - px, y - py), '#ece6d8', (x + px) / 2, (y + py) / 2);
        edge.rotation.z = -Math.atan2(x - px, y - py);
      }
    }
  }
  root.updateMatrixWorld(true);
  const parts = [...root.children];
  parts.forEach(p => { p.userData.bz26Landmark = id; });
  const bounds = new THREE.Box3();
  // 使用本地網格矩陣，排除帳篷的世界旋轉。不含僅供視覺的描邊殼。
  for (const p of parts) { p.updateMatrix(); p.geometry.computeBoundingBox(); bounds.union(p.geometry.boundingBox.clone().applyMatrix4(p.matrix)); }
  const boxes = solids.map(p => { p.updateMatrix(); p.geometry.computeBoundingBox(); return p.geometry.boundingBox.clone().applyMatrix4(p.matrix); });
  return { root, parts, bounds, boxes, source: LANDMARK_SOURCES[id] };
}

export function departmentLandmarkColliders(t, landmark, ground = 0) {
  // 通用開放頂棚只保留四柱與櫃檯，剔除 D26 專屬鳥居柱。
  const base = openCanopyColliders(t, ground, false);
  const cs = Math.cos(t.rotY), sn = Math.sin(t.rotY);
  for (const b of landmark.boxes) {
    const x = (b.min.x + b.max.x) / 2, z = (b.min.z + b.max.z) / 2;
    base.push({ obb: true, cx: t.x + x * cs + z * sn, cz: t.z - x * sn + z * cs,
      hx: (b.max.x - b.min.x) / 2, hz: (b.max.z - b.min.z) / 2, cs, sn, top: ground + b.max.y });
  }
  return base;
}
