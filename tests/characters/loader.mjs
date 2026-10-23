/**
 * 角色快照用的 Node 載入器：把只能在瀏覽器跑的模組（渲染器、音效、對話框、遊戲主迴圈）換成替身，
 * 其他角色程式（player.js、npc.js、服裝）都載入真的版本，快照才代表遊戲實際的樣子。
 * 也讓 Vite 風格的 `import x from './a.json'` 在 Node 可以用。
 */
import { readFile } from 'node:fs/promises';

const STUBS = {
  '/src/core/engine.js': 'engine.js',
  '/src/core/gameplay.js': 'gameplay.js',
  '/src/core/dom.js': 'dom.js',
  '/src/systems/audio.js': 'audio.js',
  '/src/ui/dialog.js': 'dialog.js',
  '/src/actors/police-car.js': 'police-car.js',
};

export async function resolve(specifier, context, next) {
  const r = await next(specifier, context);
  for (const [tail, stub] of Object.entries(STUBS)) {
    if (r.url.endsWith(tail)) return { ...r, url: new URL(`./stubs/${stub}`, import.meta.url).href };
  }
  return r;
}

export async function load(url, context, next) {
  if (url.endsWith('.json')) {
    const text = await readFile(new URL(url), 'utf8');
    return { format: 'module', source: `export default ${text};`, shortCircuit: true };
  }
  return next(url, context);
}
