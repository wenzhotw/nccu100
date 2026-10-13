// 幫一棟建築建立室內房間的模板：npm run new-interior -- swimming-hall
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const [id] = process.argv.slice(2);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/world/buildings', id || '');
if (!id || !fs.existsSync(path.join(dir, 'index.js'))) {
  console.error('用法：npm run new-interior -- <建築資料夾名稱>\n建築要先存在（npm run new-building 建立），例如：npm run new-interior -- swimming-hall');
  process.exit(1);
}
const file = path.join(dir, 'interior.js');
if (fs.existsSync(file)) { console.error(`${id}/interior.js 已經存在了`); process.exit(1); }
fs.writeFileSync(file, `/**
 * 室內房間。格式說明：docs/interiors.md
 * 房間是獨立場景，座標從原點開始算，跟校園無關。
 * 從出口往裡面看是 -z（越小越裡面），x 越大越右邊。
 */
import { block, flat } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';

// 房間大小（公尺）
export const ROOM = { w: 24, d: 36, h: 6 };

export function buildInterior() {
  const { w, d, h } = ROOM;
  // 地板
  flat(w, d, '#d8d2c4', 0, 0.01, 0);
  // 四面牆與天花板（牆加碰撞）
  block(-w / 2, h / 2, 0, 0.4, h, d, '#efede6'); boxC(-w / 2 - 0.2, -w / 2 + 0.2, -d / 2, d / 2);
  block(w / 2, h / 2, 0, 0.4, h, d, '#efede6'); boxC(w / 2 - 0.2, w / 2 + 0.2, -d / 2, d / 2);
  block(0, h / 2, -d / 2, w, h, 0.4, '#efede6'); boxC(-w / 2, w / 2, -d / 2 - 0.2, -d / 2 + 0.2);
  block(0, h / 2, d / 2, w, h, 0.4, '#efede6'); boxC(-w / 2, w / 2, d / 2 - 0.2, d / 2 + 0.2);
  block(0, h + 0.2, 0, w, 0.4, d, '#f6f3ec');
  // 出口門
  block(0, 1.3, d / 2 - 0.25, 2.2, 2.6, 0.1, '#7a5a43');
}
`);
console.log(`已建立 src/world/buildings/${id}/interior.js。
接著在 ${id}/index.js 加上：

import { ROOM, buildInterior } from './interior.js';

  interior: {
    build: buildInterior,
    entrance: { x: 外面門口的 x, z: 外面門口的 z, label: '進入（名稱）' },
    spawn: { x: 0, z: ROOM.d / 2 - 2, face: Math.PI },
    exit: { x: 0, z: ROOM.d / 2 - 0.8, label: '離開（名稱）' },
    returnTo: { x: 門口外一步的 x, z: 門口外一步的 z, face: 0 },
    bounds: { x0: -ROOM.w / 2 + 0.6, x1: ROOM.w / 2 - 0.6, z0: -ROOM.d / 2 + 0.6, z1: ROOM.d / 2 - 0.6 },
    camera: { x0: -ROOM.w / 2 + 0.5, x1: ROOM.w / 2 - 0.5, z0: -ROOM.d / 2 + 0.5, z1: ROOM.d / 2 - 0.3, ceil: ROOM.h - 0.4 },
  },

完整欄位說明見 docs/interiors.md。`);
