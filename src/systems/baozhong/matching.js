import { createMatchingRound } from './matching-core.js';

// 本模組不內建系所事實。介紹與配對內容由經審核的外部資料傳入。
const css = `
#bz-matching{position:fixed;inset:0;z-index:75;display:flex;align-items:center;justify-content:center;background:rgba(42,44,74,.45);padding:12px;box-sizing:border-box}
#bz-matching *{box-sizing:border-box}
#bz-matching .match-card{width:min(650px,100%);max-height:calc(100dvh - 24px);overflow:auto;background:#ece6d8;color:#2a2c4a;border:4px solid #2a2c4a;border-radius:20px;padding:18px;font:700 16px/1.55 "Noto Sans TC",sans-serif;box-shadow:0 8px 0 rgba(42,44,74,.25)}
#bz-matching h2{margin:0 0 10px;font-size:1.35em;color:#1f3c8f}
#bz-matching p{margin:8px 0}
#bz-matching .match-guide{padding-left:22px}
#bz-matching .match-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin:12px 0}
#bz-matching .match-column{display:flex;flex-direction:column;gap:10px;min-width:0}
#bz-matching button{font:inherit;color:#2a2c4a;background:#f4f4ee;border:2px solid #2a2c4a;border-radius:12px;min-height:48px;padding:10px 12px;cursor:pointer;overflow-wrap:anywhere;touch-action:manipulation}
#bz-matching .match-column button{flex:1;text-align:left}
#bz-matching button[aria-pressed="true"]{background:#f2d36b;border-width:3px}
#bz-matching button:focus-visible{outline:3px solid #1f3c8f;outline-offset:3px}
#bz-matching button:disabled{background:#cfe2b9;color:#34472c;cursor:default;opacity:1}
#bz-matching .match-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
#bz-matching .match-primary{background:#f2d36b}
#bz-matching .match-status{min-height:3.1em}
@media(max-width:420px){#bz-matching .match-card{padding:12px;font-size:14px}#bz-matching .match-grid{gap:8px}#bz-matching button{padding:8px}}
`;
let activeCancel = null;

/** 離場時呼叫。取消只回傳 cancelled，不應呼叫護照結算。 */
export function cancelMatching() { if (activeCancel) activeCancel(); }

/**
 * openMatching({title,intro:[文字],pairs:[{id,left,right}]}, {state,signal?})。
 * 回傳 Promise<{status:'completed'|'cancelled',total:3,score:number}>。
 * 每張左卡僅首次配對答對得一分；修正與重看介紹不增加分數。由呼叫端用
 * boothResult(flags, boothId, result.total, result.score) 結算 completed，勿沿用舊題數。
 */
export function openMatching(config, { state, document: doc = globalThis.document, window: win = globalThis.window, signal, rng } = {}) {
  const round = createMatchingRound(config, rng);
  if (!state || !doc || !win) throw new TypeError('配對遊戲需要 state 與瀏覽器環境。');
  cancelMatching();
  if (signal && signal.aborted) return Promise.resolve(round.cancel());
  return new Promise(resolve => {
    const wasBusy = state.busy, priorFocus = doc.activeElement;
    let ended = false, selected = null, started = false;
    let message = '先選左邊，再選右邊。';
    const style = doc.createElement('style'); style.textContent = css;
    const box = doc.createElement('div'); box.id = 'bz-matching';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', config.title);
    const card = doc.createElement('section'); card.className = 'match-card'; box.appendChild(card);
    function close(result) {
      if (ended || !result) return;
      ended = true;
      win.removeEventListener('keydown', onKey, true);
      if (signal) signal.removeEventListener('abort', abort);
      box.remove(); style.remove();
      state.busy = wasBusy;
      if (activeCancel === abort) activeCancel = null;
      if (priorFocus && priorFocus.isConnected && priorFocus.focus) priorFocus.focus();
      resolve(result);
    }
    function abort() { close(round.cancel()); }
    function element(tag, text, parent = card, className) {
      const el = doc.createElement(tag); el.textContent = text;
      if (className) el.className = className;
      parent.appendChild(el); return el;
    }
    function button(text, handler, parent = card, className) {
      const el = element('button', text, parent, className); el.type = 'button';
      el.addEventListener('click', () => { if (!ended) handler(); }); return el;
    }
    function focusFirst() { const first = box.querySelector('button:not(:disabled)'); if (first) first.focus(); }
    function showIntro() {
      card.replaceChildren();
      element('h2', config.title);
      config.intro.forEach(line => element('p', line));
      // revealPairs:false（T074 兩階段初訪）只給短文，不先列出答案，改成讀完再回想。
      if (config.revealPairs === false) element('p', '讀完上面的短文，等等把左右兩張卡配成一組。');
      else {
        element('p', '先認識這三組搭配，等等把左右兩張卡配成一組：');
        const guide = element('ul', '', card, 'match-guide');
        round.pairs.forEach(pair => element('li', `${pair.left}：${pair.right}`, guide));
      }
      element('p', '點選即可，不用拖曳。鍵盤可用 Tab 選卡，Enter 或空白鍵確認。每張左卡第一次配對答對得一分，配錯可以繼續練習。');
      const actions = element('div', '', card, 'match-actions');
      button(started ? '回到配對' : '開始配對', () => { started = true; showBoard(); }, actions, 'match-primary');
      button('先離開', abort, actions); focusFirst();
    }
    function showBoard(focusId) {
      card.replaceChildren();
      const snap = round.snapshot();
      element('h2', config.title);
      element('p', `已配對 ${snap.matched.length}／${snap.total} 組。首次答對 ${snap.score} 組。`);
      const status = element('p', message, card, 'match-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      const grid = element('div', '', card, 'match-grid');
      const left = element('div', '', grid, 'match-column'), right = element('div', '', grid, 'match-column');
      element('span', '先選一張', left); element('span', '再找搭配', right);
      function makeCard(pair, side, parent) {
        const matched = snap.matched.includes(pair.id);
        const b = button(`${matched ? '✓ ' : ''}${pair[side]}`, () => {
          if (side === 'left') {
            selected = pair.id; message = '已選好左卡，請找右邊的搭配。'; showBoard(`left:${pair.id}`);
          } else if (selected === null) {
            message = '請先點選一張左卡。'; showBoard(`right:${pair.id}`);
          } else {
            const result = round.match(selected, pair.id);
            // 有 explain 的資料（T074）每一步都附一句說明；沒有的維持原本訊息。
            const chosen = round.pairs.find(p => p.id === selected);
            if (result.kind === 'correct') {
              message = (result.firstAttempt ? '配對成功！這組首次答對。' : '配對成功！你已經學會這組搭配。') + (chosen && chosen.explain ? ` ${chosen.explain}` : ''); selected = null;
            } else if (result.kind === 'incorrect') message = chosen && chosen.explain ? `還不是這組。提示：${chosen.explain} 這張左卡本次不再計分。` : '還不是這組，再找找看。也可以重看介紹，這張左卡本次不再計分。';
            showBoard(result.complete ? 'finish' : undefined);
          }
        }, parent);
        b.dataset.matchFocus = `${side}:${pair.id}`; b.disabled = matched;
        if (side === 'left') b.setAttribute('aria-pressed', String(selected === pair.id));
      }
      round.pairs.forEach(pair => makeCard(pair, 'left', left));
      round.rightOrder.forEach(id => makeCard(round.pairs.find(pair => pair.id === id), 'right', right));
      const actions = element('div', '', card, 'match-actions');
      if (snap.complete) {
        element('p', `三組都配好了！本次首次答對 ${snap.score}／${snap.total} 組，按完成後結算。`);
        const finish = button('完成配對', () => close(round.finish()), actions, 'match-primary'); finish.dataset.matchFocus = 'finish';
      }
      button('重看介紹', showIntro, actions); button('先離開', abort, actions);
      const target = [...box.querySelectorAll('button')].find(b => b.dataset.matchFocus === focusId && !b.disabled);
      if (target) target.focus(); else focusFirst();
    }
    function onKey(event) {
      if (ended) return;
      // 對話期間隔離遊戲熱鍵，不攔截瀏覽器重新整理等組合鍵。
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.stopPropagation();
      if (event.code === 'Escape') { event.preventDefault(); abort(); return; }
      const buttons = [...box.querySelectorAll('button:not(:disabled)')];
      const index = buttons.indexOf(doc.activeElement);
      if (event.code === 'Tab' || ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
        const backward = event.shiftKey || ['ArrowUp', 'ArrowLeft'].includes(event.code);
        const next = buttons[(index + (backward ? -1 : 1) + buttons.length) % buttons.length];
        if (next) next.focus();
      } else if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault(); if (!event.repeat && index >= 0) buttons[index].click();
      }
    }
    state.busy = true; activeCancel = abort;
    doc.head.appendChild(style); doc.body.appendChild(box);
    win.addEventListener('keydown', onKey, true);
    if (signal) signal.addEventListener('abort', abort, { once: true });
    showIntro();
  });
}
