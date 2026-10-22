// src/systems/baozhong/programs-tent-model.js（v1.70，Claude）：跨域學程帳篷的模型（純外觀，不管生命週期）。
// 一頂長條帳篷分 4 格，共用米白頂棚；頂上橫幅「跨域學程｜校內雙主修」，下一行「不是科系，入學後申請」；
// 每格有自己的顏色、櫃台招牌與一樣代表物（學習地圖、麵包板、平板、小機器人）。
// 美術依 docs/art-style.md：toon()／basic()、canvasTex() 畫字、實體加 #2a2c4a 描邊、招牌字面不加描邊。
import * as THREE from 'three';
import { TENT, BAY_X } from './programs-logic.js';

const C = Object.freeze({ post: '#f4f4ee', roof: '#f4f1e6', roofEdge: '#e2dccb', back: '#ece6d8', floor: '#d9d4c7', ink: '#3a2a4a', dark: '#2a2c35' });
const G = Object.freeze({ box: new THREE.BoxGeometry(1, 1, 1), post: new THREE.CylinderGeometry(1, 1, 1, 8), ball: new THREE.SphereGeometry(1, 10, 8) });
const font = (w, s, f = '"Noto Sans TC", sans-serif') => `${w} ${s}px ${f}`;

/**
 * 本地座標：正面朝 +z，長沿 x（TENT.L），深沿 z（TENT.D），地面 y = 0。
 * programs：[{ id, name, short, color, prop }]，依 BAY_X 的順序放進 4 格。
 */
export function buildProgramsTent({ toon, basic, canvasTex, programs, notice }) {
  const { L, D, H } = TENT;
  const group = new THREE.Group(); group.name = 'bz26-programs-tent'; group.userData.noOcc = true;
  const OUTM = new THREE.MeshBasicMaterial({ color: '#2a2c4a', side: THREE.BackSide });
  const owned = [OUTM];
  function part(geo, mat, x, y, z, sx, sy, sz, out = 0, parent = group, rot = null) {
    const m = new THREE.Mesh(geo, typeof mat === 'string' ? toon(mat) : mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (rot) m.rotation.set(...rot);
    m.castShadow = out > 0; m.receiveShadow = true;
    if (out) { const o = new THREE.Mesh(geo, OUTM); o.scale.set(1 + 2 * out / Math.max(sx, 0.01), 1 + 2 * out / Math.max(sy, 0.01), 1 + 2 * out / Math.max(sz, 0.01)); o.castShadow = false; m.add(o); }
    parent.add(m); return m;
  }
  const box = (x, y, z, sx, sy, sz, mat, out = 0.02, parent = group) => part(G.box, mat, x, y, z, sx, sy, sz, out, parent);
  function sign(w, h, tex, x, y, z) {
    const mat = basic({ map: tex }); owned.push(tex, mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); owned.push(m.geometry); group.add(m); return m;
  }
  const z0 = -D / 2, z1 = D / 2, bayW = L / BAY_X.length;
  // 地板、背牆、柱子與頂棚。
  box(0, 0.04, 0, L, 0.08, D, C.floor, 0.015);
  box(0, H / 2, z0 + 0.04, L, H, 0.06, C.back, 0.02);
  for (let i = 0; i <= BAY_X.length; i++) {
    const x = -L / 2 + i * bayW;
    for (const z of [z0 + 0.06, z1 - 0.06]) part(G.post, C.post, x, H / 2, z, 0.05, H, 0.05, 0.015);
  }
  part(G.box, C.roof, 0, H + 0.12, 0, L + 0.4, 0.1, D + 0.5, 0.03, group, [0.08, 0, 0]);
  box(0, H - 0.02, z1 + 0.18, L + 0.4, 0.14, 0.06, C.roofEdge, 0.015);
  // 頂上橫幅（面向大道）。
  const header = canvasTex(1024, 192, (g, w, h) => {
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7e57c2'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14);
    g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font(900, 70); g.fillText('跨域學程｜校內雙主修', w / 2, 76);
    g.font = font(900, 40); g.fillStyle = '#7a4a2a'; g.fillText('不是科系，入學後申請', w / 2, 146);
  });
  box(0, H + 0.62, z1 + 0.02, L * 0.78, 0.82, 0.08, '#fffaf0', 0.025);
  part(G.post, C.post, -L * 0.3, H + 0.3, z1 + 0.02, 0.035, 0.6, 0.035, 0.012);
  part(G.post, C.post, L * 0.3, H + 0.3, z1 + 0.02, 0.035, 0.6, 0.035, 0.012);
  sign(L * 0.76, 0.76, header, 0, H + 0.62, z1 + 0.065);
  // 每格：前緣色帶、櫃台、櫃台招牌、代表物。
  programs.forEach((p, i) => {
    const bx = BAY_X[i];
    box(bx, H - 0.14, z1 + 0.06, bayW - 0.06, 0.16, 0.05, p.color, 0.012);
    box(bx, 0.48, 0.85, bayW - 0.35, 0.86, 0.45, '#fffaf0', 0.02);
    box(bx, 0.48, 1.08, bayW - 0.33, 0.86, 0.02, p.color, 0);
    const tex = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = p.color; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const name = p.short || p.name, size = [...name].length > 4 ? 68 : 88;
      g.font = font(900, size); g.fillText(name, w / 2, 100);
      g.font = font(900, 40); g.fillText('校內雙主修', w / 2, 198);
    });
    sign(bayW - 0.5, 0.62, tex, bx, 0.52, 1.095);
    prop(p.prop, bx, 0.93, 0.8);
  });
  function prop(kind, x, y, z) {
    if (kind === 'map') {   // 攤開的學習地圖：米色紙上有路線與三個點
      const t = canvasTex(256, 192, (g, w, h) => { g.fillStyle = '#f7ecd0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7e57c2'; g.lineWidth = 8; g.beginPath(); g.moveTo(30, 150); g.quadraticCurveTo(120, 20, 226, 120); g.stroke(); g.fillStyle = '#ef6c00'; [[30, 150], [120, 70], [226, 120]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 14, 0, 7); g.fill(); }); });
      const mat = toon('#ffffff', { map: t }); owned.push(t);
      part(G.box, mat, x, y + 0.01, z, 0.6, 0.015, 0.42, 0.008, group, [0, 0.12, 0]);
    } else if (kind === 'breadboard') {   // 綠色麵包板加三顆小燈泡
      box(x, y + 0.02, z, 0.5, 0.04, 0.3, '#4f9a48', 0.01);
      ['#ffd84a', '#ef5350', '#90caf9'].forEach((c, k) => part(G.ball, toon(c, { emissive: c, emissiveIntensity: 0.4 }), x - 0.14 + k * 0.14, y + 0.1, z, 0.04, 0.05, 0.04, 0.006));
    } else if (kind === 'tablet') {   // 平板與觸控筆
      box(x, y + 0.12, z - 0.02, 0.42, 0.3, 0.025, C.dark, 0.01).rotation.x = -0.35;
      box(x, y + 0.13, z + 0.0, 0.36, 0.24, 0.005, '#9fd3e6', 0).rotation.x = -0.35;
      part(G.post, '#ef6c00', x + 0.28, y + 0.02, z + 0.05, 0.01, 0.22, 0.01, 0.004, group, [0, 0, Math.PI / 2]);
    } else if (kind === 'robot') {   // 方頭小機器人
      box(x, y + 0.13, z, 0.22, 0.24, 0.18, '#b0bec5', 0.012);
      box(x, y + 0.34, z, 0.26, 0.18, 0.2, '#cfd8dc', 0.012);
      [-0.06, 0.06].forEach(dx => part(G.ball, toon('#00897b', { emissive: '#00897b', emissiveIntensity: 0.5 }), x + dx, y + 0.35, z + 0.105, 0.03, 0.03, 0.01));
      part(G.post, C.dark, x, y + 0.47, z, 0.008, 0.1, 0.008, 0.004);
      part(G.ball, '#ef5350', x, y + 0.53, z, 0.025, 0.025, 0.025, 0.004);
    }
  }
  return { group, dispose() { group.removeFromParent(); for (const o of owned) o.dispose?.(); } };
}
