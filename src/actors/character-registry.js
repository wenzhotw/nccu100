/** 角色外觀來源目錄。只保存引用，不移動、隱藏或釋放場景節點。 */
const NORMAL = () => 'normal';
const SUPPORTED = () => true;
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);

function inside(node, root) {
  for (let current = node; current; current = current.parent) if (current === root) return true;
  return false;
}
function metadata(descriptor, generation, ready = false, transition = false) {
  const { id, root } = descriptor;
  if (typeof id !== 'string' || !id.trim() || forbidden.has(id) || !root?.isObject3D) throw new TypeError('Invalid character identity');
  const slots = {}, seen = [];
  for (const [key, slot] of Object.entries(descriptor.slots || {})) {
    if (forbidden.has(key) || !slot || !Array.isArray(slot.sources) || !slot.sources.length) throw new TypeError('Invalid character slot');
    if (['body', 'top', 'bottom'].includes(key) && slot.allowNone === true) throw new TypeError('Native anatomy and integrated clothing cannot be removed');
    const sources = [...slot.sources];
    for (const node of sources) {
      if (!node?.isObject3D || node === root || !inside(node, root)) throw new TypeError('Character source must belong to its root');
      if (seen.some(other => inside(node, other) || inside(other, node))) throw new TypeError('Character sources overlap');
      seen.push(node);
    }
    slots[key] = Object.freeze({ label: String(slot.label || key), sources: Object.freeze(sources), allowNone: slot.allowNone === true });
  }
  const anchors = { ...(descriptor.anchors || {}) };
  for (const [key, node] of Object.entries(anchors)) if (forbidden.has(key) || !node?.isObject3D || !inside(node, root)) throw new TypeError('Invalid character anchor');
  const form = descriptor.form || NORMAL, supported = descriptor.supported || SUPPORTED;
  if (typeof form !== 'function' || typeof supported !== 'function') throw new TypeError('Invalid character form callbacks');
  const rules = {};
  for (const [owner, targets] of Object.entries(descriptor.rules || {})) {
    if (!Object.hasOwn(slots, owner) || !Array.isArray(targets) || targets.some(key => typeof key !== 'string' || !Object.hasOwn(slots, key) || key === owner)) throw new TypeError('Invalid character covering rule');
    rules[owner] = Object.freeze([...new Set(targets)]);
  }
  return Object.freeze({ id, label: String(descriptor.label || id), kind: String(descriptor.kind || 'humanoid'), root, generation,
    ready, formTransition: transition, slots: Object.freeze(slots), anchors: Object.freeze(anchors), rules: Object.freeze(rules), form,
    supported: transition ? () => false : supported,
    unsupportedSlots: Object.freeze([...(descriptor.unsupportedSlots || [])]),
  });
}

export function createCharacterRegistry() {
  const records = new Map(), roots = new WeakMap(), listeners = new Set();
  let generation = 0;
  function emit(type, entry, strict = false) {
    const event = Object.freeze({ type, entry });
    for (const fn of [...listeners]) {
      try { fn(event); } catch (error) { if (strict) throw error; console.error('[character-registry] 角色外觀訂閱失敗', error); }
    }
  }
  function matching(id, root, expectedGeneration) {
    const record = records.get(id);
    return record && (root === undefined || record.entry.root === root) && (expectedGeneration === undefined || record.entry.generation === expectedGeneration) ? record : null;
  }
  return Object.freeze({
    register(descriptor) {
      const old = records.get(descriptor?.id);
      if (descriptor?.root && roots.has(descriptor.root) && roots.get(descriptor.root) !== descriptor.id) throw new Error('Character root already has an identity');
      // 同一實例只在建構完成前補齊來源。已 ready 的實例須先移除，不能讓現有 adapter 偷換來源。
      if (old?.entry.root === descriptor?.root && old.entry.ready) throw new Error('Ready character sources are immutable');
      const nextGeneration = old?.entry.root === descriptor?.root ? old.entry.generation : generation + 1;
      const snapshot = metadata(descriptor, nextGeneration);
      const entry = old?.entry.root === descriptor?.root && old.entry.formTransition ? metadata(snapshot, nextGeneration, false, true) : snapshot;
      if (old && old.entry.root !== entry.root) { roots.delete(old.entry.root); emit('remove', old.entry); }
      generation = Math.max(generation, nextGeneration);
      records.set(entry.id, { descriptor: snapshot, entry });
      roots.set(entry.root, entry.id);
      return entry;
    },
    ready(id, root, expectedGeneration) {
      const record = matching(id, root, expectedGeneration);
      if (!record) return null;
      if (record.entry.ready) return record.entry;
      record.entry = metadata(record.descriptor, record.entry.generation, true, record.entry.formTransition);
      emit('ready', record.entry);
      return record.entry;
    },
    unregister(id, root) {
      // 刪除必須帶實例，舊建構器不能誤刪同 ID 的新一代角色。
      const record = root && matching(id, root);
      if (!record) return false;
      records.delete(id); roots.delete(root); emit('remove', record.entry); return true;
    },
    beginForm(id, root) {
      const record = root && matching(id, root);
      if (!record || record.entry.formTransition) return record?.entry || null;
      const previous = record.entry;
      record.entry = metadata(record.descriptor, record.entry.generation, record.entry.ready, true);
      try { emit('form', record.entry, true); }
      catch (error) { record.entry = previous; throw error; }
      return record.entry;
    },
    form(id, root) {
      const record = root && matching(id, root);
      if (!record) return null;
      record.entry = metadata(record.descriptor, record.entry.generation, record.entry.ready);
      emit('form', record.entry); return record.entry;
    },
    get(id) { return records.get(id)?.entry; },
    list() { return Object.freeze([...records.values()].map(record => record.entry)); },
    subscribe(fn) {
      if (typeof fn !== 'function') throw new TypeError('Character subscriber must be a function');
      listeners.add(fn); return () => listeners.delete(fn);
    },
  });
}

export const characterRegistry = createCharacterRegistry();
