/** 網址加上 ?perf 才顯示量測面板；一般玩家不建立面板或收集樣本。 */
import { createPerformanceMonitor } from '../core/performance.js';
import { renderer } from '../core/engine.js';
import { state } from '../core/state.js';
import { POST } from '../render/post.js';

let panel = null;
export const performanceMonitor = createPerformanceMonitor({
  enabled: new URLSearchParams(location.search).has('perf'),
  onToggle(on) { if (panel) panel.hidden = !on; },
  context: () => ({
    pixelRatio: renderer.getPixelRatio(), postProcessing: !!POST?.enabled,
    bloom: !!(POST?.enabled && POST.bloom), room: state.room || null,
    viewport: [innerWidth, innerHeight],
  }),
  onReport(s) {
    if (!panel) {
      panel = document.createElement('pre'); panel.id = 'performance';
      panel.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:10000;margin:0;padding:8px;background:#111d;color:#fff;font:11px/1.4 monospace;pointer-events:none;white-space:pre-wrap';
      document.body.appendChild(panel);
    }
    panel.hidden = false;
    panel.textContent = [
      `Frame ms p50 ${s.p50Ms.toFixed(1)} / p95 ${s.p95Ms.toFixed(1)} (${s.windowFrames} frames)`,
      `Long >50 ms ${s.windowLongFrames} window / ${s.longFrames} total`,
      `CPU update ${s.updateCpuMs.toFixed(1)} / render ${s.renderCpuMs.toFixed(1)} ms`,
      `Calls ${s.renderCalls} / triangles ${s.triangles} (all passes)`,
      `Geometries ${s.geometries} / textures ${s.textures} / programs ${s.programs}`,
      `DPR ${s.pixelRatio} / bloom ${s.bloom} / ${s.room || 'outdoors'}`,
    ].join('\n');
  },
});
