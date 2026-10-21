import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTents } from '../src/systems/baozhong/tents.js';
import { OPEN_CANOPY_D26 as G, openCanopyColliders } from '../src/systems/baozhong/open-canopy-d26.js';
import { TENT, collidersOf, colliderClearance } from '../src/systems/baozhong/tents-logic.js';
const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const layout = read('../src/systems/baozhong/layout.json');
const content = read('../src/content/baozhong.json');
const d26 = layout.tents.find(t => t.id === 'D26');
function build(open = true, ground = 0) {
  const foreign = { x0: 100, x1: 101, z0: 100, z1: 101 };
  const colliders = [foreign];
  const api = buildTents(layout, content.colleges, { content, colliders, heightAt: () => ground, openCanopyD26: open });
  return { api, colliders, foreign };
}
const world = (t, x, z, y = 0) => ({ x: t.x + x * Math.cos(t.rotY) + z * Math.sin(t.rotY), y, z: t.z - x * Math.sin(t.rotY) + z * Math.cos(t.rotY) });

test('D26 opt-in removes three curtains only, keeps four canopy posts, roof, counter and official name', () => {
  const old = build(false).api, api = build().api;
  assert.equal(api.tents.size, 40);
  for (const [id, tent] of api.tents) {
    const original = old.tents.get(id);
    assert.deepEqual(tent.info, original.info);
    assert.deepEqual(tent.layout, original.layout);
    assert.equal(tent.parts.frame.length, original.parts.frame.length);
    assert.equal(tent.parts.counter.length, original.parts.counter.length);
    assert.equal(tent.parts.canopy.length, original.parts.canopy.length);
    assert.equal(tent.parts.walls.length, id === 'D26' ? 0 : 3);
    assert.equal(tent.parts.frame.filter(p => p.geometry.type === 'CylinderGeometry').length, 4);
    if (id !== 'D26') assert.equal(tent.group.children.length, original.group.children.length);
  }
  assert.equal(api.tents.get('D26').info.zh, '日本語文學系');
  assert.equal(old.tents.get('D26').parts.landmark, undefined);
  assert.equal(api.colliders.length, 39 * 8 + 7);
});

test('D26 ground torii has two full-height posts and clear sign/counter envelope', () => {
  const tent = build().api.tents.get('D26');
  const parts = tent.parts.landmark;
  assert.equal(parts.filter(p => p.userData.bz26ToriiPost).length, 2);
  for (const p of parts) {
    p.updateMatrix(); p.geometry.computeBoundingBox();
    const b = p.geometry.boundingBox.clone().applyMatrix4(p.matrix);
    assert.ok(b.min.x >= -TENT.half && b.max.x <= TENT.half);
    if (p.userData.bz26ToriiPost) {
      assert.ok(b.min.y <= 0.001 && b.min.y >= -0.01);
      assert.ok(b.max.y > 3);
      assert.ok(b.max.x < TENT.table.x0 || b.min.x > TENT.table.x1);
      assert.ok(b.max.x < -TENT.official.w / 2 || b.min.x > TENT.official.w / 2);
    } else assert.ok(b.min.y > TENT.official.y + TENT.official.h / 2 + 0.3);
    assert.equal(p.children.length, 1);
    assert.equal(p.material.type, 'MeshToonMaterial');
  }
  assert.ok(G.beamY - G.beamHeight / 2 > 2.3);
});

test('Open side/back corridors and central approach remain walkable for radius 0.4', () => {
  for (const rotY of [d26.rotY, 0, Math.PI / 2, Math.PI]) {
    const t = { ...d26, rotY }, cs = openCanopyColliders(t);
    for (let v = 0; v <= 2.8; v += 0.05) {
      for (const [x, z] of [[v, 0], [-v, 0], [0, -v], [0, 1.72 + v]]) {
        assert.ok(cs.every(c => colliderClearance(world(t, x, z), c) >= 0.4 - 1e-6), `${rotY}: ${x},${z}`);
      }
    }
    for (const x of [-TENT.pole, TENT.pole]) for (const z of [-TENT.pole, TENT.pole]) {
      assert.ok(cs.some(c => colliderClearance(world(t, x, z), c) === 0));
    }
    assert.ok(cs.some(c => colliderClearance(world(t, 0, 1), c) === 0));
    for (const x of [-G.postX, G.postX]) assert.ok(cs.some(c => colliderClearance(world(t, x, G.z), c) === 0));
  }
  const cs = openCanopyColliders(d26);
  const anchor = { x: d26.anchor[0], y: 0, z: d26.anchor[1] };
  assert.ok(cs.every(c => colliderClearance(anchor, c) > 0.4));
  for (const t of layout.tents.filter(t => t.id !== 'D26')) {
    const neighbor = collidersOf(t);
    for (const x of [-G.postX, G.postX]) assert.ok(neighbor.every(c => colliderClearance(world(d26, x, G.z), c) > 0.8));
  }
});

test('Activation, recovery and removal use only real structure, preserving external colliders', () => {
  const { api, colliders, foreign } = build(true, 0.2);
  api.setActive(true); api.setActive(true);
  assert.equal(colliders.length, api.colliders.length + 1);
  const p = world(d26, 0, -1.455, 0.2);
  const before = { ...p };
  assert.equal(api.update(p, { grounded: true }).status, 'clear');
  assert.deepEqual(p, before);
  assert.equal(api.isActive(), true);
  api.refreshSigns('D26');
  api.setActive(false); api.setActive(false);
  assert.deepEqual(colliders, [foreign]);
  assert.equal(api.group.visible, false);
  const cs = openCanopyColliders(d26, 0.2);
  assert.equal(cs.at(-1).top, TENT.table.h + 0.2);
});
