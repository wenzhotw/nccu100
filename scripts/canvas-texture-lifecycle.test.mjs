import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

// 直接執行生產函式，僅替換 DOM 與 timer；不複製 canvasTex 實作。
function harness() {
  const source = fs.readFileSync(new URL('../src/render/kit.js', import.meta.url), 'utf8');
  const pending = new Map(); let id = 0;
  const context = vm.createContext({
    THREE,
    document: { createElement() { return { width: 0, height: 0, getContext() { return { clearRect() {} }; } }; } },
    setTimeout(fn) { pending.set(++id, fn); return id; },
    clearTimeout(key) { pending.delete(key); },
  });
  vm.runInContext(source.slice(source.indexOf('const CT='), source.indexOf('function plane(')) +
    '\nglobalThis.make = canvasTex;', context);
  return { make: context.make, flush() { for (const fn of pending.values()) fn(); pending.clear(); } };
}

test('uploaded canvas shrinks, clone source restores full dimensions, then frees again', () => {
  const h = harness(); let draws = 0;
  const t = h.make(128, 64, () => draws++);
  const canvas = t.image;
  assert.equal(draws, 1);
  t.onUpdate();
  assert.deepEqual([canvas.width, canvas.height], [1, 1]);
  const clone = t.clone();
  assert.equal(clone.source, t.source);
  assert.deepEqual([clone.image.width, clone.image.height], [128, 64]);
  assert.equal(draws, 2);
  h.flush();
  assert.deepEqual([canvas.width, canvas.height], [1, 1]);
  assert.deepEqual([t.image.width, t.image.height], [128, 64]);
  assert.equal(draws, 3);
  h.flush();
});

test('redraw after release reconstructs full canvas and requests a new texture upload', () => {
  const h = harness(); let draws = 0;
  const t = h.make(96, 48, () => draws++, [2, 3]);
  const canvas = t.image, version = t.version;
  t.onUpdate(); t.redraw();
  assert.deepEqual([canvas.width, canvas.height], [96, 48]);
  assert.equal(draws, 2);
  assert.ok(t.version > version);
  assert.deepEqual(t.repeat.toArray(), [2, 3]);
  t.onUpdate();
  assert.deepEqual([canvas.width, canvas.height], [1, 1]);
});
