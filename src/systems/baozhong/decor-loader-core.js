// src/systems/baozhong/decor-loader-core.js（Grok，T065 重建）：佈景載入器的核心，不 import 任何東西（THREE、檔案表、ctx 都由呼叫端給）。
// 依據：Claude工作區 A27 decor-loader.js v1 與 T064 對 v2 的描述（A29 原碼匯出是 #ERROR!，無法取得，這是照描述重寫）：
//   ① 世代計數＋載入中清單：載入途中被卸載，檔案晚到也不會再掛上（GPT D189 缺陷一）。
//   ② 卸載時還原被 hideCanopy／hideCounter 藏起的頂棚與櫃檯（GPT D189 缺陷二）。
// 其餘行為同 v1：單一檔出錯只退回原帳篷、主控台警告；update 出錯只停那一頂的動畫；共用形狀材質不 dispose。

export function createDecorLoader({ THREE, files, createCtx, warn = () => {} }) {
  const live = [];          // { id, root, update, hidden }
  const pending = new Set(); // 載入中的 { id, gen }
  let gen = 0;

  function hide(list, hidden) {
    for (const m of list || []) { if (!m) continue; m.visible = false; m.userData.bz26Hidden = true; hidden.push(m); }
  }
  function restore(e) {
    for (const m of e.hidden) { delete m.userData.bz26Hidden; m.visible = true; }
    e.hidden.length = 0;
    if (e.root.parent) e.root.parent.remove(e.root);
  }

  /** tent：帳篷 Group（本地座標＝佈景座標）；parts：{ canopy:[Mesh], counter:[Mesh] }。回傳 entry 或 null。 */
  async function mountDecor(id, tent, collegeColor, parts = {}) {
    const load = files[`./decor/${id}.js`];
    if (!load) return null;
    const ticket = { id, gen };
    pending.add(ticket);
    let root = null;
    try {
      const mod = await load();
      if (!pending.has(ticket) || ticket.gen !== gen) return null;   // 載入中已卸載：不掛上
      root = new THREE.Group(); root.name = `bz26-decor-${id}`;
      tent.add(root);
      const res = mod.default(createCtx(root, collegeColor)) || {};
      const entry = { id, root, update: typeof res.update === 'function' ? res.update : null, hidden: [] };
      if (res.hideCanopy) hide(parts.canopy, entry.hidden);
      if (res.hideCounter) hide(parts.counter, entry.hidden);
      live.push(entry);
      return entry;
    } catch (err) {
      if (root && root.parent) root.parent.remove(root);
      warn(`[bz26] 佈景 ${id} 載入失敗，改用原帳篷`, err);
      return null;
    } finally {
      pending.delete(ticket);
    }
  }

  /** 每幀呼叫；只更新看得到的帳篷（帳篷或會場 visible=false 就跳過）。 */
  function updateDecor(dt) {
    for (const e of live) {
      if (!e.update || !e.root.parent || !visibleUp(e.root.parent)) continue;
      try { e.update(dt); } catch (err) { warn(`[bz26] 佈景 ${e.id} update 出錯，停用動畫`, err); e.update = null; }
    }
  }
  function visibleUp(n) { for (let p = n; p; p = p.parent) if (!p.visible) return false; return true; }

  /** 卸載一頂（還原頂棚與櫃檯）。 */
  function unmountDecor(id) {
    for (const t of pending) if (t.id === id) pending.delete(t);
    for (let i = live.length - 1; i >= 0; i--) if (live[i].id === id) { restore(live[i]); live.splice(i, 1); }
  }
  /** 活動結束：全部卸載，載入中的也作廢。 */
  function unmountAllDecor() {
    gen++; pending.clear();
    for (const e of live) restore(e);
    live.length = 0;
  }
  return { mountDecor, updateDecor, unmountDecor, unmountAllDecor, live, pending };
}
