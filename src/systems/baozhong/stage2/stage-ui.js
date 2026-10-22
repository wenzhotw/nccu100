// src/systems/baozhong/stage2/stage-ui.js（T074，Grok）：分類、情境選擇與進階問答共用的對話框。
// 每一步答完立刻顯示對錯、正解與一句說明。不內建任何系所事實，文字全部由呼叫端（小遊戲資料或攤位題目）傳入。
// 回傳 Promise<{status:'completed'|'cancelled', total, score}>；取消（先離開、Esc、離場）不得結算。
import { createFeedbackRound } from './rounds.js';

const css = `
#bz-stage{position:fixed;inset:0;z-index:75;display:flex;align-items:center;justify-content:center;background:rgba(42,44,74,.45);padding:12px;box-sizing:border-box}
#bz-stage *{box-sizing:border-box}
#bz-stage .st-card{width:min(620px,100%);max-height:calc(100dvh - 24px);overflow:auto;background:#ece6d8;color:#2a2c4a;border:4px solid #2a2c4a;border-radius:20px;padding:18px;font:700 16px/1.55 "Noto Sans TC",sans-serif;box-shadow:0 8px 0 rgba(42,44,74,.25)}
#bz-stage h2{margin:0 0 8px;font-size:1.3em;color:#1f3c8f}
#bz-stage p{margin:8px 0}
#bz-stage .st-meta{font-size:.85em;color:#55577a}
#bz-stage .st-prompt{font-size:1.12em;margin:10px 0 12px;padding:12px;border-radius:12px;background:#fffdf5;border:2px dashed #2a2c4a}
#bz-stage .st-prompt[draggable="true"]{cursor:grab}
#bz-stage .st-options{display:grid;gap:10px}
#bz-stage .st-options.st-bins{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}
#bz-stage button{font:inherit;color:#2a2c4a;background:#f4f4ee;border:2px solid #2a2c4a;border-radius:12px;min-height:48px;padding:10px 12px;cursor:pointer;text-align:left;overflow-wrap:anywhere;touch-action:manipulation}
#bz-stage .st-bins button{min-height:72px;text-align:center;font-size:1.1em}
#bz-stage button.st-drop{background:#f2d36b}
#bz-stage button.is-correct{background:#cfe2b9;border-width:3px}
#bz-stage button.is-wrong{background:#f3c1b8;border-width:3px}
#bz-stage button:disabled{cursor:default;opacity:1}
#bz-stage button:focus-visible{outline:3px solid #1f3c8f;outline-offset:3px}
#bz-stage .st-feedback{min-height:3em;margin-top:12px;padding:10px 12px;border-radius:12px;background:#fffdf5}
#bz-stage .st-feedback.ok{border-left:6px solid #3d7a2a}
#bz-stage .st-feedback.no{border-left:6px solid #b3261e}
#bz-stage .st-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
#bz-stage .st-primary{background:#f2d36b}
@media(max-width:420px){#bz-stage .st-card{padding:12px;font-size:14px}}
`;
let activeCancel = null;
/** 離場或讀檔時呼叫；目前的回合以 cancelled 結束。 */
export function cancelStage() { if (activeCancel) activeCancel(); }
export function stageOpen() { return activeCancel !== null; }

/**
 * openFeedbackRound({title, intro?:[文字], steps, mode:'classify'|'choice', doneText?}, {state, document, window})
 * classify 模式：題目卡可拖到分類格，也可直接點分類（手機與鍵盤可用）。
 */
export function openFeedbackRound(config, { state, document: doc = globalThis.document, window: win = globalThis.window } = {}) {
  const round = createFeedbackRound(config.steps);
  if (!state || !doc || !win) throw new TypeError('需要 state 與瀏覽器環境');
  cancelStage();
  return new Promise(resolve => {
    const wasBusy = state.busy, priorFocus = doc.activeElement;
    let ended = false;
    const style = doc.createElement('style'); style.textContent = css;
    const box = doc.createElement('div'); box.id = 'bz-stage';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', config.title);
    box.dataset.mode = config.mode;
    const card = doc.createElement('section'); card.className = 'st-card'; box.appendChild(card);
    function close(result) {
      if (ended || !result) return;
      ended = true;
      win.removeEventListener('keydown', onKey, true);
      box.remove(); style.remove();
      state.busy = wasBusy;
      if (activeCancel === abort) activeCancel = null;
      if (priorFocus && priorFocus.isConnected && priorFocus.focus) priorFocus.focus();
      resolve(result);
    }
    function abort() { close(round.cancel()); }
    function el(tag, text, parent = card, cls) { const e = doc.createElement(tag); e.textContent = text; if (cls) e.className = cls; parent.appendChild(e); return e; }
    function btn(text, fn, parent, cls) { const b = el('button', text, parent, cls); b.type = 'button'; b.addEventListener('click', () => { if (!ended) fn(); }); return b; }
    function focusFirst() { const f = box.querySelector('button.st-primary:not(:disabled)') || box.querySelector('button:not(:disabled)'); if (f) f.focus(); }
    function showIntro() {
      card.replaceChildren();
      el('h2', config.title);
      (config.intro || []).forEach(line => el('p', line));
      el('p', config.mode === 'classify' ? '每張卡片拖到或點選正確的分類；每題答完馬上告訴你對錯和原因。' : '每一步選一個答案；答完馬上告訴你對錯和原因。', card, 'st-meta');
      const a = el('div', '', card, 'st-actions');
      btn('開始', showStep, a, 'st-primary'); btn('先離開', abort, a);
      focusFirst();
    }
    function showStep(feedback) {
      card.replaceChildren();
      const snap = round.snapshot(), s = round.steps[snap.index];
      el('h2', config.title);
      el('p', `第 ${snap.index + 1}／${snap.total} 題 · 首次答對 ${snap.score}`, card, 'st-meta');
      const prompt = el('div', s.prompt, card, 'st-prompt');
      const opts = el('div', '', card, `st-options${config.mode === 'classify' ? ' st-bins' : ''}`);
      const buttons = s.options.map((t, k) => {
        const b = btn(t, () => choose(k), opts); b.dataset.option = String(k);
        if (feedback) { b.disabled = true; if (k === feedback.correctIndex) b.classList.add('is-correct'); else if (k === feedback.choice) b.classList.add('is-wrong'); }
        return b;
      });
      if (config.mode === 'classify' && !feedback) {
        prompt.draggable = true;
        prompt.addEventListener('dragstart', e => { e.dataTransfer && e.dataTransfer.setData('text/plain', s.prompt); });
        buttons.forEach((b, k) => {
          b.addEventListener('dragover', e => { e.preventDefault(); b.classList.add('st-drop'); });
          b.addEventListener('dragleave', () => b.classList.remove('st-drop'));
          b.addEventListener('drop', e => { e.preventDefault(); b.classList.remove('st-drop'); choose(k); });
        });
      }
      const fb = el('p', '', card, 'st-feedback'); fb.setAttribute('role', 'status'); fb.setAttribute('aria-live', 'polite');
      const a = el('div', '', card, 'st-actions');
      if (feedback) {
        fb.classList.add(feedback.correct ? 'ok' : 'no');
        fb.textContent = feedback.correct ? `✓ 答對了！${feedback.explain || `正確答案就是「${feedback.correctText}」。`}` : `✗ 正確答案是「${feedback.correctText}」。${feedback.explain}`;
        const last = snap.index + 1 >= snap.total;
        btn(last ? '看結果' : '下一題', () => { round.next(); if (last) showEnd(); else showStep(); }, a, 'st-primary');
      } else fb.textContent = config.mode === 'classify' ? '把卡片拖到分類，或直接點分類。' : '選一個答案。';
      btn('先離開', abort, a);
      focusFirst();
    }
    function choose(k) {
      const r = round.answer(k);
      if (r.kind === 'ignored') return;
      showStep({ ...r, choice: k });
    }
    function showEnd() {
      card.replaceChildren();
      const snap = round.snapshot();
      el('h2', config.title);
      el('p', (config.doneText || '完成！首次答對 {score}／{total}。').replace('{score}', snap.score).replace('{total}', snap.total));
      const a = el('div', '', card, 'st-actions');
      btn('完成', () => close(round.finish()), a, 'st-primary').dataset.stageFinish = '1';
      focusFirst();
    }
    function onKey(event) {
      if (ended || event.ctrlKey || event.metaKey || event.altKey) return;
      event.stopPropagation();
      if (event.code === 'Escape') { event.preventDefault(); abort(); return; }
      const buttons = [...box.querySelectorAll('button:not(:disabled)')];
      const index = buttons.indexOf(doc.activeElement);
      if (event.code === 'Tab' || ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
        const back = event.shiftKey || ['ArrowUp', 'ArrowLeft'].includes(event.code);
        const nx = buttons[(index + (back ? -1 : 1) + buttons.length) % buttons.length]; if (nx) nx.focus();
      } else if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault(); if (!event.repeat && index >= 0) buttons[index].click();
      } else if (/^Digit[1-4]$/.test(event.code)) {
        const k = Number(event.code.slice(5)) - 1, b = box.querySelector(`button[data-option="${k}"]:not(:disabled)`); if (b) { event.preventDefault(); b.click(); }
      }
    }
    state.busy = true; activeCancel = abort;
    doc.head.appendChild(style); doc.body.appendChild(box);
    win.addEventListener('keydown', onKey, true);
    if (config.intro && config.intro.length) showIntro(); else showStep();
  });
}
