// src/systems/baozhong/stage2/rounds.js（T074，Grok）：一題一答、當場公布對錯的回合引擎（純邏輯）。
// 分類、情境選擇與進階問答共用。每步只能作答一次：答完立刻回傳對錯、正解與一句說明，再前進下一步。
// finish() 只在每步都答完時回 completed；cancel() 回 cancelled 且分數 0，呼叫端據此不發任何獎勵。

/** steps: [{prompt, options:[文字], answer:索引, explain:文字, feedback?:[每個選項選到時的結果說明]}] */
export function createFeedbackRound(steps) {
  if (!Array.isArray(steps) || !steps.length) throw new TypeError('回合至少要一步');
  for (const s of steps) {
    if (!s || typeof s.prompt !== 'string' || !Array.isArray(s.options) || s.options.length < 2
      || !Number.isInteger(s.answer) || s.answer < 0 || s.answer >= s.options.length) throw new TypeError('步驟資料不完整');
  }
  let index = 0, score = 0, closed = false, answered = false;
  const log = [];
  const snapshot = () => ({ index, total: steps.length, score, answered, complete: log.length === steps.length, closed });
  function current() { return closed || index >= steps.length ? null : steps[index]; }
  function answer(choice) {
    const s = current();
    if (!s || answered || !Number.isInteger(choice) || choice < 0 || choice >= s.options.length) return { kind: 'ignored', ...snapshot() };
    answered = true;
    const correct = choice === s.answer;
    if (correct) score++;
    log.push({ index, choice, correct });
    return { kind: correct ? 'correct' : 'incorrect', correct, correctIndex: s.answer, correctText: s.options[s.answer], explain: (Array.isArray(s.feedback) && s.feedback[choice]) || s.explain || '', ...snapshot() };
  }
  function next() {
    if (closed || !answered) return { kind: 'ignored', ...snapshot() };
    answered = false; index++;
    return { kind: index >= steps.length ? 'end' : 'step', ...snapshot() };
  }
  function finish() {
    if (closed || log.length !== steps.length) return null;
    closed = true;
    return { status: 'completed', total: steps.length, score, log: [...log] };
  }
  function cancel() {
    if (closed) return null;
    closed = true;
    return { status: 'cancelled', total: steps.length, score: 0 };
  }
  return { steps, current, answer, next, finish, cancel, snapshot };
}

/** 把小遊戲資料轉成回合步驟。分類：選項是分類名稱；情境：選項是 choices。 */
export function stepsFromGame(game) {
  if (game.type === 'classify') {
    const labels = game.categories.map(c => c.label), ids = game.categories.map(c => c.id);
    return game.items.map(it => ({ id: it.id, prompt: it.text, options: labels, answer: ids.indexOf(it.category), explain: it.explain || '' }));
  }
  if (game.type === 'situation') return game.steps.map(s => ({ id: s.id, prompt: s.prompt, options: [...s.choices], answer: s.answer, explain: s.explain || '', ...(Array.isArray(s.feedback) ? { feedback: [...s.feedback] } : {}) }));
  if (game.type === 'spot') return game.steps.map(s => ({ id: s.id, prompt: s.prompt, options: [...s.segments], answer: s.answer, explain: s.explain || '', ...(Array.isArray(s.feedback) ? { feedback: [...s.feedback] } : {}) }));
  throw new TypeError(`回合引擎不處理 ${game.type}`);
}

/* ---------- 第二批（v1.67）：排序與組合的純邏輯 ---------- */

/** 排序：cards 依正確順序給入。玩家一次放一張進下一格；每格第一次就放對才計分，放錯不前進、該格不再計分。 */
export function createSortRound(cards) {
  if (!Array.isArray(cards) || cards.length < 2) throw new TypeError('排序至少要兩張卡');
  const ids = cards.map(c => c.id);
  if (new Set(ids).size !== ids.length) throw new TypeError('卡片 id 重複');
  let placed = 0, score = 0, closed = false;
  const missed = new Set();
  const snapshot = () => ({ placed, total: cards.length, score, complete: placed === cards.length, closed });
  function place(id) {
    if (closed || placed >= cards.length || !ids.includes(id) || ids.indexOf(id) < placed) return { kind: 'ignored', ...snapshot() };
    const slot = placed, expected = cards[slot];
    if (id !== expected.id) {
      missed.add(slot);
      return { kind: 'incorrect', slot, card: cards[ids.indexOf(id)], ...snapshot() };
    }
    if (!missed.has(slot)) score++;
    placed++;
    return { kind: 'correct', slot, card: expected, firstTry: !missed.has(slot), ...snapshot() };
  }
  function finish() { if (closed || placed !== cards.length) return null; closed = true; return { status: 'completed', total: cards.length, score }; }
  function cancel() { if (closed) return null; closed = true; return { status: 'cancelled', total: cards.length, score: 0 }; }
  return { cards, place, finish, cancel, snapshot };
}

/** 組合：每步依序點零件（可重複），送出時比對 target；每步第一次送出就對才計分，錯了可以清掉重拼。 */
export function createBuildRound(steps) {
  if (!Array.isArray(steps) || !steps.length) throw new TypeError('組合至少要一步');
  for (const s of steps) if (!s || !Array.isArray(s.parts) || !Array.isArray(s.target) || !s.target.length || s.target.some(i => !Number.isInteger(i) || i < 0 || i >= s.parts.length)) throw new TypeError('組合步驟資料不完整');
  let index = 0, score = 0, closed = false, tries = 0, solved = false;
  let picks = [];
  const snapshot = () => ({ index, total: steps.length, score, picks: [...picks], solved, tries, closed, complete: index >= steps.length });
  const current = () => (closed || index >= steps.length ? null : steps[index]);
  function pick(i) { const s = current(); if (!s || solved || !Number.isInteger(i) || i < 0 || i >= s.parts.length || picks.length >= Math.max(s.target.length, 8)) return { kind: 'ignored', ...snapshot() }; picks.push(i); return { kind: 'picked', ...snapshot() }; }
  function undo() { if (!current() || solved || !picks.length) return { kind: 'ignored', ...snapshot() }; picks.pop(); return { kind: 'undone', ...snapshot() }; }
  function clear() { if (!current() || solved) return { kind: 'ignored', ...snapshot() }; picks = []; return { kind: 'cleared', ...snapshot() }; }
  function submit() {
    const s = current();
    if (!s || solved || !picks.length) return { kind: 'ignored', ...snapshot() };
    tries++;
    // 比對拼出來的文字，不比索引：同樣的零件出現兩次時，點哪一個都算對。
    const built = picks.map(i => s.parts[i]).join(''), want = s.target.map(i => s.parts[i]).join('');
    if (built === want) { solved = true; if (tries === 1) score++; return { kind: 'correct', firstTry: tries === 1, built, want, ...snapshot() }; }
    return { kind: 'incorrect', built, want, ...snapshot() };
  }
  function next() { if (!solved) return { kind: 'ignored', ...snapshot() }; index++; picks = []; tries = 0; solved = false; return { kind: index >= steps.length ? 'end' : 'step', ...snapshot() }; }
  function finish() { if (closed || index < steps.length) return null; closed = true; return { status: 'completed', total: steps.length, score }; }
  function cancel() { if (closed) return null; closed = true; return { status: 'cancelled', total: steps.length, score: 0 }; }
  return { steps, current, pick, undo, clear, submit, next, finish, cancel, snapshot };
}
