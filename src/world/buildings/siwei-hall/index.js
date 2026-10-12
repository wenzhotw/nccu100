/**
 * 四維堂：外觀、旁邊的廊道、可以走進去的禮堂內部。
 * 拆成三個檔案，因為內部是一個獨立的室內空間（放在 x=IX）。
 */
import { IX } from '../../layout.js';
import { defineBuilding } from '../../registry.js';
import { buildExterior } from './exterior.js';
import { buildCorridor } from './corridor.js';
import { buildInterior, enterInterior, exitInterior } from './interior.js';

export default defineBuilding({
  id: 'siwei-hall',
  name: '四維堂',
  build() { buildExterior(); buildCorridor(); buildInterior(); },
  // 室內：舞台與舞台前的台階
  heightAt(x, z) {
    if (x <= 200) return null;
    if (z < -18.05) return 1.2;
    if (z < -16.6 && Math.abs(x - IX) < 2.5) return 0.6;
    return 0;
  },
  zones: [
    { priority: 0, test: p => p.x > 200 ? '四維堂' : null },
    { priority: 150, test: p => (p.x > 14 && p.x <= 19.5 && p.z < -62 && p.z > -105) ? '四維堂廊道' : null },
  ],
  map: [{ x: 0, z: -87, w: 14, d: 30, color: '#c8c3b4', label: '四維堂' }],
  interior: { enter: enterInterior, exit: exitInterior },
});
