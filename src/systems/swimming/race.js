/**
 * 跟英文系溫同學比游泳。一直按「划水！」（或空白鍵、E）加速。
 * 前半段跟溫同學差不多，過了一半主角會沒力變慢（設定在 content/swimming.json 的 race），溫同學一定贏，然後說「菜就多練」。
 */
import { state } from '../../core/state.js';
import { AU } from '../audio.js';
import { pos, vel } from '../../core/gameplay.js';
import { openDialog } from '../../ui/dialog.js';
import { puff } from '../feel.js';
import S from '../../content/swimming.json';

const C = S.race;
const css = `
#race{position:fixed;inset:0;z-index:55;pointer-events:none;font-family:"M PLUS Rounded 1c","Noto Sans TC",sans-serif}
#race .bars{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);width:min(440px,86vw);background:rgba(255,250,240,.94);
  border:3px solid #3e2c1a;border-radius:16px;padding:10px 14px;box-shadow:0 4px 0 rgba(62,44,26,.3);font:900 14px "Noto Sans TC",sans-serif;color:#3e2c1a}
#race .row{display:grid;grid-template-columns:4.5em 1fr;align-items:center;gap:8px;margin:4px 0}
#race .track{height:14px;border-radius:999px;background:#d8eef5;border:2px solid #3e2c1a;position:relative;overflow:hidden}
#race .track i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;transition:width .08s linear}
#race .me i{background:linear-gradient(#7fd17a,#3f9a4f)}
#race .wen i{background:linear-gradient(#8fb6ff,#2f6fd0)}
#race .stamina{height:8px;margin-top:6px;border-radius:999px;background:#eadfcb;overflow:hidden}
#race .stamina i{display:block;height:100%;background:linear-gradient(90deg,#f28b7d,#f6d465,#7fd17a);transition:width .1s}
#race .big{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);font-size:clamp(60px,14vw,140px);font-weight:900;color:#fff;
  text-shadow:0 6px 0 #2f6fd0,0 0 18px rgba(0,0,0,.25);letter-spacing:.05em}
#race .hint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 168px);transform:translateX(-50%);color:#fff;font:900 16px "Noto Sans TC",sans-serif;text-shadow:0 2px 0 rgba(0,0,0,.4);white-space:nowrap}
#race button{all:unset;pointer-events:auto;cursor:pointer;position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 56px);transform:translateX(-50%);
  width:150px;height:96px;border-radius:999px;background:linear-gradient(#ffd85a,#f2a93b);color:#3e2c1a;font:900 30px "Noto Sans TC",sans-serif;text-align:center;
  box-shadow:0 8px 0 #b86e10,0 14px 24px rgba(0,0,0,.25);touch-action:manipulation;user-select:none}
#race button:active,#race button.hit{transform:translate(-50%,6px);box-shadow:0 2px 0 #b86e10}`;
const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

let running = false;

/** 開始比賽：wen 是溫同學的 NPC，回傳 Promise（true 主角贏） */
export function startRace(wen) {
  if (running) return Promise.resolve(false);
  running = true;
  return new Promise(done => {
    const L = C.lanes, dist = L.start - L.finish;
    const ui = document.createElement('div'); ui.id = 'race';
    ui.innerHTML = `<div class="bars"><div class="row"><span>你</span><div class="track me"><i></i></div></div>
      <div class="row"><span>溫同學</span><div class="track wen"><i></i></div></div><div class="stamina"><i></i></div></div>
      <div class="big"></div><div class="hint"></div><button type="button"></button>`;
    document.body.appendChild(ui);
    const big = ui.querySelector('.big'), hint = ui.querySelector('.hint'), btn = ui.querySelector('button');
    const meBar = ui.querySelector('.me i'), wenBar = ui.querySelector('.wen i'), stam = ui.querySelector('.stamina i');
    btn.textContent = C.button; hint.textContent = C.hint;

    // 兩個人站到出發點
    state.busy = true; state.racing = true; state.yaw = 0; state.pitch = 0.32;
    let myZ = L.start, wenZ = L.start, speed = 0, go = false, over = false, taps = [], last = performance.now(), tired = false;
    wen.racing = true; wen.g.position.set(L.wen, 0, wenZ); wen.bubbleSave = wen.bubble; wen.bubble = '';
    pos.set(L.player, pos.y, myZ);

    const stroke = () => {
      if (!go || over) return;
      taps.push(performance.now()); AU.sfx('step');
      btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 70);
      if (Math.random() < 0.4) puff(pos.x, -0.2, pos.z, 1, 0.8, 0.25);
    };
    btn.addEventListener('pointerdown', e => { e.preventDefault(); stroke(); });
    const onKey = e => { if (['Space', 'KeyE', 'KeyF', 'Enter'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) stroke(); } };
    addEventListener('keydown', onKey, true);

    // 倒數
    C.countdown.forEach((t, i) => setTimeout(() => { big.textContent = t; AU.sfx(i < 3 ? 'blip' : 'whistle'); if (i === 3) { go = true; setTimeout(() => { big.textContent = ''; }, 700); } }, i * 800));

    const tick = now => {
      if (over) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (go) {
        taps = taps.filter(t => now - t < 1000);
        const done01 = (L.start - myZ) / dist;
        tired = done01 > C.tiredAt;
        // 按得越快越快；過一半之後沒力，最快只能到 tiredSpeed
        const cap = tired ? C.tiredSpeed : C.maxSpeed, want = Math.min(cap, taps.length * 0.55);
        speed += (want - speed) * (1 - Math.exp(-dt * 4));
        myZ -= speed * dt; wenZ -= C.wenSpeed * dt;
        stam.style.width = (tired ? 8 : 100 - done01 * 160) + '%';
        if (tired) hint.textContent = C.tired;
      }
      pos.x = L.player; pos.z = myZ; vel.set(0, 0, -Math.max(0.6, speed));
      wen.g.position.x = L.wen; wen.g.position.z = wenZ;
      meBar.style.width = Math.min(100, (L.start - myZ) / dist * 100) + '%';
      wenBar.style.width = Math.min(100, (L.start - wenZ) / dist * 100) + '%';
      const meDone = myZ <= L.finish, wenDone = wenZ <= L.finish;
      if (meDone || wenDone) {
        over = true; const win = meDone && !wenDone;
        AU.sfx(win ? 'win' : 'faint'); big.textContent = win ? '你贏了！' : '溫同學贏了！';
        // 溫同學先到，主角還在游，讓他游完
        const finishMe = () => {
          if (myZ > L.finish) { myZ -= C.tiredSpeed * 0.016; pos.z = myZ; vel.set(0, 0, -1); requestAnimationFrame(finishMe); return; }
        };
        if (!win) finishMe();
        setTimeout(() => {
          removeEventListener('keydown', onKey, true); ui.remove();
          state.busy = false; state.racing = false; wen.racing = false; wen.bubble = wen.bubbleSave;
          wen.g.position.set(wen.home.x, 0, wen.home.z); vel.set(0, 0, 0);
          running = false;
          openDialog('英文系．溫同學', win ? C.win : C.lose, () => done(win));
        }, 1800);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** 溫同學比賽時的游泳動作（掛在 NPC 的 after） */
export function wenSwimPose(n, dt) {
  if (!n.racing) { if (n.rig.rotation.x) n.rig.rotation.x = 0; return; }
  const P = n.P, t = state.time * 7;
  n.g.rotation.y = Math.PI;
  n.g.position.y = -0.5;
  n.rig.rotation.x = 1.25; n.rig.position.y = 0;
  P.shL.rotation.set(-Math.PI / 2 + Math.sin(t) * 1.6, 0, -0.2); P.shR.rotation.set(-Math.PI / 2 - Math.sin(t) * 1.6, 0, 0.2);
  P.hipL.rotation.x = Math.sin(t * 2) * 0.5; P.hipR.rotation.x = -Math.sin(t * 2) * 0.5;
}
