/**
 * 山上校區地圖內容。
 *
 * 灰盒地形、道路、建築與擋土牆由純模型產生，這裡負責場景與碰撞接線。
 *
 * 跟室內一樣：build 期間用 block()、mk()、flat()、boxC() 加的東西，
 * 會自動搬進山上校區自己的場景與碰撞清單（core/rooms.js），不會出現在山下。
 * 第一次搭公車上山才會建立，遊戲一開始不會載入這裡的任何東西。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { BOX, GRAD, basic, block, canvasTex, flat, mk, plane, toon } from '../../../render/kit.js';
import { boxC, obbC } from '../../../core/collision.js';
import { BUS_SHELTER, R, SIZE, STOP } from './layout.js';
import { heightAt } from './terrain.js';
import { createGreybox, greyboxColliders, fenceRails } from './greybox.js';
import { zoneName } from './zone-names.js';
import { createLandmarks, landmarkColliders, landmarkSigns } from './landmarks.js';

const SKY = '#bfe4f6';

/* ---------- 外圍山坡，校區地面由灰盒建立 ---------- */
function ground() {
  // 外圍（看得到但走不到）：比校區暗一點的山坡綠
  flat(SIZE.w + 600, SIZE.d + 600, '#6fae5c', 0, -0.05, 0);
}

/* ---------- 四周圍籬：木樁加兩條橫木（木樁用 InstancedMesh，手機也順） ---------- */
function fence() {
  const wood = toon('#a57a4f'), H = 1.1, gap = 2.5;
  const posts = [];
  for (let x = R.x0; x <= R.x1 + 0.01; x += gap) posts.push([x, R.z0], [x, R.z1]);
  for (let z = R.z0 + gap; z < R.z1 - 0.01; z += gap) posts.push([R.x0, z], [R.x1, z]);
  const inst = new THREE.InstancedMesh(BOX, wood, posts.length), o = new THREE.Object3D();
  posts.forEach(([x, z], i) => { o.position.set(x, heightAt(x, z) + H / 2, z); o.scale.set(0.18, H, 0.18); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); });
  inst.name = '圍籬木樁'; inst.userData.noOcc = true; scene.add(inst);
  const rails = fenceRails();
  const bars = new THREE.InstancedMesh(BOX, wood, rails.length);
  rails.forEach(({ a, b, y }, i) => {
    o.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
    o.scale.set(Math.abs(b[0] - a[0]) || 0.08, 0.09, Math.abs(b[1] - a[1]) || 0.08);
    o.updateMatrix(); bars.setMatrixAt(i, o.matrix);
  });
  bars.name = '圍籬橫木'; bars.userData.noOcc = true; scene.add(bars);
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
  const start = scene.children.length, base = heightAt(STOP.x, STOP.z);
  const { x, z } = STOP, steel = '#7d8a96', roof = '#2f6f4f';
  // 候車亭：在站牌東邊建築退縮處，背對校區、面向車道（位置見 layout.js 的 BUS_SHELTER）
  const sx = BUS_SHELTER.x, sz = BUS_SHELTER.z;
  [-1.8, 1.8].forEach(dx => block(sx + dx, 1.25, sz - 0.9, 0.12, 2.5, 0.12, steel));
  block(sx, 2.55, sz - 0.3, 4.4, 0.14, 2.0, roof, 0.03);
  block(sx, 1.4, sz - 1.0, 3.8, 1.6, 0.05, toon('#cfe6ef', { transparent: true, opacity: 0.55 }));
  block(sx, 0.45, sz - 0.7, 3.2, 0.08, 0.5, '#8a6a42', 0.02);
  [-1.3, 1.3].forEach(dx => block(sx + dx, 0.22, sz - 0.7, 0.08, 0.44, 0.42, '#6b7178'));
  boxC(sx - 2, sx + 2, sz - 1.1, sz - 0.4, base + 2.5);
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
  scene.children.slice(start).forEach(object => { object.position.y += base; });
}

/** 場景與碰撞的登記入口，純模型留在 greybox.js 供離線驗收。 */
export function buildGreybox() {
  scene.add(createGreybox());
  for (const c of greyboxColliders()) obbC(c.cx, c.cz, c.hx, c.hz, c.th);
}

/** 純模型與碰撞接入場景，只有此處需要瀏覽器的文字畫布。 */
export function buildLandmarks() {
  const group = createLandmarks(); scene.add(group);
  for (const c of landmarkColliders()) obbC(c.cx, c.cz, c.hx, c.hz, c.th);
  for (const sign of landmarkSigns()) {
    const board = group.getObjectByName(`指路牌：${sign.anchor}`);
    for (const { side, text } of sign.faces) {
      const texture = canvasTex(512, 128, (g, w, h) => {
        g.fillStyle = '#24563e'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff8df'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '700 36px "Noto Sans TC",sans-serif'; g.fillText(text, w / 2, h / 2, w - 32);
      });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(sign.width - 0.08, sign.height - 0.08), basic({ map: texture }));
      face.name = `指路文字：${sign.anchor}`;
      face.position.set(0, 2.05, side * 0.076); face.rotation.y = side > 0 ? 0 : Math.PI;
      board.add(face);
    }
  }
}

/** 建立山上校區（第一次搭公車上山時呼叫一次） */
export function buildMap() {
  ground();
  fence();
  hills();
  busStop();
  buildGreybox();
  buildLandmarks();
}

/** 燈光與天空：跟山下差不多的明亮白天，加一點霧讓遠山變淡 */
export function mapLight(s) {
  s.background = new THREE.Color(SKY);
  s.fog = new THREE.Fog(SKY, 90, 320);
  s.add(new THREE.HemisphereLight('#eaf6ff', '#7aa060', 0.95));
  const sun = new THREE.DirectionalLight('#fff4e2', 0.85);
  sun.position.set(40, 80, 30); s.add(sun);
}

/** 角色腳底與灰盒使用同一份地形高度。 */
export function mapHeight(x, z) {
  return heightAt(x, z);
}

/** 地標、通路、建築與平台共用同一份區域名稱判斷。 */
export function mapZone(p) {
  return zoneName(p);
}
