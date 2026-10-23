/**
 * 角色外觀快照測試，兩種快照：
 *
 * 1. 世界空間快照（snapshots/world/）：每個看得到的零件最後畫在哪裡、長什麼樣，不管物件樹怎麼組。
 *    這是「外觀不變」的標準。換底層、插入關節、改掛載層級時，這份必須完全一樣。
 * 2. 結構快照（snapshots/*.jsonl）：物件樹裡每個節點的路徑與本地座標，給協作時用「角色＋路徑」指稱零件。
 *    重構會改變它，屬於正常現象。
 *
 * 執行：npm run test:characters
 * 只重構、外觀不該變（例如插入手肘）：UPDATE_SNAPSHOTS=structure npm run test:characters
 *   → 只更新結構快照，世界空間快照照樣比對，外觀有變就會失敗。
 * 刻意改外觀（例如改服裝顏色）：UPDATE_SNAPSHOTS=1 npm run test:characters
 *   → 兩種都更新，差異會逐行出現在 PR。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CHARACTERS, FORMAT } from './build.mjs';

const DIR = new URL('./snapshots/', import.meta.url);
const WORLD = new URL('./world/', DIR);
const MODE = process.env.UPDATE_SNAPSHOTS;
const name = id => `${id.replace(/#/g, '--').replace(/[^\w.-]/g, '_')}.jsonl`;
const structureFile = id => new URL(name(id), DIR);
const worldFile = id => new URL(name(id), WORLD);
const structureLines = c => c.parts.map(p => JSON.stringify(p));
const write = (url, lines) => fs.writeFileSync(url, lines.join('\n') + '\n');
const read = url => fs.readFileSync(url, 'utf8').trimEnd().split('\n');

if (MODE === '1' || MODE === 'structure') {
  for (const f of fs.existsSync(DIR) ? fs.readdirSync(DIR) : []) if (f.endsWith('.jsonl')) fs.rmSync(new URL(f, DIR));
  fs.mkdirSync(WORLD, { recursive: true });
  for (const c of CHARACTERS) write(structureFile(c.id), structureLines(c));
  if (MODE === '1') {
    for (const f of fs.readdirSync(WORLD)) fs.rmSync(new URL(f, WORLD));
    for (const c of CHARACTERS) write(worldFile(c.id), c.world);
  }
  const index = CHARACTERS.map(({ id, worldFingerprint, fingerprint, meshes, visibleMeshes, outlines, colors }) =>
    ({ id, worldFingerprint, fingerprint, meshes, visibleMeshes, outlines, colors }));
  fs.writeFileSync(new URL('index.json', DIR), JSON.stringify({ format: FORMAT, characters: index }, null, 1) + '\n');
}

function firstDiffs(want, got, label) {
  const diffs = [];
  for (let i = 0; i < Math.max(want.length, got.length) && diffs.length < 5; i++) {
    if (want[i] !== got[i]) diffs.push(`第 ${i + 1} ${label}\n  快照：${want[i] ?? '（沒有）'}\n  現在：${got[i] ?? '（沒有）'}`);
  }
  return diffs.join('\n');
}

test('每個角色都有快照，而且沒有多出或少掉角色', () => {
  const { format, characters: index } = JSON.parse(fs.readFileSync(new URL('index.json', DIR), 'utf8'));
  assert.equal(format, FORMAT, '快照格式版本和程式不同；請用 UPDATE_SNAPSHOTS=1 重新產生');
  assert.deepEqual(CHARACTERS.map(c => c.id), index.map(c => c.id), '角色名單和快照不同；新增或移除角色後請用 UPDATE_SNAPSHOTS=1 更新');
});

for (const c of CHARACTERS) {
  test(`外觀不變（世界空間）：${c.id}`, () => {
    const want = read(worldFile(c.id)), got = c.world;
    if (want.join('\n') === got.join('\n')) return;
    assert.fail(`${c.id} 看得到的零件和快照不同（${want.length} → ${got.length} 個）：\n${firstDiffs(want, got, '個零件（依內容排序）')}\n`
      + '如果是刻意修改外觀，請用 UPDATE_SNAPSHOTS=1 更新；如果只是重構，這代表外觀被改到了，請修正程式。');
  });
  test(`結構不變：${c.id}`, () => {
    const want = read(structureFile(c.id)), got = structureLines(c);
    if (want.join('\n') === got.join('\n')) return;
    assert.fail(`${c.id} 的物件樹和快照不同（${want.length} → ${got.length} 個節點）：\n${firstDiffs(want, got, '個節點')}\n`
      + '只是重構（例如插入關節）的話，用 UPDATE_SNAPSHOTS=structure 更新；世界空間測試仍會檢查外觀。');
  });
}
