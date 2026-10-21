import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
// 正式模組只替換瀏覽器 scene 與 OUT 注入，不重寫預製物件邏輯。
const scene = new THREE.Scene(), out = new THREE.MeshBasicMaterial();
globalThis.__prefabVenueTest = { scene, out };
const source = fs.readFileSync(new URL('../src/world/prefabs/index.js', import.meta.url), 'utf8')
  .replace("from 'three'", `from '${import.meta.resolve('three')}'`)
  .replace("import { scene } from '../../core/engine.js';", 'const { scene } = globalThis.__prefabVenueTest;')
  .replace("import { OUT } from '../../render/kit.js';", 'const OUT = globalThis.__prefabVenueTest.out;');
const { asPrefab, flushPrefabs, updatePrefabs } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const geo = new THREE.BoxGeometry(1, 1, 1), mat = new THREE.MeshBasicMaterial();
let crown;
const hidden = asPrefab(() => { crown = new THREE.Group(); crown.position.set(2, 3, 4); crown.add(new THREE.Mesh(geo, mat)); scene.add(crown); }, { sway: () => crown });
const normal = asPrefab(() => { const m = new THREE.Mesh(geo, mat); m.position.set(5, 3, 4); scene.add(m); });
hidden.setVisible(false); flushPrefabs();
const batch = scene.children.find(m => m.isInstancedMesh), matrix = new THREE.Matrix4();
const at = i => { batch.getMatrixAt(i, matrix); return matrix.clone(); };
test('One prefab hidden before flush does not hide its shared batch neighbor', () => {
  assert.equal(batch.count, 2); assert.equal(at(0).getMaxScaleOnAxis(), 0); assert.equal(at(1).getMaxScaleOnAxis(), 1);
});
test('Sway cannot resurrect hidden instances, and visibility restores exact matrix', () => {
  updatePrefabs(); assert.equal(at(0).getMaxScaleOnAxis(), 0);
  hidden.setVisible(true); assert.deepEqual(at(0).elements, new THREE.Matrix4().makeTranslation(2, 3, 4).elements);
  for (let i = 0; i < 3; i++) { hidden.setVisible(false); updatePrefabs(); hidden.setVisible(true); }
  assert.equal(at(0).getMaxScaleOnAxis(), 1); assert.equal(at(1).getMaxScaleOnAxis(), 1);
  assert.equal(hidden.isVisible(), true); assert.equal(normal.isVisible(), true);
});
test('Late non-instanced prefab visibility preserves a pre-hidden root', () => {
  let root;
  const late = asPrefab(() => { root = new THREE.Group(); root.visible = false; scene.add(root); });
  late.setVisible(false); late.setVisible(true); assert.equal(root.visible, false);
});
