/**
 * 體育館的規則與劇情：
 *   - 球場上的人在打球：西半場三對三互相傳球、投籃，東邊籃框兩個隊員在練投（籃球在這裡畫、這裡動）
 *   - 場邊坐著休息的人（坐姿掛在 NPC 的 after）
 *   - 雄鷹隊長 Marcus：五投三中的投籃挑戰（shootout.js），贏了送「雄起來打運動毛巾」，
 *     接著說雄鷹吉祥物不見了，玩家接下支線任務「找回失蹤的雄鷹吉祥物」
 *
 * 進度記成劇情旗標（會存檔）：gymWon 贏過投籃挑戰、eagleMissing 接下找雄鷹的支線。
 * 房間本身在 world/buildings/gym/interior.js，NPC 名單在 content/npcs.json（room: "gym"），台詞在 content/gym.json。
 */
import * as THREE from 'three';
import { state } from '../../core/state.js';
import { $ } from '../../core/dom.js';
import { AU } from '../audio.js';
import { NPCS } from '../../actors/npc.js';
import { roomScene } from '../../core/rooms.js';
import { world } from '../../world/registry.js';
import { RIMS } from '../../world/buildings/gym/interior.js';
import { openDialog, toast } from '../../ui/dialog.js';
import { openChoice } from '../../ui/choice.js';
import { setFlag } from '../../content/index.js';
import { toon } from '../../render/kit.js';
import { startShootout } from './shootout.js';
import G from '../../content/gym.json';

const ROOM = 'gym';
const def = world.interiors[ROOM];
const npc = id => NPCS.find(n => n.id === id);
const C = G.captain;

/* ---------- HUD：毛巾道具、支線任務 ---------- */
const css = `
#towelItem .ico{background:#2c2f8f;color:#ffd25e}
#sideQuest{flex-direction:column;align-items:flex-start;gap:2px;border-radius:16px;padding:8px 14px 9px;white-space:normal;max-width:220px}
#sideQuest .tag{font:900 11px var(--round);letter-spacing:.18em;color:#e0662c}
#sideQuest .q{font-size:13px;line-height:1.45}
@media (max-width:520px){#sideQuest{max-width:170px}}
#gymGift{position:fixed;inset:0;z-index:62;display:grid;place-items:center;background:rgba(28,31,43,.6);padding:0 max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px))}
#gymGift .card{width:min(340px,100%);background:#fffaf0;border:4px solid #3e2c1a;border-radius:20px;padding:20px 18px;text-align:center;color:#3e2c1a;
  box-shadow:0 8px 0 rgba(62,44,26,.35);animation:ggPop .45s cubic-bezier(.2,1.6,.4,1);font-family:"Noto Sans TC",sans-serif}
@keyframes ggPop{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}
#gymGift .k{font:900 12px "M PLUS Rounded 1c",sans-serif;letter-spacing:.2em;color:#e0662c}
#gymGift .towel{margin:16px auto;width:210px;max-width:100%;height:92px;border-radius:10px;display:grid;place-items:center;transform:rotate(-3deg);
  background:repeating-linear-gradient(90deg,#2c2f8f 0 18px,#262a80 18px 20px);color:#fff;font:900 26px "Noto Sans TC",sans-serif;letter-spacing:.12em;
  box-shadow:inset 0 -10px 0 #f08a3c,0 6px 0 rgba(62,44,26,.3)}
#gymGift h3{margin:4px 0 6px;font:900 20px "Noto Sans TC",sans-serif}
#gymGift p{margin:0 0 16px;font:700 14px/1.6 "Noto Sans TC",sans-serif;opacity:.8}
#gymGift button{all:unset;cursor:pointer;padding:12px 30px;border-radius:999px;background:linear-gradient(#ffd85a,#f2a93b);font:900 17px "Noto Sans TC",sans-serif;box-shadow:0 6px 0 #b86e10}
#gymGift button:focus-visible{outline:3px solid #3e2c1a;outline-offset:3px}
@media (prefers-reduced-motion:reduce){#gymGift .card{animation:none}}`;
const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

const towelChip = document.createElement('div'); towelChip.className = 'chip'; towelChip.id = 'towelItem'; towelChip.hidden = true;
towelChip.innerHTML = `<span class="ico">◎</span>${G.gift.chip}`;
const questChip = document.createElement('div'); questChip.className = 'chip'; questChip.id = 'sideQuest'; questChip.hidden = true;
questChip.innerHTML = `<span class="tag">${G.sideQuest.tag}</span><span class="q">${G.sideQuest.text}</span>`;
{ const col = $('letterItem') ? $('letterItem').parentNode : document.querySelector('#hud .col.r'); col && col.append(towelChip, questChip); }
function syncHud() { towelChip.hidden = !state.gymWon; questChip.hidden = !state.eagleMissing; }
// 讀存檔時旗標已經恢復，按「開始冒險／繼續冒險」時把道具和任務顯示出來
syncHud();
$('go') && $('go').addEventListener('click', () => setTimeout(syncHud, 0));

/* ---------- 禮物卡片 ---------- */
function showGift() {
  return new Promise(res => {
    const g = G.gift, el = document.createElement('div'); el.id = 'gymGift';
    el.innerHTML = `<div class="card" role="dialog" aria-label="${g.name}"><div class="k">${g.kicker}</div><div class="towel">${g.text}</div><h3>${g.name}</h3><p>${g.desc}</p><button type="button">${g.ok}</button></div>`;
    document.body.appendChild(el); state.busy = true; AU.sfx('gem');
    const btn = el.querySelector('button'); btn.focus();
    const close = () => { removeEventListener('keydown', onKey, true); el.remove(); state.busy = false; res(); };
    const onKey = e => { if (['Space', 'KeyE', 'Enter'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); close(); } };
    addEventListener('keydown', onKey, true);
    btn.addEventListener('click', close);
  });
}

/* ---------- 雄鷹隊長：投籃挑戰 → 送毛巾 → 雄鷹不見了 ---------- */
const captain = npc('gym-captain');
const fillR = (lines, r) => lines.map(s => s.replace('{makes}', r.makes));
function talk(lines, then) { if (captain) captain.state = 'talk'; openDialog(C.title, lines, () => { if (captain) captain.state = 'idle'; then && then(); }); }
function askMascot() {
  talk(C.afterGift, () => openChoice(C.acceptChoices, () => {
    setFlag('eagleMissing'); syncHud(); AU.sfx('chime'); toast(C.acceptToast);
    talk(C.accepted);
  }));
}
async function challenge() {
  const r = await startShootout();
  if (!r.win) { talk(fillR(C.lose, r), () => openChoice(C.retryChoices, i => (i === 0 ? challenge() : talk(C.rest)))); return; }
  talk(fillR(C.win, r), async () => {
    await showGift();
    setFlag('gymWon'); syncHud(); toast(G.gift.toast);
    askMascot();
  });
}
if (captain) {
  captain.spot.label = C.label;
  captain.spot.fn = () => {
    if (state.eagleMissing) { talk(C.hint); return; }
    if (state.gymWon) { askMascot(); return; }   // 拿了毛巾但還沒答應找雄鷹
    talk(C.invite, () => openChoice(C.choices, i => (i === 0 ? challenge() : talk(C.decline))));
  };
}

/* ---------- 場邊坐著休息的人 ---------- */
const sitPose = n => {
  const P = n.P; n.rig.position.y = -0.3;
  P.hipL.rotation.set(-1.5, 0, 0.08); P.hipR.rotation.set(-1.5, 0, -0.08);
  P.shL.rotation.set(-0.5, 0, -0.25); P.shR.rotation.set(-0.5, 0, 0.25);
};
['gym-tunde', 'gym-mei'].forEach(id => { const n = npc(id); if (n) n.after = sitPose; });

/* ---------- 打球的人與籃球 ---------- */
const ballGeo = new THREE.SphereGeometry(0.12, 16, 12), ballMat = toon('#e8662a');
const GROUPS = [
  { ids: ['gym-jamal', 'gym-azhe', 'gym-kofi', 'gym-boyu', 'gym-andre', 'gym-lin'], rim: RIMS[0], shoot: 0.3 },
  { ids: ['gym-daniel', 'gym-yuxiang'], rim: RIMS[1], shoot: 0.6 },
].map(gr => ({ ...gr, mem: gr.ids.map(npc).filter(Boolean) })).filter(gr => gr.mem.length);
const balls = GROUPS.map(gr => {
  const m = new THREE.Mesh(ballGeo, ballMat); m.castShadow = true; m.userData.noOcc = true; roomScene(ROOM).add(m);
  return { gr, m, owner: gr.mem[0], fly: null, timer: 1 + Math.random() * 2 };
});
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
/** 某個人手上的位置（運球時球在身體前面上下彈） */
function handPos(n, out, bounce) {
  const p = n.g.position, ry = n.g.rotation.y;
  return out.set(p.x + Math.sin(ry) * 0.38 + Math.cos(ry) * 0.18, p.y + (bounce === undefined ? 1.0 : bounce), p.z + Math.cos(ry) * 0.38 - Math.sin(ry) * 0.18);
}
function throwTo(b, from, toFn, dur, arc, then) { b.fly = { from: from.clone(), toFn, dur, arc, u: 0, then }; }
function nextMove(b) {
  const { gr } = b, o = b.owner;
  handPos(o, tmpA);
  if (Math.random() < gr.shoot) {
    // 投籃：先飛到籃框，再從籃網掉下來彈到某個人手上
    const r = gr.rim, make = Math.random() < 0.55;
    throwTo(b, tmpA, out => out.set(r.x + (make ? 0 : 0.35), r.y + 0.12, r.z + (make ? 0 : 0.2)), 1.05, 2.2, () => {
      const catcher = gr.mem[(Math.random() * gr.mem.length) | 0];
      throwTo(b, b.m.position, out => handPos(catcher, out), 0.9, 0.6, () => { b.owner = catcher; b.timer = 1 + Math.random() * 2; });
    });
    return;
  }
  let to = o; if (gr.mem.length > 1) while (to === o) to = gr.mem[(Math.random() * gr.mem.length) | 0];
  throwTo(b, tmpA, out => handPos(to, out), 0.55, 0.7, () => { b.owner = to; b.timer = 0.8 + Math.random() * 2.2; });
}
function updateBalls(dt) {
  const t = state.time;
  balls.forEach(b => {
    if (b.fly) {
      const f = b.fly; f.u = Math.min(1, f.u + dt / f.dur);
      f.toFn(tmpB);
      b.m.position.lerpVectors(f.from, tmpB, f.u); b.m.position.y += Math.sin(Math.PI * f.u) * f.arc;
      b.m.rotation.x += dt * 8;
      if (f.u >= 1) { b.fly = null; f.then(); }
      return;
    }
    const o = b.owner;
    // 運球：球在 0.15～0.95 公尺之間彈，碰到地板那一下手往下拍
    const k = Math.abs(Math.sin(t * 7 + o.ph));
    handPos(o, b.m.position, 0.15 + k * 0.8);
    if (o.state !== 'talk') { b.timer -= dt; if (b.timer <= 0) nextMove(b); }
  });
}
// 拿球的人右手跟著運球動作上下拍
const dribbleArm = n => { const b = balls.find(x => x.owner === n && !x.fly); if (!b) return; n.P.shR.rotation.set(-0.7 - Math.abs(Math.sin(state.time * 7 + n.ph)) * 0.5, 0, 0.15); };
GROUPS.forEach(gr => gr.mem.forEach(n => { n.after = dribbleArm; }));

/* ---------- 每一幀（只在體育館裡跑） ---------- */
if (def) {
  const roomUpdate = def.update;
  def.update = dt => { roomUpdate && roomUpdate(dt); updateBalls(dt); };
}

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__gym = { challenge, startShootout, showGift, askMascot, balls };
}
