/**
 * 果夫樓（校區地圖 B8）：四維道西側的門字型綠屋頂建築。
 * 造型和對面的志希樓一樣，共用 building-kit.js 的 greenRoofUHall()。
 */
import { greenRoofUHall } from '../../building-kit.js';
import { defineBuilding } from '../../registry.js';

const SIDE = 1;   // 1 = 西側，-1 = 東側

export default defineBuilding({
  id: 'guofu-hall',
  name: '果夫樓',
  build: () => greenRoofUHall(SIDE),
  zones: [{ priority: 65, test: p => (Math.abs(p.x - SIDE * 25) < 5 && p.z < -12 && p.z > -53) ? '果夫樓' : null }],
  map: [{ x: 28, z: -32, w: 6, d: 35, color: '#b9cfae', label: '果夫樓' }],
});
