/**
 * 從觀景步道往北看的台北市景（純模型，不碰引擎，可在 Node 測試）。
 *
 * 依照片 9088、9089、9100 與實際方位：山上校區往北偏西約 15 度、約 5 公里是台北 101，
 * 前景是木柵、景美一帶的中低樓層住宅，中景是大安、信義區，101 周圍有一群高樓，
 * 右後方是四獸山、南港山（拇指山的尖峰），左後方遠處是陽明山與七星山。
 * 遠景不吃霧（霧在 320 公尺就全白），顏色事先調淡，表現空氣遠近。
 * 為了在手機畫面上也看得出 101，距離縮成約 720 公尺、高度放大到 250 公尺；市區在圖外山谷底（高度 -40）。
 */
import * as THREE from 'three';
import { ANCHORS, R } from './layout.js';

const DEG = Math.PI / 180;
export const VIEW = { from: ANCHORS['觀景步道'], ground: -40, tower: { bearing: -14 * DEG, d: 720, h: 250 } };
/** 從觀景步道出發，往方位角 bearing（北為 0、往東為正）走 d 公尺的位置。 */
export function towards(bearing, d) {
  return [VIEW.from.x + Math.sin(bearing) * d, VIEW.from.z - Math.cos(bearing) * d];
}
export const TOWER_AT = towards(VIEW.tower.bearing, VIEW.tower.d);

/** 圖外北側往山谷下降的深度：圍籬外 6 公尺開始，每往北一公尺降 0.35 公尺，最多降到市區底下。 */
export function valleyDrop(x, z) {
  return Math.min(-VIEW.ground + 22, Math.max(0, R.z0 - 6 - z) * 0.35);
}

let seed = 20261028;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = list => list[Math.floor(rnd() * list.length)];

/** 市區大樓：前景住宅、中景市區、101 旁的信義高樓群三批，每棟 [x, z, 寬, 深, 高, 轉角, 顏色]。 */
export function cityBlocks() {
  seed = 20261028;
  const list = [], warm = ['#d9d3c8', '#cfc8bb', '#e2ddd3', '#c6c3bd', '#d5d0c9', '#bfc4c6'];
  const cool = ['#c9d5db', '#b8c8d0', '#d8e0e3', '#aebfc8', '#c4cdd0'], glass = ['#8fb3c4', '#9fc0cc', '#7fa6b8', '#b2cbd4'];
  const band = (n, d0, d1, b0, b1, h0, h1, colors, w0, w1) => {
    for (let i = 0; i < n; i++) {
      const bearing = (b0 + rnd() * (b1 - b0)) * DEG, d = d0 + rnd() * (d1 - d0), [x, z] = towards(bearing, d);
      if (Math.hypot(x - TOWER_AT[0], z - TOWER_AT[1]) < 34) continue;
      const w = w0 + rnd() * (w1 - w0);
      list.push([x, z, w, w * (0.6 + rnd() * 0.5), h0 + rnd() ** 1.6 * (h1 - h0), bearing + (rnd() - 0.5) * 0.3, pick(colors)]);
    }
  };
  band(170, 420, 550, -70, 35, 16, 52, warm, 9, 18);
  band(130, 550, 700, -62, 40, 28, 84, cool, 11, 22);
  band(20, 650, 800, -26, -2, 70, 150, glass, 13, 20);
  return list;
}

/** 遠山稜線：[方位角（度）, 山頂高度] 沿弧線排列，底部沉到地面以下。 */
export const RIDGES = [
  // 陽明山群峰：七星山是最高的圓錐，左邊大屯山。
  { name: '陽明山', d: 940, color: ['#b9cfd8', '#a2bccb'], pts: [[-88, 64], [-76, 96], [-62, 138], [-52, 150], [-44, 128], [-34, 160], [-28, 172], [-22, 150], [-10, 118], [4, 104], [18, 92], [32, 70]] },
  // 四獸山與南港山：拇指山的尖峰在 101 右邊。
  { name: '四獸山', d: 840, color: ['#a8c3b8', '#87ab9b'], pts: [[-2, 30], [6, 58], [12, 78], [17, 74], [21, 96], [23, 104], [26, 88], [34, 92], [44, 80], [56, 66], [70, 40]] },
];
/** 一條稜線做成朝向觀景步道的弧形山牆，頂點色上深下淡。 */
export function ridgeGeometry(ridge) {
  const pos = [], col = [], top = new THREE.Color(ridge.color[1]), foot = new THREE.Color(ridge.color[0]);
  const at = (b, d) => towards(b * DEG, d);
  for (let i = 1; i < ridge.pts.length; i++) {
    const [b0, h0] = ridge.pts[i - 1], [b1, h1] = ridge.pts[i];
    const [ax, az] = at(b0, ridge.d), [bx, bz] = at(b1, ridge.d), y = VIEW.ground - 20;
    // 面朝觀景步道：從觀景步道看過去頂點順序為逆時針。
    pos.push(ax, y, az, bx, y, bz, bx, VIEW.ground + h1, bz, ax, y, az, bx, VIEW.ground + h1, bz, ax, VIEW.ground + h0, az);
    for (const c of [foot, foot, top, foot, top, top]) col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * 台北 101：裙樓、往上收的基座、八節往外張的竹節塔身（每節頂一圈淺色節環）、
 * 基座頂四面的金色如意圓盤，上面再收兩段塔頂與細長尖塔。尺寸依實際 508 公尺等比縮到 250 公尺。
 */
export const TOWER_PARTS = (() => {
  const k = VIEW.tower.h / 508, parts = [];
  const frustum = (y0, h, r0, r1, c0, c1, name) => parts.push({ kind: 'frustum', y0, h, r0, r1, c0, c1, name });
  parts.push({ kind: 'box', name: '裙樓', y0: 0, h: 60 * k, w: 150 * k, d: 90 * k, off: 55 * k, c0: '#b9cdd1', c1: '#d3e1e3' });
  frustum(0, 119 * k, 40 * k, 30 * k, '#3f8a8d', '#5fa7a6', '基座');
  for (let i = 0; i < 8; i++) {
    const y0 = 119 * k + i * 33 * k;
    frustum(y0, 31 * k, 27 * k, 34 * k, '#468f91', '#74bbb6', `第${i + 1}節`);
    frustum(y0 + 31 * k, 2 * k, 35.5 * k, 35.5 * k, '#d8ece6', '#d8ece6', `第${i + 1}節環`);
  }
  const roof = 119 * k + 8 * 33 * k;
  frustum(roof, 30 * k, 24 * k, 20 * k, '#468f91', '#6aaead', '塔頂');
  frustum(roof + 30 * k, 22 * k, 14 * k, 11 * k, '#5a9fa0', '#cfe6e2', '塔頂機房');
  frustum(roof + 52 * k, 70 * k, 2.6 * k, 0.8 * k, '#dfe9ea', '#ffffff', '尖塔');
  return parts;
})();

/** 101 合併成一個頂點色網格；四角柱體轉 45 度讓牆面對齊，平面著色看得出稜角。 */
export function towerGeometry() {
  const geos = [];
  const paint = (g, c0, c1, y0, h) => {
    const p = g.attributes.position, col = [], a = new THREE.Color(c0), b = new THREE.Color(c1), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { c.copy(a).lerp(b, h ? (p.getY(i) - y0) / h : 1); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
  };
  for (const part of TOWER_PARTS) {
    let g;
    if (part.kind === 'box') g = new THREE.BoxGeometry(part.w, part.h, part.d).translate(0, part.y0 + part.h / 2, part.off);
    else g = new THREE.CylinderGeometry(part.r1 * Math.SQRT2, part.r0 * Math.SQRT2, part.h, 4, 1).rotateY(Math.PI / 4).translate(0, part.y0 + part.h / 2, 0);
    g = g.toNonIndexed(); g.computeVertexNormals();
    geos.push(paint(g, part.c0, part.c1, part.y0, part.h));
  }
  // 如意圓盤：基座頂上四面各一個。
  const k = VIEW.tower.h / 508, y = 106 * k, r = 9 * k, half = 31 * k;
  for (let i = 0; i < 4; i++) {
    const g = new THREE.CylinderGeometry(r, r, 1.2, 16).rotateX(Math.PI / 2).translate(0, y, half + 0.6).rotateY(i * Math.PI / 2).toNonIndexed();
    g.computeVertexNormals(); geos.push(paint(g, '#e9c55c', '#e9c55c', 0, 0));
  }
  const merged = new THREE.BufferGeometry(), n = geos.reduce((s, g) => s + g.attributes.position.count, 0);
  for (const name of ['position', 'normal', 'color']) {
    const arr = new Float32Array(n * 3); let o = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    merged.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  return merged;
}

/** 山谷樹林的樹冠：[x, y, z, 半徑, 顏色]，沿圖外北側往下坡排成幾排。 */
export function forest() {
  seed = 7;
  const list = [], greens = ['#3f7d45', '#4f9152', '#5d9a55', '#46864a'];
  for (let row = 0; row < 7; row++) for (let x = R.x0 - 140; x < R.x1 + 60; x += 9 + rnd() * 6) {
    const z = R.z0 - 12 - row * 22 - rnd() * 14, r = 5 + rnd() * 4 + row * 0.8;
    list.push([x + rnd() * 6, -valleyDrop(x, z) + r * 0.35, z, r, pick(greens)]);
  }
  return list;
}

/** 整組遠景：市區大樓（實例化一次繪製）、101、兩道遠山不吃霧；山谷樹林照常吃霧；都沒有碰撞。 */
export function createTaipeiView() {
  const root = new THREE.Group(); root.name = '台北市區遠景';
  const blocks = cityBlocks(), box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const city = new THREE.InstancedMesh(box, new THREE.MeshToonMaterial({ color: '#ffffff', fog: false }), blocks.length);
  const o = new THREE.Object3D(), c = new THREE.Color();
  blocks.forEach(([x, z, w, d, h, yaw, color], i) => {
    o.position.set(x, VIEW.ground, z); o.rotation.set(0, yaw, 0); o.scale.set(w, h, d); o.updateMatrix();
    city.setMatrixAt(i, o.matrix); city.setColorAt(i, c.set(color));
  });
  city.name = '台北市區大樓'; city.userData.cityWindows = true; root.add(city);
  const tower = new THREE.Mesh(towerGeometry(), new THREE.MeshToonMaterial({ vertexColors: true, fog: false }));
  tower.name = '台北101'; tower.position.set(TOWER_AT[0], VIEW.ground, TOWER_AT[1]);
  // 裙樓與如意圓盤朝向觀景步道。
  tower.rotation.y = Math.atan2(VIEW.from.x - TOWER_AT[0], VIEW.from.z - TOWER_AT[1]); root.add(tower);
  // 山谷坡上的樹林：圍籬外一路往下長，遠處隨霧淡掉，接上市區（照片 9088、9089 欄杆外的樹梢）。
  const crowns = forest(), ball = new THREE.IcosahedronGeometry(1, 0);
  const woods = new THREE.InstancedMesh(ball, new THREE.MeshToonMaterial({ color: '#ffffff' }), crowns.length);
  crowns.forEach(([x, y, z, r, color], i) => {
    o.position.set(x, y, z); o.rotation.set(0, x, 0); o.scale.set(r, r * 0.8, r); o.updateMatrix();
    woods.setMatrixAt(i, o.matrix); woods.setColorAt(i, c.set(color));
  });
  woods.name = '山谷樹林'; root.add(woods);
  for (const ridge of RIDGES) {
    const m = new THREE.Mesh(ridgeGeometry(ridge), new THREE.MeshToonMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
    m.name = `遠山：${ridge.name}`; root.add(m);
  }
  root.traverse(m => { m.userData.noOcc = true; });
  return root;
}
