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
  let acc = 0, n = 0, cool = 0;
  return {
    reset() { acc = 0; n = 0; },
    coolDown() { cool = 3; },
    sample(dt) {
      if (dt === null || !Number.isFinite(dt) || dt <= 0) return false;
      acc += dt; n++; cool -= dt;
      if (acc < 2.5) return false;
      const avg = acc / n; acc = 0; n = 0;
      return cool <= 0 && avg > 1 / 34;
    },
  };
}
