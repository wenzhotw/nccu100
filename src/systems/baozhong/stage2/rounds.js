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
  throw new TypeError(`回合引擎不處理 ${game.type}`);
}
