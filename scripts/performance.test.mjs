/** 效能基礎回歸：真實幀間隔、背景恢復、診斷開關與完整後製統計。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createFrameTiming, createQualitySampler } from '../src/core/frame-timing.js';
import { createPerformanceMonitor } from '../src/core/performance.js';
import { updateInteraction, updatePromptDisplay } from '../src/ui/interaction.js';

test('長幀完整保留供量測，遊戲步進仍最多 50 ms', () => {
  const t = createFrameTiming();
  assert.equal(t.sample(0).measurementDt, null);
  assert.deepEqual(t.sample(0.2), { simulationDt: 0.05, measurementDt: 0.2 });
  assert.deepEqual(t.sample(0.016), { simulationDt: 0.016, measurementDt: 0.016 });
});

test('背景、初始與恢復幀不污染量測，但不改變步進規則', () => {
  const t = createFrameTiming();
  assert.equal(t.sample(0.4).measurementDt, null);
  assert.equal(t.sample(0.016).measurementDt, 0.016);
  t.resetMeasurement();
  assert.deepEqual(t.sample(10, true), { simulationDt: 0.05, measurementDt: null });
  assert.equal(t.sample(10, true).measurementDt, null);
  t.resetMeasurement();
  assert.deepEqual(t.sample(30), { simulationDt: 0.05, measurementDt: null });
  assert.equal(t.sample(0.017).measurementDt, 0.017);
  // 即使背景未執行任何 rAF，visibilitychange 仍使恢復幀略過。
  t.resetMeasurement(); t.resetMeasurement();
  assert.equal(t.sample(120).measurementDt, null);
});

test('畫質觀察使用原始時間，長停頓與原本截斷資料可產生不同判斷', () => {
  const raw = createQualitySampler(), capped = createQualitySampler();
  // 60 個正常幀後卡住 2 秒。原始觀察窗應立即認出，不把卡住當成 50 ms。
  for (let i = 0; i < 60; i++) { raw.sample(1 / 60); capped.sample(1 / 60); }
  assert.equal(raw.sample(2), true);
  assert.equal(capped.sample(0.05), false);
  raw.coolDown(); assert.equal(raw.sample(2.5), false);
  assert.equal(raw.sample(2.5), true);
});

test('畫質忽略背景間隔，恢復時清除未完成觀察窗', () => {
  const q = createQualitySampler();
  q.sample(2.4); q.reset();
  assert.equal(q.sample(null), false);
  assert.equal(q.sample(0.2), false);
  for (let i = 0; i < 140; i++) assert.equal(q.sample(1 / 60), false);
});

function fakeRenderer(autoReset = true) {
  return { info: {
    autoReset, render: { calls: 0, triangles: 0, points: 0, lines: 0 },
    memory: { geometries: 12, textures: 7 }, programs: [1, 2], resets: 0,
    reset() { this.resets++; Object.keys(this.render).forEach(k => { this.render[k] = 0; }); },
  } };
}
function runFrame(p, renderer, dt, tick, passes = 10) {
  p.beginFrame(dt); tick(2); p.beginRender(renderer);
  for (let i = 0; i < passes; i++) {
    if (renderer.info.autoReset) renderer.info.reset();
    renderer.info.render.calls += i === 0 ? 40 : 1;
    renderer.info.render.triangles += i === 0 ? 1000 : 2;
  }
  tick(3); p.endFrame();
}

test('平常關閉診斷，不呼叫量測時鐘／renderer.info／報表', () => {
  const p = createPerformanceMonitor({ now() { assert.fail('disabled clock'); }, onReport() { assert.fail('disabled report'); } });
  p.beginFrame(0.016);
  p.beginRender({ get info() { assert.fail('disabled renderer access'); } });
  p.endFrame(); assert.equal(p.snapshot(), null);
});

test('整幀累積陰影／場景／後製，不只讀到最後合成 quad', () => {
  let now = 0, reports = 0;
  const p = createPerformanceMonitor({ enabled: true, now: () => now, onReport() { reports++; } });
  const r = fakeRenderer();
  runFrame(p, r, 0.12, n => { now += n; });
  const s = p.snapshot();
  assert.equal(s.rawFrameMs, 120); assert.equal(s.p95Ms, 120);
  assert.equal(s.longFrames, 1); assert.equal(s.windowLongFrames, 1);
  assert.equal(s.renderCalls, 49); assert.equal(s.triangles, 1018);
  assert.equal(s.updateCpuMs, 2); assert.equal(s.renderCpuMs, 3);
  assert.equal(s.geometries, 12); assert.equal(s.programs, 2);
  assert.equal(r.info.resets, 1); assert.equal(r.info.autoReset, true);
  assert.equal(reports, 1);
  runFrame(p, r, 0.016, n => { now += n; });
  assert.equal(p.snapshot().renderCalls, 49); assert.equal(r.info.resets, 2);
  assert.equal(reports, 1); // 未满一秒，不排序與更新面板。
});

test('有界滾動視窗、50 ms 邊界、關閉／恢復／重設', () => {
  let now = 0;
  const p = createPerformanceMonitor({ enabled: true, capacity: 3, now: () => now });
  const r = fakeRenderer(false), tick = n => { now += n; };
  for (const dt of [0.08, 0.02, 0.04, 0.05]) runFrame(p, r, dt, tick, 1);
  const s = p.snapshot();
  assert.equal(s.sampleCount, 4); assert.equal(s.windowFrames, 3);
  assert.equal(s.p50Ms, 40); assert.equal(s.p95Ms, 50);
  assert.equal(s.longFrames, 1); assert.equal(s.windowLongFrames, 0);
  assert.equal(r.info.autoReset, false);
  p.beginFrame(null); p.beginRender(r); p.endFrame();
  assert.equal(p.snapshot().sampleCount, 4);
  p.enabled = false; assert.equal(p.snapshot(), null);
  p.enabled = true; assert.equal(p.snapshot(), null);
  runFrame(p, r, 0.016, tick, 1); assert.equal(p.snapshot().sampleCount, 1);
  p.reset(); assert.equal(p.snapshot(), null);
});

function observed(initial) {
  let writes = 0;
  const target = new Proxy(initial, { set(o, k, v) { writes++; o[k] = v; return true; } });
  return { target, writes: () => writes };
}

test('互動文字／顯示值相同時不寫入，切換／消失仍正確', () => {
  const b = observed({ hidden: true }), l = observed({ textContent: '交談' });
  updateInteraction(b.target, l.target, null);
  assert.equal(b.writes(), 0);
  updateInteraction(b.target, l.target, { label: '交談' });
  for (let i = 0; i < 120; i++) updateInteraction(b.target, l.target, { label: '交談' });
  assert.equal(b.writes(), 1); assert.equal(l.writes(), 0);
  updateInteraction(b.target, l.target, { label: '下車' });
  assert.equal(l.target.textContent, '下車'); assert.equal(l.writes(), 1);
  updateInteraction(b.target, l.target, null);
  assert.equal(b.target.hidden, true); assert.equal(b.writes(), 2);
  const style = observed({ display: '' }), prompt = { style: style.target };
  updatePromptDisplay(prompt, false); updatePromptDisplay(prompt, false);
  updatePromptDisplay(prompt, true); updatePromptDisplay(prompt, true);
  assert.equal(style.target.display, 'flex'); assert.equal(style.writes(), 2);
  // 位置計算仍在原本迴圈執行，不因互動內容未變而略過。
  const feel = fs.readFileSync(new URL('../src/systems/feel.js', import.meta.url), 'utf8');
  assert.match(feel, /pV\.set\(x,y,z\)\.project\(camera\)/);
  assert.match(feel, /promptEl\.style\.left=sx\+'px'; promptEl\.style\.top=sy\+'px'/);
});

test('標題畫面、套件與 lockfile 版本一致', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
  const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url)));
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const label = `v${pkg.version.split('.').slice(0, 2).join('.')}`;
  assert.ok(html.includes(`<div class="ver">${label}</div>`));
  assert.equal(lock.version, pkg.version); assert.equal(lock.packages[''].version, pkg.version);
});
