// v1.70 跨域學程帳篷與友校交流的純邏輯與內容測試（Claude）。畫面與流程由 scripts/baozhong-smoke.mjs 用真瀏覽器走過。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as P from '../src/systems/baozhong/programs-logic.js';
import * as R from '../src/systems/baozhong/radio-logic.js';
import * as L from '../src/systems/baozhong/passport-logic.js';
import { signPlacement } from '../src/systems/baozhong/activity-sign-logic.js';
import { stepsFromGame, createSortRound } from '../src/systems/baozhong/stage2/rounds.js';

const read = rel => JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), 'utf8'));
const D = read('../src/content/baozhong-programs.json');
const C = read('../src/content/baozhong.json');
const LAYOUT = read('../src/systems/baozhong/layout.json');

test('content: every fact has an official source with a URL and school year', () => {
  assert.deepEqual(P.sourceErrors(D), []);
  assert.equal(D.programs.length, 4);
  assert.deepEqual(D.programs.map(p => p.short || p.name), ['校學士', '電子物理', '數位內容', '人工智慧應用']);
  assert.deepEqual(D.partners.schools.map(s => s.name), ['清華大學', '陽明交通大學', '中央大學', '臺北藝術大學']);
  for (const s of D.partners.schools) assert.equal(s.list.year, D.sources[s.list.source].year, `${s.id} 清單學年度要和來源一致`);
});

test('content: notice says it is an in-school double major you cannot test into', () => {
  assert.match(D.notice, /校內雙主修/);
  assert.match(D.notice, /不是正式科系/);
  assert.match(D.notice, /不能考進來/);
  assert.match(D.notice, /進政大以後才能申請/);
});

test('content: no em dashes; games and advanced questions are well-formed', () => {
  const walk = (v, out = []) => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(x => walk(x, out)); return out; };
  for (const s of walk({ ...D, sources: undefined })) assert.doesNotMatch(s, /—|--/, s);
  for (const p of D.programs) {
    const g = p.game;
    if (g.type === 'classify') for (const s of stepsFromGame(g)) assert.ok(s.answer >= 0 && s.answer < s.options.length, `${p.id} ${s.prompt}`);
    if (g.type === 'matching') { assert.equal(new Set(g.pairs.map(x => x.right)).size, g.pairs.length); assert.ok(g.pairs.length >= 3); }
    if (g.type === 'sort') assert.doesNotThrow(() => createSortRound(g.cards));
    assert.equal(p.advanced.length, 3);
    for (const q of p.advanced) { assert.ok(q.answer >= 0 && q.answer < q.options.length, q.q); assert.equal(new Set(q.options).size, q.options.length); }
  }
  assert.equal(new Set(D.partners.game.pairs.map(x => x.right)).size, D.partners.game.pairs.length);
});

test('placement: tent clears every venue tent, the radio booth and the activity sign, west of the avenue', () => {
  const radio = R.radioColliders(R.footprint(R.CANDIDATES[0]));
  const sign = signPlacement(-32, []);
  const signBox = { ...sign.box };
  const p = P.tentPlacement({ colliders: [...radio, signBox], tents: LAYOUT.tents, spots: [{ x: sign.x, z: sign.z + 1.25, r: 0.6, label: '看板' }] });
  assert.deepEqual(p.conflicts, []);
  assert.deepEqual([p.x, p.z], [P.CANDIDATES[0].x, P.CANDIDATES[0].z]);
  assert.ok(p.box.x1 <= -6, '不能跨進校園大道');
  assert.ok(p.box.z1 < sign.box.z0 && p.box.z0 > LAYOUT.tents.find(t => t.id === 'F03').box[3], '在看板與友校交流帳篷之間');
  assert.equal(P.tentColliders(p).length, 1);
  assert.deepEqual(P.tentConflicts(p, { colliders: P.tentColliders(p) }), [], '自己的碰撞體不算衝突');
  // 交談半徑 2.4 的互動點不算擋路，只看站位本身。
  assert.deepEqual(P.tentConflicts(p, { spots: [{ x: sign.x, z: sign.z + 1.25, r: 2.4 }] }), []);
  const under = P.foliageUnder(p, [{ x: p.x, z: p.z }, { x: p.box.x1 + 0.5, z: p.z }, { x: p.box.x1 + 3, z: p.z }]);
  assert.equal(under.length, 2, '帳篷底下與緊貼帳篷的植栽會暫收，遠的不動');
  const wall = { x0: -20, x1: -5, z0: -46, z1: -34 };
  const q = P.tentPlacement({ colliders: [wall], tents: [] });
  assert.ok(q.conflicts.length > 0);
  assert.equal(q.tried.length, P.CANDIDATES.length);
});

test('placement: program NPCs stand inside their bays and are reachable from the front', () => {
  const fp = P.tentFootprint(P.CANDIDATES[0]);
  for (const bx of P.BAY_X) {
    const w = P.toWorld(fp, bx, P.NPC_Z);
    assert.ok(w.x > fp.box.x0 && w.x < fp.box.x1 && w.z > fp.box.z0 && w.z < fp.box.z1);
    const front = { x: fp.box.x1 + 0.4, z: w.z };
    assert.ok(Math.hypot(w.x - front.x, w.z - front.z) < 2.4, '互動半徑 2.4');
  }
  // 四位交流大使和 F03 引路人站成一排：彼此至少 0.85 公尺，不進任何帳篷。
  const f03 = LAYOUT.tents.find(t => t.id === 'F03');
  const row = [...P.PARTNER_SPOTS, { id: 'guide', ...P.GUIDE_SPOT }];
  for (const [i, a] of row.entries()) {
    assert.ok(a.x > f03.box[1] && a.z <= f03.box[3] + 0.3 && a.z >= f03.box[2] - 0.3, a.id);
    for (const b of row.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 0.849, `${a.id}-${b.id}`);
    assert.ok(!(a.x > fp.box.x0 && a.x < fp.box.x1 && a.z > fp.box.z0 && a.z < fp.box.z1));
  }
  // 站在學程攤位正面（被帳篷擋在外 0.35 公尺）時，最近的互動對象一定是該學程代表。
  for (const bx of P.BAY_X) {
    const w = P.toWorld(fp, bx, P.NPC_Z), stand = { x: fp.box.x1 + 0.35, z: w.z };
    const dRep = Math.hypot(w.x - stand.x, w.z - stand.z);
    for (const a of row) assert.ok(Math.hypot(a.x - stand.x, a.z - stand.z) > Math.min(dRep, 2.4), `第 ${bx} 格前面會點到 ${a.id}`);
  }
  // 站在每位大使正面 1 公尺時，最近的是他本人。
  for (const a of row) { const stand = { x: a.x + 1, z: a.z }; for (const b of row) if (b !== a) assert.ok(Math.hypot(b.x - stand.x, b.z - stand.z) > 1, `${a.id} 前面會點到 ${b.id}`); }
});

test('results: stamp on completion, perfect only when all right, advanced needs a stamp and all correct', () => {
  const done = (score, total = 3) => ({ status: 'completed', score, total });
  assert.deepEqual(P.firstResult(new Set(), 'P01', { status: 'cancelled' }).set, []);
  assert.deepEqual(P.firstResult(new Set(), 'P01', done(2)).set, ['bz26_pg_P01']);
  assert.deepEqual(P.firstResult(new Set(), 'P01', done(3)).set, ['bz26_pg_P01', 'bz26_pgpf_P01']);
  assert.deepEqual(P.firstResult(new Set(['bz26_pg_P01', 'bz26_pgpf_P01']), 'P01', done(3)).set, []);
  assert.equal(P.advancedResult(new Set(), 'P02', done(3), 3).passed, false, '沒有章不能進階');
  assert.deepEqual(P.advancedResult(new Set(['bz26_pg_P02']), 'P02', done(2), 3).set, []);
  assert.deepEqual(P.advancedResult(new Set(['bz26_pg_P02']), 'P02', done(3), 3).set, ['bz26_pgadv_P02']);
  assert.deepEqual(P.partnerResult(new Set(), done(3)).set, [P.PT_FLAG, P.PT_PERFECT]);
  assert.deepEqual(P.partnerResult(new Set([P.PT_FLAG]), done(1)).set, []);
  assert.deepEqual(P.programStage(new Set(['bz26_pg_P03']), 'P03'), { kind: 'return', advancedDone: false });
});

test('passport: two extra pages, not medals, and tea points stay the same', () => {
  const f = new Set(['bz26_pg_P01', 'bz26_pgadv_P01', P.PT_FLAG]);
  const view = L.passportView(f, C);
  const v = P.decoratePassport(view, f, D);
  assert.equal(v.colleges.length, view.colleges.length + 2);
  assert.equal(view.colleges.length, C.colleges.length, '不改原物件');
  const [x1, x2] = v.colleges.slice(-2);
  assert.equal(x1.name, '跨域學程'); assert.equal(x1.medal, false); assert.equal(x1.statusText, '校內雙主修');
  assert.deepEqual(x1.booths.map(b => b.stamp), [true, false, false, false]);
  assert.equal(x1.booths[0].advanced, true);
  assert.equal(x2.name, '友校交流'); assert.equal(x2.booths[0].stamp, true);
  assert.equal(L.points(f), L.points(new Set()), '學程與友校的章不加茶葉點數');
  assert.equal(v.points, view.points);
});

test('dialog: list pages show at most three departments per line, then the note', () => {
  const s = D.partners.schools.find(x => x.id === 'NCU');
  const lines = P.listLines(s.list);
  assert.equal(lines[0], s.list.title);
  assert.equal(lines.at(-1), s.list.note);
  assert.equal(lines.length, 1 + Math.ceil(s.list.items.length / 3) + 1);
  assert.equal(lines.slice(1, -1).join('、'), s.list.items.join('、'));
});

test('partner tees: abbreviations and official colors are sourced; guessed colors are labelled', async () => {
  const { paintTee } = await import('../src/systems/baozhong/college-tee.js');
  const tee = Object.fromEntries(D.partners.schools.map(s => [s.id, s.tee]));
  assert.deepEqual(Object.values(tee).map(t => t.abbr), ['NTHU', 'NYCU', 'NCU', 'TNUA']);
  assert.equal(tee.NTHU.color.toLowerCase(), '#7f1084', '清華紫：網路用 RGB 127,16,132');
  assert.equal(tee.NYCU.color.toLowerCase(), '#0033a0', '陽明交大群青');
  for (const id of ['NCU', 'TNUA']) assert.match(tee[id].colorInvented, /待確認/);
  assert.equal(tee.TNUA.icon, 'buffalo');
  for (const t of Object.values(tee)) {
    const texts = [], calls = [];
    const g = new Proxy({}, { get: (o, k) => k in o ? o[k] : (k === 'fillText' || k === 'strokeText') ? (s => texts.push(s)) : (() => calls.push(k)), set: (o, k, v) => (o[k] = v, true) });
    paintTee(g, 512, 288, t);
    assert.ok([...t.abbr].every(ch => texts.includes(ch)), `${t.abbr} 每個字母都有印`);
    assert.ok(texts.includes(t.sub), `${t.sub} 有印`);
    if (t.icon) assert.ok(calls.includes('ellipse'), '北藝大有畫校牛');
  }
});
