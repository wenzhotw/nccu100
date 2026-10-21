// src/ui/bz26-quiz-skin.js（Gemini，依 GPT-046／GPT-048 收斂修正）
// 前置條件：包種茶節活動期間 body.bz26 由活動根／護照持有，本外掛不自行新增或刪除共用 bz26 class。
// 呼叫端範例：
//   問答：attachQuizSkin(); try { return await openQuiz(q); } finally { detachQuizSkin(); }
//   活動對話（opt-in）：attachQuizSkin({ dialog: true }); try { await runDialog(); } finally { detachQuizSkin(); }

const STYLE_ID = "bz26-quiz-skin-style";
const DLG_CLASS = "bz26-qskin-dlg";
const CSS = "body.bz26 #quiz .card { border: 3px solid #d48806 !important; border-radius: 12px !important; background: #fdfbf7 !important; box-shadow: 0 8px 24px rgba(0,0,0,0.2) !important; } body.bz26 #quiz .card .head .t { color: #1565c0; border-bottom: 2px dashed #d48806; padding-bottom: 4px; } body.bz26 #quiz button { border-color: #cfd8dc; border-radius: 8px; background: #ffffff; color: #2b1d0c; transition: all 0.2s ease; } body.bz26 #quiz button:hover:not(.on) { background: #fff8e1; border-color: #f5a623; transform: translateX(4px); } body.bz26 #quiz button.on { background: #ffe082; border-color: #e65100; font-weight: bold; } body.bz26 #dlg.bz26-qskin-dlg { border: 3px solid #1565c0 !important; border-radius: 14px !important; background: #fdfbf7 !important; }";

let owned = null;

export function attachQuizSkin({ dialog = false } = {}) {
  if (owned) return;
  const doc = document;
  owned = { style: null, dlg: null };
  if (!doc.getElementById(STYLE_ID)) {
    const s = doc.createElement("style");
    s.id = STYLE_ID;
    s.textContent = CSS;
    doc.head.appendChild(s);
    owned.style = s;
  }
  if (dialog) {
    const dlg = doc.getElementById("dlg");
    if (dlg && !dlg.classList.contains(DLG_CLASS)) {
      dlg.classList.add(DLG_CLASS);
      owned.dlg = dlg;
    }
  }
}

export function detachQuizSkin() {
  if (!owned) return;
  const o = owned;
  owned = null;
  if (o.style) o.style.remove();
  if (o.dlg) o.dlg.classList.remove(DLG_CLASS);
}