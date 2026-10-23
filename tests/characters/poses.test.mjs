import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { POSE_IDS, POSE_JOINTS, poseList, capturePoseSnapshots } from './poses.mjs';
function fixture() {
  const root = new THREE.Group(), P = {};
  root.position.set(5, 2, -7);
  for (const [i, key] of POSE_JOINTS.entries()) {
    const g = new THREE.Group(); g.position.set(i, i / 10, 0);
    g.rotation.set(.1 + i / 10, -.2, .3, 'ZYX'); root.add(g); P[key] = g;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#123456' }));
    mesh.visible = i % 2 === 0; g.add(mesh);
  }
  root.updateMatrixWorld(true);
  return { root, P };
}
const rotations = P => POSE_JOINTS.map(k => P[k].rotation.toArray());
function nonRotationState(root) {
  const out = [];
  root.traverse(o => out.push({ uuid: o.uuid, parent: o.parent?.uuid, position: o.position.toArray(), scale: o.scale.toArray(), visible: o.visible, geometry: o.geometry?.uuid, material: o.material?.uuid }));
  return out;
}
test('exact four IDs, six complete finite absolute poses and fresh immutable output', () => {
  assert.deepEqual(POSE_IDS, ['chiang', 'player', 'bz26-D12', 'bz26-D23']);
  for (const id of POSE_IDS) {
    const list = poseList(id); assert.equal(list.length, 6);
    assert.deepEqual(list.map(p => p.name), ['walk-a', 'walk-b', 'raise-hand', 'wave', 'sit', 'panic']);
    assert.deepEqual(list, poseList(id)); assert.notEqual(list, poseList(id));
    for (const pose of list) {
      assert.deepEqual(Object.keys(pose.rotations), POSE_JOINTS);
      assert.equal(pose.order, 'XYZ');
      for (const r of Object.values(pose.rotations)) { assert.equal(r.length, 3); assert.ok(r.every(Number.isFinite)); assert.ok(Object.isFrozen(r)); }
    }
  }
  assert.throws(() => poseList('player#eagle'), /Unsupported/);
  assert.throws(() => poseList('cop'), /Unsupported/);
});
for (const id of POSE_IDS) test(`${id}: exact pose applied, restored, repeatable and nonrotation state untouched`, () => {
  const { root, P } = fixture(); const before = rotations(P); const other = nonRotationState(root);
  let calls = 0;
  const serializer = () => {
    const expected = poseList(id)[calls++ % 6];
    for (const key of POSE_JOINTS) assert.deepEqual(P[key].rotation.toArray(), [...expected.rotations[key], 'XYZ']);
    return [JSON.stringify(rotations(P))];
  };
  const a = capturePoseSnapshots(id, root, P, serializer);
  assert.deepEqual(rotations(P), before); assert.deepEqual(nonRotationState(root), other);
  const b = capturePoseSnapshots(id, root, P, serializer);
  assert.deepEqual(a, b); assert.equal(calls, 12); assert.deepEqual(rotations(P), before);
  assert.deepEqual(nonRotationState(root), other);
});
test('serializer failure on third pose restores all five Euler values/orders', () => {
  const { root, P } = fixture(), before = rotations(P); let calls = 0;
  assert.throws(() => capturePoseSnapshots('chiang', root, P, () => {
    if (++calls === 3) throw new Error('capture failed'); return [];
  }), /capture failed/);
  assert.deepEqual(rotations(P), before);
});
test('rejects asynchronous/wrong serializer shape and restores rotations', () => {
  const { root, P } = fixture(), before = rotations(P);
  assert.throws(() => capturePoseSnapshots('chiang', root, P, () => ({ world: [] })), /string\[\]/);
  assert.deepEqual(rotations(P), before);
  assert.throws(() => capturePoseSnapshots('chiang', root, P, () => Promise.resolve([])), /string\[\]/);
  assert.deepEqual(rotations(P), before);
});
test('missing, aliased, nonfinite or out-of-root joints fail before mutation', () => {
  const { root, P } = fixture(), before = rotations(P);
  for (const invalid of [{ ...P, head: null }, { ...P, head: P.shL }, { ...P, head: new THREE.Group() }]) {
    assert.throws(() => capturePoseSnapshots('chiang', root, invalid, () => []));
    assert.deepEqual(rotations(P), before);
  }
  P.head.rotation.x = NaN;
  assert.throws(() => capturePoseSnapshots('chiang', root, P, () => []), /Nonfinite/);
});
test('source-derived constants and opposing walk phases remain explicit', () => {
  const npc = poseList('chiang'), hero = poseList('player');
  assert.equal(npc[0].rotations.shL[2], -.12); assert.equal(hero[0].rotations.shL[2], -.15);
  assert.equal(hero[0].rotations.head[0], -.05);
  assert.deepEqual(npc[2].rotations.shR, [-.15, 0, 2.55]);
  assert.deepEqual(npc[3].rotations.shR, [-.3, 0, 2.3]);
  assert.deepEqual(npc[4].rotations.hipL, [-1.5, 0, .08]);
  assert.deepEqual(npc[5].rotations.shL, [0, 0, -2.5]);
  for (const key of ['shL', 'shR', 'hipL', 'hipR']) assert.equal(npc[0].rotations[key][0], -npc[1].rotations[key][0]);
});
