// 冒煙測試：打開遊戲，確認沒有錯誤、所有建築都載入、可以開始遊戲。
// 用法：npm run build && npm run smoke
import { chromium } from 'playwright';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = createServer((req, res) => {
  let p = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const buildings = fs.readdirSync(path.join(root, 'src/world/buildings')).filter(f => fs.existsSync(path.join(root, 'src/world/buildings', f, 'index.js')));
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
let ok = false;
try {
  await page.goto(`http://localhost:${port}/?debug`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
  const loaded = await page.evaluate(() => window.__game.world.buildings.map(b => b.id));
  const missing = buildings.filter(b => !loaded.includes(b));
  if (missing.length) errors.push('沒有載入的建築：' + missing.join(', '));
  await page.click('#go');
  await page.waitForTimeout(3000);
  const zone = await page.evaluate(() => window.__game.zoneOf(window.__game.pos));
  console.log('已載入建築：', loaded.join(', '));
  console.log('起點區域：', zone);
  ok = errors.length === 0;
} catch (e) { errors.push(String(e)); }
await browser.close();
server.close();
if (!ok) { console.error('冒煙測試失敗：\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('冒煙測試通過 ✓');
