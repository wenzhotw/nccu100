/**
 * 在載入任何遊戲程式之前執行：註冊載入器、提供假的 document／window，
 * 並把 Math.random 換成固定種子，讓每次建出來的角色一模一樣。
 */
import { register } from 'node:module';
import { createHash } from 'node:crypto';

register(new URL('./loader.mjs', import.meta.url));

/* 固定種子的亂數（mulberry32） */
let seed = 0x6e636364;
function seededRandom() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
Math.random = seededRandom;

/* 會把所有繪圖指令記下來的假畫布：貼圖的內容用指令紀錄的雜湊表示，臉、名牌畫的東西改了也抓得到 */
function recordingContext(canvas) {
  const log = canvas.__log;
  const state = { font: '10px sans-serif' };
  return new Proxy(state, {
    get(target, key) {
      if (key === 'canvas') return canvas;
      if (key === 'measureText') return text => { log.push(['measureText', String(text)]); return { width: String(text).length * 10 }; };
      if (key === 'createLinearGradient' || key === 'createRadialGradient' || key === 'createPattern') {
        return (...args) => { log.push([key, ...args]); return { addColorStop: (...a) => log.push(['addColorStop', ...a]) }; };
      }
      if (key === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(0, w * h * 4)), width: w, height: h });
      if (key in target) return target[key];
      return (...args) => { log.push([String(key), ...args.map(a => (typeof a === 'number' ? +a.toFixed(4) : a))]); };
    },
    set(target, key, value) { target[key] = value; log.push(['set', String(key), value]); return true; },
  });
}
class FakeCanvas {
  constructor() { this.width = 300; this.height = 150; this.__log = []; this.style = {}; }
  getContext() { return this.__ctx || (this.__ctx = recordingContext(this)); }
  get __hash() { return createHash('sha256').update(JSON.stringify([this.width, this.height, this.__log])).digest('hex').slice(0, 12); }
  addEventListener() {}
  toDataURL() { return ''; }
}
const element = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild() {}, addEventListener() {}, setAttribute() {} });
globalThis.document = {
  createElement: tag => (tag === 'canvas' ? new FakeCanvas() : element()),
  getElementById: () => element(),
  querySelector: () => element(),
  body: element(),
  addEventListener() {},
};
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1;
globalThis.addEventListener = () => {};
globalThis.location = { search: '', href: 'http://localhost/' };
globalThis.requestAnimationFrame = () => 0;

/* kit.js 的 toon() 用 JSON.stringify 當材質快取鍵，遇到貼圖時 three.js 會試著輸出圖片；
   假畫布不是真的 HTMLCanvasElement，所以只會印警告，不影響結果，這裡把那一行警告濾掉。 */
const warn = console.warn;
console.warn = (...args) => { if (!String(args[0]).includes('Unable to serialize Texture')) warn(...args); };
