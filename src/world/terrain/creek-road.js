/**
 * 醉夢溪北岸的沿溪道路。
 * 依 Google Earth 照片：從體育館南邊沿著溪往東，經過八角亭、四維網球場、游泳池南側，
 * 接上行政大樓旁車道、四維堂東側車道、環山一道，最後到社資中心附近。
 * 路線座標在 world/layout.js 的 CREEK_ROAD，地圖和區域判斷也共用。
 * 田徑場那一段另外有：北緣紅線、草坡頂的矮白牆、「連續彎路」標誌、凸面鏡、南側的風雨走廊（國旗廊架）。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { basic, block, canvasTex, mk, plane, toon } from '../../render/kit.js';
import { boxC, circC } from '../../core/collision.js';
import { CREEK_ROAD, creekRoadZ } from '../layout.js';

const W = 4.2;   // 游泳館南側跟溪之間很窄（照片上也是），所以路不寬
for (let i = 0; i < CREEK_ROAD.length - 1; i++) {
  const [x0, z0] = CREEK_ROAD[i], [x1, z1] = CREEK_ROAD[i + 1];
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
  const g = new THREE.Group(); g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); g.rotation.y = Math.atan2(dx, dz); scene.add(g);
  // 多鋪 W 的長度，讓轉角接得起來
  const road = new THREE.Mesh(new THREE.PlaneGeometry(W, len + W * 0.9), toon('#5b6270'));
  road.rotation.x = -Math.PI / 2; road.position.y = 0.0205; road.receiveShadow = true; g.add(road);
  [-W / 2 + 0.2, W / 2 - 0.2].forEach(u => {
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.12, len), toon('#f4f4ee')); e.rotation.x = -Math.PI / 2; e.position.set(u, 0.023, 0); g.add(e);
  });
  for (let v = -len / 2 + 2; v < len / 2 - 1; v += 4) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2), toon('#f4f4ee')); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.023, v); g.add(d);
  }
}

/* ---------- 田徑場、體育館這一段的路邊（依照片） ---------- */

const EDGE_N = z => z + W / 2;           // 道路北緣
// 北緣畫紅線（禁止停車）
for (let i = 0; i < CREEK_ROAD.length - 1; i++) {
  const [x0, z0] = CREEK_ROAD[i], [x1, z1] = CREEK_ROAD[i + 1];
  if (x1 < 40) continue;
  const a = Math.max(x0, 40), dx = x1 - a, dz = (z1 - z0) * (x1 - a) / (x1 - x0), len = Math.hypot(dx, dz);
  const g = new THREE.Group(); g.position.set((a + x1) / 2, 0, EDGE_N(creekRoadZ((a + x1) / 2)) - 0.25); g.rotation.y = Math.atan2(dx, dz); scene.add(g);
  const r = new THREE.Mesh(new THREE.PlaneGeometry(0.25, len), toon('#d9473f')); r.rotation.x = -Math.PI / 2; r.position.y = 0.025; g.add(r);
}
// 北側的矮白牆（照片：草坡頂端那道白色矮牆），中間留幾個缺口可以走進操場
{ const z = EDGE_N(creekRoadZ(100)) + 0.8;
  // 體育館側翼貼著路邊（x 96～118）那一段不做牆
  [[62, 92], [121, 140], [147, 170]].forEach(([x0, x1]) => {
    block((x0 + x1) / 2, 0.35, z, x1 - x0, 0.7, 0.45, '#eeeeea', 0.03);
    block((x0 + x1) / 2, 0.74, z, x1 - x0 + 0.1, 0.08, 0.55, '#dcdcd6', 0);
    boxC(x0, x1, z - 0.25, z + 0.25);
  }); }
// 「連續彎路」警告標誌與凸面鏡
{ const x = 58, z = EDGE_N(creekRoadZ(58)) + 0.5;
  mk(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), toon('#e9e9e4'), x, 1.5, z, { out: 0.015 }); circC(x, z, 0.15);
  const tri = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#c9333a'; g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w - 6, h - 12); g.lineTo(6, h - 12); g.closePath(); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w / 2, 26); g.lineTo(w - 24, h - 22); g.lineTo(24, h - 22); g.closePath(); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 9; g.beginPath(); g.moveTo(58, 48); g.lineTo(72, 64); g.lineTo(56, 78); g.lineTo(70, 96); g.stroke(); });
  const word = canvasTex(64, 192, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#111'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = '#111'; g.font = '900 40px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; [...'連續彎路'].forEach((c, i) => g.fillText(c, w / 2, 44 + i * 44)); });
  const t = plane(1.1, 1.1, basic({ map: tri, transparent: true, side: THREE.DoubleSide }), x, 2.75, z - 0.08);
  const v = plane(0.36, 1.08, basic({ map: word, side: THREE.DoubleSide }), x, 1.9, z - 0.08);
  [t, v].forEach(p => { p.rotation.y = Math.PI; });
  const mx = 42, mz = EDGE_N(creekRoadZ(42)) + 0.6;
  mk(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), toon('#e9e9e4'), mx, 1.5, mz, { out: 0.015 }); circC(mx, mz, 0.15);
  const mirror = mk(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 20), toon('#e8743b'), mx, 2.9, mz - 0.1, { out: 0.02 }); mirror.rotation.x = Math.PI / 2;
  const glass = mk(new THREE.CircleGeometry(0.38, 20), basic({ color: '#bcd3e0' }), mx, 2.9, mz - 0.17); glass.rotation.y = Math.PI; }

/* ---------- 風雨走廊（地圖 F7）：沿溪道路南側的一長排水泥廊架，柱子上插著國旗 ---------- */
{ const z = creekRoadZ(100) - W / 2 - 2.6, x0 = 66, x1 = 140;
  const CON = toon('#d8d2c2');
  block((x0 + x1) / 2, 3.2, z, x1 - x0 + 1, 0.45, 3.2, CON, 0.04);
  for (let x = x0; x <= x1 + 0.01; x += 4.6) {
    [-1.3, 1.3].forEach(dz => { block(x, 1.5, z + dz, 0.45, 3, 0.45, CON, 0.03); circC(x, z + dz, 0.3); });
    // 面向道路的柱子插一面國旗
    if (Math.round((x - x0) / 4.6) % 2 === 0) {
      block(x + 0.35, 2.3, z + 1.55, 0.04, 1.2, 0.04, '#dddddd', 0);
      const flag = canvasTex(96, 64, (g, w, h) => { g.fillStyle = '#d42a2a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f3c8f'; g.fillRect(0, 0, w / 2, h / 2);
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w / 4, h / 4, 8, 0, 7); g.fill(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.moveTo(w / 4 + Math.cos(a) * 9, h / 4 + Math.sin(a) * 9); g.lineTo(w / 4 + Math.cos(a + 0.26) * 14, h / 4 + Math.sin(a + 0.26) * 14); g.lineTo(w / 4 + Math.cos(a - 0.26) * 14, h / 4 + Math.sin(a - 0.26) * 14); g.fill(); } });
      const p = plane(0.9, 0.6, basic({ map: flag, side: THREE.DoubleSide }), x + 0.8, 2.55, z + 1.6); p.rotation.y = 0.5;
    }
  }
  // 廊架內的展示看板
  for (let x = x0 + 2.3; x < x1; x += 9.2) block(x, 1.3, z - 1.25, 3.2, 1.6, 0.1, ['#e8d9a8', '#cfe0ea', '#f0d0c0'][Math.round(x) % 3], 0.02);
}
