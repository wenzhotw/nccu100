/**
 * 存檔：把遊戲進度存在玩家自己的瀏覽器（localStorage），關掉網頁再打開可以繼續玩。
 *
 * 存什麼：道具（地圖、徽章、信函）、收集到的校園故事、和穿山甲講過話、變身雄鷹、
 * 在屋頂追到 Wenz、劇情旗標（例如商學院的同學支線）、最後站在戶外的位置。
 * 什麼時候存：遊戲開始後每 3 秒自動存一次，切到別的分頁或關掉網頁時也會存。
 * 讀取：載入時就恢復狀態（不播音效、不跳提示），開始畫面的按鈕會變成「繼續冒險」，
 * 下面多一個「重新開始」可以清掉存檔。
 *
 * 只在同一台裝置、同一個瀏覽器有效；無痕模式或清除網站資料後存檔會消失。
 * 改了存檔格式時把 VERSION 加一，舊格式的存檔會被忽略，不會讓遊戲壞掉。
 */
import { state } from '../core/state.js';
import { $ } from '../core/dom.js';
import { pos, groundH, indoor } from '../core/gameplay.js';
import { crystals } from './stories.js';
import { setFlag } from '../content/index.js';
import { bubble } from '../actors/pangolin.js';
import { becomeEagle } from '../actors/player.js';
import { giveMap, giveBadge } from './items.js';
import { giveLetter } from './old-principal/index.js';
import { moveWenzToRoof, wenzCaught, restoreWenzCaught } from './eagle/index.js';

const KEY = 'nccu100-save';
const VERSION = 1;

// localStorage 在部分瀏覽器（無痕、關閉網站資料）會丟錯誤，全部包起來，存不了就當作沒有存檔
function readRaw() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); return d && d.v === VERSION ? d : null; }
  catch { return null; }
}
function writeRaw(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* 存不了就算了 */ } }
function clearSave() { try { localStorage.removeItem(KEY); } catch { /* 同上 */ } }

/* ---------- 存 ---------- */
// 只記錄「站在戶外地面上、沒在忙」的位置，避免讀檔時出現在水裡、半空中或車上
let lastSpot = null;
function rememberSpot() {
  if (indoor() || state.busy || !state.grounded || state.swimming || state.driving || state.racing) return;
  if (Math.abs(pos.y - groundH(pos.x, pos.z)) > 0.3) return;
  lastSpot = { x: +pos.x.toFixed(2), z: +pos.z.toFixed(2), yaw: +(state.yaw || 0).toFixed(3) };
}
function saveGame() {
  if (!state.started) return;
  rememberSpot();
  writeRaw({
    v: VERSION,
    t: Date.now(),
    haveMap: !!state.haveMap,
    haveBadge: !!state.haveBadge,
    haveLetter: !!state.haveLetter,
    dogTalked: !!state.dogTalked,
    isEagle: !!state.isEagle,
    wenzCaught: wenzCaught(),
    stories: crystals.filter(c => c.got).map(c => c.id),
    flags: [...(state.flags || [])],
    spot: lastSpot,
  });
}

/* ---------- 讀 ---------- */
function loadGame(d) {
  if (d.haveMap) giveMap(true);
  if (d.haveBadge) giveBadge(true);
  if (d.haveLetter) giveLetter(true);
  if (d.dogTalked) state.dogTalked = true;
  (d.flags || []).forEach(setFlag);   // 劇情旗標（npcs.json 裡 then 寫的 set:旗標）
  const got = new Set(d.stories || []);
  crystals.forEach(c => { if (got.has(c.id)) { c.got = true; c.g.visible = false; } });
  state.found = crystals.filter(c => c.got).length;
  $('fragn').textContent = state.found;
  if (state.found === crystals.length) bubble.visible = true;   // 跟收集完最後一個故事時一樣，穿山甲頭上冒泡泡
  if (d.isEagle) { becomeEagle(); moveWenzToRoof(); if (d.wenzCaught) restoreWenzCaught(); }
  if (d.spot) {
    pos.set(d.spot.x, 0, d.spot.z); pos.y = groundH(d.spot.x, d.spot.z); state.yaw = d.spot.yaw;
    lastSpot = d.spot;
  }
}

const saved = readRaw();
if (saved) {
  try { loadGame(saved); }
  catch (e) { console.warn('[存檔] 讀取失敗，從頭開始', e); clearSave(); location.reload(); }
  // 開始畫面：繼續冒險＋重新開始
  const go = $('go');
  go.firstChild.textContent = '繼續冒險';
  const again = document.createElement('button');
  again.type = 'button'; again.id = 'newGame'; again.textContent = '重新開始（清除存檔）';
  again.addEventListener('click', () => {
    if (!confirm('確定要清除存檔、從頭開始嗎？')) return;
    clearSave(); location.reload();
  });
  go.after(again);
}

setInterval(saveGame, 3000);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
window.addEventListener('pagehide', saveGame);

export { saveGame, clearSave };
