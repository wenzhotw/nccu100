/** 游泳館。照片造型的明亮卡通版，入口朝向法學院。 */
import { scene } from '../../../core/engine.js';
import { toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { defineBuilding } from '../../registry.js';
import { createSwimmingHall } from './model.js';
import { SWIM, localHeightAt, localCollisionBoxes } from './layout.js';
import { R, buildInterior, interiorClamp, interiorHeight, interiorLight, interiorZone, updateInterior } from './interior.js';

// 外面的門：入口平台上（世界座標）
const DOOR_X = SWIM.x + SWIM.entranceX, DOOR_Z = SWIM.z + SWIM.entranceBack;

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
  // 室內：大廳和櫃檯 → 左右更衣室 → 泳池大廳（interior.js）。能不能下水由 systems/swimming 決定
  interior: {
    build: buildInterior,
    update: updateInterior,
    light: interiorLight,
    background: '#cfe6ef',
    entrance: { x: DOOR_X, z: DOOR_Z + 0.9, r: 2.4, label: '進入游泳館' },
    spawn: { x: 0, z: R.z1 - 5, yaw: 0, pitch: 0.25, face: Math.PI },
    exit: { x: 0, z: R.z1 - 0.6, r: 2.2, label: '離開游泳館' },
    returnTo: { x: DOOR_X, z: DOOR_Z + 1.9, yaw: 0, pitch: 0.3, face: 0 },
    bounds: { x0: R.x0 + 0.5, x1: R.x1 - 0.5, z0: R.z0 + 0.5, z1: R.z1 - 0.5 },
    camera: { x0: R.x0 + 0.4, x1: R.x1 - 0.4, z0: R.z0 + 0.4, z1: R.z1 - 0.2, ceil: 8, maxDist: 6.5 },
    heightAt: interiorHeight,
    zone: interiorZone,
    clamp: interiorClamp,
  },
});
