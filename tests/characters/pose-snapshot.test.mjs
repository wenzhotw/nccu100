/** 固定姿勢的世界空間回歸測試，不受 UPDATE_SNAPSHOTS 影響。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CHARACTERS, FORMAT, POSE_SNAPSHOTS, serialize, worldList } from './build.mjs';
import { POSE_IDS, POSE_JOINTS, poseList, capturePoseSnapshots } from './poses.mjs';
import { NPCS } from '../../src/actors/npc.js';

const DIR = new URL('./snapshots/poses/', import.meta.url);
const name = ({ id, pose }) => `${id}--${pose}.jsonl`;
const read = file => fs.readFileSync(new URL(file, DIR), 'utf8').trimEnd().split('\n');
const inventory = world => world.map(line => {
  const { m, ...appearance } = JSON.parse(line);
  assert.equal(m.length, 16);
  assert.ok(m.every(Number.isFinite));
  return JSON.stringify(appearance);
}).sort();

test('四個真實角色各六個姿勢，快照清單完整且沒有多餘檔案', () => {
  const expected = POSE_IDS.flatMap(id => poseList(id).map(({ name: pose }) => `${id}/${pose}`)).sort();
  assert.equal(POSE_SNAPSHOTS.length, 24);
  assert.deepEqual(POSE_SNAPSHOTS.map(c => `${c.id}/${c.pose}`).sort(), expected);
  const index = JSON.parse(fs.readFileSync(new URL('index.json', DIR), 'utf8'));
  assert.equal(index.format, FORMAT);
  assert.equal(index.baseline, 'a40a04e03e618be0515e98fa51bbd41df9bd0784');
  assert.deepEqual(index.poses, POSE_SNAPSHOTS.map(({ id, pose, world }) => ({ id, pose, parts: world.length })));
  assert.deepEqual(fs.readdirSync(DIR).sort(), ['index.json', ...POSE_SNAPSHOTS.map(name)].sort());
});

for (const c of POSE_SNAPSHOTS) test(`固定姿勢外觀不變：${c.id}/${c.pose}`, () => {
  assert.ok(c.world.length > 0);
  assert.deepEqual(c.world, [...c.world].sort());
  assert.deepEqual(c.world, read(name(c)), `${c.id}/${c.pose} 外觀改變；請檢查關節或掛載，勿更新基準掩蓋差異。`);
  const neutral = CHARACTERS.find(n => n.id === c.id);
  assert.deepEqual(inventory(c.world), inventory(neutral.world), '姿勢不得新增、隱藏、變形或換色任何零件');
  assert.notDeepEqual(c.world, neutral.world, '姿勢必須確實作用於模型');
});

for (const id of POSE_IDS) test(`六個姿勢的世界空間結果不同：${id}`, () => {
  const worlds = POSE_SNAPSHOTS.filter(c => c.id === id).map(c => JSON.stringify(c.world));
  assert.equal(new Set(worlds).size, 6);
});

test('真實 NPC 重複擷取及中途失敗後，完整結構與世界空間皆復原', () => {
  const { g: root, P } = NPCS.find(n => n.id === 'chiang');
  const parts = serialize(root), world = worldList(root);
  const rotations = () => POSE_JOINTS.map(key => P[key].rotation.toArray());
  const before = rotations();
  const restored = () => {
    assert.deepEqual(rotations(), before);
    assert.deepEqual(serialize(root), parts);
    assert.deepEqual(worldList(root), world);
  };
  assert.deepEqual(capturePoseSnapshots('chiang', root, P, worldList), POSE_SNAPSHOTS.filter(c => c.id === 'chiang'));
  restored();
  let calls = 0;
  assert.throws(() => capturePoseSnapshots('chiang', root, P, r => {
    if (++calls === 3) throw new Error('intentional capture failure');
    return worldList(r);
  }), /intentional capture failure/);
  assert.equal(calls, 3);
  restored();
});
