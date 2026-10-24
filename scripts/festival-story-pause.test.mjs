import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createStoryClock, festivalStoriesPaused } from '../src/systems/festival-story-pause.js';
import { createVenueFocus } from '../src/systems/baozhong/venue-focus.js';
const source = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

test('Festival freezes cooldown and delayed weather work; exit resumes once without catch-up', () => {
  let wall = 0, calls = 0;
  const state = { flags: new Set() }, clock = createStoryClock(state, () => wall);
  clock.after(() => calls++, 1800);
  wall = 900; clock.flush(); assert.equal(calls, 0);
  state.flags.add('bz26_active'); clock.flush();
  wall = 900000; clock.flush(); assert.equal(clock.now(), 900); assert.equal(calls, 0);
  state.flags.delete('bz26_active'); clock.flush(); assert.equal(calls, 0);
  wall += 899; clock.flush(); assert.equal(calls, 0);
  wall++; clock.flush(); clock.flush(); assert.equal(calls, 1);
  for (let i = 0; i < 3; i++) {
    state.flags.add('bz26_active'); clock.now(); wall += 10000;
    state.flags.delete('bz26_active'); assert.equal(clock.now(), 1800);
  }
});

test('Loaded active save and stale mirrored boolean follow the canonical venue flag', () => {
  let wall = 0;
  const state = { flags: new Set(['bz26_active']), bz26_active: false };
  const clock = createStoryClock(state, () => wall);
  wall = 60000; assert.equal(clock.now(), 0); assert.equal(festivalStoriesPaused(state), true);
  state.flags.clear(); state.bz26_active = true;
  assert.equal(festivalStoriesPaused(state), false); assert.equal(clock.now(), 0);
});

function missionaries() {
  let wall = 0, interval;
  const state = { flags: new Set(), started: true }, npcs = [], spots = [], sounds = [], dialogs = [];
  const M = JSON.parse(source('../src/content/missionaries.json'));
  const ctx = {
    state, M, createStoryClock: s => createStoryClock(s, () => wall), festivalStoriesPaused,
    performance: { now: () => wall }, setInterval: fn => { interval = fn; },
    addNPC: o => { const n = { ...o, state: 'idle', g: { visible: true, position: { ...o.home } }, spot: {}, sp: { say() {} } }; npcs.push(n); spots.push(n.spot); return n; },
    AU: { sfx: x => sounds.push(x) }, pos: { x: -30, z: -65.6 }, indoor: () => false,
    dlg: { hidden: true }, openDialog: (...a) => dialogs.push(a), setFlag: k => { state[k] = true; state.flags.add(k); },
    URLSearchParams, location: { search: '' },
  };
  vm.runInNewContext(source('../src/systems/missionaries/index.js').replace(/^import .*;\n/gm, '').replace('import.meta.env.DEV', 'false'), ctx);
  return { state, npcs, spots, sounds, dialogs, tick: ms => { wall = ms; interval(); } };
}

test('Real missionary timer does not consume first encounter while hidden; repeat entry restores chase and manual encounter', () => {
  const f = missionaries();
  const ordinary = { id: 'campus', g: { visible: true }, spot: {} };
  f.npcs.push(ordinary); f.spots.push(ordinary.spot);
  const focus = createVenueFocus({ ...f, foliage: [], colliders: [], enabled: true });
  const lead = f.npcs[0], buddy = f.npcs[1];
  f.state.flags.add('bz26_active'); focus.setActive(true); f.tick(30000);
  lead.spot.fn(); assert.equal(f.state.missionaryMet, undefined); assert.equal(f.dialogs.length, 0); assert.equal(f.sounds.length, 0);
  assert.equal(f.npcs.length, 0); assert.equal(lead.g.visible, false);
  f.state.flags.delete('bz26_active'); focus.setActive(false); f.tick(30001); f.tick(46001);
  assert.equal(lead.state, 'chase'); assert.equal(buddy.state, 'chase'); assert.equal(f.state.missionaryMet, true);
  const catchFn = lead.onCatch;
  for (let i = 0; i < 3; i++) {
    f.state.flags.add('bz26_active'); focus.setActive(true); f.tick(50000 + i * 100000);
    assert.equal(lead.state, 'chase'); assert.equal(lead.onCatch, catchFn); assert.equal(lead.pauseWhen(), true);
    f.state.flags.delete('bz26_active'); focus.setActive(false); f.tick(50001 + i * 100000);
    assert.equal(lead.onCatch, catchFn); assert.equal(f.npcs.filter(n => n === lead).length, 1);
  }
  catchFn(); assert.equal(f.dialogs.length, 1);
  f.tick(999999); assert.equal(f.sounds.length, 1);
  lead.spot.fn(); assert.equal(f.dialogs.length, 2);
});

test('Weather pauses narrative after visual updates without freezing the existing weather', () => {
  const text = source('../src/systems/weather/index.js');
  assert.match(text, /if \(!paused\) updateLion\(storyDt\)/);
  assert.match(text, /if \(!paused\) storyClock.flush\(\)/);
  assert.ok(text.indexOf('if (over || paused) return;') > text.indexOf('rainGeo.attributes.position.needsUpdate = true;'));
  assert.ok(text.indexOf('if (over || paused) return;') < text.indexOf('rainT -= storyDt'));
  assert.doesNotMatch(text, /setTimeout\(/);
  assert.match(text, /storyClock\.after\(sendCop,/);
  assert.match(text, /ok: \(\) => !festivalStoriesPaused\(state\)/);
  for (const name of ['wakeLion', 'startRain', 'takeUmbrella', 'sendCop', 'copTalk', 'splash']) {
    assert.ok(text.includes(`function ${name}() {\n  if (festivalStoriesPaused(state)) return;`), name);
  }
});

test('NPC pause guard preserves in-flight catch callback before any movement or state changes', () => {
  const text = source('../src/actors/npc.js');
  const start = text.indexOf('function npcUpdate(n,dt){');
  const guard = text.slice(start, text.indexOf('  let tx=null,tz=null,spd=0;', start));
  const n = { pauseWhen: () => true, state: 'chase', chaseT: 5, onCatch: () => {}, g: { position: { x: 60, y: 0, z: 0 } } };
  const before = { ...n };
  vm.runInNewContext(guard + '\n}\nnpcUpdate(n, 1);', { n, state: { room: null }, pos: { x: 0, z: 0 }, MOBILE: false });
  assert.deepEqual(n, before);
});

test('Already shaking lion and active rain retain exact progress across festival and resume normally', () => {
  const text = source('../src/systems/weather/index.js');
  const lion = text.slice(text.indexOf('function updateLion(dt) {'), text.indexOf('/* ---------- 四維道會噴水'));
  const tickPrefix = text.slice(text.indexOf('function tick() {'), text.indexOf('  // 雨滴噴濺')) + '\n}';
  let wall = 0;
  const state = { started: true, flags: new Set(), busy: true };
  const ctx = {
    state, festivalStoriesPaused, storyClock: createStoryClock(state, () => wall), requestAnimationFrame() {}, last: 0, storyLast: 0, performance: { now: () => wall },
    holding: false, held: { visible: false }, indoor: () => false,
    npcUmbrellas: [{}], gloom: 0.5, lionMode: 'shake', lionT: 0.2,
    lion: { rotation: { z: 0 } }, rainT: 95, hp: 73,
  };
  vm.createContext(ctx); vm.runInContext(lion + tickPrefix, ctx);
  wall = 100; vm.runInContext('tick()', ctx); assert.ok(Math.abs(ctx.lionT - 0.3) < 1e-9);
  const frozenRotation = ctx.lion.rotation.z;
  state.flags.add('bz26_active'); vm.runInContext('tick()', ctx);
  wall = 500000; vm.runInContext('tick()', ctx);
  assert.ok(Math.abs(ctx.lionT - 0.3) < 1e-9); assert.equal(ctx.lion.rotation.z, frozenRotation);
  assert.equal(ctx.rainT, 95); assert.equal(ctx.hp, 73);
  state.flags.clear(); vm.runInContext('tick()', ctx);
  wall += 100; vm.runInContext('tick()', ctx); assert.ok(Math.abs(ctx.lionT - 0.4) < 1e-9);
  assert.equal(ctx.lionMode, 'shake');
});

test('Actual paused weather frame keeps rendering but does not damage, expire rain or move lion', () => {
  const text = source('../src/systems/weather/index.js');
  const frame = text.slice(text.indexOf('function tick() {'), text.indexOf('\nrequestAnimationFrame(tick);'));
  const state = { started: true, flags: new Set(['bz26_active']) };
  let renders = 0, lionUpdates = 0, jobs = 0;
  const ctx = { state, festivalStoriesPaused, performance: { now: () => 1000 }, storyClock: { now: () => 0, flush: () => jobs++ }, last: 900, storyLast: 0,
    requestAnimationFrame() {}, holding: false, held: { visible: false }, indoor: () => false,
    npcUmbrellas: [{}], gloom: 0.5, updateLion: () => lionUpdates++, drops: [], raining: true,
    applyGloom: () => renders++, tint: { style: {} }, rain: { material: {}, position: { set() {} } },
    pos: { x: 0, z: 0 }, rainGeo: { attributes: { position: { array: [] } } }, N: 0,
    ground: { visible: false }, over: false, rainT: 95, hp: 73,
  };
  vm.runInNewContext(frame + '\ntick();', ctx);
  assert.equal(renders, 1); assert.equal(ctx.rainGeo.attributes.position.needsUpdate, true);
  assert.equal(lionUpdates, 0); assert.equal(jobs, 0); assert.equal(ctx.rainT, 95); assert.equal(ctx.hp, 73);
});
