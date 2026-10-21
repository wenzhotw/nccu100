import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { buildTents } from '../src/systems/baozhong/tents.js';
import { TENT, colliderClearance, collidersOf } from '../src/systems/baozhong/tents-logic.js';
import { LANDMARK_SAMPLE_IDS, LANDMARK_PREVIEW_IDS, buildDepartmentLandmark, departmentLandmarkColliders } from '../src/systems/baozhong/department-landmarks.js';
const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const layout = read('../src/systems/baozhong/layout.json');
const content = read('../src/content/baozhong.json');
const deps = { toon: c => new THREE.MeshToonMaterial({ color: c }), OUT: new THREE.MeshBasicMaterial({ color: '#2a2c4a', side: THREE.BackSide }) };
const world = (t, x, z) => ({ x: t.x + x * Math.cos(t.rotY) + z * Math.sin(t.rotY), z: t.z - x * Math.sin(t.rotY) + z * Math.cos(t.rotY) });
const build = landmarkPreview => buildTents(layout, content.colleges, { content, colliders: [], landmarkPreview });
const samples = LANDMARK_SAMPLE_IDS.map(id => ({ id, t: layout.tents.find(t => t.id === id), model: buildDepartmentLandmark(new THREE.Group(), id, deps) }));

test('Preview is opt-in and changes only seven samples, preserving names, roof, counter and four poles', () => {
  const before = build(false), after = build(true);
  assert.equal(new Set(samples.map(({ id }) => content.booths.find(d => d.id === id).college)).size, 6);
  for (const [id, t] of after.tents) {
    const old = before.tents.get(id), sample = LANDMARK_PREVIEW_IDS.includes(id);
    assert.deepEqual(t.info, old.info); assert.deepEqual(t.layout, old.layout);
    for (const name of ['canopy', 'counter', 'frame']) assert.equal(t.parts[name].length, old.parts[name].length);
    assert.equal(t.parts.walls.length, sample ? 0 : 3);
    assert.equal(t.parts.frame.filter(p => p.geometry.type === 'CylinderGeometry').length, 4);
    assert.equal(!!t.parts.landmark, sample);
    if (!sample) assert.equal(t.group.children.length, old.group.children.length);
  }
});

test('Six real ctx models are floor-supported, taller than canopy, ahead of roof and clear of both signs', () => {
  for (const { id, model } of samples) {
    const b = model.bounds;
    assert.ok(Math.abs(b.min.y) < 1e-6, id);
    assert.ok(b.max.y >= 3.1 && b.max.y <= 4.1, id);
    assert.ok(b.min.x >= -1.45 && b.max.x <= 1.45, id);
    assert.ok(b.min.z > 1.5 && b.max.z < 2.2, id);
    for (const p of model.parts) {
      assert.equal(p.material.type, 'MeshToonMaterial');
      assert.equal(p.castShadow, false);
      const pb = p.geometry.boundingBox.clone().applyMatrix4(p.matrix);
      for (const [sy, sh, sw] of [[TENT.official.y, TENT.official.h, TENT.official.w], [2.22, 0.3, 1]]) {
        assert.ok(pb.max.x < -sw / 2 || pb.min.x > sw / 2 || pb.min.y > sy + sh / 2 || pb.max.y < sy - sh / 2, `${id}: sign`);
      }
    }
  }
});

test('True layout collision keeps center approach, sides, back and every neighboring booth clear', () => {
  for (const { id, t, model } of samples) {
    const cs = departmentLandmarkColliders(t, model);
    const anchor = { x: t.anchor[0], z: t.anchor[1] };
    assert.ok(cs.every(c => colliderClearance(anchor, c) >= 0.4), `${id} anchor`);
    for (let v = 0; v <= 3; v += 0.04) {
      for (const [x, z] of [[v, 0], [-v, 0], [0, -v], [0, 1.71 + v]]) {
        assert.ok(cs.every(c => colliderClearance(world(t, x, z), c) >= 0.4 - 1e-6), `${id}: ${x},${z}`);
      }
    }
    for (const other of layout.tents.filter(n => n.id !== id)) {
      const neighbor = collidersOf(other);
      for (const b of model.boxes) for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) {
        assert.ok(neighbor.every(c => colliderClearance(world(t, x, z), c) > 0.8), `${id} vs ${other.id}`);
      }
    }
  }
});

test('FOV 55 perspective at 20m retains substantial silhouette, with geometry shared across builds', () => {
  const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.25, 1200);
  camera.position.set(0, 1.6, 21.82); camera.lookAt(0, 1.6, 1.82); camera.updateMatrixWorld();
  for (const { id, model } of samples) {
    const b = model.bounds;
    const lower = new THREE.Vector3(b.min.x, b.min.y, 1.82).project(camera);
    const upper = new THREE.Vector3(b.max.x, b.max.y, 1.82).project(camera);
    const pxH = (upper.y - lower.y) * 720 / 2, pxW = (upper.x - lower.x) * 1280 / 2;
    assert.ok(pxH > 100 && pxW > 10, `${id}: ${pxW}x${pxH}`);
    const again = buildDepartmentLandmark(new THREE.Group(), id, deps);
    assert.equal(model.parts[0].geometry, again.parts[0].geometry);
    let triangles = 0;
    model.root.traverse(p => { if (p.isMesh) triangles += (p.geometry.index?.count ?? p.geometry.attributes.position.count) / 3; });
    assert.ok(triangles < 2500, `${id}: ${triangles}`);
  }
});
