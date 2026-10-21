// scripts/baozhong-flow.test.mjs（P06 重建，Grok，T065）：flow-core 用正式 P01、P02 與凍結 baozhong.json（a686d556）走完整主線。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as L from '../src/systems/baozhong/passport-logic.js';
import { prepareQuiz, makeRng } from '../src/systems/baozhong/quiz-utils.js';
import { createFlow } from '../src/systems/baozhong/flow-core.js';

const RAW = fs.readFileSync(new URL('../src/content/baozhong.json', import.meta.url));
const C = JSON.parse(RAW);
const F = createFlow({ logic: L, prepareQuiz, content: C });
const perfect = (qs) => qs.length;

test('內容版本鎖：baozhong.json 是 a686d556…ca72，37 系 11 院', () => {
  assert.equal(crypto.createHash('sha256').update(RAW).digest('hex'), 'a686d5565cd8d36319d58e20579a4b5b713c4bfbd5c8f67541345a1d9fc9ca72');
  assert.equal(C.booths.length, 37); assert.equal(C.colleges.length, 11);
});

test('邀請：invite→答應設 bz26_active、清 exam_pass；參加中可離開；離開只清 active', () => {
  let f = new Set(['bz26_exam_pass']);
  assert.equal(F.host(f).kind, 'invite');
  f = F.apply(f, F.accept(f));
  assert.ok(f.has('bz26_active') && !f.has('bz26_exam_pass'));
  assert.equal(F.host(f).kind, 'active');
  f = F.apply(new Set([...f, 'bz26_st_D26']), F.leave());
  assert.deepEqual([...f], ['bz26_st_D26']);
  assert.equal(F.host(new Set(['achv_bz26_explorer'])).kind, 'again');
});

test('D26 單攤：題目洗牌後答案仍對、全對蓋章與全對星、重玩不重複給點、台詞取凍結內容', () => {
  let f = F.apply(new Set(), F.accept(new Set()));
  const q = F.boothQuiz('D26', makeRng(26));
  const src = C.booths.find(b => b.id === 'D26').quiz.questions;
  q.questions.forEach((x, i) => assert.equal(x.options[x.answer], src[i].options[src[i].answer]));
  const r = F.boothDone(f, 'D26', perfect(q.questions));
  assert.deepEqual([r.passed, r.perfect, r.gained], [true, true, 3]);
  assert.equal(r.lines[0], C.booths.find(b => b.id === 'D26').after.perfect);
  f = F.apply(f, r);
  assert.equal(L.points(f), 3);
  assert.equal(F.boothDone(f, 'D26', perfect(q.questions)).gained, 0);
  const fail = F.boothDone(new Set(), 'D26', 0); assert.equal(fail.passed, false); assert.deepEqual(fail.set, []);
});

test('完整主線：37 攤全對→買提示卡→11 院勳章（含用卡）→大會考過關收起、探索者只給一次、收集成就', () => {
  let f = F.apply(new Set(), F.accept(new Set()));
  for (const b of C.booths) f = F.apply(f, F.boothDone(f, b.id, b.quiz.questions.length));
  assert.equal(L.points(f), 111);
  assert.equal(F.master(new Set(), 'C01').kind, 'notReady');
  for (let i = 0; i < 2; i++) { const r = F.buyHint(f); assert.ok(r.ok); f = F.apply(f, r); }
  assert.equal(L.hintsLeft(f), 2);
  for (const c of C.colleges) {
    const g = F.master(f, c.id); assert.equal(g.kind, 'ready', c.id);
    const opts = F.hintChoices(f, g.questions);
    const p = F.prepare(f, g.questions, opts.at(-1), makeRng(1)); f = F.apply(f, p);
    f = F.apply(f, F.masterDone(f, c.id, 5));
  }
  assert.equal(L.hintsLeft(f), 0);
  assert.equal(L.medalCount(f), 11);
  assert.deepEqual(F.newAchievements(f).sort(), ['bz26_all_medals', 'bz26_all_stamps']);
  assert.equal(F.exam(f).kind, 'ready');
  const qs = F.examDraw(f, makeRng(7)); assert.equal(qs.length, 10);
  const r = F.examDone(f, 7);
  assert.ok(r.passed && r.collapse); assert.deepEqual(r.achieve, ['bz26_explorer']);
  f = F.apply(f, r); assert.ok(f.has('bz26_exam_pass') && !f.has('bz26_active'));
  f.add('achv_bz26_explorer');
  f = F.apply(f, F.accept(f));
  assert.deepEqual(F.examDone(f, 10).achieve, []);
  assert.equal(F.examDone(f, 6).passed, false);
});
