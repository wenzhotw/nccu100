// src/systems/baozhong/flow-core.js（P06 重建，Grok，T065）：包種茶節流程的純決策。
// 不 import 任何東西：passport-logic（P01）、prepareQuiz（P02）、內容由呼叫端傳入；旗標一律是 Set<string>，
// 回傳 {set, clear} 給整合層套用（先 clear 再 set），台詞只取凍結 baozhong.json（a686d556）的字句。
// 規則依據：T055 1 至 5、T057、P01 README 11 項解讀。

export function createFlow({ logic: L, prepareQuiz, content: C }) {
  const booth = new Map(C.booths.map(b => [b.id, b]));
  const college = new Map(C.colleges.map(c => [c.id, c]));
  const fn = new Map((C.functions || []).map(f => [f.id, f]));
  const none = { set: [], clear: [] };

  /** 把 {set, clear} 套到 flags 的副本（測試與預覽用；遊戲裡由 index.js 寫進 state）。 */
  function apply(flags, r) {
    const f = new Set(flags);
    for (const c of (r && r.clear) || []) f.delete(c);
    for (const s of (r && r.set) || []) f.add(s);
    return f;
  }
  const active = flags => flags.has('bz26_active');

  /** 邀請人：還沒參加→invite（第一次）或 again（拿過探索者成就）；參加中→提醒加「離開會場」選項。 */
  function host(flags) {
    if (active(flags)) return { kind: 'active', lines: [...C.host.accept], choices: ['繼續逛', '離開會場'] };
    const again = flags.has('achv_bz26_explorer');
    return { kind: again ? 'again' : 'invite', lines: [...(again ? C.host.again : C.host.invite)], choices: ['好，我要參加', '下次再說'] };
  }
  const accept = flags => L.startRound(flags);
  const decline = () => ({ lines: [...C.host.decline] });
  const leave = () => ({ ...L.leave(), lines: [...C.service.leave] });

  /** 系攤：台詞→挑戰；題目洗牌（系攤不用提示卡，T055 3）。 */
  function boothTalk(id) { const b = booth.get(id); return b ? { title: b.npc.title, lines: [...b.npc.lines], choices: ['接受挑戰', '下次再來'] } : null; }
  function boothQuiz(id, rng) { const b = booth.get(id); return { title: b.quiz.title, questions: prepareQuiz(b.quiz.questions, { rng, hints: 0 }).questions }; }
  function boothDone(flags, id, score) {
    const b = booth.get(id), n = b.quiz.questions.length, r = L.boothResult(flags, id, n, score);
    const line = r.perfect ? b.after.perfect : r.passed ? b.after.pass : b.after.fail;
    return { ...r, clear: r.clear || [], lines: [line] };
  }

  /** 提示卡選項：0 到 min(剩餘張數, 3 個選項以上的題數)。 */
  function hintChoices(flags, questions) {
    const eligible = questions.filter(q => q.options.length >= 3).length, max = Math.min(L.hintsLeft(flags), eligible);
    return Array.from({ length: max + 1 }, (_, k) => k);
  }
  /** 依「實際刪掉幾題」扣卡（T057：hintsUsed 實際扣卡）。 */
  function prepare(flags, questions, k, rng) {
    const p = prepareQuiz(questions, { rng, hints: Math.max(0, Math.min(k | 0, L.hintsLeft(flags))) });
    const u = p.hintsUsed ? L.useHints(flags, p.hintsUsed) : { used: 0, set: [], clear: [] };
    return { questions: p.questions, hintsUsed: p.hintsUsed, set: u.set, clear: u.clear || [] };
  }

  /** 學院關主：沒蓋齊不讓考（P01 解讀 4：整合層先查 collegeReady）。 */
  function master(flags, cid) {
    const c = college.get(cid);
    if (L.medalCount && flags.has(`bz26_md_${cid}`)) return { kind: 'done', lines: [c.master.pass] };
    if (!L.collegeReady(flags, c)) return { kind: 'notReady', lines: [c.master.fail] };
    return { kind: 'ready', lines: [c.master.open], questions: c.quiz };
  }
  function masterDone(flags, cid, score) {
    const c = college.get(cid), r = L.collegeResult(flags, cid, score);
    return { ...r, clear: r.clear || [], lines: [r.passed ? c.master.pass : c.master.fail] };
  }

  /** 大會考：三枚勳章解鎖；本輪已過就只說恭喜。過關後同時離場收起（解讀：會場收起＝清 bz26_active）。 */
  function exam(flags) {
    if (flags.has('bz26_exam_pass')) return { kind: 'done', lines: [C.exam.pass] };
    if (!L.examUnlocked(flags)) return { kind: 'locked', lines: [C.service.lines[2]] };
    return { kind: 'ready', lines: [C.exam.open], choices: ['開始大會考', '再準備一下'] };
  }
  const examDraw = (flags, rng) => L.drawExam(C, flags, rng).map(({ q, options, answer }) => ({ q, options, answer }));
  function examDone(flags, score) {
    const r = L.examResult(flags, score);
    if (!r.passed) return { ...r, clear: r.clear || [], lines: [C.exam.fail] };
    const lv = L.leave();
    return { ...r, set: r.set, clear: [...(r.clear || []), ...lv.clear], lines: [C.exam.pass], collapse: true };
  }

  /** 服務台：買提示卡、離開會場。 */
  function service() { return { lines: [...C.service.lines], choices: ['換提示卡（3 點）', '離開會場', '先去逛逛'] }; }
  function buyHint(flags) { const r = L.buyHint(flags); return { ...r, clear: r.clear || [], lines: [...(r.ok ? C.service.hintOk : C.service.hintNo)] }; }
  function functionTalk(id) { const f = fn.get(id); return f ? { title: f.title, lines: [...f.lines] } : null; }

  const newAchievements = flags => L.collectionAchievements(flags, C);
  const achievementInfo = id => (C.achievements || []).find(a => a.id === id) || { id, name: id, desc: '' };
  return { apply, host, accept, decline, leave, boothTalk, boothQuiz, boothDone, hintChoices, prepare, master, masterDone, exam, examDraw, examDone, service, buyHint, functionTalk, newAchievements, achievementInfo, none };
}
