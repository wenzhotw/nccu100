/**
 * 自強九舍 ABC、D 區其餘外牆（牆面與冷氣位置見 dorm9-model.js）。
 * 照片 9024：粉灰色小方磚、深灰窗楣與窗台、白框四格窗；最下面一層看得到的樓加鐵窗。
 * 磚色與屋頂深褐收頭沿用九舍東端（zq10.js，照片 9005），整棟顏色一致。
 * 建完依材質合併，繪製次數不隨牆面數增加。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { BOX, GRAD, block, canvasTex, toon } from '../../../render/kit.js';
import { mergeStatic } from './shanju.js';
import { DORM9, LOBBY_TOP, dorm9Faces, dorm9Ledges, dorm9AcUnits, dorm9Roofs } from './dorm9-model.js';

const TILE = '#cdb2a8', GROUT = '#b3978d', LINTEL = '#6f625f', CAP = '#5a4038';

/** 一格寢室（寬 3 公尺、一層 2.4 公尺）：小方磚底、窗楣窗台、窗；barred 是一樓鐵窗。 */
function bayTexture(barred) {
  return canvasTex(192, 160, (g, w, h) => {
    g.fillStyle = TILE; g.fillRect(0, 0, w, h); g.strokeStyle = GROUT; g.lineWidth = 1;
    for (let y = 0; y <= h; y += 8) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
    for (let x = 0; x <= w; x += 8) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); g.stroke(); }
    // 窗在一格偏右（左邊留給冷氣），上下各一道深灰窗楣與窗台。
    const x0 = 76, x1 = 170, y0 = 34, y1 = 116;
    g.fillStyle = LINTEL; g.fillRect(x0 - 6, y0 - 9, x1 - x0 + 12, 8); g.fillRect(x0 - 6, y1 + 1, x1 - x0 + 12, 9);
    g.fillStyle = '#f3f1ec'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle = '#8fa3a8'; g.fillRect(x0 + 5, y0 + 5, (x1 - x0) / 2 - 7, y1 - y0 - 10);
    g.fillStyle = '#a9bbbf'; g.fillRect((x0 + x1) / 2 + 2, y0 + 5, (x1 - x0) / 2 - 7, y1 - y0 - 10);
    g.fillStyle = '#f3f1ec'; g.fillRect(x0, (y0 + y1) / 2 - 2, x1 - x0, 4);
    if (barred) {
      g.fillStyle = '#e9e6df';
      for (let x = x0 + 8; x < x1 - 2; x += 10) g.fillRect(x, y0, 3, y1 - y0);
      for (const y of [y0 + 12, y1 - 14]) g.fillRect(x0, y, x1 - x0, 3);
    }
  }, [1, 1]);
}
const shared = {};
function mat(name) {
  shared[name] ??= (() => {
    const t = name === 'acFront' ? canvasTex(64, 48, (g, w, h) => {
      g.fillStyle = '#ebe9e3'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8bbbe'; g.beginPath(); g.arc(40, 24, 15, 0, 7); g.fill();
      g.strokeStyle = '#9da1a5'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(25, 12 + i * 8); g.lineTo(55, 12 + i * 8); g.stroke(); }
    }) : bayTexture(name === 'barred');
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
    return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
  })();
  return shared[name];
}

/** 一段牆面：u 以寢室格數、v 以樓層換算，各面樓層線對齊。 */
function facade(f, y0, y1, material) {
  const h = y1 - y0, cols = Math.max(1, Math.round(f.len / DORM9.bay));
  const g = new THREE.PlaneGeometry(f.len, h), uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) / f.len + 0.5) * cols, (p.getY(i) + h / 2 + y0 - f.base) / DORM9.floorH);
  const m = new THREE.Mesh(g, material);
  m.position.set(f.mid[0] + f.n[0] * 0.05, (y0 + y1) / 2, f.mid[1] + f.n[1] * 0.05);
  m.rotation.y = Math.atan2(f.n[0], f.n[1]); scene.add(m);
}

function walls() {
  for (const f of dorm9Faces()) {
    // 最下面一層看得到的樓：地面往上到下一條樓層線（至少一公尺高）貼鐵窗；貼著大廳屋頂的牆沒有。
    const split = f.y0 === LOBBY_TOP ? f.y0 : f.base + Math.ceil((f.y0 - f.base + 1) / DORM9.floorH) * DORM9.floorH;
    if (split > f.y0) facade(f, f.y0, split, mat('barred'));
    facade(f, split, f.y1, mat('bay'));
    // 屋頂深褐收頭（與東端同色）。
    const yaw = Math.atan2(f.n[0], f.n[1]);
    block(f.mid[0] + f.n[0] * 0.1, f.y1 + 0.15, f.mid[1] + f.n[1] * 0.1, f.len + 0.25, 0.4, 0.3, CAP, 0.02).rotation.y = yaw;
  }
  // 每層樓板一道淺灰飾帶，稍微凸出牆面。
  for (const l of dorm9Ledges()) {
    block(l.mid[0] + l.n[0] * 0.1, l.y, l.mid[1] + l.n[1] * 0.1, l.len, 0.12, 0.16, '#d9cfc9').rotation.y = Math.atan2(l.n[0], l.n[1]);
  }
}

/** 冷氣：同一個方塊實例化，正面貼散熱扇圖。 */
function acs() {
  const list = dorm9AcUnits(), m = new THREE.InstancedMesh(BOX, mat('acFront'), list.length), o = new THREE.Object3D();
  list.forEach(({ x, y, z, yaw }, i) => { o.position.set(x, y, z); o.rotation.set(0, yaw, 0); o.scale.set(0.72, 0.5, 0.32); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.name = '九舍冷氣'; m.userData.noOcc = true; scene.add(m);
}

/** 屋頂：灰色防水層（形狀沿輪廓）。 */
function roofs() {
  for (const r of dorm9Roofs()) {
    const shape = new THREE.Shape(r.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), toon('#b8aea6'));
    m.position.y = r.y; scene.add(m);
  }
}

/** 建立九舍其餘外牆（buildMap 呼叫一次）；碰撞沿用灰盒建物。 */
export function buildDorm9() {
  const first = scene.children.length;
  walls(); acs(); roofs();
  mergeStatic(scene.children.slice(first), '九舍外牆合併');
}
