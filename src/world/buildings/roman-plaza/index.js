/**
 * 羅馬廣場：行政大樓右邊的半圓形（扇形）開放式迴廊，圍著一片草坪。
 * 扇形的開口朝校外（+z，校門方向），背面（弧形外牆）朝田徑場。
 * 依實景照片：清水混凝土厚柱、大圓洞牆板、頂上一圈混凝土環梁、深色鋼樑與鐵網花架爬滿藤蔓，
 * 迴廊地面鋪灰色卵石、放木條長椅；兩端是爬滿藤蔓的高牆墩；開口前是淺灰白方磚廣場。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { BOX, GRAD, SPH, block, canvasTex, flat, mk, outline, toon } from '../../../render/kit.js';
import { circC, obbC } from '../../../core/collision.js';
import { tree } from '../../vegetation.js';
import { swZ } from '../../layout.js';
import { defineBuilding } from '../../registry.js';

// 扇形圓心（開口邊的中點）、迴廊內外半徑、地台高度
const C = { x: 90, z: -63 };
const RO = 15, RI = 11.5, FLOOR = 0.4;
const N = 14;                                   // 弧上的開間數
/** 角度 a（0 = 右端，π/2 = 正後方靠田徑場，π = 左端靠行政大樓）、半徑 r 的世界座標 */
const P = (a, r) => [C.x + r * Math.cos(a), C.z - r * Math.sin(a)];
/** 讓方塊的長邊沿著弧的切線方向 */
const tangentYaw = a => a + Math.PI / 2;
/** 點相對圓心的極座標 */
const polar = (x, z) => ({ r: Math.hypot(x - C.x, z - C.z), a: Math.atan2(C.z - z, x - C.x) });

// 南北向步道（行政大樓與羅馬廣場之間，照片：一排樹、木椅）
const WALK = { x0: 65, x1: 69, z1: -88 };

const CONCRETE = '#9c9e99', CONCRETE_D = '#7f817c', STEEL = '#3f3a36', WOOD = '#8a6a42', VINE = '#5e8c3a', VINE2 = '#6f9c46';

/** 風化的清水混凝土：灰底、往下流的深色水痕與青苔 */
function stainTex(rep) { return canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#a2a49f'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { const x = Math.random() * w, len = 30 + Math.random() * 98, gr = c.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, `rgba(${i % 3 ? '60,64,58' : '70,92,52'},.55)`); gr.addColorStop(1, 'rgba(60,64,58,0)'); c.fillStyle = gr; c.fillRect(x, 0, 2 + Math.random() * 6, len); }
  for (let i = 0; i < 260; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(40,40,40,.12)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  c.fillStyle = 'rgba(70,96,50,.35)'; c.fillRect(0, h - 14, w, 14); }, rep); }
/** 爬滿牆面的小葉藤蔓 */
const vineTex = () => canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#4f6b2e'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const v = Math.random(); c.fillStyle = v < 0.35 ? '#7a9a3c' : v < 0.7 ? '#93ad4a' : v < 0.9 ? '#5d7d34' : '#b0a35a'; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 2, 1.5 + Math.random() * 1.5, Math.random() * 3, 0, 7); c.fill(); } }, [1, 2]);

function build() {
  const g = new THREE.Group(); g.position.set(C.x, 0, C.z);
  /** 加到廣場群組（座標相對圓心），長邊沿弧的切線 */
  const put = (m, a, r, y) => { const [x, z] = P(a, r); m.position.set(x - C.x, y, z - C.z); m.rotation.y = tangentYaw(a); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const bx = (a, r, y, sx, sy, sz, col, out) => { const m = put(new THREE.Mesh(BOX, typeof col === 'string' ? toon(col) : col), a, r, y); m.scale.set(sx, sy, sz); if (out) { const o = outline(m, 0); o.scale.set(1 + 2 * out / sx, 1 + 2 * out / sy, 1 + 2 * out / sz); } return m; };
  const seg = Math.PI / N, chordO = 2 * RO * Math.sin(seg / 2), chordI = 2 * RI * Math.sin(seg / 2);

  /* ---------- 地台：半圓環，表面灰色卵石，側面混凝土 ---------- */
  const pebble = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#7f7c76'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) { const v = 90 + Math.random() * 70 | 0; c.fillStyle = `rgb(${v},${v - 4},${v - 10})`; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 1.5 + Math.random() * 2, 1 + Math.random() * 1.5, Math.random() * 3, 0, 7); c.fill(); } }, [0.5, 0.5]);
  { const s = new THREE.Shape(); s.absarc(0, 0, RO + 0.5, 0, Math.PI, false); s.absarc(0, 0, RI - 0.4, Math.PI, 0, true);
    const geo = new THREE.ExtrudeGeometry(s, { depth: FLOOR, bevelEnabled: false, curveSegments: 48 }); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, [new THREE.MeshToonMaterial({ map: pebble, gradientMap: GRAD }), toon(CONCRETE)]); m.receiveShadow = true; g.add(m); outline(m, 0.03); }

  /* ---------- 外牆：厚柱＋大圓洞牆板（每三間留一間通透），兩端是爬藤高牆墩 ---------- */
  const PH = 4.1, panelW = chordO - 0.75, panelH = 3.6, holeR = 1.3;
  const panelGeo = (() => { const s = new THREE.Shape(); s.moveTo(-panelW / 2, 0); s.lineTo(panelW / 2, 0); s.lineTo(panelW / 2, panelH); s.lineTo(-panelW / 2, panelH); s.lineTo(-panelW / 2, 0);
    const hole = new THREE.Path(); hole.absarc(0, 1.85, holeR, 0, Math.PI * 2, true); s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false, curveSegments: 28 }); geo.translate(0, 0, -0.2); return geo; })();
  // 牆板的 UV 是公尺，4 公尺重複一次
  const concM = new THREE.MeshToonMaterial({ map: stainTex([0.25, 0.25]), gradientMap: GRAD }), concBoxM = new THREE.MeshToonMaterial({ map: stainTex([1, 1]), gradientMap: GRAD });
  const panelMat = [concM, toon(CONCRETE_D)];
  const vineM = new THREE.MeshToonMaterial({ map: vineTex(), gradientMap: GRAD });
  for (let i = 0; i < N; i++) {
    const a = seg * (i + 0.5);
    if (i % 3 === 2) continue;   // 通透的開間：看得到後面的田徑場
    const m = put(new THREE.Mesh(panelGeo, panelMat), a, RO, FLOOR); outline(m, 0.03);
    const [x, z] = P(a, RO); obbC(x, z, panelW / 2, 0.3, tangentYaw(a));
  }
  for (let i = 0; i <= N; i++) {
    const a = seg * i, end = i === 0 || i === N;
    if (end) {
      // 端點高牆墩：混凝土外面整片爬滿藤蔓
      bx(a, RO, FLOOR + 2.7, 1.3, 5.4, 1.6, concBoxM, 0.04);
      bx(a, RO, FLOOR + 2.65, 1.46, 5.2, 1.76, vineM, 0.05);
      const [x, z] = P(a, RO); obbC(x, z, 0.75, 0.9, tangentYaw(a));
    } else {
      bx(a, RO, FLOOR + PH / 2, 0.7, PH, 1.0, concBoxM, 0.04);
      const [x, z] = P(a, RO); obbC(x, z, 0.4, 0.55, tangentYaw(a));
    }
  }

  /* ---------- 屋頂：外圈混凝土環梁、內圈深色鋼樑、放射狀鋼樑、鐵網花架 ---------- */
  for (let i = 0; i < N; i++) {
    const a = seg * (i + 0.5);
    bx(a, RO, FLOOR + PH + 0.35, chordO + 0.05, 0.7, 0.75, concBoxM, 0.04);
    bx(a, RI, FLOOR + PH - 0.15, chordI + 0.02, 0.25, 0.22, STEEL, 0.02);
  }
  for (let i = 0; i <= N; i++) {
    const a = seg * i, mid = (RO + RI) / 2;
    bx(a, mid, FLOOR + PH - 0.1, 0.18, 0.22, RO - RI, STEEL, 0.02);
    // 內圈細柱（照片上是深色方管）
    bx(a, RI, FLOOR + (PH - 0.2) / 2, 0.2, PH - 0.2, 0.2, STEEL, 0.02);
    const [x, z] = P(a, RI); circC(x, z, 0.16);
  }
  // 鐵網花架：半透明格網＋零星葉子
  const mesh = canvasTex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h);
    c.strokeStyle = 'rgba(45,42,40,.95)'; c.lineWidth = 2; for (let i = 0; i <= w; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
    for (let i = 0; i < 70; i++) { c.fillStyle = i % 2 ? '#5e8c3a' : '#79a64e'; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 4 + Math.random() * 6, 3 + Math.random() * 4, Math.random() * 3, 0, 7); c.fill(); } }, [14, 14]);
  { const geo = new THREE.RingGeometry(RI, RO, 48, 1, 0, Math.PI); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: mesh, gradientMap: GRAD, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
    m.position.y = FLOOR + PH + 0.05; m.castShadow = true; m.name = '羅馬廣場花架'; g.add(m); }
  // 屋頂上的藤蔓叢：沿著環梁一團一團，靠後段比較茂密
  for (let i = 0; i < 26; i++) {
    const a = (i + 0.5) / 26 * Math.PI, r = RI + 0.8 + (i * 7 % 5) / 5 * (RO - RI - 1.2), [x, z] = P(a, r);
    const b = mk(SPH, toon(i % 2 ? VINE : VINE2), x - C.x, FLOOR + PH + 0.55, z - C.z, { parent: g }); b.scale.set(1.5, 0.45 + (i % 3) * 0.12, 1.1); b.rotation.y = tangentYaw(a); outline(b, 0.05);
  }

  /* ---------- 迴廊裡的木條長椅（靠外牆內側） ---------- */
  for (let i = 0; i < N; i++) {
    const a = seg * (i + 0.5), r = RO - 1.05;
    bx(a, r, FLOOR + 0.42, chordO * 0.62, 0.08, 0.5, WOOD, 0.02);
    [-0.32, 0.32].forEach(k => bx(a + k * seg, r, FLOOR + 0.2, 0.08, 0.4, 0.42, CONCRETE_D, 0));
    const [x, z] = P(a, r); obbC(x, z, chordO * 0.31, 0.28, tangentYaw(a));
  }

  /* ---------- 中央草坪：比旁邊的草皮更綠，外緣一圈混凝土收邊 ---------- */
  { const geo = new THREE.CircleGeometry(RI - 0.4, 48, 0, Math.PI); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, toon('#5fae4c')); m.position.y = 0.025; m.receiveShadow = true; g.add(m); }

  /* ---------- 開口前的方磚廣場：淺灰白方磚，沿著扇形開口 ---------- */
  const tiles = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#d9d8d2'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = (x * 3 + y * 5) % 7; c.fillStyle = v < 2 ? '#a9aaa6' : v < 4 ? '#c2c2bd' : '#e6e5e0'; c.fillRect(x * 16 + 1, y * 16 + 1, 14, 14); } }, [1, 1]);
  const tileMat = new THREE.MeshToonMaterial({ map: tiles, gradientMap: GRAD });
  const tileFlat = (x0, x1, z0, z1, y) => { const t = tileMat.clone(); t.map = tiles.clone(); t.map.repeat.set((x1 - x0) / 2, (z1 - z0) / 2); t.map.needsUpdate = true; return flat(x1 - x0, z1 - z0, t, (x0 + x1) / 2, y, (z0 + z1) / 2); };
  tileFlat(C.x - RO - 1, C.x + RO + 1, C.z, C.z + 6, 0.02);

  scene.add(g);

  /* ---------- 行政大樓和羅馬廣場之間的南北向步道：方磚、一排樹、木椅 ---------- */
  { const z0 = swZ((WALK.x0 + WALK.x1) / 2) - 2.4;
    tileFlat(WALK.x0, WALK.x1, WALK.z1, z0, 0.021);
    // 步道接到開口前的方磚廣場
    tileFlat(WALK.x1, C.x - RO - 1, C.z, C.z + 6, 0.021);
    for (let z = z0 - 4; z > WALK.z1 + 2; z -= 7.5) { if (z < -63 && z > -72) continue; tree(WALK.x0 - 1.4, z, 1.0); }
    [[WALK.x1 + 1.2, -76], [WALK.x1 + 1.2, -83]].forEach(([x, z]) => {
      block(x, 0.45, z, 0.5, 0.08, 1.8, WOOD, 0.02);
      block(x + 0.22, 0.75, z, 0.08, 0.5, 1.8, WOOD, 0.02);
      [-0.7, 0.7].forEach(dz => block(x, 0.22, z + dz, 0.42, 0.44, 0.08, '#4b4f55', 0));
      obbC(x, z, 0.3, 0.95, 0);
    }); }
}

export default defineBuilding({
  id: 'roman-plaza',
  name: '羅馬廣場',
  build,
  // 迴廊地台
  heightAt(x, z) {
    if (z > C.z) return null;
    const { r } = polar(x, z);
    return (r >= RI - 0.4 && r <= RO + 0.5) ? FLOOR : null;
  },
  // 在「行政大樓前」（170）之前判斷，不然整片都會被算成行政大樓前
  zones: [{ priority: 165, test: p => (p.z < C.z + 6 && Math.hypot(p.x - C.x, p.z - C.z) < RO + 1.5) ? '羅馬廣場' : null }],
  map: [{
    draw(g, mx, my) {
      const cx = mx(C.x), cy = my(C.z), ro = Math.abs(mx(C.x + RO) - cx), ri = Math.abs(mx(C.x + RI) - cx);
      const back = my(C.z - 1) < cy ? -1 : 1;   // 地圖上 -z 是往上還是往下
      const a0 = back < 0 ? Math.PI : 0, a1 = back < 0 ? Math.PI * 2 : Math.PI;
      g.fillStyle = '#7fbf62'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, ri, a0, a1); g.closePath(); g.fill();
      g.fillStyle = '#a7a8a3'; g.beginPath(); g.arc(cx, cy, ro, a0, a1); g.arc(cx, cy, ri, a1, a0, true); g.closePath(); g.fill();
      g.fillStyle = '#3a3a36'; g.font = '700 20px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText('羅馬廣場', cx, cy + back * ri * 0.45 + 7);
    },
  }],
});
