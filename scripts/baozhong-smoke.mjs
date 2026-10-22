// 包種茶節主要流程：正式打包、真實對話／問答 DOM、存檔重載與重入。
// debug 僅用於定位到 NPC 前方與讀取狀態，不直接設定活動或答題結果。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = JSON.parse(fs.readFileSync(path.join(root, 'src/content/baozhong.json')));
const minigames = JSON.parse(fs.readFileSync(path.join(root, 'src/content/baozhong-minigames.json')));
// v1.64 起 D26 預設是兩階段攤位：初訪玩配對小遊戲蓋章（T074，CLD-001）。
const d26 = minigames.games.find(g => g.booth === 'D26');
const server = createServer((req, res) => {
  let p = path.join(root, 'dist', decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' })[path.extname(p)] || 'application/octet-stream');
  fs.createReadStream(p).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise(resolve => server.on('listening', resolve));
let browser;
try {
  browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const url = `http://127.0.0.1:${server.address().port}/?debug`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game && window.__bz26);
  await page.click('#go');
  await page.waitForFunction(() => window.__game.state.started);
  const initial = await page.evaluate(() => window.__bz26.counts());
  assert.equal(initial.active, false);
  assert.equal(initial.passportButtons, 0);
  assert.equal(await page.evaluate(() => window.__bz26.activitySign.group.visible || window.__game.spots.includes(window.__bz26.activitySign.spot)), false);
  async function finishDialog() {
    for (let i = 0; i < 60 && await page.locator('#dlg').isVisible(); i++) await page.locator('#dlg').click();
    assert.equal(await page.locator('#dlg').isVisible(), false, '對話必須能結束');
  }
  async function approach(id) {
    await page.evaluate(id => {
      const n = id === 'host' ? window.__bz26.host : window.__bz26.venueNPCs.find(n => n.id === id || n.spot === window.__game.spots.find(s => s.id === id));
      if (!n) throw new Error('找不到 NPC ' + id);
      window.__game.teleport(n.spot.x, n.spot.z + 0.6);
    }, id);
    await page.waitForFunction(id => {
      const n = id === 'host' ? window.__bz26.host : window.__bz26.venueNPCs.find(n => n.id === id);
      return n && window.__game.state.near === n.spot;
    }, id);
    await page.keyboard.press('e');
    await page.locator('#dlg').waitFor({ state: 'visible' });
  }
  await approach('host');
  await finishDialog();
  await page.getByRole('button', { name: '好，我要參加', exact: true }).click();
  await page.waitForFunction(() => window.__bz26.counts().active && window.__bz26.counts().decorRoots === 3 && [...window.__bz26.tents.tents.values()].filter(t => t.parts.smallProp?.length).length === 37);
  const active = await page.evaluate(() => window.__bz26.counts());
  assert.equal(active.passportButtons, 1);
  const hiddenTreeColliders = await page.evaluate(() => window.__bz26.venueFocus.counts().treeColliders);
  assert.equal(active.colliders - initial.colliders + hiddenTreeColliders, 323, '原帳篷320＋鳥居2＋活動看板1，扣除活動暫收植栽');
  assert.equal(await page.evaluate(() => window.__bz26.activitySign.group.visible && window.__game.spots.includes(window.__bz26.activitySign.spot)), true);
  await approach('bz26-D26');
  fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'test-results/baozhong-D26-counter.png') });
  await finishDialog();
  await page.getByRole('button', { name: '玩小遊戲', exact: true }).click();
  await page.locator('#bz-matching').waitFor();
  assert.equal(await page.locator('#bz-matching .match-guide').count(), 0, '初訪配對不能先列出答案');
  await page.getByRole('button', { name: '開始配對' }).click();
  const left = page.locator('#bz-matching .match-column').nth(0), right = page.locator('#bz-matching .match-column').nth(1);
  for (const pair of d26.pairs) {
    await left.getByRole('button', { name: pair.left }).click();
    await right.getByRole('button', { name: pair.right }).click();
  }
  await page.getByRole('button', { name: '完成配對' }).click();
  await page.waitForFunction(() => window.__bz26.flags().has('bz26_st_D26'));
  await finishDialog();
  await page.locator('#bz-passport-button').click();
  await page.screenshot({ path: path.join(root, 'test-results/baozhong-passport.png') });
  await page.keyboard.press('p');
  await approach('host');
  await finishDialog();
  await page.getByRole('button', { name: '離開會場', exact: true }).click();
  await finishDialog();
  await page.waitForFunction(() => !window.__bz26.counts().active);
  const leftCounts = await page.evaluate(() => window.__bz26.counts());
  assert.equal(leftCounts.colliders, initial.colliders);
  assert.equal(leftCounts.passportButtons, 0);
  assert.equal(await page.evaluate(() => window.__bz26.activitySign.group.visible || window.__game.spots.includes(window.__bz26.activitySign.spot)), false);
  assert.equal(await page.evaluate(() => window.__bz26.flags().has('bz26_st_D26')), true);
  await approach('host'); await finishDialog();
  await page.getByRole('button', { name: '好，我要參加', exact: true }).click();
  await page.waitForFunction(() => window.__bz26.counts().decorRoots === 3 && [...window.__bz26.tents.tents.values()].filter(t => t.parts.smallProp?.length).length === 37);
  const reentered = await page.evaluate(() => window.__bz26.counts());
  assert.deepEqual(reentered, active, '重入不能重複建立 NPC、帳篷、碰撞與護照');
  await page.waitForFunction(() => {
    const saved = JSON.parse(localStorage.getItem('nccu100-save') || 'null');
    return saved?.flags.includes('bz26_active') && saved.flags.includes('bz26_st_D26');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__bz26?.counts().active && window.__bz26.flags().has('bz26_st_D26'));
  await page.click('#go');
  await page.waitForFunction(() => window.__bz26.counts().decorRoots === 3 && [...window.__bz26.tents.tents.values()].filter(t => t.parts.smallProp?.length).length === 37);
  assert.equal(await page.locator('#bz-passport-button').count(), 1);
  assert.deepEqual(errors, []);
  console.log('包種茶節瀏覽器主要流程通過', JSON.stringify({ initial, active, left: leftCounts, reentered, saveReload: true, pageErrors: errors }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
