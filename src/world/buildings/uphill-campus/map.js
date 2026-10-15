/**
 * 山上校區地圖內容。
 *
 * 目前只有骨架：草地、四周圍籬、遠山、南邊的車道與山上公車站、中間一塊「規劃中」看板。
 * 規劃的同學從 buildMap() 的「在這裡加山上校區的建築」開始加東西就好。
 *
 * 跟室內一樣：build 期間用 block()、mk()、flat()、boxC() 加的東西，
 * 會自動搬進山上校區自己的場景與碰撞清單（core/rooms.js），不會出現在山下。
 * 第一次搭公車上山才會建立，遊戲一開始不會載入這裡的任何東西。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { BOX, GRAD, basic, block, canvasTex, flat, mk, outline, plane, toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { R, SIZE, STOP, PLATFORMS } from './layout.js';

const SKY = '#bfe4f6';

/* ---------- 地面：校區草地、外圍山坡、南邊車道 ---------- */
function ground() {
  // 外圍（看得到但走不到）：比校區暗一點的山坡綠
  flat(SIZE.w + 600, SIZE.d + 600, '#6fae5c', 0, -0.05, 0);
  // 校區草地：淡淡的格紋，方便規劃時目測距離（一格 10 公尺）
  const grass = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#8fca6c'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2);
  }, [SIZE.w / 20, SIZE.d / 20]);
  flat(SIZE.w, SIZE.d, toon('#ffffff', { map: grass }), 0, 0, 0);
  // 車道：東西向，在公車站南側
  const road = canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#6e7177'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2f2ee'; for (let x = 8; x < w; x += 64) g.fillRect(x, h / 2 - 2, 36, 4);
  }, [SIZE.w / 16, 1]);
  flat(SIZE.w, 7, toon('#ffffff', { map: road }), 0, 0.02, STOP.z + 4.5);
  // 人行道：站牌前
  flat(SIZE.w, 2.4, '#d9d3c4', 0, 0.03, STOP.z - 0.2);
}

/* ---------- 四周圍籬：木樁加兩條橫木（木樁用 InstancedMesh，手機也順） ---------- */
function fence() {
  const wood = toon('#a57a4f'), H = 1.1, gap = 2.5;
  const posts = [];
  for (let x = R.x0; x <= R.x1 + 0.01; x += gap) posts.push([x, R.z0], [x, R.z1]);
  for (let z = R.z0 + gap; z < R.z1 - 0.01; z += gap) posts.push([R.x0, z], [R.x1, z]);
  const inst = new THREE.InstancedMesh(BOX, wood, posts.length), o = new THREE.Object3D();
  posts.forEach(([x, z], i) => { o.position.set(x, H / 2, z); o.scale.set(0.18, H, 0.18); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); });
  inst.userData.noOcc = true; scene.add(inst);
  [0.45, 0.9].forEach(y => {
    block(0, y, R.z0, SIZE.w, 0.09, 0.08, wood); block(0, y, R.z1, SIZE.w, 0.09, 0.08, wood);
    block(R.x0, y, 0, 0.08, 0.09, SIZE.d, wood); block(R.x1, y, 0, 0.08, 0.09, SIZE.d, wood);
  });
}

/* ---------- 遠山：圍一圈綠色山丘，北邊高（往更高的山上），南邊低（看得到山下） ---------- */
function hills() {
  const geo = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const cols = ['#4f9152', '#6aa85e', '#3f7d45', '#7fb36c'];
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, north = -Math.cos(a);           // a = 0 在南邊，往北越來越高
    const dist = Math.max(SIZE.w, SIZE.d) / 2 + 110 + (i % 3) * 20;
    const h = 18 + Math.max(0, north) * 34 + (i % 2) * 8;
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: cols[i % cols.length], gradientMap: GRAD }));
    m.position.set(Math.sin(a) * dist, -1, Math.cos(a) * dist);
    m.scale.set(48 + (i % 4) * 10, h, 40 + (i % 3) * 8);
    m.userData.noOcc = true; scene.add(m);
  }
}

/* ---------- 山上公車站：候車亭、長椅、站牌 ---------- */
function busStop() {
  const { x, z } = STOP, steel = '#7d8a96', roof = '#2f6f4f';
  // 候車亭：在站牌東邊，背對校區、面向車道
  const sx = x + 9;
  [-1.8, 1.8].forEach(dx => block(sx + dx, 1.25, z - 0.9, 0.12, 2.5, 0.12, steel));
  block(sx, 2.55, z - 0.3, 4.4, 0.14, 2.0, roof, 0.03);
  block(sx, 1.4, z - 1.0, 3.8, 1.6, 0.05, toon('#cfe6ef', { transparent: true, opacity: 0.55 }));
  block(sx, 0.45, z - 0.7, 3.2, 0.08, 0.5, '#8a6a42', 0.02);
  [-1.3, 1.3].forEach(dx => block(sx + dx, 0.22, z - 0.7, 0.08, 0.44, 0.42, '#6b7178'));
  boxC(sx - 2, sx + 2, z - 1.1, z - 0.4);
  // 站牌：和山下行政大樓乘車處同樣的綠底白字
  mk(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), toon('#9aa3ab'), x, 1.3, z, { out: 0.02 });
  const t = canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#2f6f4f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '900 40px "Noto Sans TC",sans-serif'; g.fillText('校園公車', w / 2, 56);
    g.font = '700 28px "Noto Sans TC",sans-serif'; g.fillText('山上校區站', w / 2, 96);
    g.fillStyle = '#f4f4ee'; g.fillRect(20, 116, w - 40, 184);
    g.fillStyle = '#2c3138'; g.font = '500 22px "Noto Sans TC",sans-serif'; g.textAlign = 'left';
    ['一路　往山下校區', '　行政大樓前下車', '　每 15 分一班', '　末班 22:00'].forEach((l, i) => g.fillText(l, 30, 152 + i * 38));
  });
  const board = block(x, 2.2, z, 0.9, 1.1, 0.06, '#2f6f4f', 0.02);
  [1, -1].forEach(s => { const p = plane(0.84, 1.04, basic({ map: t }), x, 2.2, z + s * 0.035, 0, s > 0 ? 0 : Math.PI); p.renderOrder = 1; });
  board.name = 'uphill-bus-sign';
  // 車道上的公車停靠區（黃線框）
  const c = '#f2c94c', bz = STOP.z + 3.2, bx0 = x - 6, bx1 = x + 6;
  flat(bx1 - bx0, 0.15, c, x, 0.04, bz - 0.8); flat(bx1 - bx0, 0.15, c, x, 0.04, bz + 0.8);
  flat(0.15, 1.6, c, bx0, 0.04, bz); flat(0.15, 1.6, c, bx1, 0.04, bz);
}

/* ---------- 規劃中看板：校區中間，提醒這裡還沒蓋 ---------- */
function planningSign() {
  const t = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#fff7e0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e8a33d'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
    g.fillStyle = '#4a3520'; g.textAlign = 'center';
    g.font = '900 64px "Noto Sans TC",sans-serif'; g.fillText('山上校區', w / 2, 100);
    g.font = '700 36px "Noto Sans TC",sans-serif'; g.fillText('規劃建設中，敬請期待', w / 2, 170);
  });
  const x = 0, z = 0;
  [-1.6, 1.6].forEach(dx => block(x + dx, 1.1, z, 0.16, 2.2, 0.16, '#8a6a42', 0.02));
  block(x, 2.3, z, 3.8, 1.9, 0.12, '#e8a33d', 0.03);
  plane(3.6, 1.8, basic({ map: t }), x, 2.3, z + 0.07);
  boxC(x - 1.9, x + 1.9, z - 0.2, z + 0.2);
  // 三角錐
  [[-3, 1.5], [3, 1.5], [0, 2.6]].forEach(([dx, dz]) => {
    const cone = mk(new THREE.ConeGeometry(0.3, 0.75, 10), toon('#ff7a3a'), x + dx, 0.38, z + dz, {});
    outline(cone, 0.03);
    block(x + dx, 0.32, z + dz, 0.4, 0.08, 0.4, '#ffffff');
  });
}

/* ---------- 高低差平台（layout.js 的 PLATFORMS）：照設定自動蓋出來 ---------- */
function platforms() {
  PLATFORMS.forEach(p => {
    const w = p.x1 - p.x0, d = p.z1 - p.z0;
    block((p.x0 + p.x1) / 2, p.h / 2, (p.z0 + p.z1) / 2, w, p.h, d, p.color || '#c9b98f', 0.04);
  });
}

/** 建立山上校區（第一次搭公車上山時呼叫一次） */
export function buildMap() {
  ground();
  fence();
  hills();
  busStop();
  planningSign();
  platforms();
  /* ---------- 在這裡加山上校區的建築 ---------- */
}

/** 燈光與天空：跟山下差不多的明亮白天，加一點霧讓遠山變淡 */
export function mapLight(s) {
  s.background = new THREE.Color(SKY);
  s.fog = new THREE.Fog(SKY, 90, 320);
  s.add(new THREE.HemisphereLight('#eaf6ff', '#7aa060', 0.95));
  const sun = new THREE.DirectionalLight('#fff4e2', 0.85);
  sun.position.set(40, 80, 30); s.add(sun);
}

/** 地面高度：在平台上就是平台高度，其他地方是 0 */
export function mapHeight(x, z) {
  let h = 0;
  for (const p of PLATFORMS) if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1 && p.h > h) h = p.h;
  return h;
}

/** 區域名稱：公車站附近是「山上公車站」，其他地方是「山上校區」。之後可以照建築細分 */
export function mapZone(p) {
  if (p.z > STOP.z - 6) return '山上公車站';
  return '山上校區';
}
