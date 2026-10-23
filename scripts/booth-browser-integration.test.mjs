import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { boothBrowsePoint, boothLocalPosition, nearestBrowseBooth, BOOTH_BROWSE_LOCAL } from '../src/systems/baozhong/booth-browser-logic.js';
import { collidersOf } from '../src/systems/baozhong/tents-logic.js';
import { openCanopyColliders } from '../src/systems/baozhong/open-canopy-d26.js';
const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const layout = JSON.parse(read('../src/systems/baozhong/layout.json'));
const content = JSON.parse(read('../src/content/baozhong.json'));
const DATA = JSON.parse(read('../src/systems/baozhong/booth-browser-data.json'));
const departments = layout.tents.filter(t => /^D\d{2}$/.test(t.id));
function world(t, x, z) {
  const g = new THREE.Group(); g.position.set(t.x, 0, t.z); g.rotation.y = t.rotY; g.updateMatrixWorld(true);
  return g.localToWorld(new THREE.Vector3(x, 0, z));
}
function clearance(p, c) {
  const dx = p.x - c.cx, dz = p.z - c.cz;
  return Math.hypot(Math.max(Math.abs(dx * c.cs - dz * c.sn) - c.hx, 0), Math.max(Math.abs(dx * c.sn + dz * c.cs) - c.hz, 0));
}
class Target {
  constructor() { this.listeners = new Map(); this.dataset = {}; this.style = {}; this.captured = new Set(); }
  addEventListener(type, fn) { const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list); }
  removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) || []).filter(x => x !== fn)); }
  emit(type, event = {}) { for (const fn of this.listeners.get(type) || []) fn({ type, preventDefault() {}, stopImmediatePropagation() {}, ...event }); }
  setAttribute() {} append() {} remove() { this.removed = true; }
  setPointerCapture(id) { this.captured.add(id); } hasPointerCapture(id) { return this.captured.has(id); } releasePointerCapture(id) { this.captured.delete(id); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
}
function fixture() {
  const doc = new Target(), elements = []; doc.body = new Target(); doc.querySelector = () => null; doc.createElement = () => { const e = new Target(); elements.push(e); return e; };
  const state = { started: true, busy: false, room: null, driving: false }, original = { id: 'npc', x: 0, z: 0 };
  const spots = [original], position = { ...boothBrowsePoint(departments[0]) }, counts = { resets: 0, stops: 0, talks: [], disposals: 0 };
  let allowed = true;
  function mountBoothBrowser(options) {
    let id = null;
    return { get isOpen() { return id != null; }, get currentId() { return id; },
      open(next) { if (id || state.busy) return false; id = next; state.busy = true; options.onOpen(next); return true; },
      close() { if (!id) return false; id = null; state.busy = false; options.onClose(); return true; },
      dispose() { this.close(); counts.disposals++; }, talk() { const next = id; this.close(); options.onTalk(next); } };
  }
  const ctx = { DATA, mountBoothBrowser, boothBrowsePoint, nearestBrowseBooth, BOOTH_BROWSE_LOCAL };
  vm.runInNewContext(read('../src/systems/baozhong/booth-browser.js').replace(/^import .*;\n/gm, '').replace('export function', 'function') + '\nthis.create = createBoothBrowsing;', ctx);
  const controller = ctx.create({ layout, content, tents: { tents: new Map() }, state, spots, document: doc,
    getPosition: () => position, canInteract: () => allowed, onTalk: id => counts.talks.push(id), resetInput: () => counts.resets++, stopVelocity: () => counts.stops++ });
  return { controller, state, spots, original, doc, button: elements[0], position, counts, allow: value => { allowed = value; } };
}

test('all 37 independent counter-front points rotate correctly and are physically reachable', () => {
  assert.equal(departments.length, 37); assert.equal(new Set(departments.map(t => t.rotY)).size, 3);
  const colliders = layout.tents.flatMap(t => [...collidersOf(t), ...(t.id === 'D26' ? openCanopyColliders(t).slice(4, 6) : [])]);
  for (const tent of departments) {
    const actual = boothBrowsePoint(tent), expected = world(tent, BOOTH_BROWSE_LOCAL.x, BOOTH_BROWSE_LOCAL.z);
    assert.ok(Math.hypot(actual.x - expected.x, actual.z - expected.z) < 1e-10, tent.id);
    assert.equal(nearestBrowseBooth(layout.tents, actual)?.id, tent.id);
    assert.ok(Math.abs(boothLocalPosition(tent, actual).z - BOOTH_BROWSE_LOCAL.z) < 1e-10);
    for (let i = 0; i <= 10; i++) {
      const p = world(tent, BOOTH_BROWSE_LOCAL.x, 3.8 - (3.8 - BOOTH_BROWSE_LOCAL.z) * i / 10);
      for (const c of colliders) assert.ok(clearance(p, c) >= 0.35, `${tent.id}, approach ${i}`);
    }
    for (const [x, z] of [[0, -2], [3, 2.35], [-3, 2.35], [0, 4.5], [0, 1.2]]) assert.equal(nearestBrowseBooth([tent], world(tent, x, z)), null, tent.id);
  }
});

test('venue activation is idempotent, exit clears near/modal, and disposal removes owned registry and listeners', () => {
  const f = fixture(), c = f.controller;
  assert.equal(f.spots.length, 1); c.setActive(true); c.setActive(true); assert.equal(f.spots.length, 38);
  assert.equal(new Set(c.entries.map(e => e.id)).size, 37);
  assert.equal(c.open(departments[0].id), true); assert.equal(f.state.bzBoothBrowsing, true);
  f.state.near = c.entries[0]; c.setActive(false); assert.equal(c.panel.isOpen, false); assert.equal(f.state.bzBoothBrowsing, false); assert.equal(f.state.near, null);
  assert.deepEqual(f.spots, [f.original]); assert.equal(f.button.hidden, true); assert.equal(f.counts.resets, 2); assert.equal(f.counts.stops, 2);
  for (let i = 0; i < 5; i++) { c.setActive(true); assert.equal(f.spots.length, 38); c.setActive(false); assert.equal(f.spots.length, 1); }
  c.setActive(true); c.dispose(); c.dispose(); assert.deepEqual(f.spots, [f.original]); assert.equal(f.counts.disposals, 1); assert.equal(f.button.removed, true);
  assert.equal(f.doc.listeners.get('keydown').length, 0); assert.equal(f.button.listeners.get('click').length, 0); assert.equal(c.open(departments[0].id), false);
});

test('closer NPC does not suppress independent button/B entry; busy dialogs and text inputs cannot open it', () => {
  const f = fixture(), c = f.controller; c.setActive(true); f.state.near = f.original; c.update();
  assert.equal(f.button.hidden, false); assert.equal(c.nearbyId, departments[0].id); f.button.emit('click'); assert.equal(c.panel.isOpen, true);
  c.panel.close(); f.doc.emit('keydown', { code: 'KeyB', target: { tagName: 'INPUT' } }); assert.equal(c.panel.isOpen, false);
  f.doc.emit('keydown', { code: 'KeyB', repeat: true }); assert.equal(c.panel.isOpen, false);
  f.state.busy = true; assert.equal(c.open(departments[0].id), false); f.state.busy = false;
  f.allow(false); assert.equal(c.open(departments[0].id), false); f.allow(true);
  f.doc.emit('keydown', { code: 'KeyB', target: { tagName: 'BODY' } }); assert.equal(c.panel.isOpen, true);
  c.panel.talk(); assert.equal(c.panel.isOpen, false); assert.deepEqual(f.counts.talks, [departments[0].id]);
});

test('room, driving, title or other-dialog transition closes active browsing and releases movement', () => {
  for (const invalidate of [f => { f.state.room = 'hall'; }, f => { f.state.driving = true; }, f => { f.state.started = false; }, f => f.allow(false)]) {
    const f = fixture(); f.controller.setActive(true); f.controller.open(departments[0].id); invalidate(f); f.controller.update();
    assert.equal(f.controller.panel.isOpen, false); assert.equal(f.state.bzBoothBrowsing, false); assert.equal(f.button.hidden, true);
  }
});

test('real input handlers clear keyboard/mobile/camera capture and prevent game actions while reading', () => {
  const state = {}, window = new Target(), canvas = new Target(), elements = new Map();
  const $ = id => { if (!elements.has(id)) elements.set(id, new Target()); return elements.get(id); };
  let actions = 0; const late = new Proxy({}, { get: () => () => actions++ });
  const ctx = { state, renderer: { domElement: canvas }, $, late, dlg: { hidden: true }, advance: () => actions++, AU: {}, addEventListener: window.addEventListener.bind(window) };
  vm.runInNewContext(read('../src/core/input.js').replace(/^import .*;\n/gm, '').replace(/export \{[^}]*\};/, '') + '\nthis.reset = resetHeldInput; this.held = keys;', ctx);
  state.started = true; window.emit('keydown', { code: 'KeyW' }); $('stick').emit('pointerdown', { pointerId: 1, clientX: 90, clientY: 50 }); canvas.emit('pointerdown', { pointerId: 2, clientX: 0, clientY: 0 });
  assert.equal(ctx.held.KeyW, true); assert.equal(state.stickV.x > 0, true); ctx.reset();
  assert.equal(ctx.held.KeyW, false); assert.equal(state.stickV.x, 0); assert.equal(state.camPtr, null); assert.equal(canvas.captured.size, 0); assert.equal($('stick').captured.size, 0);
  state.bzBoothBrowsing = true; const yaw = state.yaw, dist = state.dist;
  for (const code of ['KeyW', 'Space', 'KeyE', 'KeyQ', 'KeyM', 'Escape']) window.emit('keydown', { code });
  $('stick').emit('pointerdown', { pointerId: 3, clientX: 90, clientY: 50 }); $('jump').emit('pointerdown'); canvas.emit('wheel', { deltaY: 100 });
  assert.equal(actions, 0); assert.equal(state.stickV.x, 0); assert.equal(state.flyHeld, false); assert.equal(state.yaw, yaw); assert.equal(state.dist, dist);
});

test('real movement frame freezes horizontal drift and vertical falling while browsing', () => {
  const source = read('../src/core/loop.js'), start = source.indexOf('function update(dt){'), end = source.indexOf('  // 所在房間自己的每一幀更新', start);
  const pos = { x: 5, y: 8, z: 9 }, vel = new THREE.Vector3(4, 3, 2), state = { time: 0, bzBoothBrowsing: true, vy: -10, driving: true };
  const ctx = { state, pos, vel, grassU: {}, waterU: { t: {} }, $: () => ({ hidden: true }), keys: {}, updateDrive() { assert.fail('must not drive'); } };
  vm.runInNewContext(source.slice(start, end) + '\n}\nupdate(1);', ctx);
  assert.deepEqual(pos, { x: 5, y: 8, z: 9 }); assert.equal(vel.length(), 0); assert.equal(state.vy, -10);
});

test('frozen baozhong story content remains byte-identical to baseline', () => {
  assert.equal(createHash('sha256').update(read('../src/content/baozhong.json')).digest('hex'), 'f951dd73ee1f60227f2785c6bfb4ad797ff51357a1266c932daaaadd59ddf736');
});

test('all 37 production registry entries qualify independently at their own front point', () => {
  const f = fixture(); f.controller.setActive(true);
  for (const tent of departments) {
    Object.assign(f.position, boothBrowsePoint(tent)); f.controller.update();
    const entry = f.controller.entries.find(e => e.id === `bz26-browse-${tent.id}`);
    assert.equal(entry.ok(), true, tent.id); assert.equal(entry.room, null); assert.equal(entry.r, BOOTH_BROWSE_LOCAL.radius);
    assert.equal(f.controller.nearbyId, tent.id); assert.equal(f.button.dataset.boothId, tent.id);
    assert.equal(entry.fn(), true); assert.equal(f.controller.panel.currentId, tent.id); f.controller.panel.close();
  }
});

test('production modal eligibility blocks campus map and dialog; timer synchronizes when outdoor NPC pauses indoors', () => {
  const source = read('../src/systems/baozhong/index.js');
  const expression = source.match(/canInteract: \(\) => ([^,\n]+)/)[1];
  const dlg = { hidden: true }, map = { hidden: true };
  const ctx = { dlg, document: { getElementById: id => { assert.equal(id, 'mapw'); return map; } } };
  const evaluate = () => vm.runInNewContext(expression, ctx);
  assert.equal(evaluate(), true); map.hidden = false; assert.equal(evaluate(), false);
  map.hidden = true; dlg.hidden = false; assert.equal(evaluate(), false);
  const sync = source.match(/function sync\(\) \{[^\n]+\}/)[0]; let updates = 0;
  vm.runInNewContext(sync + '\nsync();', { flags: () => new Set(['bz26_active']), venue: { set: active => assert.equal(active, true) }, boothBrowsing: { update: () => updates++ } });
  assert.equal(updates, 1); assert.match(source, /setInterval\(sync, 500\)/);
});
