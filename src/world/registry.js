/**
 * 世界登記處
 *
 * 建築與地形把自己的「可以走上去的高度」「區域名稱」「地圖圖示」「室內空間」登記在這裡。
 * 遊戲邏輯（移動、區域橫幅、秘寶地圖、小地圖）只讀這裡，不直接 import 任何一棟建築，
 * 所以新增或修改一棟建築，不會影響到其他人的檔案。
 */
import { registerRoom } from '../core/rooms.js';

export const world = {
  /** 所有建築定義（由 buildings/index.js 自動載入） */
  buildings: [],
  /** (x, z) => 高度或 null。第一個回傳數字的函式勝出 */
  heights: [],
  /** { priority, test(p) => 區域名稱或 null }，priority 越小越先判斷 */
  zones: [],
  /** 秘寶地圖與小地圖上的圖示 */
  mapShapes: [],
  /** 室內空間：{ [建築 id]: { enter(), exit() } } */
  /** 室內房間設定：{ [房間 id]: def }，房間的場景與碰撞在 core/rooms.js */
  interiors: {},
};

/**
 * 定義一棟建築。每棟建築資料夾的 index.js 都要 `export default defineBuilding({...})`。
 *
 * @param {object} def
 * @param {string} def.id        與資料夾同名，例如 'library'
 * @param {string} def.name      顯示用名稱，例如 '中正圖書館'
 * @param {() => void} def.build 建模：把模型加進場景、登記碰撞。啟動時呼叫一次
 * @param {(x:number, z:number) => (number|null)} [def.heightAt] 可走上去的地方（階梯、平台）回傳高度，其他地方回傳 null
 * @param {{priority:number, test:(p:{x:number,z:number}) => (string|null)}[]} [def.zones] 區域名稱
 * @param {object[]} [def.map]   地圖圖示：{ x, z, w, d, color, label } 矩形，或 { draw(g, mx, my) } 自訂畫法
 * @param {object|object[]} [def.interior] 室內房間（可以是陣列，一棟建築好幾個房間）。格式見 docs/interiors.md
 */
export function defineBuilding(def) {
  if (!def || typeof def.id !== 'string' || typeof def.build !== 'function') {
    throw new Error('defineBuilding() 需要 id（字串）與 build（函式）');
  }
  return def;
}

/** 地形或其他非建築模組也可以登記高度與區域 */
export function registerHeight(fn) { world.heights.push(fn); }
export function registerZone(priority, test) { world.zones.push({ priority, test }); }
export function registerMapShape(shape) { world.mapShapes.push(shape); }

/** 把一棟建築的高度、區域、地圖、室內登記進世界 */
export function installBuilding(def) {
  world.buildings.push(def);
  if (def.heightAt) world.heights.push(def.heightAt);
  (def.zones || []).forEach(z => world.zones.push(z));
  (def.map || []).forEach(s => world.mapShapes.push(s));
  [].concat(def.interior || []).forEach(r => {
    const room = { id: def.id, name: def.name, ...r };
    world.interiors[room.id] = room; registerRoom(room);
  });
}

/** 地面高度：問過所有登記的高度函式，沒有人回答就是 0 */
export function heightAt(x, z) {
  for (const f of world.heights) { const h = f(x, z); if (h !== null && h !== undefined) return h; }
  return 0;
}

/** 目前所在區域名稱 */
export function zoneAt(p, fallback) {
  const sorted = world.zones.slice().sort((a, b) => a.priority - b.priority);
  for (const z of sorted) { const name = z.test(p); if (name) return name; }
  return fallback;
}
