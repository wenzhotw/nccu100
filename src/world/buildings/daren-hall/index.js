/**
 * 大仁樓。依兩張正立面照片建立簡化遊戲版，保留原預定地 (150, -13)。
 */
import { scene } from '../../../core/engine.js';
import { toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { createDarenHall } from './model.js';
import { DAREN, localHeightAt } from './layout.js';

function build() {
  const model = createDarenHall({ materialFactory: toon });
  model.position.set(DAREN.x, 0, DAREN.z);
  scene.add(model);
  const { x, z, width, depth } = DAREN;
  // 入口可爬上平台並靠近門，室內暫不開放。
  boxC(x - width / 2, x + width / 2, z - depth / 2, z + 2.64);
  boxC(x - width / 2, x - 2.9, z + 2.64, z + depth / 2 + .33);
  boxC(x + 2.9, x + width / 2, z + 2.64, z + depth / 2 + .33);
  [-1, 1].forEach(s => boxC(x + s * 3.14 - .17, x + s * 3.14 + .17, z + 3.50, z + DAREN.stairStart));
  // 平台入口方柱也要阻擋角色，避免靠牆時穿入柱體。
  [-1, 1].forEach(s => boxC(x + s * 2.55 - .23, x + s * 2.55 + .23, z + 2.92, z + 3.64));
}

export default defineBuilding({
  id: 'daren-hall',
  name: '大仁樓',
  build,
  heightAt(x, z) { return localHeightAt(x - DAREN.x, z - DAREN.z); },
  zones: [{ priority: 95, test: p => Math.abs(p.x - DAREN.x) < 14.0 && p.z > DAREN.z - 4.0 && p.z < DAREN.z + 10.8 ? '大仁樓前' : null }],
  map: [{ x: DAREN.x, z: DAREN.z, w: DAREN.width, d: DAREN.depth, color: '#aeb4aa', label: '大仁樓' }],
});
