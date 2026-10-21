// 結構檢查：npm run check（CI 也會跑）
// 1. 每棟建築都在自己的資料夾，有 index.js 和 README.md
// 2. 建築之間不可以互相 import
// 3. defineBuilding 的 id 和資料夾名稱一樣
// 4. 內容 JSON 格式正確
// 5、6. 美術風格硬規則（見檔案後段）
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const B = path.join(root, 'src/world/buildings');
const errs = [];
const rel = p => path.relative(root, p);

for (const name of fs.readdirSync(B)) {
  const dir = path.join(B, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errs.push(`${rel(dir)}: 資料夾名稱請用小寫英文、數字和連字號，例如 student-center`);
  const idx = path.join(dir, 'index.js');
  if (!fs.existsSync(idx)) { errs.push(`${rel(dir)}: 缺少 index.js`); continue; }
  if (!fs.existsSync(path.join(dir, 'README.md'))) errs.push(`${rel(dir)}: 缺少 README.md（寫一下這棟建築是誰負責、參考了哪些照片）`);
  const src = fs.readFileSync(idx, 'utf8');
  const m = src.match(/defineBuilding\(\{\s*id:\s*'([^']+)'/);
  if (!m) errs.push(`${rel(idx)}: 要 export default defineBuilding({ id: '${name}', ... })`);
  else if (m[1] !== name) errs.push(`${rel(idx)}: id「${m[1]}」要和資料夾名稱「${name}」一樣`);
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const im of code.matchAll(/from\s+'(\.\.\/[^']+)'/g)) {
      const target = path.resolve(dir, im[1]);
      if (target.startsWith(B + path.sep) && !target.startsWith(dir + path.sep))
        errs.push(`${rel(path.join(dir, f))}: 不可以 import 別棟建築（${im[1]}）。共用的東西請放 src/world/building-kit.js`);
    }
  }
}

// 內容檔
const C = path.join(root, 'src/content');
for (const f of fs.readdirSync(C).filter(f => f.endsWith('.json'))) {
  try { JSON.parse(fs.readFileSync(path.join(C, f), 'utf8')); }
  catch (e) { errs.push(`src/content/${f}: JSON 格式錯誤：${e.message}`); }
}
if (!errs.length) {
  const npcs = JSON.parse(fs.readFileSync(path.join(C, 'npcs.json'), 'utf8')).npcs;
  const ids = new Set();
  npcs.forEach((n, i) => {
    const w = `src/content/npcs.json 第 ${i + 1} 位`;
    if (!n.id) errs.push(`${w}: 缺少 id`); else if (ids.has(n.id)) errs.push(`${w}: id「${n.id}」重複`); ids.add(n.id);
    if (!n.title) errs.push(`${w}: 缺少 title`);
    if (!Array.isArray(n.dialog) || !n.dialog.length) errs.push(`${w}: 缺少 dialog`);
    else if (n.dialog[n.dialog.length - 1].when) errs.push(`${w}: dialog 最後一段不要寫 when（當作預設台詞）`);
  });
  if (!ids.has('cop')) errs.push('src/content/npcs.json: 駐校警察（id: cop）不能刪，追逐劇情會用到');
  const stories = JSON.parse(fs.readFileSync(path.join(C, 'stories.json'), 'utf8')).stories;
  stories.forEach((s, i) => ['id', 'title', 'lines'].forEach(k => { if (!s[k]) errs.push(`src/content/stories.json 第 ${i + 1} 個: 缺少 ${k}`); }));
}

// 美術風格硬規則（docs/art-style.md 第二節）
// 5. 不用寫實材質（MeshStandardMaterial 等），一律 toon()、basic() 或帶 GRAD 的 MeshToonMaterial
// 6. 不引用外部圖片當貼圖（import .jpg/.png/.webp、TextureLoader），貼圖用 canvasTex() 畫
const S = path.join(root, 'src');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const STYLE = [
  [/\bMesh(Standard|Physical|Phong|Lambert)Material\b/, '不可用寫實材質，請改用 render/kit.js 的 toon() 或 basic()（docs/art-style.md 第四節）'],
  [/\bTextureLoader\b/, '不可載入外部圖片貼圖，請用 canvasTex() 畫（docs/art-style.md 第八節）'],
  [/from\s+['"][^'"]+\.(jpe?g|png|webp|gif)(\?[^'"]*)?['"]/i, '不可 import 圖片當貼圖，參考照片只放 photos/（docs/art-style.md 第二節）'],
];
for (const f of walk(S).filter(f => f.endsWith('.js'))) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '');
    for (const [re, msg] of STYLE) if (re.test(code)) errs.push(`${rel(f)} 第 ${i + 1} 行: ${msg}`);
  });
}

if (errs.length) { console.error('檢查沒過：\n- ' + errs.join('\n- ')); process.exit(1); }
console.log('檢查通過 ✓');
