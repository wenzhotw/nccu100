/** 既有角色零件的來源轉接，不建立新骨架，不重新掛載或釋放原物件。 */
import { characterRegistry } from './character-registry.js';

const npcSources = new WeakMap();
const HUMAN_SLOTS = Object.freeze(['top', 'bottom', 'hair', 'headwear', 'dress', 'hand.L', 'hand.R']);
const LABELS = Object.freeze({ body: '身體', top: '上衣', bottom: '下身與鞋', hair: '頭髮', headwear: '頭飾', accessory: '配件', custom: '特色零件', dress: '外袍', 'hand.L': '左手道具', 'hand.R': '右手道具' });
const unique = nodes => [...new Set(nodes.filter(Boolean))];
function descendants(root) { const nodes = new Set(); root.traverse(node => nodes.add(node)); return nodes; }
function isWithin(node, ancestor) { for (let p = node; p; p = p.parent) if (p === ancestor) return true; return false; }
function slot(sources, key, allowNone = true) { return { label: LABELS[key] || key, sources: unique(sources), allowNone }; }
function completeDescriptor({ id, label, kind, root, sources, anchors = {}, form, supported, unsupportedSlots = [], rules = {} }) {
  const slots = {};
  for (const [key, nodes] of Object.entries(sources)) if (nodes?.length) slots[key] = slot(nodes, key, !['body', 'top', 'bottom'].includes(key));
  // 每個來源都保留真正的直接父層。clone 掛回同一父層，才能跟著現有關節動畫。
  const named = { ...anchors }, known = new Set(Object.values(named));
  let i = 0;
  for (const spec of Object.values(slots)) for (const source of spec.sources) if (!known.has(source.parent)) {
    named[`native.${i++}`] = source.parent; known.add(source.parent);
  }
  return { id, label, kind, root, slots, anchors: named, form, supported, unsupportedSlots, rules };
}

/** 收集 mesh 根而非動畫關節；描邊與 mesh 的子零件隨該 mesh 複製一次。 */
export function collectNativeCharacterMeshes(root, excluded = []) {
  const skip = new Set(excluded), sources = [];
  function visit(node) {
    if (skip.has(node) || node.isSprite) return;
    if (node.isMesh || node.isLine || node.isPoints) { sources.push(node); return; }
    for (const child of node.children) visit(child);
  }
  for (const child of root.children) visit(child);
  return sources;
}

/** 只從工廠回傳的實體引用組成基礎槽位，臉與控制關節不成為可卸下的零件。 */
export function humanoidCharacterDescriptor({ id, label, model, appearance = {}, form, supported }) {
  const { root, body, joints: P, headCenter, parts: p, limbParts: l } = model;
  const accessory = unique(appearance.accessory || []), accessorySet = new Set(accessory);
  return completeDescriptor({ id, label, kind: 'humanoid', root, form, supported,
    anchors: { body, head: headCenter, 'head.pivot': P.head, 'shoulder.L': P.shL, 'shoulder.R': P.shR, 'hip.L': P.hipL, 'hip.R': P.hipR },
    sources: {
      body: [p.skull, l.armL.forearm, l.armR.forearm, l.armL.hand, l.armR.hand, ...(appearance.body || [])],
      top: [p.torso, l.armL.sleeve, l.armR.sleeve, ...(p.torsoDecorations || []).filter(node => !accessorySet.has(node)), ...(appearance.top || [])],
      bottom: [p.bottom, ...['L', 'R'].flatMap(side => Object.values(l[`leg${side}`]))],
      hair: appearance.hair || appearance.hairTop || [], headwear: appearance.headwear || [], accessory,
    },
  });
}

function npcDescriptor(n, appearance) {
  const id = n.appearanceId || n.id, label = n.title || n.tag?.userData?.label || n.id || '同學';
  if (n.assembly.kind !== 'capybara') return humanoidCharacterDescriptor({ id, label, model: n.assembly, appearance });
  const headwear = n.assembly.parts.headwear || [];
  return completeDescriptor({ id, label, kind: 'capybara', root: n.g,
    anchors: { body: n.rig, head: n.assembly.headCenter },
    sources: { body: collectNativeCharacterMeshes(n.rig, headwear), headwear },
    unsupportedSlots: HUMAN_SLOTS.filter(key => key !== 'headwear'),
  });
}

/** addNPC 先登記 pending。microtask 等同一輪同步服裝建構完才發 ready。 */
export function registerNpcCharacter(n, appearance = {}) {
  const descriptor = npcDescriptor(n, appearance), entry = characterRegistry.register(descriptor);
  npcSources.set(n.g, { n, appearance, initial: descendants(n.g), generation: entry.generation });
  queueMicrotask(() => {
    const current = characterRegistry.get(entry.id);
    if (current?.root === n.g && current.generation === entry.generation && !current.ready) readyNpcCharacter(n);
  });
  return entry;
}

/** 已知追加服裝的建構點在最後明確呼叫；避免使用者第一次裝配時只捕捉到半套。 */
export function readyNpcCharacter(n) {
  const record = npcSources.get(n?.g), id = n?.appearanceId || n?.id, current = characterRegistry.get(id);
  if (!record || current?.root !== n.g || current.generation !== record.generation) return null;
  if (current.ready) return current;
  const descriptor = npcDescriptor(n, record.appearance);
  if (descriptor.kind === 'humanoid') {
    const sources = Object.fromEntries(Object.entries(descriptor.slots).map(([key, spec]) => [key, [...spec.sources]]));
    const add = (key, node) => { (sources[key] ||= []).push(node); };
    const excluded = new Set([n.umbrella, ...(record.appearance.protected || [])].filter(Boolean));
    // 只看人的 body 子樹；人根下的馬、地台、對話泡泡與名牌不屬於人的服裝。
    function visit(node) {
      if (excluded.has(node) || node.isSprite) return;
      if (!record.initial.has(node)) {
        // 服裝 kit 的容器是 anchor，拆其直接子零件才能維持槽位互不重疊。
        const costumeAnchor = /^bz26-costume-.*-(body|head|left|right|hip-left|hip-right)$/.test(node.name);
        if (costumeAnchor) { for (const child of node.children) visit(child); return; }
        if (!node.children.length && !node.isMesh && !node.isLine && !node.isPoints) return;
        let key = isWithin(node, n.P.head) ? 'headwear' : 'custom';
        if (n.id === 'bz26-D26') key = isWithin(node, n.P.head) ? 'headwear' : /kimono-(obi|obijime|back-bow)/.test(node.name) ? 'custom' : 'dress';
        if (n.id === 'bz26-D31') key = isWithin(node, n.P.head) ? 'headwear' : /judge-(neck-tab|white-collar)/.test(node.name) ? 'custom' : 'dress';
        if (n.id === 'bz26-D12' && node.name === 'bz26-costume-finance-market-tablet') key = 'hand.L';
        add(key, node); return;
      }
      // 原 mesh 及其描邊不遞迴；避免把另一套外觀系統的 clone 或形態配件收成原生來源。
      if (node.isMesh) return;
      for (const child of node.children) visit(child);
    }
    visit(n.rig);
    Object.assign(descriptor, completeDescriptor({ ...descriptor, sources }));
    if (sources.dress?.length) descriptor.rules = { dress: ['top', 'bottom'] };
  }
  characterRegistry.register(descriptor);
  return characterRegistry.ready(id, n.g, record.generation);
}

export function registerPlayerCharacter({ model, appearance, form, supported }) {
  const entry = characterRegistry.register(humanoidCharacterDescriptor({ id: 'player', label: '主角', model, appearance, form, supported }));
  return characterRegistry.ready(entry.id, entry.root, entry.generation);
}

/** 非人形使用自己的原生外觀。沒有對應衣服／手臂的槽位保持不支援。 */
export function registerNativeCharacter({ id, label, kind, root, body = root, excluded = [], sources = {}, anchors = {} }) {
  const owned = Object.values(sources).flat();
  const descriptor = completeDescriptor({ id, label, kind, root,
    sources: { body: collectNativeCharacterMeshes(body, [...excluded, ...owned]), ...sources },
    anchors: { body, ...anchors }, unsupportedSlots: HUMAN_SLOTS.filter(key => !sources[key]),
  });
  const entry = characterRegistry.register(descriptor);
  return characterRegistry.ready(id, root, entry.generation);
}
