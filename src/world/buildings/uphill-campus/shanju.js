/**
 * 山居學習中心、下車點停車場與往安九的道路景觀。
 *
 * 依 2026-10-23 照片 9041 到 9051、9068 到 9072（只放在本機 .references，不進版本庫）：
 * - 山居：粉膚色小方磚六層塔樓，正面四列窗、每扇窗左下一台冷氣，窗上下有深灰窗簷；
 *   西側逐層圓弧陽台；一樓騎樓五根柱子（下段深色磨石），後牆掛「山居學習中心」與「政大書院」木匾，
 *   左邊玻璃門、右邊黑色雙開門。
 * - 安九：ABC 區南面一樓是食堂，橘色遮雨棚、藍底「安九食堂」招牌，樓上同樣是方磚窗牆。
 * - 停車場：塔樓前整片柏油，南緣一排停車格，後面是竹林、朱蕉與大樹，往外看是山谷。
 * - 六舍、七八舍：米灰色清水混凝土外牆、凹窗陽台，不是山居的粉色方磚，兩者不要混用。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { colliders, boxC, circC } from '../../../core/collision.js';
import { tree, FOLIAGE } from '../../vegetation.js';
import { BOX, GRAD, basic, block, canvasTex, mk, toon } from '../../../render/kit.js';
import { LAYOUT, SHANJU } from './layout.js';
import { heightAt } from './terrain.js';

const S = SHANJU, Y0 = S.base, YU = S.base + S.ground, TOP = YU + S.floors * S.floorH;
const TILE = '#efd5c9', GROUT = '#d9bcb0', HOOD = '#7d6f72', GLASS = '#6b808d', FRAME = '#f4f2ec';

/* ---------- 貼圖 ---------- */
/** 粉膚色小方磚：底色加淺灰縫，隨機點幾塊偏粉的磚。 */
function tiles(g, w, h, size, base = TILE, grout = GROUT) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#f4c9bd';
  for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) if (rnd() < 0.12) g.fillRect(x, y, size, size);
  g.fillStyle = grout;
  for (let x = 0; x < w; x += size) g.fillRect(x, 0, 1, h);
  for (let y = 0; y < h; y += size) g.fillRect(0, y, w, 1);
}
/** 一格窗：深灰窗簷、白框十字窗、窗台；位置以整格比例表示。 */
function windowBay(g, w, h, x0, x1, y0, y1) {
  const X0 = x0 * w, X1 = x1 * w, Y0 = y0 * h, Y1 = y1 * h;
  g.fillStyle = HOOD; g.fillRect(X0 - 8, Y0 - 12, X1 - X0 + 16, 12); g.fillRect(X0 - 4, Y1, X1 - X0 + 8, 8);
  g.fillStyle = FRAME; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  g.fillStyle = GLASS; const f = 6, mx = (X0 + X1) / 2, my = Y0 + (Y1 - Y0) * 0.4;
  [[X0 + f, Y0 + f, mx - 3, my - 3], [mx + 3, Y0 + f, X1 - f, my - 3], [X0 + f, my + 3, mx - 3, Y1 - f], [mx + 3, my + 3, X1 - f, Y1 - f]]
    .forEach(([a, b, c, d]) => g.fillRect(a, b, c - a, d - b));
  g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(X0 + f, Y0 + f, X1 - X0 - 2 * f, (my - Y0) * 0.35);
}
const textures = {};
function tex(name) {
  if (textures[name]) return textures[name];
  const draw = {
    // 山居正面與東面：一格 2.3 公尺寬、一層樓高，窗在右半邊，冷氣另外做成立體箱子。
    shanjuWin: [256, 256, (g, w, h) => { tiles(g, w, h, 16); windowBay(g, w, h, 0.42, 0.9, 0.22, 0.74); }],
    // 西面：方磚牆上一小格玻璃磚窗。
    shanjuSide: [256, 256, (g, w, h) => {
      tiles(g, w, h, 16); g.fillStyle = '#dfe6e6'; g.fillRect(96, 70, 64, 92);
      g.fillStyle = '#b9c4c6'; for (let i = 0; i <= 4; i++) { g.fillRect(96, 70 + i * 23, 64, 2); g.fillRect(96 + i * 16, 70, 2, 92); }
    }],
    shanjuPlain: [256, 256, (g, w, h) => tiles(g, w, h, 16)],
    // 騎樓後牆：左邊玻璃門廳、中間白磚夾粉磚、右邊黑色雙開門，上緣一條粉磚帶。
    arcadeWall: [1024, 356, (g, w, h) => {
      tiles(g, w, h, 22, '#f3efe8', '#cfc8c0');
      let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      g.fillStyle = '#efc4b8'; for (let y = 60; y < h; y += 22) for (let x = 0; x < w; x += 22) if (rnd() < 0.18) g.fillRect(x + 1, y + 1, 21, 21);
      tiles(g, w, 44, 22, TILE, GROUT);
      g.fillStyle = '#9aa1a3'; g.fillRect(20, 70, 230, 286);
      g.fillStyle = '#f7efd6'; g.fillRect(30, 80, 100, 276); g.fillRect(140, 80, 100, 276);
      g.fillStyle = '#d8c39b'; g.fillRect(40, 120, 80, 40); g.fillStyle = '#b44a3c'; g.fillRect(165, 150, 22, 80);
      g.fillStyle = '#8a9093'; g.fillRect(127, 200, 6, 40);
      g.fillStyle = '#26272c'; g.fillRect(700, 50, 300, 306);
      g.fillStyle = '#3a3c43'; g.fillRect(712, 62, 276, 80); g.fillStyle = '#2f3036';
      for (let y = 70; y < 140; y += 8) g.fillRect(716, y, 268, 3);
      g.fillStyle = '#1b1c20'; g.fillRect(848, 150, 4, 206); g.fillStyle = '#b8bcc2'; g.fillRect(830, 240, 4, 36); g.fillRect(866, 240, 4, 36);
    }],
    // 政大書院木匾：木紋底、左側水墨山、行書大字、右下落款。
    shuyuan: [512, 200, (g, w, h) => {
      g.fillStyle = '#b06a36'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c27c46'; for (let y = 8; y < h; y += 14) g.fillRect(0, y, w, 4);
      g.fillStyle = '#2b201b';
      g.beginPath(); g.moveTo(18, 150); g.lineTo(40, 60); g.lineTo(62, 40); g.lineTo(88, 70); g.lineTo(100, 130); g.lineTo(120, 150); g.closePath(); g.fill();
      g.fillStyle = '#b06a36'; g.fillRect(48, 70, 10, 50); g.fillRect(70, 80, 8, 40);
      g.fillStyle = '#2b201b'; g.font = '900 96px "Noto Serif TC","Songti TC",serif'; g.textBaseline = 'middle';
      g.fillText('政大書院', 128, 92, 370);
      g.font = '700 22px "Noto Serif TC","Songti TC",serif'; g.fillText('歲在戊子桂月', 360, 172);
    }],
    shanjuSign: [320, 96, (g, w, h) => {
      g.fillStyle = '#d7e0de'; g.fillRect(0, 0, w, h); g.fillStyle = '#9fb3c2'; g.fillRect(0, 0, w, 24);
      g.fillStyle = '#2f4a6a'; g.textAlign = 'center'; g.font = '700 15px Arial,sans-serif'; g.fillText('Hillside Learning Lodge', w / 2, 18);
      g.font = '900 40px "Noto Sans TC",sans-serif'; g.textBaseline = 'middle'; g.fillText('山居學習中心', w / 2, 60);
    }],
    // 安九一樓店面：磁磚柱、亮著暖光的玻璃、下緣紅色台階邊。
    storefront: [256, 256, (g, w, h) => {
      tiles(g, 40, h, 10, '#efe6df', '#d6cbc2');
      g.fillStyle = '#d9d9d4'; g.fillRect(40, 20, w - 40, h - 40);
      g.fillStyle = '#fff0c8'; g.fillRect(48, 64, w - 56, h - 92); g.fillStyle = '#e8f1f2'; g.fillRect(48, 28, w - 56, 30);
      g.fillStyle = '#e9d4a8'; g.fillRect(60, 90, 40, 26); g.fillRect(180, 96, 30, 20);
      g.fillStyle = '#e07a3c'; g.fillRect(48, 150, w - 56, 6);
      g.fillStyle = '#c9c9c4'; g.fillRect(146, 64, 6, h - 92);
      g.fillStyle = '#b8443a'; g.fillRect(0, h - 20, w, 20);
    }],
    // 安九樓上：方磚、橫向雙扇窗、窗左下畫一台冷氣（遠處，不做立體）。
    anjiuUpper: [256, 240, (g, w, h) => {
      tiles(g, w, h, 16, '#ead8d0', '#d4c1b8'); windowBay(g, w, h, 0.32, 0.86, 0.24, 0.7);
      g.fillStyle = '#e9e8e3'; g.fillRect(14, 140, 56, 40); g.fillStyle = '#b9bcbf'; g.beginPath(); g.arc(50, 160, 14, 0, 7); g.fill();
    }],
    // 六舍、七八舍：米灰清水混凝土、凹窗、陽台板、冷氣。
    concrete: [256, 256, (g, w, h) => {
      g.fillStyle = '#d6ccbd'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c6baa9'; g.fillRect(0, 0, 18, h); g.fillRect(0, h - 26, w, 26);
      g.fillStyle = '#5e6873'; g.fillRect(50, 46, 160, 120);
      g.fillStyle = '#e6e3dc'; g.fillRect(50, 46, 160, 6); g.fillRect(126, 46, 6, 120); g.fillRect(50, 104, 160, 4);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(56, 54, 66, 24);
      g.fillStyle = '#bfb3a2'; g.fillRect(36, 166, 190, 30);
      g.fillStyle = '#eceae4'; g.fillRect(150, 120, 46, 34); g.fillStyle = '#b5b8bb'; g.beginPath(); g.arc(180, 137, 11, 0, 7); g.fill();
    }],
    // 走廊平台：暖灰方磚，靠外緣一排紅磚。
    deck: [128, 128, (g, w, h) => { tiles(g, w, h, 32, '#cbbdad', '#b3a596'); g.fillStyle = '#b7614a'; g.fillRect(0, h - 18, w, 18); }],
    // 東端矮牆的灰色花崗石花格。
    lattice: [128, 64, (g, w, h) => {
      g.fillStyle = '#9b958f'; g.fillRect(0, 0, w, h); g.fillStyle = '#5d5a5c';
      for (let x = 8; x < w; x += 20) for (let y = 10; y < h - 6; y += 16) g.fillRect(x, y, 12, 8);
    }],
    anjiuSign: [1024, 160, (g, w, h) => {
      g.fillStyle = '#233f86'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef8'; g.fillRect(40, 78, 170, 4); g.fillRect(w - 210, 78, 170, 4);
      g.fillStyle = '#ffffff'; g.font = '900 104px "Noto Serif TC","Songti TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('安九食堂', w / 2 - 30, 84);
      g.fillStyle = '#f2c94c'; g.beginPath(); g.ellipse(w / 2 + 250, 104, 70, 18, -0.1, 0, 7); g.fill();
      g.fillStyle = '#233f86'; g.font = 'italic 900 30px Arial,sans-serif'; g.fillText('ENJOY', w / 2 + 250, 106);
    }],
    lifeFoods: [256, 300, (g, w, h) => {
      g.fillStyle = '#1f3550'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9eef3'; g.textAlign = 'center';
      g.font = '900 40px "Noto Sans TC",sans-serif'; g.fillText('生活美食館', w / 2, 190);
      g.font = '700 20px Arial,sans-serif'; g.fillText('Life & Foods', w / 2, 226); g.fillText('BREAKFAST · LUNCH', w / 2, 70);
    }],
    acFront: [64, 48, (g, w, h) => {
      g.fillStyle = '#e8e6e0'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8bbbe'; g.beginPath(); g.arc(40, 24, 15, 0, 7); g.fill();
      g.strokeStyle = '#9da1a5'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(25, 12 + i * 8); g.lineTo(55, 12 + i * 8); g.stroke(); }
      g.fillStyle = '#c94a3c'; g.fillRect(4, 4, 10, 5);
    }],
  }[name];
  textures[name] = canvasTex(...draw);
  return textures[name];
}
/** 同一張畫布依牆面大小重複，複製出各自的 repeat。 */
function mat(name, rx = 1, ry = 1) {
  const t = tex(name).clone(); t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD });
}

/** 沿 a→b 的牆面貼一片立面，法線朝左手外側（建築在右手邊）。 */
function facade(a, b, y0, y1, material, out = 0.04) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(L, y1 - y0), material);
  m.position.set((a[0] + b[0]) / 2 + nx * out, (y0 + y1) / 2, (a[1] + b[1]) / 2 + nz * out);
  m.rotation.y = -Math.atan2(dz, dx); scene.add(m); return { m, L, nx, nz, dx: dx / L, dz: dz / L };
}

/* ---------- 山居塔樓 ---------- */
const HALF_CYL = new THREE.CylinderGeometry(1.2, 1.2, 1, 16, 1, false, Math.PI, Math.PI);
const HALF_SLAB = new THREE.CylinderGeometry(1.32, 1.32, 0.16, 16, 1, false, Math.PI, Math.PI);
const PIPE = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
const LAMP_DOT = new THREE.CircleGeometry(0.16, 10);

function tower() {
  const W = S.x1 - S.x0, D = S.z1 - S.z0, cx = (S.x0 + S.x1) / 2;
  // 樓上量體懸在騎樓上方，一樓只有騎樓後牆以北是實心。
  block(cx, (YU + TOP) / 2, (S.z0 + S.z1) / 2, W, TOP - YU, D, TILE, 0.05);
  block(cx, (Y0 + YU) / 2, (S.z0 + S.arcade) / 2, W, S.ground, S.arcade - S.z0, TILE, 0.04);
  // 屋頂深灰壓頂。
  block(cx, TOP + 0.25, (S.z0 + S.z1) / 2, W + 0.2, 0.5, D + 0.2, '#8b8486', 0.04);
  block(cx, TOP + 0.52, (S.z0 + S.z1) / 2, W - 0.4, 0.06, D - 0.4, '#b9b1ac');
  const front = [S.x0, S.z1], frontR = [S.x1, S.z1], ne = [S.x1, -2.6];
  // 南面四列窗、東面三列窗，各五層。
  facade(front, frontR, YU, TOP, mat('shanjuWin', 4, S.floors));
  facade(frontR, ne, YU, TOP, mat('shanjuWin', 3, S.floors));
  facade([S.x1, -2.6], [S.x1, S.z0], 24, TOP, mat('shanjuPlain', 6, 1.4));
  facade([S.x0, S.z0], front, YU, TOP, mat('shanjuSide', 9, S.floors));
  facade([S.x0, S.z0], [S.x0, S.arcade], Y0, YU, mat('shanjuPlain', 9, 1.2));
  facade([S.x1, S.z0], [S.x0, S.z0], Y0, TOP, mat('shanjuPlain', 4, 6));
  // 騎樓：後牆、白色天花與燈、地坪、柱子。
  facade([S.x0, S.arcade], [S.x1, S.arcade], Y0, YU, mat('arcadeWall'), 0.02);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, S.z1 - S.arcade), toon('#f4f1ea'));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, YU - 0.02, (S.arcade + S.z1) / 2); scene.add(ceil);
  block(cx, YU - 0.2, S.arcade + 1.6, W, 0.36, 0.3, '#f1ede4');
  for (const x of [1, 3.2, 5.4, 7.6]) {
    const l = mk(LAMP_DOT, toon('#fffbe8', { emissive: '#fff2c4', emissiveIntensity: 0.7 }), x, YU - 0.04, S.arcade + 0.8, {});
    l.rotation.x = Math.PI / 2;
  }
  const floor = canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#e8e0cf'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d8ccb5'; for (let i = 0; i < 260; i++) g.fillRect((i * 97) % w, (i * 53) % h, 3, 3);
    g.strokeStyle = '#d9584a'; g.lineWidth = 4; g.beginPath(); g.arc(70, 56, 20, 0, 7); g.stroke();
    g.strokeStyle = '#5f9ac8'; g.beginPath(); g.moveTo(0, 30); g.bezierCurveTo(80, 10, 150, 80, 256, 50); g.stroke();
  });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, S.z1 - S.arcade + 0.3), new THREE.MeshToonMaterial({ map: floor, gradientMap: GRAD }));
  fl.rotation.x = -Math.PI / 2; fl.position.set(cx, Y0 + 0.025, (S.arcade + S.z1 + 0.3) / 2); scene.add(fl);
  const p = S.pillar, zc = S.z1 - p / 2;
  S.pillars.forEach((x, i) => {
    block(x, Y0 + 0.45, zc, p + 0.04, 0.9, p + 0.04, '#7a6f7c', 0.03);
    block(x, (Y0 + 0.9 + YU) / 2, zc, p, S.ground - 0.9, p, '#efc9bc', 0.03);
    if (i === 1 || i === 3) mk(PIPE, toon('#a9adb0'), x + p / 2 + 0.06, Y0 + S.ground / 2 + 0.6, zc + 0.2, {}).scale.y = S.ground + 1.2;
  });
  // 木匾、小招牌、長椅。
  const sign = (name, w, h, x, y) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic({ map: tex(name) }));
    m.position.set(x, y, S.arcade + 0.06); scene.add(m); return m;
  };
  block(4.2, Y0 + 1.75, S.arcade + 0.03, 2.9, 1.18, 0.06, '#7a4a2a', 0.015);
  sign('shuyuan', 2.8, 1.1, 4.2, Y0 + 1.75).position.z += 0.01;
  sign('shanjuSign', 1.4, 0.42, 3.15, Y0 + 2.62);
  block(4.2, Y0 + 0.42, S.arcade + 0.35, 2.8, 0.08, 0.4, '#8a5a34', 0.015);
  [3.0, 5.4].forEach(x => block(x, Y0 + 0.2, S.arcade + 0.35, 0.08, 0.4, 0.36, '#3d3f45'));
  // 西面逐層圓弧陽台：實心弧形欄板加深色樓板，陽台後面是暗色落地門。
  for (let k = 0; k < S.floors; k++) {
    const y = YU + k * S.floorH, zc2 = 1.2;
    mk(HALF_SLAB, toon('#857779'), S.x0, y + 0.08, zc2, { out: 0.02 });
    mk(HALF_CYL, toon(TILE), S.x0, y + 0.66, zc2, { out: 0.03 });
    block(S.x0 - 0.02, y + 1.1, zc2, 0.02, 1.9, 1.2, '#4f4a52');
  }
  acUnits();
}

/** 每扇窗左下一台冷氣：南面四列、東面三列，共用形狀與材質。 */
function acUnits() {
  const side = toon('#e2e0da'), front = new THREE.MeshToonMaterial({ map: tex('acFront'), gradientMap: GRAD });
  const spots = [];
  for (let f = 0; f < S.floors; f++) {
    const y = YU + f * S.floorH + 1.65;
    for (let c = 0; c < 4; c++) spots.push([S.x0 + c * 2.3 + 0.55, y, S.z1 + 0.2, 0]);
    for (let c = 0; c < 3; c++) spots.push([S.x1 + 0.2, y, S.z1 - c * 2.867 - 0.6, Math.PI / 2]);
  }
  const inst = new THREE.InstancedMesh(BOX, [side, side, side, side, front, side], spots.length), o = new THREE.Object3D();
  spots.forEach(([x, y, z, r], i) => { o.position.set(x, y, z); o.rotation.set(0, r, 0); o.scale.set(0.72, 0.5, 0.32); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); });
  inst.name = '山居冷氣'; scene.add(inst);
}

/* ---------- 安九食堂立面 ---------- */
/**
 * 照片 9049 到 9051：一樓店面退在有頂走廊後面，走廊是抬高的平台（紅色踢腳、入口前石板踏階），
 * 前緣一排磁磚柱（下半深色磨石），柱間擺木頭野餐桌椅；橘色遮雨棚蓋過走廊，
 * 棚上是磁磚帶與深色花崗石帶、二樓窗下突出花台；西端兩片生活美食館大海報，東端是花格矮牆。
 * 西端六公尺留給候車亭（BUS_SHELTER），走廊從它東邊開始。
 */
const ANJIU = [[8.8, -2.6], [30.4, -3.1], [47.9, -3.5]], WALK = 2.8, WALK_FROM = 5.2;
const TABLE = new THREE.BoxGeometry(1, 1, 1);
function anjiu() {
  const tables = [], lampSpots = [];
  for (let i = 1; i < ANJIU.length; i++) {
    const a = ANJIU[i - 1], b = ANJIU[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = -dz, nz = dx;
    const at = (u, v) => [a[0] + dx * u + nx * v, a[1] + dz * u + nz * v];
    const u0 = i === 1 ? WALK_FROM : 0;
    // 店面只在走廊後面；候車亭後面是磁磚牆。
    if (u0) facade(a, at(u0, 0), Y0, 15.4, mat('shanjuPlain', 2, 1.2));
    facade(at(u0, 0), b, Y0, 15.4, mat('storefront', Math.round((L - u0) / 3), 1));
    facade(a, b, 15.4, 15.9, mat('shanjuPlain', Math.round(L / 2), 0.25));
    facade(a, b, 15.9, 16.5, toon('#6f6a72'));
    facade(a, b, 16.5, 24, mat('anjiuUpper', Math.round(L / 3), 2.7));
    const g = new THREE.Group(); g.position.set(a[0], Y0, a[1]); g.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); scene.add(g);
    // 二樓窗下的深色花崗石花台。
    for (let u = 1.5; u < L - 1; u += 3) if (Math.abs(at(u, 0)[0] - 34.3) > 4.4) block(u, 4.25, 0.25, 1.3, 0.45, 0.5, '#6a6570', 0.02, g);
    const len = L - u0, mid = (u0 + L) / 2;
    // 抬高的走廊平台：表面磚面貼圖、前緣紅色踢腳。
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(len, WALK), mat('deck', len / 2, 1));
    floor.rotation.x = -Math.PI / 2; floor.position.set(mid, 0.12, WALK / 2); g.add(floor);
    block(mid, 0.06, WALK, len, 0.12, 0.06, '#c0392b', 0.01, g);
    // 走廊外到路邊是落葉泥土帶，不是草皮。
    const soil = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.6), toon('#8f7a62'));
    soil.rotation.x = -Math.PI / 2; soil.position.set(mid, 0.02, WALK + 0.8); g.add(soil);
    // 柱子：每 3.8 公尺一根，下半深色磨石、上半白磁磚。
    for (let u = u0 + 0.4; u <= L - 0.3; u += 3.8) {
      block(u, 0.6, WALK - 0.3, 0.5, 1.2, 0.5, '#8d8890', 0.03, g);
      block(u, 2.15, WALK - 0.3, 0.46, 1.9, 0.46, '#efe8e2', 0.03, g);
      const next = u + 1.9;
      if (next < L - 1 && Math.abs(at(next, 0)[0] - 34.3) > 2.2) tables.push(at(next, 1.4).concat(g.rotation.y));
      lampSpots.push(at(u + 1.9, WALK + 0.7));
    }
    // 橘色遮雨棚：從牆面伸出蓋過柱列，外緣略低，前緣一條垂邊。
    const roof = block(mid, 3.25, WALK / 2 + 0.2, len, 0.1, WALK + 0.8, '#dd7a3a', 0.03, g); roof.rotation.x = 0.1;
    block(mid, 2.97, WALK + 0.58, len, 0.3, 0.06, '#c8632e', 0.02, g);
  }
  // 正門前石板踏階。
  const stepAt = [34.3, -3.1 - 0.4 * (3.9 / 17.5)];
  block(stepAt[0], Y0 + 0.05, stepAt[1] + WALK + 0.5, 3.2, 0.1, 1, '#b8b2a8', 0.01);
  // 野餐桌椅：桌面、兩條長凳、深色腳，共用一個方塊形狀。
  const wood = [], legs = [];
  for (const [x, z, r] of tables) {
    const put = (list, lx, y, lz, sx, sy, sz) => {
      const c = Math.cos(r), sn = Math.sin(r);
      list.push({ p: [x + lx * c + lz * sn, Y0 + 0.12 + y, z - lx * sn + lz * c], r: [0, r, 0], s: [sx, sy, sz], color: '#a0703f' });
    };
    put(wood, 0, 0.74, 0, 1.6, 0.06, 0.75); put(wood, 0, 0.42, -0.65, 1.6, 0.05, 0.28); put(wood, 0, 0.42, 0.65, 1.6, 0.05, 0.28);
    for (const lx of [-0.65, 0.65]) { put(legs, lx, 0.37, 0, 0.06, 0.74, 0.06); put(legs, lx, 0.2, -0.65, 0.06, 0.4, 0.06); put(legs, lx, 0.2, 0.65, 0.06, 0.4, 0.06); put(legs, lx, 0.36, 0, 0.05, 0.05, 1.36); }
  }
  legs.forEach(l => { l.color = '#3d3f45'; });
  instanced(TABLE, wood, '安九野餐桌'); instanced(TABLE, legs, '安九桌腳');
  for (const [x, z] of tables) boxC(x - 0.85, x + 0.85, z - 0.85, z + 0.85);
  // 藍底招牌掛在正門上方的遮雨棚上緣。
  const board = block(34.3, 16.05, stepAt[1] + 0.45, 7.2, 1.2, 0.14, '#233f86', 0.02);
  board.rotation.y = Math.atan2(0.4, 17.5);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(7.05, 1.1), basic({ map: tex('anjiuSign') }));
  face.position.set(0, 0, 0.51); face.scale.set(1 / 7.2, 1 / 1.2, 1); board.add(face);
  // 西端兩片落地的生活美食館海報（走廊起點）。
  for (const x of [14.6, 16.6]) {
    const z = -2.6 - 0.5 * (x - 8.8) / 21.6 + 0.03;
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.6), basic({ map: tex('lifeFoods') }));
    poster.position.set(x, Y0 + 1.5, z); poster.rotation.y = Math.atan2(0.5, 21.6); scene.add(poster);
  }
  // 東端花格矮牆。
  const lattice = block(46.6, Y0 + 0.6, -3.47 + WALK, 2.4, 1.0, 0.25, mat('lattice'), 0.02);
  lattice.rotation.y = Math.atan2(0.4, 17.5);
  boxC(45.4, 47.8, -1, -0.4);
  // 雙頭黑色路燈立在走廊外緣的植栽帶，隔一根柱子一盞。
  const dark = toon('#3a3d45'), bulb = toon('#fff6dc', { emissive: '#ffe6a8', emissiveIntensity: 0.6 });
  lampSpots.filter(([x], k) => k % 2 === 1 && Math.abs(x - 34.3) > 2.4).forEach(([x, z]) => {
    mk(POLE, dark, x, Y0 + 2.2, z, { out: 0.015 }).scale.y = 4.4;
    block(x, Y0 + 4.4, z, 1.3, 0.08, 0.1, dark);
    [-0.6, 0.6].forEach(d => { block(x + d, Y0 + 4.45, z, 0.42, 0.14, 0.3, dark, 0.015); block(x + d, Y0 + 4.36, z, 0.34, 0.03, 0.22, bulb); });
    boxC(x - 0.15, x + 0.15, z - 0.15, z + 0.15);
  });
}

/* ---------- 六舍、七八舍立面（米灰混凝土，和山居不同） ---------- */
function neighbours() {
  for (const osm of [230992374, 230992375]) {
    const pts = LAYOUT.buildings.find(b => b.osm === osm).pts.slice(0, -1);
    const inside = (x, z) => pts.reduce((yes, [ax, az], i) => {
      const [bx, bz] = pts[(i + 1) % pts.length];
      return (az > z) !== (bz > z) && x < ax + (bx - ax) * (z - az) / (bz - az) ? !yes : yes;
    }, false);
    pts.forEach((p, i) => {
      let a = p, b = pts[(i + 1) % pts.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1.5) return;
      // 法線朝建築外側：中點往左手邊走半公尺若落在輪廓內就反過來。
      if (inside((a[0] + b[0]) / 2 - (b[1] - a[1]) / L * 0.5, (a[1] + b[1]) / 2 + (b[0] - a[0]) / L * 0.5)) [a, b] = [b, a];
      facade(a, b, Y0, 24, mat('concrete', Math.max(1, Math.round(L / 3.2)), 4));
    });
  }
}

/* ---------- 停車場、標線、車 ---------- */
const LOT = [[-9, 4], [-0.4, 4.4], [-0.4, 6.05], [8.8, 6.05], [16, 3.6], [21, 4], [22, 18.5], [-6, 18.5], [-9, 14]];
function parking() {
  const shape = new THREE.Shape(LOT.map(([x, z]) => new THREE.Vector2(x, -z)));
  const lot = new THREE.Mesh(new THREE.ShapeGeometry(shape), toon('#6e7177'));
  lot.rotation.x = -Math.PI / 2; lot.position.y = Y0 + 0.025; lot.name = '山居停車場'; scene.add(lot);
  const line = (w, d, x, z, c = '#f1f1ec') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon(c)); m.rotation.x = -Math.PI / 2; m.position.set(x, Y0 + 0.036, z); scene.add(m);
  };
  // 南緣一排停車格（車頭朝南，後面是竹林），中間留給站牌與指路牌的通道。
  const stalls = [-6.5, -4, -1.5, 1, 8.5, 11, 13.5, 16, 18.5, 21];
  stalls.forEach(x => line(0.12, 5, x, 15.5));
  line(-1.5 - -6.5 + 2.5 + 0.12, 0.12, -2.75, 13);
  line(21 - 8.5 + 0.12, 0.12, 14.75, 13);
  // 紅色禁停線沿騎樓前緣與安九店面前緣。
  line(S.x1 - S.x0, 0.12, (S.x0 + S.x1) / 2, S.z1 + 0.12, '#d64c4c');
  line(0.12, 1.6, S.x0 - 0.1, S.z1 - 0.7, '#d64c4c');
  car(9.75, 16, '#f4f4f2', false);
  car(12.25, 16, '#a9adb3', true);
  car(-5.25, 16, '#d8dde2', false, true);
}
const WHEEL = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12); WHEEL.rotateZ(Math.PI / 2);
/** 車頭朝南停進格子：車身、深色車窗、四顆輪子；suv 高一點，cover 是罩著車罩的車。 */
function car(x, z, color, suv, cover) {
  const h = suv ? 0.85 : 0.72, y = Y0 + 0.33;
  block(x, y + h / 2, z, 1.72, h, 4.0, color, 0.03);
  block(x, y + h + 0.3, z + 0.15, 1.5, 0.6, 2.2, cover ? color : '#46525d', 0.02);
  if (!cover) block(x, y + h + 0.61, z + 0.15, 1.42, 0.04, 2.0, color);
  if (suv) block(x, y + h + 0.61, z + 0.15, 1.42, 0.04, 2.0, '#2c2f35');
  for (const [dx, dz] of [[-0.8, -1.3], [0.8, -1.3], [-0.8, 1.3], [0.8, 1.3]]) mk(WHEEL, toon('#2b2c31'), x + dx, Y0 + 0.33, z + dz, {});
  boxC(x - 0.9, x + 0.9, z - 2.05, z + 2.05);
}

/* ---------- 植栽：朱蕉、姑婆芋、灌木、竹林、大樹、路燈 ---------- */
const LEAF = new THREE.ConeGeometry(0.22, 1, 4), BUSH = new THREE.IcosahedronGeometry(1, 0);
const CULM = new THREE.CylinderGeometry(0.06, 0.08, 1, 5);
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function instanced(geo, list, name) {
  const m = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: GRAD }), list.length), o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach(({ p, r, s, color }, i) => { o.position.set(...p); o.rotation.set(...r); o.scale.set(...s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.set(color)); });
  m.name = name; m.userData.noOcc = true; scene.add(m); return m;
}
/** 花台：深色土面，朱蕉（紫紅與綠葉兩種）、姑婆芋與灌木隨機混種。 */
function beds(list) {
  const leaves = [], bushes = [];
  const soil = (x0, z0, x1, z1) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), toon('#6b5846')); m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, Y0 + 0.03, (z0 + z1) / 2); scene.add(m);
    block((x0 + x1) / 2, Y0 + 0.08, z0, x1 - x0, 0.16, 0.12, '#b5aa9c');
  };
  for (const [x0, z0, x1, z1, n] of list) {
    soil(x0, z0, x1, z1);
    for (let i = 0; i < n; i++) {
      const x = x0 + 0.3 + rnd() * (x1 - x0 - 0.6), z = z0 + 0.3 + rnd() * (z1 - z0 - 0.6), kind = rnd();
      if (kind < 0.55) {
        const color = rnd() < 0.7 ? (rnd() < 0.5 ? '#9b2f50' : '#7a2a48') : '#4f8a46', h = 0.8 + rnd() * 0.6;
        for (let k = 0; k < 6; k++) {
          const a = k / 6 * Math.PI * 2 + rnd();
          leaves.push({ p: [x + Math.cos(a) * 0.12, Y0 + h / 2 + 0.1, z + Math.sin(a) * 0.12], r: [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5], s: [1, h, 0.4], color });
        }
      } else if (kind < 0.8) bushes.push({ p: [x, Y0 + 0.5, z], r: [0, rnd() * 3, 0], s: [0.75, 0.32, 0.75], color: '#4e9a47' });
      else bushes.push({ p: [x, Y0 + 0.45, z], r: [0, rnd() * 3, 0], s: [0.7, 0.55, 0.7], color: rnd() < 0.5 ? '#3f7f3f' : '#5a9a4a' });
    }
  }
  instanced(LEAF, leaves, '朱蕉'); instanced(BUSH, bushes, '灌木與姑婆芋');
}
/** 竹林：一叢細高竹竿，頂端幾團淺綠竹葉。 */
function bamboo(x0, z0, x1, z1, n) {
  const culms = [], tufts = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), h = 7 + rnd() * 4, lean = (rnd() - 0.5) * 0.15;
    culms.push({ p: [x, Y0 + h / 2, z], r: [lean, 0, lean], s: [1, h, 1], color: rnd() < 0.5 ? '#7aa35a' : '#5f8f48' });
    if (i % 2 === 0) tufts.push({ p: [x, Y0 + h - 0.6, z], r: [0, rnd() * 3, 0], s: [1.6, 1.4, 1.6], color: rnd() < 0.5 ? '#6fa553' : '#5b9447' });
  }
  instanced(CULM, culms, '竹竿'); instanced(BUSH, tufts, '竹葉');
  boxC(x0, x1, z0, z1);
}
/** 共用樹先建在遠處再搬到地形高度，碰撞改在正確位置重新登記。 */
function trees(list) {
  for (const [x, z, s] of list) {
    const n = scene.children.length, c = colliders.length, f = FOLIAGE.length;
    tree(1000, 1000, s);
    for (const o of scene.children.slice(n)) { o.position.x += x - 1000; o.position.z += z - 1000; o.position.y += heightAt(x, z); }
    colliders.splice(c); FOLIAGE.splice(f); circC(x, z, 0.4 * s);
  }
}
const POLE = new THREE.CylinderGeometry(0.07, 0.09, 1, 8);
/** 停車場邊與分岔口的彎臂路燈（安九前的雙頭路燈在 anjiu()）。 */
function lamps() {
  const bulb = toon('#fff6dc', { emissive: '#ffe6a8', emissiveIntensity: 0.6 });
  for (const [x, z, dir] of [[-8.6, 18.8, 1], [22.6, 12, -1]]) {
    mk(POLE, toon('#9aa3a6'), x, Y0 + 3, z, { out: 0.015 }).scale.y = 6;
    block(x + dir * 0.6, Y0 + 6, z, 1.2, 0.08, 0.08, '#9aa3a6');
    block(x + dir * 1.15, Y0 + 5.95, z, 0.45, 0.12, 0.25, '#c9cfd1', 0.015);
    block(x + dir * 1.15, Y0 + 5.88, z, 0.36, 0.03, 0.2, bulb);
  }
  boxC(-8.8, -8.4, 18.6, 19); boxC(22.4, 22.8, 11.8, 12.2);
}

let added = 0;
/** 山居一帶另外登記的碰撞數（車、竹林、樹、路燈），供入口測試核對總數。 */
export const shanjuColliderCount = () => added;

export function buildShanju() {
  const start = colliders.length;
  tower();
  anjiu();
  neighbours();
  parking();
  // 塔樓西側、停車場南緣、往安九的道路兩側與分岔口都是朱蕉花台。
  beds([
    [-3.2, -14, -0.7, 3.5, 30],
    [-6, 18.6, 22, 20.2, 70],
    [-13, 9.5, -9.6, 14, 14],
    [21.6, 6.8, 49, 9.5, 70],
    [18, 0.3, 30, 1.2, 16],
  ]);
  bamboo(3, 20.4, 15, 24, 40);
  trees([[-2, -9, 1.2], [-2.2, -3, 1.1], [-1.8, 2.6, 1], [-4, 21.5, 1.3], [17.5, 21.6, 1.4], [21, 22, 1.2],
    [24.5, 10.6, 1.3], [31, 10.8, 1.4], [37.5, 10.6, 1.3], [44, 10.4, 1.4], [49.5, 10, 1.2], [20.5, 0.8, 1], [27, 0.7, 1.1], [-11.5, 12.6, 1.2]]);
  lamps();
  added = colliders.length - start;
}
