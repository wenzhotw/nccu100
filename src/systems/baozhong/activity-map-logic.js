import { footprint as radioFootprint, CANDIDATES as RADIO_AT } from './radio-logic.js';
import { tentFootprint, CANDIDATES as PROGRAMS_AT } from './programs-logic.js';
const mid = r => [+((r.x0 + r.x1) / 2).toFixed(2), +((r.z0 + r.z1) / 2).toFixed(2)];
/** v1.69／v1.70 會場另外加的兩處（不在 layout.json）：座標由各自的純邏輯算出首選位置，不另存一份。 */
export function extraEntries() {
  const radio = radioFootprint(RADIO_AT[0]), tent = tentFootprint(PROGRAMS_AT[0]);
  return [
    { id: 'FM', x: radio.x, z: radio.z, anchor: mid(radio.approach), segment: '噴水池與四維堂之間', name: '政大之聲電台', college: '功能攤位', color: '#c69b3c' },
    { id: 'X', x: tent.x, z: tent.z, anchor: mid(tent.approach), segment: '校園大道西側', name: '跨域學程帳篷（校內雙主修）', college: '跨域學程', color: '#7e57c2' },
  ];
}
/** 活動導覽只讀取帳篷配置，不保存第二份座標。 */
export function activityEntries(layout, content) {
  return [...layoutEntries(layout, content), ...extraEntries()];
}
function layoutEntries(layout, content) {
  const departments = new Map(content.booths.map(b => [b.id, b]));
  const colleges = new Map(content.colleges.map(c => [c.id, c]));
  const functions = new Map((content.functions || []).map(f => [f.id, f]));
  return layout.tents.map(t => {
    const b = departments.get(t.id), c = colleges.get(b?.college);
    return { id: t.id, x: t.x, z: t.z, anchor: [...t.anchor], segment: t.seg,
      name: b?.dept || (t.id === 'F01' ? content.service.title : functions.get(t.id)?.title) || t.id,
      college: c?.name || '功能攤位', color: c?.color || '#c69b3c' };
  });
}
export function filterActivity(entries, query = '', college = '') {
  const q = query.trim().toLocaleLowerCase();
  return entries.filter(e => (!college || e.college === college) &&
    `${e.id} ${e.name} ${e.college} ${e.segment}`.toLocaleLowerCase().includes(q));
}
export function activityDirection(position, entry) {
  if (!entry || !position || !Number.isFinite(position.x) || !Number.isFinite(position.z)) return null;
  const dx = entry.anchor[0] - position.x, dz = entry.anchor[1] - position.z;
  const distance = Math.hypot(dx, dz);
  const words = [];
  if (Math.abs(dz) > distance * .35) words.push(dz < 0 ? '校園內側' : '校門方向');
  if (Math.abs(dx) > distance * .35) words.push(dx < 0 ? '大道左側' : '大道右側');
  return { dx, dz, distance, label: distance < 3 ? '已到攤位附近' : words.join('、') };
}
export function activityBounds(entries, position) {
  const points = entries.map(e => [e.x, e.z]);
  if (position && Number.isFinite(position.x) && Number.isFinite(position.z)) points.push([position.x, position.z]);
  return { minX: Math.min(...points.map(p => p[0])) - 6, maxX: Math.max(...points.map(p => p[0])) + 6,
    minZ: Math.min(...points.map(p => p[1])) - 6, maxZ: Math.max(...points.map(p => p[1])) + 6 };
}
