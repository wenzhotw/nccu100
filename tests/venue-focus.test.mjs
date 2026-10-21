import test from 'node:test';
import assert from 'node:assert/strict';
import { createVenueFocus, isSiweiFoliage } from '../src/systems/baozhong/venue-focus.js';
function fixture(enabled = true) {
  const tree = (x, z, visible = true) => ({ x, z, visible, collider: { c: true, x, z, r: .3 }, setVisible(on) { this.visible = on; }, isVisible() { return this.visible; } });
  const foliage = [tree(-60, -74.2), tree(-66, -75.28, false), tree(10, -5), tree(10.5, -24.5)];
  const npc = (id, room = null, visible = true) => ({ id, room, g: { visible }, spot: { id } });
  const npcs = [npc('campus'), npc(undefined), npc('indoor', 'siwei-hall'), npc('bz26-host'), npc('bz26-D26'), npc('hidden', null, false)];
  const foreign = { c: true, x: -60, z: -74.2, r: .2 };
  const colliders = [foreign, ...foliage.map(f => f.collider)];
  const spots = [{ id: 'door' }, ...npcs.map(n => n.spot)];
  const state = { near: npcs[0].spot, talkFocus: { x: 1, z: 1 } };
  return { foliage, npcs, spots, colliders, state, foreign, api: createVenueFocus({ foliage, npcs, spots, colliders, state, enabled }) };
}
test('Preview off leaves all data, original visibility and near untouched', () => {
  const f = fixture(false), before = JSON.stringify(f, (k, v) => k === 'api' ? undefined : v);
  f.api.setActive(true); f.api.setActive(false);
  assert.equal(JSON.stringify(f, (k, v) => k === 'api' ? undefined : v), before);
});
test('Activity hides only Siwei trees and their exact collision handles, not unrelated same-position collider', () => {
  const f = fixture(); f.api.setActive(true);
  assert.deepEqual(f.foliage.map(t => t.visible), [false, false, true, true]);
  assert.equal(f.colliders.includes(f.foreign), true);
  assert.equal(f.colliders.includes(f.foliage[0].collider), false);
  assert.deepEqual(f.api.counts(), { trees: 2, treeColliders: 2, npcs: 3, spots: 3 });
  assert.equal(isSiweiFoliage({ x: 100, z: -42.2 }), false);
});
test('Outdoor original NPC rendering, update iteration, interaction and stale near are removed together', () => {
  const f = fixture(); const original = f.npcs.slice(); f.api.setActive(true);
  assert.deepEqual(f.npcs.map(n => n.id), ['indoor', 'bz26-host', 'bz26-D26']);
  for (const n of original.filter(n => !n.room && !String(n.id).startsWith('bz26-'))) {
    assert.equal(n.g.visible, false); assert.equal(f.spots.includes(n.spot), false);
  }
  assert.equal(f.state.near, null); assert.equal(f.state.talkFocus, null);
});
test('Exit and repeated entry restore array identity, objects, order and prior hidden states without duplicates', () => {
  const f = fixture(), arrays = [f.npcs, f.colliders, f.spots], before = arrays.map(a => a.slice());
  for (let i = 0; i < 3; i++) {
    f.api.setActive(true); f.api.setActive(true); f.api.setActive(false); f.api.setActive(false);
    arrays.forEach((a, i) => assert.deepEqual(a, before[i]));
    assert.deepEqual(f.foliage.map(t => t.visible), [true, false, true, true]);
    assert.deepEqual(f.npcs.map(n => n.g.visible), [true, true, true, true, true, false]);
  }
  assert.deepEqual([f.npcs, f.colliders, f.spots], arrays);
});
test('Objects added during activity survive restoration and unrelated near remains untouched', () => {
  const f = fixture(); f.state.near = f.npcs[4].spot; const near = f.state.near;
  f.api.setActive(true); const newcomer = { id: 'new', g: { visible: true } }; f.npcs.push(newcomer);
  f.api.setActive(false); assert.equal(f.npcs.at(-1), newcomer); assert.equal(f.state.near, near);
});
