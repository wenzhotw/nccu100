/** 十舍中庭與九舍連接處的配置資料與碰撞，不碰遊戲引擎，可在 Node 測試。 */
import * as THREE from 'three';
import { STAIRS, ZQ10, footprintOf, LAYOUT } from './layout.js';
import { pointInPoly } from './terrain.js';

/** 磚地中庭頂面，UV 以 2.4 公尺一格；放進灰盒供地表射線與 Node 驗收共用。 */
export function deckGeometry() {
  const shape = new THREE.Shape(ZQ10.raised.map(([x, z]) => new THREE.Vector2(x, -z)));
  const top = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, ZQ10.deck, 0);
  const p = top.attributes.position, uv = top.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2.4, p.getZ(i) / 2.4);
  return top;
}

/** 磚地中庭外露的邊：face 是邊下方牆面（店面、磁磚或擋土牆），top 是邊上的欄杆或花台。 */
export const DECK_EDGES = [
  { a: [88, -18.2], b: [91.6, -18.2], face: 'tile', top: 'rail' },
  { a: [91.6, -18.2], b: [91.6, -36.2], face: 'tile', top: 'rail' },
  // 使用者說明：廣場下方面向花園是異想食堂；東端留給 D 棟旁的樓梯上來。
  { a: [78.8, -36.2], b: [88.65, -36.2], face: 'canteen', top: 'rail' },
  { a: [90.95, -36.2], b: [91.6, -36.2], face: 'tile', top: 'rail' },
  // 照片 8988、9001：eco cafe 店面就在橘色雨遮通道北緣欄杆正下方，面向挑高木平台。
  { a: [72.2, -40.6], b: [78.8, -40.6], face: 'cafe', top: 'rail' },
  { a: [78.8, -36.2], b: [78.8, -40.6], face: 'warm', top: 'rail' },
  // 通道西端與樓梯之間的欄杆，底下是咖啡廳西牆（照片 8988 右側樓梯旁）。
  { a: [72.2, -37.4], b: [72.2, -40.6], face: 'warm', top: 'rail' },
  // 照片 8993：門廳樓梯南側是混凝土擋土牆與草坡。
  { a: [60.5, -31.85], b: [60.5, -28.1], face: 'retain', top: 'grass' },
];

/**
 * 橘色雨遮通道與挑高層的柱子 [x, z, 邊長, 材質]（照片 8988、8998）：
 * 面向廣場的開口兩根灰磁磚大柱、通道裡兩根橘柱，挑高木平台中央一根磁磚大方柱。
 */
export const UNDER_COLUMNS = [[75.4, -42.7, 0.9, 'tile'], [73.4, -39, 0.55, 'orange'], [75.6, -39, 0.55, 'orange'],
  [72.6, -36.6, 0.7, 'tile'], [76.4, -36.6, 0.7, 'tile']];
/** 照片 8998：通道開口前的石座木面長椅，右半通道地面鋪木板。 */
export const BENCH = { x0: 72.95, x1: 76.05, z: -37.15, d: 0.6, h: 0.5 };
export const PASSAGE_WOOD = { x0: 76.75, x1: 78.8, z0: -36.6, z1: -40.6 };
/** 照片 8992、8995：C 棟西翼臨馬路是草坡，坡腳一道混凝土矮牆。 */
export const BANK = { x0: 59.9, x1: 62.7, z0: -28.1, z1: -11.8 };
/** 白色高燈桿（照片 8987、8996、8999）與九舍人行道的白色燈桿（照片 9004、9005）。 */
export const LAMP_POSTS = [[74, -21], [88.5, -30], [85.5, -56.6], [52.7, -19.6], [52.7, -36.4], [52.7, -52]];

/**
 * 照片 8992、8993：A 棟東西向翼西端前的一層樓門廳，屋頂女兒牆寫「自強十舍」。
 * 北段是服務亭玻璃窗，recessZ 以南是往內延伸的半開放門廊（只有屋頂）。
 */
export const PODIUM = { x0: 60.4, x1: 64, z0: -44.2, z1: -36.3, h: 2.7, recessZ: -40.2 };
/** 照片 8992：門廊中間的公告欄牆，西端面向馬路貼兩塊白色公告欄，把門廊分成南北兩條通道。 */
export const NOTICE_WALL = { x0: 63, x1: 66.4, z0: -38.9, z1: -37.7 };
/** 門廊與穿過 A 棟到花園的走廊地面（使用者說明 2026-10-23）。 */
export const ENTRY = [[60.4, -36.35], [66.4, -36.35], [66.4, -44.9], [68.6, -44.9], [68.6, -46.1], [64.6, -46.1], [64.6, -40.2], [60.4, -40.2]];

/**
 * 跨越馬路的大雨遮（模型與碰撞在 landmarks.js 的「遮雨棚」，照片 8991、8993、9003、9006）：
 * 西端貼著九舍 D 區東端的圓弧陽台樓，東端落在十舍門廳北角；位置依地圖資料的遮雨棚兩端（z −45.9）。
 */
export const CANOPY = { x0: 47.9, x1: 61.5, z0: -47.5, z1: -44.3, y: 19.6,
  posts: [[49.3, -44.6], [59.9, -44.8]] };
/** 照片 9005、9006：九舍 D 區朝馬路的圓弧陽台凸窗，大雨遮從它南側出發。 */
export const BAY_WINDOW = { x: 47.9, z: -48.6, r: 1.3 };
/** 九舍入口廣場北側：一層樓附屬棟與前面的低雨遮，路口立紅色字幕燈（照片 9004、9006、9007）。 */
export const ANNEX = { x0: 46.8, x1: 52.4, z0: -37.1, z1: -31.9, h: 3.4 };
export const WALKWAY = { x0: 38, x1: 53, z0: -31.6, z1: -29.8, y: 18.2,
  posts: [[39.8, -29.95], [43.4, -29.95], [47, -29.95], [50.6, -29.95], [52.8, -29.95]], led: [53.2, -29.9] };
/** 九舍入口石板廣場（照片 9004）：從馬路一路鋪到大廳東門的門樓。 */
export const JIU_PLAZA = [[36.8, -24.1], [46.7, -24.1], [46.8, -18.7], [53.4, -18.7], [53.4, -29.8], [36.8, -29.8]];
/** 九舍大廳東門外的深褐色門樓（照片 9007、9008）。 */
export const GATE = { x: 37.5, z0: -25.9, z1: -29.7, top: 18.6 };

/** 平面圖 8990：D 區南端與 B 區之間有連通段，地圖資料漏畫，補一段讓中庭四面封閉。 */
export const LINK = { name: '自強十舍D區連通段', osm: 'link', pts: [[96.3, -43.05], [100.8, -43.1], [100.8, -47.9], [96.3, -47.9]] };

/** 花園範圍（地面與馬路同高）：沿建築一圈石板步道（照片 8987、8989、9001）。 */
export const GARDEN = [[68.6, -44.8], [76.5, -44.8], [76.6, -41.1], [78.7, -41.2], [78.8, -36.2], [92.4, -36.2],
  [92.4, -41.1], [96.3, -41.2], [96.3, -47.8], [86.9, -47.8], [86.9, -57.8], [74.9, -57.9], [74.8, -61.3],
  [68.3, -61.3], [68.3, -57.8]];
/** 照片 8987：一大塊草地，中間成群的白色蛋形石雕，外圍一圈黃綠色矮灌木；D 棟前另一小塊。 */
export const LAWNS = [{ x0: 75.6, x1: 86, z0: -56.2, z1: -47.4 }, { x0: 81.6, x1: 87.4, z0: -44.8, z1: -38.8 }];
/** 照片 8989、9001：架空層前沿著 A 棟的種植帶，土面上是矮灌木與細瘦的小樹。 */
export const BED = { x0: 70.4, x1: 73.6, z0: -56, z1: -46.6 };
/** 照片 8989、8998：挑高層開口前一棵大樹，樹冠伸到通道欄杆外；種植帶幾棵細樹。 */
export const GARDEN_TREES = [[74.4, -47.2, 1.1], [72, -49.4, 0.55], [72, -52.6, 0.55], [72, -55.4, 0.5], [93.6, -44.6, 0.7], [80, -26.5, 0.8]];
export const EGGS = [[80.4, -51.6, 1], [81.8, -52.8, 0.8], [79.4, -53.2, 0.7], [81.2, -50.4, 0.6], [85.6, -41.4, 0.9], [86.8, -42.6, 0.7], [84.8, -43, 0.6]];
export const BOLLARDS = [[70.2, -47], [76.8, -46], [86.6, -50], [86.6, -55.5], [80, -46.3], [91.6, -46.4], [95, -44]];
export const PLANTERS = [{ x: 85.5, z: -21.4, w: 4.4, d: 1.8 }, { x: 64.4, z: -30.4, w: 3.2, d: 1.4 }];

/**
 * 樓梯的擋牆線，n 指向踏面。門廳大樓梯兩側磁磚擋牆（照片 8992 左側擋牆貼著門廊）；花園樓梯西側貼著 A 棟牆只裝扶手，
 * 東側到通道欄杆前是橘色擋牆（照片 8988、8989）；D 棟旁樓梯兩側灰磁磚擋牆（照片 9001）。
 */
export const STAIR_CHEEKS = [
  { a: [59.3, -31.85], b: [66.8, -31.85], n: [0, -1], kind: 'tile' },
  { a: [59.3, -36.15], b: [66.8, -36.15], n: [0, 1], kind: 'tile' },
  { a: [72.35, -44.6], b: [72.35, -40.6], n: [-1, 0], kind: 'orange' },
  { a: [69.85, -44.6], b: [69.85, -37.4], n: [1, 0], kind: 'rail' },
  { a: [88.65, -43.4], b: [88.65, -36.2], n: [1, 0], kind: 'tile' },
  { a: [90.95, -43.4], b: [90.95, -36.2], n: [-1, 0], kind: 'tile' },
];

/** 照片 9001：花園北側 B 棟一樓退縮成騎樓，外緣一排方柱；其他面是貼齊外牆的玻璃店面（照片 8987）。 */
export function arcadeColumns() {
  const cols = [];
  for (const b of LAYOUT.buildings.filter(b => /十舍B區/.test(b.name))) {
    const pts = footprintOf(b);
    pts.forEach((a, i) => {
      const c = pts[(i + 1) % pts.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (len < 3) return;
      let n = [(c[1] - a[1]) / len, -(c[0] - a[0]) / len];
      const mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
      if (pointInPoly(mx + n[0] * 0.3, mz + n[1] * 0.3, pts)) n = [-n[0], -n[1]];
      // 只取朝南面向花園的那幾段。
      if (n[1] < 0.7 || !pointInPoly(mx + n[0] * 2, mz + n[1] * 2, GARDEN)) return;
      const count = Math.floor(len / 3.2);
      for (let k = 0; k <= count; k++) {
        const t = (0.5 + k * (len - 1) / Math.max(1, count)) / len;
        cols.push({ x: a[0] + (c[0] - a[0]) * t + n[0] * 1.55, z: a[1] + (c[1] - a[1]) * t + n[1] * 1.55, a, c, n });
      }
    });
  }
  return cols.filter(p => pointInPoly(p.x, p.z, GARDEN));
}

const box = (cx, cz, hx, hz, th = 0) => ({ kind: 'zq10', obb: true, cx, cz, hx, hz, th, cs: Math.cos(th), sn: Math.sin(th) });
const lineBox = (a, b) => box((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.hypot(b[0] - a[0], b[1] - a[1]) / 2, 0.15,
  -Math.atan2(b[1] - a[1], b[0] - a[0]));

/** 外露邊沿、樓梯擋牆、柱子、樹幹、門廳、長椅、草坡矮牆與花台都擋人；樓梯開口不擋。 */
export function zq10Colliders() {
  const posts = [...UNDER_COLUMNS.map(([x, z, s]) => [x, z, s / 2]),
    ...LAMP_POSTS.map(p => [...p, 0.15]), ...WALKWAY.posts.map(p => [...p, 0.12]), [...WALKWAY.led, 0.12],
    [GATE.x, GATE.z0, 0.25], [GATE.x, GATE.z1, 0.25], ...arcadeColumns().map(p => [p.x, p.z, 0.18]),
    ...GARDEN_TREES.map(([x, z, s]) => [x, z, 0.4 * s]), ...EGGS.map(([x, z, s]) => [x, z, 0.45 * s])]
    .map(([x, z, r]) => box(x, z, r, r));
  const rect = r => box((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, (r.x1 - r.x0) / 2, (r.z1 - r.z0) / 2);
  return [...DECK_EDGES.map(e => lineBox(e.a, e.b)), ...STAIR_CHEEKS.map(c => lineBox(c.a, c.b)), ...posts,
    ...PLANTERS.map(p => box(p.x, p.z, p.w / 2, p.d / 2)), rect(ANNEX), rect(NOTICE_WALL), rect({ ...PODIUM, z1: PODIUM.recessZ }), box(98.55, -45.475, 2.25, 2.425),
    box((BENCH.x0 + BENCH.x1) / 2, BENCH.z, (BENCH.x1 - BENCH.x0) / 2, BENCH.d / 2),
    lineBox([BANK.x0, BANK.z0], [BANK.x0, BANK.z1]), box(BAY_WINDOW.x + BAY_WINDOW.r / 2, BAY_WINDOW.z, BAY_WINDOW.r / 2, BAY_WINDOW.r)];
}

export { ZQ10, STAIRS };
