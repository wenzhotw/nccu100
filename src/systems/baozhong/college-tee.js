// src/systems/baozhong/college-tee.js（Claude，依 Wenzel 2026-10-22 指示）：友校交流大使的美式大學 T 恤。
// 胸前一塊貼著軀幹前半圈的弧面，印拱形校名縮寫（大學 T 常見的 varsity 拱字）、中文簡稱，北藝大另印校牛。
// 顏色與縮寫都來自 baozhong-programs.json 的 tee 欄位（附來源）；袖子跟著 look.top 換成同色。
// 美術依 docs/art-style.md：toon() 平塗、canvasTex() 畫字、Noto Sans TC 900；印花貼在衣服上，不加描邊。
import * as THREE from 'three';

// NPC 軀幹是半徑 0.18 的膠囊（y 0.52，z 方向壓成 0.85），印花弧面略大一點包在前半圈。
export const PRINT = Object.freeze({ R: 0.184, H: 0.22, Y: 0.545, ARC: 2.1, ZS: 0.85 });
const GEO = new THREE.CylinderGeometry(PRINT.R, PRINT.R, PRINT.H, 20, 1, true, -PRINT.ARC / 2, PRINT.ARC);
const COLLAR = new THREE.TorusGeometry(0.105, 0.016, 6, 18);
const FONT = '"Noto Sans TC", sans-serif';

/** 拱形字：每個字母沿著圓弧排，字底朝圓心。 */
function archText(g, text, cx, cy, radius, spread, size, fill, stroke) {
  const chars = [...text], step = chars.length > 1 ? spread / (chars.length - 1) : 0;
  g.font = `900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  chars.forEach((ch, i) => {
    const a = -spread / 2 + i * step;
    g.save(); g.translate(cx + Math.sin(a) * radius, cy - Math.cos(a) * radius); g.rotate(a);
    g.strokeStyle = stroke; g.lineWidth = size * 0.16; g.strokeText(ch, 0, 0);
    g.fillStyle = fill; g.fillText(ch, 0, 0);
    g.restore();
  });
}
/** 簡單的水牛頭：寬彎角、橢圓臉、兩個鼻孔。 */
function buffalo(g, cx, cy, s, ink) {
  g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round';
  g.lineWidth = s * 0.16;
  g.beginPath(); g.moveTo(cx - s * 0.25, cy - s * 0.2); g.quadraticCurveTo(cx - s * 0.9, cy - s * 0.35, cx - s * 0.75, cy - s * 0.75); g.stroke();
  g.beginPath(); g.moveTo(cx + s * 0.25, cy - s * 0.2); g.quadraticCurveTo(cx + s * 0.9, cy - s * 0.35, cx + s * 0.75, cy - s * 0.75); g.stroke();
  g.beginPath(); g.ellipse(cx, cy + s * 0.05, s * 0.32, s * 0.4, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx - s * 0.42, cy - s * 0.12, s * 0.14, s * 0.07, -0.4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx + s * 0.42, cy - s * 0.12, s * 0.14, s * 0.07, 0.4, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff8ec';
  g.beginPath(); g.arc(cx - s * 0.11, cy + s * 0.27, s * 0.05, 0, Math.PI * 2); g.arc(cx + s * 0.11, cy + s * 0.27, s * 0.05, 0, Math.PI * 2); g.fill();
}

/** 畫一件 T 恤的胸前印花（純 canvas 指令，測試可用假 context 檢查寫了哪些字）。 */
export function paintTee(g, w, h, tee) {
  g.fillStyle = tee.color; g.fillRect(0, 0, w, h);
  const icon = tee.icon === 'buffalo';
  // 字用全遊戲統一的描邊色 #2a2c4a 包邊，遠看也清楚（美式大學 T 的雙色拱字）。
  archText(g, tee.abbr, w / 2, h * (icon ? 1.08 : 1.25), h * (icon ? 0.86 : 0.98), tee.abbr.length > 3 ? 0.7 : 0.52, icon ? 104 : 128, tee.ink, '#2a2c4a');
  if (icon) buffalo(g, w / 2, h * 0.62, 50, tee.ink);
  g.font = `900 ${icon ? 38 : 50}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.strokeStyle = '#2a2c4a'; g.lineWidth = 8; g.strokeText(tee.sub, w / 2, h * (icon ? 0.88 : 0.82));
  g.fillStyle = tee.ink; g.fillText(tee.sub, w / 2, h * (icon ? 0.88 : 0.82));
}

/** 幫一位 NPC 穿上 T 恤；回傳要釋放的貼圖與材質。 */
export function mountCollegeTee(n, tee, { toon, canvasTex }) {
  const tex = canvasTex(512, 288, (g, w, h) => paintTee(g, w, h, tee));
  const mat = toon('#ffffff', { map: tex });
  const print = new THREE.Mesh(GEO, mat);
  print.name = `bz26-tee-${n.id}`; print.position.set(0, PRINT.Y, 0); print.scale.z = PRINT.ZS; print.userData.noOcc = true;
  n.rig.add(print);
  // 羅紋圓領：大學 T 的領口常用輔色。
  const collar = new THREE.Mesh(COLLAR, toon(tee.trim === tee.color ? tee.ink : tee.trim));
  collar.name = `bz26-tee-collar-${n.id}`; collar.rotation.x = Math.PI / 2; collar.position.set(0, 0.745, 0.005); collar.scale.y = 0.85;
  n.rig.add(collar);
  n.g.userData.bz26Tee = { abbr: tee.abbr, sub: tee.sub, color: tee.color };
  return { print, collar };   // 材質由 toon() 快取共用，不在這裡釋放
}
