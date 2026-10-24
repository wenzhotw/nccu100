import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { installContextRecovery } from '../src/core/context-recovery.js';

function setup() {
  const canvas = new EventTarget(), timers = new Map();
  let saves = 0, shows = 0, removes = 0, id = 0;
  const recovery = installContextRecovery(canvas, {
    onLost() { saves++; },
    showRecovery() { shows++; return () => removes++; },
    schedule(fn) { timers.set(++id, fn); return id; },
    cancel(key) { timers.delete(key); },
  });
  return { recovery, counts: () => [saves, shows, removes],
    lose() { const event = new Event('webglcontextlost', { cancelable: true }); canvas.dispatchEvent(event); assert.equal(event.defaultPrevented, true); },
    restore() { canvas.dispatchEvent(new Event('webglcontextrestored')); },
    expire() { const all = [...timers.values()]; timers.clear(); all.forEach(fn => fn()); },
  };
}
test('context loss requests a save once; timeout offers recovery but cannot navigate automatically', () => {
  const h = setup(); h.lose(); h.lose();
  assert.equal(h.recovery.lost, true);
  assert.deepEqual(h.counts(), [1, 0, 0]);
  h.expire(); assert.deepEqual(h.counts(), [1, 1, 0]);
  h.restore(); assert.equal(h.recovery.lost, false);
  assert.deepEqual(h.counts(), [1, 1, 1]);
});
test('early restoration cancels timeout, second loss is independent, disposal removes listeners', () => {
  const h = setup(); h.lose(); h.restore(); h.expire();
  assert.deepEqual(h.counts(), [1, 0, 0]);
  h.lose(); h.expire(); assert.deepEqual(h.counts(), [2, 1, 0]);
  h.recovery.dispose(); h.expire();
  assert.deepEqual(h.counts(), [2, 1, 1]);
});
test('production save and loop wire recovery without changing save schema or forcing reload', () => {
  const save = fs.readFileSync(new URL('../src/systems/save.js', import.meta.url), 'utf8');
  const loop = fs.readFileSync(new URL('../src/core/loop.js', import.meta.url), 'utf8');
  assert.match(save, /addEventListener\('nccu-context-lost', saveGame\)/);
  assert.match(loop, /if\(contextRecovery.lost\)[\s\S]*?requestAnimationFrame\(loop\); return;/);
});
test('real recovery notice never reloads on timeout; button reloads and restoration removes notice', () => {
  const savedDocument = globalThis.document, savedLocation = globalThis.location;
  let reloads = 0, timer;
  class Element extends EventTarget {
    constructor() { super(); this.style = {}; this.children = []; }
    setAttribute() {}
    append(...elements) { this.children.push(...elements); elements.forEach(e => { e.parent = this; }); }
    remove() { this.parent.children = this.parent.children.filter(e => e !== this); }
  }
  const body = new Element();
  globalThis.document = { body, createElement: () => new Element() };
  globalThis.location = { reload() { reloads++; } };
  const canvas = new EventTarget();
  const recovery = installContextRecovery(canvas, {
    onLost() {}, schedule(fn) { timer = fn; return 1; }, cancel() {},
  });
  try {
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    timer();
    assert.equal(reloads, 0); assert.equal(body.children.length, 1);
    const panel = body.children[0], button = panel.children[1];
    assert.equal(button.textContent, '重新載入');
    button.dispatchEvent(new Event('click')); assert.equal(reloads, 1);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    assert.equal(body.children.length, 0);
  } finally {
    recovery.dispose();
    globalThis.document = savedDocument; globalThis.location = savedLocation;
  }
});
