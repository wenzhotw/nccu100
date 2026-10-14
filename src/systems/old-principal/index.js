/**
 * 老校長：騎馬穿軍裝的老人。在田徑場跑道和八德道上騎馬，快跑一陣子，偶爾停下來慢慢走。
 *
 * 流程：追上去按「抓住老校長」→「我不認識門口那個神經病」→ 問是不是政大學生
 *   不是 → 隨口說兩句，騎走
 *   是   → 邀請歷史問答挑戰（十題選擇題）→ 全對拿到「精神堡壘任務信函」；沒全對要過一陣子才能再挑戰
 *
 * 台詞、題目、路線都在 src/content/old-principal.json。
 */
import * as THREE from 'three';
import { state } from '../../core/state.js';
import { $ } from '../../core/dom.js';
import { AU } from '../audio.js';
import { SPH, toon } from '../../render/kit.js';
import { resolve } from '../../core/collision.js';
import { addNPC } from '../../actors/npc.js';
import { outlineU, part } from '../../actors/player.js';
import { lerpA, pos } from '../../core/gameplay.js';
import { openDialog, toast } from '../../ui/dialog.js';
import { openChoice } from '../../ui/choice.js';
import { openQuiz } from './quiz.js';
import D from '../../content/old-principal.json';

/* ---------- 內容檢查：題目寫錯時在主控台說清楚 ---------- */
D.quiz.forEach((q, i) => {
  if (!Array.isArray(q.options) || q.options.length < 2 || !(q.answer >= 0 && q.answer < q.options.length))
    console.error(`[old-principal.json] 第 ${i + 1} 題的 options 或 answer 有問題`);
});

/* ---------- 人和馬 ---------- */
const start = D.routes[0].points[0];
const npc = addNPC({
  id: 'old-principal', title: D.title, tag: D.tag, home: { x: start[0], z: start[1] },
  look: D.look, shout: D.shout, dialog: [{ lines: D.caught }], tagCol: '#f2c84b',
});
const { P, rig } = npc;

/** 可愛的小馬：圓滾滾的身體、短腿、大眼睛 */
function makeHorse(c) {
  const g = new THREE.Group(), legs = [];
  const body = part(new THREE.CapsuleGeometry(0.3, 0.55, 8, 16), c.body, 0, 0.8, 0, g, 0.02);
  body.rotation.x = Math.PI / 2;
  // 腿：在身體下方的關節轉動，蹄是深色
  [[-0.17, 0.33], [0.17, 0.33], [-0.17, -0.3], [0.17, -0.3]].forEach(([x, z]) => {
    const hip = new THREE.Group(); hip.position.set(x, 0.66, z); g.add(hip);
    part(new THREE.CapsuleGeometry(0.075, 0.36, 4, 10), c.body, 0, -0.25, 0, hip, 0.015);
    part(new THREE.CylinderGeometry(0.085, 0.09, 0.09, 10), c.dark, 0, -0.5, 0, hip, 0.012);
    legs.push(hip);
  });
  // 脖子和頭
  const neck = new THREE.Group(); neck.position.set(0, 0.95, 0.42); g.add(neck);
  const nk = part(new THREE.CapsuleGeometry(0.15, 0.3, 6, 12), c.body, 0, 0.18, 0.06, neck, 0.02); nk.rotation.x = 0.45;
  const head = new THREE.Group(); head.position.set(0, 0.42, 0.18); neck.add(head);
  const hd = part(new THREE.CapsuleGeometry(0.15, 0.22, 6, 12), c.body, 0, 0, 0.12, head, 0.02); hd.rotation.x = Math.PI / 2 - 0.25;
  const snout = part(SPH, '#c79a76', 0, -0.07, 0.3, head); snout.scale.set(0.13, 0.1, 0.1);
  [-1, 1].forEach(s => {
    const eye = part(SPH, '#1d1414', s * 0.115, 0.06, 0.13, head); eye.scale.set(0.045, 0.055, 0.04);
    part(SPH, '#ffffff', s * 0.125, 0.08, 0.16, head).scale.setScalar(0.015);
    const ear = part(new THREE.ConeGeometry(0.05, 0.14, 6), c.body, s * 0.08, 0.17, 0.02, head, 0.012); ear.rotation.z = -s * 0.25;
    part(SPH, '#1d1414', s * 0.04, -0.08, 0.39, head).scale.setScalar(0.015);   // 鼻孔
  });
  // 鬃毛和尾巴
  for (let i = 0; i < 5; i++) part(SPH, c.dark, 0, 0.5 - i * 0.09, -0.06 - i * 0.03, neck).scale.set(0.06, 0.08, 0.07);
  const tail = new THREE.Group(); tail.position.set(0, 0.92, -0.55); g.add(tail);
  const tl = part(new THREE.CapsuleGeometry(0.07, 0.35, 4, 10), c.dark, 0, -0.18, -0.08, tail, 0.012); tl.rotation.x = -0.45;
  // 馬鞍、韁繩
  part(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 18), c.saddle, 0, 1.08, -0.02, g, 0.01).scale.set(0.95, 1, 1.15);
  const strap = part(new THREE.TorusGeometry(0.31, 0.02, 6, 20), c.leather, 0, 0.8, 0.0, g); strap.rotation.y = Math.PI / 2;
  const rein = part(new THREE.TorusGeometry(0.2, 0.012, 4, 16, Math.PI), c.leather, 0, 1.12, 0.38, g); rein.rotation.x = -0.4;
  return { g, legs, neck, tail };
}
const horse = makeHorse(D.horse);
npc.g.add(horse.g);

// 騎在馬上：人往上抬、腿跨開、手往前拉韁繩、白手套、黑馬靴、皮帶、白鬍子
const RIDE_Y = 0.75;
[P.shL, P.shR].forEach(sh => { const hand = sh.children[2]; if (hand) hand.material = toon('#f4f4ee'); });
[P.hipL, P.hipR].forEach(h => { part(new THREE.CylinderGeometry(0.068, 0.065, 0.16, 10), '#1d1d1f', 0, -0.17, 0.01, h, 0.01); });
part(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 18), '#6b4a2a', 0, 0.44, 0, rig).scale.z = 0.88;
{ const belt = part(new THREE.BoxGeometry(0.035, 0.42, 0.012), '#6b4a2a', 0.02, 0.56, 0.155, rig); belt.rotation.z = 0.6; }
{ const m = part(SPH, '#e4e4e0', 0, -0.1, 0.268, P.head); m.scale.set(0.09, 0.025, 0.03); outlineU(m, 1.2); }

/* ---------- 騎馬的動作與路線 ---------- */
let route = D.routes[0], wp = 1, dir = 1;
let mode = 'gallop', modeT = 8, ph = 0, clopT = 0, busy = false, retryAt = 0;
const tmp = new THREE.Vector3();

function nextMode() {
  const r = Math.random();
  if (mode === 'gallop') { mode = r < 0.6 ? 'walk' : 'halt'; modeT = mode === 'walk' ? 3 + Math.random() * 3 : 2 + Math.random() * 2; }
  else { mode = 'gallop'; modeT = 7 + Math.random() * 7; if (Math.random() < 0.5) AU.sfx('neigh'); }
}
function nextWaypoint() {
  const n = route.points.length;
  if (route.loop) { wp = (wp + 1) % n; return; }
  if (wp + dir < 0 || wp + dir >= n) dir = -dir;
  wp += dir;
}
/** 玩家離很遠的時候，偶爾換到另一個地方騎（田徑場 ↔ 八德道） */
function maybeSwitchRoute() {
  const p = npc.g.position;
  if (Math.hypot(pos.x - p.x, pos.z - p.z) < 60) return;
  const other = D.routes.find(r => r !== route);
  const s = other.points[0];
  if (Math.hypot(pos.x - s[0], pos.z - s[1]) < 60) return;
  route = other; wp = 1; dir = 1; p.x = s[0]; p.z = s[1];
}

npc.after = (n, dt) => {
  const p = n.g.position;
  const talking = busy || n.state === 'talk';
  let moving = 0;
  if (!talking && n.fear <= 0) {
    modeT -= dt;
    if (modeT <= 0) { nextMode(); if (mode === 'halt' && Math.random() < 0.3) maybeSwitchRoute(); }
    const spd = mode === 'gallop' ? D.speed.gallop : mode === 'walk' ? D.speed.walk : 0;
    if (spd > 0) {
      const w = route.points[wp], dx = w[0] - p.x, dz = w[1] - p.z, d = Math.hypot(dx, dz);
      if (d < 1.2) nextWaypoint();
      else {
        const st = Math.min(d, spd * dt);
        tmp.set(p.x + dx / d * st, 0, p.z + dz / d * st); resolve(tmp, 0.6); p.x = tmp.x; p.z = tmp.z;
        n.g.rotation.y = lerpA(n.g.rotation.y, Math.atan2(dx, dz), 1 - Math.exp(-dt * 5));
        moving = spd;
      }
    }
  }
  // 馬：跑步時四條腿交錯擺動、身體上下起伏；走路時慢慢擺
  const gallop = moving > 3;
  ph += dt * (gallop ? 13 : moving ? 6 : 0);
  const amp = gallop ? 0.75 : moving ? 0.35 : 0;
  horse.legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i < 2 ? 0 : Math.PI) + (i % 2) * 0.6) * amp; });
  const bob = gallop ? Math.abs(Math.sin(ph)) * 0.09 : 0;
  horse.g.position.y = bob;
  horse.g.rotation.x = gallop ? Math.sin(ph) * 0.06 : 0;
  horse.neck.rotation.x = gallop ? Math.sin(ph + 1) * 0.12 : moving ? 0 : Math.sin(state.time * 1.3) * 0.08 + 0.05;
  horse.tail.rotation.x = gallop ? -0.6 + Math.sin(ph * 2) * 0.15 : Math.sin(state.time * 2) * 0.12;
  horse.tail.rotation.y = Math.sin(state.time * 1.7) * 0.2;
  // 人：坐在馬鞍上
  rig.position.y = RIDE_Y + bob * 0.8 + (gallop ? Math.abs(Math.sin(ph + 0.4)) * 0.03 : 0);
  P.hipL.rotation.set(-0.55, 0, -0.5); P.hipR.rotation.set(-0.55, 0, 0.5);
  if (!talking) { P.shL.rotation.set(-0.95, 0, -0.15); P.shR.rotation.set(-0.95, 0, 0.15); }
  else { P.shL.rotation.set(-0.3, 0, -0.12); P.shR.rotation.set(-0.3, 0, 0.12); }
  // 跑步的蹄聲（離主角近才放）
  if (gallop) { clopT -= dt; if (clopT <= 0) { clopT = 0.23; if (Math.hypot(pos.x - p.x, pos.z - p.z) < 22) AU.sfx('clop'); } }
  n.spot.x = p.x; n.spot.z = p.z;
};

/* ---------- 對話、問答 ---------- */
state.haveLetter = false;
// silent：讀取存檔時用，只恢復狀態與畫面
function giveLetter(silent) {
  state.haveLetter = true; $('letterItem').hidden = false; if (silent === true) return; AU.sfx('gem'); toast(D.letter.toast);
}
export { giveLetter };
$('letterItem').addEventListener('click', () => { if (state.busy) return; AU.sfx('open'); openDialog(D.letter.name, D.letter.lines); });

const say = (lines, then) => openDialog(D.title, lines, then);
function release() { busy = false; npc.state = 'idle'; mode = 'gallop'; modeT = 6 + Math.random() * 4; }

function shuffled(q) {
  const order = q.options.map((_, i) => i);
  if (D.shuffle) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return { q: q.q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) };
}

async function challenge() {
  const score = await openQuiz({ title: '老校長的歷史問答', questions: D.quiz.map(shuffled) });
  if (score === D.quiz.length) { AU.sfx('win'); say(D.pass, () => { giveLetter(); release(); }); }
  else { AU.sfx('faint'); retryAt = performance.now() + D.retrySeconds * 1000; say(D.fail.map(l => l.replace('{score}', score)), release); }
}

function encounter() {
  busy = true; npc.state = 'talk'; AU.sfx('neigh');
  say(D.caught, () => openChoice(D.askStudent, i => {
    if (i !== 0) { say(D.notStudent, release); return; }
    if (state.haveLetter) { say(D.alreadyDone, release); return; }
    if (performance.now() < retryAt) { say(D.cooldown, release); return; }
    say(D.invite, () => openChoice(D.acceptChoices, k => { if (k === 0) challenge(); else say(D.decline, release); }));
  }));
}
npc.spot.fn = encounter;
npc.spot.label = D.catchLabel;
npc.spot.r = 2.8;

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__oldPrincipal = { npc, encounter, challenge, giveLetter, freeze: () => { busy = true; }, setRoute: id => { route = D.routes.find(r => r.id === id) || route; const s = route.points[0]; npc.g.position.set(s[0], 0, s[1]); wp = 1; dir = 1; } };
}
