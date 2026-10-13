/**
 * 寶可夢式回合制戰鬥。
 *
 *   const result = await startBattle(def)
 *   // result：'win'（打倒對手）、'lose'（主角倒下）、'run'（主角逃跑）、'enemyRun'（對手逃跑）、'gameOver'
 *
 * def 的格式見 src/content/missionaries.json 的 battle 欄位：
 *   enemy／player：{ name, level, hp }
 *   playerMoves／enemyMoves：{ id, name, fx, power:[最小,最大], accuracy, heal, run, gameOver, skip, lines:[...] }
 *     skip: true 是什麼都不做的招式（例如睡覺），只播特效和台詞
 *   enemySVG 可選：對手的圖（SVG 字串），沒給就用學生傳教士
 *   enemyAI(state) 可選：回傳對手這回合要用第幾招；沒給就用內建的簡單策略
 *
 * 招式的 fx 對應下面 FX 裡的特效。新增特效時在 FX 加一個函式就好。
 */
import './battle.css';
import { state } from '../../core/state.js';
import { AU } from '../audio.js';
import { enemySVG, fieldSVG, playerSVG, swordSVG } from './sprites.js';

const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => Math.round(a + Math.random() * (b - a));

let root, msgEl, msgText, menuEl, fxEl, spr = {}, bars = {}, numEl;
let advanceFn = null, menuFn = null, menuCur = 0;

/* ---------- 畫面 ---------- */
function infoBox(side, who) {
  const el = document.createElement('div'); el.className = `bt-info ${side}`;
  el.innerHTML = `<div class="bt-row"><span>${who.name}</span><span class="bt-lv">Lv.${who.level}</span></div>
    <div class="bt-hp"><b>HP</b><div class="bt-bar"><i></i></div></div>${side === 'player' ? '<div class="bt-num"></div><div class="bt-exp"><i></i></div>' : ''}`;
  bars[side] = el.querySelector('.bt-bar i');
  if (side === 'player') numEl = el.querySelector('.bt-num');
  return el;
}
function build(def) {
  root = document.createElement('div'); root.id = 'battle'; root.className = 'intro flash';
  const field = document.createElement('div'); field.className = 'bt-field';
  const clouds = [0, 1, 2].map(i => `<div class="bt-cloud" style="top:${6 + i * 9}%;width:${8 + i * 3}%;animation-duration:${50 + i * 22}s;animation-delay:-${i * 19}s"></div>`).join('');
  field.innerHTML = `<div class="bt-bg">${fieldSVG}</div>${clouds}<div class="bt-plat enemy"></div><div class="bt-plat player"></div>
    <div class="bt-sprite enemy">${def.enemySVG || enemySVG}</div><div class="bt-sprite player">${playerSVG}</div><div class="bt-fx"></div>`;
  field.append(infoBox('enemy', def.enemy), infoBox('player', def.player));
  spr.enemy = field.querySelector('.bt-sprite.enemy'); spr.player = field.querySelector('.bt-sprite.player');
  fxEl = field.querySelector('.bt-fx');
  const bottom = document.createElement('div'); bottom.className = 'bt-bottom';
  msgEl = document.createElement('div'); msgEl.className = 'bt-msg';
  msgText = document.createElement('span'); msgEl.append(msgText, Object.assign(document.createElement('i'), { className: 'bt-next' }));
  msgEl.addEventListener('click', () => advanceFn && advanceFn());
  menuEl = document.createElement('div'); menuEl.className = 'bt-menu';
  def.playerMoves.forEach((m, i) => {
    const b = document.createElement('button'); b.type = 'button';
    const t = TYPES[m.type] || TYPES['一般'];
    b.style.setProperty('--c1', t[0]); b.style.setProperty('--c2', t[1]);
    b.innerHTML = `<span>${m.name}</span>${m.type && m.type !== '逃跑' ? `<small>${m.type}</small>` : ''}`;
    b.addEventListener('pointerenter', () => { menuCur = i; renderMenu(); });
    b.addEventListener('click', () => menuFn && menuFn(i));
    menuEl.appendChild(b);
  });
  bottom.append(msgEl, menuEl);
  const flash = document.createElement('div'); flash.className = 'bt-flash';
  root.append(field, bottom, flash);
  document.body.appendChild(root);
}
function renderMenu() { [...menuEl.children].forEach((b, i) => b.classList.toggle('on', i === menuCur)); }
/** 招式屬性的按鈕顏色（上、下漸層） */
const TYPES = {
  '水': ['#6cb6ff', '#2f7fd6'], '地面': ['#e2bd6b', '#b98a3a'], '超能力': ['#f17bd0', '#b04aa6'],
  '光': ['#ffe27a', '#e0a92e'], '一般': ['#b8b8a8', '#87877a'], '逃跑': ['#9aa3ad', '#6b7480'],
};
let beepT = null;
function lowBeep(on) {
  if (on && !beepT) { AU.sfx('lowhp'); beepT = setInterval(() => AU.sfx('lowhp'), 900); }
  if (!on && beepT) { clearInterval(beepT); beepT = null; }
}
/** HP 條一格一格扣（或補），數字跟著滾動 */
function animateHP(side, from, to, max) {
  return new Promise(resolve => {
    const t0 = performance.now(), dur = Math.min(1100, 250 + Math.abs(to - from) * 22);
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), v = Math.round(from + (to - from) * k);
      setHP(side, v, max);
      if (k < 1) requestAnimationFrame(step);
      else { if (side === 'player') lowBeep(to > 0 && to / max <= 0.2); resolve(); }
    };
    requestAnimationFrame(step);
  });
}
/** 傷害或補血的數字跳出來 */
function popNumber(side, text, cls) {
  const c = center(spr[side]);
  const d = add('fx-dmg' + (cls ? ' ' + cls : ''), { left: c.x + 'px', top: (c.y - 20) + 'px' }); d.textContent = text;
  setTimeout(() => d.remove(), 1000);
}
function setHP(side, hp, max) {
  const r = Math.max(0, hp) / max, bar = bars[side];
  bar.style.width = (r * 100).toFixed(1) + '%';
  bar.classList.toggle('mid', r <= 0.5 && r > 0.2); bar.classList.toggle('low', r <= 0.2);
  if (side === 'player') numEl.textContent = `${Math.max(0, hp)}／${max}`;
}

/* ---------- 訊息與選單 ---------- */
/** 打字顯示一句話；needAdvance 為 true 時等玩家按鍵或點擊才繼續 */
function say(text, needAdvance = true) {
  return new Promise(resolve => {
    msgEl.classList.remove('wait'); let k = 0, done = false;
    const full = () => { done = true; clearInterval(t); msgText.textContent = text; if (needAdvance) msgEl.classList.add('wait'); else resolve(); };
    const t = setInterval(() => { k++; if (k % 2) AU.sfx('blip'); msgText.textContent = text.slice(0, k); if (k >= text.length) full(); }, 28);
    advanceFn = () => { if (!done) { full(); return; } if (needAdvance) { advanceFn = null; msgEl.classList.remove('wait'); AU.sfx('select'); resolve(); } };
  });
}
async function sayAll(lines) { for (const l of lines) await say(l); }
function chooseMove() {
  return new Promise(resolve => {
    menuEl.classList.add('on'); renderMenu();
    menuFn = i => { menuFn = null; menuEl.classList.remove('on'); AU.sfx('select'); resolve(i); };
  });
}
function onKey(e) {
  if (!root) return;
  const n = menuEl.children.length;
  if (menuFn) {
    const c = menuCur;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) menuCur = c % 2 ? c - 1 : c;
    else if (['ArrowRight', 'KeyD'].includes(e.code)) menuCur = c % 2 ? c : Math.min(n - 1, c + 1);
    else if (['ArrowUp', 'KeyW'].includes(e.code)) menuCur = c >= 2 ? c - 2 : c;
    else if (['ArrowDown', 'KeyS'].includes(e.code)) menuCur = Math.min(n - 1, c + 2);
    else if (['Enter', 'Space', 'KeyE', 'KeyF'].includes(e.code)) menuFn(menuCur);
    else if (/^Digit[1-4]$/.test(e.code)) menuFn(+e.code.slice(5) - 1);
    else return;
    if (menuCur !== c) AU.sfx('blip');
    renderMenu();
  } else if (['Enter', 'Space', 'KeyE', 'KeyF'].includes(e.code)) { if (advanceFn) advanceFn(); }
  else return;
  e.preventDefault(); e.stopPropagation();
}

/* ---------- 特效 ---------- */
function center(el) {
  const r = el.getBoundingClientRect(), f = fxEl.getBoundingClientRect();
  return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2 };
}
function add(cls, style) { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, style || {}); fxEl.appendChild(d); return d; }
function clearFx() { fxEl.innerHTML = ''; }
async function beam(kind, from, to) {
  const a = center(spr[from]), b = center(spr[to]);
  const len = Math.hypot(b.x - a.x, b.y - a.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
  const el = add('fx-beam' + (kind ? ' ' + kind : ''), { left: a.x + 'px', top: (a.y - 17) + 'px', width: len + 'px' });
  el.style.transform = `rotate(${ang}rad) scaleX(0)`;
  await wait(30); el.style.transform = `rotate(${ang}rad) scaleX(1)`;
  await wait(520);
}
async function hit(side, crit) {
  // 命中瞬間：閃白＋停格一下，打擊感比較強
  add('fx-flash'); await wait(110);
  AU.sfx(crit ? 'crit' : 'hit');
  spr[side].classList.add('blink'); if (crit) root.classList.add('quake');
  await wait(520); spr[side].classList.remove('blink'); root.classList.remove('quake');
}
const FX = {
  async rain(from, to) {
    const tint = add('fx-tint', { background: 'rgba(30,60,110,.45)' }); await wait(20); tint.style.opacity = 1;
    for (let i = 0; i < 46; i++) add('fx-drop', { left: Math.random() * 100 + '%', animationDelay: (Math.random() * 0.5) + 's' });
    AU.sfx('water'); await wait(700); await beam('', from, to);
  },
  async sand(from, to) {
    const tint = add('fx-tint', { background: 'rgba(200,150,80,.45)' }); await wait(20); tint.style.opacity = 1;
    for (let i = 0; i < 60; i++) add('fx-grain', { left: (100 + Math.random() * 20) + '%', top: (Math.random() * 70) + '%', animationDelay: (Math.random() * 0.8) + 's' });
    AU.sfx('sand'); await wait(800); await beam('sand', from, to);
  },
  async holy(from, to) {
    const p = add('fx-pillar'); AU.sfx('holy');
    const c = center(spr[to]); p.style.left = (c.x - fxEl.clientWidth * 0.15) + 'px';
    await wait(30); p.style.height = '100%';
    const w = add('fx-white'); await wait(420); w.style.opacity = 0.75; await wait(160); w.style.opacity = 0; await wait(200);
  },
  async sword(from, to) {
    const a = center(spr[from]), b = center(spr[to]);
    const s = add('fx-sword', { left: a.x + 'px', top: (a.y - 60) + 'px' }); s.innerHTML = swordSVG;
    s.style.transform = 'rotate(-120deg)'; AU.sfx('sword');
    await wait(30); s.style.transform = `translate(${b.x - a.x}px,${b.y - a.y}px) rotate(-240deg)`;
    await wait(520); s.remove();
    const sl = add('fx-slash'); await wait(20); sl.style.transform = 'rotate(-28deg) scaleX(1)'; await wait(260);
  },
  async heal(from) {
    AU.sfx('heal'); const c = center(spr[from]);
    for (let i = 0; i < 18; i++) add('fx-spark', { left: (c.x - 80 + Math.random() * 160) + 'px', top: (c.y + Math.random() * 60) + 'px', animationDelay: (Math.random() * 0.5) + 's' });
    await wait(1000);
  },
  async flee(from) { AU.sfx('flee'); spr[from].classList.add(from === 'player' ? 'gone-left' : 'gone-right'); await wait(600); },
  async politics() { AU.sfx('over'); root.classList.add('quake', 'gray'); await wait(1600); root.classList.remove('quake'); },
  // 甜甜圈：從頭上冒出來再補血
  async donut(from, to) {
    const c = center(spr[from]);
    const d = add('fx-donut', { left: (c.x - 26) + 'px', top: (c.y - 110) + 'px', width: '52px', height: '52px', borderRadius: '50%', position: 'absolute',
      background: 'radial-gradient(circle,transparent 0 9px,#f39ac0 10px 20px,#c98a4b 21px 26px)', border: '3px solid #2a2c4a', transition: 'transform .5s', transform: 'scale(0)' });
    await wait(30); d.style.transform = 'scale(1) rotate(20deg)'; AU.sfx('grab'); await wait(650); d.remove();
    await FX.heal(from, to);
  },
  // 紅單：一張紅色罰單飛過去
  async ticket(from, to) {
    const a = center(spr[from]), b = center(spr[to]);
    const t = add('fx-ticket', { left: a.x + 'px', top: a.y + 'px', width: '46px', height: '30px', position: 'absolute', background: '#e8463c', border: '3px solid #2a2c4a',
      borderRadius: '4px', color: '#fff', font: '900 13px "Noto Sans TC",sans-serif', display: 'grid', placeItems: 'center', transition: 'transform .55s ease-in' });
    t.textContent = '罰單'; AU.sfx('whistle');
    await wait(30); t.style.transform = `translate(${b.x - a.x}px,${b.y - a.y}px) rotate(540deg)`; await wait(560); t.remove();
  },
  // 吹哨子：音符和聲波往對手衝過去
  async whistle(from, to) {
    const a = center(spr[from]), b = center(spr[to]); AU.sfx('whistle');
    for (let i = 0; i < 4; i++) {
      const n = add('fx-note', { left: a.x + 'px', top: (a.y - 30) + 'px', position: 'absolute', font: '900 34px "M PLUS Rounded 1c",sans-serif', color: '#e8463c',
        transition: 'transform .55s ease-in, opacity .55s', textShadow: '0 2px 0 #fff' });
      n.textContent = i % 2 ? '♫' : '♪';
      setTimeout(() => { n.style.transform = `translate(${b.x - a.x}px,${b.y - a.y + (i - 1.5) * 18}px) scale(1.4)`; n.style.opacity = 0.2; }, i * 120);
    }
    await wait(900);
  },
  // 丟救生圈：紅白相間的圈圈轉著飛過去
  async buoy(from, to) {
    const a = center(spr[from]), b = center(spr[to]);
    const r = add('fx-buoy', { left: (a.x - 28) + 'px', top: (a.y - 28) + 'px', width: '56px', height: '56px', borderRadius: '50%', position: 'absolute',
      background: 'conic-gradient(#e8463c 0 25%,#fff 0 50%,#e8463c 0 75%,#fff 0)', border: '3px solid #2a2c4a',
      WebkitMask: 'radial-gradient(circle,transparent 14px,#000 15px)', mask: 'radial-gradient(circle,transparent 14px,#000 15px)', transition: 'transform .6s ease-in' });
    AU.sfx('grab'); await wait(30); r.style.transform = `translate(${b.x - a.x}px,${b.y - a.y}px) rotate(720deg)`; await wait(620); r.remove();
  },
  // 睡覺：頭上飄 Zzz
  async sleep(from) {
    const c = center(spr[from]);
    for (let i = 0; i < 3; i++) {
      const z = add('fx-zzz', { left: (c.x + 20 + i * 18) + 'px', top: (c.y - 70 - i * 22) + 'px', position: 'absolute', font: `900 ${22 + i * 8}px "M PLUS Rounded 1c",sans-serif`,
        color: '#5b6b9a', opacity: 0, transition: 'opacity .3s, transform 1.4s', transform: 'translateY(10px)' });
      z.textContent = 'Z'; setTimeout(() => { z.style.opacity = 1; z.style.transform = 'translateY(-20px)'; }, i * 250);
    }
    await wait(1500);
  },
};

/* ---------- 戰鬥流程 ---------- */
function defaultAI(s, moves) {
  const idx = id => moves.findIndex(m => m.id === id);
  const r = s.enemyHP / s.enemyMax, rr = Math.random();
  if (r < 0.2 && rr < 0.25 && idx('run') >= 0) return idx('run');
  if (r < 0.4 && s.heals < 2 && rr < 0.6 && idx('heal') >= 0) { s.heals++; return idx('heal'); }
  const attacks = moves.map((m, i) => (m.power ? i : -1)).filter(i => i >= 0);
  return attacks[Math.floor(Math.random() * attacks.length)];
}

/** 使出一招，回傳 'continue'、'run' 或 'gameOver' */
async function useMove(m, from, to, s, msgs) {
  const fx = FX[m.fx], L = m.lines;
  // 招式前的台詞（最後一句不用按鍵，直接接動畫），招式後的台詞
  let pre = L, post = [];
  if (m.heal || m.skip) { pre = L.slice(0, -1); post = L.slice(-1); }
  if (m.gameOver) { pre = L.slice(0, 1); post = L.slice(1); }
  for (let i = 0; i < pre.length; i++) await say(pre[i], i < pre.length - 1);
  await wait(300);
  if (m.run) { if (fx) await fx(from, to); await wait(500); return 'run'; }
  if (m.skip) { if (fx) await fx(from, to); clearFx(); await sayAll(post); return 'continue'; }
  if (m.gameOver) { if (fx) await fx(from, to); await sayAll(post); return 'gameOver'; }
  if (m.heal) {
    if (fx) await fx(from, to); clearFx();
    const key = from === 'enemy' ? 'enemyHP' : 'playerHP', max = from === 'enemy' ? s.enemyMax : s.playerMax;
    const before = s[key]; s[key] = Math.min(max, s[key] + m.heal);
    popNumber(from, '+' + (s[key] - before), 'heal'); await animateHP(from, before, s[key], max);
    await wait(300); await sayAll(post); return 'continue';
  }
  if (Math.random() > (m.accuracy ?? 1)) { await say(msgs.miss); return 'continue'; }
  if (fx) await fx(from, to);
  const crit = Math.random() < 1 / 8;
  let dmg = rand(m.power[0], m.power[1]); if (crit) dmg = Math.round(dmg * 1.5);
  clearFx();
  const key = to === 'enemy' ? 'enemyHP' : 'playerHP', max = to === 'enemy' ? s.enemyMax : s.playerMax;
  const before = s[key]; s[key] = Math.max(0, s[key] - dmg);
  popNumber(to, '-' + dmg, crit ? 'crit' : '');
  await Promise.all([hit(to, crit), animateHP(to, before, s[key], max)]);
  await wait(350);
  if (crit) await say(msgs.crit);
  return 'continue';
}

/** 開始一場戰鬥，戰鬥結束後回傳結果 */
export async function startBattle(def) {
  state.busy = true; menuCur = 0;
  AU.music('battle'); AU.sfx('encounter');
  build(def);
  addEventListener('keydown', onKey, true);
  const s = { enemyHP: def.enemy.hp, enemyMax: def.enemy.hp, playerHP: def.player.hp, playerMax: def.player.hp, heals: 0 };
  setHP('enemy', s.enemyHP, s.enemyMax); setHP('player', s.playerHP, s.playerMax);
  // 開場：閃屏 → 對手以黑色剪影滑入 → 顯現顏色
  spr.enemy.classList.add('sil');
  await wait(950); root.classList.remove('flash'); await wait(60); root.classList.remove('intro'); await wait(900);
  spr.enemy.classList.remove('sil'); AU.sfx('encounter'); await wait(500);
  for (const l of def.intro) await say(l);
  const msgs = def.messages, ai = def.enemyAI || defaultAI;
  let result = null;
  while (!result) {
    msgText.textContent = def.prompt; msgEl.classList.remove('wait'); advanceFn = null;
    const mv = def.playerMoves[await chooseMove()];
    let r = await useMove(mv, 'player', 'enemy', s, msgs);
    if (r === 'gameOver') { result = 'gameOver'; break; }
    if (r === 'run') { result = 'run'; break; }
    if (s.enemyHP <= 0) {
      AU.sfx('faint'); spr.enemy.classList.add('faint'); await wait(700);
      AU.music('field'); AU.sfx('win'); await sayAll(msgs.enemyFaint); result = 'win'; break;
    }
    const em = def.enemyMoves[ai(s, def.enemyMoves)];
    r = await useMove(em, 'enemy', 'player', s, msgs);
    if (r === 'run') { result = 'enemyRun'; break; }
    if (s.playerHP <= 0) { AU.sfx('faint'); spr.player.classList.add('faint'); await wait(700); await sayAll(msgs.playerFaint); result = 'lose'; break; }
  }
  if (result !== 'gameOver') AU.music('field');
  removeEventListener('keydown', onKey, true); lowBeep(false);
  if (result !== 'gameOver') { root.remove(); root = null; state.busy = false; }
  return result;
}

/** 遊戲結束時把戰鬥畫面收掉（結局畫面會蓋在上面） */
export function closeBattle() {
  lowBeep(false);
  if (root) { root.remove(); root = null; }
  removeEventListener('keydown', onKey, true);
}
