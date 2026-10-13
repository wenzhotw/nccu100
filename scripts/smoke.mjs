// 冒煙測試：打開遊戲，確認沒有錯誤、所有建築都載入、可以開始遊戲。
// 用法：npm run build && npm run smoke
import { chromium } from 'playwright';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { replacedBuildings } from '../src/world/photo-district.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = createServer((req, res) => {
  let p = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const buildings = fs.readdirSync(path.join(root, 'src/world/buildings')).filter(f => !replacedBuildings.has(f) && fs.existsSync(path.join(root, 'src/world/buildings', f, 'index.js')));
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
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
  if (await page.locator('#visitDistrict').count()) errors.push('首頁仍有探索捷徑');
  await page.click('#go');
  await page.waitForTimeout(3000);
  const districtChecks = await page.evaluate(() => {
    const g = window.__game;
    const group = g.scene.getObjectByName('法學院－教育學院照片街區');
    const issues = [];
    // 街區裡的法學院、游泳館略過不載入，改用原本的 law-school、swimming-hall（上面的「沒有載入的建築」會檢查）
    if (!group || group.children.filter(c => c.isInstancedMesh).length !== group.userData.batchCount) issues.push('模型批次不完整');
    if (Math.hypot(g.pos.x+2,g.pos.z-21) > 1) issues.push('原本的校門起點被改動');
    if (group.children.some(c => c.isInstancedMesh && !c.material.isMeshToonMaterial)) issues.push('未使用原網頁卡通材質');
    for (const lot of group.userData.lots) {
      const p = {x:lot.entry[0],y:0,z:lot.entry[1]};
      g.resolve(p);
      if (Math.hypot(p.x-lot.entry[0],p.z-lot.entry[1]) > .1) issues.push(lot.name+'入口被碰撞擋住');
      if (!g.world.mapShapes.some(s => s.label === lot.name)) issues.push(lot.name+'缺少地圖標記');
    }
    return {issues, batches:group?.children.filter(c=>c.isInstancedMesh).length};
  });
  errors.push(...districtChecks.issues);
  console.log('街區檢查：', JSON.stringify(districtChecks));
  // 每個室內房間：走進去、確認換到房間、走出來
  const roomIds = await page.evaluate(() => Object.values(window.__game.rooms).filter(r => r.def).map(r => r.id));
  for (const id of roomIds) {
    await page.evaluate(id => window.__game.enterRoom(id), id);
    await page.waitForFunction(id => window.__game.state.room === id && !window.__game.state.busy, id, { timeout: 60000 });
    const inside = await page.evaluate(() => ({ zone: window.__game.zoneOf(window.__game.pos), meshes: Object.values(window.__game.rooms).find(r => r.id === window.__game.state.room).scene.children.length }));
    if (inside.meshes < 3) errors.push(id + ' 房間是空的');
    await page.evaluate(() => window.__game.exitRoom());
    await page.waitForFunction(() => window.__game.state.room === null && !window.__game.state.busy, null, { timeout: 60000 });
    console.log('房間：', id, inside.zone);
  }
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  await page.setViewportSize({width:1100,height:720});
  await page.evaluate(() => { window.__game.teleport(-80,-57); window.__game.view(-68,65,-5,-155,5,-85); });
  await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#banner{opacity:0!important}'});
  await page.screenshot({path:path.join(root,'test-results/law-education-overview.png')});
  await page.screenshot({path:path.join(root,'test-results/law-education-overview.jpg'),quality:85});
  const mobile = await browser.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
  mobile.on('pageerror', e => errors.push(String(e)));
  await mobile.goto(`http://localhost:${port}/?debug`,{waitUntil:'domcontentloaded'});
  await mobile.waitForFunction(()=>window.__game);
  await mobile.tap('#go');
  await mobile.waitForTimeout(1000);
  if (!await mobile.locator('#stick').isVisible()) errors.push('手機搖桿未顯示');
  await mobile.evaluate(()=>{window.__game.teleport(-144,-80);window.__game.state.yaw=-Math.PI/2;});
  const beforeMove = await mobile.evaluate(()=>({x:__game.pos.x,z:__game.pos.z}));
  const stick = await mobile.locator('#stick').boundingBox();
  await mobile.locator('#stick').dispatchEvent('pointerdown',{pointerId:7,clientX:stick.x+64,clientY:stick.y+24,pointerType:'touch'});
  await mobile.waitForTimeout(1500);
  await mobile.locator('#stick').dispatchEvent('pointerup',{pointerId:7,pointerType:'touch'});
  const afterMove = await mobile.evaluate(()=>({x:__game.pos.x,z:__game.pos.z}));
  if (Math.hypot(afterMove.x-beforeMove.x,afterMove.z-beforeMove.z)<.1) errors.push('手機搖桿沒有移動角色');
  await mobile.screenshot({path:path.join(root,'test-results/law-education-mobile.png')});
  await mobile.close();
  const zone = await page.evaluate(() => window.__game.zoneOf(window.__game.pos));
  console.log('已載入建築：', loaded.join(', '));
  console.log('起點區域：', zone);
  ok = errors.length === 0;
} catch (e) { errors.push(String(e)); }
await browser.close();
server.close();
if (!ok) { console.error('冒煙測試失敗：\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('冒煙測試通過 ✓');
