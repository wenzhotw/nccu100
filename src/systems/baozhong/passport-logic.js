// src/systems/baozhong/passport-logic.js
// P01 包種茶節探索護照：純邏輯模組（無 import、無 DOM/THREE/遊戲狀態）。
// 規則：flags 一律以 Set<string> 傳入；會改變狀態的函式只回 {set:[], clear:[]}，
// 由整合層套用。沒有變化時回 set:[]、clear:[]。
// 成就「已拿過」以 flags 中有 `achv_<成就id>` 判斷（例：achv_bz26_explorer）。

const RE_ST = /^bz26_st_[A-Za-z0-9]+$/;
const RE_PF = /^bz26_pf_[A-Za-z0-9]+$/;
const RE_MD = /^bz26_md_[A-Za-z0-9]+$/;
const RE_HINT = /^bz26_hint_(\d+)$/;
const RE_HINTU = /^bz26_hintu_(\d+)$/;
const CANS = ['bz26_can_1', 'bz26_can_2', 'bz26_can_3', 'bz26_can_4', 'bz26_can_5'];
const HIDDEN = ['bz26_hs_RADIO', 'bz26_hs_STAGE', 'bz26_hs_FRIEND'];

export const HINT_COST = 3;
export const COLLEGE_PASS = 4;
export const EXAM_PASS = 7;
export const EXAM_SIZE = 10;
export const EXAM_MEDALS = 3;

const toSet = (flags) => (flags instanceof Set ? flags : new Set(flags || []));
const int = (n) => (Number.isFinite(Number(n)) ? Math.floor(Number(n)) : 0);
const countRe = (f, re) => { let n = 0; for (const x of f) if (re.test(x)) n++; return n; };
const maxN = (f, re) => { let m = 0; for (const x of f) { const r = re.exec(x); if (r) m = Math.max(m, Number(r[1])); } return m; };
const noop = () => ({ set: [], clear: [] });

export const stFlag = (boothId) => `bz26_st_${boothId}`;
export const pfFlag = (boothId) => `bz26_pf_${boothId}`;
export const mdFlag = (collegeId) => `bz26_md_${collegeId}`;
export const achvFlag = (achId) => `achv_${achId}`;

// 攤位過關：答對 ≥ 題數−1 且至少 1 題
export function boothPass(nQ, score) {
  const n = int(nQ), s = int(score);
  return s >= n - 1 && s >= 1;
}

// 攤位結算：首次過關 set st 得 2；首次全對 set pf 得 1；重玩不重複給
export function boothResult(flags, boothId, nQ, score) {
  const f = toSet(flags);
  const n = int(nQ), s = int(score);
  const passed = boothPass(n, s);
  const perfect = passed && n >= 1 && s >= n;
  const set = [];
  let gained = 0;
  if (passed && !f.has(stFlag(boothId))) { set.push(stFlag(boothId)); gained += 2; }
  if (perfect && !f.has(pfFlag(boothId))) { set.push(pfFlag(boothId)); gained += 1; }
  return { passed, perfect, gained, set, clear: [] };
}

// 點數＝2×st數＋pf數＋bz26_can_1..5數＋隱藏章數−3×已買提示卡數
export function points(flags) {
  const f = toSet(flags);
  return 2 * countRe(f, RE_ST) + countRe(f, RE_PF)
    + CANS.filter((x) => f.has(x)).length
    + HIDDEN.filter((x) => f.has(x)).length
    - HINT_COST * countRe(f, RE_HINT);
}

// 買提示卡：點數 ≥ 3 才可買，N 從 1 累加（取現有最大 N＋1）
export function buyHint(flags) {
  const f = toSet(flags);
  if (points(f) < HINT_COST) return { ok: false, set: [], clear: [] };
  return { ok: true, set: [`bz26_hint_${maxN(f, RE_HINT) + 1}`], clear: [] };
}

// 剩餘提示卡＝已買 − 已用（不小於 0）
export function hintsLeft(flags) {
  const f = toSet(flags);
  return Math.max(0, countRe(f, RE_HINT) - countRe(f, RE_HINTU));
}

// 使用 k 張提示卡：k 夾在 0..剩餘張數；hintu 的 N 接續現有最大 N
export function useHints(flags, k) {
  const f = toSet(flags);
  const used = Math.max(0, Math.min(int(k), hintsLeft(f)));
  const start = maxN(f, RE_HINTU);
  const set = [];
  for (let i = 1; i <= used; i++) set.push(`bz26_hintu_${start + i}`);
  return { used, set, clear: [] };
}

// 學院可挑戰：college.booths 全部有 st（booths 空或缺時回 false）
export function collegeReady(flags, college) {
  const f = toSet(flags);
  const booths = college && Array.isArray(college.booths) ? college.booths : [];
  return booths.length > 0 && booths.every((id) => f.has(stFlag(id)));
}

// 學院問答結算：≥4 過關；首次過關才 set md，已有勳章或沒過回 set:[]
// 注意：是否 collegeReady 由整合層先檢查
export function collegeResult(flags, collegeId, score) {
  const f = toSet(flags);
  const passed = int(score) >= COLLEGE_PASS;
  const set = passed && !f.has(mdFlag(collegeId)) ? [mdFlag(collegeId)] : [];
  return { passed, set, clear: [] };
}

export function medalCount(flags) { return countRe(toSet(flags), RE_MD); }
export function examUnlocked(flags) { return medalCount(flags) >= EXAM_MEDALS; }

// 大會考抽題：已得勳章學院（依 content.colleges 順序）的 quiz＋backup，
// 以題目文字 q 去重，用注入的 rng()∈[0,1) 做 Fisher–Yates 洗牌後取 10 題；不足 10 題全取
export function drawExam(content, flags, rng = Math.random) {
  const f = toSet(flags);
  const colleges = content && Array.isArray(content.colleges) ? content.colleges : [];
  const seen = new Set();
  const pool = [];
  for (const c of colleges) {
    if (!f.has(mdFlag(c.id))) continue;
    for (const q of [...(c.quiz || []), ...(c.backup || [])]) {
      if (!q || typeof q.q !== 'string') continue;
      const key = q.q.trim();
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({ ...q, college: c.id });
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    let r = Number(rng());
    if (!(r >= 0)) r = 0; if (r >= 1) r = 0.999999999;
    const j = Math.floor(r * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, EXAM_SIZE);
}

// 大會考結算：≥7 過關；沒過 set:[]、achieve:[]；explorer 只在未有 achv_bz26_explorer 時回
export function examResult(flags, score) {
  const f = toSet(flags);
  const passed = int(score) >= EXAM_PASS;
  if (!passed) return { passed, set: [], clear: [], achieve: [] };
  return {
    passed,
    set: f.has('bz26_exam_pass') ? [] : ['bz26_exam_pass'],
    clear: [],
    achieve: f.has(achvFlag('bz26_explorer')) ? [] : ['bz26_explorer'],
  };
}

// 進場／離場
export function startRound(flags) { return { set: ['bz26_active'], clear: ['bz26_exam_pass'] }; }
export function leave() { return { set: [], clear: ['bz26_active'] }; }

// 收集成就：全部學院勳章 / 全部攤位章（依 content 全表判斷），只回尚未拿過的
export function collectionAchievements(flags, content) {
  const f = toSet(flags);
  const colleges = content && Array.isArray(content.colleges) ? content.colleges : [];
  const booths = content && Array.isArray(content.booths) ? content.booths : [];
  const out = [];
  if (colleges.length && colleges.every((c) => f.has(mdFlag(c.id))) && !f.has(achvFlag('bz26_all_medals'))) out.push('bz26_all_medals');
  if (booths.length && booths.every((b) => f.has(stFlag(b.id))) && !f.has(achvFlag('bz26_all_stamps'))) out.push('bz26_all_stamps');
  return out;
}

// 護照畫面資料（給 P04 UI 用，純資料）
export function passportView(flags, content) {
  const f = toSet(flags);
  const colleges = content && Array.isArray(content.colleges) ? content.colleges : [];
  const byId = new Map((content && Array.isArray(content.booths) ? content.booths : []).map((b) => [b.id, b]));
  return {
    points: points(f),
    hints: hintsLeft(f),
    examUnlocked: examUnlocked(f),
    examPassed: f.has('bz26_exam_pass'),
    colleges: colleges.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      medal: f.has(mdFlag(c.id)),
      ready: collegeReady(f, c),
      booths: (c.booths || []).map((id) => ({
        id,
        dept: (byId.get(id) && byId.get(id).dept) || '',
        stamp: f.has(stFlag(id)),
        perfect: f.has(pfFlag(id)),
      })),
    })),
  };
}
