import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createMatchingRound, validateMatching } from './matching-core.js';
import { openMatching, cancelMatching } from './matching.js';
import { boothResult, points } from './passport-logic.js';

// 明確的測試資料，非系所事實，不供正式內容載入。
const fixture = {
  title: '測試專用配對', intro: ['這是測試資料，不是官方介紹。'],
  pairs: [
    { id: 'a', left: '測試左甲', right: '測試右甲' },
    { id: 'b', left: '測試左乙', right: '測試右乙' },
    { id: 'c', left: '測試左丙', right: '測試右丙' },
  ],
};
const apply = (flags, result) => {
  for (const flag of result.clear) flags.delete(flag);
  for (const flag of result.set) flags.add(flag);
};

test('僅接受三組互不歧義的配對，不修改傳入資料', () => {
  assert.throws(() => validateMatching({ ...fixture, pairs: [] }));
  assert.throws(() => validateMatching({ ...fixture, intro: [] }));
  assert.throws(() => validateMatching({ ...fixture, pairs: [fixture.pairs[0], fixture.pairs[0], fixture.pairs[2]] }));
  const original = structuredClone(fixture);
  const round = createMatchingRound(fixture, () => 0.9999);
  assert.notDeepEqual(round.rightOrder, fixture.pairs.map(pair => pair.id));
  assert.deepEqual(fixture, original);
});

test('錯配後可修正，但只計各左卡第一次作答，提前完成與重複完成均無效', () => {
  const r = createMatchingRound(fixture);
  assert.equal(r.finish(), null);
  assert.equal(r.match('a', 'b').kind, 'incorrect');
  assert.equal(r.match('a', 'a').score, 0);
  assert.equal(r.match('a', 'a').kind, 'ignored');
  assert.equal(r.match('b', 'a').kind, 'ignored');
  r.match('b', 'b'); r.match('c', 'c');
  assert.deepEqual(r.finish(), { status: 'completed', total: 3, score: 2 });
  assert.equal(r.finish(), null);
  assert.equal(r.cancel(), null);
  assert.equal(r.match('c', 'c').kind, 'ignored');
});

test('真實 P01 結算：各分數門檻、首次章、補全對、重玩與重新進場不重複給點', () => {
  for (let misses = 0; misses <= 3; misses++) {
    const round = createMatchingRound(fixture);
    for (let i = 0; i < misses; i++) round.match(fixture.pairs[i].id, fixture.pairs[(i + 1) % 3].id);
    for (const pair of fixture.pairs) round.match(pair.id, pair.id);
    const result = round.finish(), flags = new Set(['bz26_active']);
    const settlement = boothResult(flags, 'D26', result.total, result.score);
    assert.equal(settlement.passed, misses <= 1);
    assert.equal(settlement.perfect, misses === 0);
    apply(flags, settlement);
    assert.equal(points(flags), misses === 0 ? 3 : misses === 1 ? 2 : 0);
    assert.equal(boothResult(flags, 'D26', 3, result.score).gained, 0);
  }
  const flags = new Set(['bz26_active']);
  apply(flags, boothResult(flags, 'D26', 3, 2));
  assert.equal(points(flags), 2);
  apply(flags, boothResult(flags, 'D26', 3, 3));
  assert.equal(points(flags), 3);
  flags.delete('bz26_active'); flags.add('bz26_active');
  assert.deepEqual(boothResult(flags, 'D26', 3, 3).set, []);
  assert.equal(points(flags), 3);
});

test('取消沒有可結算的 completed 結果，已配對進度也不能重複結算', () => {
  const round = createMatchingRound(fixture);
  round.match('a', 'a');
  assert.deepEqual(round.cancel(), { status: 'cancelled', total: 3, score: 0 });
  assert.equal(round.finish(), null);
  assert.equal(round.cancel(), null);
});

// 沙箱不允許 Chromium 的 socket；僅在有瀏覽器權限的環境明確啟用。
test('實際 DOM：觸控、鍵盤、重看、取消、重入、忙碌與焦點清理', { skip: process.env.BZ_MATCHING_BROWSER !== '1' }, async () => {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 760 }, hasTouch: true });
    await page.route('https://matching.test/**', async route => {
      const name = new URL(route.request().url()).pathname.slice(1);
      if (['matching.js', 'matching-core.js'].includes(name)) {
        await route.fulfill({ contentType: 'text/javascript', body: await readFile(new URL(name, import.meta.url), 'utf8') });
      } else await route.fulfill({ contentType: 'text/html', body: '<button id="prior">原本焦點</button>' });
    });
    await page.goto('https://matching.test/');
    await page.evaluate(async config => {
      window.game = await import('/matching.js'); window.fixture = config; window.state = { busy: false };
      window.open = () => { window.result = null; window.pending = window.game.openMatching(window.fixture, { state: window.state, rng: () => 0 }).then(result => window.result = result); };
      document.querySelector('#prior').focus(); window.open();
    }, fixture);
    assert.equal(await page.evaluate(() => window.state.busy), true);
    for (const pair of fixture.pairs) assert.match(await page.locator('.match-guide').innerText(), new RegExp(`${pair.left}：${pair.right}`));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: '開始配對' }).tap();
    await page.getByRole('button', { name: '測試左甲', exact: true }).tap();
    await page.getByRole('button', { name: '測試右乙', exact: true }).tap();
    await page.getByRole('button', { name: '重看介紹' }).tap();
    await page.getByRole('button', { name: '回到配對' }).tap();
    await page.getByRole('button', { name: '測試右甲', exact: true }).tap();
    assert.match(await page.locator('.match-card').innerText(), /首次答對 0 組/);
    await page.getByRole('button', { name: '測試左乙', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '測試右乙', exact: true }).focus();
    await page.keyboard.press('Space');
    await page.getByRole('button', { name: '測試左丙', exact: true }).tap();
    await page.getByRole('button', { name: '測試右丙', exact: true }).tap();
    await page.getByRole('button', { name: '完成配對' }).click();
    assert.deepEqual(await page.evaluate(() => window.result), { status: 'completed', total: 3, score: 2 });
    assert.equal(await page.locator('#bz-matching').count(), 0);
    assert.equal(await page.evaluate(() => window.state.busy), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'prior');
    assert.equal(await page.locator('style').count(), 0);
    await page.evaluate(() => { window.old = window.game.openMatching(window.fixture, { state: window.state }); window.open(); });
    assert.equal((await page.evaluate(() => window.old)).status, 'cancelled');
    assert.equal(await page.locator('#bz-matching').count(), 1);
    await page.keyboard.press('Escape');
    assert.equal((await page.evaluate(() => window.result)).status, 'cancelled');
    assert.equal(await page.evaluate(() => window.state.busy), false);
    await page.evaluate(() => { window.controller = new AbortController(); window.pending = window.game.openMatching(window.fixture, { state: window.state, signal: window.controller.signal }); window.controller.abort(); });
    assert.equal((await page.evaluate(() => window.pending)).status, 'cancelled');
    assert.equal(await page.locator('#bz-matching').count(), 0);
    assert.equal(await page.locator('style').count(), 0);
    // 多次取消後，全新一局必須清空上次第一次錯配紀錄。
    await page.evaluate(() => window.open());
    await page.keyboard.press('Enter');
    for (const pair of fixture.pairs) {
      await page.getByRole('button', { name: pair.left, exact: true }).click();
      await page.getByRole('button', { name: pair.right, exact: true }).click();
    }
    await page.getByRole('button', { name: '完成配對' }).click();
    assert.deepEqual(await page.evaluate(() => window.result), { status: 'completed', total: 3, score: 3 });
    await page.evaluate(() => { window.state.busy = true; window.open(); window.game.cancelMatching(); });
    assert.equal(await page.evaluate(() => window.state.busy), true);
  } finally { await browser.close(); }
});

// 最小 DOM 替身只驗證控制流程，不代表真實瀏覽器排版、觸控或可及性驗收。
function fakeBrowser() {
  const listeners = new Map();
  const win = {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    key(code, extra = {}) { for (const fn of listeners.get('keydown') || []) fn({ code, preventDefault() {}, stopPropagation() {}, ...extra }); },
    get listenerCount() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
  };
  const doc = { activeElement: null };
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.textContent = ''; this.events = {}; this.parent = null; }
    appendChild(child) { this.children.push(child); child.parent = this; return child; }
    replaceChildren() { this.children.forEach(child => child.parent = null); this.children = []; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(type, fn) { this.events[type] = fn; }
    focus() { doc.activeElement = this; }
    click() { if (!this.disabled) this.events.click?.(); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
    get isConnected() { return this === doc.body || this === doc.head || !!this.parent?.isConnected; }
    querySelectorAll(selector) {
      const found = [];
      for (const child of this.children) {
        if ((selector === 'button' || selector === 'button:not(:disabled)') && child.tagName === 'button' && (selector === 'button' || !child.disabled)) found.push(child);
        found.push(...child.querySelectorAll(selector));
      }
      return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  doc.createElement = tag => new Element(tag);
  doc.body = new Element('body'); doc.head = new Element('head');
  const prior = doc.createElement('button'); doc.body.appendChild(prior); prior.focus();
  const find = label => doc.body.querySelectorAll('button').find(button => button.textContent === label);
  return { doc, win, prior, find };
}

test('DOM 替身：重看保留計分、完成僅一次、清理與重入、取消及忙碌值還原', async () => {
  const { doc, win, prior, find } = fakeBrowser();
  const state = { busy: false }, options = { state, document: doc, window: win, rng: () => 0 };
  let resolved = 0;
  const promise = openMatching(fixture, options).then(result => { resolved++; return result; });
  assert.equal(state.busy, true); assert.equal(win.listenerCount, 1);
  win.key('Enter');
  find('測試左甲').click(); find('測試右乙').click();
  find('重看介紹').click(); find('回到配對').click();
  find('測試右甲').click();
  for (const pair of fixture.pairs.slice(1)) { find(pair.left).click(); find(pair.right).click(); }
  const complete = find('完成配對'); complete.click(); complete.click();
  assert.deepEqual(await promise, { status: 'completed', total: 3, score: 2 });
  assert.equal(resolved, 1); assert.equal(state.busy, false);
  assert.equal(doc.activeElement, prior); assert.equal(doc.head.children.length, 0); assert.equal(win.listenerCount, 0);
  assert.equal(doc.body.children.length, 1);
  const old = openMatching(fixture, options), current = openMatching(fixture, options);
  assert.equal((await old).status, 'cancelled');
  assert.equal(doc.body.children.length, 2); assert.equal(win.listenerCount, 1);
  win.key('Escape'); assert.equal((await current).status, 'cancelled');
  assert.equal(state.busy, false); assert.equal(win.listenerCount, 0);
  const controller = new AbortController();
  const aborted = openMatching(fixture, { ...options, signal: controller.signal });
  controller.abort(); assert.equal((await aborted).status, 'cancelled');
  assert.equal(state.busy, false); assert.equal(doc.head.children.length, 0);
  const alreadyAborted = await openMatching(fixture, { ...options, signal: controller.signal });
  assert.equal(alreadyAborted.status, 'cancelled'); assert.equal(doc.body.children.length, 1);
  const again = openMatching(fixture, options); find('開始配對').click();
  for (const pair of fixture.pairs) { find(pair.left).click(); find(pair.right).click(); }
  find('完成配對').click(); assert.equal((await again).score, 3);
  state.busy = true;
  const busy = openMatching(fixture, options); cancelMatching();
  assert.equal((await busy).status, 'cancelled'); assert.equal(state.busy, true);
  assert.equal(doc.body.children.length, 1); assert.equal(doc.head.children.length, 0); assert.equal(win.listenerCount, 0);
});
