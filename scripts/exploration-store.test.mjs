// 驗證探索收藏的資料界線、本機持久化與儲存失敗時的降級行為。
import test from 'node:test';
import assert from 'node:assert/strict';
import { createExplorationStore, STORAGE_KEY, REASON_IDS, REASON_LABELS } from '../src/systems/baozhong/exploration-store.js';

function storageWith(raw = null) {
  const items = new Map(raw === null ? [] : [[STORAGE_KEY, raw]]);
  return {
    items,
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key),
  };
}

test('persists only version, valid department IDs and canonical reasons', () => {
  const storage = storageWith();
  const store = createExplorationStore({ storage });
  assert.deepEqual(REASON_LABELS, { courses: '喜歡課程', careers: '喜歡出路', curious: '還想了解' });
  assert.deepEqual(REASON_IDS, ['courses', 'careers', 'curious']);
  assert.equal(store.setFavorite('D37', ['curious', 'courses', 'courses', 'private note']), true);
  store.toggleCompare('D02');
  assert.deepEqual(JSON.parse(storage.getItem(STORAGE_KEY)), {
    version: 1, favorites: [{ id: 'D37', reasons: ['courses', 'curious'] }],
  });
  const restored = createExplorationStore({ storage }).getSnapshot();
  assert.deepEqual(restored, {
    favorites: [{ id: 'D37', reasons: ['courses', 'curious'] }], compareIds: [], persistent: true,
  });
});

test('rejects unknown IDs, sanitizes reasons, removes empty favorites and respects validIds', () => {
  const store = createExplorationStore({ storage: null, validIds: ['D01', 'D37', 'D38', '__proto__'] });
  for (const id of ['D00', 'D38', 'D02', '__proto__', null, {}, ' D01', 'd01']) {
    assert.equal(store.setFavorite(id, ['courses']), false);
    assert.equal(store.toggleCompare(id), false);
  }
  store.setFavorite('D01', ['careers', null, {}, '__proto__']);
  assert.deepEqual(store.getSnapshot().favorites, [{ id: 'D01', reasons: ['careers'] }]);
  store.setFavorite('D01', 'courses');
  assert.deepEqual(store.getSnapshot().favorites, []);
  store.setFavorite('D37', ['curious']);
  store.setFavorite('D37', []);
  assert.deepEqual(store.getSnapshot().favorites, []);
});

test('sanitizes persisted entries and never trusts persisted comparison or extra fields', () => {
  const store = createExplorationStore({ storage: storageWith(JSON.stringify({
    version: 1, compareIds: ['D01'], personal: 'not retained', favorites: [
      null, { id: 'D38', reasons: ['courses'] }, { id: 'D01', reasons: ['bad'] },
      { id: 'D02', reasons: ['curious', 'careers', 'careers'], note: 'discard' },
      { id: 'D02', reasons: ['courses'] }, { id: 'D03', reasons: {} },
    ],
  })) });
  assert.deepEqual(store.getSnapshot(), {
    favorites: [{ id: 'D02', reasons: ['courses'] }], compareIds: [], persistent: true,
  });
});

test('malformed and unknown-version data fall back without overwriting original storage', () => {
  for (const raw of ['{', 'null', '[]', '{}', '{"version":1,"favorites":{}}', '{"version":2,"favorites":[]}']) {
    const storage = storageWith(raw);
    const store = createExplorationStore({ storage });
    assert.equal(store.getSnapshot().persistent, false);
    store.setFavorite('D01', ['courses']);
    assert.equal(store.getSnapshot().favorites.length, 1);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
    store.clear();
    assert.equal(storage.getItem(STORAGE_KEY), null);
  }
});

test('blocked reads, missing storage and quota errors retain usable in-memory state', () => {
  for (const storage of [null, {}, { getItem() { throw Error('blocked'); }, setItem() {}, removeItem() {} }]) {
    const store = createExplorationStore({ storage });
    assert.equal(store.getSnapshot().persistent, false);
    assert.equal(store.setFavorite('D01', ['curious']), true);
    assert.equal(store.getSnapshot().favorites.length, 1);
  }
  let writes = 0;
  const storage = storageWith();
  storage.setItem = () => { writes++; throw Error('quota'); };
  const store = createExplorationStore({ storage });
  const updates = [];
  store.subscribe(snapshot => updates.push(snapshot));
  store.setFavorite('D01', ['courses']);
  store.setFavorite('D02', ['careers']);
  assert.equal(writes, 1);
  assert.equal(updates[0].persistent, false);
  assert.equal(store.getSnapshot().favorites.length, 2);
});

test('comparison is ordered, independent of favorites, capped at three and session-only', () => {
  const storage = storageWith();
  const store = createExplorationStore({ storage });
  for (const id of ['D03', 'D01', 'D02']) assert.equal(store.toggleCompare(id), true);
  assert.equal(store.toggleCompare('D04'), false);
  assert.deepEqual(store.getSnapshot().compareIds, ['D03', 'D01', 'D02']);
  store.toggleCompare('D01');
  assert.equal(store.toggleCompare('D04'), true);
  assert.deepEqual(store.getSnapshot().compareIds, ['D03', 'D02', 'D04']);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.deepEqual(createExplorationStore({ storage }).getSnapshot().compareIds, []);
});

test('favorites preserve insertion order, snapshots cannot mutate internal state', () => {
  const store = createExplorationStore({ storage: null });
  store.setFavorite('D03', ['courses']);
  store.setFavorite('D01', ['careers']);
  store.setFavorite('D03', ['curious']);
  store.toggleCompare('D03');
  const snapshot = store.getSnapshot();
  snapshot.favorites[0].reasons.push('invalid');
  snapshot.favorites[0].id = 'D99';
  snapshot.favorites.pop();
  snapshot.compareIds.push('D02');
  assert.deepEqual(store.getSnapshot().favorites, [
    { id: 'D03', reasons: ['curious'] }, { id: 'D01', reasons: ['careers'] },
  ]);
  assert.deepEqual(store.getSnapshot().compareIds, ['D03']);
  store.setFavorite('D03', []);
  store.setFavorite('D03', ['courses']);
  assert.deepEqual(store.getSnapshot().favorites.map(item => item.id), ['D01', 'D03']);
});

test('subscriptions update only on changes, unsubscribe/dispose work and listeners are isolated', () => {
  const store = createExplorationStore({ storage: null });
  let calls = 0;
  const received = [];
  store.subscribe(snapshot => { snapshot.favorites.length = 0; throw Error('view failed'); });
  const unsubscribe = store.subscribe(snapshot => { calls++; received.push(snapshot); });
  store.setFavorite('D01', ['courses']);
  store.setFavorite('D01', ['courses', 'courses']);
  store.setFavorite('bad', ['courses']);
  assert.equal(calls, 1);
  assert.equal(received[0].favorites.length, 1);
  unsubscribe();
  unsubscribe();
  store.setFavorite('D02', ['courses']);
  assert.equal(calls, 1);
  store.subscribe(() => calls++);
  store.dispose();
  store.toggleCompare('D01');
  assert.equal(calls, 1);
  assert.doesNotThrow(() => store.subscribe(null)());
});

test('supports all 37 departments and an unavailable browser localStorage getter', () => {
  const store = createExplorationStore({ storage: null });
  for (let index = 1; index <= 37; index++) {
    assert.equal(store.setFavorite(`D${String(index).padStart(2, '0')}`, ['curious']), true);
  }
  assert.equal(store.getSnapshot().favorites.length, 37);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true, get() { throw Error('SecurityError'); },
    });
    const blocked = createExplorationStore();
    assert.equal(blocked.getSnapshot().persistent, false);
    assert.equal(blocked.setFavorite('D01', ['courses']), true);
    blocked.clear();
    assert.deepEqual(blocked.getSnapshot().favorites, []);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('clear removes this key only, clears comparison and reports removal failure', () => {
  const storage = storageWith();
  storage.setItem('unrelated', 'keep');
  const store = createExplorationStore({ storage });
  store.setFavorite('D01', ['courses']);
  store.toggleCompare('D02');
  let calls = 0;
  store.subscribe(() => calls++);
  store.clear();
  store.clear();
  assert.equal(calls, 1);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(storage.getItem('unrelated'), 'keep');
  assert.deepEqual(store.getSnapshot(), { favorites: [], compareIds: [], persistent: true });
  store.setFavorite('D03', ['curious']);
  storage.removeItem = () => { throw Error('blocked removal'); };
  store.clear();
  assert.deepEqual(store.getSnapshot(), { favorites: [], compareIds: [], persistent: false });
});
