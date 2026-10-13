/** 小地圖的失效條件、有限快取，以及最佳化前後的繪圖指令與工作量比較。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMapCache } from '../src/systems/map-cache.js';
import { createMapPainter } from '../src/systems/map-painter.js';
import { createOriginalMapPainter } from './fixtures/map-draw-original.js';

// 記錄實際繪製時的樣式與路徑。完整不透明的貼圖會取代畫面，等同 canvas 的 drawImage。
function canvas(width = 1040, height = 800) {
  let W = width, H = height, stack = [], path = [], transform = [];
  const g = { ops: [] };
  function reset() {
    Object.assign(g, { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1,
      lineCap: 'butt', lineJoin: 'miter', textAlign: 'start', font: '10px sans-serif', dash: [] });
    g.ops = []; stack = []; path = []; transform = [];
  }
  reset();
  const record = (op, args, keys) => g.ops.push({ op, args, transform: structuredClone(transform),
    style: Object.fromEntries(keys.map(key => [key, structuredClone(g[key])])) });
  g.beginPath = () => { path = []; };
  for (const name of ['moveTo', 'lineTo', 'arc', 'ellipse', 'closePath']) g[name] = (...args) => path.push([name, ...args]);
  g.fill = () => record('fill', structuredClone(path), ['fillStyle']);
  g.stroke = () => record('stroke', structuredClone(path), ['strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'dash']);
  g.fillRect = (...args) => {
    if (args[0] === 0 && args[1] === 0 && args[2] === W && args[3] === H && g.fillStyle === '#f3e6c6') g.ops = [];
    record('fillRect', args, ['fillStyle']);
  };
  g.strokeRect = (...args) => record('strokeRect', args, ['strokeStyle', 'lineWidth', 'lineCap', 'lineJoin']);
  g.fillText = (...args) => record('fillText', args, ['fillStyle', 'font', 'textAlign']);
  g.setLineDash = values => { g.dash = [...values]; };
  g.save = () => stack.push({ state: Object.fromEntries(Object.keys(g).filter(k => k !== 'ops' && typeof g[k] !== 'function').map(k => [k, structuredClone(g[k])])), transform: structuredClone(transform) });
  g.restore = () => { const saved = stack.pop(); Object.assign(g, saved.state); transform = saved.transform; };
  g.translate = (...args) => transform.push(['translate', ...args]);
  g.rotate = (...args) => transform.push(['rotate', ...args]);
  g.drawImage = (source, x, y) => { assert.equal(x, 0); assert.equal(y, 0); g.ops = structuredClone(source.getContext('2d').ops); };
  return { get width() { return W; }, set width(value) { W = value; reset(); },
    get height() { return H; }, set height(value) { H = value; reset(); }, getContext: () => g };
}

function fixture() {
  const shapes = [{ x: 0, z: -87, w: 14, d: 30, color: '#c8c3b4', label: '四維堂' },
    { draw(g, mx, my) { g.save(); g.translate(mx(30), my(-40)); g.rotate(.3);
      g.fillStyle = '#8fbf72'; g.beginPath(); g.ellipse(0, 0, 46, 30, 0, 0, 7); g.fill(); g.restore(); } }];
  const crystals = [{ got: false, mapAt: { x: 5, z: -12 } }, { got: true, mapAt: { x: 90, z: -165 } }];
  const layout = { MAP_BOUNDS: { x0: -200, x1: 190, z0: 45, z1: -205 },
    RIV: [[-200, -140], [-180, -200]], SIWEI: { x0: -40, x1: 80 },
    bdZ: x => -.1 * x - 180, swZ: x => .03 * x - 70,
    CREEK_ROAD: [[-180, -100], [-155, -195]], FZ: -32, random: () => .5 };
  let allocated = 0, baseCalls = 0, detailCalls = 0;
  const painter = createMapPainter(layout);
  const cache = createMapCache({ createCanvas: () => { allocated++; return canvas(); },
    drawBase: (...args) => { baseCalls++; return painter.drawBase(...args); },
    drawDetails: (...args) => { detailCalls++; painter.drawDetails(...args); } });
  const input = { shapes, crystals, mapRevision: 1, fontRevision: 0, haveMap: true };
  function original({ haveMap = input.haveMap, indoor = false, showPlayer = false, player = { x: 0, z: 0 } } = {}, target = canvas()) {
    createOriginalMapPainter({ ...layout, world: { mapShapes: input.shapes }, state: { haveMap }, crystals,
      indoor: () => indoor, pos: player })(target, showPlayer);
    return target.getContext('2d').ops;
  }
  return { input, cache, painter, original, counts: () => ({ allocated, baseCalls, detailCalls }) };
}

test('cached map matches original drawing order, styles, labels and custom shapes', () => {
  const f = fixture(), target = canvas();
  assert.equal(f.cache.update(target, f.input), true);
  assert.deepEqual(target.getContext('2d').ops, f.original());
  const ops = target.getContext('2d').ops;
  assert.equal(ops.at(-1).op, 'strokeRect');
  assert.equal(ops.at(-2).args[0], 'N');
  assert.equal(ops.filter(op => op.op === 'fillRect' && op.style.fillStyle.startsWith('rgba(150,110,60,')).length, 900);
});

test('unchanged map skips all base, noise and marker rendering', () => {
  const f = fixture(), target = canvas();
  f.cache.update(target, f.input);
  const pixels = structuredClone(target.getContext('2d').ops);
  for (let i = 0; i < 200; i++) assert.equal(f.cache.update(target, f.input), false);
  assert.deepEqual(target.getContext('2d').ops, pixels);
  assert.deepEqual(f.counts(), { allocated: 1, baseCalls: 1, detailCalls: 1 });
  assert.deepEqual(f.cache.stats(), { baseRedraws: 1, compositeRedraws: 1, width: 1040, height: 800,
    fontRevision: 0, invalidations: { initial: 1, size: 0, map: 0, font: 0, shapes: 0 } });
});

test('cached composition preserves base text alignment without building labels', () => {
  const f = fixture(), target = canvas();
  f.input.shapes = [];
  f.cache.update(target, f.input);
  assert.deepEqual(target.getContext('2d').ops, f.original());
  f.input.haveMap = false;
  f.cache.update(target, f.input);
  assert.deepEqual(target.getContext('2d').ops, f.original());
});

test('ownership, collection, marker position and marker membership only redraw details', () => {
  const f = fixture(), target = canvas();
  f.cache.update(target, f.input);
  const changes = [() => { f.input.haveMap = false; }, () => { f.input.haveMap = true; },
    () => { f.input.crystals[0].got = true; }, () => { f.input.crystals[1].mapAt.x += 5; },
    () => { f.input.crystals[1].mapAt = { x: -30, z: -185 }; },
    () => { f.input.crystals.push({ got: false, mapAt: { x: 180, z: 35 } }); },
    () => { f.input.crystals.reverse(); }, () => { f.input.crystals.pop(); }];
  for (const change of changes) {
    change();
    assert.equal(f.cache.update(target, f.input), true);
    assert.deepEqual(target.getContext('2d').ops, f.original());
    assert.equal(f.cache.update(target, f.input), false);
  }
  assert.deepEqual(f.counts(), { allocated: 1, baseCalls: 1, detailCalls: changes.length + 1 });
});

test('shape edits, registration revision and font revision invalidate the base', () => {
  const f = fixture(), target = canvas();
  f.cache.update(target, f.input);
  const changes = [() => { f.input.shapes[0].label = '新名稱'; }, () => { f.input.shapes[0].x += 10; },
    () => { f.input.shapes = [...f.input.shapes]; }, () => { f.input.shapes.reverse(); },
    () => { f.input.shapes.push({ x: 12, z: 10, w: 4, d: 3, label: '新增', color: '#fff' }); },
    () => { f.input.shapes.pop(); }, () => { f.input.mapRevision++; }, () => { f.input.fontRevision++; }];
  for (const change of changes) {
    change();
    assert.equal(f.cache.update(target, f.input), true);
    assert.deepEqual(target.getContext('2d').ops, f.original());
    assert.equal(f.cache.update(target, f.input), false);
  }
  assert.deepEqual(f.counts(), { allocated: 1, baseCalls: changes.length + 1, detailCalls: changes.length + 1 });
});

test('dimension and target changes keep a single bounded base canvas', () => {
  const f = fixture(), target = canvas();
  f.cache.update(target, f.input);
  for (const [width, height] of [[520, 400], [1040, 800], [640, 320]]) {
    target.width = width; target.height = height;
    assert.equal(f.cache.update(target, f.input), true);
    assert.deepEqual(target.getContext('2d').ops, f.original({}, canvas(width, height)));
  }
  const replacement = canvas(640, 320);
  assert.equal(f.cache.update(replacement, f.input), true);
  assert.deepEqual(replacement.getContext('2d').ops, target.getContext('2d').ops);
  assert.deepEqual(f.counts(), { allocated: 1, baseCalls: 4, detailCalls: 5 });
  const stats = f.cache.stats(); stats.baseRedraws = -1;
  assert.equal(f.cache.stats().baseRedraws, 4);
});

test('full map preserves outdoor player, indoor exclusion and compass/frame precedence', () => {
  const f = fixture();
  for (const haveMap of [false, true]) for (const indoor of [false, true]) for (const showPlayer of [false, true]) {
    const target = canvas(780, 600), player = { x: 155, z: 30 };
    f.painter.drawBase(target, f.input.shapes);
    f.painter.drawDetails(target, { haveMap, crystals: f.input.crystals, player: showPlayer && !indoor ? player : null });
    assert.deepEqual(target.getContext('2d').ops, f.original({ haveMap, indoor, showPlayer, player }, canvas(780, 600)));
  }
});


test('base redraw diagnostics distinguish late fonts from ownership and movement', () => {
  const f = fixture(), target = canvas();
  f.cache.update(target, f.input);
  f.input.haveMap = false;
  f.cache.update(target, f.input);
  f.input.fontRevision++;
  f.cache.update(target, f.input);
  assert.equal(f.cache.update(target, f.input), false);
  const stats = f.cache.stats();
  assert.equal(stats.baseRedraws, 2);
  assert.equal(stats.compositeRedraws, 3);
  assert.equal(stats.fontRevision, 1);
  assert.deepEqual(stats.invalidations, { initial: 1, size: 0, map: 0, font: 1, shapes: 0 });
  stats.invalidations.font = -1;
  assert.equal(f.cache.stats().invalidations.font, 1);

  f.input.fontRevision++;
  f.input.mapRevision++;
  f.input.shapes[0].label = '變更';
  target.width = 520;
  f.cache.update(target, f.input);
  assert.deepEqual(f.cache.stats().invalidations, { initial: 1, size: 1, map: 1, font: 2, shapes: 1 });
});
