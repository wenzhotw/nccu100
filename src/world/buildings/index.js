/**
 * 建築自動載入器
 *
 * 這個資料夾底下，每個子資料夾就是一棟建築，裡面的 index.js 會被自動找到並載入。
 * 新增建築時「不用」改這個檔案，也不用改 main.js：建一個新資料夾、寫好 index.js 就會出現在遊戲裡。
 *
 * 規則：
 *   1. 資料夾名稱 = 建築 id（小寫英文加連字號，例如 library、admin-building）
 *   2. index.js 要 `export default defineBuilding({ id, name, build, ... })`
 *   3. 建築之間不可以互相 import。共用工具放 world/building-kit.js
 */
import { installBuilding } from '../registry.js';
import { replacedBuildings } from '../photo-district.js';

const modules = import.meta.glob('./*/index.js', { eager: true });

const folders = Object.keys(modules).filter(p => !replacedBuildings.has(p.split('/')[1])).sort();
for (const path of folders) {
  const folder = path.split('/')[1];
  const def = modules[path].default;
  if (!def) throw new Error(`建築 ${folder}/index.js 沒有 export default defineBuilding({...})`);
  if (def.id !== folder) throw new Error(`建築 id「${def.id}」要和資料夾名稱「${folder}」一樣`);
  installBuilding(def);
}

// 全部登記完才開始建模，這樣某棟建築的 build() 出錯時，錯誤訊息會指出是哪一棟
for (const def of folders.map(p => modules[p].default)) {
  try { def.build(); }
  catch (err) { console.error(`建築「${def.name || def.id}」建模失敗`, err); }
}

export const buildingIds = folders.map(p => p.split('/')[1]);
