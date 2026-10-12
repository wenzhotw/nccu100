/**
 * 樂活館獨立外觀模型。白色長棟、紅藍米色凸框、偏高西端及正門側玻璃低翼。
 * 依四張外觀照片簡化成純色卡通幾何，未知背面、屋頂與進深採保守推估。
 * 紅磚門房屬於既有正門，不在本模型重建；不製作照片沒有提供的室內。
 */
import * as THREE from 'three';
import { LOHAS } from './layout.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const C = {
  white: '#edeee7', roof: '#d8dfd8', base: '#bcc5be', cream: '#d9d5b9',
  red: '#db5553', blue: '#4d9fae', glass: '#536b76', glassLight: '#91b4bc',
  wingGlass: '#588b89', wingLight: '#82b7ac', dark: '#35494b', frame: '#c8cec4',
  step: '#c7ccc1', stepEdge: '#e7c868', heart: '#e74551', plinth: '#61b7a9',
};

function texture(w, h, draw) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const render = () => { const g = canvas.getContext('2d'); g.clearRect(0, 0, w, h); draw(g, w, h); };
  render();
  const t = new THREE.CanvasTexture(canvas); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  t.redraw = () => { render(); t.needsUpdate = true; };
  return t;
}

function signTexture() {
  return texture(192, 512, g => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '900 144px "Noto Sans TC","Noto Sans CJK TC",sans-serif'; g.fillStyle = C.dark;
    ['樂', '活', '館'].forEach((c, i) => g.fillText(c, 96, 90 + i * 160));
  });
}

export function createLohasHall({ materialFactory = (color, extra) => new THREE.MeshToonMaterial({ color, ...extra }) } = {}) {
  const s = LOHAS;
  const group = new THREE.Group(); group.name = 'lohas-hall';
  group.userData = { name: '樂活館', style: 'game-matched-simplified', frontNormal: { ...s.frontNormal }, inferred: ['rear', 'roof', 'dimensions'], referencePhotoCount: 4 };
  const mat = Object.fromEntries(Object.entries(C).map(([k, c]) => [k, materialFactory(c)]));
  const batches = new Map(); let parts = 0;
  function box(name, x, y, z, w, h, d, m, occluder = false) {
    parts++;
    // 鏡頭避牆會略過實例；主要牆面、樓板、雨棚使用一般 Mesh。
    if (occluder) {
      const o = new THREE.Mesh(BOX, m); o.name = name; o.position.set(x, y, z); o.scale.set(w, h, d);
      o.castShadow = o.receiveShadow = true; group.add(o); return o;
    }
    if (!batches.has(m)) batches.set(m, []);
    batches.get(m).push({ name, x, y, z, w, h, d });
  }
  function face(name, w, h, t, x, y, z, ry) {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    o.name = name; o.position.set(x, y, z); o.rotation.y = ry; group.add(o); return o;
  }
  function frontWindow(x, y, z, color, w = 2.05, h = 1.78) {
    const t = .22, d = .52;
    box('彩窗凹入玻璃', x, y, z - .035, w - .34, h - .32, .055, mat.glass);
    box('玻璃明亮上緣', x, y + h * .24, z - .068, w - .45, .18, .025, mat.glassLight);
    box('窗戶中央簡化框', x, y, z - .079, .065, h - .34, .04, mat.frame);
    [-1, 1].forEach(k => {
      box('彩色凸框橫邊', x, y + k * (h - t) / 2, z - d / 2, w, t, d, color);
      box('彩色凸框直邊', x + k * (w - t) / 2, y, z - d / 2, t, h - t * 2, d, color);
    });
  }

  // 東西向長棟，二樓以上微微挑出；西端較高且前緣錯開。
  box('主棟地面層', -2.25, 1.24, .2, 21.5, 2.48, 9.6, mat.base, true);
  box('白色長棟', -2.25, 7.44, 0, 21.5, 9.92, 10, mat.white, true);
  box('西端入口後牆', 10.75, 1.24, .325, 4.5, 2.48, 9.35, mat.base, true);
  box('西端入口左牆', 8.65, 1.24, -4.95, .3, 2.48, 1.2, mat.white, true);
  box('西端入口右牆', 12.85, 1.24, -4.95, .3, 2.48, 1.2, mat.white, true);
  box('偏高西端白塔', 10.75, 8.99, -.275, 4.5, 13.02, 10.55, mat.white, true);
  box('長棟收邊屋頂', -2.25, 12.47, 0, 21.58, .14, 10.08, mat.roof);
  box('西塔收邊屋頂', 10.75, 15.57, -.275, 4.58, .14, 10.63, mat.roof);
  const colors = [mat.red, mat.blue, mat.cream];
  const pattern = [[0, 2, 1, 0, 2, 0, 1], [1, 0, 2, 1, 0, 2, 2], [2, 1, 0, 2, 1, 2, 1]];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) frontWindow(-11.45 + col * 3.05, 4.35 + row * 3.1, -5.015, colors[pattern[row][col]]);
  [mat.cream, mat.blue, mat.red, mat.blue].forEach((c, i) => frontWindow(10.75, 4.35 + i * 3.1, -5.56, c, 2.25));
  // 一樓連續暗色窗帶比樓上低調，僅保留粗分格。
  box('地面層長窗帶', -2.25, 1.71, -4.63, 21.18, .9, .06, mat.glass);
  for (let x = -12.75; x < 8.4; x += 1.5) box('長窗簡化立框', x, 1.72, -4.70, .09, .98, .10, mat.frame);
  for (let x = -12.85; x < 8.5; x += 3.6) box('一樓細白柱', x, 1.23, -4.84, .24, 2.46, .36, mat.white);
  box('西端玻璃門', 10.75, 1.26, -4.39, 3.82, 2.38, .08, mat.glass);
  [9.53, 10.75, 11.97].forEach(x => box('西端玻璃門分格', x, 1.25, -4.45, .07, 2.42, .08, mat.frame));
  box('西端小雨棚', 10.75, 2.66, -5.05, 4.8, .28, 2.0, mat.dark, true);
  const doorName = texture(512, 128, g => { g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.white; g.font = '700 68px "Noto Sans TC","Noto Sans CJK TC",sans-serif'; g.fillText('樂活館', 256, 64); });
  face('西端入口館名', 1.8, .45, doorName, 10.75, 2.05, -4.498, Math.PI);

  // 低翼向校門伸出：一樓架空柱廊，上層深綠玻璃及寬黑框。
  box('玻璃低翼白色內牆', -14.25, 4.57, 0, 2.5, 9.14, 9.2, mat.white, true);
  box('玻璃低翼上層', -17.9, 6.23, 0, 4.8, 5.06, 9.2, mat.wingGlass, true);
  // 東側樓板與柱略內縮，避開既有樹冠轉動時的黑色描邊。
  box('低翼下緣厚樓板', -17.75, 3.57, 0, 4.62, .30, 9.35, mat.dark, true);
  box('低翼深灰平屋頂', -16.65, 9.12, 0, 7.85, .38, 9.72, mat.dark, true);
  box('低翼屋頂亮邊', -16.65, 9.35, 0, 7.94, .10, 9.80, mat.roof);
  // 玻璃平面上的明亮窄帶，粗框保留在幾何中。
  box('東側玻璃亮帶', -20.318, 7.95, 0, .028, .42, 8.9, mat.wingLight);
  box('南側玻璃亮帶', -17.9, 7.95, -4.62, 4.55, .42, .028, mat.wingLight);
  [-4.48, -2.24, 0, 2.24, 4.48].forEach(z => box('東側玻璃粗立框', -20.26, 6.23, z, .14, 5.06, .14, mat.dark));
  [-20.18, -17.9, -15.62].forEach(x => box('南側玻璃粗立框', x, 6.23, -4.66, .14, 5.06, .14, mat.dark));
  [3.83, 5.02, 7.43, 8.68].forEach(y => {
    box('東側玻璃粗橫框', -20.26, y, 0, .14, .14, 9.12, mat.dark);
    box('南側玻璃粗橫框', -17.9, y, -4.66, 4.9, .14, .14, mat.dark);
  });
  // 轉角突出的黑色大窗盒，是照片低翼的主要辨識物。
  [-1, 1].forEach(k => {
    box('東側黑窗盒橫框', -20.56, 6.18 + k * .78, -2.5, .50, .33, 2.65, mat.dark);
    box('東側黑窗盒直框', -20.56, 6.18, -2.5 + k * 1.16, .50, 1.55, .33, mat.dark);
    box('南側黑窗盒橫框', -18.33, 6.18 + k * .78, -4.89, 2.65, .33, .5, mat.dark);
    box('南側黑窗盒直框', -18.33 + k * 1.16, 6.18, -4.89, .33, 1.55, .5, mat.dark);
  });
  for (const z of s.columnZ) box('柱廊深灰方柱', s.columnX, 2.10, z, .44, 2.76, .44, mat.dark);
  box('柱廊內側玻璃門', -15.535, 1.94, .50, .065, 2.30, 1.9, mat.glass);
  [-.43, .50, 1.43].forEach(z => box('柱廊內側門框', -15.58, 1.94, z, .08, 2.30, .075, mat.frame));
  box('柱廊內側小窗', -15.535, 2.05, -2.25, .065, 1.00, 1.05, mat.glass);
  box('柱廊入口平台', (s.wingLeft + s.arcadeRight) / 2, s.landingHeight / 2, 0, s.arcadeRight - s.wingLeft, s.landingHeight, s.wingBack - s.wingFront, mat.step, true);
  const stepDepth = (s.wingFront - s.stairFront) / s.stairCount;
  for (let i = 0; i < s.stairCount; i++) {
    const h = (i + 1) * s.landingHeight / s.stairCount;
    const z = s.stairFront + (i + .5) * stepDepth;
    box('柱廊入口階梯', (s.wingLeft + s.arcadeRight) / 2, h / 2, z, s.arcadeRight - s.wingLeft, h, stepDepth, mat.step);
    box('階梯黃色前緣', (s.wingLeft + s.arcadeRight) / 2, h - .025, z - stepDepth / 2 - .006, s.arcadeRight - s.wingLeft, .05, .018, mat.stepEdge);
  }
  face('校門側直排館名', .95, 2.72, signTexture(), -13.03, 10.92, -2.9, -Math.PI / 2);
  // 壓縮低翼深度後，將英文放在相鄰白色轉角牆，避免被玻璃翼遮住。
  const englishName = texture(512, 512, g => {
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 96px Arial,sans-serif';
    [['Student', C.blue], ['Club', C.red], ['Center', '#aaa56c']].forEach(([word, color], i) => { g.fillStyle = color; g.fillText(word, 256, 112 + i * 136); });
  });
  face('白牆彩色英文館名', 2.15, 2.15, englishName, -14.23, 6.75, -4.612, Math.PI);

  // 紅色中空愛心及綠色基座，保留簡單輪廓，不加入未辨識的小字。
  const heart = new THREE.Shape();
  const point = (t, scale = 1) => new THREE.Vector2(Math.pow(Math.sin(t), 3) * 16 * .052 * scale, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * .052 * scale);
  for (let i = 0; i <= 48; i++) { const p = point(i / 48 * Math.PI * 2); i ? heart.lineTo(p.x, p.y) : heart.moveTo(p.x, p.y); } heart.closePath();
  const hole = new THREE.Path();
  for (let i = 48; i >= 0; i--) { const p = point(i / 48 * Math.PI * 2, .60); i < 48 ? hole.lineTo(p.x, p.y + .045) : hole.moveTo(p.x, p.y + .045); } hole.closePath(); heart.holes.push(hole);
  const heartMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(heart, { depth: .30, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .028, bevelThickness: .028, curveSegments: 4 }), mat.heart);
  heartMesh.name = '紅色中空愛心'; heartMesh.position.set(s.heartX, 1.97, s.heartZ - .15); heartMesh.castShadow = heartMesh.receiveShadow = true; group.add(heartMesh);
  box('愛心綠色基座', s.heartX, s.landingHeight + .18, s.heartZ, 1.88, .36, .80, mat.plinth, true);

  // 未提供的背面只用大色塊及一條窗帶，不虛構裝飾或設備。
  box('背面簡化窗帶', -2.25, 7.5, 5.025, 19.4, 1.18, .045, mat.glass);
  box('西端簡化側窗', 13.025, 7.5, .2, .045, 1.18, 7.1, mat.glass);
  const transform = new THREE.Object3D();
  for (const [material, pieces] of batches) {
    const batch = new THREE.InstancedMesh(BOX, material, pieces.length); batch.name = '樂活館色塊：' + pieces[0].name; batch.castShadow = batch.receiveShadow = true;
    pieces.forEach((p, i) => { transform.position.set(p.x, p.y, p.z); transform.scale.set(p.w, p.h, p.d); transform.updateMatrix(); batch.setMatrixAt(i, transform.matrix); });
    batch.instanceMatrix.needsUpdate = true; batch.userData.partCount = pieces.length; group.add(batch);
  }
  group.userData.parts = parts; group.userData.drawables = group.children.length;
  return group;
}
