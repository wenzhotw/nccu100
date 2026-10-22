// src/systems/baozhong/programs-partners.js（v1.70，Claude，依 Wenzel 2026-10-22 指示）：跨域學程帳篷與友校交流的整合層。
// 1. 跨域學程帳篷：會場開時出現在噴水池看板與友校交流帳篷之間（大道西側），4 格各站一位學程代表。
//    每次對話第一句都說明「校內雙主修，不是正式科系，不能考進來；進政大以後才能申請」。
//    初訪玩小遊戲蓋學程章，回訪可挑戰 3 題進階（全對才過）。不算學院勳章、不進大會考、不加茶葉點數。
// 2. 友校交流：F03 帳篷前一排 4 位交流大使（清華、陽明交大、中央、北藝大），可翻看開放雙主修／輔系的學系清單；
//    F03 原本的引路人改成主持「友校配對」小遊戲。
// 不改有鎖檔保護的 index.js、tents.js：同 entry-radio.js，用 0.5 秒計時同步會場狀態，覆寫 F03 引路人的 spot.fn。
import { scene } from '../../core/engine.js';
import { toon, basic, canvasTex } from '../../render/kit.js';
import DATA from '../../content/baozhong-programs.json';
import LAYOUT from './layout.json';
import { addPassportViewDecorator, refreshPassport } from './passport-ui.js';
import { openMatching } from './matching.js';
import { openFeedbackRound, openSortRound } from './stage2/stage-ui.js';
import { stepsFromGame } from './stage2/rounds.js';
import { AU, FOLIAGE, NPCS, addNPC, colliders, groundH, openChoice, openDialog, setFlag, spots, state, toast } from './deps.js';
import * as P from './programs-logic.js';
import { buildProgramsTent } from './programs-tent-model.js';
import { mountCollegeTee } from './college-tee.js';
import { countTriangles } from './radio-booth-model.js';

const flags = () => state.flags || (state.flags = new Set());
const isActive = () => flags().has('bz26_active');
const DEBUG = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');
const NOTICE = DATA.notice;
const sourceLine = key => { const s = DATA.sources[key]; return s ? `資料來源：${s.title}（${s.year} 學年）` : ''; };

/* ---------- 小遊戲 ---------- */
function shuffledOrder(n) {
  let order;
  do { order = [...Array(n).keys()].sort(() => Math.random() - 0.5); } while (order.every((v, i) => v === i));
  return order;
}
function playGame(game) {
  if (game.type === 'matching') {
    return openMatching({ title: game.title, intro: [...game.intro], revealPairs: false, pairs: game.pairs.map(({ id, left, right, explain }) => ({ id, left, right, explain })) }, { state });
  }
  if (game.type === 'sort') {
    return openSortRound({ title: game.title, intro: [...game.intro], cards: game.cards.map(({ id, text, explain }) => ({ id, text, explain })), order: shuffledOrder(game.cards.length) }, { state });
  }
  return openFeedbackRound({ title: game.title, intro: [...game.intro], mode: game.type === 'classify' ? 'classify' : 'choice', steps: stepsFromGame(game) }, { state });
}
const apply = set => { for (const s of set) setFlag(s); if (set.length) refreshPassport(); };

/* ---------- 1. 學程攤位 ---------- */
const npcTitle = p => `${p.short || p.name}・${p.npc.title}`;
async function playFirst(p) {
  const result = await playGame(p.game);
  if (result.status !== 'completed' || !isActive()) return;   // 取消或中途離場都不結算
  const r = P.firstResult(flags(), p.id, result);
  apply(r.set); AU.sfx('win');
  openDialog(npcTitle(p), [
    r.stamped ? '小遊戲完成，學程章蓋好了！下次回來可以挑戰進階版。' : '小遊戲完成！這個學程的章之前就蓋過了。',
    `答對 ${r.score}／${r.total}。`,
  ], () => { if (r.stamped) toast(`護照「跨域學程」頁：${p.short || p.name} 已蓋章`); });
}
async function playAdvanced(p) {
  const qs = p.advanced.map(q => {
    const order = [...q.options.keys()].sort(() => Math.random() - 0.5);
    return { prompt: q.q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer), explain: q.explain };
  });
  const result = await openFeedbackRound({
    title: `${p.short || p.name}（進階版）`, mode: 'choice', doneText: '答完了！答對 {score}／{total}；進階版要全對才過關。', steps: qs,
  }, { state });
  if (result.status !== 'completed' || !isActive()) return;
  const r = P.advancedResult(flags(), p.id, result, p.advanced.length);
  apply(r.set); AU.sfx(r.passed ? 'win' : 'faint');
  openDialog(npcTitle(p), [
    !r.passed ? `進階版要全對才過關，這次答對 ${r.score}／${r.total}。想好了可以再挑戰。`
      : r.set.length ? '進階全對！護照上會記一筆。' : '進階全對！這個學程的進階挑戰之前就過關了。',
  ]);
}
function onProgram(p) {
  if (!active || state.busy) return;
  const s = P.programStage(flags(), p.id);
  const intro = () => openDialog(npcTitle(p), [NOTICE, ...p.intro, sourceLine(p.sources[0])], () => {});
  if (s.kind === 'first') {
    openDialog(npcTitle(p), [NOTICE, ...p.intro], () => openChoice(['玩小遊戲', '下次再來'], i => { if (i === 0) playFirst(p); }));
    return;
  }
  openDialog(npcTitle(p), [NOTICE, s.advancedDone ? '進階版你已經過關了！想再練習也可以。' : '歡迎回來！這次可以挑戰進階版，3 題全對才過關。'],
    () => openChoice(['進階挑戰（全對才過）', '再玩一次小遊戲', '再聽一次介紹', '下次再來'], i => {
      if (i === 0) playAdvanced(p); else if (i === 1) playFirst(p); else if (i === 2) intro();
    }));
}

/* ---------- 2. 友校交流 ---------- */
const SCHOOLS = new Map(DATA.partners.schools.map(s => [s.id, s]));
function onPartner(s) {
  if (!active || state.busy) return;
  const title = `${s.name}・交流大使`;
  openDialog(title, [...s.lines], () => openChoice(['看開放的學系清單', '下次再來'], i => {
    if (i !== 0) return;
    openDialog(title, [...P.listLines(s.list), sourceLine(s.list.source)], () => {});
  }));
}
async function onPartnerGame() {
  if (!active || state.busy) return;
  const done = flags().has(P.PT_FLAG);
  openDialog('友校交流引路人', [
    '政大和清華、陽明交大、中央是台灣聯合大學系統的夥伴，和北藝大也有校際合作。',
    '前面四位交流大使會告訴你各校開放哪些學系。',
    done ? '友校配對你玩過了，要再玩一次嗎？' : '先來玩友校配對：想做的事，要走哪一條路？',
  ], () => openChoice(['玩友校配對', '下次再來'], async i => {
    if (i !== 0) return;
    const result = await playGame(DATA.partners.game);
    if (result.status !== 'completed' || !isActive()) return;
    const r = P.partnerResult(flags(), result);
    apply(r.set); AU.sfx('win');
    openDialog('友校交流引路人', [
      r.set.includes(P.PT_FLAG) ? '配對完成，護照「友校交流」頁蓋好章了！' : '配對完成！',
      `答對 ${r.score}／${r.total}。`,
    ]);
  }));
}

/* ---------- 會場出現與收起 ---------- */
let placement = null, tent = null, active = false, onSince = 0;
let tentColliders = [], hidden = [];
const programNpcs = [], partnerNpcs = [];
function gate(n, fn, label) {
  const ok0 = n.spot.ok;
  n.spot.ok = () => active && ok0();
  n.spot.label = label;
  n.spot.fn = fn;
  n.g.visible = false;
}
function createNpcs() {
  DATA.programs.forEach((p, i) => {
    const w = P.toWorld(placement, P.BAY_X[i], P.NPC_Z);
    const n = addNPC({ id: `bz26-pg-${p.id}`, title: npcTitle(p), tag: p.short || p.name, home: w, face: placement.rotY, look: p.npc.look, tagCol: '#d1c4e9', dialog: [{ lines: ['……'] }] });
    gate(n, () => onProgram(p), '了解學程');
    programNpcs.push(n);
  });
  for (const at of P.PARTNER_SPOTS) {
    const s = SCHOOLS.get(at.id);
    // 美式大學 T 恤：袖子用 T 恤底色，胸前印校名縮寫與簡稱（college-tee.js）。
    const look = s.tee ? { ...s.npc.look, top: s.tee.color } : s.npc.look;
    const n = addNPC({ id: `bz26-pt-${s.id}`, title: `${s.name}・交流大使`, tag: s.name, home: { x: at.x, z: at.z }, face: P.PARTNER_FACE, look, tagCol: '#ffcdd2', dialog: [{ lines: ['……'] }] });
    if (s.tee) mountCollegeTee(n, s.tee, { toon, canvasTex });
    gate(n, () => onPartner(s), '和交流大使聊聊');
    partnerNpcs.push(n);
  }
}
function setVenueActive(on) {
  on = !!on;
  if (on === active) return;
  active = on;
  if (on && !tent) {
    // 帳篷底下的植栽會暫收，所以位置檢查時先不算它們的碰撞。
    const movable = new Set(FOLIAGE.map(f => f.collider).filter(Boolean));
    placement = P.tentPlacement({ colliders: colliders.filter(c => !movable.has(c)), tents: LAYOUT.tents, spots: spots.filter(s => !s.room) });
    if (placement.conflicts.length) console.warn('[bz26 programs] 跨域學程帳篷候選位置都有衝突，暫用第一個', placement.tried);
    tent = buildProgramsTent({ toon, basic, canvasTex, programs: DATA.programs, notice: NOTICE });
    tent.group.position.set(placement.x, groundH(placement.x, placement.z), placement.z);
    tent.group.rotation.y = placement.rotY;
    scene.add(tent.group);
    tentColliders = P.tentColliders(placement);
    createNpcs();
  }
  if (tent) tent.group.visible = on;
  if (on && tent) {
    hidden = P.foliageUnder(placement, FOLIAGE).filter(f => typeof f.setVisible === 'function').map(f => ({ f, visible: f.isVisible?.() ?? true, collider: f.collider && colliders.includes(f.collider) ? f.collider : null }));
    for (const h of hidden) { h.f.setVisible(false); if (h.collider) colliders.splice(colliders.indexOf(h.collider), 1); }
  } else if (!on) {
    for (const h of hidden) { h.f.setVisible(h.visible); if (h.collider && !colliders.includes(h.collider)) colliders.push(h.collider); }
    hidden = [];
  }
  for (const b of tentColliders) { const i = colliders.indexOf(b); if (on && i < 0) colliders.push(b); else if (!on && i >= 0) colliders.splice(i, 1); }
  for (const n of [...programNpcs, ...partnerNpcs]) { n.g.visible = on; if (!on) n.sp.say(''); }
}

// F03 引路人由 index.js 建立；找到後改接友校配對（只改互動，不改外觀與位置）。
let guideWired = false;
function wireGuide() {
  if (guideWired) return;
  const n = NPCS.find(x => x.id === 'bz26-F03');
  if (!n) return;
  n.spot.fn = onPartnerGame; n.spot.label = '友校配對';
  // 站進交流大使那一排的中間，玩家從大道面對他們時不會點錯人。
  n.home = { x: P.GUIDE_SPOT.x, z: P.GUIDE_SPOT.z }; n.face = P.PARTNER_FACE;
  n.g.position.x = n.spot.x = P.GUIDE_SPOT.x; n.g.position.z = n.spot.z = P.GUIDE_SPOT.z; n.g.rotation.y = P.PARTNER_FACE;
  guideWired = true;
}

function sync() {
  wireGuide();
  // 同電台：會場旗標打開後等一下再建，讓 index.js 先完成帳篷碰撞與收樹，位置檢查才準。
  const on = isActive();
  if (on && !onSince) onSince = performance.now();
  if (!on) onSince = 0;
  setVenueActive(on && performance.now() - onSince > 600);
}
addPassportViewDecorator(view => P.decoratePassport(view, flags(), DATA));
sync();
setInterval(sync, 500);

if (DEBUG) {
  window.__bz26programs = {
    get placement() { return placement; }, get tent() { return tent; }, programNpcs, partnerNpcs, sync,
    onProgram: id => onProgram(DATA.programs.find(p => p.id === id)), onPartner: id => onPartner(SCHOOLS.get(id)), onPartnerGame,
    get active() { return active; }, get hiddenTreeColliders() { return hidden.filter(h => h.collider).length; }, get hiddenFoliage() { return hidden.length; }, get guideWired() { return guideWired; }, triangles: () => (tent ? countTriangles(tent.group) : 0),
  };
}
