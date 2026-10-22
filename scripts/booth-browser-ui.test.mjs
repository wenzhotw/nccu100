import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { safeSourceURL } from '../src/systems/baozhong/booth-browser-ui.js';

test('booth source links allow only credential-free HTTPS', () => {
  assert.equal(safeSourceURL('javascript:alert(1)'), null);
  assert.equal(safeSourceURL('http://example.com'), null);
  assert.equal(safeSourceURL('https://example.com'), null);
  assert.equal(safeSourceURL('https://nccu.edu.tw.evil.example'), null);
  assert.equal(safeSourceURL('https://www.cac.edu.tw'), 'https://www.cac.edu.tw/');
  assert.equal(safeSourceURL('https://name:secret@example.com'), null);
  assert.equal(safeSourceURL('https://www.nccu.edu.tw'), 'https://www.nccu.edu.tw/');
});

test('booth browser keyboard, history, group separation, safety and mobile layout', { skip: process.env.NCCU_BROWSER_TESTS !== '1' ? 'Opt-in browser QA: NCCU_BROWSER_TESTS=1 in an allowed Chromium environment' : false }, async t => {
  let browser;
  try { browser = await chromium.launch({ headless: true, ...(existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}) }); } catch (error) { throw new Error(`Required browser QA could not launch Chromium: ${error.message.split('\n')[0]}`); }
  const server = createServer(async (req, res) => {
    const files = { '/exploration-store.js': ['src/systems/baozhong/exploration-store.js', 'text/javascript'], '/learning-scenarios.js': ['src/systems/baozhong/learning-scenarios.js', 'text/javascript'], '/ui.js': ['src/systems/baozhong/booth-browser-ui.js', 'text/javascript'], '/ui.css': ['src/systems/baozhong/booth-browser.css', 'text/css'], '/data.json': ['src/systems/baozhong/booth-browser-data.json', 'application/json'] };
    if (files[req.url]) { const [file, type] = files[req.url]; res.setHeader('Content-Type', type); res.end(await readFile(new URL(`../${file}`, import.meta.url))); return; }
    res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/ui.css"><button id="trigger" data-booth-open>Browse</button><main>Game</main><script type="module">import {mountBoothBrowser} from "/ui.js";import {createExplorationStore} from "/exploration-store.js";window.exploration=createExplorationStore({storage:localStorage}); const data=await fetch("/data.json").then(r=>r.json()); window.data=data;window.state={busy:false};window.talk=[];window.gameKeys=[];window.panel=mountBoothBrowser({data,state:window.state,exploration:window.exploration,onTalk:id=>window.talk.push({id,busy:state.busy,open:panel.isOpen})});window.addEventListener("keydown",e=>gameKeys.push(e.key));window.ready=true;</script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForFunction(() => window.ready);
    assert.equal(await page.evaluate(() => { state.busy = true; return panel.open('D01'); }), false);
    assert.equal(await page.evaluate(() => { state.busy = false; return panel.open('D01', { trigger: document.querySelector('#trigger') }); }), true);
    assert.equal(await page.evaluate(() => state.busy), true);
    await page.keyboard.press('m'); assert.deepEqual(await page.evaluate(() => gameKeys), []);
    await page.locator('[data-booth-tab="1"]').click(); await page.keyboard.press('ArrowRight'); assert.equal(await page.locator('[data-booth-tab="2"]').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => panel.isOpen), false); assert.equal(await page.evaluate(() => document.activeElement.id), 'trigger');
    await page.evaluate(() => panel.open('D01')); assert.equal(await page.locator('[data-booth-tab="2"]').getAttribute('aria-selected'), 'true');
    await page.locator('[data-booth-tab="3"]').click(); await page.locator('[data-booth-panel]').evaluate(el => el.scrollTop = 200); const oldScroll = await page.locator('[data-booth-panel]').evaluate(el => el.scrollTop);
    await page.evaluate(() => { panel.close(); panel.open('D01'); }); assert.equal(await page.locator('[data-booth-panel]').evaluate(el => el.scrollTop), oldScroll);
    await page.locator('[data-booth-talk]').click(); assert.deepEqual(await page.evaluate(() => talk[0]), { id: 'D01', busy: false, open: false });
    const split = await page.evaluate(() => data.departments.find(d => d.admissionsGroups.length > 1).id);
    await page.evaluate(id => panel.open(id), split); await page.locator('[data-booth-tab="3"]').click(); assert.equal(await page.locator('[data-booth-admissions]').count(), 0);
    await page.locator('[data-booth-group]').selectOption({ index: 1 }); assert.equal(await page.locator('[data-booth-admissions]').count(), 1);
    const firstCode = await page.locator('[data-booth-admissions]').getAttribute('data-booth-admissions'); await page.locator('[data-booth-group]').selectOption({ index: 2 }); assert.notEqual(await page.locator('[data-booth-admissions]').getAttribute('data-booth-admissions'), firstCode);
    for (const id of ['D22', 'D30', 'D36']) { await page.evaluate(id => { panel.close(); panel.open(id); }, id); await page.locator('[data-booth-tab="2"]').click(); assert.equal(await page.locator('[data-booth-alumni]').count(), 0); assert.equal(await page.locator('.bz-browser img').count(), 0); }
    await page.setViewportSize({ width: 360, height: 640 }); await page.locator('[data-booth-tab="3"]').click();
    const box = await page.locator('.bz-browser__dialog').boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 361); assert.ok(box.height <= 640);
    assert.equal(await page.locator('.bz-browser').evaluate(el => el.scrollWidth > el.clientWidth), false);
    await page.locator('[data-booth-close]').focus(); await page.keyboard.press('Shift+Tab'); assert.equal(await page.locator('[data-booth-talk]').evaluate(el => document.activeElement === el), true); await page.keyboard.press('Tab'); assert.equal(await page.locator('[data-booth-close]').evaluate(el => document.activeElement === el), true);
    const invalid = await page.locator('.bz-browser a').evaluateAll(links => links.filter(a => !a.href.startsWith('https://') || !a.rel.includes('noopener')).length); assert.equal(invalid, 0);
    await page.evaluate(() => { panel.close(); panel.open('D01'); });
    await page.locator('[data-favorite-reason="courses"]').click();
    assert.equal(await page.locator('[data-favorite-reason="courses"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-compare-toggle="D01"]').click();
    await page.evaluate(() => { exploration.toggleCompare('D02'); exploration.toggleCompare('D03'); });
    assert.equal(await page.evaluate(() => exploration.toggleCompare('D04')), false);
    await page.locator('[data-exploration-compare]').click();
    assert.equal(await page.locator('[data-compare-department]').count(), 3);
    assert.equal(await page.locator('.bz-browser__comparison-item[data-selected="false"]').first().isVisible(), false);
    assert.equal(await page.locator('.bz-browser').evaluate(el => el.scrollWidth > el.clientWidth), false);
    await page.locator('.bz-browser__comparison-tabs button').last().click();
    assert.equal(await page.locator('[data-comparison-category]').getAttribute('data-comparison-category'), 'preparation');
    await page.locator('[data-exploration-list]').click();
    assert.match(await page.locator('[data-booth-panel]').innerText(), /喜歡課程/);
    await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => state.busy), false);
    const savedScroll = await page.evaluate(() => { panel.open('D01'); const content=document.querySelector('[data-booth-panel]'); content.scrollTop=420; const saved=content.scrollTop; panel.close(); return saved; });
    assert.ok(savedScroll > 0);
    await page.evaluate(() => panel.openCollection());
    assert.equal(await page.locator('[data-booth-panel]').evaluate(el=>el.scrollTop), 0);
    await page.evaluate(() => { panel.close(); panel.open('D01'); });
    assert.equal(await page.locator('[data-booth-panel]').evaluate(el=>el.scrollTop), savedScroll);
    await page.evaluate(() => panel.dispose()); assert.equal(await page.locator('[data-booth-browser]').count(), 0); assert.equal(await page.evaluate(() => state.busy), false); assert.equal(await page.locator('main').evaluate(el => el.inert), false);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
