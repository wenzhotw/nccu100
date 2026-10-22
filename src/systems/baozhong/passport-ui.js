import { state } from '../../core/state.js';
// T060 活動專用護照候選。只呈現 getView 的資料，不修改旗標、點數、內容或存檔。
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count = n => Number.isInteger(n) && n >= 0 ? n : 0;
const list = value => Array.isArray(value) ? value.filter(x => x && typeof x === 'object') : [];
// 學院顏色只讀 getView 轉交的 baozhong.json color，沒有第二份配色表。
const color = value => /^#[0-9a-f]{6}$/i.test(value || '') ? value : 'currentColor';
const key = (college, index) => String(college.id ?? `college-${index}`);
const progress = college => {
  const booths = list(college.booths);
  return `${booths.filter(b => b.stamp).length}／${booths.length}`;
};
const status = college => college.medal ? '🏅 已獲勳章' : college.ready ? '可挑戰' : '收集中';
const selectedIndex = (colleges, selected) => Math.max(0, colleges.findIndex((c, i) => key(c, i) === selected));
// T074 兩階段（旗標開啟才有 view.advanced）：顯示進階茶罐；沒有這個欄位時輸出與原本相同。
const advancedSummary = view => view.advanced && typeof view.advanced === 'object' ? `<p class="bz-advanced">進階茶罐：${count(view.advanced.cans)}／${count(view.advanced.total)} · 進階過關 ${count(view.advanced.done)}／${count(view.advanced.available)} 攤</p>` : '';
export function renderPassportHTML(view = {}, { selectedCollegeId } = {}) {
  const colleges = list(view.colleges), selected = selectedIndex(colleges, selectedCollegeId), current = colleges[selected];
  return `<div class="bz-summary"><p>茶葉點數：${count(view.points)} · 提示卡：${count(view.hints)}</p><p>大會考：${view.examPassed ? '本輪已通過' : view.examUnlocked ? '已解鎖' : '需三枚不同學院勳章'}</p>${advancedSummary(view)}</div><div class="bz-spread"><nav class="bz-colleges" aria-label="學院護照">${colleges.map((c, i) => `<button type="button" class="bz-college" data-bz-college="${i}" data-bz-college-id="${esc(key(c,i))}" aria-pressed="${i === selected}" aria-controls="bz-current-college"><span class="bz-college-dot" style="--bz-college-color:${color(c.color)}" aria-hidden="true"></span><span>${esc(c.name)}<small>${status(c)} · 已蓋${progress(c)}</small></span></button>`).join('')}</nav><section id="bz-current-college" class="bz-page" aria-label="${esc(current?.name ?? '學院集章')}" tabindex="-1">${current ? `<h3>${esc(current.name)}</h3><p class="bz-page-progress">${status(current)} · 已蓋${progress(current)}</p><ul class="bz-stamp-grid">${list(current.booths).map(b => `<li class="bz-stamp-slot${b.stamp ? ' is-stamped' : ''}"><span class="bz-stamp-mark" aria-hidden="true">${b.stamp ? '✓' : '○'}</span><span>${esc(b.dept)}</span><small>${b.stamp ? '✓ 已蓋章' : '○ 未蓋章'}${b.perfect ? ' · ★ 全對' : ''}${b.advancedAvailable ? (b.advanced ? ' · 🍵 進階' : ' · 進階未過') : ''}</small></li>`).join('')}</ul>${list(current.booths).length ? '' : '<p>本院目前沒有可顯示的學系。</p>'}` : '<p>目前沒有可顯示的學院。</p>'}</section></div>`;
}

// 所有選擇器限定活動 body 與本模組節點。沒有外部字型、圖片、既有對話框或問答卡選擇器。
const passportCSS = `
body.bz26 #bz-passport-button,
body.bz26 #bz-passport-overlay,
body.bz26 #bz-passport-feedback{font-family:system-ui,"PingFang TC","Microsoft JhengHei",sans-serif;box-sizing:border-box}
body.bz26 #bz-passport-button{position:relative;flex:none;display:flex;align-items:center;justify-content:center;gap:8px;pointer-events:auto;min-width:132px;min-height:44px;max-width:100%;padding:9px 14px;border:2px solid #7e4e00;border-radius:999px;background:linear-gradient(135deg,#e5a22c,#d48806);color:#241900;box-shadow:0 3px 0 #74480d;font-size:15px;font-weight:800;line-height:1.3;cursor:pointer;touch-action:manipulation}
body.bz26 #bz-passport-button .bz-leaf{width:16px;height:23px;flex:none;border:2px solid #fff;border-radius:90% 0 90% 0;transform:rotate(28deg);background:linear-gradient(135deg,transparent 45%,#fff 47% 53%,transparent 55%)}
body.bz26 #bz-passport-button .bz-count{font-variant-numeric:tabular-nums;overflow-wrap:anywhere;color:#fff;background:#6c4300;border-radius:999px;padding:2px 7px}
body.bz26 #bz-passport-button .bz-shortcut{font-size:12px;border:1px solid currentColor;border-radius:4px;padding:1px 4px}
body.bz26 #bz-passport-overlay[hidden],
body.bz26 #bz-passport-feedback[hidden]{display:none!important}
body.bz26 #bz-passport-overlay{position:fixed;inset:0;z-index:75;display:flex;align-items:center;justify-content:center;padding:max(8px,env(safe-area-inset-top,0px)) max(8px,env(safe-area-inset-right,0px)) max(8px,env(safe-area-inset-bottom,0px)) max(8px,env(safe-area-inset-left,0px));background:#0009}
body.bz26 #bz-passport-overlay .bz-panel{box-sizing:border-box;display:flex;flex-direction:column;width:min(820px,100%);height:min(720px,100%);max-height:100%;min-height:0;padding:12px;border:3px solid #163c20;border-radius:18px;color:#2f291f;background:repeating-linear-gradient(22deg,#ffffff07 0 1px,transparent 1px 5px),repeating-linear-gradient(104deg,#00000010 0 1px,transparent 1px 7px),#1b5e20;box-shadow:0 14px 46px #0008;overflow:hidden;font-size:16px;line-height:1.5}
body.bz26 #bz-passport-overlay .bz-head{display:flex;align-items:center;justify-content:space-between;flex:none;gap:10px;color:#fff5cc;padding:0 0 10px}
body.bz26 #bz-passport-overlay h2{margin:0;font-size:20px;line-height:1.3}
body.bz26 #bz-passport-overlay button{box-sizing:border-box;min-width:44px;min-height:44px;font-family:inherit;cursor:pointer;touch-action:manipulation}
body.bz26 #bz-passport-overlay .bz-close{padding:8px 12px;flex:none;border:1px solid #e3c382;border-radius:9px;background:#fff6dd;color:#35291d;font-size:15px;font-weight:800}
body.bz26 #bz-passport-overlay .bz-body{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;overscroll-behavior:contain;background:#fcf3dc;border-radius:10px;scrollbar-gutter:stable}
body.bz26 #bz-passport-overlay .bz-summary{flex:none;padding:10px 12px;border-bottom:1px solid #d4c4a2;font-size:14px;background:linear-gradient(90deg,#eadbb5,#fff8e6)}
body.bz26 #bz-passport-overlay .bz-summary p{margin:0;overflow-wrap:anywhere}
body.bz26 #bz-passport-overlay .bz-spread{display:grid;flex:1;min-height:0;overflow:hidden;grid-template-columns:minmax(150px,30%) minmax(0,1fr);min-width:0}
body.bz26 #bz-passport-overlay .bz-colleges{display:flex;flex-direction:column;overflow:auto;overscroll-behavior:contain;gap:4px;padding:8px;border-right:1px solid #d4c4a2;background:#efe1bf;min-width:0}
body.bz26 #bz-passport-overlay .bz-college{display:flex;align-items:flex-start;gap:8px;flex:none;width:100%;padding:9px 8px;border:1px solid transparent;border-radius:7px;background:transparent;color:#392d20;text-align:left;font-size:14px;font-weight:750;line-height:1.45;overflow-wrap:anywhere}
body.bz26 #bz-passport-overlay .bz-college[aria-pressed="true"]{background:#fff9eb;border-color:#8c7749;box-shadow:inset 3px 0 #1b5e20}
body.bz26 #bz-passport-overlay .bz-college small{display:block;font-size:12px;font-weight:500;line-height:1.5;margin-top:2px}
body.bz26 #bz-passport-overlay .bz-college-dot{display:inline-block;width:12px;height:12px;flex:none;margin-top:4px;border:1px solid #5f523c;border-radius:50%;background:var(--bz-college-color)}
body.bz26 #bz-passport-overlay .bz-page{min-width:0;overflow:auto;overscroll-behavior:contain;padding:14px;background:radial-gradient(ellipse at top left,#fffdf5,#f4e8cb);overflow-wrap:anywhere}
body.bz26 #bz-passport-overlay h3{font-size:19px;line-height:1.4;margin:0 0 3px}
body.bz26 #bz-passport-overlay .bz-page-progress{font-size:13px;margin:0 0 12px}
body.bz26 #bz-passport-overlay .bz-stamp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;list-style:none;padding:0;margin:0}
body.bz26 #bz-passport-overlay .bz-stamp-slot{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;min-width:0;min-height:118px;padding:10px 6px;border:1px dashed #9b8967;border-radius:8px;text-align:center;background:#ffffff50;font-size:13px;line-height:1.5}
body.bz26 #bz-passport-overlay .bz-stamp-slot small{font-size:11px}
body.bz26 #bz-passport-overlay .bz-stamp-mark{display:grid;place-items:center;width:34px;height:34px;border:2px dashed #93866a;border-radius:50%;color:#74664a;font-size:21px;font-weight:850}
body.bz26 #bz-passport-overlay .is-stamped{border-style:solid;border-color:#a77a1b;background:#fff3ce}
body.bz26 #bz-passport-overlay .is-stamped .bz-stamp-mark{border-style:solid;border-color:#94620c;color:#805207;transform:rotate(-10deg)}
body.bz26 #bz-passport-button:focus-visible,
body.bz26 #bz-passport-overlay button:focus-visible{outline:3px solid #0769ad;outline-offset:2px}
body.bz26 #bz-passport-feedback{position:fixed;inset:0;z-index:76;display:grid;place-items:center;pointer-events:none;padding:20px}
body.bz26 #bz-passport-feedback .bz-feedback-paper{position:relative;max-width:min(300px,85vw);padding:20px 24px;border:2px solid #b88c2d;border-radius:12px;background:#fff5d8;color:#563b05;box-shadow:0 5px 20px #0004;text-align:center;animation:bz26Paper 1.1s ease-out both}
body.bz26 #bz-passport-feedback .bz-feedback-stamp{display:block;margin:0 auto 10px;width:68px;height:68px;line-height:68px;border:4px double #b68113;border-radius:50%;font-size:38px;font-weight:900;color:#8f5a00;animation:bz26Stamp 1.1s ease-out both}
body.bz26 #bz-passport-feedback .bz-particles{position:absolute;inset:24px 40px auto;height:70px;background:radial-gradient(circle at 6% 20%,#d48806 0 2px,transparent 3px),radial-gradient(circle at 94% 8%,#d48806 0 2px,transparent 3px),radial-gradient(circle at 11% 90%,#c39831 0 2px,transparent 3px),radial-gradient(circle at 92% 85%,#c39831 0 2px,transparent 3px);animation:bz26Particles 1.1s ease-out both}
body.bz26 #bz-passport-feedback .bz-feedback-label{display:block;font-size:15px;font-weight:800;overflow-wrap:anywhere}
@keyframes bz26Stamp{0%{opacity:0;transform:translateY(-65vh) rotate(-28deg) scale(1.2)}42%{opacity:1;transform:translateY(0) rotate(8deg) scale(.92)}55%,85%{opacity:1;transform:rotate(-8deg) scale(1)}100%{opacity:0;transform:rotate(-8deg)}}
@keyframes bz26Paper{0%,38%{opacity:1;transform:none}42%{opacity:1;transform:translateY(2px) rotate(1deg)}48%{transform:translateY(-1px) rotate(-1deg)}55%,85%{opacity:1;transform:none}100%{opacity:0;transform:none}}
@keyframes bz26Particles{0%,40%{opacity:0;transform:scale(.6)}55%{opacity:1}85%,100%{opacity:0;transform:scale(1.25)}}
@keyframes bz26Fade{0%{opacity:0}25%,80%{opacity:1}100%{opacity:0}}
@media(max-width:520px){
 body.bz26 #bz-passport-overlay .bz-panel{padding:8px;border-radius:12px}
 body.bz26 #bz-passport-overlay h2{font-size:17px}
 body.bz26 #bz-passport-overlay .bz-head{padding-bottom:8px}
 body.bz26 #bz-passport-overlay .bz-spread{grid-template-columns:112px minmax(0,1fr)}
 body.bz26 #bz-passport-overlay .bz-colleges{padding:5px;gap:3px}
 body.bz26 #bz-passport-overlay .bz-college{padding:8px 5px;font-size:12px;gap:5px}
 body.bz26 #bz-passport-overlay .bz-college small{font-size:11px}
 body.bz26 #bz-passport-overlay .bz-college-dot{width:9px;height:9px}
 body.bz26 #bz-passport-overlay .bz-page{padding:10px 8px}
 body.bz26 #bz-passport-overlay h3{font-size:16px}
 body.bz26 #bz-passport-overlay .bz-stamp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
 body.bz26 #bz-passport-overlay .bz-stamp-slot{font-size:12px;padding:8px 4px}
}
@media(prefers-reduced-motion:reduce){
 body.bz26 #bz-passport-feedback .bz-feedback-paper,
 body.bz26 #bz-passport-feedback .bz-feedback-stamp{animation:bz26Fade .8s ease-in-out both;transform:none}
 body.bz26 #bz-passport-feedback .bz-particles{display:none;animation:none}
 body.bz26 #bz-passport-overlay .is-stamped .bz-stamp-mark{transform:none}
}`;

let mounted = null;
// T074：實驗功能可登記一個 view 裝飾函式（預設沒有，畫面不變），並在旗標變動後要求重畫。
let viewDecorator = null;
export function setPassportViewDecorator(fn) { viewDecorator = typeof fn === 'function' ? fn : null; mounted?.refresh(); }
export function refreshPassport() { return mounted ? mounted.refresh() : false; }
export function mountPassport({ getView } = {}) {
  if (typeof getView !== 'function') throw new TypeError('getView must be a function');
  if (typeof document === 'undefined' || !document.body) throw new Error('mountPassport requires a DOM');
  const doc = document, hud = doc.querySelector('#hud .col.r');
  // 加入既有直向欄位，讓故事、道具、毛巾及支線自然排版，不猜固定 top 座標。
  if (!hud) throw new Error('mountPassport requires the existing #hud .col.r');
  const readView = () => { const raw = getView(), value = viewDecorator && raw && typeof raw === 'object' && !Array.isArray(raw) ? viewDecorator(raw) : raw; if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('getView must return an object'); return value; };
  const initialView = readView(); // 資料失敗時，不拆掉仍可使用的上一個實例。
  mounted?.destroy();
  const addedActivityClass = !doc.body.classList.contains('bz26');
  doc.body.classList.add('bz26');
  const style = doc.createElement('style'), button = doc.createElement('button'), points = doc.createElement('span');
  const overlay = doc.createElement('div'), panel = doc.createElement('section'), head = doc.createElement('div');
  const title = doc.createElement('h2'), closeButton = doc.createElement('button'), body = doc.createElement('div');
  const feedback = doc.createElement('div'), paper = doc.createElement('div'), stamp = doc.createElement('span');
  const particles = doc.createElement('span'), label = doc.createElement('span'), leaf = doc.createElement('span'), shortcut = doc.createElement('span');
  style.textContent = passportCSS;
  button.id = 'bz-passport-button'; button.type = 'button'; button.setAttribute('aria-controls','bz-passport-overlay'); button.setAttribute('aria-expanded','false');
  leaf.className = 'bz-leaf'; leaf.setAttribute('aria-hidden','true'); points.className = 'bz-count';
  shortcut.className = 'bz-shortcut'; shortcut.textContent = 'P'; shortcut.setAttribute('aria-hidden','true'); button.append(leaf,points,shortcut);
  overlay.id = 'bz-passport-overlay'; overlay.hidden = true; panel.className = 'bz-panel'; panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-labelledby','bz-passport-title');
  head.className = 'bz-head'; title.id = 'bz-passport-title'; title.textContent = '茶香探索護照';
  closeButton.className = 'bz-close'; closeButton.type = 'button'; closeButton.textContent = '關閉'; closeButton.setAttribute('aria-label','關閉護照'); body.className = 'bz-body';
  feedback.id = 'bz-passport-feedback'; feedback.hidden = true; feedback.setAttribute('role','status'); feedback.setAttribute('aria-live','polite'); feedback.setAttribute('aria-atomic','true');
  paper.className = 'bz-feedback-paper'; stamp.className = 'bz-feedback-stamp'; stamp.textContent = '✓'; stamp.setAttribute('aria-hidden','true');
  particles.className = 'bz-particles'; particles.setAttribute('aria-hidden','true'); label.className = 'bz-feedback-label';
  paper.append(stamp,particles,label); feedback.append(paper); head.append(title,closeButton); panel.append(head,body); overlay.append(panel);
  doc.head.append(style); hud.append(button); doc.body.append(overlay,feedback);
  let opened = false, destroyed = false, priorFocus = null, priorBusy, hadBusy;
  let selected = null, currentView = initialView, previousStamps = null, pendingStamp = null, animationTimer = null;
  function hideFeedback() {
    if (animationTimer !== null) clearTimeout(animationTimer);
    animationTimer = null; feedback.hidden = true; label.textContent = '';
  }
  function announceStamp(name) {
    hideFeedback(); label.textContent = `${name || '學系'} · 已蓋章`;
    // 確認 hidden 已套用，連續新章也能重新開始動畫，只讀取本模組尺寸。
    void feedback.offsetWidth;
    feedback.hidden = false;
    animationTimer = setTimeout(hideFeedback, 1100);
  }
  function paint(view, animate = true) {
    currentView = view;
    const colleges = list(view.colleges), chosen = selectedIndex(colleges, selected);
    selected = colleges[chosen] ? key(colleges[chosen], chosen) : null;
    points.textContent = `茶葉 ${count(view.points)}`;
    button.setAttribute('aria-label',`茶葉點數 ${count(view.points)}，開啟茶香探索護照，快捷鍵 P`);
    const focusedCollegeId = body.contains(doc.activeElement) ? doc.activeElement?.getAttribute?.('data-bz-college-id') : null;
    const oldNav = body.querySelector('.bz-colleges'), oldPage = body.querySelector('.bz-page');
    const navScroll = oldNav?.scrollTop || 0, pageScroll = oldPage?.scrollTop || 0;
    body.innerHTML = renderPassportHTML(view, { selectedCollegeId:selected });
    body.querySelector('.bz-colleges').scrollTop = navScroll;
    body.querySelector('.bz-page').scrollTop = pageScroll;
    if (opened && focusedCollegeId !== null && focusedCollegeId !== undefined) {
      const focusedIndex = colleges.findIndex((c,i) => key(c,i) === focusedCollegeId);
      (body.querySelectorAll('[data-bz-college]')[focusedIndex >= 0 ? focusedIndex : chosen] || closeButton).focus();
    }
    const next = new Map();
    for (const [i,c] of colleges.entries()) for (const [j,b] of list(c.booths).entries()) {
      const id = `${key(c,i)}:${String(b.id ?? j)}`;
      next.set(id, Boolean(b.stamp));
      // 第一次顯示／讀取既有進度不播放；只對先前存在且未蓋的新章回饋。
      if (animate && b.stamp && previousStamps?.has(id) && !previousStamps.get(id)) pendingStamp = b.dept;
    }
    previousStamps = next;
    if (pendingStamp !== null && (opened || !state.busy)) { announceStamp(pendingStamp); pendingStamp = null; }
  }
  function refresh() { if (destroyed) return false; paint(readView()); return true; }
  function open() {
    if (destroyed || opened || state.busy) return false;
    refresh();
    priorFocus = doc.activeElement; hadBusy = Object.hasOwn(state,'busy'); priorBusy = state.busy;
    state.busy = true; opened = true; overlay.hidden = false; button.setAttribute('aria-expanded','true'); closeButton.focus();
    return true;
  }
  function close() {
    if (destroyed || !opened) return false;
    opened = false; overlay.hidden = true; button.setAttribute('aria-expanded','false'); hideFeedback();
    if (state.busy === true) { if (hadBusy) state.busy = priorBusy; else delete state.busy; }
    if (priorFocus?.isConnected) priorFocus.focus();
    return true;
  }
  function onToggle() { if (opened) close(); else open(); }
  function onBackdrop(e) { if (e.target === overlay) close(); }
  function onNavigate(e) {
    let target = e.target;
    while (target && target !== body && !target.hasAttribute?.('data-bz-college')) target = target.parentElement;
    const value = target?.getAttribute?.('data-bz-college');
    if (value === null || value === undefined) return;
    const i = Number(value), college = list(currentView.colleges)[i];
    if (!college || !Number.isInteger(i)) return;
    selected = key(college, i); paint(currentView, false); body.querySelector('.bz-page').scrollTop = 0; body.querySelectorAll('[data-bz-college]')[i]?.focus();
  }
  function onKey(e) {
    if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Escape' && opened) { close(); e.preventDefault(); e.stopPropagation(); return; }
    if (e.code === 'Tab' && opened) {
      const elements = [...panel.querySelectorAll('button')], first = elements[0], last = elements.at(-1);
      if (e.shiftKey && (doc.activeElement === first || !panel.contains(doc.activeElement))) { last?.focus(); e.preventDefault(); }
      else if (!e.shiftKey && (doc.activeElement === last || !panel.contains(doc.activeElement))) { first?.focus(); e.preventDefault(); }
      return;
    }
    const target = e.target;
    if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || '')) return;
    if (e.code === 'KeyP' && !e.repeat && (opened || !state.busy)) { onToggle(); e.preventDefault(); e.stopPropagation(); }
  }
  button.addEventListener('click',onToggle); closeButton.addEventListener('click',close); overlay.addEventListener('click',onBackdrop);
  body.addEventListener('click',onNavigate); doc.addEventListener('keydown',onKey,true);
  const api = {open,close,refresh,destroy() {
    if (destroyed) return;
    close(); hideFeedback(); destroyed = true; pendingStamp = null;
    doc.removeEventListener('keydown',onKey,true); button.removeEventListener('click',onToggle);
    closeButton.removeEventListener('click',close); overlay.removeEventListener('click',onBackdrop); body.removeEventListener('click',onNavigate);
    button.remove(); overlay.remove(); feedback.remove(); style.remove();
    if (addedActivityClass) doc.body.classList.remove('bz26');
    if (mounted === api) mounted = null;
  }};
  paint(initialView, false); mounted = api;
  return api;
}
