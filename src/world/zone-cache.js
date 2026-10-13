/** 區域優先序快取：保留公開陣列與 priority 的可變行為，未變更時不複製或排序。 */
export function createZoneLookup() {
  let registered = [];
  let priorities = [];
  let sorted = [];

  return function zoneAt(zones, p, fallback) {
    // 不攔截外部寫入。逐項比對可偵測新增、移除、替換、重排與 priority 修改。
    let changed = zones.length !== registered.length;
    for (let i = 0; !changed && i < zones.length; i++) {
      changed = zones[i] !== registered[i] || !Object.is(zones[i].priority, priorities[i]);
    }
    if (changed) {
      registered = zones.slice();
      priorities = registered.map(zone => zone.priority);
      // 原生穩定排序保留相同 priority 的登記順序，不更動公開陣列。
      sorted = registered.slice().sort((a, b) => a.priority - b.priority);
    }

    // 保留本次查詢的快照，即使 test 內另有查詢或登記也不改變當次順序。
    const order = sorted;
    for (let i = 0; i < order.length; i++) {
      const zone = order[i];
      const name = zone.test(p);
      if (name) return name;
    }
    return fallback;
  };
}
