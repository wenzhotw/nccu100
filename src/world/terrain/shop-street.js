/**
 * 指南路對面的商店街：側門對面的麥當勞（遊戲裡掛「漢堡」高招牌的那間），
 * 往西一路排到八方雲集的店面，麥當勞東邊多一間老街商行。
 *
 * 依 Wenzel 提供的街景研究模型（7 張實拍照片重建、比例為估計）改寫成遊戲的卡通風格：
 * - 一律四層樓左右的透天店面，每間面寬約 5.9 公尺，一樓是騎樓（可以走進去）
 * - 騎樓上方橫式招牌、二三樓窗戶、冷氣室外機與鐵窗，牆邊掛直式招牌
 * - 麥當勞是深灰色立面、沒有鐵窗；高招牌沿用 back-road.js 原本那支「漢堡」
 * - 騎樓前停一排機車
 *
 * 店名順序（由西到東，也就是 x 由大到小）：八方雲集、菁英食堂自助餐、富士數位影像、
 * 高點網路學院、政大牛肉麵、清心福全、50嵐、J Plus 髮型、四川飯館、麥當勞、老街商行。
 * 方位依 Google 地圖：八方雲集在麥當勞西邊，兩家都在指南路北側（校園對面）。
 * 尺寸、間距、照片沒拍到的地方都是估計。
 */
import * as THREE from 'three';
import { basic, block, canvasTex, flat, mk, plane, toon } from '../../render/kit.js';
import { addWalkArea, boxC } from '../../core/collision.js';
import { asPrefab } from '../prefabs/index.js';

const FRONT = 42;            // 騎樓外緣（面向指南路的那條線）
const W = 5.9;               // 每間面寬
const MCD_X = 91.5;          // 麥當勞中心（對齊原本的漢堡店）
const SHOPS = [              // [店名, 招牌底色, 字色]，由西到東（照片從八方雲集往麥當勞看）
  ['八方雲集', '#d4b956', '#292f2b'],
  ['菁英食堂自助餐', '#9b6545', '#fff3df'],
  ['富士數位影像', '#39766a', '#faf0cc'],
  ['高點網路學院', '#a43e3e', '#fff6de'],
  ['政大牛肉麵', '#8f303d', '#fff3d8'],
  ['清心福全', '#275543', '#f1ecd2'],
  ['50嵐', '#dfc83b', '#185d96'],
  ['J Plus 髮型', '#b34151', '#fff5e5'],
  ['四川飯館', '#c48972', '#fff0ce'],
  ['麥當勞', '#2c3236', '#f5bf29'],
  ['老街商行', '#81958b', '#faf2d8'],
];
const MCD = SHOPS.findIndex(s => s[0] === '麥當勞');
// 遊戲裡 x 越大越往西（從校門面向四維堂是面朝南，右手邊是西），八方雲集在麥當勞西邊，所以排在 x 大的那頭
const shopX = i => MCD_X - (i - MCD) * W;
const X0 = shopX(SHOPS.length - 1) - W / 2, X1 = shopX(0) + W / 2;

const WALLS = ['#e3d9c4', '#cfe0d6', '#f0dcc4', '#d6dde6'];   // 明亮一點的外牆，配合卡通風
const FONT = '"Noto Sans TC",sans-serif';

/* ---------- 地面：人行道延伸到騎樓 ---------- */
flat(X1 - X0, FRONT - 36, '#cfc8b8', (X0 + X1) / 2, 0.015, (36 + FRONT) / 2);
flat(X1 - X0, 5.5, '#bdb4a2', (X0 + X1) / 2, 0.016, FRONT + 2.75);   // 騎樓地磚
for (let x = X0; x <= X1; x += 1.5) flat(0.04, 5.5, '#a89f8e', x, 0.018, FRONT + 2.75);
flat(X1 - X0, 0.2, '#c8413a', (X0 + X1) / 2, 0.03, 36.1);   // 照片裡人行道邊的紅線

/* ---------- 招牌貼圖 ---------- */
function hSign(text, bg, fg) {
  return basic({ map: canvasTex(512, 96, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 64px ${FONT}`; g.fillText(text, w / 2, h / 2 + 3, w - 40);
  }) });
}
function vSign(text, bg, fg, border) {
  const chars = [...text.replace(/ /g, '')];
  return basic({ side: THREE.DoubleSide, map: canvasTex(96, 384, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (border) { g.fillStyle = border; g.fillRect(0, 0, w, h); g.fillStyle = bg; g.fillRect(10, 10, w - 20, h - 20); }
    else { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const step = (h - 24) / chars.length;
    g.font = `900 ${Math.min(70, step * 0.85) | 0}px ${FONT}`;
    chars.forEach((c, i) => g.fillText(c, w / 2, 12 + step * (i + 0.5)));
  }) });
}

/* ---------- 照片裡的店：八方雲集到政大牛肉麵（2026 年 10 月實拍） ---------- */
// 正面平貼在牆上的直式大招牌（面向馬路）
function frontV(text, x, y, z, w, h, bg, fg, border) {
  block(x, y, z + 0.1, w + 0.16, h + 0.16, 0.2, border || '#efe8d8', 0.02);
  plane(w, h, vSign(text, bg, fg, border), x, y, z - 0.01, 0, Math.PI);
}
// 側面伸出去、跟馬路垂直的直式招牌
function sideV(text, x, y, z, w, h, bg, fg, border) {
  block(x, y, z, 0.1, h + 0.12, w + 0.12, border || '#efe8d8', 0.02);
  plane(w, h, vSign(text, bg, fg, border), x, y, z, 0, Math.PI / 2);
}
// 招牌後面、頂樓上的鐵架
function steelFrame(x, z, y0, y1, w) {
  [-w / 2, w / 2].forEach(dx => block(x + dx, (y0 + y1) / 2, z, 0.08, y1 - y0, 0.08, '#4a4f52', 0));
  for (let y = y0 + 0.6; y < y1; y += 1.2) {
    block(x, y, z, w, 0.06, 0.06, '#4a4f52', 0);
    const d = block(x, y + 0.6, z, Math.hypot(w, 1.2), 0.05, 0.05, '#4a4f52', 0); d.rotation.z = Math.atan2(1.2, w) * (y % 2.4 < 1.2 ? 1 : -1);
  }
}
const STEEL_TANK = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14);
function tanks(x, y, z, n) { for (let k = 0; k < n; k++) mk(STEEL_TANK, toon('#d5dade'), x + (k - (n - 1) / 2) * 1.25, y + 0.55, z, { out: 0.02 }); }

const LOOK = {
  // 四層樓加鐵皮斜屋頂；正面一塊紅框黃底的超大直招牌，一樓是紅框黃底的店招
  '八方雲集': { h: 13.5, wall: '#9a9d97', gable: true, ownFront: true, draw(x, h, Z) {
    block(x + 0.6, 9, Z(0.03), 3.4, 6, 0.06, '#7fa6a2', 0);                       // 中段綠色磁磚
    frontV('八方雲集', x - 1.5, 8.6, Z(0.62), 1.7, 6.4, '#f4d23c', '#2a2420', '#d8473b');
    block(x, 3.7, Z(0.3), W + 0.1, 1.5, 0.5, '#d8473b', 0.02);                    // 一樓紅色大招牌框
    plane(W - 0.6, 1.1, hSign('八方雲集', '#f4d23c', '#2a2420'), x, 3.85, Z(0.56), 0, Math.PI);
    plane(W - 0.6, 0.28, hSign('鍋貼水餃專賣店', '#d8473b', '#fff4dc'), x, 3.08, Z(0.56), 0, Math.PI);
    // 斜屋頂（鐵皮）
    [-1, 1].forEach(s => { const r = block(x, h + 0.75, Z(-3) + s * 1.55, W + 0.3, 0.12, 3.4, '#7b8287', 0.02); r.rotation.x = s * 0.42; });
    // 左側外掛逃生梯鐵架
    steelFrame(x + W / 2 - 0.15, Z(0.25), 3.4, h, 0.5);
  } },
  // 橘黃色柱子；很高的直招牌架在鐵架上、超出屋頂；一樓米色招牌加綠色雨遮
  '菁英食堂自助餐': { h: 12, wall: '#ddd3bd', ownFront: true, draw(x, h, Z) {
    [-W / 2 + 0.35, W / 2 - 0.35].forEach(dx => block(x + dx, 7.5, Z(0.08), 0.45, 9, 0.2, '#e3a42c', 0.02));
    steelFrame(x, Z(-0.4), h, h + 3.5, 2.2);
    frontV('菁英食堂自助餐', x, h + 0.6, Z(0.5), 1.6, 7.6, '#3a3434', '#fff4e6', '#7a7268');
    block(x + 0.9, 5.4, Z(0.3), 2.6, 1.3, 0.2, '#e3a42c', 0.02);
    plane(2.4, 1.1, hSign('菁英 便當', '#f1e7d6', '#7a3b2a'), x + 0.9, 5.4, Z(0.41), 0, Math.PI);
    block(x, 3.75, Z(0.05), W - 0.2, 0.92, 0.16, '#efe8d8', 0.02);
    plane(W - 0.34, 0.8, hSign('菁英 食堂自助餐', '#f1e1c8', '#8a3a2e'), x, 3.75, Z(0.14), 0, Math.PI);
    const aw = block(x, 2.6, Z(0.7), W - 0.6, 0.08, 1.2, '#2f6b45', 0.02); aw.rotation.x = -0.35;   // 綠色雨遮
    tanks(x - 1.2, h + 0.3, Z(-3), 1);
  } },
  // 最高的綠色直招牌（頂端白色），下面接「影林專業攝影」；紅白橫幅「數位函授課程」
  '富士數位影像': { h: 10.5, wall: '#c8c6bc', ownFront: true, draw(x, h, Z) {
    steelFrame(x - 1.6, Z(-0.3), h, h + 4.5, 1.6);
    frontV('富士數位影像', x - 1.6, h + 0.2, Z(0.6), 1.4, 7.4, '#2f7d4f', '#ffffff', '#f1efe6');
    frontV('影林專業攝影', x - 1.6, 5.7, Z(0.65), 1.2, 2.7, '#2f7d4f', '#ffffff', '#f1efe6');
    block(x + 1, 9.5, Z(0.6), 3.6, 1.5, 0.15, '#efe8d8', 0.02);
    plane(3.4, 1.3, hSign('數位函授課程', '#d6383a', '#ffffff'), x + 1, 9.5, Z(0.69), 0, Math.PI);
    block(x, 3.75, Z(0.05), W - 0.2, 0.92, 0.16, '#efe8d8', 0.02);
    plane(W - 0.34, 0.8, hSign('富士數位影像', '#2f7d4f', '#ffffff'), x, 3.75, Z(0.14), 0, Math.PI);
    tanks(x + 1, h + 0.3, Z(-3.2), 2);
  } },
  // 紅底白字的高直招牌；旁邊一塊白底藍字「幸福」髮廊直招牌
  '高點網路學院': { h: 10.5, wall: '#b9beb6', draw(x, h, Z) {
    steelFrame(x - 1.2, Z(-0.3), h - 1, h + 2.2, 1.5);
    frontV('高點網路學院', x - 1.2, h - 0.8, Z(0.6), 1.5, 6.6, '#d23a3c', '#ffffff', '#f1efe6');
    sideV('幸福', x + W / 2 - 0.3, 6, Z(0.9), 1, 3.2, '#f4f6f8', '#5b8ed6', '#d9dde2');
    tanks(x + 1.4, h + 0.3, Z(-3.2), 1);
  } },
  '政大牛肉麵': { h: 10.5, wall: '#c3bfb1', draw(x, h, Z) {
    sideV('政大原汁牛肉麵', x - W / 2 + 0.35, 7.6, Z(0.85), 1.1, 5, '#d23a3c', '#ffffff', '#f1efe6');
  } },
};

/* ---------- 一間店 ---------- */
const TANK = new THREE.CylinderGeometry(0.65, 0.65, 1.2, 12);
const FAN = new THREE.TorusGeometry(0.22, 0.03, 5, 16);

function shop(i, [name, bg, fg]) {
  const x = shopX(i), mcd = name === '麥當勞';
  const st = LOOK[name] || {};
  const h = st.h || (i % 4 === 0 ? 12.5 : 10.5);
  const wall = st.wall || (mcd ? '#3c4246' : WALLS[i % 4]);
  const Z = dz => FRONT - dz;   // dz：從騎樓外緣往店裡的深度

  // 二樓以上的樓身（懸在騎樓上方）、屋頂女兒牆
  block(x, (h + 3) / 2, Z(-3), W - 0.04, h - 3, 6, wall, 0.03);
  block(x, h + 0.15, Z(-3), W + 0.1, 0.3, 6.2, mcd ? '#2a2f33' : '#8d9a8f', 0.02);
  // 騎樓：天花板、兩根柱子、店面玻璃與門
  block(x, 3.05, Z(-2.75), W - 0.04, 0.3, 5.5, '#efe9dc', 0);
  [-W / 2 + 0.2, W / 2 - 0.2].forEach(dx => {
    block(x + dx, 1.5, Z(-0.2), 0.36, 3, 0.4, mcd ? '#4a5055' : '#ece6d6', 0.02);
    boxC(x + dx - 0.2, x + dx + 0.2, FRONT, FRONT + 0.4);
  });
  block(x, 1.5, Z(-5.6), W - 0.04, 3, 0.8, wall, 0.02);                                // 店裡的後牆
  block(x, 1.4, Z(-5.15), W - 0.9, 2.5, 0.1, mcd ? '#f6d679' : '#7fa7b0', 0);           // 玻璃（麥當勞裡面亮黃燈）
  block(x - 0.9, 1.15, Z(-5.1), 1.1, 2.1, 0.1, '#5c6a70', 0);                           // 門
  // 雨遮與橫式招牌
  block(x, 3.25, Z(0.55), W - 0.04, 0.12, 1.3, '#6d7a70', 0.02);
  block(x, 3.75, Z(0.05), W - 0.2, 0.92, 0.16, '#efe8d8', 0.02);
  if (!st.ownFront) plane(W - 0.34, 0.8, hSign(name, bg, fg), x, 3.75, Z(0.14), 0, Math.PI);
  // 二、三樓窗戶（麥當勞是大片玻璃、沒有鐵窗和冷氣）
  for (let f = 0; f < 2; f++) {
    const y = 5.5 + f * 3;
    for (let k = -1; k <= 1; k++) {
      block(x + k * 1.8, y, Z(0.02), 1.55, 2.1, 0.1, mcd ? '#23282b' : '#56625f', 0);
      block(x + k * 1.8, y, Z(0.06), 1.36, 1.9, 0.06, mcd ? '#a8c8cc' : '#8fb0b4', 0);
      block(x + k * 1.8, y, Z(0.1), 0.05, 1.9, 0.04, '#f2efe4', 0);
    }
    if (!mcd) {
      for (let v = 0; v < 12; v++) block(x - 2.55 + v * 0.46, y, Z(0.48), 0.04, 2.2, 0.05, '#a7b3aa', 0);   // 鐵窗
      block(x, y - 0.75, Z(0.48), 5.4, 0.06, 0.6, '#9aa69c', 0);
      block(x + 1.7, y - 0.72, Z(0.45), 1.1, 0.65, 0.55, '#e7e4d8', 0.02);                               // 冷氣室外機
      mk(FAN, toon('#6c7671'), x + 1.7, y - 0.72, Z(0.74), { cast: false });
    }
  }
  // 直式招牌（麥當勞沒有；照片裡有特別招牌的店改由 LOOK 畫）
  if (!mcd && !st.draw) {
    const sx = x - W / 2 + 0.35;
    plane(1.3, 5.2, vSign(name, bg, fg), sx, 7.3, Z(0.75), 0, Math.PI / 2);
    block(sx, 7.3, Z(0.75), 0.08, 5.3, 1.4, '#efe8d8', 0);
    [4.6, 10].forEach(y => block(sx, y, Z(0.4), 0.08, 0.08, 1.3, '#58605a', 0));
  }
  // 頂樓加蓋與水塔
  if (st.draw) st.draw(x, h, Z);
  if (i % 3 === 0 && !st.gable) {
    block(x, h + 0.75, Z(-3.3), W - 0.2, 0.12, 5.2, '#7e8a80', 0.02);
    [-W / 2 + 0.2, W / 2 - 0.2].forEach(dx => block(x + dx, h + 0.45, Z(-0.9), 0.1, 0.6, 0.1, '#6b736c', 0));
    mk(TANK, toon('#c2cdc5'), x + 1, h + 0.95, Z(-4.2), { out: 0.02 });
  }
  boxC(x - W / 2, x + W / 2, FRONT + 5.2, FRONT + 6);
}
SHOPS.forEach((s, i) => shop(i, s));
// 可以過馬路走進商店街：這段 x 範圍放寬戶外南界，兩端用看不見的牆擋住（從馬路中間開始，車道不受影響）
addWalkArea(X0, X1, FRONT + 5);
boxC(X0 - 0.3, X0, 30, FRONT + 6); boxC(X1, X1 + 0.3, 30, FRONT + 6);

/* ---------- 騎樓前的機車（工具箱） ---------- */
const WHEEL = new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10);
const BIKE = ['#e9eef2', '#d6463a', '#f0c94a', '#5b8ed6', '#9fd6c2', '#2c2f38'];
for (let x = X0 + 2; x < X1 - 2; x += 1.4) {
  if (Math.round((x - X0) / 1.4) % 4 === 3) continue;   // 每停三台空一格，方便走進騎樓
  if (Math.abs(x - 95) < 1.2) continue;   // 漢堡高招牌的柱子
  const c = BIKE[Math.abs(Math.round(x * 7)) % BIKE.length];
  asPrefab(() => {
    block(x, 0.52, FRONT - 1, 0.42, 0.5, 1.3, c, 0.02);
    block(x, 0.83, FRONT - 1.2, 0.36, 0.1, 0.6, '#2d2b33', 0);
    block(x, 1.05, FRONT - 0.45, 0.6, 0.06, 0.06, '#3a3d45', 0);
    [-0.5, 0.55].forEach(dz => { const w = mk(WHEEL, toon('#26242c'), x, 0.22, FRONT - 1 - dz, { cast: false }); w.rotation.z = Math.PI / 2; });
  });
  boxC(x - 0.3, x + 0.3, FRONT - 1.75, FRONT - 0.3);   // 一台一台登記，中間空隙可以走進騎樓
}

export { X0 as SHOP_STREET_X0, X1 as SHOP_STREET_X1, FRONT as SHOP_STREET_FRONT };
