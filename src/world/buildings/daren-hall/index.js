/**
 * 大仁樓。依兩張正立面照片建立簡化遊戲版，保留原預定地 (150, -13)。入口朝南。
 */
import { scene } from '../../../core/engine.js';
import { toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { createDarenHall } from './model.js';
import { DAREN, localHeightAt } from './layout.js';

// 入口朝南（四維道那一側）。模型本身是入口朝 +z 建的，所以整棟轉 180 度，
// 碰撞和階梯高度也用同一個轉換：世界 = 中心 − 區域座標。
const toLocal = (x, z) => [DAREN.x - x, DAREN.z - z];
/** 用區域座標登記一塊方形碰撞（轉 180 度後 x、z 範圍都要反過來） */
const box = (lx0, lx1, lz0, lz1) => boxC(DAREN.x - lx1, DAREN.x - lx0, DAREN.z - lz1, DAREN.z - lz0);

function build() {
  const model = createDarenHall({ materialFactory: toon });
  model.position.set(DAREN.x, 0, DAREN.z);
  model.rotation.y = Math.PI;
  scene.add(model);
  const { width, depth } = DAREN;
  // 入口可爬上平台並靠近門，室內暫不開放。
  box(-width / 2, width / 2, -depth / 2, 2.64);
  box(-width / 2, -2.9, 2.64, depth / 2 + .33);
  box(2.9, width / 2, 2.64, depth / 2 + .33);
  [-1, 1].forEach(s => box(s * 3.14 - .17, s * 3.14 + .17, 3.50, DAREN.stairStart));
  // 平台入口方柱也要阻擋角色，避免靠牆時穿入柱體。
  [-1, 1].forEach(s => box(s * 2.55 - .23, s * 2.55 + .23, 2.92, 3.64));
}

export default defineBuilding({
  id: 'daren-hall',
  name: '大仁樓',
  build,
  heightAt(x, z) { return localHeightAt(...toLocal(x, z)); },
  zones: [{ priority: 95, test: p => Math.abs(p.x - DAREN.x) < 14.0 && p.z < DAREN.z + 4.0 && p.z > DAREN.z - 10.8 ? '大仁樓前' : null }],
  map: [{ x: DAREN.x, z: DAREN.z, w: DAREN.width, d: DAREN.depth, color: '#aeb4aa', label: '大仁樓' }],
});
