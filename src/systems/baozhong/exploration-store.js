// 科系探索收藏：只在本機儲存科系代碼與原因，比較清單僅保留於本次使用。
export const STORAGE_KEY = 'baozhong.exploration.v1';
export const REASON_LABELS = Object.freeze({
  courses: '喜歡課程',
  careers: '喜歡出路',
  curious: '還想了解',
});
export const REASON_IDS = Object.freeze(Object.keys(REASON_LABELS));

const DEPARTMENT_IDS = Array.from({ length: 37 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`);
const DEPARTMENT_SET = new Set(DEPARTMENT_IDS);
const cleanReasons = reasons => Array.isArray(reasons)
  ? REASON_IDS.filter(reason => reasons.includes(reason)) : [];

/**
 * storage 可注入 Storage 相容物件，傳 null 則只使用記憶體。
 * 讀寫失敗或版本不相容時，本實例不再自動寫入，避免破壞原始資料。
 * setFavorite 回傳代碼是否有效；toggleCompare 回傳操作是否成功。
 * subscribe 不立即呼叫；每次實際更新傳入獨立快照，回傳取消訂閱函式。
 */
export function createExplorationStore(options = {}) {
  const validIds = new Set(
    Array.from(options.validIds ?? DEPARTMENT_IDS).filter(id => DEPARTMENT_SET.has(id)),
  );
  const favorites = new Map();
  let compareIds = [];
  const listeners = new Set();
  let storage;
  let persistent = false;

  try {
    storage = options.storage === undefined ? globalThis.localStorage : options.storage;
    persistent = !!storage && typeof storage.getItem === 'function'
      && typeof storage.setItem === 'function' && typeof storage.removeItem === 'function';
    if (persistent) {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const data = JSON.parse(raw);
        if (!data || data.version !== 1 || !Array.isArray(data.favorites)) {
          persistent = false;
        } else {
          for (const item of data.favorites) {
            if (!item || !validIds.has(item.id)) continue;
            const reasons = cleanReasons(item.reasons);
            if (reasons.length) favorites.set(item.id, reasons);
          }
        }
      }
    }
  } catch {
    persistent = false;
  }

  const getSnapshot = () => ({
    favorites: Array.from(favorites, ([id, reasons]) => ({ id, reasons: [...reasons] })),
    compareIds: [...compareIds],
    persistent,
  });

  function notify() {
    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      // 訂閱端錯誤不應阻止其他介面接收更新，或讓已成功的收藏操作失敗。
      try { listener(getSnapshot()); } catch { /* 保持儲存層可用。 */ }
    }
  }

  function persist() {
    if (!persistent) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, favorites: getSnapshot().favorites }));
    } catch {
      persistent = false;
    }
  }

  function setFavorite(id, reasons) {
    if (!validIds.has(id)) return false;
    const next = cleanReasons(reasons);
    const previous = favorites.get(id) ?? [];
    if (next.length === previous.length && next.every((reason, i) => reason === previous[i])) return true;
    if (next.length) favorites.set(id, next);
    else favorites.delete(id);
    persist();
    notify();
    return true;
  }

  function toggleCompare(id) {
    if (!validIds.has(id)) return false;
    if (compareIds.includes(id)) compareIds = compareIds.filter(value => value !== id);
    else {
      if (compareIds.length >= 3) return false;
      compareIds.push(id);
    }
    notify();
    return true;
  }

  function clear() {
    const changed = favorites.size > 0 || compareIds.length > 0;
    const wasPersistent = persistent;
    favorites.clear();
    compareIds = [];
    // 明確清除也嘗試移除先前無法讀取或不相容的資料；不影響其他儲存鍵。
    try { storage?.removeItem(STORAGE_KEY); } catch { persistent = false; }
    if (changed || wasPersistent !== persistent) notify();
  }

  return {
    getSnapshot,
    setFavorite,
    toggleCompare,
    clear,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() { listeners.clear(); },
  };
}
