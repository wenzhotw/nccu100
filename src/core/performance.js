/**
 * 可選的效能量測。關閉時不配置樣本、不讀時鐘、不重設 renderer.info。
 * 開啟時保留最近 600 幀，每秒最多產生一次報表。CPU 時間不代表 GPU 完成時間。
 */
export function createPerformanceMonitor({ enabled = false, capacity = 600, now = () => performance.now(), onReport = () => {}, onToggle = () => {}, context = () => ({}) } = {}) {
  let on = false, frames = null, count = 0, cursor = 0, total = 0, longFrames = 0;
  let active = false, start = 0, renderStart = 0, rawMs = 0, reportAt = 0;
  let info = null, autoReset = true, last = null;
  function restoreRenderer() {
    if (info) { info.autoReset = autoReset; info = null; }
  }
  function reset() {
    restoreRenderer(); active = false; count = cursor = total = longFrames = 0;
    reportAt = 0; last = null;
  }
  function snapshot() {
    if (!on || !count) return null;
    const sorted = Array.from(frames.subarray(0, count)).sort((a, b) => a - b);
    let sum = 0, windowLongFrames = 0;
    for (const ms of sorted) { sum += ms; if (ms > 50) windowLongFrames++; }
    return {
      sampleCount: total, windowFrames: count, windowCapacity: capacity,
      p50Ms: sorted[Math.ceil(count * 0.50) - 1], p95Ms: sorted[Math.ceil(count * 0.95) - 1],
      meanMs: sum / count, longFrames, windowLongFrames, longFrameThresholdMs: 50,
      ...last, ...context(),
    };
  }
  const api = {
    get enabled() { return on; },
    set enabled(value) {
      const next = !!value;
      if (next === on) return;
      reset(); on = next; frames = on ? new Float64Array(capacity) : null; onToggle(on);
    },
    reset, snapshot,
    beginFrame(dt) {
      active = on && dt !== null && Number.isFinite(dt) && dt > 0;
      if (!active) return;
      rawMs = dt * 1000; start = now();
    },
    beginRender(renderer) {
      if (!active) return;
      // r149 每次 render 預設重設統計；整幀只重設一次，包含陰影、場景與所有後製 pass。
      info = renderer.info; autoReset = info.autoReset; info.autoReset = false; info.reset();
      renderStart = now();
    },
    endFrame() {
      if (!active) return;
      const end = now();
      try {
        frames[cursor] = rawMs; cursor = (cursor + 1) % capacity;
        count = Math.min(count + 1, capacity); total++; if (rawMs > 50) longFrames++;
        last = {
          rawFrameMs: rawMs, updateCpuMs: renderStart - start, renderCpuMs: end - renderStart,
          renderCalls: info.render.calls, triangles: info.render.triangles,
          lines: info.render.lines, points: info.render.points,
          geometries: info.memory.geometries, textures: info.memory.textures,
          programs: info.programs?.length || 0,
        };
      } finally { restoreRenderer(); active = false; }
      if (end >= reportAt) { reportAt = end + 1000; onReport(snapshot()); }
    },
  };
  api.enabled = enabled;
  return api;
}
