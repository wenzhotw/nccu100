import DATA from './booth-browser-data.json';
import { mountBoothBrowser } from './booth-browser-ui.js';
import { boothBrowsePoint, nearestBrowseBooth, BOOTH_BROWSE_LOCAL } from './booth-browser-logic.js';
import './booth-browser.css';

/** One activity-owned controller. Registry entries are added/removed with the venue. */
export function createBoothBrowsing({ layout, content, tents, state, spots, getPosition, canInteract,
  onTalk, resetInput, stopVelocity, document: doc = globalThis.document }) {
  const departments = layout.tents.filter(t => /^D\d{2}$/.test(t.id));
  const byId = new Map(DATA.departments.map(d => [d.id, d]));
  const collegeById = new Map(content.colleges.map(c => [c.id, c]));
  const data = { ...DATA, departments: DATA.departments.map(d => ({ ...d,
    collegeName: collegeById.get(d.college)?.name || d.college,
    collegeColor: collegeById.get(d.college)?.color || '#356852' })) };
  const button = doc.createElement('button'); button.id = 'bz-booth-browse-button'; button.type = 'button';
  button.hidden = true; button.setAttribute('aria-haspopup', 'dialog'); doc.body.append(button);
  let active = false, disposed = false, nearby = null;
  const posters = new Map(departments.map(t => [t.id, (tents.tents.get(t.id)?.parts.signs || [])
    .filter(p => p.userData.bz26Poster !== undefined)
    .map(p => ({ mesh: p, color: p.material.color.clone() }))]));
  const panel = mountBoothBrowser({ data, state, document: doc,
    onOpen() { state.bzBoothBrowsing = true; resetInput(); stopVelocity(); button.hidden = true; },
    onClose() { state.bzBoothBrowsing = false; resetInput(); stopVelocity(); update(); },
    onTalk(id) { if (active && canInteract() && !state.busy) onTalk(id); },
  });
  function eligible() { return active && !disposed && state.started && !state.room && !state.driving && canInteract(); }
  function open(id) {
    if (!eligible() || state.busy || !byId.has(id)) return false;
    // Both the visible button and the core interaction return focus here on close.
    button.hidden = false;
    return panel.open(id, { trigger: button });
  }
  const entries = departments.map(t => {
    const p = boothBrowsePoint(t);
    return { id: `bz26-browse-${t.id}`, x: p.x, z: p.z, r: BOOTH_BROWSE_LOCAL.radius,
      label: '查看科系', room: null,
      ok: () => eligible() && nearestBrowseBooth(departments, getPosition())?.id === t.id,
      fn: () => open(t.id) };
  });
  function highlight(id) {
    for (const [key, list] of posters) for (const { mesh, color } of list) {
      mesh.material.color.copy(color);
      if (id === key) mesh.material.color.set('#fff0bd');
    }
  }
  function update() {
    if (disposed) return;
    if (panel.isOpen && !eligible()) panel.close();
    const target = eligible() && !state.busy ? nearestBrowseBooth(departments, getPosition()) : null;
    if (nearby?.id !== target?.id) { nearby = target; highlight(target?.id); }
    button.hidden = !target || panel.isOpen;
    if (target) {
      button.textContent = `查看科系 · ${byId.get(target.id)?.name || target.id}  B`;
      button.dataset.boothId = target.id;
    } else delete button.dataset.boothId;
  }
  function setActive(on) {
    if (disposed || active === !!on) return;
    active = !!on;
    if (active) { for (const e of entries) if (!spots.includes(e)) spots.push(e); }
    else {
      panel.close();
      for (const e of entries) { const i = spots.indexOf(e); if (i >= 0) spots.splice(i, 1); }
      if (entries.includes(state.near)) state.near = null;
      nearby = null; highlight(null); button.hidden = true;
    }
    update();
  }
  function click() { if (nearby) open(nearby.id); }
  function key(e) {
    if (e.code !== 'KeyB' || e.repeat || e.isComposing || e.metaKey || e.ctrlKey || e.altKey ||
      /^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName) || e.target?.isContentEditable || panel.isOpen) return;
    update();
    if (nearby && open(nearby.id)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }
  button.addEventListener('click', click); doc.addEventListener('keydown', key, true);
  return { panel, entries, open, update, setActive,
    get nearbyId() { return nearby?.id || null; },
    dispose() { if (disposed) return; setActive(false); disposed = true; panel.dispose();
      button.removeEventListener('click', click); doc.removeEventListener('keydown', key, true); button.remove(); },
  };
}
