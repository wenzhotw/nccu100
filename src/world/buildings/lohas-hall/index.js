/** 樂活館。彩窗長立面朝八德道，玻璃低翼與開放柱廊位於正門一端。 */
import { scene } from '../../../core/engine.js';
import { toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { createLohasHall } from './model.js';
import { LOHAS, localHeightAt, localCollisionBoxes } from './layout.js';

function build() {
  const model = createLohasHall({ materialFactory: toon });
  model.position.set(LOHAS.x, 0, LOHAS.z);
  scene.add(model);
  for (const [x0, x1, z0, z1] of localCollisionBoxes()) boxC(LOHAS.x + x0, LOHAS.x + x1, LOHAS.z + z0, LOHAS.z + z1);
}

export default defineBuilding({
  id: 'lohas-hall',
  name: '樂活館',
  build,
  heightAt(x, z) { return localHeightAt(x - LOHAS.x, z - LOHAS.z); },
  zones: [{ priority: 75, test: p => p.x > LOHAS.x + LOHAS.wingLeft - 1 && p.x < LOHAS.x + 14 && p.z > LOHAS.z - 7.2 && p.z < LOHAS.z + 5.8 ? '樂活館' : null }],
  map: [
    { x: LOHAS.x, z: LOHAS.z, w: LOHAS.width, d: LOHAS.depth, color: '#e6e9e2', label: '樂活館' },
    { x: LOHAS.x + (LOHAS.wingLeft + LOHAS.wingRight) / 2, z: LOHAS.z, w: LOHAS.wingRight - LOHAS.wingLeft, d: LOHAS.wingBack - LOHAS.wingFront, color: '#5f8888' },
  ],
});
