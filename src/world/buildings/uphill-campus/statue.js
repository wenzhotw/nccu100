/**
 * 蔣公騎馬銅像（純模型，不碰引擎，可在 Node 測試）。
 *
 * 使用者的照片沒有拍到銅像本體，依公開報導復原：
 * - 1987 年政大創校六十週年校慶完工，是各級學校中唯一一座騎馬的蔣中正像，含基座約三到四層樓高；
 * - 2019 年 2 月馬的左前腳（懸空的那一隻）被鋸斷，修復後校友捐建雙層玻璃護欄圍住銅像。
 * 報導沒有寫到的部分用合理設計補上：軍裝、軍帽、往後飄的披風、雙手握韁、灰色花崗石基座與正面銅牌。
 * 銅牌真正的銘文查不到，牌上只寫報導查得到的事實（名稱與完工年份），不是實際銘文。
 *
 * 座標：整座像的局部 +x 是馬頭方向，右手邊是 +z；遊戲高度約實際的四分之三。
 */
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHORS } from './layout.js';

/** top：基座頂高度；glass：玻璃護欄半寬（局部 x、z），四角要留在綠籬圓環內緣（1.9 公尺）以內。 */
export const STATUE = {
  top: 4.4,
  plinth: [2.5, 0.35, 1.9], body: [2.2, 3.7, 1.55], cap: [2.4, 0.35, 1.75],
  glass: { hx: 1.45, hz: 1.12, h: 2.6, gap: 0.12 },
  plaque: '蔣公騎馬銅像　民國七十六年政大創校六十週年',
};
const a = ANCHORS['蔣公銅像'], s = ANCHORS['好漢坡站'];
/** 面向好漢坡站（環山一道往山下的方向）。 */
export const STATUE_YAW = Math.atan2(-(s.z - a.z), s.x - a.x);

const T = STATUE.top;
const v = (x, y, z) => new THREE.Vector3(x, y, z);

/** 兩點之間的圓柱（四肢、脖子、韁繩），r0 在起點、r1 在終點。 */
function limb(p, q, r0, r1 = r0, seg = 8) {
  const d = q.clone().sub(p), g = new THREE.CylinderGeometry(r1, r0, d.length(), seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), d.clone().normalize()));
  return g.translate((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
}
/** 沿 x 軸躺著的膠囊（馬身、馬頭）。 */
function capsule(r, len, x, y, z, tilt = 0) {
  return new THREE.CapsuleGeometry(r, len, 4, 10).rotateZ(Math.PI / 2 + tilt).translate(x, y, z);
}
const ball = (r, x, y, z) => new THREE.SphereGeometry(r, 10, 8).translate(x, y, z);

/**
 * 騎馬像的零件清單：每項 { name, geo }；四條腿另外標 leg（左前、右前、左後、右後）、
 * lifted（是否懸空）與 hoofY（蹄底高度），測試用來確認姿勢。
 */
export function statueParts() {
  const parts = [], add = (name, geo, extra = {}) => parts.push({ name, geo, ...extra });
  // 馬身與胸、臀。
  const bodyY = T + 1.42;
  add('馬身', capsule(0.44, 1.35, 0, bodyY, 0, -0.05));
  add('馬胸', ball(0.42, 0.72, bodyY + 0.05, 0));
  add('馬臀', ball(0.45, -0.7, bodyY - 0.02, 0));
  // 四條腿：左邊是 -z。左前腳懸空、膝蓋往前彎，其他三隻踩在基座頂。
  const legs = [
    ['左前', 0.68, -0.2, true], ['右前', 0.68, 0.2, false], ['左後', -0.7, -0.22, false], ['右後', -0.7, 0.22, false],
  ];
  for (const [leg, x, z, lifted] of legs) {
    const hip = v(x, bodyY - 0.25, z);
    const knee = lifted ? v(x + 0.42, T + 0.98, z) : v(x + (x > 0 ? 0.04 : -0.06), T + 0.55, z);
    const hoof = lifted ? v(x + 0.3, T + 0.62, z) : v(x + (x > 0 ? 0.02 : 0.06), T + 0.08, z);
    add(`${leg}腿上段`, limb(hip, knee, 0.15, 0.09));
    add(`${leg}腿下段`, limb(knee, hoof, 0.085, 0.075));
    const hoofGeo = new THREE.CylinderGeometry(0.1, 0.11, 0.1, 8).translate(hoof.x, hoof.y - 0.03, hoof.z);
    add(`${leg}蹄`, hoofGeo, { leg, lifted, hoofY: hoof.y - 0.08 });
  }
  // 脖子往前上方昂起，馬頭微低、往前看。
  const neck0 = v(0.85, bodyY + 0.2, 0), neck1 = v(1.28, bodyY + 0.95, 0);
  add('馬脖子', limb(neck0, neck1, 0.3, 0.2));
  add('馬鬃', limb(v(0.7, bodyY + 0.42, 0), v(1.18, bodyY + 1.1, 0), 0.07, 0.05).scale(1, 1, 1));
  // 馬頭從頭頂往前下方斜，口鼻收細。
  add('馬頭', capsule(0.14, 0.36, 1.42, bodyY + 0.9, 0, -0.75));
  add('口鼻', ball(0.1, 1.6, bodyY + 0.7, 0));
  for (const z of [-0.08, 0.08]) add('馬耳', new THREE.ConeGeometry(0.045, 0.16, 6).rotateZ(0.25).translate(1.24, bodyY + 1.18, z));
  add('馬尾', limb(v(-1.05, bodyY + 0.12, 0), v(-1.42, T + 0.7, 0.05), 0.07, 0.12));
  // 馬鞍。
  add('馬鞍', new THREE.BoxGeometry(0.6, 0.12, 0.92).translate(0.02, bodyY + 0.42, 0));
  // 騎士：軍裝上身、腰帶、頭與軍帽。
  const seat = bodyY + 0.5;
  add('騎士上身', new THREE.CapsuleGeometry(0.2, 0.38, 4, 10).translate(0.0, seat + 0.42, 0));
  add('腰帶', new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10).translate(0.0, seat + 0.2, 0));
  add('頭', ball(0.14, 0.03, seat + 0.96, 0));
  add('軍帽', new THREE.CylinderGeometry(0.17, 0.14, 0.12, 12).translate(0.03, seat + 1.1, 0));
  add('帽簷', new THREE.CylinderGeometry(0.1, 0.1, 0.02, 10, 1, false, -Math.PI / 2, Math.PI).translate(0.13, seat + 1.04, 0));
  // 雙腿夾在馬身兩側，長靴踩馬鐙。
  for (const z of [-1, 1]) {
    const hip = v(0.02, seat + 0.08, z * 0.18), knee = v(0.3, seat - 0.22, z * 0.42), foot = v(0.22, seat - 0.68, z * 0.44);
    add('大腿', limb(hip, knee, 0.1, 0.09));
    add('長靴', limb(knee, foot, 0.08, 0.075));
    // 雙手往前握韁，韁繩接到馬嘴。
    const shoulder = v(0.02, seat + 0.66, z * 0.24), hand = v(0.42, seat + 0.32, z * 0.16);
    add('手臂', limb(shoulder, hand, 0.075, 0.06));
    add('韁繩', limb(hand, v(1.58, bodyY + 0.74, z * 0.1), 0.018));
  }
  // 披風：從肩膀往後下方飄起的半圓錐。
  const cape = new THREE.CylinderGeometry(0.24, 0.48, 1.05, 12, 1, true, Math.PI / 2, Math.PI)
    .rotateZ(0.42).translate(-0.24, seat + 0.36, 0);
  add('披風', cape);
  return parts;
}

/** 往法線方向撐出去一點的背面殼，畫成卡通黑邊。 */
function shell(geo, t) {
  const g = geo.clone(), p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * t, p.getY(i) + n.getY(i) * t, p.getZ(i) + n.getZ(i) * t);
  return g;
}
const merge = list => mergeBufferGeometries(list.map(g => {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
  return n;
}));

const OUTLINE = new THREE.MeshBasicMaterial({ color: '#2a2c4a', side: THREE.BackSide });
const box = (w, h, d, y) => new THREE.BoxGeometry(w, h, d).translate(0, y, 0);

/**
 * 建立銅像群組（原點在錨點地面、已轉向）：花崗石基座、騎馬像、銅牌、雙層玻璃護欄。
 * 材質用 MeshToonMaterial，接進場景時由 map.js 補上卡通光階。
 */
export function createStatue() {
  const g = new THREE.Group(); g.name = '蔣公騎馬銅像'; g.rotation.y = STATUE_YAW;
  const [pw, ph, pd] = STATUE.plinth, [bw, bh, bd] = STATUE.body, [cw, chh, cd] = STATUE.cap;
  // 基座：底座、主體、壓頂；主體上下各一道細線腳。
  const baseGeo = merge([box(pw, ph, pd, ph / 2), box(bw, bh, bd, ph + bh / 2), box(cw, chh, cd, T - chh / 2),
    box(bw + 0.08, 0.08, bd + 0.08, ph + 0.18), box(bw + 0.08, 0.08, bd + 0.08, T - chh - 0.1)]);
  const base = new THREE.Mesh(baseGeo, new THREE.MeshToonMaterial({ color: '#8f8b85' }));
  base.name = '花崗石基座'; g.add(base);
  const baseLine = new THREE.Mesh(baseGeo, OUTLINE); baseLine.scale.set(1 + 0.08 / cw, 1 + 0.04 / T, 1 + 0.08 / cd);
  baseLine.name = '基座描邊'; base.add(baseLine);
  // 騎馬像：所有銅件合成一個網格，披風是單面所以雙面繪製。
  const riderGeo = merge(statueParts().map(p => p.geo));
  const rider = new THREE.Mesh(riderGeo, new THREE.MeshToonMaterial({ color: '#5a5138', side: THREE.DoubleSide }));
  rider.name = '騎馬像'; g.add(rider);
  const riderLine = new THREE.Mesh(shell(riderGeo, 0.025), OUTLINE); riderLine.name = '騎馬像描邊'; rider.add(riderLine);
  // 正面銅牌（貼圖文字由 map.js 畫上）。
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.62), new THREE.MeshToonMaterial({ color: '#a88a52' }));
  plaque.rotation.y = Math.PI / 2; plaque.position.set(bw / 2 + 0.012, ph + bh * 0.62, 0);
  plaque.name = '銅牌'; plaque.userData.text = STATUE.plaque; g.add(plaque);
  // 雙層玻璃護欄：四面玻璃加細金屬立柱與頂框，兩層之間隔 gap。
  const { hx, hz, h, gap } = STATUE.glass, panes = [], frames = [];
  for (const k of [0, 1]) {
    const x = hx - k * gap, z = hz - k * gap;
    panes.push(box(2 * x, h, 0.03, h / 2).translate(0, 0, z), box(2 * x, h, 0.03, h / 2).translate(0, 0, -z),
      box(0.03, h, 2 * z, h / 2).translate(x, 0, 0), box(0.03, h, 2 * z, h / 2).translate(-x, 0, 0));
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) frames.push(box(0.07, h + 0.05, 0.07, (h + 0.05) / 2).translate(sx * hx, 0, sz * hz));
  frames.push(box(2 * hx + 0.07, 0.06, 0.07, h).translate(0, 0, hz), box(2 * hx + 0.07, 0.06, 0.07, h).translate(0, 0, -hz),
    box(0.07, 0.06, 2 * hz + 0.07, h).translate(hx, 0, 0), box(0.07, 0.06, 2 * hz + 0.07, h).translate(-hx, 0, 0));
  const glass = new THREE.Mesh(merge(panes), new THREE.MeshToonMaterial({ color: '#d4eef4', transparent: true, opacity: 0.28, depthWrite: false }));
  glass.name = '玻璃護欄'; glass.userData.layers = 2; glass.renderOrder = 2; g.add(glass);
  const frame = new THREE.Mesh(merge(frames), new THREE.MeshToonMaterial({ color: '#9aa3a8' }));
  frame.name = '護欄框'; g.add(frame);
  return g;
}

/** 碰撞：玻璃護欄外框一個轉向的方塊（世界座標，th 與 obbC 同義）。 */
export function statueCollider() {
  return { landmark: '蔣公銅像', cx: a.x, cz: a.z, hx: STATUE.glass.hx + 0.05, hz: STATUE.glass.hz + 0.05, th: STATUE_YAW };
}
