// T074 兩階段攤位試作的單元測試（Grok）。只測純邏輯與資料追溯；畫面由 scripts/bz26-stage2-shots.mjs 用 Playwright 截圖。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as L from '../src/systems/baozhong/passport-logic.js';
import { prepareQuiz, shuffleQuestion, makeRng } from '../src/systems/baozhong/quiz-utils.js';
import { createStageController, traceErrors, indexGames, resolveTrace, advFlag, gameSteps } from '../src/systems/baozhong/stage2/stage-core.js';
import { createFeedbackRound, stepsFromGame } from '../src/systems/baozhong/stage2/rounds.js';
import { createMatchingRound } from '../src/systems/baozhong/matching-core.js';
import { renderPassportHTML } from '../src/systems/baozhong/passport-ui.js';

const read = rel => JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), 'utf8'));
const C = read('../src/content/baozhong.json');
const DATA = read('../src/content/baozhong-minigames.json');
const SC = () => createStageController({ logic: L, content: C, data: DATA, shuffle: shuffleQuestion });
const apply = (flags, r) => { const f = new Set(flags); for (const c of r.clear || []) f.delete(c); for (const s of r.set || []) f.add(s); return f; };
const done = (total, score) => ({ status: 'completed', total, score });
const PILOTS = { D26: 'matching', D19: 'classify', D13: 'situation' };

test('pilot data: three pilot booths keep their types and distinct existing reward flags', () => {
  const games = indexGames(DATA, C);
  for (const [id, type] of Object.entries(PILOTS)) assert.equal(games.get(id).type, type);
  for (const id of Object.keys(PILOTS)) assert.match(games.get(id).advanced.reward, /^bz26_(can_[1-5]|hs_(RADIO|STAGE|FRIEND))$/);
  assert.equal(DATA.flag, 'bz26stage2');
});

test('every answer, intro line and explanation traces verbatim to baozhong.json (no invented facts)', () => {
  assert.deepEqual(traceErrors(C, DATA), []);
  assert.equal(resolveTrace(C, 'D13.after.pass'), C.booths.find(b => b.id === 'D13').after.pass);
  assert.equal(resolveTrace(C, 'D99.npc.lines.0'), null);
  // 反例：一個不在內容裡的引文必須被抓出來。
  const bad = structuredClone(DATA); bad.games[0].pairs[0].trace.quote = '大三讀日本名著';
  assert.equal(traceErrors(C, bad).length, 1);
  // 情境題的正解要和攤位原本的數字算式一致。
  const d13 = DATA.games.find(g => g.booth === 'D13');
  assert.deepEqual(d13.steps.map(s => s.choices[s.answer]), ['300點', '250點', '50點']);
  assert.equal(15 * 20 - 15 * 10 - 100, 50);
});

test('stage transitions: legacy booth unchanged, first visit, return visit, advanced done', () => {
  const sc = SC();
  let f = new Set(['bz26_active']);
  assert.equal(sc.stageFor(f, 'D01').kind, 'legacy');
  for (const id of Object.keys(PILOTS)) assert.equal(sc.stageFor(f, id).kind, 'first');
  const n = gameSteps(sc.games.get('D26'));
  f = apply(f, sc.firstResult(f, 'D26', done(n, n)));
  assert.deepEqual(sc.stageFor(f, 'D26'), { kind: 'return', game: sc.games.get('D26'), advancedDone: false, reward: 'bz26_can_1' });
  const qn = C.booths.find(b => b.id === 'D26').quiz.questions.length;
  f = apply(f, sc.advancedResult(f, 'D26', done(qn, qn)));
  assert.equal(sc.stageFor(f, 'D26').advancedDone, true);
  assert.equal(sc.stageFor(f, 'D19').kind, 'first');
});

test('first visit awards the normal stamp exactly once; perfect only when every step first-try correct', () => {
  const sc = SC(); let f = new Set();
  const n = gameSteps(sc.games.get('D19'));
  const r1 = sc.firstResult(f, 'D19', done(n, n - 2));
  assert.deepEqual(r1.set, ['bz26_st_D19']); assert.equal(r1.gained, 2); assert.equal(r1.perfect, false);
  f = apply(f, r1); const p1 = L.points(f);
  const r2 = sc.firstResult(f, 'D19', done(n, n - 2));
  assert.deepEqual(r2.set, []); assert.equal(r2.gained, 0);
  const r3 = sc.firstResult(f, 'D19', done(n, n));
  assert.deepEqual(r3.set, ['bz26_pf_D19']); assert.equal(r3.gained, 1);
  f = apply(f, r3); assert.equal(L.points(f), p1 + 1);
  assert.deepEqual(sc.firstResult(f, 'D19', done(n, n)).set, []);
  assert.equal(L.collegeReady(f, C.colleges.find(c => c.id === 'C04')), false, '只有一攤，學院還不能挑戰');
});

test('cancel leaves no partial award (first visit, advanced, and both round engines)', () => {
  const sc = SC(); const f = new Set(['bz26_st_D13']);
  assert.deepEqual(sc.firstResult(new Set(), 'D13', { status: 'cancelled', total: 3, score: 0 }).set, []);
  assert.deepEqual(sc.firstResult(new Set(), 'D13', null).set, []);
  assert.deepEqual(sc.advancedResult(f, 'D13', { status: 'cancelled', total: 2, score: 2 }).set, []);
  const g = sc.games.get('D13'), round = createFeedbackRound(stepsFromGame(g));
  round.answer(0); round.next(); round.answer(0);
  assert.equal(round.finish(), null, '沒答完不能結算');
  assert.deepEqual(round.cancel(), { status: 'cancelled', total: 3, score: 0 });
  assert.equal(round.finish(), null); assert.equal(round.answer(0).kind, 'ignored');
  const m = createMatchingRound({ title: 't', intro: ['x'], pairs: sc.games.get('D26').pairs }, makeRng(1));
  m.match('conversation', 'conversation');
  assert.deepEqual(m.cancel(), { status: 'cancelled', total: 3, score: 0 });
});

test('feedback round: one answer per step, immediate right/wrong with correct text and explanation', () => {
  const steps = stepsFromGame(SC().games.get('D19'));
  const round = createFeedbackRound(steps);
  const wrong = round.answer(1 - steps[0].answer);
  assert.equal(wrong.correct, false); assert.equal(wrong.correctText, '事實'); assert.ok(wrong.explain.length > 0);
  assert.equal(round.answer(steps[0].answer).kind, 'ignored', '同一步不能改答案刷分');
  for (let i = 1; i < steps.length; i++) { round.next(); assert.equal(round.answer(steps[i].answer).correct, true); }
  assert.equal(round.next().kind, 'end');
  assert.deepEqual({ ...round.finish(), log: undefined }, { status: 'completed', total: 5, score: 4, log: undefined });
});

test('advanced: requires the stamp, all correct, no double award on replay', () => {
  const sc = SC();
  for (const id of Object.keys(PILOTS)) {
    const n = C.booths.find(b => b.id === id).quiz.questions.length;
    assert.equal(sc.advancedResult(new Set(), id, done(n, n)).passed, false, '沒有初訪章不能拿進階');
    let f = new Set([`bz26_st_${id}`]);
    assert.equal(sc.advancedResult(f, id, done(n, n - 1)).passed, false, '差一題也不過');
    assert.equal(sc.advancedResult(f, id, done(n - 1, n - 1)).passed, false, '題數必須等於原題數');
    const r = sc.advancedResult(f, id, done(n, n));
    const reward = sc.games.get(id).advanced.reward;
    assert.deepEqual(r.set, [advFlag(id), reward]); assert.equal(r.gained, 1);
    const before = L.points(f); f = apply(f, r); assert.equal(L.points(f), before + 1, '茶罐沿用既有點數公式');
    const again = sc.advancedResult(f, id, done(n, n));
    assert.equal(again.passed, true); assert.deepEqual(again.set, []); assert.equal(again.gained, 0);
  }
});

test('advanced does not gate medals: college readiness and master rule only look at normal stamps', () => {
  const c05 = C.colleges.find(c => c.id === 'C05');
  const f = new Set(c05.booths.map(id => `bz26_st_${id}`));
  assert.equal(L.collegeReady(f, c05), true);
  assert.deepEqual(L.collegeResult(f, 'C05', 4).set, ['bz26_md_C05']);
});

test('advanced questions keep the original booth quiz; explanation from content, else the correct answer', () => {
  const sc = SC(), rng = makeRng(7);
  for (const id of Object.keys(PILOTS)) {
    const b = C.booths.find(x => x.id === id), qs = sc.advancedQuestions(id, rng);
    assert.equal(qs.length, b.quiz.questions.length);
    qs.forEach((q, i) => {
      const o = b.quiz.questions[i];
      assert.equal(q.q, o.q); assert.equal(q.correct, o.options[o.answer]); assert.equal(q.options[q.answer], q.correct);
      if (!q.hasExplain) assert.equal(q.explain, `正確答案：${q.correct}`);
    });
  }
  assert.deepEqual(sc.advancedQuestions('D19', rng).map(q => q.hasExplain), [true, false, false]);
});

test('master and exam questions are built from first-visit minigame data', () => {
  const sc = SC(), rng = makeRng(3);
  const derivedAll = new Map(sc.buildQuestionPool(C.colleges.map(c => c.id)).map(q => [q.q, q]));
  assert.equal(derivedAll.size, [...sc.games.values()].reduce((n, g) => n + gameSteps(g), 0));
  for (const [cid, booth] of [['C05', 'D26'], ['C04', 'D19'], ['C03', 'D13']]) {
    const m = sc.masterQuestions(cid, rng), c = C.colleges.find(x => x.id === cid);
    assert.equal(m.questions.length, c.quiz.length, '關主題數不變，過關門檻照舊 4/5');
    assert.equal(m.derived.length, 1, '驗收 CLD-001 M2：每院關主最多 1 題小遊戲題'); assert.ok(c.booths.includes(m.derived[0].booth) && sc.games.has(m.derived[0].booth), booth);
    const inQuiz = m.questions.filter(q => derivedAll.has(q.q));
    assert.equal(inQuiz.length, 1);
    const d = derivedAll.get(inQuiz[0].q); assert.equal(inQuiz[0].options[inQuiz[0].answer], d.options[d.answer]);
    prepareQuiz(m.questions, { rng });
  }
  // 沒有小遊戲攤位的學院：只用原題庫。
  const plain = C.colleges.find(c => !c.booths.some(id => sc.games.has(id)));
  if (plain) assert.equal(sc.masterQuestions(plain.id, rng).derived.length, 0);
  const f = new Set(['bz26_md_C03', 'bz26_md_C04', 'bz26_md_C05']);
  const ex = sc.examDraw(f, rng);
  assert.equal(ex.questions.length, L.EXAM_SIZE);
  assert.equal(ex.derived.length, 3, '驗收 CLD-001 M1：每院最多 1 題');
  assert.equal(ex.questions.filter(q => derivedAll.has(q.q)).length, 3);
  assert.equal(new Set(ex.questions.map(q => q.q)).size, 10);
  prepareQuiz(ex.questions, { rng, hints: 2 });
  // 小遊戲題不能固定排在最前面：多個種子下前三題不會總是小遊戲題。
  let allFront = 0;
  for (let s = 0; s < 200; s++) { const e = sc.examDraw(f, makeRng(s)); if (e.questions.slice(0, 3).every(q => derivedAll.has(q.q))) allFront++; }
  assert.ok(allFront < 20, `小遊戲題排在最前面的次數過多：${allFront}/200`);
  // 沒有試作學院勳章時，大會考等同原本的抽題。
  const g = new Set(['bz26_md_C06', 'bz26_md_C07', 'bz26_md_C08']);
  assert.deepEqual(sc.examDraw(g, makeRng(5)).questions, L.drawExam(C, g, makeRng(5)).map(({ q, options, answer }) => ({ q, options, answer })));
});

test('situation questions in the master/exam pool carry their own premise (CLD-001 M3)', () => {
  const sc = SC();
  const premise = C.booths.find(b => b.id === 'D13').npc.lines[2];
  for (const q of sc.questionsFromGame(sc.games.get('D13'))) {
    assert.ok(q.q.startsWith(premise), q.q);
    assert.match(q.q, /15杯/); assert.match(q.q, /每杯20點/); assert.match(q.q, /租金100點/);
  }
  const bad = structuredClone(DATA); bad.games.find(g => g.booth === 'D13').pool.context.text = '假想茶攤賣16杯';
  assert.ok(traceErrors(C, bad).some(e => e.includes('pool.context')));
});

test('matching pool questions map each left card to its own right card', () => {
  const sc = SC();
  const qs = sc.questionsFromGame(sc.games.get('D26'));
  assert.deepEqual(qs.map(q => q.options[q.answer]), ['日語會話演習', '日本專題研究', '山梨縣的交換留學合作校']);
  const cls = sc.questionsFromGame(sc.games.get('D19'));
  assert.deepEqual(cls.map(q => q.options[q.answer]), ['事實', '意見', '意見', '事實', '事實']);
});

test('old-save compatibility: old flags load unchanged, only new bz26_adv_* flags are added', () => {
  const sc = SC();
  const oldSave = JSON.parse(JSON.stringify({ v: 1, flags: ['bz26_active', 'bz26_st_D26', 'bz26_pf_D26', 'bz26_st_D01', 'bz26_md_C06', 'bz26_hint_1', 'bz26_hintu_1', 'achv_bz26_explorer', 'met_principal'] }));
  const f = new Set(oldSave.flags);
  const before = L.points(f), view = L.passportView(f, C);
  assert.equal(sc.stageFor(f, 'D26').kind, 'return', '舊檔已有日文章：直接進回訪，可挑進階');
  assert.equal(sc.stageFor(f, 'D19').kind, 'first');
  assert.equal(sc.stageFor(f, 'D01').kind, 'legacy');
  const dv = sc.decorateView(view, f);
  assert.deepEqual(dv.advanced, { cans: 0, total: 5, done: 0, available: sc.games.size });
  assert.deepEqual({ ...dv, advanced: undefined, colleges: undefined }, { ...view, advanced: undefined, colleges: undefined });
  assert.equal(L.points(f), before);
  // 存回去再讀：只多了新的旗標，舊旗標一個不少。
  const n = C.booths.find(b => b.id === 'D26').quiz.questions.length;
  const g = apply(f, sc.advancedResult(f, 'D26', done(n, n)));
  const reloaded = new Set(JSON.parse(JSON.stringify({ flags: [...g] })).flags);
  for (const x of oldSave.flags) assert.ok(reloaded.has(x));
  assert.deepEqual([...reloaded].filter(x => !f.has(x)).sort(), ['bz26_adv_D26', 'bz26_can_1']);
  // 一般規則（沒有開實驗旗標的版本）讀到新旗標也不會出錯。
  assert.equal(L.points(reloaded), before + 1);
  assert.equal(L.passportView(reloaded, C).colleges.length, C.colleges.length);
});

test('passport: default render has no advanced UI; decorated view shows cans and per-booth status', () => {
  const sc = SC(), f = new Set(['bz26_st_D26', 'bz26_adv_D26', 'bz26_can_1']);
  const plain = renderPassportHTML(L.passportView(f, C), { selectedCollegeId: 'C05' });
  assert.ok(!plain.includes('進階')); assert.ok(!plain.includes('bz-advanced'));
  const html = renderPassportHTML(sc.decorateView(L.passportView(f, C), f), { selectedCollegeId: 'C05' });
  assert.ok(html.includes('進階茶罐：1／5')); assert.ok(html.includes('🍵 進階'));
});

test('wiring is flag-gated and does not touch hash-locked files', () => {
  const src = fs.readFileSync(new URL('../src/systems/baozhong/stage2/index.js', import.meta.url), 'utf8');
  assert.match(src, /export const STAGE2 = params\.get\(DATA\.flag\) !== '0';/);
  assert.match(src, /\nif \(STAGE2\) \{/);
  const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(main.indexOf("systems/baozhong/index.js") < main.indexOf("systems/baozhong/stage2/index.js"));
  assert.ok(main.indexOf("systems/baozhong/stage2/index.js") < main.indexOf("systems/save.js"));
  const lock = read('./baozhong-scenery-lock.json');
  for (const [rel, hash] of Object.entries(lock.expected)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../' + rel, import.meta.url))).digest('hex'), hash, rel);
});

// v1.66 第一批擴充（17 系）
const BATCH1 = { D02: 'matching', D05: 'matching', D08: 'matching', D21: 'matching', D23: 'matching', D25: 'matching', D30: 'matching', D06: 'classify', D20: 'classify', D29: 'classify', D09: 'situation', D10: 'situation', D11: 'situation', D12: 'situation', D15: 'situation', D17: 'situation', D18: 'situation' };

test('batch 1: 17 booths with the planned template, every answer traced, no reward flags spent', () => {
  const sc = SC();
  assert.equal(sc.games.size, 20);
  for (const [id, type] of Object.entries(BATCH1)) {
    const g = sc.games.get(id);
    assert.ok(g, id); assert.equal(g.type, type, id);
    assert.equal(g.advanced.reward, undefined, `${id} 茶罐用途待決定，不先發`);
    assert.ok(gameSteps(g) >= 2 && gameSteps(g) <= 6, `${id} 步數要短`);
  }
  assert.deepEqual(traceErrors(C, DATA), []);
});

test('batch 1: advanced pass without a reward flag records the pass but gives no can or points', () => {
  const sc = SC();
  const n = C.booths.find(b => b.id === 'D02').quiz.questions.length;
  let f = new Set(['bz26_st_D02']);
  const before = L.points(f);
  const r = sc.advancedResult(f, 'D02', done(n, n));
  assert.equal(r.passed, true); assert.deepEqual(r.set, ['bz26_adv_D02']); assert.equal(r.gained, 0);
  f = apply(f, r); assert.equal(L.points(f), before);
  assert.equal(sc.stageFor(f, 'D02').advancedDone, true);
  assert.equal(sc.stageFor(f, 'D02').reward, undefined);
});

test('batch 1: situation choices give per-choice consequences', () => {
  const sc = SC();
  const steps = stepsFromGame(sc.games.get('D15'));
  const round = createFeedbackRound(steps);
  round.answer(steps[0].answer); round.next();
  const wrong = round.answer(0);
  assert.equal(wrong.correct, false); assert.match(wrong.explain, /製茶仍然最慢/);
  const r2 = createFeedbackRound(steps); r2.answer(steps[0].answer); r2.next();
  assert.match(r2.answer(steps[1].answer).explain, /瓶頸/);
});

test('batch 1: master and exam still use at most one minigame question per college', () => {
  const sc = SC();
  for (const c of C.colleges) {
    for (let s = 0; s < 20; s++) assert.ok(sc.masterQuestions(c.id, makeRng(s)).derived.length <= 1, c.id);
  }
  const all = new Set(C.colleges.map(c => 'bz26_md_' + c.id));
  for (let s = 0; s < 50; s++) {
    const ex = sc.examDraw(all, makeRng(s));
    assert.equal(ex.questions.length, L.EXAM_SIZE);
    const byCollege = new Map();
    for (const d of ex.derived) { const cid = C.booths.find(b => b.id === d.booth).college; byCollege.set(cid, (byCollege.get(cid) || 0) + 1); }
    assert.ok([...byCollege.values()].every(n => n === 1));
    prepareQuiz(ex.questions, { rng: makeRng(s), hints: 3 });
  }
});
