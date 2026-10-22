// src/systems/baozhong/radio-booth-model.js（v1.69，Claude）：政大之聲電台棚的模型（純外觀，不管生命週期）。
// 照實景照片抓特徵：黃色棚身、四面透明玻璃、淡粉紅斜頂棚、正面黃底大招牌「FM88.7 政大之聲」與圓形台徽、
// 下方兩塊黃板「包種茶節」「OPEN STUDIO 實況轉播」、棚內長桌與麥克風、棚外三腳架喇叭。
// 美術依 docs/art-style.md：材質只用 toon()／basic()，貼圖用 canvasTex()，實體加 #2a2c4a 描邊，半透明玻璃與招牌字面不加描邊。
import * as THREE from 'three';
import { BOOTH } from './radio-logic.js';

const C = Object.freeze({
  yellow: '#ffd84a', yellowDeep: '#f2c230', frame: '#ecebe6', roof: '#f7c6d9', roofEdge: '#e9a9c2',
  base: '#3d4a6b', glass: '#cfe6ef', desk: '#c79a6c', dark: '#2a2c35', mic: '#55577a', ink: '#3a2a1a', green: '#3aa64a', logo: '#7a4a2a',
});
// 形狀共用（art-style 第十一節）。
const G = Object.freeze({
  box: new THREE.BoxGeometry(1, 1, 1),
  post: new THREE.CylinderGeometry(1, 1, 1, 8),
  ball: new THREE.SphereGeometry(1, 10, 8),
  cone: new THREE.ConeGeometry(1, 1, 12),
});

function signTextures(canvasTex) {
  const font = (w, s, f = '"Noto Sans TC", sans-serif') => `${w} ${s}px ${f}`;
  const top = canvasTex(1024, 176, (g, w, h) => {
    g.fillStyle = C.yellow; g.fillRect(0, 0, w, h);
    // 圓形台徽：咖啡色圓底、白色耳機與「88.7」。
    g.fillStyle = C.logo; g.beginPath(); g.arc(96, h / 2, 64, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff6dc'; g.lineWidth = 9; g.beginPath(); g.arc(96, h / 2 + 4, 34, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.fillStyle = '#fff6dc'; g.fillRect(58, h / 2 + 2, 14, 26); g.fillRect(120, h / 2 + 2, 14, 26);
    g.fillStyle = C.ink; g.textBaseline = 'middle';
    g.font = font(900, 46, 'Arial, sans-serif'); g.fillText('FM88.7', 186, h / 2);
    g.font = font(900, 112); g.textAlign = 'center';
    [...'政大之聲'].forEach((c, i) => g.fillText(c, 520 + i * 128, h / 2 + 6));
  });
  const left = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = C.yellow; g.fillRect(0, 0, w, h);
    g.fillStyle = C.ink; g.font = font(900, 92); g.textAlign = 'center'; g.textBaseline = 'middle';
    // 兩行由左到右：上「包種」、下「茶節」。
    [['包', 80, 74], ['種', 176, 74], ['茶', 80, 178], ['節', 176, 178]].forEach(([c, x, y]) => g.fillText(c, x, y));
  });
  const right = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = C.yellow; g.fillRect(0, 0, w, h);
    g.fillStyle = C.green; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font(900, 64, 'Arial, sans-serif'); g.fillText('OPEN STUDIO', w / 2, 74);
    // 照片中間的心電圖般波形線。
    g.strokeStyle = C.green; g.lineWidth = 5; g.beginPath(); g.moveTo(40, 138);
    [[150, 138], [172, 112], [196, 164], [220, 124], [240, 138], [470, 138]].forEach(([x, y]) => g.lineTo(x, y)); g.stroke();
    g.font = font(900, 56); g.fillText('實況轉播', w / 2, 202);
  });
  return { top, left, right };
}

/**
 * 建出棚子。本地座標：正面朝 +z，寬沿 x（BOOTH.W）、深沿 z（BOOTH.D），地面 y = 0。
 * 回傳 { group, speaker, dispose }；speaker 是棚外三腳架喇叭的 Group（本地座標已放好）。
 */
export function buildRadioBooth({ toon, basic, canvasTex }) {
  const { W, D, H, ROOF_RISE, SIGN_H, PANEL_H } = BOOTH;
  const group = new THREE.Group(); group.name = 'bz26-radio-booth'; group.userData.noOcc = true;
  const OUTM = new THREE.MeshBasicMaterial({ color: '#2a2c4a', side: THREE.BackSide });
  const owned = [OUTM];
  const glass = toon(C.glass, { transparent: true, opacity: 0.32, depthWrite: false });
  const tex = signTextures(canvasTex);
  const signMat = Object.fromEntries(Object.entries(tex).map(([k, t]) => [k, basic({ map: t })]));
  owned.push(...Object.values(tex), ...Object.values(signMat));

  function part(geo, mat, x, y, z, sx, sy, sz, out = 0, parent = group, rot = null) {
    const m = new THREE.Mesh(geo, typeof mat === 'string' ? toon(mat) : mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (rot) m.rotation.set(...rot);
    m.castShadow = out > 0; m.receiveShadow = true;
    if (out) {
      const o = new THREE.Mesh(geo, OUTM);
      o.scale.set(1 + 2 * out / Math.max(sx, 0.01), 1 + 2 * out / Math.max(sy, 0.01), 1 + 2 * out / Math.max(sz, 0.01));
      o.castShadow = false; m.add(o);
    }
    parent.add(m); return m;
  }
  const box = (x, y, z, sx, sy, sz, mat, out = 0.02, parent = group) => part(G.box, mat, x, y, z, sx, sy, sz, out, parent);
  const signPlane = (w, h, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); group.add(m); owned.push(m.geometry); return m; };

  const baseH = 0.3, x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;
  const panelTop = baseH + PANEL_H;
  // 底座與地板。
  box(0, baseH / 2, 0, W, baseH, D, C.base, 0.03);
  box(0, baseH + 0.01, 0, W - 0.12, 0.02, D - 0.12, '#d9d4c7', 0);
  // 柱子：四角加正面中間一根（照片正面分成兩塊黃板）。
  const postX = [x0 + 0.04, x1 - 0.04], postZ = [z0 + 0.04, z1 - 0.04];
  for (const px of postX) for (const pz of postZ) part(G.post, C.frame, px, baseH + H / 2, pz, 0.045, H, 0.045, 0.015);
  part(G.post, C.frame, -0.6, baseH + H / 2, z1 - 0.04, 0.04, H, 0.04, 0.015);
  // 下半部黃板：正面左右兩塊、兩側、背面。
  box(-1.2, baseH + PANEL_H / 2, z1, 1.18, PANEL_H, 0.06, C.yellow);
  box(0.6, baseH + PANEL_H / 2, z1, 2.38, PANEL_H, 0.06, C.yellow);
  for (const sx of [x0, x1]) box(sx, baseH + PANEL_H / 2, 0, 0.06, PANEL_H, D, C.yellow);
  box(0, baseH + PANEL_H / 2, z0, W, PANEL_H, 0.06, C.yellowDeep);
  // 黃板上的字面（平面，不加描邊）。
  signPlane(1.06, 0.98, signMat.left, -1.2, baseH + PANEL_H / 2, z1 + 0.035);
  signPlane(2.2, 1.0, signMat.right, 0.6, baseH + PANEL_H / 2, z1 + 0.035);
  // 上半部透明玻璃（半透明不加描邊）。
  const glassH = H - PANEL_H;
  part(G.box, glass, 0, panelTop + glassH / 2, z1, W - 0.1, glassH, 0.02);
  part(G.box, glass, 0, panelTop + glassH / 2, z0, W - 0.1, glassH, 0.02);
  for (const sx of [x0, x1]) part(G.box, glass, sx, panelTop + glassH / 2, 0, 0.02, glassH, D - 0.1);
  // 正面大招牌：黃色橫板加字面。
  const signY = baseH + H + SIGN_H / 2;
  box(0, signY, z1 + 0.02, W + 0.1, SIGN_H, 0.08, C.yellow, 0.025);
  signPlane(W, SIGN_H - 0.04, signMat.top, 0, signY, z1 + 0.065);
  box(0, baseH + H + 0.02, 0, W, 0.06, D, C.frame, 0.015);
  // 淡粉紅斜頂棚：前低後高，四邊出簷。
  const roof = part(G.box, C.roof, 0, baseH + H + SIGN_H + ROOF_RISE / 2, -0.05, W + 0.5, 0.08, D + 0.55, 0.03, group, [Math.atan2(ROOF_RISE, D), 0, 0]);
  roof.name = 'bz26-radio-roof';
  part(G.box, C.roofEdge, 0, baseH + H + SIGN_H + 0.02, z1 + 0.22, W + 0.5, 0.1, 0.06, 0.015);
  // 棚內長桌、播音控台、筆電與四支麥克風（主播站在桌後，桌子擋住下半身）。
  box(0, baseH + 0.33, 0.48, W - 0.5, 0.66, 0.5, C.desk);
  box(0, baseH + 0.69, 0.5, 0.7, 0.06, 0.3, C.dark, 0.012);
  for (const lx of [-1.25, -0.45, 0.45, 1.25]) {
    part(G.post, C.mic, lx, baseH + 0.84, 0.36, 0.012, 0.32, 0.012, 0);
    part(G.ball, C.dark, lx, baseH + 1.02, 0.32, 0.05, 0.07, 0.05, 0.01);
  }
  box(-0.9, baseH + 0.7, 0.55, 0.36, 0.02, 0.26, '#9fb3bd', 0.01);
  box(0.95, baseH + 0.7, 0.55, 0.36, 0.02, 0.26, '#9fb3bd', 0.01);
  // 棚外三腳架喇叭（本地座標對應 radio-logic footprint().speaker）。
  const speaker = new THREE.Group(); speaker.name = 'bz26-radio-speaker';
  speaker.position.set(-(W / 2 + 0.35), 0, D / 2 + 0.45); group.add(speaker);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    part(G.post, C.dark, Math.sin(a) * 0.22, 0.6, Math.cos(a) * 0.22, 0.018, 1.25, 0.018, 0.008, speaker, [Math.cos(a) * 0.32, 0, -Math.sin(a) * 0.32]);
  }
  part(G.post, C.dark, 0, 1.3, 0, 0.025, 0.4, 0.025, 0.01, speaker);
  box(0, 1.78, 0, 0.42, 0.62, 0.36, C.dark, 0.02, speaker).name = 'bz26-radio-speaker-box';
  part(G.ball, '#55577a', 0, 1.7, 0.19, 0.12, 0.12, 0.02, 0, speaker);
  part(G.ball, '#55577a', 0, 1.93, 0.19, 0.06, 0.06, 0.02, 0, speaker);

  return {
    group, speaker,
    dispose() { group.removeFromParent(); for (const o of owned) o.dispose?.(); },
  };
}

/** 三角形數（含描邊），寫進 PR 的效能欄。 */
export function countTriangles(root) {
  let n = 0;
  root.traverse(o => { if (o.isMesh && o.geometry) { const g = o.geometry; n += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
  return Math.round(n);
}
