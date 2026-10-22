// v1.69 政大之聲電台棚與入口的純邏輯測試（Claude）。畫面與流程由 scripts/baozhong-smoke.mjs 用真瀏覽器走過。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as R from '../src/systems/baozhong/radio-logic.js';
import { INVITE_BUBBLE } from '../src/systems/baozhong/festival-arch-logic.js';
import * as L from '../src/systems/baozhong/passport-logic.js';

const read = rel => JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), 'utf8'));
const C = read('../src/content/baozhong.json');
const LAYOUT = read('../src/systems/baozhong/layout.json');
const tentBoxes = LAYOUT.tents;

test('placement: first candidate clears every tent, sits west of the avenue between the fountain and 四維堂', () => {
  const p = R.radioPlacement({ colliders: [], tents: tentBoxes, spots: [] });
  assert.deepEqual(p.conflicts, []);
  assert.ok(p.box.x1 <= -6, '不能跨進校園大道');
  assert.ok(p.z < -32 && p.z > -77.5, '在噴水池（z −32）與四維堂正面（z −77.5）之間');
  // 不碰友校交流帳篷 F03 與服務台 F01。
  for (const id of ['F03', 'F01']) {
    const t = LAYOUT.tents.find(x => x.id === id);
    assert.ok(p.box.z1 < t.box[2] || p.box.z0 > t.box[3] || p.box.x1 < t.box[0] || p.box.x0 > t.box[1], id);
  }
});

test('placement: a collider in the way pushes it to the next candidate; all blocked reports conflicts', () => {
  const first = R.footprint(R.CANDIDATES[0]);
  // 一棵樹在第一個候選點的後牆外，第二個候選點（往大道挪 0.9 公尺）就避得開。
  const tree = { c: true, x: first.box.x0 - 0.2, z: first.z, r: 0.25 };
  const p = R.radioPlacement({ colliders: [tree], tents: tentBoxes });
  assert.deepEqual([p.x, p.z], [R.CANDIDATES[1].x, R.CANDIDATES[1].z]);
  assert.deepEqual(p.conflicts, []);
  for (const c of R.CANDIDATES) assert.deepEqual(R.radioConflicts(R.footprint(c), { tents: tentBoxes }), [], `候選點 ${c.x},${c.z} 本身不能壓到帳篷`);
  const wall = { x0: -20, x1: -5, z0: -60, z1: -40 };
  const q = R.radioPlacement({ colliders: [wall], tents: [] });
  assert.ok(q.conflicts.length > 0);
  assert.equal(q.tried.length, R.CANDIDATES.length);
  // 自己的碰撞體不算衝突。
  const own = R.radioColliders(first);
  assert.deepEqual(R.radioConflicts(first, { colliders: own }), []);
});

test('DJ spots are inside the booth, behind the desk, and reachable from the front within talk range', () => {
  const fp = R.footprint(R.CANDIDATES[0]);
  const front = { x: fp.box.x1 + 0.4, z: fp.z };   // 玩家被棚身碰撞擋在正面外 0.4 公尺
  for (const d of R.DJ_SPOTS) {
    const w = R.toWorld(fp, d.x, d.z);
    assert.ok(w.x > fp.box.x0 && w.x < fp.box.x1 && w.z > fp.box.z0 && w.z < fp.box.z1, d.id);
  }
  const lead = R.toWorld(fp, R.DJ_SPOTS[0].x, R.DJ_SPOTS[0].z);
  assert.ok(Math.hypot(lead.x - front.x, lead.z - front.z) < 2.4, '主播互動半徑 2.4');
  assert.ok(R.toWorld(fp, 0, 1).x > fp.x, '本地 +z（正面）朝大道 +x');
});

test('broadcast: every line fits one bubble and the round covers all five segments', () => {
  const lines = R.broadcastRound({ flags: new Set(), booths: C.booths, colleges: C.colleges, round: 0, rng: () => 0 });
  for (const l of lines) assert.ok([...l].length <= R.MAX_BUBBLE, l);
  assert.equal(lines[0], R.OPENING[0]);
  assert.ok(lines.includes(R.REMINDERS[0]));
  assert.ok(lines.some(l => l.startsWith('現場插播')));
  assert.ok(lines.some(l => l.startsWith('推薦攤位')));
  assert.ok(lines.includes(R.STATION[0]));
  assert.equal(R.broadcastRound({ flags: new Set(), booths: C.booths, colleges: C.colleges, round: 1, rng: () => 0 })[2], R.REMINDERS[1]);
  for (const l of [...R.OPENING, ...R.STATION, ...R.REMINDERS]) assert.doesNotMatch(l, /—|--/, '不用破折號');
});

test('broadcast: progress follows stamps and medals; recommendations skip stamped booths', () => {
  const f = new Set(['bz26_st_D01', 'bz26_st_D02', 'bz26_md_C01']);
  assert.deepEqual(R.progressLines(f, C.colleges), ['現場插播：已經蓋了 2 個章！', '再拿 2 枚學院勳章就能考大會考']);
  const all = new Set(C.booths.map(b => `bz26_st_${b.id}`));
  assert.deepEqual(R.recommendLines(all, C.booths), ['37 個攤位都蓋完了，太強了！']);
  const only = new Set(C.booths.filter(b => b.id !== 'D05').map(b => `bz26_st_${b.id}`));
  assert.match(R.recommendLines(only, C.booths, () => 0.5)[0], /社會學系/);
  assert.equal(R.progressLines(new Set(['bz26_st_D01', 'bz26_exam_pass']), C.colleges)[1], '大會考也過了，恭喜恭喜！');
});

test('call in: questions trace verbatim to the 廣電系 booth; reward once, only when all correct', () => {
  const src = C.booths.find(b => b.id === 'D21').features[0];
  assert.ok(src.includes(R.RADIO_SOURCE.quote));
  for (const q of R.CALL_IN) { assert.ok(src.includes(q.trace.quote), q.prompt); assert.ok(q.answer >= 0 && q.answer < q.options.length); }
  const done = (score) => ({ status: 'completed', total: 3, score });
  assert.deepEqual(R.callInResult(new Set(), done(2)).set, []);
  assert.deepEqual(R.callInResult(new Set(), { status: 'cancelled', total: 3, score: 0 }).set, []);
  const r = R.callInResult(new Set(), done(3));
  assert.deepEqual(r.set, [R.RADIO_FLAG]);
  const f = new Set([R.RADIO_FLAG]);
  assert.deepEqual(R.callInResult(f, done(3)).set, [], '不重複給');
  assert.equal(L.points(new Set([R.RADIO_FLAG])) - L.points(new Set()), 1, '隱藏章 +1 點沿用既有點數公式');
});

test('entry: stand in front of the sign facing it; invite bubble is the stored original text and fits one bubble', () => {
  assert.deepEqual(R.entryStand({ x: -9.6, z: -34.45 }), { x: -9.6, z: -33.05, yaw: 0 });
  assert.ok([...INVITE_BUBBLE].length <= R.MAX_BUBBLE);
});
