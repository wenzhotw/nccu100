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
const programs = JSON.parse(fs.readFileSync(path.join(root, 'src/content/baozhong-programs.json')));
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
  await page.waitForFunction(() => window.__game && window.__bz26 && window.__bz26arch);
  await page.click('#go');
  await page.waitForFunction(() => window.__game.state.started);
  const initial = await page.evaluate(() => window.__bz26.counts());
  assert.equal(initial.active, false);
  const archColliderCount = () => page.evaluate(() => window.__game.colliders.filter(c => c.owner === 'bz26-arch').length);
  assert.equal(await archColliderCount(), 0, '活動前沒有拱門碰撞');
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
  // v1.69：開始畫面多一顆「參加包種茶節」；走近邀請人時頭上有邀請泡泡。
  assert.equal(await page.locator('#bzGo').count(), 1);
  await approach('host');
  assert.equal(await page.evaluate(() => window.__bz26.host.bubble), '你想要來包種茶節嗎？我帶你去吧。');
  await finishDialog();
  await page.getByRole('button', { name: '好，我要參加', exact: true }).click();
  await page.waitForFunction(() => window.__bz26arch.arch.active && window.__bz26radio?.active && window.__bz26programs?.active && window.__bz26.counts().active && window.__bz26.counts().decorRoots === 3 && [...window.__bz26.tents.tents.values()].filter(t => t.parts.smallProp?.length).length === 37);
  const active = await page.evaluate(() => window.__bz26.counts());
  assert.equal(active.passportButtons, 1);
  const hiddenTreeColliders = await page.evaluate(() => window.__bz26.venueFocus.counts().treeColliders);
  const archColliders = await archColliderCount();
  assert.equal(archColliders, 2, '新版拱門只有兩根柱子碰撞');
  // v1.69 政大之聲電台棚：棚身一個方塊、喇叭一個圓，會場開時才加入。
  const radioColliders = await page.evaluate(() => window.__game.colliders.filter(c => c.owner === 'bz26-radio').length);
  assert.equal(radioColliders, 2, '電台棚只有棚身與喇叭兩個碰撞');
  // v1.70 跨域學程帳篷：整頂一個方塊碰撞。
  const programsColliders = await page.evaluate(() => window.__game.colliders.filter(c => c.owner === 'bz26-programs').length);
  assert.equal(programsColliders, 1, '跨域學程帳篷只有一個碰撞');
  const programsHidden = await page.evaluate(() => window.__bz26programs.hiddenTreeColliders);
  assert.equal(active.colliders - initial.colliders + hiddenTreeColliders + programsHidden - archColliders - radioColliders - programsColliders, 323, '保留原帳篷320＋鳥居2＋活動看板1基線，另計拱門兩柱、電台棚兩個與跨域學程帳篷一個碰撞，扣除活動暫收植栽（含學程帳篷底下）');
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
  // v1.67 新模板：排序、找錯、組合各實際玩一攤（資料裡第一個該類型的攤位），全部答對並確認蓋章。
  for (const type of ['sort', 'spot', 'build']) {
    const g = minigames.games.find(x => x.type === type);
    if (!g) continue;
    await approach(`bz26-${g.booth}`);
    await finishDialog();
    await page.getByRole('button', { name: '玩小遊戲', exact: true }).click();
    await page.locator('#bz-stage').waitFor();
    await page.getByRole('button', { name: '開始', exact: true }).click();
    if (type === 'sort') {
      for (const c of g.cards) await page.locator(`#bz-stage button[data-card="${c.id}"]`).click();
    } else {
      for (let i = 0; i < g.steps.length; i++) {
        const s = g.steps[i];
        if (type === 'spot') await page.locator(`#bz-stage button[data-option="${s.answer}"]`).click();
        else { for (const k of s.target) await page.locator(`#bz-stage button[data-part="${k}"]`).click(); await page.getByRole('button', { name: '送出', exact: true }).click(); }
        await page.getByRole('button', { name: i + 1 < g.steps.length ? '下一題' : '看結果', exact: true }).click();
      }
    }
    await page.screenshot({ path: path.join(root, `test-results/baozhong-${type}-${g.booth}.png`) });
    await page.getByRole('button', { name: '完成', exact: true }).click();
    await page.waitForFunction(id => window.__bz26.flags().has('bz26_st_' + id) && window.__bz26.flags().has('bz26_pf_' + id), g.booth);
    await finishDialog();
  }
  // v1.69 政大之聲電台棚：走到正面玻璃前和主播說話，Call in 三題全對拿隱藏章。
  assert.equal(await page.evaluate(() => window.__bz26.host.bubble), null, '參加後邀請泡泡收掉');
  await page.waitForFunction(() => window.__bz26radio?.active);
  const radio = await page.evaluate(() => { const r = window.__bz26radio; return { x: r.placement.x, z: r.placement.z, conflicts: r.placement.conflicts.length, box: r.placement.box }; });
  assert.equal(radio.conflicts, 0, '電台棚位置不能壓到既有物件');
  await page.evaluate(([x, z]) => { window.__game.teleport(x + 0.9, z + 0.45); window.__game.state.yaw = Math.PI / 2; }, [radio.box.x1, radio.z]);
  await page.waitForFunction(() => window.__game.state.near?.label === '和主播說話');
  await page.screenshot({ path: path.join(root, 'test-results/baozhong-radio-booth.png') });
  await page.keyboard.press('e'); await page.locator('#dlg').waitFor({ state: 'visible' });
  await finishDialog();
  await page.getByRole('button', { name: '我要 Call in', exact: true }).click();
  await page.locator('#bz-stage').waitFor();
  await page.getByRole('button', { name: '開始', exact: true }).click();
  for (let i = 0; i < 3; i++) {
    const prompt = (await page.locator('#bz-stage .st-prompt').innerText()).trim();
    const answer = { '政大之聲的頻率是？': 'FM88.7', '政大之聲每天大約直播幾小時？': '約 16 小時', '政大之聲是哪個學院的實習電台？': '傳播學院' }[prompt];
    assert.ok(answer, `Call in 題目：${prompt}`);
    await page.locator('#bz-stage .st-options button', { hasText: answer }).click();
    await page.getByRole('button', { name: i < 2 ? '下一題' : '看結果', exact: true }).click();
  }
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await page.waitForFunction(() => window.__bz26.flags().has('bz26_hs_RADIO'));
  await finishDialog();
  // v1.70 跨域學程帳篷：第一句說明校內雙主修；人工智慧應用的排序小遊戲全對蓋學程章。
  const pg = await page.evaluate(() => { const r = window.__bz26programs; return { conflicts: r.placement.conflicts.length, box: r.placement.box, npcs: r.programNpcs.map(n => ({ id: n.id, x: n.spot.x, z: n.spot.z })) }; });
  assert.equal(pg.conflicts, 0, '跨域學程帳篷位置不能壓到既有物件');
  const p04 = pg.npcs.find(n => n.id === 'bz26-pg-P04');
  await page.evaluate(([x, z]) => { window.__game.teleport(x + 0.9, z); window.__game.state.yaw = Math.PI / 2; }, [pg.box.x1, p04.z]);
  await page.waitForFunction(() => window.__game.state.near === window.__bz26programs.programNpcs[3].spot);
  await page.screenshot({ path: path.join(root, 'test-results/baozhong-programs-tent.png') });
  await page.keyboard.press('e'); await page.locator('#dlg').waitFor({ state: 'visible' });
  assert.match(await page.locator('#dlg').innerText(), /校內雙主修，不是正式科系，不能考進來/);
  await finishDialog();
  await page.getByRole('button', { name: '玩小遊戲', exact: true }).click();
  await page.locator('#bz-stage').waitFor();
  await page.getByRole('button', { name: '開始', exact: true }).click();
  for (const c of programs.programs[3].game.cards) await page.locator(`#bz-stage button[data-card="${c.id}"]`).click();
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await page.waitForFunction(() => window.__bz26.flags().has('bz26_pg_P04') && window.__bz26.flags().has('bz26_pgpf_P04'));
  await finishDialog();
  // 友校：清華交流大使翻開學系清單；F03 引路人主持友校配對。
  await page.evaluate(() => { window.__game.teleport(-5.9, -44.1); window.__game.state.yaw = Math.PI / 2; });
  await page.waitForFunction(() => window.__game.state.near === window.__bz26programs.partnerNpcs[0].spot);
  await page.keyboard.press('e'); await page.locator('#dlg').waitFor({ state: 'visible' });
  await finishDialog();
  await page.getByRole('button', { name: '看開放的學系清單', exact: true }).click();
  await page.locator('#dlg').waitFor({ state: 'visible' });
  assert.match(await page.locator('#dlg').innerText(), /清華大學 115 學年/);
  await finishDialog();
  await page.evaluate(() => { window.__game.teleport(-6.5, -46.0); window.__game.state.yaw = Math.PI / 2; });
  await page.waitForFunction(() => window.__game.state.near?.label === '友校配對');
  await page.keyboard.press('e'); await page.locator('#dlg').waitFor({ state: 'visible' });
  await finishDialog();
  await page.getByRole('button', { name: '玩友校配對', exact: true }).click();
  await page.locator('#bz-matching').waitFor();
  await page.getByRole('button', { name: '開始配對' }).click();
  {
    const left = page.locator('#bz-matching .match-column').nth(0), right = page.locator('#bz-matching .match-column').nth(1);
    for (const pair of programs.partners.game.pairs) {
      await left.getByRole('button', { name: pair.left }).click();
      await right.getByRole('button', { name: pair.right }).click();
    }
  }
  await page.getByRole('button', { name: '完成配對' }).click();
  await page.waitForFunction(() => window.__bz26.flags().has('bz26_pt_F03'));
  await finishDialog();
  assert.equal(await page.evaluate(() => window.__bz26.flags().has('bz26_hs_RADIO') && [...window.__bz26.flags()].filter(f => /^bz26_(pg|pgpf|pt|ptpf)_/.test(f)).length), 4);
  await page.locator('#bz-passport-button').click();
  await page.screenshot({ path: path.join(root, 'test-results/baozhong-passport.png') });
  await page.keyboard.press('p');
  await approach('host');
  await finishDialog();
  await page.getByRole('button', { name: '離開會場', exact: true }).click();
  await finishDialog();
  await page.waitForFunction(() => !window.__bz26.counts().active && !window.__bz26arch.arch.active);
  const leftCounts = await page.evaluate(() => window.__bz26.counts());
  assert.equal(leftCounts.colliders, initial.colliders);
  assert.equal(leftCounts.passportButtons, 0);
  assert.equal(await page.evaluate(() => window.__bz26.activitySign.group.visible || window.__game.spots.includes(window.__bz26.activitySign.spot)), false);
  assert.equal(await page.evaluate(() => window.__bz26.flags().has('bz26_st_D26')), true);
  await approach('host'); await finishDialog();
  await page.getByRole('button', { name: '好，我要參加', exact: true }).click();
  await page.waitForFunction(() => window.__bz26arch.arch.active && window.__bz26radio?.active && window.__bz26programs?.active && window.__bz26.counts().decorRoots === 3 && [...window.__bz26.tents.tents.values()].filter(t => t.parts.smallProp?.length).length === 37);
  const reentered = await page.evaluate(() => window.__bz26.counts());
  assert.equal(await archColliderCount(), 2, '重入不重複拱門碰撞');
  assert.equal(await page.evaluate(() => window.__game.colliders.filter(c => c.owner === 'bz26-radio').length), 2, '重入不重複電台棚碰撞');
  assert.equal(await page.evaluate(() => window.__game.colliders.filter(c => c.owner === 'bz26-programs').length), 1, '重入不重複跨域學程帳篷碰撞');
  assert.deepEqual(await page.evaluate(() => [window.__bz26programs.programNpcs.length, window.__bz26programs.partnerNpcs.length, window.__game.spots.filter(s => s.label === '了解學程' || s.label === '和交流大使聊聊').length]), [4, 4, 8], '重入不重複建學程代表與交流大使');
  assert.equal(await page.evaluate(() => window.__bz26arch.arch.builds), 1, '重入沿用單一拱門模型');
  assert.deepEqual(reentered, active, '重入不能重複建立 NPC、帳篷、碰撞與護照');
  await page.waitForFunction(() => {
    const saved = JSON.parse(localStorage.getItem('nccu100-save') || 'null');
    return saved?.flags.includes('bz26_active') && saved.flags.includes('bz26_st_D26');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__bz26?.counts().active && window.__bz26.flags().has('bz26_st_D26'));
  await page.click('#go');
  await page.waitForFunction(() => window.__bz26arch.arch.active && window.__bz26.counts().decorRoots === 3 && [...window.__bz26.tents.tents.values()].filter(t => t.parts.smallProp?.length).length === 37);
  assert.equal(await page.locator('#bz-passport-button').count(), 1);
  assert.equal(await archColliderCount(), 2, '讀檔仍恰有兩根拱門柱碰撞');
  assert.equal(await page.evaluate(() => window.__bz26arch.arch.builds), 1, '讀檔只建立一座拱門');
  // v1.69：新玩家從開始畫面按「參加包種茶節」，直接站在噴水池旁活動看板前、會場已開。
  {
    const fresh = await browser.newPage({ viewport: { width: 390, height: 844 } });
    fresh.setDefaultTimeout(60000);
    fresh.on('pageerror', e => errors.push(String(e)));
    await fresh.goto(url, { waitUntil: 'domcontentloaded' });
    await fresh.evaluate(() => localStorage.removeItem('nccu100-save'));
    await fresh.reload({ waitUntil: 'domcontentloaded' });
    await fresh.waitForFunction(() => window.__game && window.__bz26 && window.__bz26radio);
    await fresh.screenshot({ path: path.join(root, 'test-results/baozhong-title-join-button.png') });
    await fresh.click('#bzGo');
    await fresh.waitForFunction(() => window.__game.state.started && window.__bz26.counts().active);
    const at = await fresh.evaluate(() => { const s = window.__game.spots.find(x => x.id === 'bz26-activity-map'); return { pos: [window.__game.pos.x, window.__game.pos.z], sign: s && [s.x, s.z] }; });
    assert.ok(at.sign, '活動看板要出現');
    assert.ok(Math.hypot(at.pos[0] - at.sign[0], at.pos[1] - at.sign[1]) < 2, `玩家要站在看板前：${JSON.stringify(at)}`);
    await fresh.waitForTimeout(1500);
    await fresh.screenshot({ path: path.join(root, 'test-results/baozhong-join-from-title.png') });
    await fresh.close();
  }
  assert.deepEqual(errors, []);
  console.log('包種茶節瀏覽器主要流程通過', JSON.stringify({ initial, active, left: leftCounts, reentered, saveReload: true, pageErrors: errors }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
