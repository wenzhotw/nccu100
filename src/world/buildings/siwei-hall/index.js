/**
 * 四維堂：外觀、旁邊的廊道、可以走進去的禮堂內部。
 * 內部是獨立的室內房間（core/rooms.js），第一次走進去才建立。格式說明：docs/interiors.md
 */
import { IX } from '../../layout.js';
import { defineBuilding } from '../../registry.js';
import { buildExterior } from './exterior.js';
import { buildCorridor } from './corridor.js';
import { buildInterior, interiorLight } from './interior.js';

export default defineBuilding({
  id: 'siwei-hall',
  name: '四維堂',
  build() { buildExterior(); buildCorridor(); },
  zones: [
    { priority: 150, test: p => (p.x > 14 && p.x <= 19.5 && p.z < -62 && p.z > -105) ? '四維堂廊道' : null },
  ],
  map: [{ x: 0, z: -87, w: 14, d: 30, color: '#c8c3b4', label: '四維堂' }],
  interior: {
    // 房間 id 預設就是建築 id（siwei-hall），名稱是「四維堂」
    build: buildInterior,
    light: interiorLight,
    background: '#3a3330',
    // 門：戶外的入口、房間裡的出口，以及進出後站的位置（face 是主角面向的角度）
    entrance: { x: 0, z: -74.8, r: 2.8, label: '進入四維堂' },
    spawn: { x: IX, z: 21.5, yaw: 0, pitch: 0.22, face: Math.PI },
    exit: { x: IX, z: 23.2, r: 2.6, label: '離開四維堂' },
    returnTo: { x: 0, z: -72.5, yaw: 0, pitch: 0.3, face: 0 },
    // 主角能走的範圍，以及鏡頭的範圍（ceil 是天花板高度）
    bounds: { x0: IX - 11.2, x1: IX + 11.2, z0: -21.4, z1: 24.3 },
    camera: { x0: IX - 11.3, x1: IX + 11.3, z0: -21.3, z1: 24.6, ceil: 10.4, maxDist: 6.5 },
    // 舞台兩側是牆，只有中間的台階可以上下
    clamp(p) { if (p.z < -17.7 && p.z > -18.4 && Math.abs(p.x - IX) > 7.9) p.z = p.z > -18.05 ? -17.7 : -18.4; },
    // 舞台與舞台前的台階
    heightAt(x, z) {
      if (z < -18.05) return 1.2;
      if (z < -16.6 && Math.abs(x - IX) < 2.5) return 0.6;
      return 0;
    },
  },
});
