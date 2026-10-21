// 活動期間暫收四維道植栽與原戶外 NPC，離場恢復原物件。只供明確啟用的預覽。
// 四維道中心線與世界 layout.js 一致，不按模糊 mesh 顏色或任意實例鄰近值猜樹。
export function isSiweiFoliage(f) {
  return Number.isFinite(f.x) && Number.isFinite(f.z) && f.x >= -86 && f.x <= 72 && Math.abs(f.z - (-60.2 + 0.18 * f.x)) <= 7.5;
}
const isCampusNPC = n => n && !n.room && !n.indoorNPC && !String(n.id || '').startsWith('bz26-');
const extract = (list, predicate) => {
  const removed = [];
  for (let i = list.length - 1; i >= 0; i--) if (predicate(list[i])) removed.unshift({ item: list.splice(i, 1)[0], index: i });
  return removed;
};
const restore = (list, records) => {
  for (const { item, index } of records) if (!list.includes(item)) list.splice(Math.min(index, list.length), 0, item);
};

export function createVenueFocus({ foliage, colliders, npcs, spots, state, enabled = false }) {
  let active = false, trees = [], treeColliders = [], people = [], npcRecords = [], spotRecords = [];
  return {
    isActive: () => active,
    counts: () => ({ trees: trees.length, treeColliders: treeColliders.length, npcs: people.length, spots: spotRecords.length }),
    setActive(on) {
      on = enabled && !!on;
      if (active === on) return active;
      active = on;
      if (on) {
        trees = foliage.filter(f => isSiweiFoliage(f) && typeof f.setVisible === 'function').map(f => ({ f, visible: f.isVisible?.() ?? true }));
        // 僅移除植栽登記的同一碰撞物件，保留同位置的其他碰撞。
        treeColliders = extract(colliders, c => trees.some(({ f }) => f.collider === c));
        trees.forEach(({ f }) => f.setVisible(false));
        people = npcs.filter(isCampusNPC).map(n => ({ n, visible: n.g.visible }));
        const selected = new Set(people.map(({ n }) => n));
        const selectedSpots = new Set(people.map(({ n }) => n.spot));
        npcRecords = extract(npcs, n => selected.has(n));
        spotRecords = extract(spots, s => selectedSpots.has(s));
        people.forEach(({ n }) => { n.g.visible = false; });
        if (selectedSpots.has(state.near)) { state.near = null; state.talkFocus = null; }
      } else {
        trees.forEach(({ f, visible }) => f.setVisible(visible));
        people.forEach(({ n, visible }) => { n.g.visible = visible; });
        restore(colliders, treeColliders); restore(npcs, npcRecords); restore(spots, spotRecords);
        trees = []; treeColliders = []; people = []; npcRecords = []; spotRecords = [];
      }
      return active;
    },
  };
}
