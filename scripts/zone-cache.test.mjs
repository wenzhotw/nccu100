/** 區域快取的純函式測試，確認優先序、可變資料與無變更時的重用行為。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createZoneLookup } from '../src/world/zone-cache.js';

const point = { x: 0, z: 0 };
const zone = (priority, name) => ({ priority, test: () => name });
function observedZones(...entries) {
  const operations = { copies: 0, sorts: 0 };
  class ObservedZones extends Array {
    slice(...args) { operations.copies++; return super.slice(...args); }
    sort(...args) { operations.sorts++; return super.sort(...args); }
  }
  return { zones: ObservedZones.of(...entries), operations };
}

test('empty zones and unmatched zones return the caller fallback', () => {
  const lookup = createZoneLookup();
  assert.equal(lookup([], point, 'outside'), 'outside');
  assert.equal(lookup([], point), undefined);
  assert.equal(lookup([zone(0, null), zone(1, '')], point, 'outside'), 'outside');
});

test('lower priority wins without sorting the registration array in place', () => {
  const lookup = createZoneLookup();
  const zones = [zone(80, 'road'), zone(10, 'gate'), zone(30, 'river')];
  const original = zones.slice();
  assert.equal(lookup(zones, point), 'gate');
  assert.deepEqual(zones, original);
});

test('equal priorities preserve registration order and stop at the first match', () => {
  const lookup = createZoneLookup();
  const called = [];
  const zones = ['first', 'second', 'third'].map((name, index) => ({
    priority: 10,
    test(p) {
      assert.equal(p, point);
      assert.equal(this, zones[index]);
      called.push(name);
      return index === 0 ? null : name;
    },
  }));
  assert.equal(lookup(zones, point), 'second');
  assert.deepEqual(called, ['first', 'second']);
});

test('new registrations after a query are considered on the next query', () => {
  const lookup = createZoneLookup();
  const zones = [];
  assert.equal(lookup(zones, point, 'outside'), 'outside');
  zones.push(zone(20, 'first'));
  assert.equal(lookup(zones, point), 'first');
  zones.push(zone(10, 'new'));
  assert.equal(lookup(zones, point), 'new');
  zones.push(zone(10, 'tie'));
  assert.equal(lookup(zones, point), 'new');
});

test('priority edits through retained zone objects invalidate cached order', () => {
  const lookup = createZoneLookup();
  const first = zone(10, 'first');
  const second = zone(20, 'second');
  const zones = [first, second];
  assert.equal(lookup(zones, point), 'first');
  second.priority = 0;
  assert.equal(lookup(zones, point), 'second');
  second.priority = 10;
  assert.equal(lookup(zones, point), 'first');
  first.test = () => null;
  assert.equal(lookup(zones, point), 'second');
});

test('direct replacement, reordering, removal and reset remain observable', () => {
  const lookup = createZoneLookup();
  const zones = [zone(10, 'first'), zone(10, 'second')];
  assert.equal(lookup(zones, point), 'first');
  zones.reverse();
  assert.equal(lookup(zones, point), 'second');
  zones[0] = zone(30, 'replacement');
  assert.equal(lookup(zones, point), 'first');
  zones.splice(1, 1);
  assert.equal(lookup(zones, point), 'replacement');
  assert.equal(lookup([zone(0, 'new array')], point), 'new array');
  zones.length = 0;
  assert.equal(lookup(zones, point, 'outside'), 'outside');
});

test('unchanged lookups do not copy or sort again', () => {
  const lookup = createZoneLookup();
  const { zones, operations } = observedZones(zone(20, 'second'), zone(10, 'first'));
  lookup(zones, point);
  const sorts = operations.sorts;
  const copies = operations.copies;
  for (let i = 0; i < 1000; i++) lookup(zones, point);
  assert.equal(sorts, 1);
  assert.equal(operations.sorts, sorts);
  assert.equal(operations.copies, copies);
});

test('NaN priorities preserve legacy sorting and do not repeatedly invalidate', () => {
  const lookup = createZoneLookup();
  const { zones, operations } = observedZones(zone(NaN, 'first'), zone(10, 'second'));
  const first = lookup(zones, point);
  const second = lookup(zones, point);
  assert.equal(first, 'first');
  assert.equal(second, first);
  assert.equal(operations.sorts, 1);
});

test('registration inside a test affects the next query without changing its snapshot', () => {
  const lookup = createZoneLookup();
  const zones = [{ priority: 10, test() { zones.push(zone(0, 'new')); return null; } }, zone(20, 'old')];
  assert.equal(lookup(zones, point), 'old');
  assert.equal(lookup(zones, point), 'new');
});
