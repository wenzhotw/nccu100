// scripts/baozhong-decor-loader.test.mjs（Grok，T065）：decor-loader-core 回歸測試（GPT D189 兩個缺陷＋出錯退回＋update）。
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDecorLoader } from '../src/systems/baozhong/decor-loader-core.js';

const mk = (files, warns = []) => createDecorLoader({ THREE, files, createCtx: (root) => ({ group: root, box: () => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)); root.add(m); return m; } }), warn: (...a) => warns.push(a) });

test('缺陷一：載入中卸載，檔案晚到也不掛上', async () => {
  let resolve; const L = mk({ './decor/D26.js': () => new Promise((r) => { resolve = r; }) });
  const tent = new THREE.Group();
  const p = L.mountDecor('D26', tent, '#123456');
  L.unmountAllDecor();
  resolve({ default: (ctx) => { ctx.box(); return {}; } });
  assert.equal(await p, null);
  assert.equal(tent.children.length, 0); assert.equal(L.live.length, 0); assert.equal(L.pending.size, 0);
});

test('缺陷二：卸載時還原 hideCanopy／hideCounter 藏起的零件', async () => {
  const L = mk({ './decor/D26.js': async () => ({ default: () => ({ hideCanopy: true, hideCounter: true }) }) });
  const tent = new THREE.Group(), a = new THREE.Mesh(), b = new THREE.Mesh();
  await L.mountDecor('D26', tent, '#123456', { canopy: [a], counter: [b] });
  assert.deepEqual([a.visible, b.visible, a.userData.bz26Hidden], [false, false, true]);
  L.unmountAllDecor();
  assert.deepEqual([a.visible, b.visible, a.userData.bz26Hidden, tent.children.length, L.live.length], [true, true, undefined, 0, 0]);
});

test('重入不重複：掛上→卸載→再掛上，帳篷底下只有一份佈景', async () => {
  const L = mk({ './decor/D26.js': async () => ({ default: (ctx) => { ctx.box(); return {}; } }) });
  const tent = new THREE.Group();
  for (let i = 0; i < 3; i++) { L.unmountAllDecor(); await L.mountDecor('D26', tent, '#1a237e'); }
  assert.equal(tent.children.length, 1); assert.equal(L.live.length, 1);
});

test('單檔出錯只退回原帳篷；update 出錯只停那一頂；看不到的帳篷不跑 update', async () => {
  const warns = [];
  let n = 0;
  const L = mk({ './decor/A.js': async () => ({ default: (ctx) => { ctx.box(); throw new Error('壞檔'); } }),
    './decor/B.js': async () => ({ default: () => ({ update() { n++; if (n === 2) throw new Error('壞 update'); } }) }) }, warns);
  const ta = new THREE.Group(), tb = new THREE.Group();
  assert.equal(await L.mountDecor('A', ta, '#000000'), null); assert.equal(ta.children.length, 0);
  assert.equal(await L.mountDecor('X', ta, '#000000'), null);
  await L.mountDecor('B', tb, '#000000');
  L.updateDecor(0.016); L.updateDecor(0.016); L.updateDecor(0.016);
  assert.equal(n, 2); assert.equal(warns.length, 2);
  tb.visible = false; L.live[0].update = () => { n += 100; }; L.updateDecor(0.016); assert.equal(n, 2);
});
