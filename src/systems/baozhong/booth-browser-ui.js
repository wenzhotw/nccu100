/** Read-only booth information. Content is always inserted as text, never HTML. */
export function safeSourceURL(value) {
  try { const url = new URL(value); const trusted = ['nccu.edu.tw', 'cac.edu.tw', 'collego.edu.tw'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`)); return url.protocol === 'https:' && trusted && !url.username && !url.password ? url.href : null; } catch { return null; }
}
const tabs = ['認識科系', '課程與出路', '學長姐', '申請準備'];
let instance = 0;
export function mountBoothBrowser({ data, state, document = globalThis.document, onTalk, onClose, onOpen }) {
  if (!document?.body || !state) throw new TypeError('Booth browser requires document and state');
  const prefix = `booth-browser-${++instance}`;
  const departments = new Map((data?.departments || []).map(dept => [dept.id, dept]));
  const memory = new Map();
  let currentId = null, currentTab = 0, trigger = null, disposed = false, previousBusy = false;
  let isolated = [], previousOverflow = '';
  const node = (tag, text, className) => { const el = document.createElement(tag); if (text != null) el.textContent = String(text); if (className) el.className = className; return el; };
  const root = node('div', null, 'bz-browser'); root.hidden = true; root.dataset.boothBrowser = '';
  const dialog = node('section', null, 'bz-browser__dialog'); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', `${prefix}-title`); dialog.tabIndex = -1;
  const head = node('header', null, 'bz-browser__header');
  const college = node('span', '', 'bz-browser__college');
  const title = node('h2'); title.id = `${prefix}-title`;
  const closeButton = node('button', '關閉 ×', 'bz-browser__close'); closeButton.type = 'button'; closeButton.dataset.boothClose = ''; closeButton.setAttribute('aria-label', '關閉科系介紹');
  head.append(college, closeButton, title);
  const navigation = node('div', null, 'bz-browser__tabs'); navigation.setAttribute('role', 'tablist'); navigation.setAttribute('aria-label', '科系介紹內容');
  const content = node('div', null, 'bz-browser__content'); content.tabIndex = 0; content.id = `${prefix}-panel`; content.setAttribute('role', 'tabpanel'); content.dataset.boothPanel = '';
  const tabButtons = tabs.map((label, index) => { const button = node('button', label); button.type = 'button'; button.id = `${prefix}-tab-${index}`; button.dataset.boothTab = String(index); button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', content.id); button.addEventListener('click', () => selectTab(index)); button.addEventListener('keydown', event => { let next; if (event.key === 'ArrowRight') next = (index + 1) % tabs.length; if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length; if (event.key === 'Home') next = 0; if (event.key === 'End') next = tabs.length - 1; if (next != null) { event.preventDefault(); selectTab(next); tabButtons[next].focus(); } }); navigation.append(button); return button; });
  const footer = node('footer', null, 'bz-browser__footer');
  const talkButton = node('button', '和攤位學長姐聊聊', 'bz-browser__talk'); talkButton.type = 'button'; talkButton.dataset.boothTalk = ''; talkButton.hidden = typeof onTalk !== 'function';
  footer.append(node('span', '科系探索，不是落點預測。'), talkButton);
  dialog.append(head, navigation, content, footer); root.append(dialog); document.body.append(root);
  const getMemory = () => memory.get(currentId);
  const paragraph = (parent, text, className) => { if (text != null && text !== '') parent.append(node('p', text, className)); };
  const heading = (parent, text) => parent.append(node('h3', text));
  const listing = (parent, items, format = item => item) => { const ul = node('ul'); for (const item of items || []) ul.append(node('li', format(item))); parent.append(ul); };
  function sources(parent, entries) {
    const valid = (entries || []).map(source => ({ ...source, url: safeSourceURL(source.publicURL) })).filter(source => source.url);
    if (!valid.length) return;
    const details = node('details', null, 'bz-browser__sources'); details.dataset.boothSources = ''; details.append(node('summary', '資料來源與年份'));
    for (const source of valid) { const p = node('p'); const a = node('a', source.title || '官方資料'); a.href = source.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; p.append(a); p.append(node('span', ` · ${source.year ? `${source.year}${/^\d+$/.test(String(source.year)) ? ' 年' : ''}` : '年份未標示'}${source.checkedAt ? ` · 查核 ${source.checkedAt}` : ''}`)); details.append(p); } parent.append(details);
  }
  function alumni(parent, dept, compact = false) {
    if (!(dept.alumni || []).length) { paragraph(parent, dept.missingAlumni || '目前沒有已核實的校友例子；不以未查證人物代替。', 'bz-browser__notice'); return; }
    for (const person of (compact ? dept.alumni.slice(0, 1) : dept.alumni)) {
      const card = node('article', null, 'bz-browser__card'); card.dataset.boothAlumni = ''; card.append(node('h4', person.name)); paragraph(card, [person.affiliation, person.degreeLevel].filter(Boolean).join(' · ')); paragraph(card, person.career); paragraph(card, person.note, 'bz-browser__note'); sources(card, person.sources); parent.append(card);
    }
    paragraph(parent, data.notices?.alumni, 'bz-browser__note');
  }
  function admissions(parent, dept) {
    paragraph(parent, data.notices?.admissions || '115 學年度歷史資料，僅供理解申請流程；不是錄取分數，也不能當作 116 學年度標準。', 'bz-browser__notice');
    paragraph(parent, dept.admissionsMapping?.note, 'bz-browser__note');
    const groups = dept.admissionsGroups || [];
    if (!groups.length) { paragraph(parent, '目前沒有可核實的招生組別資料，請以官方簡章為準。'); return; }
    const label = node('label', '先選擇招生組別', 'bz-browser__group-label'); label.htmlFor = `${prefix}-group`;
    const select = node('select'); select.id = `${prefix}-group`; select.dataset.boothGroup = ''; select.setAttribute('aria-label', '招生組別');
    if (groups.length > 1) { const empty = node('option', '請選擇組別後查看條件'); empty.value = ''; select.append(empty); }
    groups.forEach(group => { const option = node('option', `${group.name}（${group.code}）`); option.value = group.code; select.append(option); });
    if (groups.length === 1) getMemory().group = groups[0].code;
    select.value = getMemory().group || ''; parent.append(label, select);
    select.addEventListener('change', () => { getMemory().group = select.value; const saved = content.scrollTop; render(); content.scrollTop = saved; content.querySelector('select')?.focus(); });
    const group = groups.find(item => item.code === getMemory().group);
    if (!group) { paragraph(parent, '不同組別條件不能混用。請先選一組，才會顯示檢定、倍率與第一階段結果。', 'bz-browser__notice'); return; }
    const section = node('section'); section.dataset.boothAdmissions = group.code;
    heading(section, `${group.name} · ${group.year || 115} 學年度`); paragraph(section, [group.route, group.quota != null ? `名額 ${group.quota}` : null].filter(Boolean).join(' · '));
    heading(section, '一、學測檢定標準'); paragraph(section, group.thresholdDisplay); listing(section, Object.entries(group.thresholds || {}), ([subject, value]) => `${subject}：${value ?? '未訂檢定'}`); if (group.thresholdLogic?.mathAorB === 'either_one_passes') paragraph(section, group.thresholdLogic.note, 'bz-browser__note'); paragraph(section, '其餘有列檢定標準的科目，都須符合各自的檢定要求。', 'bz-browser__note');
    heading(section, '二、篩選倍率'); paragraph(section, '倍率是篩選規則，不是科目加權，也不是第二階段占比。', 'bz-browser__note'); listing(section, Object.entries(group.ratios || {}), ([subject, value]) => `${subject}：${value == null ? '未訂倍率' : `${value} 倍`}`);
    heading(section, '三、115 年第一階段篩選結果'); paragraph(section, '以下是當年第一階段通過門檻，不是最終錄取分數；各篩選步驟與組合須分開閱讀。', 'bz-browser__note');
    if (group.screeningSteps?.length) listing(section, group.screeningSteps, step => `步驟 ${step.order}｜${step.subjectExpression}：${step.minimumPassedScore ?? '未提供'} ${step.unit || ''}${step.ratio != null ? `（${step.ratio} 倍）` : ''}`);
    else listing(section, group.screeningResultsInOrder);
    if (group.subjectCombinations?.length) { heading(section, '科目組合'); listing(section, group.subjectCombinations, combo => `${combo.subjectsAsPublished}：${combo.resultScore ?? '未提供'}${combo.ratio != null ? `（${combo.ratio} 倍）` : ''}`); }
    paragraph(section, group.gsatSubjectsScope, 'bz-browser__note'); paragraph(section, group.sameScoreNote); if (group.sameScoreThresholdStatus === 'officially_not_disclosed') paragraph(section, '同級分超額篩選門檻：官方未公布，不自行推算。', 'bz-browser__note'); else if (group.sameScoreThresholdStatus === 'not_marked_as_executed') paragraph(section, '官方資料未標示有執行同級分超額篩選。', 'bz-browser__note');
    if (group.apcs) { heading(section, 'APCS（與學測分開看）'); for (const [key, labelText] of [['thresholds', '檢定'], ['ratios', '倍率'], ['result', '結果']]) listing(section, Object.entries(group.apcs[key] || {}), ([subject, value]) => `${labelText} · ${subject}：${value ?? '未訂'}${key === 'ratios' && value != null ? ' 倍' : ''}`); }
    paragraph(section, group.secondStageNote || '第二階段項目與占比請查當年度官方簡章；此處不提供未核實權重。', 'bz-browser__notice'); sources(section, group.sources); parent.append(section);
  }
  function portfolio(parent, dept) {
    const item = dept.portfolio || {}; heading(parent, '學習歷程與申請準備');
    heading(parent, `官方參採重點${item.year ? ` · ${item.year} 年` : ''}`); paragraph(parent, item.officialFocus || '尚無已核實的官方參採重點。'); paragraph(parent, item.requirements); paragraph(parent, item.groupDifferences); sources(parent, item.sources);
    heading(parent, '準備建議（非官方要求）'); paragraph(parent, item.advice || '依官方簡章整理能呈現學習過程與反思的材料。'); paragraph(parent, item.limitations, 'bz-browser__note'); paragraph(parent, data.notices?.portfolio, 'bz-browser__note');
  }
  function render() {
    const dept = departments.get(currentId); content.replaceChildren(); content.dataset.boothId = currentId; content.dataset.activeTab = String(currentTab);
    tabButtons.forEach((button, index) => { button.setAttribute('aria-selected', String(index === currentTab)); button.tabIndex = index === currentTab ? 0 : -1; }); content.setAttribute('aria-labelledby', tabButtons[currentTab].id);
    if (currentTab === 0) { paragraph(content, dept.intro, 'bz-browser__intro'); heading(content, '你會接觸的課程'); listing(content, (dept.courses || []).slice(0, 3)); paragraph(content, dept.courseNote, 'bz-browser__note'); heading(content, '可能探索的方向'); listing(content, (dept.careers || []).slice(0, 3), career => `${career.name}${career.basis === 'derived' ? '（延伸方向）' : '（官方列示）'}`); paragraph(content, dept.careerNote, 'bz-browser__note'); heading(content, '學長姐的一條路'); alumni(content, dept, true); }
    if (currentTab === 1) { heading(content, '課程探索'); listing(content, dept.courses); paragraph(content, dept.courseNote || data.notices?.courses, 'bz-browser__note'); heading(content, '出路不只有一種'); listing(content, dept.careers, career => `${career.name} · ${career.basis === 'derived' ? '依學習內容延伸，非官方保證' : '官方資料列示'}`); paragraph(content, dept.careerNote, 'bz-browser__note'); paragraph(content, data.notices?.careers, 'bz-browser__note'); }
    if (currentTab === 2) { heading(content, '學長姐的不同路徑'); alumni(content, dept); }
    if (currentTab === 3) { admissions(content, dept); portfolio(content, dept); }
    sources(content, dept.sources); content.scrollTop = getMemory().scroll[currentTab] || 0;
  }
  function selectTab(index) { if (currentId == null) return; getMemory().scroll[currentTab] = content.scrollTop; currentTab = index; getMemory().tab = index; render(); }
  function restoreFocus() { const target = trigger?.isConnected && !trigger.hidden ? trigger : (document.querySelector('canvas') || document.querySelector('[data-booth-open], #bz-passport-button')); if (target?.focus) { if (target.tagName === 'CANVAS' && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); } }
  function close() {
    if (currentId == null) return false;
    getMemory().scroll[currentTab] = content.scrollTop; const id = currentId; currentId = null; root.hidden = true;
    for (const [element, inert] of isolated) element.inert = inert; isolated = []; document.body.style.overflow = previousOverflow; state.busy = previousBusy; onClose?.(id); restoreFocus(); return true;
  }
  closeButton.addEventListener('click', close); root.addEventListener('click', event => { if (event.target === root) close(); });
  talkButton.addEventListener('click', () => { const id = currentId; close(); onTalk?.(id); });
  const keyboardGuard = event => {
    if (currentId == null) return;
    const tabIndex = tabButtons.indexOf(document.activeElement);
    if (event.type === 'keydown' && tabIndex >= 0 && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 3 : (tabIndex + (event.key === 'ArrowRight' ? 1 : 3)) % 4;
      event.preventDefault(); selectTab(next); tabButtons[next].focus();
    }
    if (event.type !== 'keydown') { event.stopImmediatePropagation(); return; }
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') { const focusable = [...dialog.querySelectorAll('button, a[href], select, summary, [tabindex]')].filter(el => !el.hidden && !el.disabled && el.tabIndex >= 0 && !el.closest('details:not([open])') || (!el.hidden && el.tagName === 'SUMMARY' && !el.disabled)); const first = focusable[0], last = focusable[focusable.length - 1]; if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
    event.stopImmediatePropagation();
  };
  const keyboardTarget = document.defaultView || document;
  keyboardTarget.addEventListener('keydown', keyboardGuard, true);
  keyboardTarget.addEventListener('keyup', keyboardGuard, true);
  for (const event of ['keyup', 'keypress', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchend', 'wheel']) root.addEventListener(event, event => event.stopPropagation());
  const focusGuard = event => { if (currentId != null && !root.contains(event.target)) closeButton.focus(); }; document.addEventListener('focusin', focusGuard);
  return {
    open(id, options = {}) {
      if (disposed || currentId != null || state.busy || !departments.has(id)) return false;
      trigger = options.trigger || document.activeElement; previousBusy = state.busy; state.busy = true; currentId = id;
      if (!memory.has(id)) memory.set(id, { tab: 0, scroll: {}, group: '' }); currentTab = getMemory().tab;
      const dept = departments.get(id); title.textContent = dept.name; college.textContent = dept.collegeName || (typeof dept.college === 'object' ? dept.college.name : dept.college);
      const color = dept.collegeColor || dept.college?.color; college.style.setProperty('--college-color', /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#6a8a72');
      isolated = [...document.body.children].filter(el => el !== root && !['SCRIPT', 'STYLE', 'LINK'].includes(el.tagName)).map(el => [el, el.inert]); for (const [element] of isolated) element.inert = true;
      previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; root.hidden = false; render(); onOpen?.(id); closeButton.focus({ preventScroll: true }); return true;
    }, close,
    dispose() { close(); disposed = true; document.removeEventListener('focusin', focusGuard); keyboardTarget.removeEventListener('keydown', keyboardGuard, true); keyboardTarget.removeEventListener('keyup', keyboardGuard, true); root.remove(); memory.clear(); },
    get isOpen() { return currentId != null; }, get currentId() { return currentId; }
  };
}
