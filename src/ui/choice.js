/**
 * 選項框：對話之後讓玩家從幾個選項裡挑一個（像 RPG 的「是／否」選單）。
 *
 *   openChoice(['我沒有興趣耶', '好啊'], i => { ... })
 *
 * 鍵盤：上下鍵或 W／S 移動，Enter／Space／E 確定，數字鍵直接選。也可以用滑鼠或手指點。
 * 開啟期間 state.busy = true，角色不會移動。
 */
import { state } from '../core/state.js';
import { AU } from '../systems/audio.js';

const css = `
#choice{position:fixed;right:max(16px,4vw);bottom:clamp(150px,24vh,230px);z-index:60;display:flex;flex-direction:column;gap:8px;
  background:#fffaf0;border:4px solid #3e2c1a;border-radius:16px;padding:14px 16px;box-shadow:0 8px 0 rgba(62,44,26,.35);
  font:700 clamp(16px,2.2vw,22px)/1.4 "Noto Sans TC",sans-serif;color:#3e2c1a;min-width:min(320px,80vw);animation:chIn .18s ease-out}
#choice button{all:unset;cursor:pointer;padding:8px 12px 8px 34px;border-radius:10px;position:relative}
#choice button.on{background:#ffe7b3}
#choice button.on::before{content:"";position:absolute;left:12px;top:50%;margin-top:-7px;border:7px solid transparent;border-left:10px solid #3e2c1a}
@keyframes chIn{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}`;
const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

let box = null, cur = 0, done = null, labels = [];

function render() {
  [...box.children].forEach((b, i) => b.classList.toggle('on', i === cur));
}
function pick(i) {
  if (!box) return;
  AU.sfx('select');
  const f = done; box.remove(); box = null; done = null; removeEventListener('keydown', onKey, true);
  state.busy = false;
  if (f) f(i, labels[i]);
}
function onKey(e) {
  if (!box) return;
  const n = labels.length;
  if (['ArrowUp', 'KeyW'].includes(e.code)) { cur = (cur + n - 1) % n; AU.sfx('blip'); render(); }
  else if (['ArrowDown', 'KeyS'].includes(e.code)) { cur = (cur + 1) % n; AU.sfx('blip'); render(); }
  else if (['Enter', 'Space', 'KeyE', 'KeyF'].includes(e.code)) pick(cur);
  else if (/^Digit[1-9]$/.test(e.code) && +e.code.slice(5) <= n) pick(+e.code.slice(5) - 1);
  else return;
  e.preventDefault(); e.stopPropagation();
}

/** 顯示選項，玩家選完呼叫 onPick(index, label) */
export function openChoice(options, onPick) {
  if (box) box.remove();
  labels = options; cur = 0; done = onPick; state.busy = true;
  box = document.createElement('div'); box.id = 'choice';
  options.forEach((t, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
    b.addEventListener('pointerenter', () => { cur = i; render(); });
    b.addEventListener('click', () => pick(i));
    box.appendChild(b);
  });
  document.body.appendChild(box); render();
  addEventListener('keydown', onKey, true);
}
