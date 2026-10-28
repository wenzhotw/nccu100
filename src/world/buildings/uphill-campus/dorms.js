/**
 * 自強五、六、七八舍外觀與周圍環境的建模（資料與位置見 dorms-model.js）。
 * 牆面細節畫在貼圖上，樓板飾帶、冷氣、排水管、樓梯塔、雨遮與周邊道具做成立體，
 * 建完依材質合併，繪製次數不隨零件數增加。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { colliders, obbC } from '../../../core/collision.js';
import { BOX, GRAD, basic, block, canvasTex, mk, toon } from '../../../render/kit.js';
import { heightAt } from './terrain.js';
import { beds, trees, car, mergeStatic } from './shanju.js';
import { BASE, TOP, FLOOR, FLOORS, dormFaces, ledges, acUnits, pipes, STAIR_TOWERS, TOWER_TOP, LOBBY,
  PAVED, STALLS, CARS, TANKS, LAMPS, SLOW_SIGN, bedRects, treeSpots, dormColliders } from './dorms-model.js';

const CONCRETE = '#d4ccbf', SLAB = '#c1b8a9', BRICK = '#86584f', PIPE_RUST = '#b0744a';

/* ---------- 貼圖 ---------- */
/** 混凝土底：米灰底色加幾條很淡的雨水痕。 */
function concrete(g, w, h) {
  g.fillStyle = CONCRETE; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(120,108,92,.07)';
  for (let x = 6; x < w; x += 37) g.fillRect(x, 0, 5, h);
}
const textures = {};
function tex(name) {
  if (textures[name]) return textures[name];
  const draw = {
    // 一格窗（寬 3.4 公尺、一層 3 公尺）：左邊白框推拉窗，右邊一塊深紅褐磚牆，底部是樓板。
    bay: [256, 256, (g, w, h) => {
      concrete(g, w, h);
      g.fillStyle = BRICK; g.fillRect(160, 46, 74, 150);
      g.fillStyle = '#774b43'; for (let y = 56; y < 196; y += 12) g.fillRect(160, y, 74, 2);
      g.fillStyle = '#f0efea'; g.fillRect(16, 52, 128, 140);
      g.fillStyle = '#7d909c'; g.fillRect(22, 58, 56, 128); g.fillRect(82, 58, 56, 128);
      g.fillStyle = '#e9e1cf'; g.fillRect(84, 60, 30, 124);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(26, 62, 20, 50);
      g.fillStyle = '#f0efea'; g.fillRect(16, 118, 128, 5);
      g.fillStyle = SLAB; g.fillRect(0, h - 22, w, 22);
    }],
    // 樓梯塔：中間一整條由下到上的窄長窗，每層一道橫框。
    tower: [128, 512, (g, w, h) => {
      concrete(g, w, h);
      g.fillStyle = '#f0efea'; g.fillRect(40, 30, 48, h - 50);
      g.fillStyle = '#8fa2ad'; g.fillRect(46, 34, 36, h - 58);
      g.fillStyle = '#f0efea'; for (let y = 34; y < h - 20; y += 34) g.fillRect(46, y, 36, 3);
      g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(50, 40, 10, h - 70);
    }],
    // 大廳連接棟（照片 9078）：深紅褐牆、二到四樓整排橫窗、一樓中間玻璃大門。
    lobby: [512, 512, (g, w, h) => {
      g.fillStyle = '#6f4039'; g.fillRect(0, 0, w, h);
      g.fillStyle = CONCRETE; g.fillRect(0, 0, 40, h); g.fillRect(w - 40, 0, 40, h);
      for (let k = 1; k < 4; k++) {
        const y = h - (k + 1) * h / 4 + 26;
        g.fillStyle = '#ecebe6'; g.fillRect(56, y, w - 112, 66);
        g.fillStyle = '#a7bac3'; g.fillRect(60, y + 4, w - 120, 58);
        g.fillStyle = '#f6e7c2'; for (let x = 80; x < w - 80; x += 96) g.fillRect(x, y + 10, 40, 46);
        g.fillStyle = '#ecebe6'; for (let x = 60; x < w - 60; x += 48) g.fillRect(x, y + 4, 4, 58); g.fillRect(60, y + 40, w - 120, 3);
      }
      g.fillStyle = '#ecebe6'; g.fillRect(120, h - 112, w - 240, 112);
      g.fillStyle = '#f5e5bd'; g.fillRect(126, h - 106, w - 252, 106);
      g.fillStyle = '#d9cfb6'; g.fillRect(126, h - 106, w - 252, 18);
      g.fillStyle = '#ecebe6'; for (let x = 126; x < w - 120; x += 52) g.fillRect(x, h - 106, 5, 106);
    }],
    // 大門上方橫幅（照片 9078、9082）：綠色山景插畫，紅字標語。
    banner: [1024, 192, (g, w, h) => {
      g.fillStyle = '#f2f5ea'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b9dca1';
      g.beginPath(); g.moveTo(0, h); g.quadraticCurveTo(160, 40, 330, 120); g.quadraticCurveTo(520, 30, 700, 110); g.quadraticCurveTo(880, 50, w, 100); g.lineTo(w, h); g.fill();
      g.fillStyle = '#7fbf7a';
      g.beginPath(); g.moveTo(0, h); g.quadraticCurveTo(220, 100, 420, 160); g.quadraticCurveTo(700, 90, w, 170); g.lineTo(w, h); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(120, 72, 70, 30); g.fillStyle = '#5d7fb0'; g.fillRect(850, 64, 70, 34);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#d23a2f'; g.font = '900 64px "Noto Sans TC",sans-serif'; g.fillText('政大學生宿舍歡迎您', w / 2, 62, w - 120);
      g.fillStyle = '#c0392b'; g.font = '700 38px "Noto Sans TC",sans-serif'; g.fillText('環抱瑰麗指南山城　開啟精彩大學生涯', w / 2, 136, w - 160);
    }],
    acFront: [64, 48, (g, w, h) => {
      g.fillStyle = '#ebe9e3'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8bbbe'; g.beginPath(); g.arc(40, 24, 15, 0, 7); g.fill();
      g.strokeStyle = '#9da1a5'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(25, 12 + i * 8); g.lineTo(55, 12 + i * 8); g.stroke(); }
    }],
    // 「慢」字三角警告牌：紅框白底黑字（照片 9087）。
    slow: [128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#d23a2f'; g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w - 4, h - 12); g.lineTo(4, h - 12); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w / 2, 30); g.lineTo(w - 26, h - 24); g.lineTo(26, h - 24); g.closePath(); g.fill();
      g.fillStyle = '#26272c'; g.font = '900 40px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('慢', w / 2, h - 50);
    }],
  }[name];
  textures[name] = canvasTex(...draw);
  return textures[name];
}
const shared = {};
function mat(name, extra = {}) {
  shared[name] ??= (() => {
    const t = tex(name); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
    return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD, ...extra });
  })();
  return shared[name];
}

/* ---------- 外牆 ---------- */
/** 沿一面牆貼立面；UV 以樓層與窗格為單位，高架段少一層也不會錯位。 */
function facade(f, material, perBay = true) {
  const h = f.y1 - f.y0, g = new THREE.PlaneGeometry(f.L, h), uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    const u = (p.getX(i) / f.L + 0.5) * (perBay ? f.bays : 1);
    const v = perBay ? (p.getY(i) + h / 2 + f.y0 - BASE) / FLOOR : (p.getY(i) + h / 2 + f.y0 - BASE) / (TOP - BASE);
    uv.setXY(i, u, v);
  }
  const m = new THREE.Mesh(g, material);
  m.position.set(f.mid[0] + f.n[0] * 0.04, (f.y0 + f.y1) / 2, f.mid[1] + f.n[1] * 0.04);
  m.rotation.y = Math.atan2(f.n[0], f.n[1]); scene.add(m); return m;
}
function walls() {
  for (const f of dormFaces()) facade(f, f.kind === 'dorm' ? mat('bay') : mat('lobby'), f.kind === 'dorm');
  for (const [x, y, z, l, h, d, yaw] of ledges()) block(x, y, z, l, h, d, SLAB, 0.02).rotation.y = yaw;
  for (const { x, z, y0, y1 } of pipes()) mk(PIPE, toon(PIPE_RUST), x, (y0 + y1) / 2, z, { out: 0.012 }).scale.y = y1 - y0;
}

const PIPE = new THREE.CylinderGeometry(0.07, 0.07, 1, 6);
/** 冷氣：同一個方塊實例化，正面貼散熱扇圖。 */
function acs() {
  const list = acUnits(), m = new THREE.InstancedMesh(BOX, mat('acFront'), list.length), o = new THREE.Object3D();
  list.forEach(({ x, y, z, yaw }, i) => { o.position.set(x, y, z); o.rotation.set(0, yaw, 0); o.scale.set(0.82, 0.56, 0.32); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.name = '宿舍冷氣'; m.userData.noOcc = true; scene.add(m);
}

/** 樓梯塔：混凝土量體，朝外一面貼窄長窗，頂上一圈女兒牆。 */
function towers() {
  for (const t of STAIR_TOWERS) {
    const cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2, w = t.x1 - t.x0, d = t.z1 - t.z0, h = TOWER_TOP - BASE;
    block(cx, BASE + h / 2, cz, w, h, d, CONCRETE, 0.04);
    block(cx, TOWER_TOP + 0.2, cz, w + 0.2, 0.4, d + 0.2, SLAB, 0.02);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.9, h - 0.4), mat('tower'));
    face.position.set(cx + t.face[0] * (w / 2 + 0.03), BASE + h / 2, cz); face.rotation.y = t.face[0] > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(face);
  }
}

/** 七八舍大廳：大門雨遮、兩盞壁燈與門上橫幅。 */
function lobby() {
  const { x, z0, z1, canopy } = LOBBY, zc = (z0 + z1) / 2;
  block(x + canopy.depth / 2, canopy.y, zc, canopy.depth, 0.22, z1 - z0 + 0.6, '#e9e6de', 0.02);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0 + 0.4, 1.15), mat('banner'));
  banner.position.set(x + 0.13, canopy.y + 0.78, zc); banner.rotation.y = Math.PI / 2; scene.add(banner);
  block(x + 0.06, canopy.y + 0.78, zc, 0.06, 1.25, z1 - z0 + 0.5, '#c9c4b8');
  for (const z of [z0 - 0.6, z1 + 0.6]) wallLamp(x, BASE + 2.4, z, [1, 0]);
}
const bulb = () => toon('#fff3cf', { emissive: '#ffd98a', emissiveIntensity: 0.7 });
function wallLamp(x, y, z, n) {
  block(x + n[0] * 0.12, y, z + n[1] * 0.12, n[0] ? 0.24 : 0.32, 0.32, n[0] ? 0.32 : 0.24, '#5c5f63', 0.01);
  block(x + n[0] * 0.26, y - 0.04, z + n[1] * 0.26, n[0] ? 0.06 : 0.22, 0.2, n[0] ? 0.22 : 0.06, bulb());
}

/* ---------- 地面：柏油、標線、停車格 ---------- */
function paving() {
  for (const { name, rect: [x0, z0, x1, z1] } of PAVED) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), toon('#6f7278'));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, BASE + 0.03, (z0 + z1) / 2); m.name = name; scene.add(m);
  }
  const line = (w, d, x, z, c = '#f1f1ec') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon(c)); m.rotation.x = -Math.PI / 2; m.position.set(x, BASE + 0.045, z); scene.add(m);
  };
  for (const s of STALLS) {
    for (let x = s.x0; x <= s.x1 + 0.01; x += 2.4) line(0.12, s.depth, x, s.z + s.depth / 2);
    line(s.x1 - s.x0, 0.12, (s.x0 + s.x1) / 2, s.z);
  }
  // 車道兩側白色邊線（照片 9079、9080）與停車場貼牆的紅色禁停線（照片 9074）。
  const lane = PAVED[2].rect;
  line(lane[2] - lane[0], 0.12, (lane[0] + lane[2]) / 2, lane[1] + 0.3);
  line(lane[2] - lane[0], 0.12, (lane[0] + lane[2]) / 2, lane[3] - 0.3);
  line(0.12, 31.9 - 26.8 - 0.2, -33.6, 29.3, '#d64c4c');
  line(-21.4 - -33.9, 0.12, -27.6, 31.65, '#d64c4c');
}

/* ---------- 道具 ---------- */
const TANK = new THREE.CylinderGeometry(1, 1, 1, 14), POLE = new THREE.CylinderGeometry(0.07, 0.09, 1, 8);
function props() {
  block((TANKS[0].x + TANKS[3].x) / 2, BASE + 0.1, TANKS[0].z, TANKS[3].x - TANKS[0].x + 1.6, 0.2, 1.5, '#b7b2a8', 0.01);
  for (const t of TANKS) {
    const m = mk(TANK, toon('#dfe3e6'), t.x, BASE + 0.2 + t.h / 2, t.z, { out: 0.02 }); m.scale.set(t.r, t.h, t.r);
    for (const dy of [-0.5, 0, 0.5]) block(t.x, BASE + 0.2 + t.h / 2 + dy, t.z, t.r * 2.04, 0.05, t.r * 2.04, '#b9c0c5');
  }
  for (const [x, z, dir] of LAMPS) {
    const y = heightAt(x, z);
    mk(POLE, toon('#9aa3a6'), x, y + 3, z, { out: 0.015 }).scale.y = 6;
    block(x + dir * 0.6, y + 6, z, 1.2, 0.08, 0.08, '#9aa3a6');
    block(x + dir * 1.15, y + 5.95, z, 0.45, 0.12, 0.25, '#c9cfd1', 0.015);
    block(x + dir * 1.15, y + 5.88, z, 0.36, 0.03, 0.2, bulb());
  }
  // 一般外牆一樓轉角的壁燈：每面長牆一盞，掛在第一格窗右邊。
  for (const f of dormFaces().filter(f => f.kind === 'dorm' && f.L > 14 && f.y0 === BASE)) {
    const t = 1.6 / f.L;
    wallLamp(f.a[0] + (f.b[0] - f.a[0]) * t, BASE + 2.5, f.a[1] + (f.b[1] - f.a[1]) * t, f.n);
  }
  const { x, z, yaw } = SLOW_SIGN, y = heightAt(x, z), sign = new THREE.Group();
  sign.position.set(x, y, z); sign.rotation.y = yaw; scene.add(sign);
  mk(POLE, toon('#9aa3a6'), 0, 1.1, 0, { out: 0.012, parent: sign }).scale.set(0.7, 2.2, 0.7);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), basic({ map: tex('slow'), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
  face.position.set(0, 2.45, 0.06); sign.add(face);
}

let added = 0;
/** 這一帶另外登記的碰撞數（樓梯塔、水塔、路燈、車、樹），供入口測試核對總數。 */
export const dormsColliderCount = () => added;

/** 建立五六七八舍外觀與周圍環境（buildMap 呼叫一次）。 */
export function buildDorms() {
  const first = scene.children.length, start = colliders.length;
  walls(); acs(); towers(); lobby(); paving(); props();
  // 牆腳花台只種在跟宿舍一樓同高的平地，坡上不放。
  beds(bedRects().filter(([x0, z0, x1, z1]) => [[x0, z0], [x1, z1], [x0, z1], [x1, z0]].every(p => Math.abs(heightAt(...p) - BASE) < 0.3))
    .map(r => [...r, Math.round((r[2] - r[0]) * (r[3] - r[1]) * 0.9)]));
  for (const [x, z, color, suv, cover] of CARS) car(x, z, color, suv, cover);
  trees(treeSpots());
  for (const c of dormColliders()) obbC(c.cx, c.cz, c.hx, c.hz, c.th);
  added = colliders.length - start;
  mergeStatic(scene.children.slice(first), '五六七八舍一帶合併');
}
