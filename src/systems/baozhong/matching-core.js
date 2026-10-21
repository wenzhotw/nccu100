/** 三組配對的純邏輯。只回報分數，護照旗標與獎勵由既有結算處理。 */
export function validateMatching(config) {
  if (!config || typeof config.title !== 'string' || !config.title.trim()
    || !Array.isArray(config.intro) || !config.intro.length
    || config.intro.some(line => typeof line !== 'string' || !line.trim())
    || !Array.isArray(config.pairs) || config.pairs.length !== 3) {
    throw new TypeError('配對需要標題、介紹與三組配對。');
  }
  for (const key of ['id', 'left', 'right']) {
    const values = config.pairs.map(pair => pair && pair[key]);
    if (values.some(value => typeof value !== 'string' || !value.trim()) || new Set(values).size !== 3) {
      throw new TypeError(`配對的 ${key} 必須是三個不同的非空字串。`);
    }
  }
  return config;
}

export function createMatchingRound(config, rng = Math.random) {
  validateMatching(config);
  const pairs = config.pairs.map(pair => ({ ...pair }));
  const rightOrder = pairs.map(pair => pair.id);
  for (let i = rightOrder.length - 1; i > 0; i--) {
    const value = Number(rng());
    const r = Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : 0;
    const j = Math.floor(r * (i + 1));
    [rightOrder[i], rightOrder[j]] = [rightOrder[j], rightOrder[i]];
  }
  // 不讓初始答案恰巧全部排列在同一列。
  if (rightOrder.every((id, i) => id === pairs[i].id)) rightOrder.push(rightOrder.shift());
  const matched = new Set(), attempted = new Set();
  let score = 0, closed = false;
  function snapshot() {
    return { total: pairs.length, score, matched: [...matched], attempted: [...attempted], complete: matched.size === pairs.length, closed };
  }
  function match(leftId, rightId) {
    if (closed || !pairs.some(pair => pair.id === leftId) || !pairs.some(pair => pair.id === rightId)
      || matched.has(leftId) || matched.has(rightId)) return { kind: 'ignored', ...snapshot() };
    const firstAttempt = !attempted.has(leftId);
    attempted.add(leftId);
    const correct = leftId === rightId;
    if (correct) {
      matched.add(leftId);
      if (firstAttempt) score++;
    }
    return { kind: correct ? 'correct' : 'incorrect', firstAttempt, ...snapshot() };
  }
  function finish() {
    if (closed || matched.size !== pairs.length) return null;
    closed = true;
    return { status: 'completed', total: pairs.length, score };
  }
  function cancel() {
    if (closed) return null;
    closed = true;
    return { status: 'cancelled', total: pairs.length, score: 0 };
  }
  return { pairs, rightOrder, snapshot, match, finish, cancel };
}
