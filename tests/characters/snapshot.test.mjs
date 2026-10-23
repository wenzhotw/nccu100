/**
 * 角色外觀快照測試：把每個角色的零件清單和存在 tests/characters/snapshots/ 的版本比對。
 *
 * 執行：npm run test:characters
 * 刻意改了外觀（例如新增手肘）之後更新快照：UPDATE_SNAPSHOTS=1 npm run test:characters
 * 更新後的差異會出現在 PR 裡，審查者可以逐行看到哪個角色的哪個零件改了。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CHARACTERS } from './build.mjs';

const DIR = new URL('./snapshots/', import.meta.url);
const UPDATE = process.env.UPDATE_SNAPSHOTS === '1';
const file = id => new URL(`${id.replace(/#/g, '--').replace(/[^\w.-]/g, '_')}.jsonl`, DIR);
const lines = c => c.parts.map(p => JSON.stringify(p));

if (UPDATE) {
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(DIR, { recursive: true });
  for (const c of CHARACTERS) fs.writeFileSync(file(c.id), lines(c).join('\n') + '\n');
  const index = CHARACTERS.map(({ id, fingerprint, meshes, visibleMeshes, outlines, colors }) => ({ id, fingerprint, meshes, visibleMeshes, outlines, colors }));
  fs.writeFileSync(new URL('index.json', DIR), JSON.stringify(index, null, 1) + '\n');
}

test('每個角色都有快照，而且沒有多出或少掉角色', () => {
  const index = JSON.parse(fs.readFileSync(new URL('index.json', DIR), 'utf8'));
  assert.deepEqual(CHARACTERS.map(c => c.id), index.map(c => c.id), '角色名單和快照不同；新增或移除角色後請用 UPDATE_SNAPSHOTS=1 更新');
});

for (const c of CHARACTERS) {
  test(`外觀不變：${c.id}`, () => {
    const want = fs.readFileSync(file(c.id), 'utf8').trimEnd().split('\n');
    const got = lines(c);
    if (want.join('\n') === got.join('\n')) return;
    const diffs = [];
    for (let i = 0; i < Math.max(want.length, got.length) && diffs.length < 5; i++) {
      if (want[i] !== got[i]) diffs.push(`第 ${i + 1} 個零件\n  快照：${want[i] ?? '（沒有）'}\n  現在：${got[i] ?? '（沒有）'}`);
    }
    assert.fail(`${c.id} 的外觀和快照不同（零件數 ${want.length} → ${got.length}）：\n${diffs.join('\n')}\n若是刻意修改，請用 UPDATE_SNAPSHOTS=1 更新快照。`);
  });
}
