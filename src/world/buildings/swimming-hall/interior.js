/**
 * 游泳館內部（室內房間，格式見 docs/interiors.md）。依照片：
 * - 一進門是大廳和櫃檯，櫃檯左右兩邊是更衣室，穿過更衣室才到泳池
 * - 泳池大廳：淺藍色鋼構屋架斜斜架過去、兩側長條高窗和下排百葉、米灰色長條磚池畔
 * - 七水道泳池，水道繩、跳台、扶梯、粉紅色浮板、紅色救生圈箱，水裡有人在游泳
 *
 * 房間座標從原點算：出口在 +z（z = 20），越往 -z 越裡面。
 * 能不能下水的規則（要穿泳衣，或打贏救生員）在 systems/swimming。
 */
import * as THREE from 'three';
import { state } from '../../../core/state.js';
import { scene } from '../../../core/engine.js';
import { GRAD, SPH, basic, block, canvasTex, flat, hText, mk, plane, toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';

// 房間範圍與分區（z 由外往內：大廳 → 更衣室 → 泳池大廳）
export const R = { x0: -16, x1: 16, z0: -46, z1: 20, lobbyZ: 6, lockerZ: -2, h: 9 };
// 泳池（水裡的範圍）與水面高度
export const POOL = { x0: -9, x1: 9, z0: -42, z1: -10, water: -0.25, floor: -1.7, swimY: -0.5, lanes: 7 };
// 更衣室門洞（大廳 → 更衣室、更衣室 → 泳池，左右各一個）
const DOOR = [[-11, -8], [8, 11]];
const WALL = '#eef0ec', TRIM = '#c9d3d6', BEAM = '#8fc3d2', BEAM2 = '#79afc0';

export const inPool = (x, z, pad = 0) => x > POOL.x0 - pad && x < POOL.x1 + pad && z > POOL.z0 - pad && z < POOL.z1 + pad;

/* ---------- 材質 ---------- */
function tileMat(rx, ry, a, b) {
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = a; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -32 : 0; x < w; x += 64) {
      g.fillStyle = ['#cfc3ad', '#c4b8a3', '#d6cbb6', b][(x / 8 + y / 16) & 3]; g.fillRect(x + 1, y + 1, 62, 14);
    }
  }, [rx, ry]);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}
function winMat(rx, sky) {
  const t = canvasTex(128, 64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, sky ? '#e9f6ff' : '#dff0f7'); gr.addColorStop(1, sky ? '#bfe2f2' : '#b9d9c4');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (!sky) { g.fillStyle = 'rgba(90,150,90,.45)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(Math.random() * w, h - 6, 10 + Math.random() * 10, 0, 7); g.fill(); } }
    g.fillStyle = '#ffffff'; for (let x = 0; x <= w; x += 32) g.fillRect(x - 2, 0, 4, h); g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
  }, [rx, 1]);
  return basic({ map: t });
}
function louverMat(rx) {
  const t = canvasTex(64, 32, (g, w, h) => { g.fillStyle = '#5a4a3c'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a6655'; for (let y = 2; y < h; y += 5) g.fillRect(0, y, w, 2); }, [rx, 1]);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}
// 池水：淺藍色加上會流動的光紋（update 裡移動貼圖）
const waterTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#4fc3e0'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.32)'; g.lineWidth = 2.5;
  for (let i = 0; i < 26; i++) { const x = Math.random() * w, y = Math.random() * h, r = 10 + Math.random() * 22; g.beginPath(); g.ellipse(x, y, r, r * 0.55, Math.random() * 3, 0, Math.PI * 1.3); g.stroke(); }
}, [4, 7]);
const waterMat = new THREE.MeshToonMaterial({ map: waterTex, gradientMap: GRAD, transparent: true, opacity: 0.78, depthWrite: false });

/* ---------- 游泳的人 ---------- */
const SWIMMERS = [];
function swimmer(x, z, cap, speed) {
  const g = new THREE.Group(); g.position.set(x, POOL.water - 0.05, z);
  const body = new THREE.Group(); g.add(body);
  const torso = mk(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), toon('#ffd9c0'), 0, 0, 0, { parent: body, out: 0.012 }); torso.rotation.x = Math.PI / 2;
  mk(SPH, toon('#ffd9c0'), 0, 0.08, 0.52, { parent: body, out: 0.012 }).scale.setScalar(0.2);
  const c = mk(new THREE.SphereGeometry(0.21, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), toon(cap), 0, 0.1, 0.54, { parent: body }); c.rotation.x = 0.5;
  const arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * 0.2, 0, 0.32); body.add(sh); mk(new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), toon('#ffd9c0'), 0, 0, 0.26, { parent: sh }).rotation.x = Math.PI / 2; return sh; });
  const legs = [-1, 1].map(s => { const hp = new THREE.Group(); hp.position.set(s * 0.09, 0, -0.35); body.add(hp); mk(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), toon('#2f4f8f'), 0, 0, -0.25, { parent: hp }).rotation.x = Math.PI / 2; return hp; });
  // 水花
  const foam = mk(new THREE.CircleGeometry(0.45, 12), basic({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }), 0, 0.17, 0.2, { parent: g }); foam.rotation.x = -Math.PI / 2;
  SWIMMERS.push({ g, arms, legs, foam, dir: Math.random() < 0.5 ? 1 : -1, speed, ph: Math.random() * 6 });
  return g;
}

/* ---------- 建模 ---------- */
export function buildInterior() {
  const { x0, x1, z0, z1, lobbyZ, lockerZ, h } = R, W = x1 - x0;
  const wall = (x, z, w, d, hh = h, col = WALL) => { block(x, hh / 2, z, w, hh, d, col); boxC(x - w / 2, x + w / 2, z - d / 2, z + d / 2); };

  /* 大廳：淺色石英磚、櫃檯、出口門 */
  flat(W, z1 - lobbyZ, tileMat(8, 2, '#d9d2c4', '#e3dccd'), 0, 0.01, (z1 + lobbyZ) / 2);
  wall(0, z1 + 0.2, W, 0.4, 5);
  block(0, 1.35, z1 - 0.05, 2.4, 2.7, 0.12, '#6f8fa0');
  block(0, 2.85, z1 - 0.05, 2.8, 0.25, 0.14, '#3e5a6a');
  [x0 - 0.2, x1 + 0.2].forEach(x => wall(x, (z1 + lobbyZ) / 2, 0.4, z1 - lobbyZ, 5));
  block(0, 5.1, (z1 + lobbyZ) / 2, W, 0.25, z1 - lobbyZ, '#f6f6f2');
  // 櫃檯
  block(0, 0.55, 8.6, 7, 1.1, 0.9, '#e7eef2', 0.03); block(0, 1.14, 8.6, 7.3, 0.08, 1.1, '#5aa0c8', 0.02);
  boxC(-3.5, 3.5, 8.15, 9.05);
  block(-2.4, 1.35, 8.4, 0.5, 0.4, 0.35, '#2a2c35');  // 刷卡機
  const sign = hText('政大游泳館', '#ffffff', '900 72px "Noto Sans TC",sans-serif', 640, 120, 60);
  block(0, 3.2, lobbyZ + 0.25, 7, 1, 0.1, '#2f7fb5', 0.02); plane(6.6, 0.9, basic({ map: sign, transparent: true }), 0, 3.2, lobbyZ + 0.31);
  // 指示牌：左男右女
  const tag = (txt, col, x) => { const t = hText(txt, '#ffffff', '900 64px "Noto Sans TC",sans-serif', 320, 100, 40); block(x, 3.05, lobbyZ + 0.25, 3, 0.7, 0.08, col, 0.02); plane(2.8, 0.62, basic({ map: t, transparent: true }), x, 3.05, lobbyZ + 0.3); };
  tag('男更衣室', '#3f78c8', -9.5); tag('女更衣室', '#d8608c', 9.5);
  // 大廳的長椅和盆栽
  [-13, 13].forEach(x => { block(x, 0.4, 13, 1.2, 0.12, 3.5, '#b98a5a', 0.02); boxC(x - 0.6, x + 0.6, 11.2, 14.8); mk(new THREE.CylinderGeometry(0.35, 0.3, 0.6, 10), toon('#c96a4a'), x, 0.3, 7.4, { out: 0.02 }); mk(SPH, toon('#4f9a48'), x, 1.0, 7.4, { out: 0.03 }).scale.set(0.55, 0.6, 0.55); });

  /* 大廳 → 更衣室的牆（左右各留門洞），更衣室 → 泳池的牆（同樣位置留門洞） */
  [lobbyZ, lockerZ].forEach(z => {
    const segs = [[x0, DOOR[0][0]], [DOOR[0][1], DOOR[1][0]], [DOOR[1][1], x1]];
    segs.forEach(([a, b]) => wall((a + b) / 2, z, b - a, 0.4, z === lockerZ ? 3.4 : 5));
    DOOR.forEach(([a, b]) => block((a + b) / 2, 3.1, z, b - a, 0.6, 0.4, WALL));
  });
  // 中間（櫃檯後面）是員工室，左右是更衣室的牆
  [-4, 4].forEach(x => wall(x, (lobbyZ + lockerZ) / 2, 0.4, lobbyZ - lockerZ, 3.4));

  /* 更衣室：置物櫃、長椅、淋浴隔板 */
  [-1, 1].forEach(s => {
    const cx = s * 10, col = s < 0 ? '#3f78c8' : '#d8608c';
    flat(11.6, lobbyZ - lockerZ, tileMat(4, 3, '#cfd8dc', '#dfe6e8'), cx, 0.01, (lobbyZ + lockerZ) / 2);
    block(cx, 3.5, (lobbyZ + lockerZ) / 2, 12, 0.2, lobbyZ - lockerZ, '#f4f6f6');
    // 外牆的置物櫃
    const lockTex = canvasTex(128, 128, (g, w, hh) => { g.fillStyle = col; g.fillRect(0, 0, w, hh); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3;
      for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, hh); g.stroke(); } g.beginPath(); g.moveTo(0, hh / 2); g.lineTo(w, hh / 2); g.stroke();
      g.fillStyle = '#f2f2ee'; for (let x = 0; x < w; x += 32) { g.fillRect(x + 22, 20, 4, 10); g.fillRect(x + 22, hh / 2 + 20, 4, 10); } }, [4, 1]);
    const lx = s * 15.4;
    block(lx, 1.1, (lobbyZ + lockerZ) / 2, 0.8, 2.2, lobbyZ - lockerZ - 0.6, new THREE.MeshToonMaterial({ map: lockTex, gradientMap: GRAD }), 0.03);
    boxC(lx - 0.4, lx + 0.4, lockerZ, lobbyZ);
    // 長椅
    block(cx, 0.42, 2, 0.9, 0.1, 4.6, '#b98a5a', 0.02); [0.4, 3.6].forEach(dz => block(cx, 0.2, dz, 0.7, 0.4, 0.15, '#7d838a'));
    boxC(cx - 0.45, cx + 0.45, -0.3, 4.3);
    // 靠中間牆的淋浴隔板
    for (let k = 0; k < 3; k++) { const z = lockerZ + 1.2 + k * 2.2; block(s * 4.9, 1.1, z + 1, 1.6, 2.2, 0.08, '#e6eef0', 0.02); }
    mk(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), toon('#c9ced3'), s * 4.5, 2.2, lockerZ + 2.3, {});
  });

  /* 泳池大廳 */
  const hz0 = z0, hz1 = lockerZ, deck = tileMat(6, 8, '#cbbfa8', '#bfb39d');
  // 池畔地板（四塊圍著泳池）
  flat(POOL.x0 - x0, hz1 - hz0, deck, (x0 + POOL.x0) / 2, 0.01, (hz0 + hz1) / 2);
  flat(x1 - POOL.x1, hz1 - hz0, tileMat(6, 8, '#cbbfa8', '#bfb39d'), (x1 + POOL.x1) / 2, 0.01, (hz0 + hz1) / 2);
  flat(POOL.x1 - POOL.x0, hz1 - POOL.z1, tileMat(5, 2, '#cbbfa8', '#bfb39d'), 0, 0.01, (hz1 + POOL.z1) / 2);
  flat(POOL.x1 - POOL.x0, POOL.z0 - hz0, tileMat(5, 1, '#cbbfa8', '#bfb39d'), 0, 0.01, (POOL.z0 + hz0) / 2);
  // 池邊的排水溝與白色池緣
  const pw = POOL.x1 - POOL.x0, pd = POOL.z1 - POOL.z0, pcx = (POOL.x0 + POOL.x1) / 2, pcz = (POOL.z0 + POOL.z1) / 2;
  [[pw + 0.6, 0.3, pcx, POOL.z1 + 0.15], [pw + 0.6, 0.3, pcx, POOL.z0 - 0.15], [0.3, pd, POOL.x0 - 0.15, pcz], [0.3, pd, POOL.x1 + 0.15, pcz]].forEach(([w, d, x, z]) => flat(w, d, '#eef2f2', x, 0.02, z));
  // 池底與池壁（淺藍磁磚，池底畫水道黑線）
  const floorTex = canvasTex(256, 256, (g, w, hh) => { g.fillStyle = '#8fd6ea'; g.fillRect(0, 0, w, hh); g.strokeStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i <= w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, hh); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } });
  flat(pw, pd, new THREE.MeshToonMaterial({ map: floorTex, gradientMap: GRAD }), pcx, POOL.floor, pcz);
  const laneW = pw / POOL.lanes;
  for (let k = 0; k < POOL.lanes; k++) flat(0.3, pd - 3, '#1f4f7a', POOL.x0 + laneW * (k + 0.5), POOL.floor + 0.01, pcz);
  const side = toon('#7fcde3'), dpt = -POOL.floor;
  [[pw, 0.2, pcx, POOL.z1 + 0.1], [pw, 0.2, pcx, POOL.z0 - 0.1], [0.2, pd, POOL.x0 - 0.1, pcz], [0.2, pd, POOL.x1 + 0.1, pcz]].forEach(([w, d, x, z]) => block(x, POOL.floor / 2, z, w, dpt, d, side));
  // 水面
  const water = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), waterMat); water.rotation.x = -Math.PI / 2; water.position.set(pcx, POOL.water, pcz); water.renderOrder = 2; water.userData.noOcc = true;
  scene.add(water);
  // 水道繩（藍白相間的浮球）
  const ropeGeo = new THREE.CylinderGeometry(0.07, 0.07, 1, 8); ropeGeo.rotateX(Math.PI / 2);
  for (let k = 1; k < POOL.lanes; k++) {
    const x = POOL.x0 + laneW * k;
    const n = Math.floor(pd / 0.6), mesh = new THREE.InstancedMesh(ropeGeo, toon('#ffffff'), n), m4 = new THREE.Matrix4(), c = new THREE.Color();
    for (let i = 0; i < n; i++) { m4.makeScale(1, 1, 0.5); m4.setPosition(x, POOL.water + 0.03, POOL.z0 + 0.3 + i * 0.6); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, c.set(i < 8 || i > n - 9 ? '#e8463c' : (i % 2 ? '#2f6fd0' : '#f4f4ee'))); }
    mesh.userData.noOcc = true; scene.add(mesh);
  }
  // 跳台（裡面那一端）與扶梯
  for (let k = 0; k < POOL.lanes; k++) {
    const x = POOL.x0 + laneW * (k + 0.5), z = POOL.z0 - 0.75;
    block(x, 0.38, z, 0.7, 0.12, 0.6, '#f2f2ee', 0.02); block(x, 0.2, z - 0.15, 0.5, 0.4, 0.3, '#3a6fb0');
    const n = hText(String(k + 1), '#2a2c4a', '900 90px Arial,sans-serif', 128, 128, 0); plane(0.4, 0.4, basic({ map: n, transparent: true }), x, 0.2, z + 0.16);
    boxC(x - 0.35, x + 0.35, z - 0.35, z + 0.35);
  }
  [[POOL.x0 + 0.5, POOL.z1 - 0.25], [POOL.x1 - 0.5, POOL.z1 - 0.25], [POOL.x0 + 0.5, POOL.z0 + 0.25], [POOL.x1 - 0.5, POOL.z0 + 0.25]].forEach(([x, z]) => {
    [-0.25, 0.25].forEach(dx => { const r = mk(new THREE.TorusGeometry(0.35, 0.03, 6, 12, Math.PI), toon('#d8dde0'), x + dx, 0.3, z, {}); r.rotation.y = Math.PI / 2;
      mk(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), toon('#d8dde0'), x + dx, -0.4, z + (z > pcz ? -0.32 : 0.32), {}); });
  });
  // 粉紅色浮板、救生圈箱、時鐘
  for (let i = 0; i < 4; i++) block(-11.5, 0.06 + i * 0.07, -9, 0.9, 0.06, 0.5, i % 2 ? '#f39ac0' : '#ee7fb0', 0.01);
  boxC(-12, -11, -9.3, -8.7);
  block(x1 - 0.3, 1.4, -18, 0.3, 1.2, 0.8, '#e8463c', 0.02);
  const buoy = mk(new THREE.TorusGeometry(0.28, 0.08, 8, 16), toon('#f4f4ee'), x1 - 0.5, 1.4, -18, {}); buoy.rotation.y = Math.PI / 2;
  const clock = mk(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 20), toon('#ffffff'), 0, 5.6, z0 + 0.25, { out: 0.03 }); clock.rotation.x = Math.PI / 2;
  // 救生員高腳椅
  { const x = 11.6, z = -26; [-0.4, 0.4].forEach(dx => [-0.4, 0.4].forEach(dz => block(x + dx, 0.9, z + dz, 0.08, 1.8, 0.08, '#f2f2ee')));
    block(x, 1.85, z, 1, 0.12, 1, '#e8463c', 0.02); block(x + 0.45, 2.3, z, 0.1, 0.8, 1, '#e8463c', 0.02); boxC(x - 0.5, x + 0.5, z - 0.5, z + 0.5); }

  /* 泳池大廳的牆：下排落地窗加百葉、上面長條高窗，兩側和最裡面 */
  const hd = hz1 - hz0, hcz = (hz0 + hz1) / 2;
  [-1, 1].forEach(s => {
    const x = s * (x1 + 0.2);
    block(x, h / 2, hcz, 0.4, h, hd, WALL); boxC(x - 0.2, x + 0.2, hz0, hz1);
    const ry = -s * Math.PI / 2, xi = s * (x1 - 0.01);
    plane(hd - 2, 2.2, winMat(hd / 4), xi, 1.9, hcz, 0, ry);
    plane(hd - 2, 0.7, louverMat(hd / 2), xi, 3.4, hcz, 0, ry);
    plane(hd - 2, 1.8, winMat(hd / 4, true), xi, 6.3, hcz, 0, ry);
    for (let z = hz0 + 1; z <= hz1 - 1; z += 4.4) block(xi - s * 0.15, h / 2, z, 0.3, h, 0.4, TRIM);
  });
  block(0, h / 2, hz0 - 0.2, W, h, 0.4, WALL); boxC(x0, x1, hz0 - 0.4, hz0);
  plane(W - 2, 2.2, winMat(W / 4), 0, 1.9, hz0 + 0.01);
  plane(W - 2, 0.7, louverMat(W / 2), 0, 3.4, hz0 + 0.01);
  plane(W - 2, 1.8, winMat(W / 4, true), 0, 6.3, hz0 + 0.01);
  block(0, (h + 3.4) / 2, lockerZ + 0.2, W, h - 3.4, 0.4, WALL);   // 更衣室上方的牆

  /* 屋頂：淺藍色鋼構屋架（照片上斜斜的大樑，樑上有開孔），上面是深色的屋面板 */
  const roof = canvasTex(64, 64, (g, w, hh) => { g.fillStyle = '#3f5a68'; g.fillRect(0, 0, w, hh); g.fillStyle = '#4e6c7a'; for (let y = 0; y < hh; y += 8) g.fillRect(0, y, w, 3); }, [8, 12]);
  plane(W, hd, new THREE.MeshToonMaterial({ map: roof, gradientMap: GRAD, side: THREE.DoubleSide }), 0, h + 0.6, hcz, Math.PI / 2);
  const holes = canvasTex(256, 32, (g, w, hh) => { g.fillStyle = BEAM; g.fillRect(0, 0, w, hh); g.fillStyle = '#6d9fae'; for (let x = 20; x < w; x += 60) for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) g.fillRect(x + k * 7, 8 + j * 10, 4, 4); }, [3, 1]);
  const beamMat = new THREE.MeshToonMaterial({ map: holes, gradientMap: GRAD });
  for (let z = hz0 + 2; z < hz1; z += 4.4) {
    const b = block(0, h - 0.6, z, W, 0.9, 0.35, beamMat, 0.02); b.rotation.z = 0.06; b.userData.noOcc = true;
    [-1, 1].forEach(s => { const k = block(s * (x1 - 1.4), h - 1.6, z, 2.6, 0.35, 0.3, BEAM2, 0.02); k.rotation.z = s * 0.6; k.userData.noOcc = true; });
  }
  for (let x = x0 + 4; x < x1; x += 4) { const b = block(x, h - 0.05, hcz, 0.35, 0.45, hd, BEAM2, 0.02); b.userData.noOcc = true; }

  /* 水裡游泳的人 */
  [[0, -30, '#e8463c', 1.4], [1, -16, '#f0c94a', 1.1], [2, -36, '#2f6fd0', 1.7], [4, -22, '#ffffff', 1.2], [5, -34, '#3a3d45', 1.5], [6, -14, '#f39ac0', 1.0]].forEach(([lane, z, cap, sp]) => scene.add(swimmer(POOL.x0 + laneW * (lane + 0.5), z, cap, sp)));
}

/* ---------- 每一幀：水波流動、游泳的人來回游 ---------- */
let t = 0;
export function updateInterior(dt) {
  t += dt;
  waterTex.offset.set(Math.sin(t * 0.3) * 0.05, t * 0.03);
  SWIMMERS.forEach(s => {
    s.ph += dt * 5;
    const p = s.g.position; p.z += s.dir * s.speed * dt;
    if (p.z < POOL.z0 + 1.2) s.dir = 1; if (p.z > POOL.z1 - 1.2) s.dir = -1;
    s.g.rotation.y = s.dir > 0 ? 0 : Math.PI;
    s.arms.forEach((a, i) => { a.rotation.x = Math.sin(s.ph + i * Math.PI) * 1.4; });
    s.legs.forEach((l, i) => { l.rotation.x = Math.sin(s.ph * 2 + i * Math.PI) * 0.35; });
    s.g.position.y = POOL.water - 0.05 + Math.sin(s.ph * 0.5) * 0.03;
    s.foam.material.opacity = 0.35 + Math.abs(Math.sin(s.ph)) * 0.3;
  });
}

/* ---------- 房間設定用的規則 ---------- */
export function interiorHeight(x, z) { return inPool(x, z) ? POOL.swimY : 0; }
export function interiorZone(p) {
  if (p.z > R.lobbyZ) return '游泳館大廳';
  if (p.z > R.lockerZ) return p.x < 0 ? '男更衣室' : '女更衣室';
  return inPool(p.x, p.z) ? '游泳池（水裡）' : '泳池畔';
}
/** 能不能下水由 systems/swimming 決定（state.poolOk）；不能的時候擋在池邊 */
export function interiorClamp(p) {
  if (state.poolOk || !inPool(p.x, p.z, 0.35)) return;
  const pad = 0.36, d = [p.x - (POOL.x0 - pad), (POOL.x1 + pad) - p.x, p.z - (POOL.z0 - pad), (POOL.z1 + pad) - p.z], m = Math.min(...d);
  if (m === d[0]) p.x = POOL.x0 - pad; else if (m === d[1]) p.x = POOL.x1 + pad; else if (m === d[2]) p.z = POOL.z0 - pad; else p.z = POOL.z1 + pad;
}
export function interiorLight(s) {
  s.add(new THREE.HemisphereLight('#eef8ff', '#a9b4b8', 1.05));
  const d = new THREE.DirectionalLight('#ffffff', 0.7); d.position.set(14, 20, -10); s.add(d);
}
