// src/systems/baozhong/index.js（P06 重建，Grok，T065）：包種茶節流程整合。
// 邀請人（校門 -2,17）→ 答應：40 頂帳篷、碰撞、佈景、37 位系攤 NPC、服務台、醫護、友校、四維堂 11 位關主與大會考出現 →
// 系攤對話→洗牌→openQuiz→蓋章計點 → 關主（提示卡）→ 大會考 → 首次發成就 → 會場收起。離開會場（服務台或邀請人）也會收起。
// 會場是否出現只看旗標 bz26_active（存檔還原後自動同步）；開關重複做不會重複建立任何東西（模型、NPC、碰撞都只建一次）。
// 依據：Claude工作區 A24 至 A26、T055、T056、T057、T065；版本鎖見 GPT-038。
import CONTENT from '../../content/baozhong.json';
import DEPARTMENTS from '../../content/baozhong-departments.json';
import { departmentIntro } from './department-intro.js';
import LAYOUT from './layout.json';
import * as L from './passport-logic.js';
import { prepareQuiz } from './quiz-utils.js';
import { createFlow } from './flow-core.js';
import { openMatching, cancelMatching } from './matching.js';
import { mountActivityMap } from './activity-map.js';
import { createActivitySign } from './activity-sign.js';
import { createVenueFocus } from './venue-focus.js';
import { LANDMARK_PREVIEW_IDS } from './department-landmarks.js';
import { AU, NPCS, FOLIAGE, spots, addNPC, colliders, createTents, mountDecor, mountPassport, openChoice, openDialog, openQuiz, pos, groundH, player, shadowBlob, setFlag, showAchievement, state, toast, unmountAllDecor, updateDecor } from './deps.js';

// Gemini 的 baozhong-booths.json 還沒交時 glob 是空的，帳篷照 tents-logic 的預設（英文名留空、海報摘自凍結內容）。
const BOOTHS = (Object.values(import.meta.glob('../../content/baozhong-booths.json', { eager: true }))[0] || {}).default || null;
// Scenery is released independently; experimental content/gameplay stays query-gated.
const SCENERY = true;
const SLICE = new URLSearchParams(location.search).get('bz26slice') === '1';
const MATCHING = (Object.values(import.meta.glob('../../content/baozhong-d26-matching.json', { eager: true }))[0] || {}).default || null;
let activityEpoch = 0;
const F = createFlow({ logic: L, prepareQuiz, content: CONTENT });
const NPC_HIDE = 35;   // 35 公尺外 NPC 不畫（同 v1）

/* ---------- 旗標 ---------- */
const flags = () => state.flags || (state.flags = new Set());
function apply(r) {
  if (!r) return;
  for (const c of r.clear || []) { state[c] = false; flags().delete(c); }
  for (const s of r.set || []) setFlag(s);
  passport && passport.refresh();
}
function grant(ids, done) {   // 成就：同 ui/achievement.js 的 achieve()，名稱說明取 baozhong.json（不改 achievements.json）
  const list = (ids || []).filter(id => !state['achv_' + id]);
  if (!list.length) { done && done(); return; }
  const id = list.shift(), a = F.achievementInfo(id);
  setFlag('achv_' + id);
  showAchievement({ title: a.name, desc: a.desc, icon: '🍵' }, () => grant(list, done));
}
const afterResult = done => grant(F.newAchievements(flags()), done);
const say = (title, lines, then) => openDialog(title, lines, then);

/* ---------- 會場（只建一次） ---------- */
const tents = createTents(LAYOUT, CONTENT, BOOTHS, { openCanopyD26: SCENERY, landmarkPreview: SCENERY });
const byId = new Map(LAYOUT.tents.map(t => [t.id, t]));
const venueNPCs = [];
function venueNPC(o, fn) {
  const n = addNPC({ ...o, dialog: [{ lines: ['……'] }] });
  const ok0 = n.spot.ok;
  n.spot.ok = () => venue.on && ok0();
  n.spot.fn = fn;
  n.g.visible = false;
  venueNPCs.push(n);
  return n;
}
for (const b of CONTENT.booths) {
  const t = byId.get(b.id); if (!t) continue;
  venueNPC({ id: `bz26-${b.id}`, title: b.npc.title, tag: b.npc.tag, home: { x: t.anchor[0], z: t.anchor[1] }, face: t.rotY, look: b.npc.look, tagCol: '#90caf9' }, () => onBooth(b.id));
}
{ const t = byId.get('F01'); venueNPC({ id: 'bz26-F01', title: CONTENT.service.title, tag: '服務台', home: { x: t.anchor[0], z: t.anchor[1] }, face: t.rotY, look: CONTENT.service.look, tagCol: '#f5a623' }, onService); }
for (const f of CONTENT.functions || []) {
  const t = byId.get(f.id); if (!t) continue;
  venueNPC({ id: `bz26-${f.id}`, title: f.title, tag: f.title, home: { x: t.anchor[0], z: t.anchor[1] }, face: t.rotY, look: f.look, tagCol: '#f5a623' }, () => say(f.title, [...f.lines]));
}
const hallR = LAYOUT.hall.room;
for (const m of LAYOUT.hall.masters) {
  const c = CONTENT.colleges.find(k => k.id === m.id); if (!c) continue;
  venueNPC({ id: `bz26-${m.id}`, title: c.master.title, tag: c.name, room: hallR, home: { x: m.x, z: m.z }, face: m.face, look: c.master.look, tagCol: c.color }, () => onMaster(m.id));
}
{ const e = LAYOUT.hall.exam; venueNPC({ id: 'bz26-EXAM', title: CONTENT.exam.npc.title, tag: CONTENT.exam.title, room: hallR, home: { x: e.x, z: e.z }, face: e.face, look: CONTENT.exam.npc.look, tagCol: '#ffd54f' }, onExam); }

let passport = null;
let activityMap = null, activitySign = null, activitySignError = null;
const venueFocus = createVenueFocus({ foliage: FOLIAGE, colliders, npcs: NPCS, spots, state, enabled: SCENERY });
const venue = {
  on: false,
  set(on) {
    on = !!on; if (on === venue.on) return;
    venue.on = on; activityEpoch++;
    venueFocus.setActive(on);
    tents.setActive(on);
    if (on) {
      for (const T of tents.tents.values()) { if (SCENERY && LANDMARK_PREVIEW_IDS.includes(T.id)) continue; mountDecor(T.id, T.group, T.collegeColor, T.parts).then(e => { if (e) tents.refreshSigns(T.id); }); }
      try { passport = mountPassport({ getView: () => L.passportView(flags(), CONTENT) }); } catch (err) { console.warn('[bz26] 護照掛載失敗', err); passport = null; }
    } else {
      cancelMatching();
      activityMap?.close(); activityMap?.select(null);
      unmountAllDecor();
      if (passport) { passport.destroy(); passport = null; }
    }
    for (const n of venueNPCs) n.g.visible = on;
  },
};

// 新切片的看板可先查看，再由玩家明確選擇參加，不自動傳送。
function openActivityGuide() {
  if (!activityMap || state.busy) return;
  if (venue.on) { activityMap.open(); return; }
  openChoice(['參加活動並開地圖', '先看地圖', '離開'], i => {
    if (i === 0) { apply(F.accept(flags())); sync(); }
    if (i < 2) activityMap.open();
  });
}
if (SCENERY) {
  try { activitySign = createActivitySign({ onOpen: openActivityGuide, layout: LAYOUT, content: CONTENT }); }
  catch (error) { activitySignError = { message: error.message, placements: error.placements || [] }; console.error('[bz26 slice] 看板缺少安全站位，地圖按鈕仍可用', error); }
  try { activityMap = mountActivityMap({ layout: LAYOUT, content: CONTENT, state, getPosition: () => pos, fountain: activitySign?.fountain }); }
  catch (error) { console.error('[bz26 slice] 地圖未能建立', error); activitySign?.dispose(); activitySign = null; }
}

/* ---------- 邀請人 ---------- */
const host = addNPC({ id: 'bz26-host', title: CONTENT.host.title, tag: CONTENT.host.title, home: { x: LAYOUT.host.x, z: LAYOUT.host.z }, face: LAYOUT.host.face, look: CONTENT.host.look, tagCol: '#81c784', dialog: [{ lines: CONTENT.host.invite }] });
host.spot.fn = onHost;
function onHost() {
  const h = F.host(flags());
  say(CONTENT.host.title, h.lines, () => openChoice(h.choices, i => {
    if (h.kind === 'active') { if (i === 1) doLeave(CONTENT.host.title); return; }
    if (i !== 0) { say(CONTENT.host.title, F.decline().lines); return; }
    apply(F.accept(flags())); sync(); AU.sfx('chime');
  }));
}
function doLeave(title) { const r = F.leave(); say(title, r.lines, () => { apply(r); sync(); toast('包種茶節會場已收起，進度都保留著'); }); }

/* ---------- 系攤、服務台、關主、大會考 ---------- */
async function onMatchingBooth() {
  if (!MATCHING) { say('日文系配對預覽', ['內容來源核對中，配對素材尚未載入。此處不使用未核實的校友或發展資料。']); return; }
  const epoch = activityEpoch;
  const enriched = DEPARTMENTS.departments.find(d => d.id === 'D26');
  const result = await openMatching({ ...MATCHING, intro: [...(departmentIntro(enriched) || []), ...MATCHING.intro] }, { state });
  // 離場、讀檔或重入後，舊視窗不得補發獎勵。
  if (result.status !== 'completed' || !venue.on || epoch !== activityEpoch) return;
  const r = L.boothResult(flags(), 'D26', result.total, result.score);
  apply(r); AU.sfx(r.passed ? 'win' : 'faint');
  const line = r.perfect ? '首次配對全部答對！' : r.passed ? '配對挑戰通過！' : '再看一次介紹，換個順序試試看。';
  say(MATCHING.title, [line, `首次配對正確 ${result.score}／${result.total}。`], () => {
    if (r.gained) toast(`茶葉點數 +${r.gained}`);
    afterResult();
  });
}
function onBooth(id) {
  if (SLICE && id === 'D26') { onMatchingBooth(); return; }
  const t = F.boothTalk(id);
  say(t.title, SLICE ? (departmentIntro(DEPARTMENTS.departments.find(d => d.id === id)) || t.lines) : t.lines, () => openChoice(t.choices, async i => {
    if (i !== 0) return;
    const q = F.boothQuiz(id, Math.random);
    const score = await openQuiz(q);
    const r = F.boothDone(flags(), id, score);
    apply(r); AU.sfx(r.passed ? 'win' : 'faint');
    say(t.title, r.lines, () => { if (r.gained) toast(`茶葉點數 +${r.gained}`); afterResult(); });
  }));
}
function onService() {
  const s = F.service();
  say(CONTENT.service.title, s.lines, () => openChoice(s.choices, i => {
    if (i === 0) { const r = F.buyHint(flags()); apply(r); say(CONTENT.service.title, r.lines); }
    else if (i === 1) doLeave(CONTENT.service.title);
  }));
}
function askHints(questions, go) {
  const opts = F.hintChoices(flags(), questions);
  if (opts.length <= 1) { go(0); return; }
  openChoice(opts.map(k => (k ? `用 ${k} 張提示卡` : '不用提示卡')), i => go(opts[i]));
}
function onMaster(cid) {
  const c = CONTENT.colleges.find(k => k.id === cid), g = F.master(flags(), cid);
  say(c.master.title, g.lines, () => {
    if (g.kind !== 'ready') return;
    askHints(g.questions, async k => {
      const p = F.prepare(flags(), g.questions, k, Math.random); apply(p);
      const score = await openQuiz({ title: `${c.name}關主問答`, questions: p.questions });
      const r = F.masterDone(flags(), cid, score); apply(r); AU.sfx(r.passed ? 'win' : 'faint');
      say(c.master.title, r.lines, () => afterResult());
    });
  });
}
function onExam() {
  const g = F.exam(flags());
  say(CONTENT.exam.npc.title, g.lines, () => {
    if (g.kind !== 'ready') return;
    openChoice(g.choices, i => {
      if (i !== 0) return;
      const qs = F.examDraw(flags(), Math.random);
      askHints(qs, async k => {
        const p = F.prepare(flags(), qs, k, Math.random); apply(p);
        const score = await openQuiz({ title: CONTENT.exam.title, questions: p.questions });
        const r = F.examDone(flags(), score); apply(r); AU.sfx(r.passed ? 'win' : 'faint');
        say(CONTENT.exam.npc.title, r.lines, () => grant([...(r.achieve || []), ...F.newAchievements(flags())], () => { if (r.collapse) { sync(); toast('包種茶節會場已收起，進度都保留著'); } }));
      });
    });
  });
}

/* ---------- 每幀（掛在邀請人身上：只在戶外跑，帳篷也只在戶外） ---------- */
function sync() { venue.set(flags().has('bz26_active')); }
host.after = (n, dt) => {
  sync();
  activityMap?.update(dt); activitySign?.update(activityMap?.target);
  if (!venue.on) return;
  const recovery = tents.update(pos, state, groundH);
  if (recovery && recovery.status === 'recovered') {
    player.position.copy(pos); shadowBlob.position.x = pos.x; shadowBlob.position.z = pos.z;
  }
  updateDecor(dt);
  for (const v of venueNPCs) if (!v.room) v.g.visible = Math.hypot(v.g.position.x - pos.x, v.g.position.z - pos.z) < NPC_HIDE;
};
// 室內（四維堂）時 host.after 不會跑：每 0.5 秒補一次同步，讓存檔還原或大會考後收起也正確。
setInterval(sync, 500);

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__bz26 = {
    venue, venueFocus, tents, venueNPCs, host, F, flags, slice: SLICE, activityMap, activitySign, activitySignError,
    accept: () => { apply(F.accept(flags())); sync(); }, leave: () => { apply(F.leave()); sync(); },
    counts: () => ({ npcs: NPCS.length, colliders: colliders.length, tentGroups: tents.group.children.length, decorRoots: tents.group.children.reduce((s, g) => s + g.children.filter(c => c.name.startsWith('bz26-decor-')).length, 0), active: venue.on, passportButtons: document.querySelectorAll('#bz-passport-button').length }),
  };
}
