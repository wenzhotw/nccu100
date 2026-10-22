/**
 * 遊玩人數統計（GoatCounter，https://www.goatcounter.com）。
 *
 * - 打開網頁：GoatCounter 自動記一次瀏覽（不用 Cookie、不記個人資料）。
 * - 另外記幾個「事件」，看大家有沒有真的在玩：
 *     start / continue      按下「開始冒險」或「繼續冒險」
 *     play-5min / play-15min 這次玩超過 5、15 分鐘（每次開網頁最多記一次）
 *     room/房間代號          走進某個室內
 *     achievement/成就代號   拿到成就
 *     naiwa/pickup          搬起奶蛙立牌
 *     launch/homescreen     從主畫面（加到主畫面後）打開
 * - 本機開發（localhost）和自動測試（無頭瀏覽器）不送出，數字只算真的玩家。
 * - 後台：https://nccu100.goatcounter.com（帳號名稱改了就改下面的 GC_CODE）。
 */
import { state } from '../core/state.js';

const GC_CODE = 'nccu100';
const LOCAL = /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?$)/.test(location.hostname) || location.protocol === 'file:';
const ENABLED = !LOCAL && !navigator.webdriver;

const queue = [];
/** 記一個事件；統計程式還沒載入完就先排隊 */
function track(name, title) {
  if (!ENABLED) return;
  const ev = { path: name, title: title || name, event: true };
  if (window.goatcounter && window.goatcounter.count) window.goatcounter.count(ev); else queue.push(ev);
}

if (ENABLED) {
  const s = document.createElement('script');
  s.async = true; s.src = 'https://gc.zgo.at/count.js';
  s.dataset.goatcounter = `https://${GC_CODE}.goatcounter.com/count`;
  s.addEventListener('load', () => { while (queue.length && window.goatcounter && window.goatcounter.count) window.goatcounter.count(queue.shift()); });
  document.head.appendChild(s);
}

/* 從主畫面打開（加到主畫面後全螢幕玩）的另外記一筆，知道有多少人這樣玩 */
if (window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) track('launch/homescreen', '從主畫面打開');

/* 開始／繼續冒險（用 capture，比其他系統的點擊處理先記到；程式呼叫 .click() 也算） */
const go = document.getElementById('go');
if (go) go.addEventListener('click', () => {
  const cont = /繼續/.test(go.textContent || '');
  track(cont ? 'continue' : 'start', cont ? '繼續冒險' : '開始冒險');
}, { capture: true, once: true });

/* 每一幀看狀態有沒有變：進室內、拿成就、搬奶蛙、玩了多久 */
let lastRoom = null, held = false, achv = null, playT = 0, last = performance.now();
const marks = [[300, 'play-5min', '玩超過 5 分鐘'], [900, 'play-15min', '玩超過 15 分鐘']];
function tick() {
  requestAnimationFrame(tick);
  const now = performance.now(), dt = Math.min(1, (now - last) / 1000); last = now;
  if (!ENABLED || !state.started) return;
  if (!document.hidden) playT += dt;
  while (marks.length && playT >= marks[0][0]) { const [, n, t] = marks.shift(); track(n, t); }
  const room = state.room || null;
  if (room !== lastRoom) { if (room) track('room/' + room, '進入室內：' + room); lastRoom = room; }
  if (state.holdNaiwa && !held) track('naiwa/pickup', '搬起奶蛙');
  held = !!state.holdNaiwa;
  // 成就：開始玩那一刻已經有的（讀存檔來的）不算，之後新拿到的才記
  const now_ = Object.keys(state).filter(k => k.startsWith('achv_') && state[k]);
  if (achv === null) achv = new Set(now_);
  else now_.forEach(k => { if (!achv.has(k)) { achv.add(k); track('achievement/' + k.slice(5), '拿到成就：' + k.slice(5)); } });
}
requestAnimationFrame(tick);

export { track };
