// 真實 Chromium WebGL 驗收；debug 只定位和讀取狀態，不替代互動、移動、活動或存檔流程。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const profile = process.env.ARCH_PROFILE || 'desktop';
assert.ok(['desktop', 'mobile'].includes(profile), 'Unknown ARCH_PROFILE');
const root = process.cwd(), dist = path.join(root, 'dist');
const output = path.resolve(process.env.OUT || `test-results/festival-arch/${profile}`);
fs.mkdirSync(output, { recursive: true });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const report = {
  status: 'running', profile, startedAt: new Date().toISOString(),
  commit: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'),
  modelSHA256: digest(fs.readFileSync('src/systems/baozhong/balloon-arch.js')),
  sourceSHA256: Object.fromEntries(['src/main.js', 'src/systems/baozhong/festival-arch.js', 'src/systems/baozhong/festival-arch-logic.js'].map(p => [p, digest(fs.readFileSync(p))])),
  bundleSHA256: Object.fromEntries(fs.readdirSync(path.join(dist, 'assets')).filter(f => /\.(js|css)$/.test(f)).map(f => [f, digest(fs.readFileSync(path.join(dist, 'assets', f)))])),
  checks: {}, captures: [], errors: [], stages: [],
  limitations: ['Debug teleport stages each independent route; only the recorded key-driven segments prove walking.', 'Mobile is Chromium touch/viewport emulation, not a physical device.', 'Fixed-camera captures are labeled; the approach capture uses the normal follow camera.'],
};
const save = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
const stage = name => { report.lastStage = name; report.stages.push({ name, at: new Date().toISOString() }); save(); console.log(`[${new Date().toISOString()}] ${profile}: ${name}`); };
let browser, context, page;
const server = createServer((req, res) => {
  let file;
  try { file = path.resolve(dist, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`); }
  catch { res.writeHead(400).end(); return; }
  if (file !== dist && !file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
try {
  stage('boot');
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  report.browser = browser.version();
  context = await browser.newContext(profile === 'mobile' ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
  page = await context.newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', error => { report.errors.push(String(error)); save(); });
  await page.goto(`http://127.0.0.1:${server.address().port}/?debug=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game && window.__bz26 && window.__bz26arch);
  await page.locator('#go').click();
  await page.waitForFunction(() => window.__game.state.started);
  report.webgl = await page.locator('#stage canvas').evaluate(canvas => { const gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); return gl && { version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER), width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, lost: gl.isContextLost() }; });
  assert.ok(report.webgl && !report.webgl.lost && report.webgl.width > 0 && report.webgl.height > 0, 'A live WebGL context is required');
  const position = () => page.evaluate(() => ({ x: __game.pos.x, z: __game.pos.z, time: __game.state.time, room: __game.state.room }));
  const snapshot = () => page.evaluate(() => {
    const A = __bz26arch, G = __game; let count = 0;
    G.scene.traverse(o => { if (o.name === 'bz26-balloon-arch') count++; });
    return { active: A.arch.active, builds: A.arch.builds, visible: !!A.arch.group?.visible, inScene: count,
      colliders: G.colliders.filter(c => c.owner === 'bz26-arch').length, conflicts: A.conflicts, triangles: A.triangles(),
      position: A.arch.group?.position.toArray() || null, flag: G.state.flags.has('bz26_active') };
  });
  const verifyActive = s => { assert.equal(s.flag, true); assert.equal(s.active, true); assert.equal(s.visible, true); assert.equal(s.builds, 1); assert.equal(s.inScene, 1); assert.equal(s.colliders, 2); assert.deepEqual(s.conflicts, []); assert.deepEqual(s.position, [0, 0, -66]); assert.equal(s.triangles, 10996); };
  const teleport = async (x, z, yaw = 0, pitch = 0.12) => {
    await page.evaluate(([x, z, yaw, pitch]) => { __game.view(); __game.teleport(x, z); __game.state.yaw = yaw; __game.state.pitch = pitch; }, [x, z, yaw, pitch]);
    // Let residual velocity decay and near-interaction selection update on real game frames.
    const t = (await position()).time;
    await page.waitForFunction(t => __game.state.time >= t + 0.5, t);
  };
  const capture = async (name, camera) => {
    stage(`capture:${name}`); await page.evaluate(() => document.fonts.ready);
    const file = `${profile}-${name}.png`; await page.screenshot({ path: path.join(output, file), timeout: 120000 });
    report.captures.push({ file, sha256: digest(fs.readFileSync(path.join(output, file))), camera, commit: report.commit, tree: report.tree, modelSHA256: report.modelSHA256 }); save();
  };
  const readDialog = async () => {
    let presses = 0;
    while (await page.locator('#dlg').isVisible()) {
      assert.ok(presses++ < 50, 'Dialog did not finish after 50 E presses');
      await page.keyboard.press('e');
    }
  };
  const talkHost = async () => {
    const h = await page.evaluate(() => ({ x: __bz26.host.spot.x, z: __bz26.host.spot.z }));
    await teleport(h.x, h.z + 1.2);
    await page.waitForFunction(() => __game.state.near === __bz26.host.spot && !__game.state.busy);
    await page.keyboard.press('e'); await page.locator('#dlg').waitFor({ state: 'visible' }); await readDialog();
  };
  const walkUntil = async (targetZ, description) => {
    stage(description); await page.keyboard.down('w');
    try { await page.waitForFunction(z => __game.pos.z <= z, targetZ, { timeout: 120000, polling: 100 }); }
    finally { await page.keyboard.up('w'); }
    return position();
  };

  report.placement = await page.evaluate(() => __bz26arch.placement);
  const P = report.placement, R = P.pillars[1];
  const nearbyNonArchColliders = () => page.evaluate(R => {
    // 只看右柱穿越段及其後原有花台；不把活動其他區域收放的樹木算成異常。
    const region = { x0: R.x - 1.2, x1: R.x + 1.2, z0: R.z - 3, z1: R.z + 3 };
    const bounds = c => c.c ? { x0: c.x - c.r, x1: c.x + c.r, z0: c.z - c.r, z1: c.z + c.r }
      : c.obb ? (() => { const hx = Math.abs(c.hx * c.cs) + Math.abs(c.hz * c.sn), hz = Math.abs(c.hx * c.sn) + Math.abs(c.hz * c.cs); return { x0: c.cx - hx, x1: c.cx + hx, z0: c.cz - hz, z1: c.cz + hz }; })() : c;
    const colliders = __game.colliders.filter(c => {
      if (c.owner === 'bz26-arch') return false;
      const b = bounds(c); return b.x0 <= region.x1 && b.x1 >= region.x0 && b.z0 <= region.z1 && b.z1 >= region.z0;
    }).map(c => Object.fromEntries(Object.entries(c).sort(([a], [b]) => a.localeCompare(b))));
    colliders.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return { region, colliders };
  }, R);
  assert.equal(P.x, 0); assert.equal(P.z, -66);
  report.checks.before = await snapshot();
  assert.equal(report.checks.before.active, false); assert.equal(report.checks.before.inScene, 0); assert.equal(report.checks.before.colliders, 0);
  stage('before-event:no-model-no-collision');

  await talkHost();
  await page.getByRole('button', { name: '好，我要參加', exact: true }).click();
  await readDialog();
  await page.waitForFunction(() => __bz26.counts().active && __bz26arch.arch.active);
  report.checks.accept = await snapshot(); verifyActive(report.checks.accept); stage('accepted:one-model-two-colliders');
  report.checks.preservedNonArchColliders = { before: await nearbyNonArchColliders() }; save();

  await teleport(P.x + 0.5, P.z + 20, 0, 0.12);
  assert.equal(await page.evaluate(() => __game.state.viewCam), null);
  await capture('approach-normal-camera', 'normal player follow camera');
  if (profile === 'mobile') {
    await teleport(P.x + 0.5, P.z + 35, 0, 0.12);
    assert.equal(await page.evaluate(() => __game.state.viewCam), null);
    report.checks.mobileDistantNormalView = { position: await position(), viewCam: null, approachDistance: 35 };
    await capture('approach-distant-normal-camera', 'normal player follow camera, player staged 35m before arch');
  }
  // 直式只拉遠這張標明 debug 的構圖，正常跟隨鏡頭與場景完全不變。
  await page.evaluate(({ P, profile }) => profile === 'mobile'
    ? __game.view(P.x + 1, 5.5, P.z + 43, P.x, 4, P.z)
    : __game.view(P.x + 3, 3.2, P.z + 24, P.x, 5, P.z - 6), { P, profile });
  await capture('arch-hall-context', 'debug fixed camera, unmodified live game scene');

  await teleport(P.x, P.z + 6);
  const beforeWalk = await position();
  const afterWalk = await walkUntil(P.z - 2.7, 'walk-through:center');
  assert.ok(beforeWalk.z > P.z + 5); assert.ok(afterWalk.z < P.z - 2.5); assert.ok(afterWalk.z > -72, 'Walking test must stop before the hall door');
  assert.ok(Math.abs(afterWalk.x - P.x) < 0.5, 'Center passage must not shove player sideways');
  assert.equal(afterWalk.room, null);
  report.checks.centerWalk = { before: beforeWalk, after: afterWalk }; stage('center-passage:passed');

  await teleport(R.x, R.z + 4);
  const beforePillar = await position();
  stage('walk-against:right-pillar'); await page.keyboard.down('w');
  try { await page.waitForFunction(t => __game.state.time >= t + 2.5, beforePillar.time, { timeout: 120000, polling: 100 }); }
  finally { await page.keyboard.up('w'); }
  const afterPillar = await position(), distance = Math.hypot(afterPillar.x - R.x, afterPillar.z - R.z);
  assert.ok(beforePillar.z - afterPillar.z > 2, 'Player must actually approach the pillar');
  assert.ok(afterPillar.z > R.z, 'Player must remain on the approach side');
  assert.ok(Math.abs(afterPillar.x - R.x) < 0.1, 'Player must not slip around pillar');
  assert.ok(distance >= R.r + 0.4 - 0.02 && distance <= R.r + 0.4 + 0.08, 'Player must stop at the arch collider, not an unrelated object');
  report.checks.pillarBlocks = { before: beforePillar, after: afterPillar, distance }; stage('pillar-collision:passed');

  // Stage outside the door, then press the genuine interaction key. Never call enterRoom/exitRoom.
  await teleport(0, -73.5);
  await page.waitForFunction(() => __game.state.near?.id === 'siwei-hall-enter' && !__game.state.busy);
  await page.keyboard.press('e');
  await page.waitForFunction(() => __game.state.room === 'siwei-hall' && !__game.state.busy);
  report.checks.enterHall = await position(); stage('E-enter-hall:passed');
  const exit = await page.evaluate(() => { const s = __game.spots.find(s => s.id === 'siwei-hall-exit'); return { x: s.x, z: s.z }; });
  await teleport(exit.x, exit.z - 0.5);
  await page.waitForFunction(() => __game.state.near?.id === 'siwei-hall-exit' && !__game.state.busy);
  await page.keyboard.press('e');
  await page.waitForFunction(() => __game.state.room === null && !__game.state.busy);
  report.checks.exitHall = await position(); verifyActive(await snapshot()); stage('E-exit-hall:passed');

  await talkHost(); await page.getByRole('button', { name: '離開會場', exact: true }).click(); await readDialog();
  await page.waitForFunction(() => !__bz26arch.arch.active);
  report.checks.leave = await snapshot();
  assert.equal(report.checks.leave.flag, false); assert.equal(report.checks.leave.active, false); assert.equal(report.checks.leave.visible, false); assert.equal(report.checks.leave.colliders, 0); assert.equal(report.checks.leave.inScene, 1);
  stage('leave:hidden-no-colliders');
  report.checks.preservedNonArchColliders.after = await nearbyNonArchColliders();
  assert.deepEqual(report.checks.preservedNonArchColliders.after, report.checks.preservedNonArchColliders.before, 'Existing nearby non-arch collisions must remain unchanged');
  assert.ok(report.checks.preservedNonArchColliders.after.colliders.some(c => c.x0 === 4.9 && c.x1 === 8.1 && c.z0 === -68.55 && c.z1 === -67.45), 'The original hall planter must remain present');
  report.checks.preservedNonArchColliders.reason = 'siwei-hall/exterior.js registers the existing planter at x=4.9..8.1, z=-68.55..-67.45. With player radius 0.4 it blocks at z=-67.05. The removed-pillar route stops at z=-66.8, beyond the former pillar center but before this unchanged planter. No scene or collider mutation is performed by this test.';
  stage('nearby-original-planter:unchanged');
  // 走進原柱的碰撞範圍，證明不只是報表歸零。不可要求穿過後方原有花台：
  // siwei-hall/exterior.js 的花台前緣 z=-67.45，角色半徑 0.4，實際擋在 -67.05。
  // 原拱門柱若仍存在會擋在 -64.98；終點 -66.8 明確在柱後、花台之前。
  await teleport(R.x, R.z + 3);
  report.checks.removedPillarWalk = await walkUntil(R.z - 0.8, 'walk-through:removed-pillar');
  assert.ok(report.checks.removedPillarWalk.z <= R.z - 0.75, 'Must cross the former pillar center');
  assert.ok(Math.abs(report.checks.removedPillarWalk.x - R.x) < 0.1, 'Must cross the removed pillar footprint, not go around it');
  assert.ok(report.checks.removedPillarWalk.z > -67.2, 'Do not mistake the original hall planter for an arch collision');
  stage('removed-pillar:walked-through');
  await talkHost(); await page.getByRole('button', { name: '好，我要參加', exact: true }).click(); await readDialog();
  await page.waitForFunction(() => __bz26arch.arch.active);
  report.checks.reenter = await snapshot(); verifyActive(report.checks.reenter); stage('reenter:one-model-two-colliders');

  await teleport(P.x, P.z + 14);
  await page.waitForFunction(() => { const s = JSON.parse(localStorage.getItem('nccu100-save') || 'null'); return s?.flags?.includes('bz26_active') && s.spot && Math.abs(s.spot.z - (__bz26arch.placement.z + 14)) < 0.5; });
  report.checks.saved = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('nccu100-save')); return { active: s.flags.includes('bz26_active'), spot: s.spot }; });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game && window.__bz26arch?.arch.active);
  await page.locator('#go').click(); await page.waitForFunction(() => __game.state.started);
  report.checks.reload = await snapshot(); verifyActive(report.checks.reload);
  await capture('after-save-reload', 'normal player follow camera'); stage('reload:one-model-two-colliders');
  for (const required of ['before', 'accept', 'centerWalk', 'pillarBlocks', 'enterHall', 'exitHall', 'leave', 'preservedNonArchColliders', 'removedPillarWalk', 'reenter', 'saved', 'reload']) assert.ok(report.checks[required], `Missing required check: ${required}`);
  if (profile === 'mobile') assert.ok(report.checks.mobileDistantNormalView, 'Mobile must include the distant normal follow-camera view');
  assert.equal(report.captures.length, profile === 'mobile' ? 4 : 3, 'Every required capture must exist');
  assert.deepEqual(report.errors, [], 'Browser page errors are failures');
  report.status = 'passed'; stage('all-required-checks:passed');
} catch (error) {
  report.status = 'failed'; report.failure = String(error?.stack || error); save(); console.error(error); process.exitCode = 1;
  if (page && !page.isClosed()) {
    let diagnosticTimer;
    try {
      report.failureDiagnostics = await Promise.race([
        page.evaluate(() => {
          const G = window.__game, A = window.__bz26arch;
          if (!G) return { ready: false, url: location.href };
          const p = G.pos;
          const close = c => c.c ? Math.hypot(c.x - p.x, c.z - p.z) < c.r + 5
            : c.obb ? Math.hypot(c.cx - p.x, c.cz - p.z) < Math.hypot(c.hx, c.hz) + 5
              : p.x >= c.x0 - 5 && p.x <= c.x1 + 5 && p.z >= c.z0 - 5 && p.z <= c.z1 + 5;
          return { position: { x: p.x, y: p.y, z: p.z }, time: G.state.time, room: G.state.room,
            busy: G.state.busy, started: G.state.started, grounded: G.state.grounded, yaw: G.state.yaw,
            near: G.state.near && { id: G.state.near.id, label: G.state.near.label },
            dialogVisible: !document.querySelector('#dlg')?.hidden, dialogText: document.querySelector('#dlg')?.innerText,
            flags: [...G.state.flags], archActive: A?.arch.active, archColliders: G.colliders.filter(c => c.owner === 'bz26-arch'),
            nearbyColliders: G.colliders.filter(close) };
        }),
        new Promise((_, reject) => { diagnosticTimer = setTimeout(() => reject(new Error('Failure diagnostics timed out')), 10000); }),
      ]);
      console.error('Failure diagnostics:', JSON.stringify(report.failureDiagnostics));
    } catch (diagnosticError) { report.failureDiagnostics = { error: String(diagnosticError) }; }
    finally { clearTimeout(diagnosticTimer); save(); }
  }
} finally {
  report.finishedAt = new Date().toISOString(); save();
  await context?.close().catch(() => {}); await browser?.close().catch(() => {});
  if (server.listening) await new Promise(resolve => server.close(resolve));
}
