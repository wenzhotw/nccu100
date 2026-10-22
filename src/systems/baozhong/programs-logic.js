// src/systems/baozhong/programs-logic.js（v1.70，Claude，依 Wenzel 2026-10-22 指示）：跨域學程帳篷與友校交流的純邏輯，可在 Node 測。
// 跨域學程帳篷：大道西側、噴水池看板與友校交流帳篷（F03）之間，一頂約 7.2 × 3.2 公尺、分 4 格的長帳篷，正面朝大道（+x）。
// 友校：4 位交流大使站在 F03 前面一排；F03 原本的引路人改成主持友校配對小遊戲。
// 旗標：學程章 bz26_pg_<P0x>、全對 bz26_pgpf_<P0x>、進階 bz26_pgadv_<P0x>；友校小遊戲章 bz26_pt_F03、全對 bz26_ptpf_F03。
// 這些章不算學院勳章、不進大會考，也不進茶葉點數公式（passport-logic.js 只認既有旗標）。

export const TENT = Object.freeze({ L: 7.2, D: 3.2, H: 2.5, BAYS: 4 });
export const ROT_Y = Math.PI / 2;
// 中心 z 的空間：北邊是噴水池旁活動看板（z 約 −36 到 −35.4），南邊是 F03（z −47.5 起），兩邊各留 0.45 公尺。
export const CANDIDATES = Object.freeze([
  { x: -9.9, z: -40.25 }, { x: -9.3, z: -40.25 }, { x: -10.5, z: -40.25 }, { x: -9.9, z: -40.6 }, { x: -9.9, z: -39.9 },
]);

export function tentFootprint({ x, z }) {
  const hx = TENT.D / 2, hz = TENT.L / 2;
  return {
    x, z, rotY: ROT_Y,
    box: { x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz },
    approach: { x0: x + hx + 0.1, x1: x + hx + 1.3, z0: z - hz + 0.3, z1: z + hz - 0.3 },
  };
}
/** 本地座標轉世界座標（rotY = π/2，本地 +z 是正面、朝大道 +x）。 */
export function toWorld(fp, lx, lz) {
  const c = Math.cos(fp.rotY), s = Math.sin(fp.rotY);
  return { x: +(fp.x + lx * c + lz * s).toFixed(3), z: +(fp.z - lx * s + lz * c).toFixed(3) };
}
/** 4 格的中心（本地 x）與學程 NPC 站位（本地 z，站在櫃台後面）。第 1 格最靠噴水池。 */
export const BAY_X = Object.freeze([-2.7, -0.9, 0.9, 2.7]);
export const NPC_Z = 0.1;

const MARGIN = 0.45;
function toRect(c) {
  if (c.obb) { const hx = Math.abs(c.hx * c.cs) + Math.abs(c.hz * c.sn), hz = Math.abs(c.hx * c.sn) + Math.abs(c.hz * c.cs); return { x0: c.cx - hx, x1: c.cx + hx, z0: c.cz - hz, z1: c.cz + hz }; }
  return c;
}
function rectHits(R, c, m = 0) {
  if (c.c) { const nx = Math.max(R.x0, Math.min(c.x, R.x1)), nz = Math.max(R.z0, Math.min(c.z, R.z1)); return Math.hypot(c.x - nx, c.z - nz) < c.r + m; }
  const b = toRect(c);
  return R.x0 < b.x1 + m && R.x1 > b.x0 - m && R.z0 < b.z1 + m && R.z1 > b.z0 - m;
}
/** 帳篷不壓到碰撞體、帳篷、互動點，正面站位不被擋，也不跨進校園大道。 */
export function tentConflicts(fp, { colliders = [], tents = [], spots = [], avenueHalf = 6 } = {}) {
  const out = [];
  const solids = [...colliders.filter(c => c.owner !== 'bz26-programs'), ...tents.map(t => ({ x0: t.box[0], x1: t.box[1], z0: t.box[2], z1: t.box[3], id: t.id }))];
  for (const c of solids) {
    if (rectHits(fp.box, c, MARGIN)) out.push({ kind: 'tent', with: c });
    if (rectHits(fp.approach, c)) out.push({ kind: 'approach', with: c });
  }
  // 互動點的 r 是交談半徑，不是實體；只要站位本身（約一人寬）不被帳篷蓋住即可。
  for (const s of spots) if (rectHits(fp.box, { c: true, x: s.x, z: s.z, r: 0.3 })) out.push({ kind: 'spot', with: { label: s.label, x: s.x, z: s.z } });
  if (fp.box.x1 > -avenueHalf) out.push({ kind: 'avenue', with: { x1: fp.box.x1 } });
  return out;
}
export function tentPlacement(ctx, candidates = CANDIDATES) {
  const tried = [];
  for (const c of candidates) {
    const fp = tentFootprint(c), conflicts = tentConflicts(fp, ctx);
    if (!conflicts.length) return { ...fp, conflicts: [], tried };
    tried.push({ ...c, conflicts });
  }
  return { ...tentFootprint(candidates[0]), conflicts: tried[0].conflicts, tried };
}
/** 帳篷底下（含外擴 margin）的植栽：會場開時暫收，離場恢復；位置檢查也不把它們算成障礙。 */
export function foliageUnder(fp, foliage, margin = 0.9) {
  const b = fp.box;
  return foliage.filter(f => Number.isFinite(f.x) && Number.isFinite(f.z) && f.x > b.x0 - margin && f.x < b.x1 + margin && f.z > b.z0 - margin && f.z < b.z1 + margin);
}
export const tentColliders = fp => [{ x0: fp.box.x0, x1: fp.box.x1, z0: fp.box.z0, z1: fp.box.z1, owner: 'bz26-programs' }];

/** 4 位友校交流大使：F03 前面一排，避開 F03 引路人（−7.3, −46.0），彼此間隔 1 公尺。 */
export const PARTNER_SPOTS = Object.freeze([
  { id: 'NTHU', x: -6.9, z: -44.1 }, { id: 'NYCU', x: -6.9, z: -45.1 }, { id: 'NCU', x: -6.9, z: -46.9 }, { id: 'TNUA', x: -6.9, z: -47.9 },
]);
export const PARTNER_FACE = Math.PI / 2;

/* ---------- 旗標 ---------- */
export const pgFlag = id => `bz26_pg_${id}`;
export const pgPerfect = id => `bz26_pgpf_${id}`;
export const pgAdv = id => `bz26_pgadv_${id}`;
export const PT_FLAG = 'bz26_pt_F03', PT_PERFECT = 'bz26_ptpf_F03';
const toSet = f => (f instanceof Set ? f : new Set(f || []));

/** 學程攤位現在是初訪還是回訪。 */
export function programStage(flags, id) {
  const f = toSet(flags);
  return { kind: f.has(pgFlag(id)) ? 'return' : 'first', advancedDone: f.has(pgAdv(id)) };
}
/** 初訪小遊戲結算：完成就蓋章，每步首次都對再記全對；取消不給。只回要設的旗標。 */
export function firstResult(flags, id, result) {
  const f = toSet(flags);
  if (!result || result.status !== 'completed') return { completed: false, set: [] };
  const perfect = result.total > 0 && result.score === result.total, set = [];
  if (!f.has(pgFlag(id))) set.push(pgFlag(id));
  if (perfect && !f.has(pgPerfect(id))) set.push(pgPerfect(id));
  return { completed: true, perfect, stamped: set.includes(pgFlag(id)), set, score: result.score, total: result.total };
}
/** 進階：要先有章，全對才過，只給一次。 */
export function advancedResult(flags, id, result, questionCount) {
  const f = toSet(flags);
  if (!f.has(pgFlag(id)) || !result || result.status !== 'completed') return { passed: false, set: [] };
  const passed = result.total === questionCount && result.score === result.total;
  return { passed, set: passed && !f.has(pgAdv(id)) ? [pgAdv(id)] : [], score: result.score, total: result.total };
}
/** 友校配對小遊戲結算。 */
export function partnerResult(flags, result) {
  const f = toSet(flags);
  if (!result || result.status !== 'completed') return { completed: false, set: [] };
  const perfect = result.total > 0 && result.score === result.total, set = [];
  if (!f.has(PT_FLAG)) set.push(PT_FLAG);
  if (perfect && !f.has(PT_PERFECT)) set.push(PT_PERFECT);
  return { completed: true, perfect, set, score: result.score, total: result.total };
}

/* ---------- 護照 ---------- */
/** 在護照的學院清單後面多加兩頁：跨域學程（4 格）、友校（1 格）。不改原物件。 */
export function decoratePassport(view, flags, data) {
  const f = toSet(flags);
  const programs = {
    id: 'X01', name: '跨域學程', color: '#7e57c2', medal: false, ready: false, statusText: '校內雙主修',
    booths: data.programs.map(p => ({ id: p.id, dept: p.short || p.name, stamp: f.has(pgFlag(p.id)), perfect: f.has(pgPerfect(p.id)), advancedAvailable: true, advanced: f.has(pgAdv(p.id)) })),
  };
  const partners = {
    id: 'X02', name: '友校交流', color: '#c62828', medal: false, ready: false, statusText: '台聯大與北藝大',
    booths: [{ id: 'F03', dept: '友校配對小遊戲', stamp: f.has(PT_FLAG), perfect: f.has(PT_PERFECT) }],
  };
  return { ...view, colleges: [...(view.colleges || []), programs, partners] };
}

/* ---------- 對話 ---------- */
/** 清單切成一行最多 3 項，方便在對話框裡一頁一頁看。 */
export function listLines(list, per = 3) {
  const out = [];
  for (let i = 0; i < list.items.length; i += per) out.push(list.items.slice(i, i + per).join('、'));
  return [list.title, ...out, ...(list.note ? [list.note] : [])];
}
/** 每一個 source 鍵都要在 sources 裡、有 http(s) 網址與學年度；遊戲每一項都要有 source 或 invented。 */
export function sourceErrors(data) {
  const out = [], S = data.sources || {};
  const need = (k, where) => { const s = S[k]; if (!s || !/^https?:\/\//.test(s.url || '') || !s.year) out.push(`${where}: 來源 ${k} 缺少網址或學年度`); };
  for (const p of data.programs) {
    for (const k of p.sources || []) need(k, p.id);
    for (const x of [...(p.game.items || []), ...(p.game.pairs || []), ...(p.game.cards || [])]) {
      if (x.source) need(x.source, `${p.id}.${x.id}`); else if (!x.invented) out.push(`${p.id}.${x.id}: 沒有來源`);
    }
    p.advanced.forEach((q, i) => (q.source ? need(q.source, `${p.id}.adv${i}`) : out.push(`${p.id}.adv${i}: 沒有來源`)));
  }
  for (const x of data.partners.game.pairs) x.source ? need(x.source, `partner.${x.id}`) : out.push(`partner.${x.id}: 沒有來源`);
  for (const s of data.partners.schools) need(s.list.source, s.id);
  return out;
}
