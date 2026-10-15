/**
 * 遊戲內容（台詞、NPC 名單、校園故事）的讀取與檢查。
 *
 * 內容放在同資料夾的 JSON 檔，不會寫程式的夥伴也可以直接改台詞。
 * 這個檔案負責：
 *   - 依照遊戲狀態挑出該說哪一段台詞（dialog 裡的 when 條件）
 *   - 把台詞裡的 {found}、{left}、{total} 換成數字
 *   - 執行台詞說完之後的動作（then，例如 giveMap 發地圖）
 *   - 啟動時檢查 JSON 格式，寫錯會在主控台清楚說明哪裡錯
 */
import { state } from '../core/state.js';
import { IX } from '../world/layout.js';
import npcsData from './npcs.json';
import dialogsData from './dialogs.json';
import storiesData from './stories.json';

export const NPC_LIST = npcsData.npcs;
export const STUDENTS = npcsData.students;
export const PANIC_LINES = npcsData.panic;
export const DIALOGS = dialogsData;
export const STORIES = storiesData.stories;

/** JSON 裡可以寫的特殊數值 */
const CONSTS = { IX, PI: Math.PI, '-PI': -Math.PI, 'PI/2': Math.PI / 2, '-PI/2': -Math.PI / 2 };
export function num(v) {
  if (typeof v === 'number') return v;
  if (v in CONSTS) return CONSTS[v];
  throw new Error(`內容裡的數值「${v}」看不懂，請用數字或 ${Object.keys(CONSTS).join('、')}`);
}

/** 台詞可以用的變數 */
function vars() {
  const total = STORIES.length;
  return { ...state, total, left: total - state.found };
}
function val(v, V) { return typeof v === 'string' && v in V ? V[v] : v; }

/** when 條件：{ haveMap: false }、{ found: 'total' }、{ found: { lt: 'total' } } */
function matches(when, V) {
  if (!when) return true;
  return Object.entries(when).every(([k, want]) => {
    const have = V[k];
    if (want && typeof want === 'object') {
      if ('lt' in want && !(have < val(want.lt, V))) return false;
      if ('gt' in want && !(have > val(want.gt, V))) return false;
      if ('eq' in want && have !== val(want.eq, V)) return false;
      return true;
    }
    return have === val(want, V);
  });
}

/** 把 {found} 這類變數換成目前的值 */
export function fill(text) {
  const V = vars();
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in V ? V[k] : m));
}

/** 從 dialog 陣列挑出第一段符合條件的台詞，回傳 { lines, then } */
export function pickDialog(dialog) {
  const V = vars();
  const d = dialog.find(x => matches(x.when, V)) || dialog[dialog.length - 1];
  return { lines: d.lines.map(fill), then: d.then };
}

/** then 動作：由各系統自己登記，例如 items.js 登記 giveMap */
const actions = {};
export function registerAction(name, fn) { actions[name] = fn; }
/** 劇情旗標：then 寫 "set:旗標名稱"，之後 when 就能用 { "旗標名稱": true } 判斷（會存檔） */
state.flags = state.flags || new Set();
export function setFlag(name) { state[name] = true; state.flags.add(name); }
export function runAction(name) {
  if (!name) return;
  if (name.startsWith('set:')) { setFlag(name.slice(4)); return; }
  if (!actions[name]) { console.warn(`[content] 找不到動作「${name}」`); return; }
  actions[name]();
}

/* ---------- 格式檢查 ---------- */
function check() {
  const errs = [];
  const isLines = l => Array.isArray(l) && l.length && l.every(s => typeof s === 'string');
  const checkDialog = (d, where) => {
    if (!Array.isArray(d) || !d.length) return errs.push(`${where}: dialog 要是至少一段的陣列`);
    d.forEach((x, i) => { if (!isLines(x.lines)) errs.push(`${where}: dialog 第 ${i + 1} 段的 lines 要是文字陣列`); });
    if (d[d.length - 1].when) errs.push(`${where}: dialog 最後一段不要寫 when，當作都不符合時的預設台詞`);
  };
  const ids = new Set();
  NPC_LIST.forEach((n, i) => {
    const w = `npcs.json 第 ${i + 1} 位（${n.id || '沒有 id'}）`;
    if (!n.id) errs.push(`${w}: 缺少 id`);
    else if (ids.has(n.id)) errs.push(`${w}: id 重複`);
    ids.add(n.id);
    if (!n.title) errs.push(`${w}: 缺少 title`);
    if (!n.home) errs.push(`${w}: 缺少 home`);
    else { try { num(n.home.x); num(n.home.z); } catch (e) { errs.push(`${w}: ${e.message}`); } }
    if (n.face !== undefined) { try { num(n.face); } catch (e) { errs.push(`${w}: ${e.message}`); } }
    checkDialog(n.dialog, w);
  });
  if (STUDENTS.colors.length !== STUDENTS.paths.length) errs.push('npcs.json students: colors 與 paths 數量要一樣');
  checkDialog(DIALOGS.pangolin.dialog, 'dialogs.json pangolin');
  STORIES.forEach((s, i) => {
    const w = `stories.json 第 ${i + 1} 個（${s.id || '沒有 id'}）`;
    ['id', 'title'].forEach(k => { if (!s[k]) errs.push(`${w}: 缺少 ${k}`); });
    ['x', 'y', 'z'].forEach(k => { if (typeof s[k] !== 'number') errs.push(`${w}: ${k} 要是數字`); });
    if (!isLines(s.lines)) errs.push(`${w}: lines 要是文字陣列`);
  });
  return errs;
}
export const contentErrors = check();
if (contentErrors.length) console.error('[content] 內容檔有錯：\n' + contentErrors.join('\n'));
