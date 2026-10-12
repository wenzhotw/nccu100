/** 游泳館。照片造型的明亮卡通版，入口朝向法學院。 */
import { scene } from '../../../core/engine.js';
import { toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { createSwimmingHall } from './model.js';
import { SWIM, localHeightAt, localCollisionBoxes } from './layout.js';

function build() {
  const model = createSwimmingHall({ materialFactory: toon });
  model.position.set(SWIM.x, 0, SWIM.z);
  scene.add(model);
  for (const [x0, x1, z0, z1] of localCollisionBoxes()) boxC(SWIM.x + x0, SWIM.x + x1, SWIM.z + z0, SWIM.z + z1);
}

export default defineBuilding({
  id: 'swimming-hall',
  name: '游泳館',
  build,
  heightAt(x, z) { return localHeightAt(x - SWIM.x, z - SWIM.z); },
  zones: [{ priority: 75, test: p => Math.abs(p.x - SWIM.x) < 14 && p.z > SWIM.z - 8 && p.z < SWIM.z + 11.8 ? '游泳館' : null }],
  map: [{ x: SWIM.x, z: SWIM.z, w: SWIM.width, d: SWIM.depth, color: '#d9cbb0', label: '游泳館' }],
});
