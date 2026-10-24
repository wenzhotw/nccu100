import { readyNpcCharacter } from '../../actors/character-part-sources.js';
// src/systems/baozhong/entry-radio.js（v1.69，Claude，依 Wenzel 2026-10-22 指示）：包種茶節入口與政大之聲電台棚的整合層。
// 1. 邀請人頭上的泡泡：玩家走到 15 公尺內、還沒參加活動時顯示（文字沿用 festival-arch-logic 的 INVITE_BUBBLE，Wenzel 指定原文）。
// 2. 開始畫面「參加包種茶節」：開始遊戲、自動參加、領護照，直接站在噴水池旁活動看板前。
// 3. 政大之聲電台棚：會場開時出現在噴水池與四維堂之間的大道西側；主播輪播廣播泡泡；Call in 全對拿隱藏章 RADIO。
// 不改有鎖檔保護的 index.js、tents.js 等：同 festival-arch.js，接在邀請人既有的 host.after 鉤子後面，另以 0.5 秒計時補同步。
import { scene } from '../../core/engine.js';
import { dlg } from '../../ui/dialog.js';
import { toon, basic, canvasTex } from '../../render/kit.js';
import { CAMPUS_GUIDE } from '../../world/campus-guide-layout.js';
import CONTENT from '../../content/baozhong.json';
import LAYOUT from './layout.json';
import * as L from './passport-logic.js';
import { prepareQuiz } from './quiz-utils.js';
import { createFlow } from './flow-core.js';
import { signPlacement } from './activity-sign-logic.js';
import { INVITE_BUBBLE } from './festival-arch-logic.js';
import { refreshPassport } from './passport-ui.js';
import { openFeedbackRound } from './stage2/stage-ui.js';
import { AU, NPCS, addNPC, colliders, groundH, openChoice, openDialog, player, pos, setFlag, shadowBlob, spots, state, toast } from './deps.js';
import * as R from './radio-logic.js';
import { buildRadioBooth, countTriangles } from './radio-booth-model.js';

const F = createFlow({ logic: L, prepareQuiz, content: CONTENT });
const flags = () => state.flags || (state.flags = new Set());
const isActive = () => flags().has('bz26_active');
const host = NPCS.find(n => n.id === 'bz26-host');
const DEBUG = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');

/* ---------- 1. 邀請人泡泡 ---------- */
export const INVITE_RANGE = 15;
if (host) { host.sp.material.depthTest = false; host.sp.renderOrder = 10; }   // 同 npc.js 對 bubble NPC 的處理，不被樹擋住
function syncInviteBubble() {
  if (!host) return;
  const near = !state.room && Math.hypot(pos.x - host.g.position.x, pos.z - host.g.position.z) < INVITE_RANGE;
  const want = !isActive() && near ? INVITE_BUBBLE : null;
  if (host.bubble !== want) { host.bubble = want; if (!want) host.sp.say(''); }
}

/* ---------- 2. 開始畫面「參加包種茶節」 ---------- */
function acceptFestival() {
  const f = flags();
  if (f.has('bz26_active')) return false;
  const r = F.accept(f);
  for (const c of r.clear || []) { state[c] = false; f.delete(c); }
  for (const s of r.set || []) setFlag(s);
  return true;
}
/** 活動看板的互動點（index.js 的看板也是用同一個 signPlacement 算的）；算不出來就站在噴水池北側。 */
function signSpot() {
  try { const p = signPlacement(CAMPUS_GUIDE.fountain.z, colliders.filter(c => !String(c.owner || '').startsWith('bz26-'))); return { x: p.x, z: p.z + 1.25 }; }
  catch { return { x: CAMPUS_GUIDE.fountain.x, z: CAMPUS_GUIDE.fountain.z + CAMPUS_GUIDE.fountain.radius + 2 }; }
}
function joinFestival() {
  const joined = acceptFestival();
  const st = R.entryStand(signSpot());
  pos.set(st.x, groundH(st.x, st.z), st.z); state.yaw = st.yaw;
  player.position.copy(pos); shadowBlob.position.x = pos.x; shadowBlob.position.z = pos.z;
  document.getElementById('go')?.click();   // 沿用原本開始冒險的流程（音效初始化、鏡頭、標題淡出）
  setTimeout(() => { AU.sfx('chime'); toast(joined ? '歡迎來到包種茶節！看板上有會場地圖' : '回到包種茶節會場了，進度都保留著'); }, 650);
}
const STYLE = `
#bzGo{display:block;margin:14px auto 0;background:#4f9a48;color:#fff;border:0;border-radius:999px;padding:11px 30px;font:900 16px "Noto Sans TC",sans-serif;letter-spacing:.15em;box-shadow:0 5px 0 #2f6b2b,0 12px 22px rgba(35,42,77,.28);cursor:pointer}
#bzGo small{display:block;font:800 10px "M PLUS Rounded 1c","Noto Sans TC",sans-serif;letter-spacing:.2em;opacity:.85;margin-top:2px}
#bzGo:active{transform:translateY(3px);box-shadow:0 2px 0 #2f6b2b}
#bzGo:focus-visible{outline:3px solid #ffd84a;outline-offset:3px}
`;
let joinButton = null;
{
  const go = document.getElementById('go');
  if (go) {
    const style = document.createElement('style'); style.textContent = STYLE; document.head.appendChild(style);
    joinButton = document.createElement('button');
    joinButton.id = 'bzGo'; joinButton.type = 'button';
    joinButton.innerHTML = '參加包種茶節<small>直接到會場大門口</small>';
    joinButton.addEventListener('click', joinFestival);
    go.after(joinButton);
    // save.js 之後會把「重新開始」插在開始鍵後面；把本按鈕移回開始鍵正下方。
    setTimeout(() => go.after(joinButton), 0);
  }
}

/* ---------- 3. 政大之聲電台棚 ---------- */
let placement = null, booth = null, active = false, onSince = 0;
const djs = [];
let boothColliders = [];
function createDjs() {
  for (const d of R.DJ_SPOTS) {
    const w = R.toWorld(placement, d.x, d.z);
    const n = addNPC({ id: d.id, title: d.title, tag: d.title, home: w, face: placement.rotY, look: d.look, tagCol: '#ffd84a', dialog: [{ lines: ['……'] }] });
    const ok0 = n.spot.ok;
    n.spot.ok = () => active && ok0();
    n.spot.label = '和主播說話';
    n.spot.fn = onRadio;
    n.g.visible = false;
    djs.push(n);
  }
  djs[0].after = broadcastTick;
  djs.forEach(readyNpcCharacter);
}
function setRadioActive(on) {
  on = !!on;
  if (on === active) return;
  active = on;
  if (on && !booth) {
    placement = R.radioPlacement({ colliders, tents: LAYOUT.tents, spots: spots.filter(s => !s.room) });
    if (placement.conflicts.length) console.warn('[bz26 radio] 電台棚候選位置都有衝突，暫用第一個', placement.tried);
    booth = buildRadioBooth({ toon, basic, canvasTex });
    booth.group.position.set(placement.x, groundH(placement.x, placement.z), placement.z);
    booth.group.rotation.y = placement.rotY;
    scene.add(booth.group);
    boothColliders = R.radioColliders(placement);
    createDjs();
  }
  if (booth) booth.group.visible = on;
  for (const b of boothColliders) { const i = colliders.indexOf(b); if (on && i < 0) colliders.push(b); else if (!on && i >= 0) colliders.splice(i, 1); }
  for (const n of djs) { n.g.visible = on; if (!on) n.sp.say(''); }
}

// 廣播：主播 1、2 輪流說，一句 4 秒；玩家在 30 公尺內、沒開對話時才播。
const LINE_SECONDS = 4, HEAR_RANGE = 30;
let queue = [], round = 0, speaker = 0, current = '', lineTimer = 0;
function broadcastTick(n, dt) {
  if (!active) return;
  for (const m of djs) m.sayT = 99;   // 擋掉 npc.js 預設每秒清空泡泡
  const d = Math.hypot(pos.x - n.g.position.x, pos.z - n.g.position.z);
  if (d > HEAR_RANGE || !dlg.hidden || state.busy) { current = ''; for (const m of djs) m.sp.say(''); return; }
  lineTimer -= dt;
  if (lineTimer <= 0 || !current) {
    if (!queue.length) queue = R.broadcastRound({ flags: flags(), booths: CONTENT.booths, colleges: CONTENT.colleges, round: round++ });
    current = queue.shift(); speaker = (speaker + 1) % 2; lineTimer = LINE_SECONDS;
  }
  djs.forEach((m, i) => m.sp.say(i === speaker ? current : ''));
}

function onRadio() {
  if (!active || state.busy) return;
  const done = flags().has(R.RADIO_FLAG);
  openDialog('政大之聲主播', [
    '這裡是政大之聲 FM88.7，包種茶節實況轉播！',
    done ? '你已經拿到政大之聲的隱藏章了，要再 Call in 一次嗎？' : 'Call in 回答三題電台小知識，全對送你一枚隱藏章！',
  ], () => openChoice(['我要 Call in', '下次再來'], async i => {
    if (i !== 0) return;
    const result = await openFeedbackRound({
      title: '政大之聲 Call in', mode: 'choice', doneText: 'Call in 結束！答對 {score}／{total}。',
      intro: ['政大之聲是傳院的實習電台，每天直播大約 16 小時。', '三題都答對，就送你一枚隱藏章。'],
      steps: R.CALL_IN.map(q => ({ prompt: q.prompt, options: [...q.options], answer: q.answer, explain: q.explain })),
    }, { state });
    if (result.status !== 'completed' || !isActive()) return;   // 取消或中途離場都不結算
    const r = R.callInResult(flags(), result);
    for (const s of r.set) setFlag(s);
    if (r.set.length) refreshPassport();
    AU.sfx(r.passed ? 'win' : 'faint');
    openDialog('政大之聲主播', r.lines, () => { if (r.set.length) toast('茶葉點數 +1（隱藏章：政大之聲）'); });
  }));
}

/* ---------- 同步 ---------- */
function sync() {
  syncInviteBubble();
  // 會場旗標打開後等一下再建電台：讓 index.js 先完成帳篷碰撞與收樹，位置檢查才準。
  const on = isActive();
  if (on && !onSince) onSince = performance.now();
  if (!on) onSince = 0;
  setRadioActive(on && performance.now() - onSince > 600);
}
if (host) { const prev = host.after; host.after = (n, dt) => { prev?.(n, dt); sync(); }; }
sync();
setInterval(sync, 500);

if (DEBUG) {
  window.__bz26radio = {
    get placement() { return placement; }, get booth() { return booth; }, djs, joinButton, joinFestival, onRadio, sync,
    get active() { return active; }, triangles: () => (booth ? countTriangles(booth.group) : 0),
  };
}
