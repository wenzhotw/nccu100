/**
 * 噴水池曝露狂：穿著泳衣走出游泳館之後的劇情。
 *
 *   1. 游泳館出口，櫃檯阿姨問「要這樣穿直接出去嗎？」選「就這樣穿出去」（systems/swimming）。
 *   2. 在外面穿著泳衣：路過的人會議論紛紛（好帥喔、身材好好喔、是要去參加遊行嗎？）。
 *   3. 穿著泳衣走近噴水池：噴水池開始噴水，池邊出現「跳進噴水池游泳」。
 *      沒穿泳衣時池邊是「看看噴水池」，提示穿著泳衣就可以跳進來。
 *   4. 跳下去游泳：一群同學跑過來圍著噴水池喊生日快樂，玩家回答：
 *        今天不是我生日啊　　　 → 「沒有生日還下水搞屁呀！」
 *        今天是我生日，謝謝大家 → 「生日快樂！！記得許願喔！」
 *      回答完大家一哄而散，主角回到池邊，獲得成就「噴水池曝露狂」。
 *
 * 台詞在 src/content/fountain-swim.json，成就在 src/content/achievements.json（fountainFlasher）。
 */
import * as THREE from 'three';
import { state } from '../../core/state.js';
import { scene } from '../../core/engine.js';
import { colliders } from '../../core/collision.js';
import { registerHeight } from '../../world/registry.js';
import { FZ } from '../../world/terrain/fountain.js';
import { AU } from '../audio.js';
import { NPCS, addNPC } from '../../actors/npc.js';
import { player } from '../../actors/player.js';
import { pos, spots, transition } from '../../core/gameplay.js';
import { dlg, openDialog, toast } from '../../ui/dialog.js';
import { openChoice } from '../../ui/choice.js';
import { achieve } from '../../ui/achievement.js';
import { puff } from '../feel.js';
import F from '../../content/fountain-swim.json';

const FR = 5.6;                                   // 噴水池半徑（world/terrain/fountain.js）
const outside = () => !state.room;
const inSuit = () => state.outfit === 'swim' && outside() && !state.isEagle && !state.driving;
state.inFountain = false;

/* ---------- 噴水：中間一柱、池邊一圈八柱，穿泳衣靠近才噴 ---------- */
const jets = new THREE.Group(); jets.userData.noOcc = true; jets.visible = false; scene.add(jets);
const WATER = new THREE.MeshBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0.72, depthWrite: false });
const COL = new THREE.CylinderGeometry(0.12, 0.2, 1, 10, 1, true); COL.translate(0, 0.5, 0);
const CAP = new THREE.SphereGeometry(1, 10, 8);
const columns = [];
function jet(x, z, w, h, tilt) {
  const g = new THREE.Group(); g.position.set(x, 0.45, z); jets.add(g);
  const c = new THREE.Mesh(COL, WATER); c.scale.set(w, h, w); g.add(c);
  const top = new THREE.Mesh(CAP, WATER); top.scale.setScalar(0.35 * w); g.add(top);
  if (tilt) g.rotation.set(tilt[0], 0, tilt[1]);
  columns.push({ g, c, top, h, ph: Math.random() * 6 });
}
jet(0, FZ, 2.2, 5.5);
for (let i = 0; i < 8; i++) {
  const a = i / 8 * Math.PI * 2, r = FR - 1.1;
  jet(Math.sin(a) * r, FZ + Math.cos(a) * r, 1, 2.6, [-Math.cos(a) * 0.45, Math.sin(a) * 0.45]);   // 往池中間斜噴
}
let jetK = 0, jetsToastShown = false;
function updateJets(dt) {
  const near = inSuit() && Math.hypot(pos.x, pos.z - FZ) < FR + 10;
  const want = state.inFountain || near ? 1 : 0;
  jetK += (want - jetK) * (1 - Math.exp(-dt * 2.5));
  jets.visible = jetK > 0.02;
  if (!jets.visible) return;
  if (near && !jetsToastShown) { jetsToastShown = true; AU.sfx('splash'); toast(F.fountain.jetsToast); }
  columns.forEach((j, i) => {
    j.g.visible = !(i === 0 && state.inFountain);   // 主角在池中間時，中間那柱水先停，才看得到主角
    const h = j.h * jetK * (0.85 + 0.15 * Math.sin(state.time * 5 + j.ph));
    j.c.scale.y = Math.max(0.01, h); j.top.position.y = h;
    if (Math.random() < dt * 4 * jetK) { const p = j.top.getWorldPosition(new THREE.Vector3()); puff(p.x, p.y, p.z, 1, 0.9, 0.3); }
  });
}

/* ---------- 路人議論：穿泳衣在外面走，附近的人頭上冒出評語 ---------- */
let nextComment = 0;
function updateComments(now) {
  if (!inSuit() || state.inFountain || now < nextComment || !dlg.hidden) return;
  const near = NPCS.filter(n => !n.room && !n.crowd && !n.bubble && n.g.visible && n.fear <= 0 && n.state !== 'chase'
    && now > (n.suitSaidAt || 0) && Math.hypot(n.g.position.x - pos.x, n.g.position.z - pos.z) < 9);
  if (!near.length) return;
  const n = near[Math.floor(Math.random() * near.length)];
  n.sp.say(F.comments[Math.floor(Math.random() * F.comments.length)]); n.sayT = 2.8;
  n.suitSaidAt = now + 9000 + Math.random() * 4000;
  nextComment = now + 1500;
}

/* ---------- 圍觀的同學：第一次跳進噴水池才建立，平常藏起來 ---------- */
let crowd = null;
function makeCrowd() {
  crowd = F.crowd.people.map((look, i) => {
    const n = addNPC({ id: 'fountain-crowd-' + i, title: F.crowd.title, home: { x: 0, z: FZ + 30 }, look: { ...look, scale: 1.1 }, dialog: [{ lines: F.crowd.lines }] });
    n.crowd = true; n.g.visible = false; n.spot.ok = () => false;
    return n;
  });
}
/** 從遠處跑過來，圍成一圈 */
function gather() {
  crowd.forEach((n, i) => {
    const a = i / crowd.length * Math.PI * 2, far = 13 + (i % 3) * 2, ring = FR + 1.3;
    n.g.position.set(Math.sin(a) * far, 0, FZ + Math.cos(a) * far);
    n.home = { x: Math.sin(a) * ring, z: FZ + Math.cos(a) * ring }; n.face = a + Math.PI;
    n.shout = F.crowd.shout; n.si = i % F.crowd.shout.length; n.sayT = 0.5 + i * 0.25;
    n.state = 'return'; n.g.visible = true;
  });
}
/** 一哄而散，跑遠之後藏起來 */
function scatter() {
  crowd.forEach((n, i) => {
    const a = i / crowd.length * Math.PI * 2 + 0.3;
    n.home = { x: Math.sin(a) * 40, z: FZ + Math.cos(a) * 40 }; n.shout = null; n.sp.say(''); n.state = 'return';
  });
  setTimeout(() => crowd.forEach(n => { n.g.visible = false; n.state = 'idle'; }), 7000);
}
const gathered = () => crowd.every(n => n.state === 'idle');
/** 時間到了還沒跑到的人（被路上的東西卡住），直接站到定位 */
function snapCrowd() {
  crowd.forEach(n => { if (n.state !== 'idle') { n.g.position.set(n.home.x, 0, n.home.z); n.g.rotation.y = n.face; n.state = 'idle'; } });
}

/* ---------- 跳進噴水池 ---------- */
// 噴水池的碰撞圓：在池裡的時候關掉，出來再打開
const poolCol = colliders.find(c => c.c && c.x === 0 && c.z === FZ);
const poolR = poolCol ? poolCol.r : 0;
// 在池裡：浮在水面上（池水水面高 0.45）
registerHeight((x, z) => (state.inFountain && Math.hypot(x, z - FZ) < FR - 0.4 ? 0.12 : null));

function jumpIn() {
  if (!crowd) makeCrowd();
  transition(() => {
    if (poolCol) poolCol.r = 0;
    state.inFountain = true; state.swimming = true;
    pos.set(0, 0.12, FZ + 1.5); state.yaw = 0; state.pitch = 0.35; player.rotation.y = Math.PI;
    AU.sfx('splash'); puff(pos.x, 0.5, pos.z, 10, 2.4, 0.5);
  });
  setTimeout(() => {
    toast(F.fountain.jumpToast);
    state.busy = true;   // 劇情進行中：不能移動
    gather();
    const t0 = state.time;   // 用遊戲時間計算，手機卡頓時也不會還沒跑到就開始
    const wait = () => {
      if (!gathered() && state.time - t0 > 6) snapCrowd();
      if (gathered()) { state.busy = false; birthday(); return; }
      requestAnimationFrame(wait);
    };
    requestAnimationFrame(wait);
  }, 1400);
}
function birthday() {
  const C = F.crowd;
  openDialog(C.title, C.lines, () => openChoice(C.choices, i => {
    openDialog(C.title, i === 0 ? C.notBirthday : C.birthday, () => {
      scatter(); toast(C.scatterToast); state.busy = true;
      setTimeout(climbOut, 2200);
    });
  }));
}
function climbOut() {
  transition(() => {
    state.inFountain = false; state.swimming = false;
    if (poolCol) poolCol.r = poolR;
    pos.set(0, 0, FZ + FR + 1.4); state.yaw = 0; state.pitch = 0.3; player.rotation.y = Math.PI;
  });
  setTimeout(() => achieve('fountainFlasher'), 1500);
}

/* 池邊的互動點：跟著主角移到最近的池邊 */
const spot = { id: 'fountain-swim', x: 0, z: FZ + FR, r: 1.9, room: null, label: F.fountain.spot,
  ok: () => inSuit() && !state.inFountain && !state.holdPang, fn: jumpIn };
spots.push(spot);
/* 沒穿泳衣時：池邊可以「看看噴水池」，提示穿泳衣就能跳進來 */
const hint = { id: 'fountain-hint', x: spot.x, z: spot.z, r: 1.9, room: null, label: F.fountain.hintLabel,
  ok: () => outside() && state.outfit !== 'swim' && !state.inFountain && !state.driving && !state.holdPang,
  fn: () => openDialog(F.fountain.hintTitle, F.fountain.hint) };
spots.push(hint);

/* ---------- 每一幀 ---------- */
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state.started) {
    updateJets(dt);
    updateComments(now);
    const dx = pos.x, dz = pos.z - FZ, d = Math.hypot(dx, dz) || 1;
    spot.x = dx / d * (FR + 0.3); spot.z = FZ + dz / d * (FR + 0.3);
    hint.x = spot.x; hint.z = spot.z;
    if (state.inFountain) state.swimming = true;   // 在池裡一直維持游泳姿勢
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__fountain = { jumpIn, get crowd() { return crowd; } };
}
