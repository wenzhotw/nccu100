import test from 'node:test';
import assert from 'node:assert/strict';
import { createQualityController } from '../src/render/quality-controller.js';
import { createFrameTiming } from '../src/core/frame-timing.js';

const feed = (q, seconds, fps = 60) => {
  for (let i = 0; i < Math.ceil(seconds * fps); i++) q.tick(1 / fps);
};
function until(q, predicate, fps = 60, limit = 120) {
  for (let i = 0; i < limit * fps; i++) {
    q.tick(1 / fps);
    if (predicate(q.snapshot())) return;
  }
  assert.fail('condition not reached');
}

test('first slow drop does not cap recovery; full resolution and Bloom return', () => {
  const q = createQualityController({ dpr: 2 });
  feed(q, 14, 20);
  assert.equal(q.snapshot().pr, 1);
  assert.equal(q.snapshot().bloom, false);
  feed(q, 200);
  assert.equal(q.snapshot().pr, 1.5);
  assert.equal(q.snapshot().bloom, true);
  assert.equal(q.snapshot().trial, null);
});

test('sustained slow frames stop at minimum and never turn Bloom on', () => {
  const changes = [];
  const q = createQualityController({ dpr: 2, onChange: s => changes.push(s) });
  feed(q, 200, 20);
  assert.equal(q.snapshot().pr, 1);
  assert.equal(q.snapshot().bloom, false);
  assert.equal(changes.length, 3);
});

test('failed resolution trial blocks only that level temporarily, then retries', () => {
  const q = createQualityController({ dpr: 2, bloom: false });
  feed(q, 3, 20);
  assert.equal(q.snapshot().pr, 1.25);
  until(q, s => s.pr === 1.5);
  assert.equal(q.snapshot().trial, '1.5');
  until(q, s => s.pr === 1.25, 20);
  feed(q, 45);
  assert.equal(q.snapshot().pr, 1.25);
  until(q, s => s.pr === 1.5);
  feed(q, 25);
  assert.equal(q.snapshot().trial, null);
});

test('medium windows interrupt fast streaks instead of accumulating recovery', () => {
  const q = createQualityController({ dpr: 2, bloom: false });
  feed(q, 3, 20);
  // Complete cooldown first, then alternate 60 and 40 FPS windows.
  feed(q, 6, 40);
  for (let i = 0; i < 12; i++) { feed(q, 5, 60); feed(q, 5, 40); }
  assert.equal(q.snapshot().pr, 1.25);
  feed(q, 25);
  assert.equal(q.snapshot().pr, 1.5);
});

test('Bloom is restored last and failed Bloom trial uses the same retry delay', () => {
  const q = createQualityController({ dpr: 2 });
  feed(q, 3, 20);
  assert.equal(q.snapshot().bloom, false);
  until(q, s => s.bloom);
  assert.equal(q.snapshot().pr, 1.5);
  assert.equal(q.snapshot().trial, 'bloom');
  until(q, s => !s.bloom, 20);
  assert.equal(q.snapshot().pr, 1.5);
  feed(q, 45);
  assert.equal(q.snapshot().bloom, false);
  until(q, s => s.bloom);
});

test('background and resume gap do not count as slow frames or expire retry lock', () => {
  const q = createQualityController({ dpr: 2, bloom: false });
  feed(q, 3, 20);
  until(q, s => s.pr === 1.5);
  until(q, s => s.pr === 1.25, 20);
  const timing = createFrameTiming();
  q.reset(); timing.resetMeasurement();
  for (let i = 0; i < 1000; i++) q.tick(timing.sample(5, true).measurementDt);
  q.reset(); timing.resetMeasurement();
  q.tick(timing.sample(600).measurementDt);
  feed(q, 45);
  assert.equal(q.snapshot().pr, 1.25);
  until(q, s => s.pr === 1.5);
});

test('reset clears partial measurements and streak without changing current quality', () => {
  const q = createQualityController({ dpr: 2, bloom: false });
  feed(q, 3, 20); feed(q, 9);
  q.reset();
  for (const dt of [null, NaN, Infinity, 0, -1]) q.tick(dt);
  feed(q, 9);
  assert.equal(q.snapshot().pr, 1.25);
  feed(q, 20);
  assert.equal(q.snapshot().pr, 1.5);
});

test('low-DPR and WebGL1 keep their limits and never invent Bloom support', () => {
  const q = createQualityController({ dpr: 0.75, bloom: false });
  feed(q, 50, 20); feed(q, 200);
  assert.equal(q.snapshot().pr, 0.75);
  assert.equal(q.snapshot().bloom, false);
});
test('repeated failed trials back off 60, 120, 240, 480 seconds with a 480-second cap', () => {
  const q = createQualityController({ dpr: 2, bloom: false });
  feed(q, 3, 20);
  until(q, s => s.pr === 1.5);
  for (const delay of [60, 120, 240, 480, 480]) {
    until(q, s => s.pr === 1.25, 20);
    feed(q, delay - 15);
    assert.equal(q.snapshot().pr, 1.25, 'cannot retry before backoff expires');
    until(q, s => s.pr === 1.5, 60, 40);
    assert.equal(q.snapshot().trial, '1.5');
  }
  // A stable successful trial clears failure history; a later failure restarts at 60 seconds.
  feed(q, 30); assert.equal(q.snapshot().trial, null);
  until(q, s => s.pr === 1.25, 20);
  until(q, s => s.pr === 1.5);
  until(q, s => s.pr === 1.25, 20);
  feed(q, 45); assert.equal(q.snapshot().pr, 1.25);
  until(q, s => s.pr === 1.5, 60, 40);
});
test('background reset does not shorten the second failure backoff', () => {
  const q = createQualityController({ dpr: 2, bloom: false });
  feed(q, 3, 20); until(q, s => s.pr === 1.5);
  until(q, s => s.pr === 1.25, 20); until(q, s => s.pr === 1.5);
  until(q, s => s.pr === 1.25, 20);
  q.reset();
  for (let i = 0; i < 100000; i++) q.tick(null);
  feed(q, 100); assert.equal(q.snapshot().pr, 1.25);
  until(q, s => s.pr === 1.5, 60, 40);
});
