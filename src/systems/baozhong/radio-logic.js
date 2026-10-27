// src/systems/baozhong/radio-logic.js（v1.69，Claude）：政大之聲電台棚與入口的純邏輯，不 import 遊戲模組，可在 Node 測。
// 電台棚依 Wenzel 2026-10-22 提供的實景照片：黃色棚身、透明玻璃、淡粉紅頂棚，招牌「FM88.7 政大之聲」，
// 下方「包種茶節」「OPEN STUDIO 實況轉播」，棚外三腳架喇叭。位置在噴水池與四維堂之間的大道西側。

/** 棚子尺寸（公尺）。W 是正面寬（沿大道方向），D 是深度，H 是柱高。 */
export const BOOTH = Object.freeze({ W: 3.6, D: 2.2, H: 2.45, ROOF_RISE: 0.35, SIGN_H: 0.62, PANEL_H: 1.05 });

/** Call in 拿的隱藏章（passport-logic 的點數公式原本就計入 bz26_hs_*）。 */
export const RADIO_FLAG = 'bz26_hs_RADIO';

/**
 * 候選中心點：大道西側，跨域學程帳篷南邊、服務台（F01，z −56.96 到 −53.96）北邊（v1.69 時北邊是友校交流帳篷 F03，v2.02 搬到中文系東邊）。
 * 棚子正面朝大道（+x），rotY = π/2，所以沿 z 方向是寬 W、沿 x 方向是深 D。
 */
// 中心 z 只能在約 −51.7 到 −49.9 之間（兩頂帳篷各留 0.45 公尺），所以備選點主要沿 x 方向錯開。
export const CANDIDATES = Object.freeze([
  { x: -9.9, z: -50.8 }, { x: -9.0, z: -50.8 }, { x: -10.8, z: -50.8 }, { x: -9.9, z: -51.6 }, { x: -9.0, z: -51.6 }, { x: -8.2, z: -50.8 },
]);
export const ROT_Y = Math.PI / 2;

/** 依中心點算出棚子腳印、正面互動站位與棚外喇叭的位置（世界座標）。 */
export function footprint({ x, z }) {
  const hx = BOOTH.D / 2, hz = BOOTH.W / 2;
  return {
    x, z, rotY: ROT_Y,
    box: { x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz },
    // 玩家站在正面玻璃前和主播說話的範圍，不能有碰撞體。
    approach: { x0: x + hx + 0.1, x1: x + hx + 1.8, z0: z - 1.1, z1: z + 1.1 },
    // 三腳架喇叭在正面一角的外側（照片在棚子左前方），放在 z 較大的一側，避開互動站位。
    speaker: { c: true, x: +(x + hx + 0.45).toFixed(3), z: +(z + hz + 0.35).toFixed(3), r: 0.32 },
  };
}

const MARGIN = 0.45;   // 同 activity-sign-logic、festival-arch-logic 的留白
function toRect(c) {
  if (c.obb) { const hx = Math.abs(c.hx * c.cs) + Math.abs(c.hz * c.sn), hz = Math.abs(c.hx * c.sn) + Math.abs(c.hz * c.cs); return { x0: c.cx - hx, x1: c.cx + hx, z0: c.cz - hz, z1: c.cz + hz }; }
  return c;
}
function rectHits(R, c, m = 0) {
  if (c.c) { const nx = Math.max(R.x0, Math.min(c.x, R.x1)), nz = Math.max(R.z0, Math.min(c.z, R.z1)); return Math.hypot(c.x - nx, c.z - nz) < c.r + m; }
  const b = toRect(c);
  return R.x0 < b.x1 + m && R.x1 > b.x0 - m && R.z0 < b.z1 + m && R.z1 > b.z0 - m;
}

/**
 * 回傳衝突清單（空陣列代表可以放）：棚子與喇叭不壓到碰撞體或帳篷，正面站位沒有東西擋，
 * 也不壓到互動點，而且不跨進校園大道（|x| < avenueHalf）。
 */
export function radioConflicts(fp, { colliders = [], tents = [], spots = [], avenueHalf = 6 } = {}) {
  const out = [];
  const solids = [...colliders.filter(c => c.owner !== 'bz26-radio'), ...tents.map(t => ({ x0: t.box[0], x1: t.box[1], z0: t.box[2], z1: t.box[3], id: t.id }))];
  for (const c of solids) {
    if (rectHits(fp.box, c, MARGIN)) out.push({ kind: 'booth', with: c });
    if (rectHits(fp.approach, c)) out.push({ kind: 'approach', with: c });
    if (rectHits({ x0: fp.speaker.x - fp.speaker.r, x1: fp.speaker.x + fp.speaker.r, z0: fp.speaker.z - fp.speaker.r, z1: fp.speaker.z + fp.speaker.r }, c, 0.1)) out.push({ kind: 'speaker', with: c });
  }
  for (const s of spots) if (rectHits(fp.box, { c: true, x: s.x, z: s.z, r: s.r || 0 })) out.push({ kind: 'spot', with: { label: s.label, x: s.x, z: s.z } });
  if (fp.box.x1 > -avenueHalf) out.push({ kind: 'avenue', with: { x1: fp.box.x1 } });
  return out;
}

/** 依序試候選點，回傳第一個沒有衝突的；全部都有衝突時回傳第一個並附上衝突，交給呼叫端警告。 */
export function radioPlacement(ctx, candidates = CANDIDATES) {
  const tried = [];
  for (const c of candidates) {
    const fp = footprint(c), conflicts = radioConflicts(fp, ctx);
    if (!conflicts.length) return { ...fp, conflicts: [], tried };
    tried.push({ ...c, conflicts });
  }
  return { ...footprint(candidates[0]), conflicts: tried[0].conflicts, tried };
}

/** 碰撞：棚身一個方塊、喇叭一個圓。 */
export const radioColliders = fp => [
  { x0: fp.box.x0, x1: fp.box.x1, z0: fp.box.z0, z1: fp.box.z1, owner: 'bz26-radio' },
  { ...fp.speaker, owner: 'bz26-radio' },
];

/** 4 位主播在棚內的站位（棚子本地座標，正面朝 +z）。站在桌後，第一位最靠正面中央，負責 Call in。 */
export const DJ_SPOTS = Object.freeze([
  { id: 'bz26-radio-dj1', x: -0.45, z: 0.05, title: '政大之聲主播', look: { top: '#ffd84a', pants: '#3d4a6b', hair: '#2a2220', hairStyle: 'short' } },
  { id: 'bz26-radio-dj2', x: 0.45, z: 0.05, title: '政大之聲主播', look: { top: '#f7c6d9', pants: '#3d4a6b', hair: '#3a2622', hairStyle: 'long' } },
  { id: 'bz26-radio-dj3', x: -1.25, z: -0.35, title: '節目製作', look: { top: '#4f9a48', pants: '#2a2c35', hair: '#2a2220', hairStyle: 'side' } },
  { id: 'bz26-radio-dj4', x: 1.25, z: -0.35, title: '節目製作', look: { top: '#90caf9', pants: '#2a2c35', hair: '#5a3a2a', hairStyle: 'bowl' } },
]);
/** 本地座標轉世界座標（rotY = π/2）。 */
export function toWorld(fp, lx, lz) {
  const c = Math.cos(fp.rotY), s = Math.sin(fp.rotY);
  return { x: +(fp.x + lx * c + lz * s).toFixed(3), z: +(fp.z - lx * s + lz * c).toFixed(3) };
}

/* ---------- 廣播內容 ---------- */

// 電台介紹出自 baozhong.json D21（廣電系）features[0]：傳院實習電台「政大之聲」FM88.7 每天約 16 小時直播，沒經驗也能從節目製作開始學。
export const RADIO_SOURCE = { path: 'D21.features.0', quote: '傳院實習電台「政大之聲」FM88.7 每天約 16 小時直播，沒經驗也能從節目製作開始學' };
export const OPENING = ['這裡是政大之聲 FM88.7！', '包種茶節實況轉播中！'];
export const STATION = ['政大之聲是傳院的實習電台', '每天直播大約 16 小時', '沒經驗也能從節目製作學起'];
export const REMINDERS = [
  '集滿一院的章，去四維堂找關主！',
  '拿到三枚學院勳章就能挑戰大會考',
  '按 P 打開茶香探索護照',
  '想 Call in？走近玻璃窗跟我說話！',
];
/** 泡泡一行最多約 22 個字（npc.js speech() 字級縮到 26px 時的寬度）。 */
export const MAX_BUBBLE = 22;
const clip = t => ([...t].length > MAX_BUBBLE ? [...t].slice(0, MAX_BUBBLE - 1).join('') + '…' : t);

/** 依玩家旗標算出「你的即時戰況」。 */
export function progressLines(flags, colleges = []) {
  const f = flags instanceof Set ? flags : new Set(flags || []);
  const stamps = [...f].filter(x => /^bz26_st_D\d{2}$/.test(x)).length;
  const medals = colleges.filter(c => f.has(`bz26_md_${c.id}`)).length;
  if (!stamps) return ['現場插播：這位同學還沒蓋章！', '最近的攤位就在旁邊，去聊聊吧'];
  const lines = [`現場插播：已經蓋了 ${stamps} 個章！`];
  if (f.has('bz26_exam_pass')) lines.push('大會考也過了，恭喜恭喜！');
  else if (medals >= 3) lines.push('三枚勳章到手，快去考大會考！');
  else lines.push(`再拿 ${3 - medals} 枚學院勳章就能考大會考`);
  return lines;
}

/** 推薦一個還沒蓋章的攤位，用該攤 NPC 台詞裡最短的一句（原句，太長就截斷）。 */
export function recommendLines(flags, booths = [], rng = Math.random) {
  const f = flags instanceof Set ? flags : new Set(flags || []);
  const todo = booths.filter(b => !f.has(`bz26_st_${b.id}`));
  if (!todo.length) return ['37 個攤位都蓋完了，太強了！'];
  const b = todo[Math.floor(Math.max(0, Math.min(0.999999, rng())) * todo.length)];
  const line = [...(b.npc?.lines || [])].sort((a, c) => [...a].length - [...c].length)[0] || '';
  return [clip(`推薦攤位：${b.dept}`), clip(line)].filter(Boolean);
}

/**
 * 一輪播報：開場、活動提醒、即時戰況、推薦攤位、電台介紹，每段 1 到 3 句，依序輪播。
 * round 是第幾輪（決定這輪播哪一則提醒）。回傳句子陣列，每句都不超過 MAX_BUBBLE。
 */
export function broadcastRound({ flags, booths, colleges, round = 0, rng = Math.random } = {}) {
  return [
    ...OPENING,
    REMINDERS[round % REMINDERS.length],
    ...progressLines(flags, colleges),
    ...recommendLines(flags, booths, rng),
    ...STATION,
  ].map(clip);
}

/* ---------- 入口 ---------- */

/** 開始畫面的「參加包種茶節」：站在活動看板互動點正前方，面向看板（−z，yaw 0）。 */
export function entryStand(signSpot) {
  return { x: signSpot.x, z: +(signSpot.z + 1.4).toFixed(3), yaw: 0 };
}

/* ---------- Call in ---------- */

/** 三題都出自 baozhong.json D21 features[0]（RADIO_SOURCE）。答錯可以重答，全對才給章。 */
export const CALL_IN = Object.freeze([
  { prompt: '政大之聲的頻率是？', options: ['FM88.7', 'FM98.7', 'AM88.7'], answer: 0, explain: '政大之聲在 FM88.7。', trace: { path: 'D21.features.0', quote: '「政大之聲」FM88.7' } },
  { prompt: '政大之聲每天大約直播幾小時？', options: ['約 4 小時', '約 16 小時', '24 小時不停'], answer: 1, explain: '每天約 16 小時直播。', trace: { path: 'D21.features.0', quote: '每天約 16 小時直播' } },
  { prompt: '政大之聲是哪個學院的實習電台？', options: ['商學院', '理學院', '傳播學院'], answer: 2, explain: '政大之聲是傳院（傳播學院）的實習電台。', trace: { path: 'D21.features.0', quote: '傳院實習電台「政大之聲」' } },
]);

/** Call in 結算：全對且第一次才給隱藏章；其他情況只回訊息。 */
export function callInResult(flags, result) {
  const f = flags instanceof Set ? flags : new Set(flags || []);
  if (!result || result.status !== 'completed') return { passed: false, set: [], lines: [] };
  const passed = result.score === result.total && result.total === CALL_IN.length;
  if (!passed) return { passed, set: [], lines: [`答對 ${result.score}／${result.total}，再 Call in 一次試試看！`] };
  if (f.has(RADIO_FLAG)) return { passed, set: [], lines: ['全對！你已經是政大之聲的忠實聽眾了。'] };
  return { passed, set: [RADIO_FLAG], lines: ['全對！送你一枚隱藏章「政大之聲」，茶葉點數 +1。'] };
}
