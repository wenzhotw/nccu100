// GPT author B: shared physical collision and counter-label mounting repair (isolated candidate).
// src/systems/baozhong/tents-logic.js（P05 v2，Grok，T065）：帳篷真實化 v2 的純邏輯。
// 不 import 任何東西、不碰 DOM、THREE 或遊戲狀態；畫布只用傳入的 2D context（測試可用假的）。
// 規格依據：Claude工作區 A32 四 (a)(b)(c)(d)；座標不動，沿用 A25（layout.json）。

/** 帳篷本地尺寸（公尺）。佈景檔的約定（柱子 ±1.1、櫃檯位置）不變，40 檔不用改。 */
export const TENT = Object.freeze({
  half: 1.45,            // 頂棚底邊與垂邊在 ±1.45
  pole: 1.1,             // 柱子 x,z = ±1.1
  poleR: 0.035,
  roofBase: 2.0, roofTop: 2.9,           // 四角錐頂 y 2.0 至 2.9
  valanceBottom: 1.8, valanceTop: 2.0, valanceT: 0.02,   // 垂邊一圈高 0.2 的薄板
  wallT: 0.01,           // 三面布幕（右、後、左）厚度，貼在 ±1.45 外側、高 0 至 1.8（GPT-038）
  table: Object.freeze({ x0: -0.8, x1: 0.8, z0: 0.7, z1: 1.3, h: 0.75, board: 0.04 }),
  posters: Object.freeze({ w: 0.48, h: 0.55, y: 0.38, z: 1.31, xs: Object.freeze([-0.53, 0, 0.53]) }),
  official: Object.freeze({ w: 1.6, h: 0.42, x: 0, y: 1.78, z: 1.47 }),
  mainSignFrom: Object.freeze({ x: 0, y: 3.25, z: 0 }),
  mainSignTo: Object.freeze({ x: 0, y: 2.22, z: 1.5 }),
  signHideDist: 35,      // 35 公尺外文字牌不畫（同 v1）
});

export const TENT_COLORS = Object.freeze({ red: '#d32f2f', white: '#f5f5f5', blue: '#1565c0' });
export const SERVICE_CLOTH = '#f5a623';   // 服務台、醫護站桌巾（服務類黃色，同 v1）
export const FRIEND_CLOTH = '#c62828';    // 友校攤紅桌巾（實景照⑧）
const ORDER = ['red', 'white', 'blue', 'redwhite'];
const ALIAS = { red: 'red', '紅': 'red', white: 'white', '白': 'white', blue: 'blue', '藍': 'blue',
  redwhite: 'redwhite', 'red-white': 'redwhite', red_white: 'redwhite', '紅白': 'redwhite', '紅白間隔': 'redwhite' };
const HEX = /^#[0-9a-f]{6}$/i;

/** 帳篷色字串正規化：紅、白、藍、紅白間隔或 # 色碼；看不懂回 null。 */
export function normTent(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (HEX.test(s)) return s;
  return ALIAS[s] || ALIAS[v.trim()] || null;
}

/**
 * 四面頂棚與垂邊的顏色 [前(+z), 右(+x), 後(−z), 左(−x)]。
 * tent：booths 資料的 tent；沒有資料時依 index 輪流（紅、白、藍、紅白），F03 一律白色（規格 (a)）。
 */
export function faceColors(id, tent, index = 0) {
  let t = normTent(tent);
  if (id === 'F03') t = 'white';
  if (!t) t = ORDER[((index % 4) + 4) % 4];
  if (HEX.test(t)) return [t, t, t, t];
  if (t === 'redwhite') return [TENT_COLORS.red, TENT_COLORS.white, TENT_COLORS.red, TENT_COLORS.white];
  const c = TENT_COLORS[t];
  return [c, c, c, c];
}

/** 桌巾色：學院色；服務台與醫護站黃色；友校紅色。 */
export function clothColor(id, collegeColor) {
  if (id === 'F01' || id === 'F02') return SERVICE_CLOTH;
  if (id === 'F03') return FRIEND_CLOTH;
  return HEX.test(collegeColor || '') ? collegeColor : '#9e9e9e';
}

const FN_NAME = { F01: '服務台', F02: '醫護站', F03: '友校交流' };

/**
 * 合併一攤要畫的資料。booth：baozhong-booths.json 的一筆（可缺）；dept：凍結 baozhong.json 的 booths[]（可缺）。
 * 沒有英文名就留空，不自己編；編號沒有就用 id。海報沒有就從凍結內容摘（系名、兩項特色的第一句、題目標題）。
 */
export function boothInfo(id, booth, dept, fn) {
  const b = booth && typeof booth === 'object' ? booth : {};
  const zh = str(b.zh) || (dept && str(dept.dept)) || FN_NAME[id] || (fn && str(fn.title)) || id;
  const en = str(b.en);
  const no = str(b.no) || (Number.isFinite(b.no) ? String(b.no) : '') || id;
  const posters = Array.isArray(b.posters) && b.posters.length
    ? b.posters.slice(0, 3).map(p => ({ title: str(p && p.title), lines: (Array.isArray(p && p.lines) ? p.lines : []).slice(0, 3).map(str) }))
    : fallbackPosters(dept, fn);
  while (posters.length < 3) posters.push({ title: '', lines: [] });
  return { id, zh, en, no, tent: b.tent, shirt: str(b.shirt), posters };
}
function str(v) { return typeof v === 'string' ? v.trim() : ''; }
/** 取特色的第一個短句（到第一個冒號或句號為止），只摘不改寫。 */
export function firstClause(t) {
  const s = str(t); if (!s) return '';
  const m = s.match(/^[^：:。]+/);
  return (m ? m[0] : s).trim();
}
export function fallbackPosters(dept, fn) {
  if (!dept) {
    const l = fn && Array.isArray(fn.lines) ? fn.lines.map(str).filter(Boolean) : [];
    return [{ title: fn ? str(fn.title) : '', lines: l.slice(0, 3) }, { title: '', lines: [] }, { title: '', lines: [] }];
  }
  const f = Array.isArray(dept.features) ? dept.features : [];
  return [
    { title: str(dept.dept), lines: [dept.npc ? str(dept.npc.tag) : ''].filter(Boolean) },
    { title: firstClause(f[0]), lines: [] },
    { title: firstClause(f[1]), lines: [dept.quiz ? str(dept.quiz.title) : ''].filter(Boolean) },
  ];
}

/** ctx.sign 的主招牌自動移位（規格 (c)）：放在 (0,3.25,0) 的牌子移到 (0,2.22,1.50)、ry 歸零；前櫃副標避開海報，其餘不動。 */
export function relocateSign(o) {
  const x = num(o && o.x, 0), y = num(o && o.y, 0), z = num(o && o.z, 0), ry = num(o && o.ry, 0);
  const F = TENT.mainSignFrom, T = TENT.mainSignTo, e = 1e-6;
  if (Math.abs(x - F.x) < e && Math.abs(y - F.y) < e && Math.abs(z - F.z) < e) return { x: T.x, y: T.y, z: T.z, ry: 0, moved: true };
  // Counter-front labels share the poster area. Mount their header immediately above
  // the unchanged poster row, on the table edge, rather than hiding either text.
  // `moved` continues to identify ONLY the main sign (decor-ctx API contract).
  const P = TENT.posters, B = TENT.table;
  const w = num(o && o.w, 1), h = num(o && o.h, 0.4);
  const overlapsPosters = y - h / 2 < P.y + P.h / 2 && y + h / 2 > P.y - P.h / 2;
  if (Math.abs(ry) < e && x - w / 2 >= B.x0 - e && x + w / 2 <= B.x1 + e &&
      z >= B.z1 - e && z <= P.z + 0.03 && y - h / 2 >= 0.07 - e &&
      y + h / 2 <= B.h + e && overlapsPosters) {
    return { x, y: P.y + P.h / 2 + 0.025 + h / 2, z, ry, moved: false };
  }
  return { x, y, z, ry, moved: false };
}
function num(v, d) { return typeof v === 'number' && Number.isFinite(v) ? v : d; }

/** 碰撞框（同 A25 的 boxC 參數，形狀同 collision.js 的 box：{x0,x1,z0,z1,top}）。 */
export function colliderOf(t) {
  const [x0, x1, z0, z1, top] = t.box;
  return { x0, x1, z0, z1, top };
}

/** Physical footprints in the collision.js OBB contract. No whole-tent shell.
 * Pole OBBs conservatively bound the 8-sided cylinders (max corner overreach
 * 0.0145m), avoiding the engine circle collider's exact-centre singularity.
 * Ground offset is world-space, like the render group's heightAt result.
 * Kept colliderOf(t) above for compatibility; buildTents uses this list instead.
 */
export function collidersOf(t, ground = 0) {
  const cs = Math.cos(t.rotY), sn = Math.sin(t.rotY), result = [];
  const box = (x, z, hx, hz, top) => result.push({ obb: true,
    cx: t.x + x * cs + z * sn, cz: t.z - x * sn + z * cs,
    hx, hz, cs, sn, top: ground + top });
  const T = TENT.table, H = TENT.half, W = TENT.wallT;
  // Three actual thin curtains: right, back, left. The front stays open.
  box(H + W / 2, 0, W / 2, H, TENT.valanceBottom);
  box(0, -H - W / 2, H, W / 2, TENT.valanceBottom);
  box(-H - W / 2, 0, W / 2, H, TENT.valanceBottom);
  for (const x of [-TENT.pole, TENT.pole]) for (const z of [-TENT.pole, TENT.pole]) {
    box(x, z, TENT.poleR, TENT.poleR, 2.2);
  }
  // Resolve the broad counter last, after thin walls/posts. The player cannot
  // enter the narrow side gaps; no invisible filled shell is added there.
  box((T.x0 + T.x1) / 2, (T.z0 + T.z1) / 2,
    (T.x1 - T.x0) / 2, (T.z1 - T.z0) / 2, T.h);
  return result;
}

/** 依玩家距離決定文字牌是否要畫；回傳有變化的 id 清單，state 是 Map(id→bool) 會被更新。 */
export function signVisibility(tents, px, pz, state, dist = TENT.signHideDist) {
  const changed = [];
  const d2 = dist * dist;
  for (const t of tents) {
    const dx = t.x - px, dz = t.z - pz, near = dx * dx + dz * dz < d2;
    if (state.get(t.id) !== near) { state.set(t.id, near); changed.push(t.id); }
  }
  return changed;
}

/** 用 measure(text)→寬度 把一行縮到 maxW 內：先縮字級（到 min），還放不下就截斷加「…」。 */
export function fitText(measure, text, maxW, px, min = 10) {
  let p = px; const s = String(text || '');
  while (p > min && measure(s, p) > maxW) p -= 1;
  if (measure(s, p) <= maxW) return { text: s, px: p };
  let t = [...s];
  while (t.length > 1 && measure(t.join('') + '…', p) > maxW) t.pop();
  return { text: t.join('') + '…', px: p };
}

const SIGN_FONT = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
const font = (w, p) => `${w} ${p}px ${SIGN_FONT}`;
const measurer = g => (t, p, w = 900) => { g.font = font(w, p); return g.measureText(t).width; };

/**
 * 官方招牌（規格 (b)）：淡藍漸層、左邊小字「2026 政大包種茶節」、中間大字中文系名 #1565c0、下方英文系名、右下藍底白字編號。
 * 只寫文字，不畫校徽或任何活動標誌圖樣。g 是 CanvasRenderingContext2D，cw×ch 建議 1024×269（1.6:0.42）。
 */
export function drawOfficialSign(g, cw, ch, info) {
  const m = measurer(g);
  const grad = g.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, '#e3f2fd'); grad.addColorStop(1, '#90caf9');
  g.fillStyle = grad; g.fillRect(0, 0, cw, ch);
  g.lineWidth = Math.max(4, ch * 0.03); g.strokeStyle = '#1565c0'; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, cw - g.lineWidth, ch - g.lineWidth);
  // 左：活動名小字（兩行）
  const lx = cw * 0.025, lw = cw * 0.17;
  g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#0d47a1';
  let f = fitText((t, p) => m(t, p, 700), '政大包種茶節', lw, Math.round(ch * 0.16));
  g.font = font(700, f.px); g.fillText('2026', lx, ch * 0.36); g.fillText(f.text, lx, ch * 0.58);
  // 中：中文系名
  const cx = cw * 0.55, cwid = cw * 0.6;
  g.textAlign = 'center'; g.fillStyle = '#1565c0';
  f = fitText((t, p) => m(t, p, 900), info.zh, cwid, Math.round(ch * 0.4));
  g.font = font(900, f.px); g.fillText(f.text, cx, info.en ? ch * 0.4 : ch * 0.5);
  // 下：英文系名
  if (info.en) {
    g.fillStyle = '#0d47a1';
    f = fitText((t, p) => m(t, p, 700), info.en, cwid, Math.round(ch * 0.15), 8);
    g.font = font(700, f.px); g.fillText(f.text, cx, ch * 0.75);
  }
  // 右下：藍底白字編號
  const bw = cw * 0.11, bh = ch * 0.3, bx = cw - bw - cw * 0.015, by = ch - bh - ch * 0.06;
  g.fillStyle = '#1565c0'; g.fillRect(bx, by, bw, bh);
  g.fillStyle = '#ffffff'; g.textAlign = 'center';
  f = fitText((t, p) => m(t, p, 900), info.no, bw * 0.86, Math.round(bh * 0.7));
  g.font = font(900, f.px); g.fillText(f.text, bx + bw / 2, by + bh / 2);
}

export const PASTELS = Object.freeze(['#fff3c4', '#ffd6e0', '#d4f1d4', '#d6e9ff', '#ffe3c2', '#e8dcff']);
/** 固定的小抖動（不用亂數）：同一攤每次畫都一樣。 */
export function jitter(seed, i) {
  let h = 2166136261 >>> 0;
  const s = `${seed}:${i}`;
  for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619) >>> 0; }
  return (h / 4294967296) * 2 - 1;
}

/** 手繪風海報（規格 (d)）：粉彩底、歪歪的手畫框、標題加最多 3 行。cw×ch 建議 256×293（0.48:0.55）。 */
export function drawPoster(g, cw, ch, poster, seed = 'P', k = 0) {
  const m = measurer(g);
  g.fillStyle = PASTELS[(k + seedNum(seed)) % PASTELS.length]; g.fillRect(0, 0, cw, ch);
  // 手畫框：四邊各兩筆、有一點抖
  g.strokeStyle = '#3e2c1a'; g.lineWidth = Math.max(3, cw * 0.018); g.lineCap = 'round';
  const pad = cw * 0.06, pts = [[pad, pad], [cw - pad, pad], [cw - pad, ch - pad], [pad, ch - pad]];
  for (let r = 0; r < 2; r++) {
    g.beginPath();
    pts.forEach(([x, y], i) => { const jx = x + jitter(seed, k * 31 + i * 7 + r) * cw * 0.015, jy = y + jitter(seed, k * 37 + i * 5 + r + 3) * ch * 0.012; if (i) g.lineTo(jx, jy); else g.moveTo(jx, jy); });
    g.closePath(); g.stroke();
  }
  const maxW = cw - pad * 3;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#c2185b';
  let f = fitText((t, p) => m(t, p, 900), poster.title, maxW, Math.round(ch * 0.11));
  g.font = font(900, f.px); g.fillText(f.text, cw / 2, ch * 0.22);
  // 標題底線（手畫）
  g.beginPath(); g.moveTo(cw * 0.22, ch * 0.31 + jitter(seed, k + 50) * 2); g.lineTo(cw * 0.78, ch * 0.31 + jitter(seed, k + 51) * 2); g.stroke();
  g.fillStyle = '#3e2c1a';
  (poster.lines || []).slice(0, 3).forEach((line, i) => {
    const t = fitText((s, p) => m(s, p, 700), line, maxW, Math.round(ch * 0.075), 9);
    g.font = font(700, t.px); g.fillText(t.text, cw / 2, ch * (0.45 + i * 0.15));
  });
}
function seedNum(s) { let n = 0; for (const c of String(s)) n = (n + c.charCodeAt(0)) % 997; return n; }

/** Distance to a supported collision footprint. Unknown contracts fail closed. */
export function colliderClearance(p, c) {
  if (c.top !== undefined && p.y >= c.top) return Infinity;
  if (c.obb) {
    const dx = p.x - c.cx, dz = p.z - c.cz;
    const x = dx * c.cs - dz * c.sn, z = dx * c.sn + dz * c.cs;
    const d = Math.hypot(Math.max(0, Math.abs(x) - c.hx), Math.max(0, Math.abs(z) - c.hz));
    return Number.isFinite(d) ? d : -Infinity;
  }
  if (c.c) { const d = Math.hypot(p.x - c.x, p.z - c.z) - c.r; return Number.isFinite(d) ? d : -Infinity; }
  if ([c.x0,c.x1,c.z0,c.z1].every(Number.isFinite))
    return Math.hypot(p.x - Math.max(c.x0, Math.min(p.x,c.x1)), p.z - Math.max(c.z0, Math.min(p.z,c.z1)));
  return -Infinity;
}

/** Exceptional grounded depenetration, not ordinary walking or a general resolver.
 * Searches a bounded nearest safe edge; never modifies the input or collider lists.
 * 2cm endpoint margin survives save.js rounding coordinates to 2 decimals.
 */
export function recoverTentOverlap(p, owned, all, groundAt, radius = 0.4) {
  const overlapping = owned.filter(c => colliderClearance(p,c) < radius - 1e-6);
  if (!overlapping.length) return { status: 'clear' };
  if (typeof groundAt !== 'function' || !Number.isFinite(groundAt(p.x,p.z)) || Math.abs(groundAt(p.x,p.z)-p.y)>0.02)
    return { status: 'blocked', reason: 'Unverified ground height' };
  // Only already-overlapped owned material may be exited. Never enter a new solid,
  // including foreign colliders, while finding a way out of a tent collision.
  const initial = new Set(overlapping);
  const nearby = all.filter(c => colliderClearance(p,c) < 1.5);
  const groundOK = q => q.x >= -265 && q.x <= 195 && q.z >= -230 && q.z <= 29.5 &&
    Number.isFinite(groundAt(q.x,q.z)) && Math.abs(groundAt(q.x,q.z)-p.y)<=0.02;
  const directions=Array.from({length:128},(_,a)=>[Math.sin(a*Math.PI/64),Math.cos(a*Math.PI/64)]);
  // Exact model axes are essential in narrow gaps: sampled world angles can
  // initially deepen one contact even when an exact parallel exit is safe.
  for (const c of overlapping) if(c.obb) directions.push([c.sn,c.cs],[-c.sn,-c.cs],[c.cs,-c.sn],[-c.cs,c.sn]);
  for (let step=1; step<=100; step++) {
    const distance=step*0.01;
    for (const [ux,uz] of directions) {
      const dx=ux*distance, dz=uz*distance;
      const q={x:p.x+dx,y:p.y,z:p.z+dz};
      if (!groundOK(q) || nearby.some(c=>colliderClearance(q,c)<radius+0.02)) continue;
      let safe=true;
      const previous = new Map(overlapping.map(c=>[c, colliderClearance(p,c)]));
      for (let k=1;k<=Math.ceil(distance/0.01);k++) {
        const f=k/Math.ceil(distance/0.01), v={x:p.x+dx*f,y:p.y,z:p.z+dz*f};
        if (!groundOK(v) || nearby.some(c=>!initial.has(c)&&colliderClearance(v,c)<radius-1e-6)) {safe=false;break;}
        for (const c of overlapping) {
          const clearance=colliderClearance(v,c);
          if (Math.min(radius,clearance) < Math.min(radius,previous.get(c))-1e-6) {safe=false;break;}
          previous.set(c,clearance);
        }
        if (!safe) break;
      }
      if (safe) return {status:'recovered',position:q,distance};
    }
  }
  return {status:'blocked',reason:'No verified safe edge within 1m'};
}
