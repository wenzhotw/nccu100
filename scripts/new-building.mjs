// 建立新建築資料夾：npm run new-building -- student-center 學生活動中心
import fs from 'fs';
import path from 'path';

const [id, name] = process.argv.slice(2);
if (!id || !name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('用法：npm run new-building -- <資料夾名稱> <中文名稱>\n例如：npm run new-building -- student-center 學生活動中心');
  process.exit(1);
}
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(root, 'src/world/buildings', id);
if (fs.existsSync(dir)) { console.error(`${id} 已經存在了`); process.exit(1); }
fs.mkdirSync(path.join(dir, 'photos'), { recursive: true });
fs.writeFileSync(path.join(dir, 'photos/.gitkeep'), '');
fs.writeFileSync(path.join(dir, 'index.js'), `/**
 * ${name}
 */
import { block } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';

// 建築的中心位置（單位公尺）。從校門面向四維堂時，x 越大越右邊，z 越小越裡面；校門約 z=10，四維堂約 z=-87
const X = 0, Z = 0;

function build() {
  // 先用一個方塊佔位，之後再慢慢雕細節
  block(X, 6, Z, 20, 12, 14, '#e6dccb');
  // 碰撞：讓玩家撞得到牆（x0, x1, z0, z1）
  boxC(X - 10, X + 10, Z - 7, Z + 7);
}

export default defineBuilding({
  id: '${id}',
  name: '${name}',
  build,
  // 區域名稱：走進範圍時畫面上方會顯示。priority 數字對照表在 src/world/zones.js
  zones: [{ priority: 75, test: p => (Math.abs(p.x - X) < 14 && Math.abs(p.z - Z) < 11) ? '${name}' : null }],
  // 秘寶地圖與小地圖上的圖示
  map: [{ x: X, z: Z, w: 20, d: 14, color: '#e6dccb', label: '${name}' }],
});
`);
fs.writeFileSync(path.join(dir, 'README.md'), `# ${name}

- 負責人：@你的 GitHub 帳號
- 狀態：佔位方塊（還沒開始雕）
- 參考照片：放在 \`photos/\`

## 筆記

（實際尺寸、外觀特徵、還沒做的細節）
`);
console.log(`已建立 src/world/buildings/${id}/，執行 npm run dev 就能在遊戲裡看到。記得把 X、Z 改成實際位置。`);
