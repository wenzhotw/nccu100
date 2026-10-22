// 真實切片截圖證據。僅在獲准且支援瀏覽器的環境執行，不繞過環境限制。
// --static-only 不建立伺服器、不啟動瀏覽器；一般執行先重新打包。
import assert from 'node:assert/strict';
import { chooseNpcCaptureStance } from './npc-capture-stance.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => createHash('sha256').update(value).digest('hex');
function inventory(relative) {
  const start = path.join(root, relative);
  if (!fs.existsSync(start)) return [];
  if (fs.statSync(start).isDirectory()) return fs.readdirSync(start).sort().flatMap(n => inventory(`${relative}/${n}`));
  return [{ path: relative, sha256: sha(fs.readFileSync(start)) }];
}
const sources = () => ['src', 'scripts/npc-capture-stance.mjs', 'index.html', 'package.json', 'package-lock.json', 'vite.config.js', 'scripts/baozhong-scenery-screenshots.mjs'].flatMap(inventory);
for (const f of ['src/core/debug.js', 'src/systems/baozhong/index.js', 'src/systems/baozhong/open-canopy-d26.js']) assert.ok(fs.existsSync(path.join(root, f)), f);
if (process.argv.includes('--static-only')) {
  console.log(JSON.stringify({ status: 'static-only', browserLaunched: false, screenshotsCreated: false, sourceDigest: sha(JSON.stringify(sources())) }, null, 2));
  process.exit(0);
}
const beforeBuild = sources();
execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit' });
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
assert.deepEqual(sources(), beforeBuild, '打包期間來源有變更，請在穩定版本重跑');
const output = path.join(root, 'test-results', 'baozhong-scenery');
assert.ok(!fs.existsSync(output) || fs.readdirSync(output).length === 0, '輸出目錄必須為空，請先保留前次證據並選用乾淨工作區');
fs.mkdirSync(output, { recursive: true });
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const manifest = {
  schema: 1, startedAt: new Date().toISOString(), status: 'running',
  commit: git('rev-parse', 'HEAD'), workingTree: git('status', '--porcelain'),
  packageVersion: JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version,
  sourceFiles: beforeBuild, sourceDigest: sha(JSON.stringify(beforeBuild)), distFiles: inventory('dist'),
  query: '?debug', captureMethod: 'Playwright screenshots of freshly built application; no fixture injection or AI images',
  limitations: ['Debug teleport and fixed camera are staging only, not evidence of a walkable route.', 'Mobile means Chromium touch/viewport emulation, not a physical device.', 'Screenshots require visual review; structural assertions do not establish visual quality.'],
  captures: [], errors: [], profiles: [], storyChecks: [],
};
const save = () => fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
save();
let browser, server;
try {
  server = createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); res.end(); return; }
    let file = path.resolve(root, 'dist', `.${pathname}`);
    const dist = path.join(root, 'dist');
    if (file !== dist && !file.startsWith(dist + path.sep)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  manifest.browserVersion = browser.version();
  const url = `http://127.0.0.1:${server.address().port}/${manifest.query}`;
  const requestedProfile = process.env.SCENERY_PREVIEW_PROFILE;
  assert.ok(!requestedProfile || ['desktop','mobile-emulation'].includes(requestedProfile), 'Unknown scenery profile');
  for (const profile of [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
    { name: 'mobile-emulation', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  ].filter(p => !requestedProfile || p.name === requestedProfile)) {
    console.log(`[scenery] ${profile.name} start ${new Date().toISOString()}`);
    const { name, ...options } = profile;
    const context = await browser.newContext(options);
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    const runtimeErrors = [], failedRequests = [];
    page.on('pageerror', error => runtimeErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
    page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
    manifest.profiles.push({ ...profile, runtimeErrors, failedRequests });
    async function capture(subject, metadata = {}) {
      await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
      const evidence = await page.evaluate(() => ({
        url: location.href, player: window.__game.pos.toArray(), camera: window.__game.state.viewCam,
        active: window.__bz26.venue.on, slice: window.__bz26.slice,
        titleVersion: document.querySelector('.ver')?.textContent,
      }));
      console.log(`[scenery] ${name} ${subject} ${new Date().toISOString()}`);
      const file = `${name}-${subject}.png`;
      await page.screenshot({ path: path.join(output, file), fullPage: false });
      manifest.captures.push({ file, sha256: sha(fs.readFileSync(path.join(output, file))), subject, profile: name, ...evidence, ...metadata }); save();
    }
    async function approach(id) {
      await page.evaluate(id => {
        const n = id === 'host' ? window.__bz26.host : window.__bz26.venueNPCs.find(n => n.id === id);
        if (!n) throw new Error(`找不到 NPC ${id}`);
        window.__game.teleport(n.spot.x, n.spot.z + .6);
      }, id);
      await page.waitForFunction(id => {
        const n = id === 'host' ? window.__bz26.host : window.__bz26.venueNPCs.find(n => n.id === id);
        return n && window.__game.state.near === n.spot;
      }, id);
      await page.keyboard.press('e');
    }
    async function captureCostume(id, costumeCount, angle = 'front') {
      // 只移動玩家與鏡頭。NPC 留在原站位，讓正式轉身邏輯面向玩家，不改模型或遮擋物。
      const staging = await page.evaluate(id => {
        const n = window.__bz26.venueNPCs.find(n => n.id === `bz26-${id}`);
        if (!n?.g.userData.bz26Costume) throw new Error(`${id} 缺少正式 NPC 服裝`);
        const p = n.g.getWorldPosition(n.g.position.clone());
        return { id, npcPosition: p.toArray(), face: n.face || 0 };
      }, id);
      // D37 的原直前方3m點落在噴水池內。以正式碰撞器挑安全候選，不挪NPC或關閉碰撞。
      const stance = await page.evaluate(chooseNpcCaptureStance, { position: staging.npcPosition, face: staging.face });
      staging.player = stance.player;
      await page.evaluate(([x, , z]) => window.__game.teleport(x, z), stance.player);
      await page.waitForFunction(({ id, player, npcPosition }) => {
        const n = window.__bz26.venueNPCs.find(n => n.id === `bz26-${id}`);
        if (!n?.g.visible || !document.querySelector('#dlg').hidden) return false;
        const p = n.g.getWorldPosition(n.g.position.clone());
        const toPlayer = window.__game.pos.clone().sub(p).setY(0);
        const distance = toPlayer.length();
        const facing = n.g.getWorldDirection(p.clone()).dot(toPlayer.normalize());
        return Math.hypot(p.x - npcPosition[0], p.z - npcPosition[2]) < .01
          && Math.hypot(window.__game.pos.x - player[0], window.__game.pos.z - player[2]) < .06
          && distance > 2.9 && distance < 3.1 && facing > .99995 && !n.sp.visible;
      }, staging);
      const npc = await page.evaluate(({ id, angle }) => {
        const n = window.__bz26.venueNPCs.find(n => n.id === `bz26-${id}`), g = n.g;
        g.updateWorldMatrix(true, true);
        const p = g.getWorldPosition(g.position.clone());
        // 正面保留完整服裝；側背鏡頭繞到帳篷開口外側，人物仍面向原玩家。
        const cameraLocal = angle === 'front' ? [0, .73, 2.1] : [2.25, .85, -1];
        const eye = g.localToWorld(g.position.clone().set(...cameraLocal));
        const at = g.localToWorld(g.position.clone().set(0, .68, 0));
        window.__game.view(...eye.toArray(), ...at.toArray());
        const toPlayer = window.__game.pos.clone().sub(p).setY(0);
        const playerDistance = toPlayer.length();
        const cameraDirection = eye.clone().sub(p).setY(0).normalize();
        const forward = g.getWorldDirection(p.clone());
        let meshes = 0;
        g.traverse(o => { if (o.isMesh) meshes++; });
        return {
          id: n.id, title: n.title, costume: g.userData.bz26Costume,
          visible: g.visible, originalScene: g.parent === window.__game.scene,
          originalRig: n.rig.parent === g, meshes, position: p.toArray(), scale: g.scale.toArray(),
          facingPlayer: forward.dot(toPlayer.normalize()), facingCamera: forward.dot(cameraDirection),
          playerDistance, cameraDistance: Math.hypot(eye.x - p.x, eye.z - p.z),
          cameraLocal, targetLocal: [0, .68, 0],
        };
      }, { id, angle });
      assert.equal(npc.id, `bz26-${id}`); assert.equal(npc.costume.id, id);
      assert.ok(npc.visible && npc.originalScene && npc.originalRig && npc.meshes > 0, `${id} 必須為原場景內可見的正式 NPC`);
      assert.ok(npc.facingPlayer > .99995, `${id} 必須維持面向玩家`);
      if (angle === 'front') {
        assert.ok(npc.facingCamera > .99995, `${id} 正面樣本必須面向鏡頭`);
        assert.ok(npc.playerDistance - npc.cameraDistance > .3, `${id} 玩家必須留在正面鏡頭後方`);
      } else assert.ok(npc.facingCamera < -.3, `${id} 側背樣本必須看到背面`);
      await capture(`${id}-npc-costume-${angle}`, { costumeCount, npc, stance });
    }
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__game && window.__bz26);
      assert.equal(await page.evaluate(() => window.__bz26.slice), false, 'Normal URL must not enable experimental content or matching');
      await page.locator('#go').click();
      await page.waitForFunction(() => window.__game.state.started);
      assert.equal(await page.evaluate(() => window.__bz26.activitySign?.group.visible), false, '入場前看板隱藏');
      assert.equal(await page.locator('#bz-activity-button').isVisible(), false, '入場前地圖按鈕隱藏');
      await approach('host');
      await page.locator('#dlg').waitFor({ state: 'visible' });
      for (let i = 0; i < 60 && await page.locator('#dlg').isVisible(); i++) await page.locator('#dlg').click();
      await page.getByRole('button', { name: '好，我要參加', exact: true }).click();
      await page.waitForFunction(() => window.__bz26.venue.on);
      const model = await page.evaluate(() => {
        const T = window.__bz26.tents.tents.get('D26');
        return { open: T.group.userData.bz26OpenCanopy, walls: T.parts.walls.length, roofParts: T.parts.canopy.length,
          tentPoles: T.parts.frame.filter(m => m.geometry.type === 'CylinderGeometry').length,
          toriiPosts: T.parts.landmark?.filter(m => m.userData.bz26ToriiPost).length, layout: T.layout };
      });
      assert.equal(model.open, false); assert.equal(model.walls, 3); assert.equal(model.tentPoles, 4); assert.equal(model.toriiPosts, 2); assert.ok(model.roofParts > 0);
      for (const [angle, local] of [['front', [0, 4.2, 9]], ['three-quarter', [6, 4.2, 7]]]) {
        await page.evaluate(local => {
          const T = window.__bz26.tents.tents.get('D26'), g = T.group;
          g.updateWorldMatrix(true, false);
          const at = g.localToWorld(g.position.clone().set(0, 1.4, .4));
          const eye = g.localToWorld(g.position.clone().set(...local));
          const player = g.localToWorld(g.position.clone().set(0, 0, 3.5));
          window.__game.teleport(player.x, player.z); window.__game.view(...eye.toArray(), ...at.toArray());
        }, local);
        await capture(`D26-${angle}`, { model });
      }
      const ids=name==='desktop'?['D01','D07','D11','D16','D21','D22','D27','D30','D31','D32','D37']:['D22','D37'];
      for(const id of ids){
        const evidence=await page.evaluate(id=>{const t=window.__bz26.tents.tents.get(id),g=t.group;g.updateWorldMatrix(true,false);const at=g.localToWorld(g.position.clone().set(0,1.7,0)),eye=g.localToWorld(g.position.clone().set(-4,4.2,8)),p=g.localToWorld(g.position.clone().set(0,0,3.5));window.__game.teleport(p.x,p.z);window.__game.view(...eye.toArray(),...at.toArray());return {id,walls:t.parts.walls.length,parts:t.parts.smallProp.length};},id);
        assert.equal(evidence.walls,3);assert.ok(evidence.parts>0);await capture(`${id}-landmark`,{evidence});
      }
      const costumeInventory = await page.evaluate(() => window.__bz26.venueNPCs
        .filter(n => n.g.userData.bz26Costume)
        .map(n => ({ id: n.id, costume: n.g.userData.bz26Costume }))
        .sort((a, b) => a.id.localeCompare(b.id)));
      assert.equal(costumeInventory.length, 39, '正式活動必須掛載37系與2關主共39位服裝NPC');
      assert.equal(new Set(costumeInventory.map(n => n.id)).size, 39, '服裝 NPC 不得重複');
      for (const n of costumeInventory) assert.equal(n.id, `bz26-${n.costume.id}`);
      manifest.profiles.find(profile => profile.name === name).costumeNPCs = costumeInventory;
      const costumeIds = name === 'desktop'
        ? ['D02', 'D03', 'D04', 'D10', 'D20', 'D35', 'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D26', 'D27', 'D31', 'D01', 'D19', 'D21', 'D37']
        : ['D03', 'D04', 'D10', 'D35', 'D11', 'D13', 'D26', 'D27', 'D31', 'D37'];
      for (const id of costumeIds) await captureCostume(id, costumeInventory.length);
      if (name === 'desktop') {
        for (const id of ['D26', 'D21', 'D04']) await captureCostume(id, costumeInventory.length, 'back-three-quarter');
      }
      const sign=await page.evaluate(()=>{const s=window.__bz26.activitySign;if(!s||!s.group.parent||!s.group.visible||!window.__game.spots.includes(s.spot))return null;const p=s.group.position;window.__game.teleport(s.spot.x,s.spot.z+.6);window.__game.view(p.x+5,p.y+4.5,p.z+11,p.x,p.y+2,p.z);return {placement:s.placement,fountain:s.fountain};});
      if(!sign){manifest.signFailure=await page.evaluate(()=>({error:window.__bz26.activitySignError,colliders:window.__game.colliders}));save();}
      assert.ok(sign,'活動看板必須實際存在並有互動點');await capture('fountain-2026-guide',{sign});
      await page.waitForFunction(()=>window.__game.state.near===window.__bz26.activitySign.spot);await page.keyboard.press('e');
      await page.locator('#bz-activity-map').waitFor({state:'visible'});
      assert.equal(await page.getByRole('searchbox',{name:'搜尋學系或攤號'}).inputValue(),'','E開圖不得漏進搜尋');
      assert.equal(await page.locator('#bz-activity-map .bz-map-list button').count(),40);
      await capture('guide-all40',{renderedText:await page.locator('#bz-activity-map').innerText()});
      await page.getByRole('searchbox',{name:'搜尋學系或攤號'}).fill('D26');
      await page.locator('button[data-booth-id="D26"]').click();assert.equal(await page.evaluate(()=>window.__bz26.activityMap.target?.id),'D26');
      await page.getByRole('button',{name:'活動地圖 G',exact:true}).click();await capture('guide-D26-selected');
      await page.getByRole('button',{name:'關閉',exact:true}).click();
      const lifecycle=await page.evaluate(()=>{const b=window.__bz26;const active=b.venueFocus.counts();b.leave();const off=b.venueFocus.counts();const signOff={visible:b.activitySign.group.visible,spot:window.__game.spots.includes(b.activitySign.spot),button:document.querySelector('#bz-activity-button').hidden};b.accept();return {active,off,signOff,again:b.venueFocus.counts()};});
      assert.deepEqual(lifecycle.signOff,{visible:false,spot:false,button:true});assert.ok(lifecycle.active.trees>0);assert.ok(lifecycle.active.npcs>0);assert.equal(lifecycle.off.trees,0);assert.deepEqual(lifecycle.active,lifecycle.again);
      await capture('venue-reentry',{lifecycle});
      assert.deepEqual(runtimeErrors, [], '瀏覽器出現錯誤，截圖不得標為通過');
    } catch (error) { manifest.errors.push({ profile: name, message: String(error), stack: error.stack }); try { await capture('failure-context',{error:String(error)}); } catch {} }
    finally { await context.close(); save(); }
  }
  // 獨立存檔與場景驗證正常距離觸發，不呼叫 encounter、wakeLion 等劇情捷徑。
  for (const subject of ['lion-festival-pause', 'missionary-festival-pause']) {
    console.log(`[scenery] ${subject} ${new Date().toISOString()}`);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    const check = { subject, status: 'running', runtimeErrors: [] };
    manifest.storyChecks.push(check); save();
    page.on('pageerror', error => check.runtimeErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') check.runtimeErrors.push(message.text()); });
    const snapshot = () => page.evaluate(() => ({
      active: window.__bz26.venue.on, player: window.__game.pos.toArray(),
      busy: !!window.__game.state.busy, raining: window.__weather.raining,
      missionaryMet: !!window.__game.state.missionaryMet,
      missionaries: [window.__missionaries.lead, window.__missionaries.buddy]
        .map(n => ({ id: n.id, state: n.state, visible: n.g.visible, position: n.g.position.toArray() })),
      dialogVisible: !document.querySelector('#dlg').hidden,
      dialogName: document.querySelector('#dname').textContent,
    }));
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__game && window.__bz26 && window.__weather && window.__missionaries);
      await page.locator('#go').click();
      await page.waitForFunction(() => window.__game.state.started);
      await page.evaluate(subject => {
        window.__bz26.accept();
        if (subject === 'lion-festival-pause') window.__game.teleport(-46, -79);
        else { const p = window.__missionaries.lead.g.position; window.__game.teleport(p.x, p.z + 1); }
      }, subject);
      check.pausedWaitMs = subject === 'lion-festival-pause' ? 2000 : 16000;
      await page.waitForTimeout(check.pausedWaitMs);
      check.paused = await snapshot(); save();
      assert.ok(check.paused.active && !check.paused.busy && !check.paused.raining, '活動中不得觸發石獅或雨劇情');
      assert.equal(check.paused.dialogVisible, false, '活動中不得彈出劇情對話');
      if (subject === 'lion-festival-pause') {
        await page.evaluate(() => { window.__bz26.leave(); window.__game.teleport(-46, -79); });
        await page.waitForFunction(() => window.__game.state.busy, null, { timeout: 15000 });
      } else {
        assert.equal(check.paused.missionaryMet, false, '活動中不得消耗傳教士首次遭遇旗標');
        for (const n of check.paused.missionaries) {
          assert.equal(n.visible, false, `${n.id} 活動中應隱藏`);
          assert.notEqual(n.state, 'chase', `${n.id} 活動中不得追逐`);
        }
        await page.evaluate(() => { window.__bz26.leave(); window.__game.teleport(0, 14); });
        check.resumedWaitMs = 16000;
        await page.waitForTimeout(check.resumedWaitMs);
        await page.evaluate(() => { const p = window.__missionaries.lead.g.position; window.__game.teleport(p.x, p.z + 1); });
        await page.waitForFunction(() => window.__game.state.missionaryMet, null, { timeout: 15000 });
      }
      check.resumed = await snapshot();
      assert.equal(check.resumed.active, false);
      assert.deepEqual(check.runtimeErrors, [], '劇情生命週期驗證出現瀏覽器錯誤');
      check.status = 'passed';
    } catch (error) {
      check.status = 'failed'; check.error = String(error);
      try { check.failureContext = await snapshot(); } catch {}
      manifest.errors.push({ subject, message: String(error), stack: error.stack });
    } finally { await context.close(); save(); }
  }
  assert.deepEqual(sources(), beforeBuild, '執行期間來源已變更，證據版本不一致');
  assert.deepEqual(inventory('dist'), manifest.distFiles, '執行期間打包內容已變更');
  manifest.status = manifest.errors.length ? 'failed' : 'captured-needs-visual-review';
} catch (error) {
  manifest.status = 'failed'; manifest.errors.push({ message: String(error), stack: error.stack });
} finally {
  if (browser) await browser.close();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  manifest.finishedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({ output, status: manifest.status, captures: manifest.captures.length }, null, 2));
  process.exitCode = manifest.status === 'failed' ? 1 : 0;
}
