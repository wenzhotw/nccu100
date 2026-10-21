// 與包種茶節會場共用存檔旗標，不另設會過期的活動狀態。
export const festivalStoriesPaused = state => state.flags?.has('bz26_active') === true;

// 劇情使用自己的時鐘與延遲工作，活動期間不消耗冷卻、也不讓 timeout 偷跑。
export function createStoryClock(state, readNow = () => performance.now()) {
  let last = readNow(), time = last, wasPaused = festivalStoriesPaused(state);
  const pending = [];
  function now() {
    const current = readNow(), paused = festivalStoriesPaused(state);
    if (!paused && !wasPaused) time += Math.max(0, current - last);
    last = current; wasPaused = paused;
    return time;
  }
  return {
    now,
    after(fn, delay) { pending.push({ fn, at: now() + delay }); },
    flush() {
      const current = now();
      if (festivalStoriesPaused(state)) return;
      for (const job of [...pending]) {
        if (festivalStoriesPaused(state)) break;
        if (job.at <= current) { pending.splice(pending.indexOf(job), 1); job.fn(); }
      }
    },
  };
}
