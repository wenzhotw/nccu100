// 真實切片截圖證據。僅在獲准且支援瀏覽器的環境執行，不繞過環境限制。
// --static-only 不建立伺服器、不啟動瀏覽器；一般執行先重新打包。
import assert from 'node:assert/strict';
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
const sources = () => ['src', 'index.html', 'package.json', 'package-lock.json', 'vite.config.js', 'scripts/humanities-preview-screenshots.mjs'].flatMap(inventory);
for (const f of ['src/core/debug.js', 'src/systems/baozhong/index.js', 'src/systems/baozhong/open-canopy-d26.js']) assert.ok(fs.existsSync(path.join(root, f)), f);
if (process.argv.includes('--static-only')) {
  console.log(JSON.stringify({ status: 'static-only', browserLaunched: false, screenshotsCreated: false, sourceDigest: sha(JSON.stringify(sources())) }, null, 2));
  process.exit(0);
}
const beforeBuild = sources();
execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit' });
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
assert.deepEqual(sources(), beforeBuild, '打包期間來源有變更，請在穩定版本重跑');
const output = path.join(root, 'test-results', 'humanities-preview');
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
  captures: [], errors: [], profiles: [],
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
  for (const profile of [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
    { name: 'mobile-emulation', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  ]) {
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
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__game && window.__bz26);
      assert.equal(await page.evaluate(() => window.__bz26.slice), false, 'Normal URL must not enable experimental content or matching');
      await page.locator('#go').click();
      await page.waitForFunction(() => window.__game.state.started);
      await approach('host');
      await page.locator('#dlg').waitFor({ state: 'visible' });
      for (let i = 0; i < 60 && await page.locator('#dlg').isVisible(); i++) await page.locator('#dlg').click();
      await page.getByRole('button', { name: '好，我要參加', exact: true }).click();
      await page.waitForFunction(() => window.__bz26.venue.on);
      const models = await page.evaluate(() => ['D01','D02','D03'].map(id => {
        const t=window.__bz26.tents.tents.get(id), root=t.group.getObjectByName(`bz26-landmark-${id}`);
        return {id,candidate:root?.userData.humanitiesCandidate,walls:t.parts.walls.length,parts:t.parts.landmark.length,layout:t.layout};
      }));
      for(const m of models){assert.equal(m.candidate,true);assert.equal(m.walls,0);assert.ok(m.parts>5);}
      async function stage(id,eye,target){
        await page.evaluate(({id,eye,target})=>{const g=window.__bz26.tents.tents.get(id).group;g.updateWorldMatrix(true,false);const p=g.localToWorld(g.position.clone().set(0,0,3.8)),at=g.localToWorld(g.position.clone().set(...target)),e=g.localToWorld(g.position.clone().set(...eye));window.__game.teleport(p.x,p.z);window.__game.view(...e.toArray(),...at.toArray());},{id,eye,target});
      }
      // 一般遊玩鏡頭，只有瞬移定位，不代表已行走驗證路線。
      await page.evaluate(()=>{const g=window.__bz26.tents.tents.get('D01').group;g.updateWorldMatrix(true,false);const p=g.localToWorld(g.position.clone().set(0,0,3.8));window.__game.teleport(p.x,p.z);window.__game.view();Object.assign(window.__game.state,{yaw:g.rotation.y,pitch:.3,dist:6});});
      await page.waitForTimeout(1800);
      assert.equal(await page.evaluate(()=>window.__game.state.viewCam),null);
      await capture('D01-gameplay-medium',{models,cameraMode:'normal gameplay camera; teleported staging only'});
      const shots=name==='desktop'?[
        ['D01','front',[0,3.5,9],[0,2.2,1.4]],
        ['D01','close-paper-brush',[1.9,4.3,6],[0,2.8,1.8]],
        ['D02','front',[0,3.7,9],[0,2.2,1.4]],
        ['D02','page-depth-timeline',[4,4.1,7],[0,2.3,1.5]],
        ['D03','front',[0,3.7,9],[0,2.2,1.4]],
        ['D03','profile-negative-space',[3.5,4.1,7],[0,2.5,1.5]],
      ]:[['D01','front',[0,3.6,12],[0,2.1,1.4]]];
      for(const [id,label,eye,target] of shots){await stage(id,eye,target);await capture(`${id}-${label}`,{models,cameraMode:'fixed debug camera in ordinary activated venue'});}
      if(name==='desktop'){
        await page.evaluate(()=>{const groups=['D01','D02','D03'].map(id=>window.__bz26.tents.tents.get(id).group);const center=groups[0].position.clone().set(0,0,0);for(const g of groups)center.add(g.position);center.multiplyScalar(1/3);const base=groups[0];base.updateWorldMatrix(true,false);const front=base.localToWorld(base.position.clone().set(0,0,20)).sub(base.position);window.__game.view(center.x+front.x,8,center.z+front.z,center.x,1.9,center.z);});
        await capture('humanities-three-booths-context',{models,cameraMode:'fixed debug camera, existing venue layout unchanged'});
      }
      assert.deepEqual(failedRequests, [], '截圖請求失敗');
      assert.deepEqual(runtimeErrors, [], '瀏覽器出現錯誤，截圖不得標為通過');
    } catch (error) { manifest.errors.push({ profile: name, message: String(error), stack: error.stack }); try { await capture('failure-context',{error:String(error)}); } catch {} }
    finally { await context.close(); save(); }
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
