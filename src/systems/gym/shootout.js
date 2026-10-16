/**
 * 投籃挑戰：跟雄鷹隊長 Marcus 比投籃，五球至少進三球就贏。
 *
 * 每一球分兩步：
 *   1. 方向：指針左右擺動，停在綠色區按下（按鈕、點畫面、空白鍵或 E 都可以）
 *   2. 力道：力道條上下跑，升到綠色帶按下出手
 * 兩個都在綠色區就是空心；只差一點點時有一半機率打框滾進去。
 * 已經進三球或失誤三球就提早結束。數值設定在 content/gym.json 的 shootout。
 *
 *   const r = await startShootout();   // { makes, shots, win }
 */
import { state } from '../../core/state.js';
import { AU } from '../audio.js';
import G from '../../content/gym.json';

const C = G.shootout;
const css = `
#shoot{position:fixed;inset:0;z-index:58;display:flex;flex-direction:column;align-items:center;gap:10px;background:rgba(28,31,43,.88);
  padding:calc(env(safe-area-inset-top,0px) + 14px) max(14px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 16px) max(14px,env(safe-area-inset-left,0px));
  font-family:"M PLUS Rounded 1c","Noto Sans TC",sans-serif;color:#3e2c1a;animation:shIn .2s ease-out}
@keyframes shIn{from{opacity:0}to{opacity:1}}
#shoot .head{width:min(560px,100%);display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fffaf0;border:4px solid #3e2c1a;border-radius:16px;
  padding:8px 14px;box-shadow:0 6px 0 rgba(62,44,26,.35)}
#shoot h2{margin:0;font:900 20px "Noto Sans TC",sans-serif}
#shoot h2 small{display:block;font:700 12px "Noto Sans TC",sans-serif;opacity:.7}
#shoot .dots{display:flex;gap:6px}
#shoot .dot{width:18px;height:18px;border-radius:50%;border:3px solid #3e2c1a;background:#fff}
#shoot .dot.in{background:#5cc46b}#shoot .dot.out{background:#f0614f}
#shoot canvas{flex:1;min-height:0;width:min(560px,100%);border:4px solid #3e2c1a;border-radius:16px;box-shadow:0 6px 0 rgba(62,44,26,.35);touch-action:none;display:block}
#shoot .foot{width:min(560px,100%);display:flex;align-items:center;gap:12px}
#shoot .hint{flex:1;color:#fff;font:900 15px "Noto Sans TC",sans-serif;text-shadow:0 2px 0 rgba(0,0,0,.4);line-height:1.4}
#shoot button{all:unset;cursor:pointer;min-width:132px;padding:14px 18px;border-radius:999px;text-align:center;background:linear-gradient(#ffd85a,#f2a93b);
  font:900 20px "Noto Sans TC",sans-serif;color:#3e2c1a;box-shadow:0 7px 0 #b86e10,0 12px 20px rgba(0,0,0,.25);touch-action:manipulation;user-select:none}
#shoot button:active{transform:translateY(5px);box-shadow:0 2px 0 #b86e10}
#shoot button[disabled]{opacity:.5;pointer-events:none}`;
const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

let running = false;
const lerp = (a, b, t) => a + (b - a) * t;

export function startShootout() {
  if (running) return Promise.resolve({ makes: 0, shots: 0, win: false });
  running = true;
  return new Promise(done => {
    const ui = document.createElement('div'); ui.id = 'shoot';
    ui.innerHTML = `<div class="head"><h2>${C.title}<small>${C.rule}</small></h2><div class="dots"></div></div>
      <canvas></canvas><div class="foot"><div class="hint"></div><button type="button"></button></div>`;
    document.body.appendChild(ui);
    const cv = ui.querySelector('canvas'), g = cv.getContext('2d'), dots = ui.querySelector('.dots'), hint = ui.querySelector('.hint'), btn = ui.querySelector('button');
    state.busy = true;

    const S = { phase: 'aim', t: 0, aim: 0.5, pow: 0, fly: null, res: null, results: [], makes: 0 };
    let W = 0, H = 0, DPR = 1, last = performance.now(), over = false;
    const size = () => { const r = cv.getBoundingClientRect(); DPR = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); };
    size(); addEventListener('resize', size);

    const renderDots = () => { dots.innerHTML = ''; for (let i = 0; i < C.shots; i++) { const e = document.createElement('span'); e.className = 'dot' + (i < S.results.length ? (S.results[i] ? ' in' : ' out') : ''); dots.appendChild(e); } };
    const setHint = () => {
      btn.disabled = S.phase !== 'aim' && S.phase !== 'pow';
      if (S.phase === 'aim') { hint.textContent = C.aimHint; btn.textContent = C.aimButton; }
      if (S.phase === 'pow') { hint.textContent = C.powerHint; btn.textContent = C.shootButton; }
    };
    renderDots(); setHint();

    const press = () => {
      if (over) return;
      if (S.phase === 'aim') { S.phase = 'pow'; S.t = 0; AU.sfx('blip'); setHint(); return; }
      if (S.phase !== 'pow') return;
      const ae = S.aim - 0.5, pe = S.pow - C.powerTarget;
      let make = Math.abs(ae) < C.aimZone && Math.abs(pe) < C.powerZone, rim = false;
      if (!make && Math.abs(ae) < C.aimZone + 0.06 && Math.abs(pe) < C.powerZone + 0.05) { rim = true; make = Math.random() < 0.5; }
      S.fly = { ae, pe, make, rim, u: 0, after: 0 }; S.phase = 'fly'; AU.sfx('jump'); setHint();
    };
    btn.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
    cv.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
    const onKey = e => { if (['Space', 'KeyE', 'KeyF', 'Enter'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) press(); } };
    addEventListener('keydown', onKey, true);

    const finishShot = () => {
      const f = S.fly; S.results.push(f.make); if (f.make) S.makes++; renderDots();
      const shots = S.results.length, misses = shots - S.makes;
      S.fly = null; S.res = null;
      if (S.makes >= C.need || misses > C.shots - C.need || shots >= C.shots) {
        over = true; S.phase = 'done'; setHint();
        const win = S.makes >= C.need;
        AU.sfx(win ? 'win' : 'faint');
        hint.textContent = win ? `進了 ${S.makes} 球，挑戰成功！` : `進了 ${S.makes} 球，挑戰失敗`;
        setTimeout(() => {
          removeEventListener('keydown', onKey, true); removeEventListener('resize', size); ui.remove();
          state.busy = false; running = false;
          done({ makes: S.makes, shots, win });
        }, 1300);
        return;
      }
      S.phase = 'aim'; S.t = 0; setHint();
    };

    /* ---------- 畫面：從罰球線看過去的籃框，背景是體育館 ---------- */
    const draw = dt => {
      S.t += dt;
      if (S.phase === 'aim') S.aim = 0.5 + 0.5 * Math.sin(S.t * C.aimSpeed + 0.6);
      if (S.phase === 'pow') S.pow = 0.5 - 0.5 * Math.cos(S.t * C.powerSpeed);
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      const w = W, h = H, floorY = h * 0.6;
      // 天花板與吸音板
      g.fillStyle = '#20232f'; g.fillRect(0, 0, w, floorY);
      for (let r = 0; r < 6; r++) { const y = 6 + r * r * 3 + r * 9, th = 5 + r * 1.6;
        for (let k = -12; k <= 12; k++) { const x = w / 2 + k * (24 + r * 7) + (r % 2) * 12; g.fillStyle = `rgba(214,152,96,${0.35 + r * 0.1})`; g.fillRect(x - 9 - r * 2, y, 18 + r * 4, th); } }
      // 遠處的看台
      const sy = h * 0.3;
      for (let r = 0; r < 5; r++) for (let x = 4 + (r % 2) * 7; x < w; x += 14) { g.fillStyle = ['#ee7a2c', '#e9e6df', '#ee7a2c', '#8d919b', '#f08d47'][(x * 3 + r * 7 & 63) % 5]; g.fillRect(x, sy + r * 9, 10, 6); }
      g.fillStyle = '#6f8fbd'; g.fillRect(0, sy + 47, w, 3);
      g.fillStyle = '#2f3a86'; g.fillRect(0, floorY - h * 0.08, w, h * 0.08);
      g.fillStyle = '#fff'; g.font = `900 ${Math.round(h * 0.035)}px "M PLUS Rounded 1c",sans-serif`; g.textAlign = 'center'; g.fillText('雄起來打　NCCU GRIFFINS　雄起來打', w / 2, floorY - h * 0.025);
      // 地板
      const fl = g.createLinearGradient(0, floorY, 0, h); fl.addColorStop(0, '#d9a066'); fl.addColorStop(1, '#efc48a'); g.fillStyle = fl; g.fillRect(0, floorY, w, h - floorY);
      g.strokeStyle = 'rgba(140,85,40,.25)'; g.lineWidth = 1;
      for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(w / 2 + i * 12, floorY); g.lineTo(w / 2 + i * 60, h); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.2, h - 40); g.lineTo(w * 0.8, h - 40); g.stroke();
      // 籃板、籃架
      const hx = w / 2, hy = h * 0.34, bs = Math.min(1.25, w / 380);
      g.fillStyle = '#3e8fd6'; g.fillRect(hx - 7 * bs, hy - 112 * bs, 14 * bs, 34 * bs);
      g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(hx - 74 * bs, hy - 86 * bs, 148 * bs, 96 * bs);
      g.strokeStyle = '#3e2c1a'; g.lineWidth = 3; g.strokeRect(hx - 74 * bs, hy - 86 * bs, 148 * bs, 96 * bs);
      g.strokeStyle = '#d63a2f'; g.lineWidth = 3.5 * bs; g.strokeRect(hx - 26 * bs, hy - 38 * bs, 52 * bs, 40 * bs);
      const rx = 30 * bs, ry = 8 * bs, rimY = hy + 8 * bs;
      g.strokeStyle = '#ff6a1a'; g.lineWidth = 5 * bs; g.beginPath(); g.ellipse(hx, rimY, rx, ry, 0, Math.PI, Math.PI * 2); g.stroke();
      // 球
      const sx = hx, sy0 = h - 80, sr = 24 * bs;
      let bx = sx, by = sy0, br = sr, behind = false;
      if (S.fly) {
        const f = S.fly;
        if (f.u < 1) f.u = Math.min(1, f.u + dt / 0.95);
        const tx = hx + f.ae * 240 * bs, ty = rimY - f.pe * 170 * bs, u = f.u;
        bx = lerp(sx, tx, u); by = lerp(sy0, ty, u) - Math.sin(Math.PI * u) * h * 0.4; br = lerp(sr, 12 * bs, u);
        if (f.u >= 1) {
          f.after += dt; const a = f.after;
          if (f.make) { bx = tx + (hx - tx) * Math.min(1, a * 5); by = ty + a * a * 280; behind = a > 0.04; }
          else { const dir = f.ae > 0.02 ? 1 : f.ae < -0.02 ? -1 : (f.pe > 0 ? 1 : -1); bx = tx + dir * a * 170; by = ty - 34 * Math.sin(Math.min(1, a * 2.5) * Math.PI) + a * a * 220; }
          if (!S.res) { S.res = f; AU.sfx(f.make ? 'gem' : 'hit'); }
          if (a > 0.95) finishShot();
        }
      }
      const ball = () => {
        if (S.phase === 'done' && !S.fly) return;
        g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(bx, Math.max(by + br, floorY) + 6, br * 0.9, br * 0.3, 0, 0, Math.PI * 2); g.fill();
        const gr = g.createRadialGradient(bx - br * 0.35, by - br * 0.35, br * 0.15, bx, by, br); gr.addColorStop(0, '#ffa463'); gr.addColorStop(1, '#d5531c');
        g.fillStyle = gr; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#3e2c1a'; g.lineWidth = Math.max(1.5, br * 0.1); g.stroke();
        g.beginPath(); g.moveTo(bx - br, by); g.lineTo(bx + br, by); g.moveTo(bx, by - br); g.lineTo(bx, by + br); g.stroke();
        g.beginPath(); g.arc(bx - br * 1.4, by, br, -0.7, 0.7); g.stroke(); g.beginPath(); g.arc(bx + br * 1.4, by, br, Math.PI - 0.7, Math.PI + 0.7); g.stroke();
      };
      if (!behind) ball();
      // 籃網、籃框前緣
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.6;
      for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(hx + i * rx / 4.2, rimY); g.lineTo(hx + i * rx / 7, rimY + 44 * bs); g.stroke(); }
      for (let j = 1; j < 4; j++) { g.beginPath(); g.ellipse(hx, rimY + j * 11 * bs, rx * (1 - j * 0.15), ry * (1 - j * 0.15), 0, 0, Math.PI); g.stroke(); }
      if (behind) ball();
      g.strokeStyle = '#ff6a1a'; g.lineWidth = 5 * bs; g.beginPath(); g.ellipse(hx, rimY, rx, ry, 0, 0, Math.PI); g.stroke();

      // 方向條
      const mw = Math.min(w * 0.68, 340), mx = (w - mw) / 2, my = h - 24;
      g.globalAlpha = S.phase === 'aim' ? 1 : 0.45;
      g.fillStyle = '#fffaf0'; g.strokeStyle = '#3e2c1a'; g.lineWidth = 3; g.beginPath(); g.roundRect(mx - 8, my - 13, mw + 16, 26, 13); g.fill(); g.stroke();
      g.fillStyle = '#5cc46b'; g.fillRect(mx + mw * (0.5 - C.aimZone), my - 7, mw * C.aimZone * 2, 14);
      const ax = mx + mw * S.aim; g.fillStyle = '#3e2c1a'; g.beginPath(); g.moveTo(ax, my - 10); g.lineTo(ax - 8, my - 22); g.lineTo(ax + 8, my - 22); g.fill(); g.fillRect(ax - 2, my - 9, 4, 18);
      g.font = '900 12px "Noto Sans TC",sans-serif'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('方向', mx - 6, my - 20);
      // 力道條
      const pw = 20, ph = Math.min(h * 0.42, 220), px = w - pw - 18, py = h - 64 - ph;
      g.globalAlpha = S.phase === 'pow' ? 1 : 0.45;
      g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(px - 6, py - 6, pw + 12, ph + 12, 12); g.fill(); g.stroke();
      g.fillStyle = '#5cc46b'; g.fillRect(px, py + ph * (1 - C.powerTarget - C.powerZone), pw, ph * C.powerZone * 2);
      const fh = ph * S.pow; g.fillStyle = 'rgba(240,122,42,.9)'; g.fillRect(px + 4, py + ph - fh, pw - 8, fh);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('力道', px + pw / 2, py - 12);
      g.globalAlpha = 1;
      // 計分
      g.textAlign = 'left'; g.font = '900 22px "M PLUS Rounded 1c",sans-serif'; g.fillStyle = '#fff'; g.fillText(`${S.makes} / ${S.results.length}`, 14, 30);
      g.font = '700 11px "Noto Sans TC",sans-serif'; g.fillText('進球 / 出手', 14, 46);
      if (S.res) {
        g.textAlign = 'center'; g.font = '900 34px "Noto Sans TC",sans-serif'; g.lineWidth = 6; g.strokeStyle = '#3e2c1a';
        const t = S.res.make ? (S.res.rim ? C.rollIn : C.swish) : (S.res.rim ? C.rimOut : C.miss);
        g.strokeText(t, w / 2, h * 0.62); g.fillStyle = S.res.make ? '#7ee08a' : '#ff8a7a'; g.fillText(t, w / 2, h * 0.62);
      }
    };
    const tick = now => {
      if (!ui.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!W) size();
      draw(dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
