/**
 * 結局畫面：遊戲結束時蓋住整個畫面，顯示標題、副標題和「重新開始」。
 *
 *   showEnding({ title: 'GAME OVER', sub: '……', tone: 'dark' })   // tone：'dark' 或 'light'
 */
import { state } from '../core/state.js';

const css = `
#ending{position:fixed;inset:0;z-index:90;display:grid;place-items:center;text-align:center;padding:24px;
  font-family:"M PLUS Rounded 1c","Noto Sans TC",sans-serif;opacity:0;transition:opacity 1.2s}
#ending.on{opacity:1}
#ending.dark{background:#141018;color:#f3e6c6}
#ending.light{background:radial-gradient(circle at 50% 40%,#fffdf3 0%,#ffe9a8 55%,#f2b84b 100%);color:#4a3520}
#ending h1{font-size:clamp(40px,9vw,110px);font-weight:900;letter-spacing:.08em;margin:0 0 .3em}
#ending p{font-size:clamp(18px,3vw,30px);font-weight:700;margin:0 0 1.6em;opacity:.85}
#ending button{all:unset;cursor:pointer;font:900 clamp(18px,2.6vw,26px) "Noto Sans TC",sans-serif;padding:14px 40px;border-radius:999px;
  background:#f2a93b;color:#3e2c1a;box-shadow:0 6px 0 #b86e10}`;
const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

export function showEnding({ title, sub, tone = 'dark' }) {
  state.busy = true;
  const el = document.createElement('div'); el.id = 'ending'; el.className = tone;
  const h = document.createElement('h1'); h.textContent = title;
  const p = document.createElement('p'); p.textContent = sub || '';
  const b = document.createElement('button'); b.type = 'button'; b.textContent = '重新開始';
  b.addEventListener('click', () => location.reload());
  el.append(h, p, b); document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
}
