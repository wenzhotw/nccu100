/**
 * 問答卡：一題一題顯示題目和選項，全部答完回傳答對幾題。
 *
 *   const score = await openQuiz({ title: '老校長的歷史問答', questions: [{ q, options, answer }] })
 *
 * 鍵盤：上下鍵或 W／S 移動，Enter／Space／E 確定，數字鍵直接選。也可以用滑鼠或手指點。
 * 開啟期間 state.busy = true，角色不會移動。答對答錯不會當場公布，最後只告訴老校長分數。
 */
import { state } from '../../core/state.js';
import { AU } from '../audio.js';

const css = `
#quiz{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(30,24,18,.35);padding:16px}
#quiz .card{width:min(560px,100%);background:#fffaf0;border:4px solid #3e2c1a;border-radius:18px;box-shadow:0 10px 0 rgba(62,44,26,.35);
  padding:18px 18px 16px;color:#3e2c1a;font:700 clamp(15px,2.1vw,19px)/1.45 "Noto Sans TC",sans-serif;animation:qzIn .2s ease-out}
#quiz .head{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:.82em;color:#7a5a3a;margin-bottom:6px}
#quiz .dots{display:flex;gap:5px}
#quiz .dots i{width:10px;height:10px;border-radius:50%;background:#e8dcc4;border:2px solid #b89a6e}
#quiz .dots i.done{background:#c9952e;border-color:#8a5f14}
#quiz .dots i.cur{background:#fff;border-color:#3e2c1a}
#quiz .q{font-size:1.18em;font-weight:900;margin:4px 0 12px}
#quiz .opts{display:flex;flex-direction:column;gap:8px}
#quiz button{all:unset;cursor:pointer;padding:9px 12px 9px 40px;border-radius:12px;border:3px solid #e2d3b6;background:#fff;position:relative}
#quiz button b{position:absolute;left:10px;top:50%;margin-top:-11px;width:22px;height:22px;border-radius:50%;background:#3e2c1a;color:#fffaf0;font-size:13px;line-height:22px;text-align:center}
#quiz button.on{background:#ffe7b3;border-color:#3e2c1a}
@keyframes qzIn{from{transform:translateY(14px) scale(.98);opacity:0}to{transform:none;opacity:1}}`;
const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

export function openQuiz({ title, questions }) {
  return new Promise(done => {
    let i = 0, cur = 0, score = 0;
    state.busy = true;
    const box = document.createElement('div'); box.id = 'quiz';
    box.innerHTML = '<div class="card"><div class="head"><span class="t"></span><span class="dots"></span></div><div class="q"></div><div class="opts"></div></div>';
    box.querySelector('.t').textContent = title;
    const dots = box.querySelector('.dots'), qEl = box.querySelector('.q'), opts = box.querySelector('.opts');
    questions.forEach(() => dots.appendChild(document.createElement('i')));
    document.body.appendChild(box);

    const mark = () => [...opts.children].forEach((b, k) => b.classList.toggle('on', k === cur));
    function show() {
      const Q = questions[i]; cur = 0;
      [...dots.children].forEach((d, k) => { d.className = k < i ? 'done' : k === i ? 'cur' : ''; });
      qEl.textContent = `第 ${i + 1} 題．${Q.q}`;
      opts.innerHTML = '';
      Q.options.forEach((t, k) => {
        const b = document.createElement('button'); b.type = 'button';
        b.innerHTML = `<b>${k + 1}</b>`; b.append(t);
        b.addEventListener('pointerenter', () => { cur = k; mark(); });
        b.addEventListener('click', () => pick(k));
        opts.appendChild(b);
      });
      mark();
    }
    function pick(k) {
      AU.sfx('select');
      if (k === questions[i].answer) score++;
      i++;
      if (i < questions.length) { show(); return; }
      removeEventListener('keydown', onKey, true); box.remove(); state.busy = false; done(score);
    }
    function onKey(e) {
      const n = questions[i].options.length;
      if (['ArrowUp', 'KeyW'].includes(e.code)) { cur = (cur + n - 1) % n; AU.sfx('blip'); mark(); }
      else if (['ArrowDown', 'KeyS'].includes(e.code)) { cur = (cur + 1) % n; AU.sfx('blip'); mark(); }
      else if (['Enter', 'Space', 'KeyE', 'KeyF'].includes(e.code)) pick(cur);
      else if (/^Digit[1-9]$/.test(e.code) && +e.code.slice(5) <= n) pick(+e.code.slice(5) - 1);
      else return;
      e.preventDefault(); e.stopPropagation();
    }
    addEventListener('keydown', onKey, true);
    show();
  });
}
