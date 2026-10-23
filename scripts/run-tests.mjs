// 依序執行每一組測試，前一組失敗也繼續跑完，最後統一回報結果。
// 任何一組失敗，程序以 1 結束，CI 仍會判定失敗。
import { spawnSync } from 'node:child_process';

const groups = ['test:unit', 'test:baozhong', 'test:npc-costumes', 'test:characters', 'test:stage2'];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const results = [];

for (const name of groups) {
  console.log(`\n=== ${name} ===`);
  const start = Date.now();
  const run = spawnSync(npm, ['run', name], { stdio: 'inherit', shell: process.platform === 'win32' });
  const code = run.status ?? 1;
  results.push({ name, code, sec: ((Date.now() - start) / 1000).toFixed(1) });
}

console.log('\n=== 測試總結 ===');
for (const r of results) console.log(`${r.code === 0 ? '通過' : '失敗'}  ${r.name}（${r.sec} 秒，exit ${r.code}）`);
const failed = results.filter((r) => r.code !== 0);
console.log(failed.length ? `共 ${failed.length} 組失敗：${failed.map((r) => r.name).join('、')}` : '全部通過');
process.exit(failed.length ? 1 : 0);
