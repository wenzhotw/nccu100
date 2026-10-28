/**
 * 山上校區的日夜時鐘（純資料，不碰引擎，可在 Node 測試）。
 *
 * 天色每 20 分鐘自動繞一圈（phase 0 是半夜，0.5 是正午），
 * 右上角「天色」按鈕可以固定在白天、黃昏或夜晚，再按回到自動。
 * 山下校園沒有日夜，這裡只影響山上校區的天空、霧、天光與台北夜景。
 */
export const CYCLE = 1200;
export const MODES = ['auto', 'day', 'dusk', 'night'];
export const MODE_LABELS = { auto: '天色：自動日夜', day: '天色：白天', dusk: '天色：黃昏', night: '天色：夜晚' };
const FIXED = { day: 0.5, dusk: 0.77, night: 0.02 };

// [phase, 夜晚程度, 天空, 霧, 天光上, 天光下, 天光強度, 陽光色, 陽光強度]
const KEYS = [
  [0.00, 1, '#141c36', '#18213b', '#6a7fb4', '#262d3d', 0.55, '#a9badf', 0.22],
  [0.22, 1, '#141c36', '#18213b', '#6a7fb4', '#262d3d', 0.55, '#a9badf', 0.22],
  [0.28, 0.4, '#e9b9a0', '#dcb9a8', '#f3d2b8', '#8a7a6a', 0.8, '#ffc9a0', 0.55],
  [0.34, 0, '#bfe4f6', '#bfe4f6', '#eaf6ff', '#7aa060', 0.95, '#fff4e2', 0.85],
  [0.68, 0, '#bfe4f6', '#bfe4f6', '#eaf6ff', '#7aa060', 0.95, '#fff4e2', 0.85],
  [0.77, 0.35, '#f1a87f', '#e4ab8f', '#ffd0a3', '#7a6a5a', 0.75, '#ffb27a', 0.6],
  [0.84, 1, '#141c36', '#18213b', '#6a7fb4', '#262d3d', 0.55, '#a9badf', 0.22],
  [1.00, 1, '#141c36', '#18213b', '#6a7fb4', '#262d3d', 0.55, '#a9badf', 0.22],
];
const wrap = v => ((v % 1) + 1) % 1;
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
function mix(a, b, t) {
  const p = hex(a), q = hex(b);
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/** 某個時刻的天色：顏色都是 #rrggbb，night 是 0（白天）到 1（深夜）。 */
export function sampleSky(phase) {
  const p = wrap(phase);
  let i = 1;
  while (KEYS[i][0] < p) i++;
  const a = KEYS[i - 1], b = KEYS[i], raw = (p - a[0]) / (b[0] - a[0] || 1), t = raw * raw * (3 - 2 * raw);
  const num = k => a[k] + (b[k] - a[k]) * t;
  return { phase: p, night: num(1), sky: mix(a[2], b[2], t), fog: mix(a[3], b[3], t), hemiSky: mix(a[4], b[4], t),
    hemiGround: mix(a[5], b[5], t), hemi: num(6), sunColor: mix(a[7], b[7], t), sun: num(8) };
}

/** 時鐘：自動模式依遊戲時間轉動；切到固定時段再切回自動，從當下的天色接著走，不會跳。 */
export function createSkyClock({ start = 0.45 } = {}) {
  let mode = 'auto', anchor = start, anchorTime = 0;
  const phaseAt = time => mode === 'auto' ? wrap(anchor + (time - anchorTime) / CYCLE) : FIXED[mode];
  return {
    get mode() { return mode; },
    next(time) { this.setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length], time); return mode; },
    setMode(m, time = 0) {
      if (!MODES.includes(m)) throw new RangeError(`不認得的天色：${m}`);
      if (m === 'auto' && mode !== 'auto') { anchor = phaseAt(time); anchorTime = time; }
      mode = m;
    },
    sample(time = 0) { return sampleSky(phaseAt(time)); },
    isNight(time = 0) { return sampleSky(phaseAt(time)).night >= 0.75; },
  };
}
