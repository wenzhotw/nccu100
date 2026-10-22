/**
 * 奶蛙立牌的模型：一張人形大小的紙板立牌（正面印卡通奶蛙、背面是素色紙板），底下一個小支架。
 * 圖案用 canvasTex() 畫成平塗卡通，跟專案美術風格一致；輪廓直接畫在貼圖上（立牌是平的，不另外套描邊殼）。
 * 原點在立牌底部中央，正面朝 +z。
 */
import * as THREE from 'three';
import { GRAD, block, canvasTex, toon } from '../../render/kit.js';

export const STANDEE = { w: 0.92, h: 1.64 };
const OUTLINE = '#2a2c4a';

/** 奶蛙身體外形（畫布 256 × 512，正面和背面共用） */
function bodyPath(g) {
  g.beginPath();
  g.moveTo(128, 34);
  g.bezierCurveTo(168, 34, 182, 72, 178, 112);
  g.bezierCurveTo(176, 146, 214, 192, 226, 272);
  g.bezierCurveTo(240, 372, 212, 438, 152, 450);
  g.lineTo(104, 450);
  g.bezierCurveTo(44, 438, 16, 372, 30, 272);
  g.bezierCurveTo(42, 192, 80, 146, 78, 112);
  g.bezierCurveTo(74, 72, 88, 34, 128, 34);
  g.closePath();
}
const oval = (g, x, y, rx, ry, fill, line = 5) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (line) { g.lineWidth = line; g.strokeStyle = OUTLINE; g.stroke(); } };

/** 正面：白白胖胖的奶蛙，兩顆凸出的綠眼睛、面無表情的嘴、雙手捧著政大校徽 */
function drawFront(g, w, h) {
  g.clearRect(0, 0, w, h);
  // 腳（先畫，身體蓋在上面）
  oval(g, 96, 456, 30, 14, '#c9c8d4'); oval(g, 162, 456, 30, 14, '#c9c8d4');
  // 身體
  bodyPath(g); g.fillStyle = '#f5f4f8'; g.fill();
  // 左側淡淡的陰影（平塗一塊，不畫漸層）
  g.save(); bodyPath(g); g.clip(); g.fillStyle = '#e3e2ea';
  g.beginPath(); g.ellipse(44, 330, 40, 120, 0.05, 0, Math.PI * 2); g.fill(); g.restore();
  bodyPath(g); g.lineWidth = 6; g.strokeStyle = OUTLINE; g.stroke();
  // 凸出頭頂兩側的大眼睛
  [[92, 76], [164, 76]].forEach(([x, y]) => {
    oval(g, x, y, 26, 24, '#ffffff');
    oval(g, x + 3, y + 2, 16, 16, '#7fbf62', 0);
    oval(g, x + 4, y + 3, 9, 9, '#1f2330', 0);
    oval(g, x - 1, y - 3, 4, 4, '#ffffff', 0);
  });
  // 一條平平的嘴，很淡定
  g.lineCap = 'round'; g.lineWidth = 5; g.strokeStyle = OUTLINE;
  g.beginPath(); g.moveTo(112, 128); g.quadraticCurveTo(128, 133, 144, 128); g.stroke();
  // 捧在肚子上的政大校徽：藍色五瓣梅花、白心、紅色「政」字
  const cx = 128, cy = 292;
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; oval(g, cx + Math.cos(a) * 22, cy + Math.sin(a) * 22, 20, 20, '#2d4f9e', 0); }
  oval(g, cx, cy, 20, 20, '#ffffff', 0);
  g.fillStyle = '#c0392b'; g.font = '900 24px "Noto Serif TC","Songti TC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('政', cx, cy + 1);
  // 兩隻手扶著校徽
  oval(g, 84, 306, 18, 14, '#d4d3dd'); oval(g, 172, 300, 18, 14, '#d4d3dd');
  // 立牌底座
  g.fillStyle = '#ecebf0'; g.fillRect(60, 470, 136, 34); g.lineWidth = 4; g.strokeStyle = '#b9b7c2'; g.strokeRect(60, 470, 136, 34);
}

/** 背面：素色紙板，同一個外形 */
function drawBack(g, w, h) {
  g.clearRect(0, 0, w, h);
  oval(g, 96, 456, 30, 14, '#cfc6b6', 0); oval(g, 162, 456, 30, 14, '#cfc6b6', 0);
  bodyPath(g); g.fillStyle = '#d8cfbf'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#a99f8e'; g.stroke();
  [[92, 76], [164, 76]].forEach(([x, y]) => oval(g, x, y, 26, 24, '#d8cfbf', 0));
  g.fillStyle = '#d8cfbf'; g.fillRect(60, 470, 136, 34);
}

let mats = null;
function materials() {
  if (mats) return mats;
  const front = canvasTex(256, 512, drawFront), back = canvasTex(256, 512, drawBack);
  mats = {
    front: new THREE.MeshToonMaterial({ map: front, gradientMap: GRAD, transparent: true, alphaTest: 0.5 }),
    back: new THREE.MeshToonMaterial({ map: back, gradientMap: GRAD, transparent: true, alphaTest: 0.5 }),
  };
  return mats;
}
const PANEL = new THREE.PlaneGeometry(STANDEE.w, STANDEE.h);

/** 建立一個奶蛙立牌群組（之後由系統移動、跳動） */
export function createStandee() {
  const m = materials(), g = new THREE.Group();
  g.name = '奶蛙立牌'; g.userData.noOcc = true;
  const body = new THREE.Group(); g.add(body); g.userData.body = body;   // 跳動、搖晃時動這一層
  const f = new THREE.Mesh(PANEL, m.front); f.position.set(0, STANDEE.h / 2, 0.012); body.add(f);
  const b = new THREE.Mesh(PANEL, m.back); b.position.set(0, STANDEE.h / 2, -0.012); b.rotation.y = Math.PI; body.add(b);
  // 背後的三角支架
  const strut = block(0, 0.42, -0.2, 0.06, 0.84, 0.03, toon('#b9ae9a'), 0.01, body); strut.rotation.x = -0.45;
  // 地上淡淡的影子（立牌是透明貼圖，用一塊影子代替投影）
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 18), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.scale.set(1, 0.55, 1); g.add(sh); g.userData.shadow = sh;
  return g;
}
