/**
 * 自強十舍外觀、中庭與九舍連接處。照片 8987 至 9008、街景（2026-10-23）。
 * 灰磁磚外牆配木色冷氣格柵、頂緣橘色框線；中庭南半抬高為灰磚廣場，
 * 廣場下方面向花園是 eco cafe 與異想食堂，面向馬路是異想食堂與門廳樓梯。
 */
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene } from '../../../core/engine.js';
import { colliders } from '../../../core/collision.js';
import { tree, FOLIAGE } from '../../vegetation.js';
import { basic, canvasTex, toon } from '../../../render/kit.js';
import { BUILDING_FLOORS, FLOOR_H, LAYOUT, LEVELS, LOBBY, STAIRS, footprintOf } from './layout.js';
import { heightAt, platformLevel, pointInPoly } from './terrain.js';
import { clipBuildingX } from './greybox.js';
import { ANNEX, BANK, BAY_WINDOW, BED, BENCH, BOLLARDS, DECK_EDGES, ENTRY, LINK, NOTICE_WALL, EGGS, GARDEN, GARDEN_TREES, GATE, JIU_PLAZA, LAMP_POSTS, LAWNS, PASSAGE_WOOD, PLANTERS, PODIUM, STAIR_CHEEKS, UNDER_COLUMNS, WALKWAY, ZQ10, arcadeColumns } from './zq10-model.js';

const BASE = 15, TOP = BASE + 8 * FLOOR_H, BAY = 3.2, DECK = ZQ10.deck;
const ZQ10_BUILDINGS = [...LAYOUT.buildings.filter(b => /十舍/.test(b.name)).map(b => ({ ...b, pts: footprintOf(b) })), LINK];
const shared = {};
const BOX = new THREE.BoxGeometry(1, 1, 1);

/** 貼圖只畫一次，牆面以 UV 換算公尺重複。 */
function textures() {
  if (shared.wall) return shared;
  const tex = (w, h, draw, alpha) => {
    const t = canvasTex(w, h, draw, [1, 1]);
    return alpha ? basic({ map: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }) : toon('#ffffff', { map: t });
  };
  const tiles = (g, w, h, color, line, sx, sy) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h); g.strokeStyle = line; g.lineWidth = 1;
    for (let y = 0; y < h; y += sy) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x < w; x += sx) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  };
  // 一格是一間寢室：凸出的磁磚框、內凹窗、窗下木色冷氣格柵（照片 8996、8998）。
  shared.wall = tex(256, 192, (g, w, h) => {
    tiles(g, w, h, '#9ba1a8', '#8a9097', 16, 8);
    g.fillStyle = '#b4b9bf'; g.fillRect(0, 0, w, 14); g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);
    g.fillStyle = '#7f858c'; g.fillRect(52, 26, 152, 118);
    g.fillStyle = '#f3f2ec'; g.fillRect(70, 34, 116, 82);
    g.fillStyle = '#7b98a8'; g.fillRect(76, 40, 50, 70); g.fillStyle = '#9fb7c2'; g.fillRect(130, 40, 50, 70);
    g.fillStyle = '#86563e'; g.fillRect(64, 124, 128, 40);
    g.fillStyle = '#a8735a'; for (let y = 128; y < 164; y += 9) g.fillRect(64, y, 128, 4);
  });
  // 樓梯間與端牆：米色磁磚，不開寢室窗（照片 8992 至 8994）。
  shared.end = tex(128, 128, (g, w, h) => tiles(g, w, h, '#e6ded0', '#cfc6b6', 16, 16));
  shared.tile = tex(128, 128, (g, w, h) => tiles(g, w, h, '#a7acb2', '#91979d', 32, 10));
  // 照片 8988、8989：挑高層與樓梯間在暖黃燈下的橘褐色長條磁磚。
  shared.warm = tex(128, 128, (g, w, h) => tiles(g, w, h, '#d99a5c', '#c4844a', 32, 10));
  // 照片 8998：灰色方磚，深灰磚帶分格。
  shared.paver = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#8f949a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.fillStyle = (i * 7 + j * 3) % 5 ? '#a3a8ae' : '#999ea4'; g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
    }
    g.fillStyle = '#6f747a'; g.fillRect(0, 0, w, 6); g.fillRect(0, 0, 6, h);
  });
  shared.rail = tex(128, 64, (g, w) => {
    g.fillStyle = '#4b3d36'; g.fillRect(0, 0, w, 6); g.fillRect(0, 58, w, 6);
    for (let x = 4; x < w; x += 16) g.fillRect(x, 0, 5, 64);
  }, true);
  // 照片 8987：中庭一樓整排玻璃店面，上緣一條花紋飾帶。
  shared.ground = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#5b6066'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9d4c8'; g.fillRect(0, 0, w, 34);
    g.fillStyle = '#b8b1a3'; for (let x = 0; x < w; x += 16) g.fillRect(x + 4, 8, 8, 18);
    for (let x = 8; x < w; x += 82) {
      g.fillStyle = '#cfe0e4'; g.fillRect(x, 46, 74, 204);
      g.fillStyle = '#fff0c8'; g.globalAlpha = 0.6; g.fillRect(x + 4, 120, 66, 126); g.globalAlpha = 1;
    }
  });
  // 照片 9005：九舍粉褐色小方磚、深框綠玻璃窗、窗下冷氣。
  shared.jiu = tex(192, 160, (g, w, h) => {
    tiles(g, w, h, '#c7aaa0', '#b5978d', 8, 8);
    g.fillStyle = '#4a3a34'; g.fillRect(58, 30, 76, 84);
    g.fillStyle = '#9fd0a4'; g.fillRect(64, 36, 30, 72); g.fillStyle = '#b9e0bc'; g.fillRect(98, 36, 30, 72);
    g.fillStyle = '#e8e6e0'; g.fillRect(70, 120, 52, 26); g.fillStyle = '#b9b7b2'; g.fillRect(76, 126, 22, 14);
  });
  shared.paverGarden = tex(128, 128, (g, w, h) => {
    g.fillStyle = '#9da0a3'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j * 3) % 4 ? '#b3b5b7' : '#a9acaf'; g.fillRect(i * 32 + 2, j * 32 + 2, 28, 28); }
  });
  shared.brick = tex(128, 128, (g, w, h) => {
    g.fillStyle = '#a5544a'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8665a';
    for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 * 32; x < w; x += 64) g.fillRect(x + 2, y + 2, 60, 28);
  });
  // 招牌全部畫進同一張圖集，一格 512×192，合併後只多一次繪製。
  const shop = (band, ink, text, font, glass = '#bcd3d8', glow = '#ffe2a6') => (g, w, h) => {
    g.fillStyle = '#3c3f44'; g.fillRect(0, 0, w, h);
    g.fillStyle = band; g.fillRect(0, 0, w, 52);
    g.fillStyle = ink; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 28, w - 40);
    for (let x = 12; x < w - 12; x += 100) {
      g.fillStyle = glass; g.fillRect(x, 64, 88, 120);
      g.fillStyle = glow; g.globalAlpha = 0.55; g.fillRect(x + 6, 110, 76, 70); g.globalAlpha = 1;
    }
  };
  const signs = {
    cafe: shop('#d8c3a2', '#4a3426', 'eco cafe', '700 40px "Noto Sans TC",sans-serif'),
    canteen: shop('#454a52', '#fff3dc', '異想食堂', '700 38px "Noto Sans TC",sans-serif'),
    lobby: shop('#e8e2d6', '#3a4d61', '56789 管理中心', '700 26px "Noto Sans TC",sans-serif', '#c7dbe0', '#fff2cf'),
    hilife: shop('#f4f6f8', '#d4262e', 'Hi-Life 萊爾富', '800 40px "Noto Sans TC",sans-serif', '#cfe0ea', '#ffffff'),
    letters: (g, w, h) => {
      g.fillStyle = '#d9d2c4'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#3c3a38'; g.font = '700 116px "Noto Sans TC",sans-serif'; g.textBaseline = 'middle';
      [...'自強十舍'].forEach((c, i) => g.fillText(c, 14 + i * 128, h / 2 + 8));
    },
    // 照片 8992：公告欄牆面向馬路，米色磁磚底上兩塊白色公告欄。
    notice: (g, w, h) => {
      g.fillStyle = '#e3dccd'; g.fillRect(0, 0, w, h); g.strokeStyle = '#cbc3b2'; g.lineWidth = 2;
      for (let y = 0; y < h; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      for (const x of [26, 266]) {
        g.fillStyle = '#6d6a66'; g.fillRect(x, 40, 220, 92); g.fillStyle = '#f4f2ec'; g.fillRect(x + 5, 45, 210, 82);
        g.fillStyle = '#e7a7b4'; g.fillRect(x + 18, 56, 34, 40); g.fillStyle = '#b7cfe0'; g.fillRect(x + 66, 60, 44, 30);
        g.fillStyle = '#f0d78c'; g.fillRect(x + 124, 54, 34, 50); g.fillStyle = '#c9e2c4'; g.fillRect(x + 170, 62, 30, 36);
      }
    },
    // 照片 8992：南通道盡頭的玻璃幕牆，深色框，裡面是暖橘色燈光。
    curtain: (g, w, h) => {
      g.fillStyle = '#3f4246'; g.fillRect(0, 0, w, h);
      for (let x = 8; x < w - 8; x += 126) {
        g.fillStyle = '#e7a15c'; g.fillRect(x, 8, 118, h - 16);
        g.fillStyle = '#f6c98d'; g.globalAlpha = 0.6; g.fillRect(x + 6, 14, 50, h - 28); g.globalAlpha = 1;
      }
    },
    gateSign: (g, w, h) => {
      g.fillStyle = '#3f312b'; g.fillRect(0, 0, w, h); g.fillStyle = '#f1e7d4';
      g.font = '700 104px "Noto Sans TC",sans-serif'; g.textBaseline = 'middle';
      [...'自強九舍'].forEach((c, i) => g.fillText(c, 18 + i * 126, h / 2 + 6));
    },
    led: (g, w, h) => {
      g.fillStyle = '#1c1c20'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff3b30';
      g.font = '700 110px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('歡迎回家', w / 2, h / 2 + 6);
    },
  };
  const names = Object.keys(signs), CELL_H = 192;
  const atlas = canvasTex(512, CELL_H * names.length, (g, w) => names.forEach((name, i) => {
    g.save(); g.translate(0, i * CELL_H); g.beginPath(); g.rect(0, 0, w, CELL_H); g.clip(); signs[name](g, w, CELL_H); g.restore();
  }));
  const atlasMaterial = toon('#ffffff', { map: atlas });
  names.forEach((name, i) => { shared[name] = { atlas: atlasMaterial, row: i, rows: names.length }; });
  Object.assign(shared, {
    orange: toon('#e5974b'), ceiling: toon('#d98a45'), concrete: toon('#e4e2dc'), slab: toon('#d6d2ca'),
    brown: toon('#4b3a32'), grass: toon('#7fbf5e'), shrub: toon('#4f8f3e'), stone: toon('#e9e6de'),
    dark: toon('#5d5a55'), path: toon('#b9b4aa'), table: toon('#3d3a38'), lamp: toon('#2f3133'), glow: toon('#fff6d6'), deckWood: toon('#c99a6a'), soil: toon('#80634a'), yellowLine: toon('#e8c440'),
    beige: toon('#e8e1d3'), olive: toon('#a9b96c'), redTop: toon('#a0604f'), greenTop: toon('#9cb070'), glass: toon('#bfd8dd'), pole: toon('#f2f0ea'), jiuCap: toon('#5a4038'), jiuWall: toon('#c7aaa0'), hedge: toon('#93b84b'), stoneWall: toon('#9b9a96'),
  });
  return shared;
}

/** 自行算 UV 的直立面：u 以公尺除 rx，v 以絕對高度除 ry，讓各面樓層線對齊；招牌另給 vFrom 從牌底起算。 */
function wall(a, b, y0, y1, normal, material, rx, ry, out = 0.06, vFrom = BASE) {
  const [nx, nz] = normal, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const p = (q, y) => [q[0] + nx * out, y, q[1] + nz * out];
  // 頂點順序依法線決定，讓正面朝外。
  const flip = (b[0] - a[0]) * nz - (b[1] - a[1]) * nx < 0;
  const [s, e] = flip ? [b, a] : [a, b];
  const pos = [...p(s, y0), ...p(e, y0), ...p(e, y1), ...p(s, y0), ...p(e, y1), ...p(s, y1)];
  const u = len / rx, v0 = (y0 - vFrom) / ry, v1 = (y1 - vFrom) / ry;
  const uv = [0, v0, u, v0, u, v1, 0, v0, u, v1, 0, v1];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return [g, material];
}

const boxAt = (material, x, y, z, sx, sy, sz, ry = 0) => {
  const g = BOX.clone().scale(sx, sy, sz); if (ry) g.rotateY(ry);
  return [g.translate(x, y, z), material];
};

/** 由測試點判斷邊的外側法線。 */
function outward(a, b, inside) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  let n = [dz / len, -dx / len];
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  if (inside(mx + n[0] * 0.3, mz + n[1] * 0.3)) n = [-n[0], -n[1]];
  return n;
}

/**
 * 十舍各段輪廓：架空段牆底抬高，A 棟凸出段沿切線分成實心與挑高兩塊；
 * 一樓挖出門廊的棟別，樓上段 from 起算，一樓實心塊只畫到 to。
 */
function zq10Parts() {
  return ZQ10_BUILDINGS.flatMap(b => {
    const lift = ZQ10.lifted.find(l => l.building === b.osm), ground = ZQ10.groundFloor;
    if (!lift) return [{ b, pts: b.pts, lift: null }];
    if (lift.fromX === undefined) return [{ b, pts: b.pts, lift }];
    const east = { b, pts: clipBuildingX(b.pts, lift.fromX, true), lift }, west = clipBuildingX(b.pts, lift.fromX, false);
    if (ground?.building !== b.osm) return [{ b, pts: west, lift: null }, east];
    return [{ b, pts: west, lift: null, from: ground.top }, ...ground.parts.map(pts => ({ b, pts, lift: null, to: ground.top })), east];
  });
}

/** 兩段的高度範圍有重疊才算鄰居，一樓實心塊與樓上段互不遮牆。 */
const span = p => [p.lift ? p.lift.bottom : p.from ?? BASE, p.to ?? TOP];
const overlaps = (p, q) => span(p)[0] < span(q)[1] && span(q)[0] < span(p)[1];

/** 照片 8987 至 8999：灰磚寢室牆、轉角米色壁柱、頂部厚米色女兒牆配橘或橄欖綠框線、中庭一樓玻璃店面。 */
function facades(parts, t) {
  const all = zq10Parts(), corners = new Set();
  const courtyard = (x, z) => x > 66 && x < 93 && z < -18 && z > -58;
  for (const part of all) {
    const accent = /B區|D區/.test(part.b.name) ? t.olive : t.orange;
    part.pts.forEach((a, i) => {
      const c = part.pts[(i + 1) % part.pts.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (len < 0.4) return;
      const n = outward(a, c, (x, z) => pointInPoly(x, z, part.pts));
      const mx = (a[0] + c[0]) / 2 + n[0] * 0.3, mz = (a[1] + c[1]) / 2 + n[1] * 0.3;
      const bottom = part.lift ? part.lift.bottom : part.from ?? (pointInPoly(mx, mz, ZQ10.raised) ? DECK : BASE);
      const ang = -Math.atan2(c[1] - a[1], c[0] - a[0]), cx = (a[0] + c[0]) / 2, cz = (a[1] + c[1]) / 2;
      if (part.to) {
        // 一樓實心塊：南通道盡頭是玻璃幕牆（照片 8992），走廊兩側與挑高層那面是磁磚，外牆照舊灰磚。
        const lifted = all.find(o => o.lift && pointInPoly(mx, mz, o.pts));
        const curtain = Math.abs(a[0] - 66.4) < 0.05 && Math.abs(c[0] - 66.4) < 0.05 && Math.min(a[1], c[1]) > -37.75;
        const inner = pointInPoly(mx, mz, ENTRY);
        if (curtain) parts.push(wall(a, c, BASE, part.to, n, t.curtain, len, part.to - BASE, 0.03, BASE));
        else parts.push(wall(a, c, BASE, part.to, n, lifted ? t.warm : inner ? t.end : t.wall, inner || lifted ? 4 : BAY, inner || lifted ? 4 : FLOOR_H));
        return;
      }
      const neighbour = all.find(o => o !== part && overlaps(o, part) && pointInPoly(mx, mz, o.pts));
      if (neighbour) {
        // 隔壁是架空段時，只補架空層裡看得到的那一段牆。
        if (neighbour.lift && neighbour.lift.bottom > bottom) parts.push(wall(a, c, bottom, neighbour.lift.bottom, n, t.warm, 4, 4));
        return;
      }
      // 照片 8992、8993、9002：只有入口兩翼的端牆是米色格子磚加陽台，其餘轉折都是灰磚寢室牆。
      const endWall = (Math.abs(a[0] - 64) < 0.05 && Math.abs(c[0] - 64) < 0.05) || (mz > -28.6 && mz < -27.6 && mx > 62 && mx < 72);
      const material = len < 3 ? t.tile : endWall ? t.end : t.wall;
      parts.push(wall(a, c, bottom, TOP - 1, n, material, material === t.wall ? BAY : 4, material === t.wall ? FLOOR_H : 4));
      parts.push(boxAt(t.beige, cx + n[0] * 0.12, TOP - 0.5, cz + n[1] * 0.12, len + 0.3, 1, 0.3, ang));
      parts.push(boxAt(accent, cx + n[0] * 0.14, TOP - 1.15, cz + n[1] * 0.14, len + 0.3, 0.3, 0.26, ang));
      if (part.lift) parts.push(boxAt(t.orange, cx + n[0] * 0.1, part.lift.bottom + 0.2, cz + n[1] * 0.1, len + 0.2, 0.42, 0.22, ang));
      else if (len >= 5 && courtyard(mx, mz)) parts.push(wall(a, c, bottom, bottom + 2.9, n, t.ground, BAY, 2.9, 0.09, bottom));
      if (len < 3) return;
      for (const p of [a, c]) {
        const key = p.join();
        if (corners.has(key)) continue;
        corners.add(key);
        parts.push(boxAt(t.beige, p[0], (bottom + TOP - 1) / 2, p[1], 0.55, TOP - 1 - bottom, 0.55));
      }
    });
  }
  // 照片 8987：中庭角落一段頂部三層紅褐色磁磚；照片 8999：另一翼頂部兩層橄欖綠。
  parts.push(wall([86.9, -47.8], [95.8, -47.9], TOP - 1 - 3 * FLOOR_H, TOP - 1, [0, 1], t.redTop, 1, 1, 0.08));
  parts.push(wall([90.2, -10], [90.1, -14.5], TOP - 1 - 2 * FLOOR_H, TOP - 1, [1, 0], t.greenTop, 1, 1, 0.08));
  // 照片 8992、8993：A 棟東西向翼西端（退到門廳後方）是米色端牆，兩疊陽台、一道橘色直條；C 棟西翼北端也有一疊陽台。
  const stack = (x, z, n, from) => {
    for (let y = from + FLOOR_H; y < TOP - 2; y += FLOOR_H) {
      parts.push(boxAt(t.slab, x + n[0] * 0.65, y, z + n[1] * 0.65, n[0] ? 1.3 : 2.6, 0.14, n[0] ? 2.6 : 1.3));
      parts.push(boxAt(t.glass, x + n[0] * 1.28, y + 0.5, z + n[1] * 1.28, n[0] ? 0.06 : 2.6, 0.85, n[0] ? 2.6 : 0.06));
    }
  };
  stack(64, -38.4, [-1, 0], DECK); stack(64, -42.3, [-1, 0], DECK); stack(67.2, -28.1, [0, -1], DECK);
  parts.push(boxAt(t.orange, 64 - 0.08, (DECK + TOP - 1) / 2, -40.35, 0.12, TOP - 1 - DECK, 0.9));
  // 照片 8992、8993：門廳是一層樓量體，北段是「56789 管理中心」服務亭玻璃窗，南段是半開放門廊只有屋頂，
  // 上緣一道薄雨遮，女兒牆寫「自強十舍」，牆頭種灌木。
  const P = PODIUM, h = BASE + P.h, pz = (P.z0 + P.z1) / 2, sz = (P.z0 + P.recessZ) / 2;
  parts.push(boxAt(t.end, (P.x0 + P.x1) / 2, (BASE + h) / 2, sz, P.x1 - P.x0, P.h, P.recessZ - P.z0));
  parts.push(wall([P.x0, P.recessZ - 0.2], [P.x0, P.z0 + 0.3], BASE, h - 0.25, [-1, 0], t.lobby, P.recessZ - P.z0 - 0.5, P.h - 0.25, 0.05, BASE));
  // 門廊：屋頂板延伸到 A 棟牆下，南側直接靠著大樓梯的擋牆，地面鋪灰石板一路接到走廊。
  parts.push(boxAt(t.end, (P.x0 + 64) / 2, h - 0.2, (P.recessZ + P.z1) / 2, 64 - P.x0, 0.4, P.z1 - P.recessZ));
  parts.push(ground(ENTRY, BASE + 0.04, t.paverGarden, 1.2));
  // 公告欄牆：一路頂到門廊天花，西端面向馬路貼公告欄。
  const N = NOTICE_WALL;
  parts.push(boxAt(t.end, (N.x0 + N.x1) / 2, (BASE + h - 0.42) / 2, (N.z0 + N.z1) / 2, N.x1 - N.x0, h - 0.42 - BASE, N.z1 - N.z0));
  parts.push(wall([N.x0, N.z1], [N.x0, N.z0], BASE + 0.4, BASE + 2.1, [-1, 0], t.notice, N.z1 - N.z0, 1.7, 0.02, BASE + 0.4));
  // 門廊與走廊的淺色天花，蓋住樓上段擠出體的底面。
  const ceil = new THREE.ShapeGeometry(new THREE.Shape(ENTRY.map(([x, z]) => new THREE.Vector2(x, -z))))
    .rotateX(Math.PI / 2).translate(0, h - 0.42, 0);
  ceil.scale(1, 1, -1); ceil.index && ceil.setIndex([...ceil.index.array].reverse());
  parts.push([ceil, t.stone]);
  for (const [x, z] of [[62.4, -38], [65.3, -37.6], [65.5, -42.4]]) parts.push(boxAt(t.glow, x, h - 0.43, z, 0.5, 0.05, 0.5));
  // 照片 8992：服務亭窗上一道低薄雨遮，只蓋服務亭這段。
  parts.push(boxAt(t.concrete, P.x0 - 0.55, BASE + 2.25, sz, 1.3, 0.14, P.recessZ - P.z0 + 0.3));
  parts.push(boxAt(t.end, P.x0 + 0.15, h + 0.5, pz, 0.3, 1, P.z1 - P.z0));
  parts.push(boxAt(t.end, (P.x0 + P.x1) / 2, h + 0.5, P.z1 - 0.15, P.x1 - P.x0, 1, 0.3));
  parts.push(boxAt(t.end, (P.x0 + P.x1) / 2, h + 0.5, P.z0 + 0.15, P.x1 - P.x0, 1, 0.3));
  // 照片 8992：「自強十舍」四個字在門廊正上方的女兒牆。
  parts.push(wall([P.x0, P.z1 - 0.25], [P.x0, P.recessZ + 0.15], h + 0.08, h + 0.92, [-1, 0], t.letters, P.z1 - P.recessZ - 0.4, 0.84, 0.32, h + 0.08));
  parts.push(boxAt(t.shrub, (P.x0 + P.x1) / 2 + 0.2, h + 0.35, pz, P.x1 - P.x0 - 0.9, 0.6, P.z1 - P.z0 - 0.9));
  // 街景、照片 8993：A 棟臨馬路的一樓是商店（異想食堂、萊爾富）。
  parts.push(wall([60.3, -45], [60.3, -50.6], BASE, BASE + 2.7, [-1, 0], t.canteen, 5.6, 2.7, 0.12, BASE));
  parts.push(wall([60.25, -51.6], [60.1, -58], BASE, BASE + 2.7, [-1, 0], t.hilife, 6.4, 2.7, 0.12, BASE));
  // 照片 8989：花園這一側，萊爾富緊貼橘色挑高層西側的轉角。
  // 使用者說明（2026-10-24）：走廊一出來就是萊爾富，中間沒有空隙。
  parts.push(wall([68.6, -46.12], [68.44, -52.5], BASE, BASE + 2.7, [1, 0], t.hilife, 6.4, 2.7, 0.14, BASE));
}

/** 照片 9005：九舍面向十舍的東端，粉褐色磁磚、深褐收頭與山牆菱形飾。 */
function jiuFacades(parts, t) {
  const jiu = LAYOUT.buildings.filter(b => /九舍/.test(b.name) && b.osm !== LOBBY.osm);
  for (const b of jiu) {
    const base = Math.min(...b.pts.map(([x, z]) => LEVELS[platformLevel(x, z)]));
    const top = base + (BUILDING_FLOORS[b.osm] ?? 6) * FLOOR_H;
    b.pts.forEach((a, i) => {
      const c = b.pts[(i + 1) % b.pts.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (len < 0.4 || Math.min(a[0], c[0]) < 37) return;
      const n = outward(a, c, (x, z) => pointInPoly(x, z, b.pts));
      const mx = (a[0] + c[0]) / 2 + n[0] * 0.3, mz = (a[1] + c[1]) / 2 + n[1] * 0.3;
      if (jiu.some(o => o !== b && pointInPoly(mx, mz, o.pts))) return;
      const bottom = Math.min(heightAt(mx, mz), top - 1);
      const ang = -Math.atan2(c[1] - a[1], c[0] - a[0]), cx = (a[0] + c[0]) / 2, cz = (a[1] + c[1]) / 2;
      parts.push(wall(a, c, bottom, top, n, t.jiu, 3, FLOOR_H));
      parts.push(boxAt(t.jiuCap, cx + n[0] * 0.1, top + 0.15, cz + n[1] * 0.1, len + 0.25, 0.4, 0.3, ang));
      if (len > 7 && len < 20) {
        const d = BOX.clone().scale(0.6, 0.6, 0.12).rotateZ(Math.PI / 4).rotateY(ang)
          .translate(cx + n[0] * 0.2, top + 0.75, cz + n[1] * 0.2);
        parts.push([d, t.jiuCap]);
        parts.push(boxAt(t.jiuCap, cx + n[0] * 0.12, top + 0.55, cz + n[1] * 0.12, 2.2, 0.4, 0.2, ang));
      }
    });
  }
}

/** 抬高的灰磚廣場：頂面、外露側面的店面或磁磚、欄杆與女兒牆。 */
function deck(parts, t) {
  // 頂面在灰盒裡（地表射線共用），這裡只換上灰磚貼圖。
  const top = scene.getObjectByName('十舍磚地中庭');
  if (top) top.material = t.paver;
  for (const e of DECK_EDGES) {
    const n = outward(e.a, e.b, (x, z) => pointInPoly(x, z, ZQ10.raised)), len = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
    const face = e.face === 'tile' ? t.tile : e.face === 'retain' ? t.stoneWall : t[e.face];
    const plain = e.face === 'tile' || e.face === 'retain' || e.face === 'warm';
    parts.push(wall(e.a, e.b, BASE, DECK, n, face, plain ? 4 : len, plain ? 4 : DECK - BASE, 0.17));
    const ang = -Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0]), cx = (e.a[0] + e.b[0]) / 2, cz = (e.a[1] + e.b[1]) / 2;
    if (e.top === 'grass') {
      // 照片 8993：樓梯南側的混凝土矮牆，牆內一道草坡。
      parts.push(boxAt(t.stoneWall, cx, DECK + 0.3, cz, len, 0.6, 0.3, ang));
      parts.push(boxAt(t.grass, cx - n[0] * 0.95, DECK + 0.18, cz - n[1] * 0.95, len - 0.3, 0.36, 1.6, ang));
    } else {
      const g = wall(e.a, e.b, DECK, DECK + 1.05, n, t.rail, 1.2, 1.05, 0)[0];
      parts.push([g, t.rail]);
    }
  }
  // 照片 8998、8988：挑高層與橘色雨遮通道共用的橘色天花。
  for (const part of zq10Parts().filter(p => p.lift)) {
    const ceil = new THREE.ShapeGeometry(new THREE.Shape(part.pts.map(([x, z]) => new THREE.Vector2(x, -z))))
      .rotateX(Math.PI / 2).translate(0, part.lift.bottom - 0.02, 0);
    // 往下看的面：繞 x 轉正九十度時 z 會反號，再翻一次讓輪廓回到原位。
    ceil.scale(1, 1, -1); ceil.index && ceil.setIndex([...ceil.index.array].reverse());
    parts.push([ceil, t.ceiling]);
  }
  const cafeTop = ZQ10.lifted[0].bottom;
  for (const [x, z, size, kind] of UNDER_COLUMNS) {
    // 通道上的柱子站在廣場高度，挑高木平台中央那根從花園層一路頂到天花。
    const y0 = z > -40.6 ? DECK : BASE;
    parts.push(boxAt(kind === 'orange' ? t.orange : t.tile, x, (y0 + cafeTop) / 2, z, size, cafeTop - y0, size));
  }
  // 照片 8988、9001：咖啡廳前的挑高木平台，木板一路鋪到花園步道邊。
  parts.push(boxAt(t.deckWood, 75.47, BASE + 0.05, -42.68, 6.45, 0.1, 4.15));
  // 照片 8998：通道開口前的石座木面長椅，右半通道地面是木板。
  const B = BENCH, W = PASSAGE_WOOD;
  parts.push(boxAt(t.stoneWall, (B.x0 + B.x1) / 2, DECK + (B.h - 0.08) / 2, B.z, B.x1 - B.x0, B.h - 0.08, B.d));
  parts.push(boxAt(t.deckWood, (B.x0 + B.x1) / 2, DECK + B.h - 0.04, B.z, B.x1 - B.x0 + 0.08, 0.08, B.d + 0.08));
  parts.push(boxAt(t.deckWood, (W.x0 + W.x1) / 2, DECK + 0.04, (W.z0 + W.z1) / 2, W.x1 - W.x0, 0.08, W.z0 - W.z1));
  for (const [x, z] of [[73.6, -42.2], [77.4, -43.4], [77.6, -41.8]]) {
    parts.push(boxAt(t.table, x, BASE + 0.75, z, 0.9, 0.05, 0.9));
    parts.push(boxAt(t.table, x, BASE + 0.4, z, 0.1, 0.7, 0.1));
  }
  for (const pl of PLANTERS) {
    parts.push(boxAt(t.tile, pl.x, DECK + 0.3, pl.z, pl.w, 0.6, pl.d));
    parts.push(boxAt(t.shrub, pl.x, DECK + 0.75, pl.z, pl.w - 0.3, 0.4, pl.d - 0.3));
  }
}

/** 平面多邊形轉成地面網格，UV 以公尺除 rx。 */
function ground(poly, y, material, rx) {
  const g = new THREE.ShapeGeometry(new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z))))
    .rotateX(-Math.PI / 2).translate(0, y, 0);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / rx, p.getZ(i) / rx);
  return [g, material];
}

/**
 * 花園（照片 8987、8989、9001）：沿建築一圈灰石板步道，北側 B 棟一樓退縮成騎樓；
 * 一大一小兩塊草地，外圍一圈黃綠色矮灌木，草地上是成群的白色蛋形石雕，挑高層前一棵大樹與種植帶幾棵細樹。
 */
function garden(parts, t) {
  parts.push(ground(GARDEN, BASE + 0.03, t.paverGarden, 1.6));
  for (const l of LAWNS) parts.push(ground([[l.x0, l.z0], [l.x1, l.z0], [l.x1, l.z1], [l.x0, l.z1]], BASE + 0.06, t.grass, 1));
  parts.push(ground([[BED.x0, BED.z0], [BED.x1, BED.z0], [BED.x1, BED.z1], [BED.x0, BED.z1]], BASE + 0.08, t.soil, 1));
  parts.push(boxAt(t.stoneWall, (BED.x0 + BED.x1) / 2, BASE + 0.12, BED.z1, BED.x1 - BED.x0, 0.24, 0.15));
  for (const c of arcadeColumns()) {
    parts.push(boxAt(t.tile, c.x, BASE + 1.45, c.z, 0.4, 2.9, 0.4));
  }
  // 騎樓頂板：每段沿牆一條，跟柱子同一排。
  const seen = new Set();
  for (const c of arcadeColumns()) {
    const key = c.a.join() + c.c.join();
    if (seen.has(key)) continue;
    seen.add(key);
    const len = Math.hypot(c.c[0] - c.a[0], c.c[1] - c.a[1]), ang = -Math.atan2(c.c[1] - c.a[1], c.c[0] - c.a[0]);
    parts.push(boxAt(t.slab, (c.a[0] + c.c[0]) / 2 + c.n[0] * 0.9, BASE + 3.05, (c.a[1] + c.c[1]) / 2 + c.n[1] * 0.9, len, 0.3, 1.9, ang));
  }
  // 照片 8987、8996、8999：白色高燈桿。
  for (const [x, z] of LAMP_POSTS) {
    const y = heightAt(x, z);
    parts.push([new THREE.CylinderGeometry(0.08, 0.11, 4.2, 8).translate(x, y + 2.1, z), t.pole]);
    parts.push([new THREE.CylinderGeometry(0.22, 0.16, 0.45, 8).translate(x, y + 4.35, z), t.glow]);
  }
  // 照片 8987：白色蛋形石雕立在深色石塊上。
  for (const [x, z, s] of EGGS) {
    parts.push([new THREE.DodecahedronGeometry(0.62 * s, 0).scale(1.2, 0.5, 1).translate(x, BASE + 0.25, z), t.dark]);
    const egg = new THREE.SphereGeometry(0.42 * s, 10, 8).scale(1, 1.6, 1).translate(x, BASE + 0.45 + 0.62 * s, z);
    parts.push([egg, t.stone]);
  }
  // 照片 8989：步道旁的黑色矮燈柱。
  for (const [x, z] of BOLLARDS) {
    parts.push([new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8).translate(x, BASE + 0.45, z), t.lamp]);
    parts.push([new THREE.CylinderGeometry(0.11, 0.11, 0.12, 8).translate(x, BASE + 0.82, z), t.glow]);
  }
}

/** 花壇外圍一圈黃綠色矮灌木，每邊中間留一個口（照片 8987 前景）。 */
function hedges(t) {
  const spots = [];
  for (const l of LAWNS) {
    const sides = [[[l.x0, l.z0], [l.x1, l.z0]], [[l.x1, l.z0], [l.x1, l.z1]], [[l.x1, l.z1], [l.x0, l.z1]], [[l.x0, l.z1], [l.x0, l.z0]]];
    for (const [a, b] of sides) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(len / 0.8);
      for (let k = 0; k <= n; k++) {
        const d = k * len / n;
        if (Math.abs(d - len / 2) < 0.9) continue;
        spots.push([a[0] + (b[0] - a[0]) * d / len, a[1] + (b[1] - a[1]) * d / len]);
      }
    }
  }
  // 種植帶裡的矮灌木比花壇外圍更小更疏（照片 8989、9001）。
  for (let z = BED.z1 - 0.8; z > BED.z0 + 0.5; z -= 1.6) for (const x of [BED.x0 + 0.8, BED.x1 - 0.8]) spots.push([x, z]);
  const inst = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), t.hedge, spots.length), o = new THREE.Object3D();
  spots.forEach(([x, z], i) => {
    const s = 0.5 + ((i * 37) % 5) * 0.04;
    o.position.set(x, BASE + 0.3, z); o.scale.set(s, s * 0.75, s); o.rotation.y = i; o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
  });
  inst.name = '十舍花園矮灌木'; scene.add(inst);
}

/**
 * 九舍連接處（照片 8991、9003 至 9008）：
 * 九舍入口石板廣場通到大廳東門的深褐色門樓；廣場北側一層附屬棟，前面是低雨遮，路口立紅色字幕燈；
 * 跨馬路的大雨遮從九舍 D 區東端圓弧陽台樓旁出發，落在十舍服務亭前的紅磚人行道。
 */
function connection(parts, t) {
  // 照片 8991、8993：九舍與十舍之間的馬路中央雙黃線。
  const centre = [[56.8, -6.1], [56.7, -14.9], [56.2, -46.1], [56.2, -58]];
  for (let i = 1; i < centre.length; i++) {
    const [a, b] = [centre[i - 1], centre[i]], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (const off of [-0.1, 0.1]) parts.push(boxAt(t.yellowLine, (a[0] + b[0]) / 2 + off, BASE + 0.045, (a[1] + b[1]) / 2, len, 0.01, 0.08, ang));
  }
  // 跨馬路大雨遮本身是地標「遮雨棚」，由 landmarks.js 建立。
  const W = WALKWAY, A = ANNEX;
  // 照片 8991：十舍這一側是紅磚人行道。
  const red = ground([[58.4, -34], [60.35, -34], [60.25, -58], [58.4, -58]], BASE + 0.045, t.brick, 0.5);
  parts.push(red);
  parts.push(ground(JIU_PLAZA, BASE + 0.035, t.paverGarden, 1.2));
  for (const [x, z, w, d] of [[49.8, -21.4, 3.2, 2.6], [42.6, -25.4, 3.6, 1.8]]) {
    parts.push(ground([[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]], BASE + 0.06, t.grass, 1));
  }
  parts.push(wall([A.x0, A.z1], [A.x1, A.z1], BASE, BASE + A.h, [0, 1], t.jiu, 3, FLOOR_H));
  parts.push(wall([A.x1, A.z1], [A.x1, A.z0], BASE, BASE + A.h, [1, 0], t.jiu, 3, FLOOR_H));
  parts.push(boxAt(t.jiuWall, (A.x0 + A.x1) / 2, BASE + A.h / 2, (A.z0 + A.z1) / 2, A.x1 - A.x0 - 0.05, A.h, A.z1 - A.z0 - 0.05));
  parts.push(boxAt(t.slab, (W.x0 + W.x1) / 2, W.y, (W.z0 + W.z1) / 2, W.x1 - W.x0, 0.24, W.z1 - W.z0));
  for (const [x, z] of W.posts) parts.push(boxAt(t.pole, x, (BASE + W.y) / 2, z, 0.2, W.y - BASE, 0.2));
  parts.push(boxAt(t.stoneWall, (W.x0 + W.x1) / 2, BASE + 0.35, W.z0 - 0.1, W.x1 - W.x0, 0.7, 0.3));
  const [lx, lz] = W.led;
  parts.push(boxAt(t.pole, lx, BASE + 1.2, lz, 0.18, 2.4, 0.18));
  parts.push(boxAt(t.table, lx, BASE + 2.2, lz, 0.14, 0.4, 1.3));
  parts.push(wall([lx + 0.08, lz + 0.6], [lx + 0.08, lz - 0.6], BASE + 2.02, BASE + 2.38, [1, 0], t.led, 1.2, 0.36, 0.01, BASE + 2.02));
  const G = GATE, mid = (G.z0 + G.z1) / 2;
  for (const z of [G.z0, G.z1]) parts.push(boxAt(t.brown, G.x, (BASE + G.top) / 2, z, 0.5, G.top - BASE, 0.5));
  parts.push(boxAt(t.brown, G.x, G.top - 0.35, mid, 0.6, 0.7, G.z0 - G.z1 + 0.5));
  parts.push(wall([G.x, G.z0 - 0.3], [G.x, G.z1 + 0.3], G.top - 0.62, G.top - 0.08, [1, 0], t.gateSign, G.z0 - G.z1 - 0.6, 0.54, 0.31, G.top - 0.62));
  parts.push(wall([G.x, G.z0 + 0.25], [G.x, G.z1 - 0.25], G.top, G.top + 0.7, [1, 0], t.rail, 1.2, 0.7, 0, G.top));
  // 照片 9005、9006：九舍 D 區朝馬路的圓弧凸窗整棟高，每層一道深褐圓弧收邊，大雨遮從它南側出發。
  const { x: bx, z: bz, r } = BAY_WINDOW, bayTop = BASE + (BUILDING_FLOORS[510739854] ?? 4) * FLOOR_H;
  parts.push([new THREE.CylinderGeometry(r, r, bayTop - BASE, 16, 1, false, 0, Math.PI).translate(bx, (BASE + bayTop) / 2, bz), t.jiuWall]);
  for (let y = BASE + FLOOR_H; y <= bayTop + 0.01; y += FLOOR_H) {
    parts.push([new THREE.CylinderGeometry(r + 0.18, r + 0.18, 0.28, 16, 1, false, 0, Math.PI).translate(bx, y, bz), t.jiuCap]);
  }
  // 照片 9005、9008：九舍這一側也有灰石板人行道，避開入口廣場。
  for (const [z0, z1] of [[-18.7, -2], [-52, -29.8]]) parts.push(ground([[52.45, z0], [53.5, z0], [53.5, z1], [52.45, z1]], BASE + 0.03, t.paverGarden, 1.2));
  // 照片 8992、8995：C 棟西翼坐在臨馬路的草坡上，坡腳一道混凝土矮牆。
  const K = BANK, rise = DECK - 0.4 - (BASE + 0.7), runX = K.x1 - K.x0 - 0.15, slope = Math.hypot(runX, rise);
  parts.push(boxAt(t.stoneWall, K.x0, BASE + 0.35, (K.z0 + K.z1) / 2, 0.3, 0.7, K.z1 - K.z0));
  const g = BOX.clone().scale(slope, 0.12, K.z1 - K.z0).rotateZ(Math.atan2(rise, runX))
    .translate(K.x0 + 0.15 + runX / 2, BASE + 0.7 + rise / 2, (K.z0 + K.z1) / 2);
  parts.push([g, t.grass]);
}

/** 樓梯擋牆：牆頂順著踏面高度，牆頂扶手（照片 8988 的金屬扶手、8989 的橘色擋牆、8992 的磁磚擋牆）。 */
function stairCheeks(parts, t) {
  for (const c of STAIR_CHEEKS) {
    const len = Math.hypot(c.b[0] - c.a[0], c.b[1] - c.a[1]);
    const top = p => heightAt(p[0] + c.n[0] * 0.6, p[1] + c.n[1] * 0.6) + 0.95;
    const ha = top(c.a), hb = top(c.b);
    if (c.kind !== 'rail') {
      const shape = new THREE.Shape([[0, BASE - 0.05], [len, BASE - 0.05], [len, hb], [0, ha]].map(([u, y]) => new THREE.Vector2(u, y)));
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }).translate(0, 0, -0.15);
      g.rotateY(-Math.atan2(c.b[1] - c.a[1], c.b[0] - c.a[0])).translate(c.a[0], 0, c.a[1]);
      parts.push([g, c.kind === 'orange' ? t.orange : c.a[0] > 80 ? t.tile : t.end]);
    }
    // 貼牆的扶手比擋牆頂低一些，直接沿著牆面走。
    const lift = c.kind === 'rail' ? -0.05 : 0.3;
    const from = new THREE.Vector3(c.a[0], ha + lift, c.a[1]), to = new THREE.Vector3(c.b[0], hb + lift, c.b[1]);
    const dir = to.clone().sub(from), rail = new THREE.CylinderGeometry(0.04, 0.04, dir.length(), 6);
    rail.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
    rail.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    parts.push([rail, c.kind === 'orange' || c.kind === 'rail' ? t.orange : t.lamp]);
  }
  // 照片 8988、9001：花園樓梯的踏面是木板，每一階一塊，頂面略高於灰盒踏面。
  const s = STAIRS.find(v => v.id === 'zq10-garden'), [a, b] = s.path, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.round((s.to - s.from) / 0.3), run = len / steps;
  for (let k = 0; k < steps; k++) {
    const f = (k + 0.5) / steps, x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f, h = heightAt(x, z);
    parts.push(boxAt(t.deckWood, x, (BASE + h + 0.015) / 2, z, s.width, h + 0.015 - BASE, run));
  }
}

/** 共用樹先在空地建立，再搬到中庭並併入靜態網格。 */
function trees(parts) {
  for (const [x, z, s] of GARDEN_TREES) {
    const n = scene.children.length, c = colliders.length, f = FOLIAGE.length;
    tree(1000, 1000, s);
    for (const o of scene.children.slice(n)) {
      o.position.x += x - 1000; o.position.z += z - 1000; o.position.y += heightAt(x, z);
      o.updateMatrixWorld(true);
      o.traverse(m => { if (m.isMesh) parts.push([m.geometry.clone().applyMatrix4(m.matrixWorld), m.material]); });
      scene.remove(o);
    }
    // 樹幹碰撞統一由 zq10Colliders 提供。
    colliders.splice(c); FOLIAGE.splice(f);
  }
}

/** 同材質合併成一個網格，整區只多十幾次繪製。 */
function merge(parts) {
  const byMaterial = new Map(), palette = toon('#ffffff', { vertexColors: true });
  for (const [g, given] of parts) {
    const geo = g.index ? g.toNonIndexed() : g;
    let m = given;
    if (m.atlas) {
      // 招牌 UV 在 0 到 1 之間，換算到圖集的那一列（畫布由上往下，貼圖 v 由下往上）。
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, Math.min(1, Math.max(0, uv.getX(i))),
        1 - (m.row + 1) / m.rows + Math.min(1, Math.max(0, uv.getY(i))) / m.rows);
      m = m.atlas;
    } else if (m.isMeshToonMaterial && !m.map && !m.transparent && m.emissive.getHex() === 0) {
      // 純色零件改用頂點色，整區純色只算一次繪製。
      const colors = new Float32Array(geo.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) m.color.toArray(colors, i);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      m = palette;
    }
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', ...(m === palette ? ['color'] : [])].includes(name)) geo.deleteAttribute(name);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    (byMaterial.get(m) ?? byMaterial.set(m, []).get(m)).push(geo);
  }
  const root = new THREE.Group(); root.name = '自強十舍外觀';
  for (const [m, list] of byMaterial) {
    const mesh = new THREE.Mesh(mergeBufferGeometries(list), m); mesh.name = '十舍合併'; root.add(mesh);
    list.forEach(g => g.dispose());
  }
  scene.add(root);
  return root;
}

/** 建立十舍外觀；碰撞已併入 greyboxColliders。 */
export function buildZq10() {
  const t = textures(), parts = [];
  // 連通段本體（灰盒沒有這棟），外牆由 facades 一起貼。
  parts.push(boxAt(t.beige, 98.55, (BASE + TOP) / 2, -45.475, 4.4, TOP - BASE, 4.75));
  facades(parts, t); jiuFacades(parts, t); deck(parts, t); stairCheeks(parts, t); garden(parts, t); connection(parts, t); trees(parts);
  hedges(t);
  return merge(parts);
}
