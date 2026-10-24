/** 驗證換裝白名單、純資料邊界及正式遊戲儲存鍵的隔離與錯誤處理。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WARDROBE_ACTOR_IDS, WARDROBE_CATALOG, WARDROBE_CONFIG_MAX_BYTES,
  GAME_WARDROBE_KEY, GAME_WARDROBE_MAX_BYTES, validateWardrobeConfig, createGameWardrobeStore,
} from '../src/actors/wardrobe-config.js';

function config(actorId = 'player', slots = {}) {
  return { schemaVersion: 1, actorId, slots: { headwear: 'default', outerwear: 'default', leftHand: 'default', ...slots } };
}

function storageWith(raw = null) {
  const items = new Map(raw === null ? [] : [[GAME_WARDROBE_KEY, raw]]);
  const calls = [];
  return {
    items, calls,
    getItem(key) { calls.push(['getItem', key]); return items.get(key) ?? null; },
    setItem(key, value) { calls.push(['setItem', key, value]); items.set(key, value); },
    removeItem(key) { calls.push(['removeItem', key]); items.delete(key); },
  };
}

function snapshot(actors = {}) { return { schemaVersion: 1, actors }; }

test('catalog and actor whitelist are frozen, finite and match the existing factory options', () => {
  assert.deepEqual(WARDROBE_ACTOR_IDS, ['player', 'chiang', 'bz26-D12', 'bz26-D23']);
  assert.deepEqual(Object.fromEntries(Object.entries(WARDROBE_CATALOG).map(([slot, items]) => [slot, items.map(item => item.id)])), {
    headwear: ['default', 'beret', 'cap'],
    outerwear: ['default', 'teal-vest', 'gold-vest'],
    leftHand: ['default', 'none', 'book', 'tablet'],
  });
  assert.ok(Object.isFrozen(WARDROBE_ACTOR_IDS));
  assert.ok(Object.isFrozen(WARDROBE_CATALOG));
  for (const items of Object.values(WARDROBE_CATALOG)) {
    assert.ok(Object.isFrozen(items));
    for (const item of items) assert.ok(Object.isFrozen(item));
  }
});

test('validates every actor and slot combination, including JSON strings', () => {
  for (const actorId of WARDROBE_ACTOR_IDS) {
    for (const headwear of WARDROBE_CATALOG.headwear) {
      for (const outerwear of WARDROBE_CATALOG.outerwear) {
        for (const leftHand of WARDROBE_CATALOG.leftHand) {
          const value = config(actorId, { headwear: headwear.id, outerwear: outerwear.id, leftHand: leftHand.id });
          assert.deepEqual(validateWardrobeConfig(value, actorId), value);
          assert.deepEqual(validateWardrobeConfig(JSON.stringify(value), actorId), value);
        }
      }
    }
  }
});

test('validation returns detached plain data and never mutates the input', () => {
  const input = config('chiang', { headwear: 'beret' });
  Object.freeze(input.slots);
  Object.freeze(input);
  const copy = validateWardrobeConfig(input);
  assert.notEqual(copy, input);
  assert.notEqual(copy.slots, input.slots);
  copy.slots.headwear = 'cap';
  assert.equal(input.slots.headwear, 'beret');
  assert.equal(Object.getPrototypeOf(copy), Object.prototype);
});

test('rejects unknown actors, mismatched actors and invalid expected IDs', () => {
  for (const actorId of ['npc', 'bz26-D01', '__proto__', 'constructor', 'https://example.com', '', null, 1, {}, ['player']]) {
    assert.throws(() => validateWardrobeConfig(config(actorId)), TypeError);
    assert.throws(() => validateWardrobeConfig(config(), actorId), TypeError);
  }
  assert.throws(() => validateWardrobeConfig(config('player'), 'chiang'), /mismatch/);
});

test('rejects missing and extra config/slot fields and unsupported schema versions', () => {
  for (const key of ['schemaVersion', 'actorId', 'slots']) {
    const value = config(); delete value[key];
    assert.throws(() => validateWardrobeConfig(value));
  }
  for (const key of Object.keys(WARDROBE_CATALOG)) {
    const value = config(); delete value.slots[key];
    assert.throws(() => validateWardrobeConfig(value));
  }
  for (const version of [0, 2, '1', null, undefined, NaN, Infinity]) {
    assert.throws(() => validateWardrobeConfig({ ...config(), schemaVersion: version }));
  }
  for (const extra of ['url', 'prototype', 'constructor', 'toJSON', 'color']) {
    assert.throws(() => validateWardrobeConfig({ ...config(), [extra]: 'untrusted' }));
    assert.throws(() => validateWardrobeConfig(config('player', { [extra]: 'untrusted' })));
  }
});

test('rejects URL, prototype, wrong-slot and non-string item values', () => {
  for (const slot of Object.keys(WARDROBE_CATALOG)) {
    for (const value of ['__proto__', 'constructor', 'https://example.com/model.glb', 'data:application/json,{}', 'javascript:alert(1)', '', null, 1, {}, [], true]) {
      assert.throws(() => validateWardrobeConfig(config('player', { [slot]: value })));
    }
  }
  assert.throws(() => validateWardrobeConfig(config('player', { headwear: 'book' })));
  assert.throws(() => validateWardrobeConfig(config('player', { outerwear: 'none' })));
});

test('rejects non-plain objects and inherited fields', () => {
  for (const value of [null, undefined, 1, true, [], new Date(), new String('{}'), Object.create(null)]) {
    assert.throws(() => validateWardrobeConfig(value));
  }
  for (const prototype of [null, config(), { pollute: true }]) {
    assert.throws(() => validateWardrobeConfig(Object.assign(Object.create(prototype), config())));
    const value = config(); value.slots = Object.assign(Object.create(prototype), value.slots);
    assert.throws(() => validateWardrobeConfig(value));
  }
  class Config { constructor() { Object.assign(this, config()); } }
  assert.throws(() => validateWardrobeConfig(new Config()));
});

test('rejects accessors, symbol keys and hidden fields without invoking getters or toJSON', () => {
  let invoked = false;
  for (const target of ['config', 'slots']) {
    for (const field of ['getter', 'symbol', 'hidden']) {
      const value = config();
      const object = target === 'config' ? value : value.slots;
      if (field === 'getter') Object.defineProperty(object, target === 'config' ? 'actorId' : 'headwear', {
        enumerable: true, get() { invoked = true; throw Error('Getter executed'); },
      });
      if (field === 'symbol') object[Symbol('unexpected')] = true;
      if (field === 'hidden') Object.defineProperty(object, 'hidden', { value: true });
      assert.throws(() => validateWardrobeConfig(value), TypeError);
    }
  }
  assert.throws(() => validateWardrobeConfig({ ...config(), toJSON() { invoked = true; return config(); } }));
  assert.equal(invoked, false);
});

test('rejects prototype keys from parsed JSON without polluting Object.prototype', () => {
  const original = Object.prototype.polluted;
  for (const json of [
    '{"schemaVersion":1,"actorId":"player","slots":{"headwear":"default","outerwear":"default","leftHand":"default"},"__proto__":{"polluted":true}}',
    '{"schemaVersion":1,"actorId":"player","slots":{"headwear":"default","outerwear":"default","leftHand":"default","__proto__":{"polluted":true}}}',
  ]) assert.throws(() => validateWardrobeConfig(json));
  assert.equal(Object.prototype.polluted, original);
});

test('config JSON uses an inclusive 4 KiB UTF-8 boundary and rejects malformed data', () => {
  assert.equal(WARDROBE_CONFIG_MAX_BYTES, 4096);
  const json = JSON.stringify(config());
  assert.deepEqual(validateWardrobeConfig(json.padEnd(4096, ' ')), config());
  assert.throws(() => validateWardrobeConfig(json.padEnd(4097, ' ')), RangeError);
  assert.throws(() => validateWardrobeConfig('"' + '中'.repeat(1400) + '"'), RangeError);
  for (const raw of ['', '{', 'null', '[]', '{}', '"https://example.com"']) {
    assert.throws(() => validateWardrobeConfig(raw));
  }
});

test('empty and populated reads return fresh detached snapshots', () => {
  const storage = storageWith();
  const store = createGameWardrobeStore(storage);
  const empty = store.read(); empty.actors.player = config();
  assert.deepEqual(store.read(), snapshot());
  assert.equal(storage.calls.filter(([method]) => method !== 'getItem').length, 0);
  const value = snapshot({ player: config('player', { leftHand: 'book' }) });
  storage.items.set(GAME_WARDROBE_KEY, JSON.stringify(value));
  const first = store.read();
  first.actors.player.slots.leftHand = 'tablet';
  delete first.actors.player;
  assert.deepEqual(store.read(), value);
});

test('writeActor merges latest persisted actors and replaces only its own configuration', () => {
  const storage = storageWith();
  const store = createGameWardrobeStore(storage);
  const expected = snapshot();
  for (const id of WARDROBE_ACTOR_IDS) {
    const value = config(id, { headwear: 'beret', leftHand: 'book' });
    expected.actors[id] = value;
    assert.deepEqual(store.writeActor(value), expected);
  }
  expected.actors.player = config('player', { headwear: 'cap' });
  const result = store.writeActor(JSON.stringify(expected.actors.player));
  assert.deepEqual(result, expected);
  result.actors.player.slots.headwear = 'default';
  assert.deepEqual(store.read(), expected);
  assert.deepEqual(JSON.parse(storage.items.get(GAME_WARDROBE_KEY)), expected);
  const other = createGameWardrobeStore(storage);
  other.removeActor('chiang');
  delete expected.actors.chiang;
  expected.actors['bz26-D12'] = config('bz26-D12', { outerwear: 'gold-vest' });
  assert.deepEqual(store.writeActor(expected.actors['bz26-D12']), expected);
});

test('invalid write input never reads or changes storage', () => {
  const storage = storageWith();
  const store = createGameWardrobeStore(storage);
  assert.throws(() => store.writeActor(config('unknown')));
  assert.throws(() => store.writeActor(config('player', { headwear: 'url' })));
  assert.deepEqual(storage.calls, []);
});

test('malformed, incompatible and polluted stores throw without overwriting any data', () => {
  const invalid = [
    '', '{', 'null', '[]', '{}', '"plain text"',
    JSON.stringify({ ...snapshot(), schemaVersion: 2 }),
    JSON.stringify({ ...snapshot(), ignored: true }),
    JSON.stringify({ schemaVersion: 1, actors: null }),
    JSON.stringify({ schemaVersion: 1, actors: [] }),
    JSON.stringify(snapshot({ unknown: config() })),
    JSON.stringify(snapshot({ chiang: config('player') })),
    JSON.stringify(snapshot({ player: { ...config(), url: 'https://example.com' } })),
    JSON.stringify(snapshot({ player: config('player', { leftHand: 'invalid' }) })),
    '{"schemaVersion":1,"actors":{"__proto__":{"polluted":true}}}',
    '{"schemaVersion":1,"actors":{},"__proto__":{"polluted":true}}',
  ];
  for (const raw of invalid) {
    const storage = storageWith(raw);
    const store = createGameWardrobeStore(storage);
    assert.throws(() => store.read());
    assert.throws(() => store.writeActor(config()));
    assert.throws(() => store.removeActor('player'));
    assert.equal(storage.items.get(GAME_WARDROBE_KEY), raw);
    assert.ok(storage.calls.every(([method]) => method === 'getItem'));
  }
});

test('store JSON uses an inclusive 16 KiB UTF-8 boundary', () => {
  assert.equal(GAME_WARDROBE_MAX_BYTES, 16384);
  const json = JSON.stringify(snapshot());
  assert.deepEqual(createGameWardrobeStore(storageWith(json.padEnd(16384, ' '))).read(), snapshot());
  for (const raw of [json.padEnd(16385, ' '), '"' + '中'.repeat(6000) + '"']) {
    const storage = storageWith(raw);
    const store = createGameWardrobeStore(storage);
    assert.throws(() => store.read(), RangeError);
    assert.throws(() => store.writeActor(config()), RangeError);
    assert.throws(() => store.removeActor('player'), RangeError);
    assert.equal(storage.items.get(GAME_WARDROBE_KEY), raw);
  }
});

test('non-string storage values do not silently count as empty', () => {
  for (const raw of [undefined, false, 0, {}, snapshot()]) {
    const storage = { getItem: () => raw, setItem() { assert.fail('Unexpected write'); }, removeItem() {} };
    assert.throws(() => createGameWardrobeStore(storage).read(), TypeError);
  }
});

test('removeActor preserves other actors and does not write when already absent', () => {
  const value = snapshot(Object.fromEntries(WARDROBE_ACTOR_IDS.map(id => [id, config(id)])));
  const storage = storageWith(JSON.stringify(value));
  const store = createGameWardrobeStore(storage);
  delete value.actors.chiang;
  assert.deepEqual(store.removeActor('chiang'), value);
  const writes = storage.calls.filter(([method]) => method === 'setItem').length;
  assert.deepEqual(store.removeActor('chiang'), value);
  assert.equal(storage.calls.filter(([method]) => method === 'setItem').length, writes);
  for (const id of ['unknown', '__proto__', null, 1]) assert.throws(() => store.removeActor(id));
  for (const id of Object.keys(value.actors)) store.removeActor(id);
  assert.deepEqual(store.read(), snapshot());
  assert.deepEqual(JSON.parse(storage.items.get(GAME_WARDROBE_KEY)), snapshot());
});

test('clear is the explicit recovery path and only removes the game wardrobe key', () => {
  assert.equal(GAME_WARDROBE_KEY, 'nccu100.wardrobe.game.v1');
  for (const raw of [null, '{corrupted', JSON.stringify(snapshot({ player: config() }))]) {
    const storage = storageWith(raw);
    storage.items.set('nccu100.wardrobe.preview.v1', 'preview remains');
    storage.items.set('nccu100.save.v1', 'save remains');
    storage.items.set('unrelated', 'keep');
    const store = createGameWardrobeStore(storage);
    assert.deepEqual(store.clear(), snapshot());
    assert.deepEqual(storage.calls, [['removeItem', GAME_WARDROBE_KEY]]);
    assert.equal(storage.items.has(GAME_WARDROBE_KEY), false);
    assert.equal(storage.items.get('nccu100.wardrobe.preview.v1'), 'preview remains');
    assert.equal(storage.items.get('nccu100.save.v1'), 'save remains');
    assert.equal(storage.items.get('unrelated'), 'keep');
    assert.deepEqual(store.read(), snapshot());
  }
});

test('every storage call is scoped to the game wardrobe key', () => {
  const storage = storageWith();
  const store = createGameWardrobeStore(storage);
  store.read(); store.writeActor(config()); store.removeActor('player'); store.clear();
  assert.ok(storage.calls.every(([, key]) => key === GAME_WARDROBE_KEY));
});

test('storage SecurityError, quota and removal errors propagate unchanged without cache drift', () => {
  for (const method of ['getItem', 'setItem', 'removeItem']) {
    const storage = storageWith(JSON.stringify(snapshot({ player: config() })));
    const previous = storage.items.get(GAME_WARDROBE_KEY);
    const error = new Error(`${method} failed`);
    storage[method] = () => { throw error; };
    const store = createGameWardrobeStore(storage);
    const throwsSame = action => assert.throws(action, value => value === error);
    if (method === 'getItem') {
      throwsSame(() => store.read());
      throwsSame(() => store.writeActor(config()));
      throwsSame(() => store.removeActor('player'));
    } else if (method === 'setItem') {
      throwsSame(() => store.writeActor(config('player', { leftHand: 'tablet' })));
      throwsSame(() => store.removeActor('player'));
      assert.deepEqual(store.read(), snapshot({ player: config() }));
    } else throwsSame(() => store.clear());
    assert.equal(storage.items.get(GAME_WARDROBE_KEY), previous);
  }
});

test('requires explicit storage and never touches a global localStorage getter', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let reads = 0;
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true, get() { reads++; throw Error('Global storage access'); },
    });
    for (const storage of [undefined, null, {}, { getItem() {}, setItem() {} }]) {
      assert.throws(() => createGameWardrobeStore(storage), TypeError);
    }
    assert.deepEqual(createGameWardrobeStore(storageWith()).read(), snapshot());
    assert.equal(reads, 0);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('module is independent of three, engine and global storage', () => {
  const source = readFileSync(new URL('../src/actors/wardrobe-config.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /(?:window|globalThis)\s*\.\s*localStorage/);
});
