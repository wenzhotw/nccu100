// src/systems/baozhong/stage2/index.js（T074，Grok）：兩階段攤位的試作接線。v1.64 起預設開啟（Wenzel 2026-10-22 09:24 決定）；網址加 ?bz26stage2=0 可暫時關閉，回到原本流程。
// 不改包種茶節既有的 index.js（有雜湊鎖）；在它建好 NPC 之後，把試作攤位、所屬學院關主與大會考 NPC 的互動換成兩階段流程。
// 關閉時本模組什麼都不做，預設遊戲、老校長問答與存檔格式都不變；新增的旗標只有 bz26_adv_<攤位>，獎勵沿用既有 bz26_can_*。
import CONTENT from '../../../content/baozhong.json';
import DATA from '../../../content/baozhong-minigames.json';
import * as L from '../passport-logic.js';
import { prepareQuiz, shuffleQuestion } from '../quiz-utils.js';
import { createFlow } from '../flow-core.js';
import { openMatching, cancelMatching } from '../matching.js';
import { setPassportViewDecorator, refreshPassport } from '../passport-ui.js';
import { AU, NPCS, openChoice, openDialog, openQuiz, setFlag, showAchievement, state, toast } from '../deps.js';
import { createStageController } from './stage-core.js';
import { stepsFromGame } from './rounds.js';
import { openFeedbackRound, cancelStage } from './stage-ui.js';

const params = new URLSearchParams(globalThis.location ? location.search : '');
export const STAGE2 = params.get(DATA.flag) !== '0';

if (STAGE2) {
  const F = createFlow({ logic: L, prepareQuiz, content: CONTENT });
  const SC = createStageController({ logic: L, content: CONTENT, data: DATA, shuffle: shuffleQuestion });
  const flags = () => state.flags || (state.flags = new Set());
  const active = () => flags().has('bz26_active');
  let epoch = 0, wasActive = active();
  // 離場（服務台、邀請人、大會考收起）或讀檔讓會場消失時，關掉進行中的小遊戲；舊視窗回來也不結算。
  setInterval(() => { const now = active(); if (wasActive && !now) { epoch++; cancelStage(); cancelMatching(); } wasActive = now; }, 250);

  const apply = r => {
    if (!r) return;
    for (const c of r.clear || []) { state[c] = false; flags().delete(c); }
    for (const s of r.set || []) setFlag(s);
    refreshPassport();
  };
  const say = (title, lines, then) => openDialog(title, lines, then);
  function grant(ids, done) {
    const list = (ids || []).filter(id => !state['achv_' + id]);
    if (!list.length) { done && done(); return; }
    const id = list.shift(), a = F.achievementInfo(id);
    setFlag('achv_' + id);
    showAchievement({ title: a.name, desc: a.desc, icon: '🍵' }, () => grant(list, done));
  }
  const afterResult = done => grant(F.newAchievements(flags()), done);
  const stale = token => token !== epoch || !active();

  function playGame(game) {
    if (game.type === 'matching') {
      return openMatching({ title: game.title, intro: game.intro.map(l => l.text), revealPairs: false, pairs: game.pairs.map(({ id, left, right, explain }) => ({ id, left, right, explain })) }, { state });
    }
    return openFeedbackRound({ title: game.title, intro: game.intro.map(l => l.text), mode: game.type === 'classify' ? 'classify' : 'choice', steps: stepsFromGame(game) }, { state });
  }
  async function playFirst(id, title) {
    const token = epoch, game = SC.games.get(id);
    const result = await playGame(game);
    if (result.status !== 'completed' || stale(token)) return;   // 取消、離場都不結算
    const r = SC.firstResult(flags(), id, result);
    apply(r); AU.sfx('win');
    const line = r.stamped ? '小遊戲完成，攤位章蓋好了！下次回來可以挑戰進階版。' : '小遊戲完成！這攤的章之前就蓋過了，不會重複給。';
    say(title, [line, `首次答對 ${r.score}／${r.total}。`], () => { if (r.gained) toast(`茶葉點數 +${r.gained}`); afterResult(); });
  }
  async function playAdvanced(id, title) {
    const token = epoch, b = CONTENT.booths.find(x => x.id === id);
    const qs = SC.advancedQuestions(id, Math.random);
    const result = await openFeedbackRound({
      title: `${b.quiz.title}（進階版）`, mode: 'choice', doneText: '答完了！答對 {score}／{total}；進階版要全對才過關。',
      steps: qs.map(q => ({ prompt: q.q, options: q.options, answer: q.answer, explain: q.hasExplain ? q.explain : '' })),
    }, { state });
    if (result.status !== 'completed' || stale(token)) return;
    const r = SC.advancedResult(flags(), id, result);
    apply(r); AU.sfx(r.passed ? 'win' : 'faint');
    const line = !r.passed ? `進階版要全對才過關，這次答對 ${r.score}／${r.total}。想好了可以再挑戰。`
      : !r.set.length ? '進階全對！這攤的進階挑戰之前就過關了。'
      : r.reward ? `進階全對！送你一個進階茶罐（${SC.passportExtras(flags()).cans}／5）。` : '進階全對！這攤的進階挑戰過關了，護照上會記一筆。';
    say(title, [line], () => { if (r.gained) toast(`茶葉點數 +${r.gained}（進階茶罐）`); afterResult(); });
  }
  function onStageBooth(id) {
    const s = SC.stageFor(flags(), id), t = F.boothTalk(id);
    if (s.kind === 'first') {
      say(t.title, t.lines, () => openChoice(['玩小遊戲', '下次再來'], i => { if (i === 0) playFirst(id, t.title); }));
      return;
    }
    const lines = [s.advancedDone ? '進階版你已經過關了！想再練習也可以，不會重複給獎勵。'
      : `歡迎回來！這次可以挑戰進階版：每題都會告訴你對錯，全部答對才過關${s.reward ? '，過關送一個進階茶罐' : ''}。`];
    say(t.title, lines, () => openChoice(['進階挑戰（全對才過）', '再玩一次小遊戲', '下次再來'], i => {
      if (i === 0) playAdvanced(id, t.title); else if (i === 1) playFirst(id, t.title);
    }));
  }

  function askHints(questions, go) {
    const opts = F.hintChoices(flags(), questions);
    if (opts.length <= 1) { go(0); return; }
    openChoice(opts.map(k => (k ? `用 ${k} 張提示卡` : '不用提示卡')), i => go(opts[i]));
  }
  function onStageMaster(cid) {
    const c = CONTENT.colleges.find(k => k.id === cid), g = F.master(flags(), cid);
    say(c.master.title, g.lines, () => {
      if (g.kind !== 'ready') return;
      const qs = SC.masterQuestions(cid, Math.random).questions;
      askHints(qs, async k => {
        const p = F.prepare(flags(), qs, k, Math.random); apply(p);
        const score = await openQuiz({ title: `${c.name}關主問答`, questions: p.questions });
        const r = F.masterDone(flags(), cid, score); apply(r); AU.sfx(r.passed ? 'win' : 'faint');
        say(c.master.title, r.lines, () => afterResult());
      });
    });
  }
  function onStageExam() {
    const g = F.exam(flags());
    say(CONTENT.exam.npc.title, g.lines, () => {
      if (g.kind !== 'ready') return;
      openChoice(g.choices, i => {
        if (i !== 0) return;
        const qs = SC.examDraw(flags(), Math.random).questions;
        askHints(qs, async k => {
          const p = F.prepare(flags(), qs, k, Math.random); apply(p);
          const score = await openQuiz({ title: CONTENT.exam.title, questions: p.questions });
          const r = F.examDone(flags(), score); apply(r); AU.sfx(r.passed ? 'win' : 'faint');
          // 收起會場由原模組每 0.5 秒的 sync 處理（看 bz26_active）。
          say(CONTENT.exam.npc.title, r.lines, () => grant([...(r.achieve || []), ...F.newAchievements(flags())], () => { if (r.collapse) toast('包種茶節會場已收起，進度都保留著'); }));
        });
      });
    });
  }

  const npc = id => NPCS.find(n => n.id === id);
  const rewired = [];
  for (const id of SC.games.keys()) { const n = npc(`bz26-${id}`); if (n) { n.spot.fn = () => onStageBooth(id); rewired.push(n.id); } }
  const pilotColleges = CONTENT.colleges.filter(c => c.booths.some(id => SC.games.has(id))).map(c => c.id);
  for (const cid of pilotColleges) { const n = npc(`bz26-${cid}`); if (n) { n.spot.fn = () => onStageMaster(cid); rewired.push(n.id); } }
  { const n = npc('bz26-EXAM'); if (n) { n.spot.fn = onStageExam; rewired.push(n.id); } }
  setPassportViewDecorator(view => SC.decorateView(view, flags()));
  if (rewired.length !== SC.games.size + pilotColleges.length + 1) console.warn('[bz26 stage2] 部分 NPC 沒有找到，該處維持原流程', rewired);

  if (import.meta.env.DEV || params.has('debug')) {
    globalThis.__bz26stage2 = { SC, flags, rewired, pilotColleges, onStageBooth, onStageMaster, onStageExam, epoch: () => epoch };
  }
}
