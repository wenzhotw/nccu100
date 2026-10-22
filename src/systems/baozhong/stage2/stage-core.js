// src/systems/baozhong/stage2/stage-core.js（T074，Grok）：兩階段攤位的純邏輯，沒有 DOM、THREE 或遊戲狀態。
// 第一階段（初訪）：小遊戲完成 → 一般攤位章 bz26_st_<id>（+2）；首次每步都答對再加 bz26_pf_<id>（+1）。
// 第二階段（回訪）：既有攤位問答當進階版，全對才過 → bz26_adv_<id> 加上資料指定的茶罐或隱藏章（點數公式已計入）。
// 關主和大會考的題目從小遊戲資料產生（buildQuestionPool），沒有小遊戲的攤位照舊用原題庫。
// 旗標一律以 Set<string> 傳入；改變狀態的函式只回 {set, clear}，由整合層套用。只新增 bz26_adv_* 旗標。

export const ADV_PREFIX = 'bz26_adv_';
export const REWARD_FLAGS = ['bz26_can_1', 'bz26_can_2', 'bz26_can_3', 'bz26_can_4', 'bz26_can_5', 'bz26_hs_RADIO', 'bz26_hs_STAGE', 'bz26_hs_FRIEND'];
export const CAN_FLAGS = REWARD_FLAGS.slice(0, 5);
// 驗收 CLD-001（M1、M2）：小遊戲題只能是點綴，不能蓋過同院其他攤位，所以關主與大會考每院最多 1 題，並和原題目一起打亂順序。
export const MASTER_PER_COLLEGE = 1;
export const EXAM_PER_COLLEGE = 1;
export const TYPES = ['matching', 'classify', 'situation', 'sort', 'spot', 'build'];

const toSet = flags => (flags instanceof Set ? flags : new Set(flags || []));
const st = id => `bz26_st_${id}`;
const pf = id => `bz26_pf_${id}`;
export const advFlag = id => `${ADV_PREFIX}${id}`;

/** 依 "D26.features.0" 取出 baozhong.json 裡的文字；第一段是攤位 id。找不到回 null。 */
export function resolveTrace(content, path) {
  if (typeof path !== 'string' || !path) return null;
  const [boothId, ...rest] = path.split('.');
  let node = (content && Array.isArray(content.booths) ? content.booths : []).find(b => b.id === boothId);
  for (const key of rest) {
    if (node === null || node === undefined) return null;
    node = Array.isArray(node) ? node[Number(key)] : node[key];
  }
  return typeof node === 'string' ? node : null;
}
/** 回傳所有不成立的 trace（quote 沒有逐字出現在 path 指的欄位）。 */
export function traceErrors(content, data) {
  const out = [];
  const check = (trace, where) => {
    for (const t of Array.isArray(trace) ? trace : [trace]) {
      const text = t && resolveTrace(content, t.path);
      if (!t || typeof t.quote !== 'string' || !t.quote || text === null || !text.includes(t.quote)) out.push(`${where}: ${t && t.path} 「${t && t.quote}」`);
    }
  };
  for (const g of (data && data.games) || []) {
    (g.intro || []).forEach((line, i) => { check(line.trace, `${g.booth}.intro.${i}`); if (!line.trace || line.text !== line.trace.quote) out.push(`${g.booth}.intro.${i}: 介紹文字必須是逐字引文`); });
    // 第二批（v1.67）：每個答案要有依據。系所事實用 trace（逐字核對）；假想教學例子寫 invented，一般知識寫 general（說明誰要複核）。
    const basis = (x, where) => {
      if (x && x.trace !== undefined) check(x.trace, where);
      else if (!x || !((typeof x.invented === 'string' && x.invented.trim()) || (typeof x.general === 'string' && x.general.trim()))) out.push(`${where}: 沒有依據（trace、invented 或 general）`);
    };
    (g.pairs || []).forEach(p => basis(p, `${g.booth}.pair.${p.id}`));
    (g.items || []).forEach(it => basis(it, `${g.booth}.item.${it.id}`));
    (g.steps || []).forEach(s => basis(s, `${g.booth}.step.${s.id}`));
    (g.cards || []).forEach(c => basis(c, `${g.booth}.card.${c.id}`));
    ((g.advanced && g.advanced.explain) || []).forEach(e => check(e.trace, `${g.booth}.advanced.${e.question}`));
    const ctx = g.pool && g.pool.context;
    if (ctx) { check(ctx.trace, `${g.booth}.pool.context`); if (!ctx.trace || ctx.text !== ctx.trace.quote) out.push(`${g.booth}.pool.context: 題幹前提必須是逐字引文`); }
  }
  return out;
}

/** 檢查資料結構；有錯就丟 TypeError。回傳 Map<boothId, game>。 */
export function indexGames(data, content) {
  const booths = new Map(((content && content.booths) || []).map(b => [b.id, b]));
  const games = new Map();
  for (const g of (data && Array.isArray(data.games) ? data.games : [])) {
    if (!g || !booths.has(g.booth)) throw new TypeError(`小遊戲攤位不存在：${g && g.booth}`);
    if (games.has(g.booth)) throw new TypeError(`小遊戲攤位重複：${g.booth}`);
    if (!TYPES.includes(g.type)) throw new TypeError(`${g.booth} 小遊戲類型不支援：${g.type}`);
    if (typeof g.title !== 'string' || !g.title.trim() || !Array.isArray(g.intro) || !g.intro.length) throw new TypeError(`${g.booth} 需要標題與介紹`);
    if (g.type === 'matching' && (!Array.isArray(g.pairs) || g.pairs.length !== 3)) throw new TypeError(`${g.booth} 配對需要三組`);
    if (g.type === 'classify') {
      const cats = new Set((g.categories || []).map(c => c.id));
      if (cats.size < 2 || !Array.isArray(g.items) || g.items.length < 3 || g.items.some(it => !cats.has(it.category))) throw new TypeError(`${g.booth} 分類資料不完整`);
    }
    if (g.type === 'situation' && (!Array.isArray(g.steps) || !g.steps.length || g.steps.some(s => !Array.isArray(s.choices) || s.choices.length < 2 || s.choices.length > 4 || !Number.isInteger(s.answer) || s.answer < 0 || s.answer >= s.choices.length))) throw new TypeError(`${g.booth} 情境步驟不完整`);
    // 第一批擴充（v1.66）：茶罐與隱藏章只有 8 個，用途待 Wenzel 決定，所以進階獎勵改成可選；有填才必須是既有旗標。
    if (!g.advanced || typeof g.advanced !== 'object') g.advanced = {};
    const reward = g.advanced.reward;
    if (reward !== undefined && !REWARD_FLAGS.includes(reward)) throw new TypeError(`${g.booth} 進階獎勵必須是既有茶罐或隱藏章旗標`);
    if (g.type === 'sort') {
      const ids = (g.cards || []).map(c => c && c.id);
      if (!Array.isArray(g.cards) || g.cards.length < 3 || g.cards.length > 5 || new Set(ids).size !== ids.length || g.cards.some(c => typeof c.text !== 'string' || !c.text.trim())
        || new Set(g.cards.map(c => c.text.trim())).size !== g.cards.length) throw new TypeError(`${g.booth} 排序需要 3 到 5 張不重複的卡`);
    }
    if (g.type === 'spot' && (!Array.isArray(g.steps) || !g.steps.length || g.steps.some(s => !Array.isArray(s.segments) || s.segments.length < 3 || s.segments.length > 4
      || new Set(s.segments.map(x => String(x).trim())).size !== s.segments.length
      || !Number.isInteger(s.answer) || s.answer < 0 || s.answer >= s.segments.length
      || (s.feedback !== undefined && (!Array.isArray(s.feedback) || s.feedback.length !== s.segments.length))))) throw new TypeError(`${g.booth} 找錯每步要 3 到 4 段、答案與回饋數量正確`);
    if (g.type === 'build' && (!Array.isArray(g.steps) || !g.steps.length || g.steps.some(s => !Array.isArray(s.parts) || s.parts.length < 2 || s.parts.length > 8
      || !Array.isArray(s.target) || !s.target.length || s.target.some(i => !Number.isInteger(i) || i < 0 || i >= s.parts.length)
      || typeof s.answerText !== 'string' || !Array.isArray(s.distractors) || s.distractors.length !== 2
      || new Set([s.answerText, ...s.distractors].map(x => String(x).trim())).size !== 3))) throw new TypeError(`${g.booth} 組合每步要有零件、正確順序與 2 個不同的干擾答案`);
    if (g.type === 'situation' && g.steps.some(s => s.feedback !== undefined && (!Array.isArray(s.feedback) || s.feedback.length !== s.choices.length))) throw new TypeError(`${g.booth} 情境選項回饋數量要和選項相同`);
    games.set(g.booth, g);
  }
  const rewards = [...games.values()].map(g => g.advanced.reward).filter(Boolean);
  if (new Set(rewards).size !== rewards.length) throw new TypeError('兩個攤位不能共用同一個進階獎勵');
  return games;
}

/** 小遊戲的步數（每步一個即時回饋）。 */
export function gameSteps(game) {
  if (game.type === 'matching') return game.pairs.length;
  if (game.type === 'classify') return game.items.length;
  if (game.type === 'sort') return game.cards.length;
  return game.steps.length;
}

export function createStageController({ logic: L, content: C, data, shuffle }) {
  const games = indexGames(data, C);
  const booths = new Map(C.booths.map(b => [b.id, b]));
  const colleges = new Map(C.colleges.map(c => [c.id, c]));
  const shuffleQ = shuffle || ((q, rng) => q);

  /** 攤位現在是哪一階段：legacy（沒有小遊戲資料，照舊）／first（初訪）／return（已有章，可挑進階）。 */
  function stageFor(flags, boothId) {
    const f = toSet(flags), game = games.get(boothId) || null;
    if (!game) return { kind: 'legacy', game: null };
    if (!f.has(st(boothId))) return { kind: 'first', game };
    return { kind: 'return', game, advancedDone: f.has(advFlag(boothId)), reward: game.advanced.reward };
  }

  /** 初訪結算。result 來自小遊戲 UI：{status:'completed'|'cancelled', total, score}。取消或未完成不給任何東西。 */
  function firstResult(flags, boothId, result) {
    const f = toSet(flags), game = games.get(boothId);
    const none = { completed: false, stamped: false, perfect: false, gained: 0, set: [], clear: [] };
    if (!game || !result || result.status !== 'completed') return none;
    const total = gameSteps(game), score = Math.max(0, Math.min(total, Math.floor(Number(result.score) || 0)));
    const perfect = score === total, set = [];
    let gained = 0;
    if (!f.has(st(boothId))) { set.push(st(boothId)); gained += 2; }
    if (perfect && !f.has(pf(boothId))) { set.push(pf(boothId)); gained += 1; }
    return { completed: true, stamped: set.includes(st(boothId)), perfect, score, total, gained, set, clear: [] };
  }

  /** 進階問答題目：沿用攤位原題，選項洗牌，附上說明；沒有說明的只顯示正確答案。 */
  function advancedQuestions(boothId, rng = Math.random) {
    const b = booths.get(boothId), game = games.get(boothId);
    const explain = new Map(((game && game.advanced.explain) || []).map(e => [e.question, e.text]));
    return b.quiz.questions.map((q, i) => {
      const s = shuffleQ({ q: q.q, options: [...q.options], answer: q.answer }, rng);
      const correct = s.options[s.answer];
      return { q: s.q, options: s.options, answer: s.answer, correct, explain: explain.get(i) || `正確答案：${correct}` , hasExplain: explain.has(i) };
    });
  }

  /** 進階結算：要先有攤位章；全對才過；已拿過不重複給；取消不給。 */
  function advancedResult(flags, boothId, result) {
    const f = toSet(flags), game = games.get(boothId);
    const none = { passed: false, gained: 0, set: [], clear: [] };
    if (!game || !f.has(st(boothId)) || !result || result.status !== 'completed') return none;
    const total = Math.floor(Number(result.total) || 0), score = Math.floor(Number(result.score) || 0);
    const passed = total > 0 && score === total && total === booths.get(boothId).quiz.questions.length;
    if (!passed) return { ...none, score, total };
    const set = [];
    let gained = 0;
    if (!f.has(advFlag(boothId))) {
      set.push(advFlag(boothId));
      if (game.advanced.reward && !f.has(game.advanced.reward)) { set.push(game.advanced.reward); gained += 1; }
    }
    return { passed, score, total, gained, reward: game.advanced.reward, set, clear: [] };
  }

  /** 把一個小遊戲轉成選擇題（關主／大會考用）。每題保留 booth 與 source 方便追溯。 */
  function questionsFromGame(game) {
    const tag = (q, src) => ({ ...q, booth: game.booth, source: src });
    if (game.type === 'matching') {
      const rights = game.pairs.map(p => p.right);
      return game.pairs.map((p, i) => tag({ q: game.pool.prompt.replace('{left}', p.left), options: [...rights], answer: i }, `pair:${p.id}`));
    }
    if (game.type === 'classify') {
      const labels = game.categories.map(c => c.label), ids = game.categories.map(c => c.id);
      return game.items.map(it => tag({ q: game.pool.prompt.replace('{text}', it.text), options: [...labels], answer: ids.indexOf(it.category) }, `item:${it.id}`));
    }
    if (game.type === 'sort') {
      // 每一對相鄰卡片出一題：「X 之後是哪一步？」選項是正解加上兩張其他卡（不含 X 本身）。
      return game.cards.slice(1).map((c, i) => {
        const prev = game.cards[i], others = game.cards.filter(x => x !== c && x !== prev).slice(0, 2).map(x => x.text);
        return tag({ q: game.pool.prompt.replace('{prev}', prev.text), options: [c.text, ...others], answer: 0 }, `card:${c.id}`);
      });
    }
    if (game.type === 'spot') return game.steps.map(s => tag({ q: game.pool.prompt.replace('{prompt}', s.prompt), options: [...s.segments], answer: s.answer }, `step:${s.id}`));
    if (game.type === 'build') return game.steps.map(s => tag({ q: game.pool.prompt.replace('{prompt}', s.prompt), options: [s.answerText, ...s.distractors], answer: 0 }, `step:${s.id}`));
    // 驗收 CLD-001（M3）：情境題離開攤位後沒有前面的假想條件，題幹要帶上 pool.context，玩家才能獨立作答。
    const context = game.pool.context && game.pool.context.text ? `${game.pool.context.text}` : '';
    return game.steps.map(s => tag({ q: game.pool.prompt.replace('{prompt}', context + s.prompt), options: [...s.choices], answer: s.answer }, `step:${s.id}`));
  }
  function buildQuestionPool(collegeIds) {
    const ids = new Set(collegeIds);
    const out = [];
    for (const c of C.colleges) if (ids.has(c.id)) for (const id of c.booths) { const g = games.get(id); if (g) out.push(...questionsFromGame(g)); }
    return out;
  }
  function shuffled(list, rng) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      let r = Number(rng()); if (!(r >= 0)) r = 0; if (r >= 1) r = 0.999999999;
      const j = Math.floor(r * (i + 1)); [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const strip = ({ q, options, answer }) => ({ q, options, answer });
  /** 每院最多取 per 題小遊戲題（院內各試作攤隨機）。 */
  function pickPerCollege(collegeIds, per, rng) {
    const out = [];
    for (const cid of collegeIds) out.push(...shuffled(buildQuestionPool([cid]), rng).slice(0, per));
    return out;
  }
  const describe = derived => derived.map(q => ({ booth: q.booth, source: q.source, q: q.q }));

  /** 關主題目：本院有小遊戲時取 1 題小遊戲題，其餘從原本的學院題庫補到原題數，再打亂順序。 */
  function masterQuestions(collegeId, rng = Math.random) {
    const c = colleges.get(collegeId), size = c.quiz.length;
    const derived = pickPerCollege([collegeId], MASTER_PER_COLLEGE, rng).slice(0, size);
    const seen = new Set(derived.map(q => q.q));
    const legacy = shuffled(c.quiz.filter(q => !seen.has(q.q)), rng).slice(0, size - derived.length);
    const questions = derived.length ? shuffled([...derived, ...legacy], rng) : legacy;
    return { questions: questions.map(strip), derived: describe(derived) };
  }

  /** 大會考：已得勳章學院中有小遊戲的，每院取 1 題小遊戲題，再用原本的 drawExam 補到 10 題，最後打亂順序。
   *  沒有任何小遊戲題時，結果與原本的 drawExam 完全相同。 */
  function examDraw(flags, rng = Math.random) {
    const f = toSet(flags);
    const medaled = C.colleges.filter(c => f.has(`bz26_md_${c.id}`)).map(c => c.id);
    const size = L.EXAM_SIZE;
    const derived = pickPerCollege(medaled, EXAM_PER_COLLEGE, rng).slice(0, size);
    const seen = new Set(derived.map(q => q.q.trim()));
    const legacy = L.drawExam(C, f, rng).filter(q => !seen.has(q.q.trim())).slice(0, size - derived.length);
    const questions = derived.length ? shuffled([...derived, ...legacy], rng) : legacy;
    return { questions: questions.map(strip), derived: describe(derived) };
  }

  /** 護照補充資料：進階茶罐數與每攤進階狀態。 */
  function passportExtras(flags) {
    const f = toSet(flags);
    return {
      cans: CAN_FLAGS.filter(x => f.has(x)).length, cansTotal: CAN_FLAGS.length,
      advanced: [...games.keys()].filter(id => f.has(advFlag(id))),
      available: [...games.keys()],
    };
  }
  /** 把補充資料加到 passportView 的副本上（不改原物件）。 */
  function decorateView(view, flags) {
    const x = passportExtras(flags), done = new Set(x.advanced), avail = new Set(x.available);
    return {
      ...view,
      advanced: { cans: x.cans, total: x.cansTotal, done: x.advanced.length, available: x.available.length },
      colleges: (view.colleges || []).map(c => ({ ...c, booths: (c.booths || []).map(b => (avail.has(b.id) ? { ...b, advanced: done.has(b.id), advancedAvailable: true } : b)) })),
    };
  }

  return { games, stageFor, firstResult, advancedQuestions, advancedResult, questionsFromGame, buildQuestionPool, masterQuestions, examDraw, passportExtras, decorateView };
}
