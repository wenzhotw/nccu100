// 正式ctx抽取既有大型實物片段，保平面比例與來源。只壓縮厚度以避開頂棚與通道。
import * as THREE from 'three';
import { createDecorCtx } from './decor-ctx.js';
import { SOURCE_LANDMARKS } from './landmark-source-registry.js';
const SIGN_STUB = new THREE.PlaneGeometry(1, 1);
const SIGN_MATERIAL = new THREE.MeshBasicMaterial();
const FOOT = new THREE.BoxGeometry(0.46, 0.12, 0.38);
const POST = new THREE.BoxGeometry(0.14, 2.62, 0.14);
const ARM = new THREE.BoxGeometry(1.28, 0.14, 0.14);
const SHELVES = new Map();
function shelfGeometry(width) {
  const key = width.toFixed(4);
  if (!SHELVES.has(key)) SHELVES.set(key, new THREE.BoxGeometry(width, 0.12, 0.42));
  return SHELVES.get(key);
}
export function buildSourceLandmark(group, id, { toon, OUT }) {
  const spec = SOURCE_LANDMARKS[id]; if (!spec) return null;
  const temp = new THREE.Group();
  const ctx = createDecorCtx({ THREE, toon, outlineMat: OUT }, temp, '#1f3c8f');
  // 保留原作者索引，但不製作貼圖、不污染正式招牌快取或新增文字。
  spec.build(Object.freeze({ ...ctx, sign() { const p = new THREE.Mesh(SIGN_STUB, SIGN_MATERIAL); p.userData.bz26Sign = true; temp.add(p); return p; } }));
  const selected = temp.children.slice(spec.start, spec.start + spec.count);
  if (selected.length !== spec.count || selected.some(p => !p.isMesh || p.userData.bz26Sign)) throw new Error(`${id} 代表物來源片段已改動`);
  const sourceCount = selected.length;
  if (spec.spindle) {
    const s = spec.spindle, support = ctx.cyl(.025, .025, s.height, '#78909c', s.x, s.y, s.z);
    support.userData.bz26LandmarkSupport = true; selected.push(support);
  }
  const sourceBounds = new THREE.Box3();
  for (const p of selected) { p.updateMatrix(); p.geometry.computeBoundingBox(); sourceBounds.union(p.geometry.boundingBox.clone().applyMatrix4(p.matrix)); }
  const size = sourceBounds.getSize(new THREE.Vector3()), center = sourceBounds.getCenter(new THREE.Vector3());
  const scale = Math.min(spec.width / size.x, spec.height / size.y);
  const depthScale = Math.min(scale, spec.depth / size.z);
  const root = new THREE.Group(); root.name = `bz26-landmark-${id}`; root.userData.noOcc = true;
  group.add(root);
  const symbol = new THREE.Group(); symbol.name = `bz26-landmark-symbol-${id}`;
  symbol.scale.set(scale, scale, depthScale);
  symbol.position.set(-center.x * scale, 2.75 - sourceBounds.min.y * scale, 1.84 - center.z * depthScale);
  root.add(symbol);
  for (const p of selected) {
    // 以來源幾何／材質重用，描邊重新按放大後的尺寸計算，不把原細物件黑邊放粗。
    p.clear(); symbol.add(p);
    const dims = p.geometry.boundingBox.getSize(new THREE.Vector3());
    const worldScale = Math.min(scale * Math.abs(p.scale.x), scale * Math.abs(p.scale.y), depthScale * Math.abs(p.scale.z));
    const shortest = Math.min(...dims.toArray().filter(v => v > 0.0001));
    const thickness = Math.min(0.018, shortest * worldScale / 12);
    if (thickness > 0.0001) {
      const outline = new THREE.Mesh(p.geometry, OUT);
      outline.scale.set(1 + 2 * thickness / Math.max(dims.x * worldScale, .001), 1 + 2 * thickness / Math.max(dims.y * worldScale, .001), 1 + 2 * thickness / Math.max(dims.z * worldScale, .001));
      p.add(outline);
    }
    if (!p.userData.bz26LandmarkSupport) p.userData.bz26LandmarkSource = `${id}.js:${spec.start}-${spec.start + spec.count - 1}`;
  }
  const parts = [], boxes = [];
  const add = (geo, x, y, z, solid) => {
    const p = new THREE.Mesh(geo, toon('#78909c')); p.position.set(x, y, z); p.receiveShadow = true; root.add(p); p.updateMatrix();
    geo.computeBoundingBox(); const b = geo.boundingBox.clone().applyMatrix4(p.matrix);
    const dim = geo.boundingBox.getSize(new THREE.Vector3()); const line = new THREE.Mesh(geo, OUT);
    line.scale.set(1 + .02 / dim.x, 1 + .02 / dim.y, 1 + .02 / dim.z); p.add(line);
    if (solid) boxes.push(b); parts.push(p);
  };
  add(FOOT, -1.14, .06, 1.82, true); add(POST, -1.14, 1.31, 1.82, true);
  add(ARM, -.57, 2.62, 1.82, false);
  add(shelfGeometry(Math.max(.3, size.x * scale)), 0, 2.69, 1.84, false);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  const symbolBounds = sourceBounds.clone();
  symbol.updateMatrix(); symbolBounds.applyMatrix4(symbol.matrix); bounds.union(symbolBounds);
  for (const p of parts) bounds.union(p.geometry.boundingBox.clone().applyMatrix4(p.matrix));
  parts.push(symbol); parts.forEach(p => { p.userData.bz26Landmark = id; });
  return { root, parts, bounds, boxes, symbolBounds, source: `decor/${id}.js：${spec.label}`, sourceCount };
}
