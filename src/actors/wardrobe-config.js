/**
 * 四角色換裝的純資料白名單與正式遊戲儲存層。
 * 嚴格驗證後才複製或寫入，不接觸模型、預覽資料或遊戲存檔。
 */
export const WARDROBE_ACTOR_IDS = Object.freeze(['player', 'chiang', 'bz26-D12', 'bz26-D23']);
export const WARDROBE_CONFIG_MAX_BYTES = 4 * 1024;
export const GAME_WARDROBE_MAX_BYTES = 16 * 1024;
export const GAME_WARDROBE_KEY = 'nccu100.wardrobe.game.v1';

const options = values => Object.freeze(values.map(([id, label]) => Object.freeze({ id, label })));
export const WARDROBE_CATALOG = Object.freeze({
  headwear: options([['default', '原本頭部'], ['beret', '藍綠貝雷帽'], ['cap', '金色學士帽']]),
  outerwear: options([['default', '原本服裝'], ['teal-vest', '藍綠背心'], ['gold-vest', '暖金背心']]),
  leftHand: options([['default', '原本道具'], ['none', '卸下手持物'], ['book', '藍綠書本'], ['tablet', '暖金平板']]),
});

const slotIds = Object.freeze(Object.keys(WARDROBE_CATALOG));
const encoder = new TextEncoder();

function assertActorId(id) {
  if (typeof id !== 'string' || !WARDROBE_ACTOR_IDS.includes(id)) {
    throw new TypeError('Invalid wardrobe actor');
  }
}

// 包含不可列舉欄位與 Symbol；拒絕 getter，避免驗證過程執行輸入程式碼。
function plainDataKeys(value, label) {
  if (value === null || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`Invalid ${label}: expected a plain object`);
  }
  const keys = Reflect.ownKeys(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`Invalid ${label}: expected plain data fields`);
    }
  }
  return keys;
}

function assertExactKeys(value, expected, label) {
  const keys = plainDataKeys(value, label);
  if (keys.length !== expected.length || keys.some(key => !expected.includes(key))) {
    throw new TypeError(`Invalid ${label}: unexpected or missing fields`);
  }
}

function assertJsonSize(json, limit, label) {
  // 先檢查字元數，避免為已明顯超限的輸入配置額外編碼記憶體。
  if (json.length > limit || encoder.encode(json).byteLength > limit) {
    throw new RangeError(`${label} JSON too large`);
  }
}

/** 接受純物件或最多 4 KiB 的 JSON 字串；不保留輸入引用。 */
export function validateWardrobeConfig(value, expectedId) {
  if (expectedId !== undefined) assertActorId(expectedId);
  if (typeof value === 'string') {
    assertJsonSize(value, WARDROBE_CONFIG_MAX_BYTES, 'Wardrobe config');
    value = JSON.parse(value);
  }
  assertExactKeys(value, ['schemaVersion', 'actorId', 'slots'], 'wardrobe config');
  if (value.schemaVersion !== 1) throw new TypeError('Invalid wardrobe schema version');
  assertActorId(value.actorId);
  if (expectedId !== undefined && value.actorId !== expectedId) {
    throw new TypeError('Wardrobe actor mismatch');
  }
  assertExactKeys(value.slots, slotIds, 'wardrobe slots');
  const slots = {};
  for (const slot of slotIds) {
    const item = value.slots[slot];
    if (typeof item !== 'string' || !WARDROBE_CATALOG[slot].some(option => option.id === item)) {
      throw new TypeError(`Invalid wardrobe item: ${slot}`);
    }
    slots[slot] = item;
  }
  const config = { schemaVersion: 1, actorId: value.actorId, slots };
  assertJsonSize(JSON.stringify(config), WARDROBE_CONFIG_MAX_BYTES, 'Wardrobe config');
  return config;
}

function emptyStore() {
  return { schemaVersion: 1, actors: {} };
}

function validateStore(value) {
  assertExactKeys(value, ['schemaVersion', 'actors'], 'game wardrobe store');
  if (value.schemaVersion !== 1) throw new TypeError('Invalid game wardrobe schema version');
  const actorIds = plainDataKeys(value.actors, 'game wardrobe actors');
  const snapshot = emptyStore();
  for (const id of actorIds) {
    assertActorId(id);
    snapshot.actors[id] = validateWardrobeConfig(value.actors[id], id);
  }
  return snapshot;
}

/**
 * 明確注入 Storage 相容物件；不讀取全域 localStorage。
 * 損壞資料、讀寫拒絕與容量錯誤皆向上拋出；只有 clear 可直接清除損壞資料。
 */
export function createGameWardrobeStore(storage) {
  if (!storage || ['getItem', 'setItem', 'removeItem'].some(method => typeof storage[method] !== 'function')) {
    throw new TypeError('Game wardrobe storage is required');
  }

  function read() {
    const json = storage.getItem(GAME_WARDROBE_KEY);
    if (json === null) return emptyStore();
    if (typeof json !== 'string') throw new TypeError('Invalid game wardrobe storage value');
    assertJsonSize(json, GAME_WARDROBE_MAX_BYTES, 'Game wardrobe store');
    return validateStore(JSON.parse(json));
  }

  function write(snapshot) {
    const json = JSON.stringify(snapshot);
    assertJsonSize(json, GAME_WARDROBE_MAX_BYTES, 'Game wardrobe store');
    storage.setItem(GAME_WARDROBE_KEY, json);
    return snapshot;
  }

  return Object.freeze({
    read,
    writeActor(value) {
      const config = validateWardrobeConfig(value);
      const snapshot = read();
      snapshot.actors[config.actorId] = config;
      return write(snapshot);
    },
    removeActor(id) {
      assertActorId(id);
      const snapshot = read();
      if (!Object.hasOwn(snapshot.actors, id)) return snapshot;
      delete snapshot.actors[id];
      return write(snapshot);
    },
    clear() {
      storage.removeItem(GAME_WARDROBE_KEY);
      return emptyStore();
    },
  });
}
