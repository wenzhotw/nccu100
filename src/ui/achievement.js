/**
 * 獲得成就的畫面：畫面中間跳出金色徽章卡片，寫成就名稱和說明，按「太好了！」收起來。
 *
 *   showAchievement({ title: '人脈串接王', desc: '……' })
 *
 * 成就的名稱和說明在 src/content/achievements.json，台詞的 then 寫 "achieve:成就代號" 就會跳出來（見 docs/content.md）。
 * 拿過的成就會記成劇情旗標 achv_成就代號，跟著存檔，不會重複跳。
 */
import { state } from '../core/state.js';
import { AU } from '../systems/audio.js';
import { registerPrefix, setFlag } from '../content/index.js';
import ACHIEVEMENTS from '../content/achievements.json';

const css = `
#achv{position:fixed;inset:0;z-index:85;display:grid;place-items:center;padding:16px;background:rgba(20,16,28,.45);
  font-family:"M PLUS Rounded 1c","Noto Sans TC",sans-serif;opacity:0;transition:opacity .35s}
#achv.on{opacity:1}
#achv .card{width:min(440px,100%);text-align:center;padding:26px 22px 22px;border-radius:26px;color:#4a3520;
  background:radial-gradient(circle at 50% 0%,#fffdf3 0%,#ffefb8 60%,#f6c95f 100%);box-shadow:0 10px 0 #b8801c,0 18px 40px rgba(0,0,0,.35);
  transform:scale(.6) translateY(30px);transition:transform .45s cubic-bezier(.2,1.6,.4,1)}
#achv.on .card{transform:none}
#achv .lab{display:inline-block;font-weight:900;font-size:15px;letter-spacing:.2em;padding:4px 14px;border-radius:999px;background:#4a3520;color:#ffe9a8}
#achv .medal{width:96px;height:96px;margin:16px auto 10px;border-radius:50%;display:grid;place-items:center;font-size:52px;
  background:radial-gradient(circle at 35% 30%,#fff6cf,#f2b84b 60%,#c98a1f);box-shadow:0 0 0 6px #fff3c4,0 0 0 10px #d99a2b;animation:achvSpin 2.4s ease-in-out infinite}
@keyframes achvSpin{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
#achv h2{margin:4px 0 10px;font-size:clamp(28px,7vw,40px);font-weight:900;letter-spacing:.06em}
#achv p{margin:0 0 20px;font-size:17px;line-height:1.65;font-weight:700}
#achv button{all:unset;cursor:pointer;font:900 19px "Noto Sans TC",sans-serif;padding:11px 36px;border-radius:999px;background:#f2a93b;color:#3e2c1a;box-shadow:0 5px 0 #b86e10}`;
const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

export function showAchievement({ title, desc, icon = '🏆' }, onClose) {
  state.busy = true;
  const el = document.createElement('div'); el.id = 'achv';
  el.innerHTML = '<div class="card"><div class="lab">獲得成就</div><div class="medal"></div><h2></h2><p></p><button type="button">太好了！</button></div>';
  el.querySelector('.medal').textContent = icon;
  el.querySelector('h2').textContent = title;
  el.querySelector('p').textContent = desc || '';
  const close = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 350); state.busy = false; if (onClose) onClose(); };
  el.querySelector('button').addEventListener('click', close);
  document.body.appendChild(el);
  AU.sfx('gem');
  requestAnimationFrame(() => el.classList.add('on'));
}

/** 台詞 then 寫 "achieve:成就代號"：第一次才跳畫面，拿過就記成旗標 achv_成就代號 */
export function achieve(id) {
  const a = ACHIEVEMENTS[id];
  if (!a) { console.warn(`[成就] achievements.json 裡沒有「${id}」`); return; }
  const flag = 'achv_' + id;
  if (state[flag]) return;
  setFlag(flag);
  showAchievement(a);
}
registerPrefix('achieve', achieve);
