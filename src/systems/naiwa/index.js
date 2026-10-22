/**
 * 奶蛙立牌：政大校園裡的「流動迷因」。
 *
 * - 一張人形大小的奶蛙紙板立牌，會出現在 content/naiwa.json 的某個出沒點。
 * - 沒人搬的時候，它會自己一跳一跳地在附近晃；玩家離很遠、又沒在看它的時候，會「自己」跑去別的出沒點，
 *   畫面上跳出 Threads／Dcard 風格的小道消息告訴你它現在在哪。
 * - 走近按互動鍵可以把它搬起來帶著走，再按一次放下；第二個按鍵可以跟它打卡拍照。
 * - 從別處把它搬到正校門口放下，拿到成就「奶蛙搬運工」（致敬深夜把奶蛙從商院搬到校門口的同學）。
 * - 搬著它進室內或上車時，會自動先放在門口或路邊。
 */
import { state } from '../../core/state.js';
import { scene, camera } from '../../core/engine.js';
import { resolve } from '../../core/collision.js';
import { AU } from '../audio.js';
import { player } from '../../actors/player.js';
import { groundH, indoor, lerpA, pos, spots, vel, zoneOf } from '../../core/gameplay.js';
import { dlg, toast } from '../../ui/dialog.js';
import { achieve } from '../../ui/achievement.js';
import { canvasTex } from '../../render/kit.js';
import * as THREE from 'three';
import N from '../../content/naiwa.json';
import { STANDEE, createStandee } from './standee.js';

const fill = (s, place) => s.replace('{place}', place);
const pick = a => a[Math.floor(Math.random() * a.length)];
const RELOCATE = [100, 160];         // 沒人理它多久之後自己換地方（秒）
const RELOCATE_AFTER_DROP = 240;     // 玩家親手放的位置，多留一陣子
const FAR = 45;                      // 玩家離多遠才可能偷偷跑走
const HOP = { dist: 0.55, time: 0.5, height: 0.22, pause: [0.15, 0.45] };
const WANDER_R = 4.5;                // 在出沒點附近晃的半徑
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- 模型與頭上的對話泡泡 ---------- */
const nw = createStandee();
scene.add(nw);
const body = nw.userData.body;
let bubbleText = '';
const bubbleTex = canvasTex(512, 160, (g, w, h) => {
  if (!bubbleText) return;
  g.font = '900 52px "Noto Sans TC",sans-serif'; const tw = Math.min(w - 20, g.measureText(bubbleText).width + 60), x = (w - tw) / 2;
  g.fillStyle = '#ffffff'; g.strokeStyle = '#2b2436'; g.lineWidth = 5;
  const r = 30, y = 10, bh = 100; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + tw, y, x + tw, y + bh, r); g.arcTo(x + tw, y + bh, x, y + bh, r); g.arcTo(x, y + bh, x, y, r); g.arcTo(x, y, x + tw, y, r); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(w / 2 - 16, 108); g.lineTo(w / 2, 146); g.lineTo(w / 2 + 16, 108); g.fill(); g.stroke(); g.fillRect(w / 2 - 13, 100, 26, 10);
  g.fillStyle = '#2b2436'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(bubbleText, w / 2, 62);
});
const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, depthWrite: false, transparent: true }));
bubble.scale.set(1.9, 0.6, 1); bubble.position.set(0, STANDEE.h + 0.45, 0); bubble.visible = false; nw.add(bubble);
function say(t) { if (t !== bubbleText) { bubbleText = t; bubbleTex.redraw(); } bubble.visible = !!t; }

/* ---------- 狀態 ---------- */
const S = {
  spot: Math.floor(Math.random() * N.spots.length),   // 目前的出沒點
  home: null,                    // 晃來晃去的中心
  target: null, hopT: 0, pauseT: 1, hopFrom: null, hopTo: null,
  relocateT: rand(...RELOCATE),
  seen: false,                   // 玩家看過它沒（第一次看到跳提示）
  held: false, pickedAt: null,   // 搬起來的位置（成就判斷用）
  sayT: rand(4, 8),
  lastOutdoor: { x: 0, z: 0 },
};
state.holdNaiwa = false;

function placeAt(x, z, yaw) {
  nw.position.set(x, groundH(x, z), z); nw.rotation.y = yaw; body.position.set(0, 0, 0); body.rotation.set(0, 0, 0);
  S.home = { x, z }; S.target = null; S.hopT = 0; S.pauseT = rand(1, 3);
}
function goToSpot(i) { S.spot = i; const s = N.spots[i]; placeAt(s.x, s.z, s.yaw || 0); }
goToSpot(S.spot);

/** 最近的出沒點名稱（放下時說「放在哪」）；太遠就用區域名稱 */
function placeName(x, z) {
  let best = null, bd = 14;
  N.spots.forEach(s => { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s.name; } });
  return best || zoneOf({ x, z });
}

/* ---------- 互動：搬起、放下、打卡 ---------- */
function pickUp() {
  S.held = true; state.holdNaiwa = true; S.pickedAt = { x: nw.position.x, z: nw.position.z };
  say(''); AU.sfx('grab'); toast(N.toasts.pick);
}
function putDown(msg) {
  if (!S.held) return;
  S.held = false; state.holdNaiwa = false;
  const fx = Math.sin(player.rotation.y), fz = Math.cos(player.rotation.y);
  const p = { x: S.lastOutdoor.x + fx * 1.1, z: S.lastOutdoor.z + fz * 1.1, y: 0 };
  resolve(p, 0.45);
  placeAt(p.x, p.z, player.rotation.y + Math.PI);   // 放下時正面朝向玩家
  S.relocateT = RELOCATE_AFTER_DROP;
  AU.sfx('land');
  const place = placeName(p.x, p.z);
  toast(msg || fill(N.toasts.drop, place));
  const G = N.gate;
  if (!msg && S.pickedAt && Math.hypot(p.x - G.x, p.z - G.z) < G.r && Math.hypot(S.pickedAt.x - G.x, S.pickedAt.z - G.z) > 30) achieve('naiwaMover');
}
function takePhoto() {
  AU.sfx('chime'); say('呱！'); S.sayT = 2.2;
  toast(fill(pick(N.toasts.photo), placeName(nw.position.x, nw.position.z)));
}

const spot = { id: 'naiwa', x: 0, z: 0, r: 2.2, label: N.labels.pick, room: null,
  ok: () => !S.held && !state.holdPang && !state.driving && !indoor(), fn: pickUp,
  alt: { label: N.labels.photo, fn: takePhoto } };
const dropSpot = { id: 'naiwa-drop', x: 0, z: 0, r: 5, label: N.labels.drop, room: null,
  ok: () => S.held && !state.driving && !indoor(), fn: () => putDown() };
spots.push(spot, dropSpot);
// 抱著奶蛙的時候不能再抓穿山甲（兩手都滿了）
{ const ps = spots.find(q => q.id === 'pangolin'); if (ps) { const o = ps.ok; ps.ok = () => o() && !state.holdNaiwa; } }

/* ---------- 每一幀 ---------- */
const _v = new THREE.Vector3(), frustum = new THREE.Frustum(), _m = new THREE.Matrix4();
function inView() {
  _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(_m);
  _v.set(nw.position.x, nw.position.y + 0.8, nw.position.z); return frustum.containsPoint(_v);
}

function updateHeld(dt) {
  if (indoor()) { S.held && putDown(N.toasts.dropIndoor); return; }
  if (state.driving) { putDown(N.toasts.dropCar); return; }
  S.lastOutdoor.x = pos.x; S.lastOutdoor.z = pos.z;
  const fx = Math.sin(player.rotation.y), fz = Math.cos(player.rotation.y);
  nw.position.set(pos.x + fx * 0.55, pos.y + 0.12, pos.z + fz * 0.55);
  nw.rotation.y = player.rotation.y;
  const mv = Math.min(1, Math.hypot(vel.x, vel.z) / 4);   // 走越快晃越大
  body.position.y = Math.abs(Math.sin(state.time * 7)) * 0.05 * mv;
  body.rotation.z = Math.sin(state.time * 3.5) * 0.04 * mv;
  dropSpot.x = pos.x; dropSpot.z = pos.z;
}

function updateFree(dt) {
  const p = nw.position, dP = Math.hypot(pos.x - p.x, pos.z - p.z);
  // 第一次看到它
  if (!S.seen && dP < 14 && !indoor() && dlg.hidden) { S.seen = true; toast(fill(N.toasts.first, N.spots[S.spot].name)); }
  // 靠近時偶爾冒一句話
  S.sayT -= dt;
  if (S.sayT <= 0) { S.sayT = rand(5, 9); say(dP < 7 && !indoor() ? pick(N.bubbles) : ''); }
  else if (S.sayT < 3 && S.sayT > 2.8) say('');
  // 自己換地方：玩家離很遠、又沒在看它
  S.relocateT -= dt;
  if (S.relocateT <= 0) {
    if (dP > FAR && (indoor() || dP > 70 || !inView())) {   // 70 公尺外就算在畫面裡也小到看不清楚
      let i = S.spot; while (N.spots.length > 1 && i === S.spot) i = Math.floor(Math.random() * N.spots.length);
      goToSpot(i); S.relocateT = rand(...RELOCATE); say('');
      if (state.started && dlg.hidden && !state.busy) toast(fill(pick(N.toasts.rumor), N.spots[i].name));
    } else S.relocateT = 8;   // 被看著就先不動，等一下再試
  }
  // 沒在跳的時候，慢慢轉過來把正面對著玩家（立牌背面是素色紙板，大家想看的是正面）
  const facePlayer = () => { if (dP < 20) nw.rotation.y = lerpA(nw.rotation.y, Math.atan2(pos.x - p.x, pos.z - p.z), 1 - Math.exp(-dt * 2.5)); };
  // 一跳一跳地在附近晃（玩家站在旁邊時乖乖不動）
  if (dP < 2.4) { body.position.y *= 0.8; body.rotation.z *= 0.8; facePlayer(); return; }
  if (S.hopT > 0) {
    S.hopT -= dt; const k = 1 - Math.max(0, S.hopT) / HOP.time;
    p.x = S.hopFrom.x + (S.hopTo.x - S.hopFrom.x) * k; p.z = S.hopFrom.z + (S.hopTo.z - S.hopFrom.z) * k;
    p.y = groundH(p.x, p.z);
    body.position.y = Math.sin(Math.PI * k) * HOP.height; body.rotation.z = Math.sin(Math.PI * 2 * k) * 0.08;
    if (S.hopT <= 0) { body.position.y = 0; body.rotation.z = 0; S.pauseT = rand(...HOP.pause); }
    return;
  }
  S.pauseT -= dt; if (S.pauseT > 0) { facePlayer(); return; }
  if (!S.target || Math.hypot(S.target.x - p.x, S.target.z - p.z) < 0.4) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * WANDER_R;
    S.target = { x: S.home.x + Math.cos(a) * r, z: S.home.z + Math.sin(a) * r };
    S.pauseT = rand(2, 6); return;   // 走到一個點就站一下
  }
  const dx = S.target.x - p.x, dz = S.target.z - p.z, d = Math.hypot(dx, dz), step = Math.min(HOP.dist, d);
  const to = { x: p.x + dx / d * step, z: p.z + dz / d * step, y: 0 }; resolve(to, 0.45);
  if (Math.hypot(to.x - p.x, to.z - p.z) < 0.05) { S.target = null; S.pauseT = 1; return; }   // 卡住就換目標
  nw.rotation.y = lerpA(nw.rotation.y, Math.atan2(dx, dz), 0.6);
  S.hopFrom = { x: p.x, z: p.z }; S.hopTo = to; S.hopT = HOP.time;
}

let last = performance.now();
function tick() {
  requestAnimationFrame(tick);
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!state.started) return;
  nw.visible = !indoor();
  nw.userData.shadow.visible = !S.held;
  if (S.held) updateHeld(dt); else updateFree(dt);
  spot.x = nw.position.x; spot.z = nw.position.z;
}
requestAnimationFrame(tick);

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__naiwa = { goToSpot, get pos() { return { x: nw.position.x, z: nw.position.z }; }, get spot() { return N.spots[S.spot].name; }, relocateNow: () => { S.relocateT = 0; } };
}
