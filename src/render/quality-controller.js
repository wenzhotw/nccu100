import { createQualitySampler } from '../core/frame-timing.js';

/**
 * 生產畫質控制器。先關柔光、再降解析度；連續四個快窗才升一級。
 * 只有試升後再次掉幀，才將該級暫停 60 秒可見遊戲時間。
 * 中速窗會中斷連續快窗；背景時間不計入冷卻或重試時間。
 */
export function createQualityController({ dpr = 1, bloom = true, onChange = () => {} } = {}) {
  const max = Math.min(dpr, 1.5), min = Math.min(dpr, 1);
  let pr = max, bloomOn = bloom, time = 0, fast = 0, trial = null;
  const blocked = new Map(), sampler = createQualitySampler();
  const key = () => bloomOn ? 'bloom' : String(pr);
  const snapshot = () => ({ pr, bloom: bloomOn, trial, fast });
  function changed() { fast = 0; sampler.coolDown(); onChange(snapshot()); }
  return {
    snapshot,
    reset() { sampler.reset(); fast = 0; },
    tick(dt) {
      if (dt === null || !Number.isFinite(dt) || dt <= 0) return;
      time += dt;
      sampler.sample(dt);
      const window = sampler.takeWindow();
      if (window === null) return;
      if (window !== 'fast') fast = 0;
      if (window === 'slow') {
        if (trial !== null) { blocked.set(trial, time + 60); trial = null; }
        if (bloomOn) { bloomOn = false; changed(); }
        else if (pr > min + 0.01) { pr = Math.max(min, pr - 0.25); changed(); }
        return;
      }
      if (window !== 'fast' || ++fast < 4) return;
      fast = 0;
      // 試升須再通過四個快窗才視為穩定，下一次恢復需重新累積。
      if (trial !== null) { trial = null; return; }
      const up = Math.min(max, pr + 0.25);
      const target = up > pr + 0.01 ? String(up) : bloom && !bloomOn ? 'bloom' : null;
      if (target === null || (blocked.get(target) ?? 0) > time) return;
      if (target === 'bloom') bloomOn = true;
      else pr = up;
      trial = key();
      changed();
    },
  };
}
