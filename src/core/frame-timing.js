/**
 * 實際幀間隔與遊戲步進分開。量測略過啟動、背景與恢復的第一幀，步進仍沿用 50 ms 上限。
 */
export function createFrameTiming() {
  let skip = true;
  const frame = { simulationDt: 0, measurementDt: null };
  return {
    resetMeasurement() { skip = true; },
    sample(rawDt, hidden = false) {
      frame.simulationDt = Math.min(rawDt, 0.05);
      frame.measurementDt = !hidden && !skip && rawDt > 0 && Number.isFinite(rawDt) ? rawDt : null;
      skip = hidden;
      return frame;
    },
  };
}

/** 保留原本 2.5 秒觀察窗與 3 秒冷卻，只改用未截斷的可見幀間隔。 */
export function createQualitySampler() {
  let acc = 0, n = 0, cool = 0, smooth = false, window = null;
  return {
    reset() { acc = 0; n = 0; smooth = false; window = null; cool = 3; },
    coolDown() { cool = 3; acc = 0; n = 0; smooth = false; window = null; },
    takeWindow() { const value = window; window = null; return value; },
    /** 上一個觀察窗是否很順（平均快過 55 FPS）；讀一次就清掉，用來決定要不要把畫質調回來 */
    takeSmooth() { const s = smooth; smooth = false; return s; },
    sample(dt) {
      if (dt === null || !Number.isFinite(dt) || dt <= 0) return false;
      acc += dt; n++; cool -= dt;
      if (acc < 2.5) return false;
      const avg = acc / n; acc = 0; n = 0;
      smooth = cool <= 0 && avg < 1 / 55;
      window = cool > 0 ? null : avg > 1 / 34 ? 'slow' : smooth ? 'fast' : 'neutral';
      return cool <= 0 && avg > 1 / 34;
    },
  };
}
