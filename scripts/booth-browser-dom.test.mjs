/** Deterministic lifecycle tests, not a substitute for browser layout/a11y QA. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mountBoothBrowser, safeSourceURL } from '../src/systems/baozhong/booth-browser-ui.js';
const fixture = JSON.parse(await readFile(new URL('../src/systems/baozhong/booth-browser-data.json', import.meta.url)));
class Events {
  listeners = new Map();
  addEventListener(type, callback) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(callback); }
  removeEventListener(type, callback) { this.listeners.set(type, (this.listeners.get(type) || []).filter(fn => fn !== callback)); }
  emit(type, extra = {}) { const event = { type, target: this, defaultPrevented: false, propagationStopped: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.propagationStopped = true; }, stopImmediatePropagation() { this.propagationStopped = true; }, ...extra }; for (const listener of this.listeners.get(type) || []) listener(event); return event; }
}
class Element extends Events {
  children = []; attributes = new Map(); dataset = {}; style = { setProperty(name, value) { this[name] = value; } }; hidden = false; inert = false; disabled = false; scrollTop = 0; value = ''; _text = ''; parentElement = null;
  constructor(tag, document) { super(); this.tagName = tag.toUpperCase(); this.ownerDocument = document; this.tabIndex = ['BUTTON', 'SELECT', 'SUMMARY'].includes(this.tagName) ? 0 : -1; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  get isConnected() { return this === this.ownerDocument.body || !!this.parentElement?.isConnected; }
  append(...nodes) { for (const child of nodes) { child.parentElement = this; this.children.push(child); } }
  replaceChildren(...nodes) { for (const child of this.children) child.parentElement = null; this.children = []; this._text = ''; this.append(...nodes); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); if (name === 'tabindex') this.tabIndex = Number(value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  contains(target) { return this === target || this.children.some(child => child.contains(target)); }
  focus() { this.ownerDocument.activeElement = this; }
  matches(selector) {
    if (selector === 'details:not([open])') return this.tagName === 'DETAILS' && !this.hasAttribute('open');
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector.startsWith('.')) return (this.className || '').split(' ').includes(selector.slice(1));
    if (selector === 'a[href]') return this.tagName === 'A' && !!this.href;
    if (selector === '[tabindex]') return this.attributes.has('tabindex');
    const data = selector.match(/^\[data-([\w-]+)(?:="([^"]*)")?\]$/);
    if (data) { const key = data[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()); return Object.hasOwn(this.dataset, key) && (data[2] == null || this.dataset[key] === data[2]); }
    return this.tagName === selector.toUpperCase();
  }
  querySelectorAll(selector) { const selectors = selector.split(',').map(s => s.trim()); const result = []; const visit = parent => { for (const child of parent.children) { if (selectors.some(s => child.matches(s))) result.push(child); visit(child); } }; visit(this); return result; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) || null; }
}
class Document extends Events {
  constructor() { super(); this.defaultView = new Events(); this.body = new Element('body', this); this.activeElement = this.body; }
  createElement(tag) { return new Element(tag, this); }
  querySelector(selector) { return this.body.querySelector(selector); }
}
function setup() {
  const document = new Document(), state = { busy: false }, calls = [];
  const trigger = document.createElement('button'); trigger.id = 'trigger'; trigger.dataset.boothOpen = '';
  const background = document.createElement('main'); background.inert = false;
  const alreadyInert = document.createElement('aside'); alreadyInert.inert = true;
  document.body.append(trigger, background, alreadyInert); document.body.style.overflow = 'auto'; trigger.focus();
  let panel;
  panel = mountBoothBrowser({ data: structuredClone(fixture), document, state,
    onOpen: id => calls.push({ action: 'open', id, busy: state.busy, focus: document.activeElement.id }),
    onClose: id => calls.push({ action: 'close', id, busy: state.busy }),
    onTalk: id => calls.push({ action: 'talk', id, busy: state.busy, open: panel.isOpen }) });
  const find = selector => document.querySelector(selector), click = selector => find(selector).emit('click');
  return { document, state, calls, trigger, background, alreadyInert, panel, find, click };
}

test('real UI lifecycle guards busy and restores focus, inert state, overflow, and callbacks', () => {
  const x = setup(); x.state.busy = true; assert.equal(x.panel.open('D01'), false); x.state.busy = false;
  assert.equal(x.panel.open('unknown'), false); assert.equal(x.panel.open('D01', { trigger: x.trigger }), true);
  assert.equal(x.panel.currentId, 'D01'); assert.equal(x.state.busy, true); assert.equal(x.background.inert, true);
  assert.deepEqual(x.calls[0], { action: 'open', id: 'D01', busy: true, focus: 'trigger' });
  assert.equal(x.document.activeElement, x.find('[data-booth-close]')); assert.equal(x.panel.open('D02'), false);
  x.click('[data-booth-talk]'); assert.deepEqual(x.calls.slice(-2), [{ action: 'close', id: 'D01', busy: false }, { action: 'talk', id: 'D01', busy: false, open: false }]);
  assert.equal(x.panel.isOpen, false); assert.equal(x.document.activeElement, x.trigger); assert.equal(x.background.inert, false); assert.equal(x.alreadyInert.inert, true); assert.equal(x.document.body.style.overflow, 'auto');
  assert.equal(x.panel.close(), false); x.panel.dispose(); assert.equal(x.find('[data-booth-browser]'), null); assert.equal(x.panel.open('D01'), false); assert.equal(x.document.listeners.get('focusin').length, 0); assert.equal(x.document.defaultView.listeners.get('keydown').length, 0);
});

test('per-department tabs, per-tab scroll and split-group choices survive close/reopen', () => {
  const x = setup(), split = fixture.departments.find(d => d.admissionsGroups.length > 1);
  x.panel.open(split.id); x.find('[data-booth-panel]').scrollTop = 125; x.click('[data-booth-tab="3"]');
  assert.equal(x.find('[data-booth-admissions]'), null); assert.equal(x.find('[data-booth-group]').value, '');
  const selector = x.find('[data-booth-group]'); selector.value = split.admissionsGroups[1].code; selector.emit('change');
  assert.equal(x.find('[data-booth-admissions]').dataset.boothAdmissions, split.admissionsGroups[1].code);
  x.find('[data-booth-panel]').scrollTop = 420; x.panel.close(); x.panel.open('D01'); assert.equal(x.find('[data-booth-panel]').dataset.activeTab, '0'); x.panel.close(); x.panel.open(split.id);
  assert.equal(x.find('[data-booth-panel]').dataset.activeTab, '3'); assert.equal(x.find('[data-booth-panel]').scrollTop, 420); assert.equal(x.find('[data-booth-group]').value, split.admissionsGroups[1].code);
  x.click('[data-booth-tab="0"]'); assert.equal(x.find('[data-booth-panel]').scrollTop, 125); x.panel.dispose();
});

test('keyboard guard handles Escape, directional tabs and focus trap without game propagation', () => {
  const x = setup(); x.panel.open('D01'); x.find('[data-booth-tab="0"]').focus();
  const arrow = x.document.defaultView.emit('keydown', { key: 'ArrowRight' }); assert.equal(arrow.defaultPrevented, true); assert.equal(arrow.propagationStopped, true); assert.equal(x.find('[data-booth-panel]').dataset.activeTab, '1');
  const game = x.document.defaultView.emit('keydown', { key: 'm' }); assert.equal(game.propagationStopped, true);
  x.find('[data-booth-close]').focus(); x.document.defaultView.emit('keydown', { key: 'Tab', shiftKey: true }); assert.equal(x.document.activeElement, x.find('[data-booth-talk]'));
  x.document.defaultView.emit('keydown', { key: 'Tab', shiftKey: false }); assert.equal(x.document.activeElement, x.find('[data-booth-close]'));
  x.document.defaultView.emit('keydown', { key: 'Escape' }); assert.equal(x.panel.isOpen, false); assert.equal(x.state.busy, false); x.panel.dispose();
});

test('all 37 departments render all panels without raw machine codes or unsafe sources', () => {
  const x = setup(); let selectedGroups = new Set();
  for (const department of fixture.departments) {
    assert.equal(x.panel.open(department.id), true);
    for (let index = 0; index < 4; index++) {
      x.click(`[data-booth-tab="${index}"]`);
      if (index === 3) for (const group of department.admissionsGroups) { const select = x.find('[data-booth-group]'); select.value = group.code; select.emit('change'); selectedGroups.add(group.code); assert.equal(x.find('[data-booth-admissions]').dataset.boothAdmissions, group.code); assert.doesNotMatch(x.find('[data-booth-panel]').textContent, /not_applicable|either_one_passes|all_listed_requirements|officially_not_disclosed|not_marked_as_executed/); }
      for (const anchor of x.find('[data-booth-panel]').querySelectorAll('a')) { assert.equal(safeSourceURL(anchor.href), anchor.href); assert.equal(anchor.rel, 'noopener noreferrer'); }
    }
    x.panel.close();
  }
  assert.equal(selectedGroups.size, 45); x.panel.dispose();
});

test('derived careers and missing alumni are honestly labelled, no synthetic images', () => {
  const x = setup(); const derived = fixture.departments.find(d => d.careers.some(c => c.basis === 'derived'));
  assert.ok(derived); x.panel.open(derived.id); x.click('[data-booth-tab="1"]'); assert.match(x.find('[data-booth-panel]').textContent, /依學習內容延伸，非官方保證/); x.panel.close();
  for (const id of ['D22', 'D30', 'D36']) { x.panel.open(id); x.click('[data-booth-tab="2"]'); assert.equal(x.find('[data-booth-alumni]'), null); assert.equal(x.find('[data-booth-panel]').querySelectorAll('img').length, 0); assert.ok(x.find('[data-booth-panel]').textContent.includes(fixture.departments.find(d => d.id === id).missingAlumni)); x.panel.close(); }
  x.panel.dispose();
});

test('every actual source passes HTTPS host allowlist; attacker URLs fail', () => {
  const visit = value => { if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') { if (value.publicURL) assert.equal(safeSourceURL(value.publicURL), new URL(value.publicURL).href); Object.values(value).forEach(visit); } }; visit(fixture);
  for (const url of ['http://nccu.edu.tw', 'javascript:alert(1)', 'https://nccu.edu.tw.evil.test/', 'https://evil.test/', 'https://user:secret@nccu.edu.tw/']) assert.equal(safeSourceURL(url), null);
});
