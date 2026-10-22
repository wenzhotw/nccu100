// T074 兩階段攤位截圖（Grok）。用法：npm run build 後 OUT=輸出資料夾 node scripts/bz26-stage2-shots.mjs
// 定位用 ?debug 的 teleport（debug 設定）；對話、選項、小遊戲、進階問答、護照都是真的點 DOM 或按鍵。
// 關主截圖例外：用 debug 補上外語學院八攤章並直接呼叫 onStageMaster('C05')，只為看題目來源，紀錄在 log。
import fs from 'node:fs'; import path from 'node:path'; import { createServer } from 'node:http'; import { chromium } from 'playwright';
const root = process.cwd(), OUT = process.env.OUT || 'stage2-shots';
fs.mkdirSync(OUT, { recursive: true });
const DATA = JSON.parse(fs.readFileSync('src/content/baozhong-minigames.json'));
const C = JSON.parse(fs.readFileSync('src/content/baozhong.json'));
const server = createServer((req, res) => { let p = path.join(root, 'dist', decodeURIComponent(req.url.split('?')[0])); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) { res.writeHead(404); res.end(); return; } res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' })[path.extname(p)] || 'application/octet-stream'); fs.createReadStream(p).pipe(res); }).listen(0, '127.0.0.1');
await new Promise(r => server.on('listening', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const T0 = Date.now(); const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)}s]`, ...a);
const report = { real: [], debug: [], checks: {} };

// 1) 關閉旗標（?bz26stage2=0）：回到原本流程（D26 仍是「接受挑戰」問答）。
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } }); page.setDefaultTimeout(60000);
  await page.goto(base + '?debug&bz26stage2=0', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game && window.__bz26);
  report.checks.defaultHasStage2Hook = await page.evaluate(() => 'undefined' !== typeof window.__bz26stage2);
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 1280, height: 760 } }); page.setDefaultTimeout(60000);
const errors = []; page.on('pageerror', e => errors.push(String(e)));
await page.goto(base + '?debug&bz26stage2=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game && window.__bz26 && window.__bz26stage2);
await page.click('#go'); await page.waitForFunction(() => window.__game.state.started);
report.checks.rewired = await page.evaluate(() => window.__bz26stage2.rewired);
const shot = async n => { await page.waitForTimeout(700); const f = path.join(OUT, `${n}.png`); await page.screenshot({ path: f }); log('shot', f); return f; };
// 對話框偶爾在動畫中不算 stable：5 秒內點不到就改用 force 點同一個對話框（仍是真的點擊事件）。
const clickDlg = () => page.locator('#dlg').click({ timeout: 5000 }).catch(async () => { if (await page.locator('#dlg').isVisible()) await page.locator('#dlg').click({ force: true, timeout: 5000 }).catch(() => {}); });
async function finishDialog(max = 60) { for (let i = 0; i < max && await page.locator('#dlg').isVisible(); i++) await clickDlg(); }
async function readDialog(max = 20) { const out = []; for (let i = 0; i < max && await page.locator('#dlg').isVisible(); i++) { out.push((await page.locator('#dlg').innerText()).trim()); await clickDlg(); } return out; }
async function approach(id) {
  await page.evaluate(id => { const n = id === 'host' ? window.__bz26.host : window.__bz26.venueNPCs.find(n => n.id === id); window.__game.teleport(n.spot.x, n.spot.z + 0.6); }, id);
  report.debug.push(`teleport to ${id}`);
  await page.waitForFunction(id => { const n = id === 'host' ? window.__bz26.host : window.__bz26.venueNPCs.find(n => n.id === id); return n && window.__game.state.near === n.spot; }, id);
  await page.keyboard.press('e'); await page.locator('#dlg').waitFor({ state: 'visible' });
  report.real.push(`E key at ${id}`);
}
const bzFlags = () => page.evaluate(() => [...window.__bz26.flags()].filter(f => f.startsWith('bz26')).sort());

await approach('host'); await finishDialog();
await page.getByRole('button', { name: '好，我要參加', exact: true }).click(); report.real.push('click 好，我要參加');
await page.waitForFunction(() => window.__bz26.counts().active); await page.waitForTimeout(1500);

// 2) 初訪小遊戲：每個試作攤 start / feedback / done。第一步故意答錯一次，畫面上才看得到錯誤回饋。
for (const g of DATA.games) {
  const id = g.booth;
  await approach(`bz26-${id}`); await finishDialog();
  await page.getByRole('button', { name: '玩小遊戲', exact: true }).click(); report.real.push(`${id} click 玩小遊戲`);
  if (g.type === 'matching') {
    await page.locator('#bz-matching').waitFor();
    report.checks[`${id}_introListsAnswers`] = await page.locator('#bz-matching .match-guide').count() > 0;
    await shot(`${id}-1-start`);
    await page.getByRole('button', { name: '開始配對' }).click();
    const L = page.locator('#bz-matching .match-column').nth(0), R = page.locator('#bz-matching .match-column').nth(1);
    await L.getByRole('button', { name: g.pairs[0].left }).click(); await R.getByRole('button', { name: g.pairs[1].right }).click();
    await shot(`${id}-2-feedback-wrong`);
    for (const p of g.pairs) { await L.getByRole('button', { name: p.left }).click(); await R.getByRole('button', { name: p.right }).click(); if (p === g.pairs[0]) await shot(`${id}-2b-feedback-right`); }
    await shot(`${id}-3-done`);
    await page.getByRole('button', { name: '完成配對' }).click();
  } else {
    await page.locator('#bz-stage').waitFor();
    await shot(`${id}-1-start`);
    await page.getByRole('button', { name: '開始', exact: true }).click();
    const steps = g.type === 'classify' ? g.items.map(it => ({ answer: g.categories.findIndex(c => c.id === it.category), n: g.categories.length })) : g.steps.map(s => ({ answer: s.answer, n: s.choices.length }));
    for (let i = 0; i < steps.length; i++) {
      const pick = i === 0 ? (steps[i].answer + 1) % steps[i].n : steps[i].answer;
      if (g.type === 'classify' && i === 1) {   // 第二張卡用真的拖放
        await page.locator('#bz-stage .st-prompt').dragTo(page.locator(`#bz-stage button[data-option="${pick}"]`)); report.real.push(`${id} drag card to bin`);
      } else await page.locator(`#bz-stage button[data-option="${pick}"]`).click();
      if (i === 0) await shot(`${id}-2-feedback-wrong`);
      if (i === 1) await shot(`${id}-2b-feedback-right`);
      await page.locator('#bz-stage .st-primary').click();
    }
    await shot(`${id}-3-done`);
    await page.getByRole('button', { name: '完成', exact: true }).click();
  }
  report.checks[`${id}_after`] = await readDialog();
  report.real.push(`${id} first-visit minigame completed by clicks`);
}
report.checks.flagsAfterFirst = await bzFlags();

// 3) 回訪進階：D26 全對（得茶罐）；D19 故意答錯一題（不過、不給獎勵）。
async function advanced(id, wrongAt) {
  await approach(`bz26-${id}`); await finishDialog();
  await page.getByRole('button', { name: '進階挑戰（全對才過）', exact: true }).click(); report.real.push(`${id} click 進階挑戰`);
  await page.locator('#bz-stage').waitFor();
  const booth = C.booths.find(b => b.id === id);
  for (let i = 0; i < booth.quiz.questions.length; i++) {
    const prompt = (await page.locator('#bz-stage .st-prompt').innerText()).trim();
    const q = booth.quiz.questions.find(x => x.q === prompt);
    const texts = await page.locator('#bz-stage .st-options button').allInnerTexts();
    let k = texts.findIndex(t => t.trim() === q.options[q.answer]);
    if (i === wrongAt) k = (k + 1) % texts.length;
    await page.locator(`#bz-stage button[data-option="${k}"]`).click();
    if (i === 0 || i === wrongAt) await shot(`${id}-adv-${i + 1}-feedback`);
    await page.locator('#bz-stage .st-primary').click();
  }
  await shot(`${id}-adv-done`);
  await page.getByRole('button', { name: '完成', exact: true }).click();
  report.checks[`${id}_advAfter`] = await readDialog();
}
await advanced('D26', -1);
await advanced('D19', 1);
// 重玩 D26 進階：全對但不重複給
await advanced('D26', -1);
report.checks.flagsAfterAdvanced = await bzFlags();
report.checks.points = await page.evaluate(() => document.querySelector('#bz-passport-button .bz-count')?.textContent);

// 4) 護照：真的點護照按鈕與外語學院分頁。
await page.waitForTimeout(1500);
await page.locator('#bz-passport-button').click(); await page.locator('[data-bz-college-id="C05"]').click(); report.real.push('click passport button and C05 tab');
report.checks.passportSummary = await page.locator('#bz-passport-overlay .bz-summary').innerText();
await shot('passport-advanced-reward');
await page.locator('#bz-passport-overlay .bz-close').click();

// 5) 關主題目來源（debug 設定）：補外語學院八攤章，直接呼叫 onStageMaster('C05')。
await page.evaluate(() => { for (const id of ['D23', 'D24', 'D25', 'D27', 'D28', 'D29', 'D30']) window.__bz26.flags().add('bz26_st_' + id); window.__bz26stage2.onStageMaster('C05'); });
report.debug.push('add bz26_st_D23..D30 (except D26) and call onStageMaster(C05)');
await finishDialog();
if (await page.locator('#choice').isVisible().catch(() => false)) await page.getByText('不用提示卡').click().catch(() => {});
await page.locator('#quiz').waitFor();
const qs = [];
for (let i = 0; i < 5; i++) { qs.push((await page.locator('#quiz .q').innerText()).replace(/^第 \d+ 題．/, '')); if (i === 0) await shot('master-C05-question'); await page.locator('#quiz .opts button').first().click(); await page.waitForTimeout(150); }
report.checks.masterQuestions = qs;
await readDialog();
report.errors = errors;
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
log(JSON.stringify(report, null, 2));
await browser.close(); server.close();
