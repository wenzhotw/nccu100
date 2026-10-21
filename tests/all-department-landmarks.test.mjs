import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { buildTents } from '../src/systems/baozhong/tents.js';
import { SOURCE_LANDMARKS } from '../src/systems/baozhong/landmark-source-registry.js';
import { buildDepartmentLandmark, departmentLandmarkColliders, LANDMARK_PREVIEW_IDS } from '../src/systems/baozhong/department-landmarks.js';
import { colliderClearance, collidersOf } from '../src/systems/baozhong/tents-logic.js';
import { _caches } from '../src/systems/baozhong/decor-ctx.js';
const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const layout = read('../src/systems/baozhong/layout.json'), content = read('../src/content/baozhong.json');
const deps = { toon: c => new THREE.MeshToonMaterial({ color: c }), OUT: new THREE.MeshBasicMaterial({ side: THREE.BackSide }) };
const world = (t, x, z) => ({ x: t.x + x * Math.cos(t.rotY) + z * Math.sin(t.rotY), z: t.z - x * Math.sin(t.rotY) + z * Math.cos(t.rotY) });

test('All 37 IDs have opt-in large physical objects and four-sided open canopy; all three service booths remain unchanged', () => {
  assert.equal(new Set(LANDMARK_PREVIEW_IDS).size, 37);
  assert.deepEqual([...LANDMARK_PREVIEW_IDS].sort(), content.booths.map(b => b.id).sort());
  const old = buildTents(layout, content.colleges, { content, colliders: [] });
  const api = buildTents(layout, content.colleges, { content, colliders: [], landmarkPreview: true });
  for (const [id, t] of api.tents) {
    const before = old.tents.get(id), sample = LANDMARK_PREVIEW_IDS.includes(id);
    assert.equal(t.parts.walls.length, sample ? 0 : 3, id);
    assert.equal(t.parts.frame.filter(m => m.geometry.type === 'CylinderGeometry').length, 4, id);
    assert.equal(!!t.parts.landmark, sample, id);
    assert.deepEqual(t.info, before.info); assert.deepEqual(t.layout, before.layout);
    assert.equal(t.parts.counter.length, before.parts.counter.length); assert.equal(t.parts.canopy.length, before.parts.canopy.length);
  }
});

test('All 30 extracted primary objects preserve exact source fragments, safe bounds and unpolluted sign cache', () => {
  const signs = _caches.SIGN.size;
  for (const [id, spec] of Object.entries(SOURCE_LANDMARKS)) {
    if (['D02', 'D03'].includes(id)) continue; // 新原創模型由 humanities-landmarks.test.mjs 覆蓋。
    const model = buildDepartmentLandmark(new THREE.Group(), id, deps), b = model.bounds;
    assert.equal(model.sourceCount, spec.count, id);
    assert.ok(b.min.y >= -1e-7 && b.max.y > 3.1 && b.max.y < 4.2, `${id}: ${b.max.y}`);
    assert.ok(b.min.x >= -1.45 && b.max.x <= 1.45, id);
    assert.ok(b.min.z > 1.5 && b.max.z < 2.2, id);
    assert.ok(model.symbolBounds.min.y >= 2.75 - 1e-6, id);
    const inverse = model.root.matrixWorld.clone().invert(); let meshes = 0, triangles = 0;
    model.root.traverse(p => {
      if (!p.isMesh) return; meshes++; triangles += (p.geometry.index?.count ?? p.geometry.attributes.position.count) / 3;
      assert.ok(['MeshToonMaterial', 'MeshBasicMaterial'].includes(p.material.type));
      assert.equal(!!p.userData.bz26Sign, false); assert.equal(p.material.map, null);
      if (p.material === deps.OUT) return;
      p.geometry.computeBoundingBox(); const local = inverse.clone().multiply(p.matrixWorld), box = p.geometry.boundingBox.clone().applyMatrix4(local);
      assert.ok(box.max.x < -.8 || box.min.x > .8 || box.min.y > 2.4 || box.max.y < 1.5, `${id}: official sign obstruction`);
    });
    assert.ok(meshes > spec.count); assert.ok(triangles < 5000, `${id}: ${triangles}`);
  }
  assert.equal(_caches.SIGN.size, signs, 'Extraction must never create null texture entries in production sign cache');
});

test('Every new actual layout anchor, central interaction route and adjacent stall remains clear', () => {
  for (const id of Object.keys(SOURCE_LANDMARKS)) {
    const t = layout.tents.find(t => t.id === id), model = buildDepartmentLandmark(new THREE.Group(), id, deps);
    const cs = departmentLandmarkColliders(t, model);
    assert.ok(cs.every(c => colliderClearance({ x: t.anchor[0], z: t.anchor[1] }, c) >= .4), id);
    for (let v = 0; v < 3; v += .08) for (const [x, z] of [[v, 0], [-v, 0], [0, -v], [0, 1.71 + v]]) {
      assert.ok(cs.every(c => colliderClearance(world(t, x, z), c) >= .4 - 1e-6), `${id}: ${x},${z}`);
    }
    for (const n of layout.tents.filter(n => n.id !== id)) for (const b of model.boxes) {
      for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) {
        assert.ok(collidersOf(n).every(c => colliderClearance(world(t, x, z), c) > .8), `${id} / ${n.id}`);
      }
    }
  }
});
