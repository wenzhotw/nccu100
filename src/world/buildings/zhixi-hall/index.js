/**
 * 志希樓（校區地圖 B7）：四維道東側的門字型綠屋頂建築。
 * 造型和對面的果夫樓一樣，共用 building-kit.js 的 greenRoofUHall()。
 */
import { greenRoofUHall } from '../../building-kit.js';
import { defineBuilding } from '../../registry.js';

const SIDE = -1;   // 1 = 西側，-1 = 東側

export default defineBuilding({
  id: 'zhixi-hall',
  name: '志希樓',
  build: () => greenRoofUHall(SIDE),
  zones: [{ priority: 65, test: p => (Math.abs(p.x - SIDE * 25) < 5 && p.z < -12 && p.z > -53) ? '志希樓' : null }],
  map: [{ x: -28, z: -32, w: 6, d: 35, color: '#b9cfae', label: '志希樓' }],
});
