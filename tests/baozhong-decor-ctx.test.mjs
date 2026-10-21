// Claude T060：正式 ctx（decor-ctx.js）與 GPT 測試替身語意一致、形狀材質有共用。
// Grok T065 v2：比對 B47 替身時關掉主招牌移位（relocateMainSign:false）；另加一項確認預設會移位（A32 四 (c)）。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { createDecorCtx, _resetDecorCaches } from '../src/systems/baozhong/decor-ctx.js';
import { auditSource } from './baozhong-decor.test.mjs';

const mats = new Map();
const deps = {
  THREE,
  toon: (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshToonMaterial({ color: c })); return mats.get(c); },
  outlineMat: new THREE.MeshBasicMaterial({ color: '#2a2c4a', side: THREE.BackSide }),
  makeSignTexture: () => null,
};
const SRC = fs.readFileSync(new URL('../src/systems/baozhong/decor/_example.js', import.meta.url), 'utf8');
const build = new Function('ctx', SRC.replace(/^\/\/.*$/mg, '').replace('export default function build(ctx) {', '').replace(/}\s*$/, ''));

function measure(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const box = new THREE.Box3(); let tri = 0, main = 0, signs = 0;
  group.traverse((n) => {
    if (!n.isMesh) return;
    const g = n.geometry, idx = g.getIndex();
    tri += (idx ? idx.count : g.attributes.position.count) / 3;
    if (n.material !== deps.outlineMat) main++;
    if (n.userData.bz26Sign) signs++;
    const m = new THREE.Matrix4().multiplyMatrices(inv, n.matrixWorld), v = new THREE.Vector3(), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m));
  });
  return { tri, main, signs, min: box.min.toArray(), max: box.max.toArray() };
}

test('GPT 預檢工具判定範例檔通過', () => {
  const r = auditSource(SRC, '_example.js');
  assert.equal(r.status, 'pass', JSON.stringify(r.issues));
});

test('正式 ctx 與測試替身：零件、三角形、文字牌、邊界一致', () => {
  _resetDecorCaches();
  const ref = auditSource(SRC, '_example.js').metrics;
  const g = new THREE.Group(); g.position.set(-27, 0, -71.96); g.rotation.y = -0.1781;
  build(createDecorCtx({ ...deps, relocateMainSign: false }, g, '#7b1fa2'));
  const m = measure(g);
  assert.equal(m.main, ref.mainParts);
  assert.equal(m.tri, ref.triangles);
  assert.equal(m.signs, ref.signs);
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(m.min[i] - ref.bounds.min[i]) < 1e-6, `min[${i}] ${m.min[i]} vs ${ref.bounds.min[i]}`);
    assert.ok(Math.abs(m.max[i] - ref.bounds.max[i]) < 1e-6, `max[${i}] ${m.max[i]} vs ${ref.bounds.max[i]}`);
  }
});

test('40 頂共用同一份形狀與材質，不因帳篷數增加', () => {
  _resetDecorCaches();
  const a = new THREE.Group(), b = new THREE.Group();
  build(createDecorCtx(deps, a, '#7b1fa2')); build(createDecorCtx(deps, b, '#7b1fa2'));
  const ga = [], gb = [];
  a.traverse((n) => n.isMesh && ga.push([n.geometry, n.material]));
  b.traverse((n) => n.isMesh && gb.push([n.geometry, n.material]));
  assert.equal(ga.length, gb.length);
  ga.forEach(([geo, mat], i) => { assert.equal(geo, gb[i][0]); assert.equal(mat, gb[i][1]); });
});

test('ctx 凍結、out:true 等於 0.03、box 描邊依實際尺寸', () => {
  const g = new THREE.Group(); const ctx = createDecorCtx(deps, g, '#123456');
  assert.ok(Object.isFrozen(ctx));
  const m = ctx.box(0.5, 0.2, 0.1, '#ffffff', 0, 0.1, 0, { out: true });
  const o = m.children[0];
  assert.ok(Math.abs(o.scale.x - (1 + 0.06 / 0.5)) < 1e-6 && Math.abs(o.scale.z - (1 + 0.06 / 0.1)) < 1e-6);
  assert.equal(ctx.mat('#ffffff'), m.material);
});

test('update 只切 visible，不新增物件', () => {
  const g = new THREE.Group(); const res = build(createDecorCtx(deps, g, '#123456'));
  const before = []; g.traverse((n) => before.push(n));
  for (let i = 0; i < 120; i++) res.update(1 / 60);
  const after = []; g.traverse((n) => after.push(n));
  assert.deepEqual(after, before);
});

test('v2：預設把 (0,3.25,0) 主招牌移到 (0,2.22,1.50)，其他東西位置不變', () => {
  _resetDecorCaches();
  const a = new THREE.Group(), b = new THREE.Group();
  build(createDecorCtx(deps, a, '#123456')); build(createDecorCtx({ ...deps, relocateMainSign: false }, b, '#123456'));
  const main = a.children.filter((n) => n.userData.bz26MainSign);
  assert.equal(main.length, 1);
  assert.deepEqual(main[0].position.toArray(), [0, 2.22, 1.5]);
  assert.equal(main[0].rotation.y, 0);
  a.children.forEach((n, i) => { if (!n.userData.bz26MainSign) assert.deepEqual(n.position.toArray(), b.children[i].position.toArray()); });
  assert.deepEqual(b.children.find((n) => n.userData.bz26Sign).position.toArray(), [0, 3.25, 0]);
});
