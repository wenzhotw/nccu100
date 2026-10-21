/** 依地標、通路、建築與平台判斷區域名稱，不載入場景或瀏覽器引擎。 */
import { LAYOUT, STAIRS, RAMPS, STOP, LOBBY } from './layout.js';
import { projectToPath, pointInPoly, platformLevel } from './terrain.js';
import { isInsideLobby } from './lobby.js';

const displayNames = {
  '山居下車點': '山居學習中心',
  '安九正門': '安九食堂',
  '旋轉樓梯(銜接建築)': '旋轉樓梯',
  '遮雨棚西端': '遮雨棚',
  '遮雨棚東端': '遮雨棚',
};
// 山居下車點改以站牌 STOP 為準（Task 7 站牌由原點移到山居南側），配置資料的原點座標不再代表站牌。
const landmarks = Object.entries(LAYOUT.landmarks).filter(([name]) => name !== '福利社(Google)')
  .map(([name, point]) => [name, name === '山居下車點' ? [STOP.x, STOP.z] : point]);
const levelNames = { L1: '環山一道', L2: '自強宿舍區', L3: '自強九舍・十舍' };

export function zoneName({ x, z }) {
  if(isInsideLobby(x,z))return Math.hypot(x-LOBBY.well.cx,z-LOBBY.well.cz)<=4+1e-9?'旋轉樓梯':LOBBY.name;
  let nearest = null, distance = Infinity;
  for (const [name, point] of landmarks) {
    const d = (x - point[0]) ** 2 + (z - point[1]) ** 2;
    if (d <= 8 ** 2 && d < distance) { nearest = name; distance = d; }
  }
  if (nearest) return displayNames[nearest] ?? nearest.replace(/\([^)]*\)|（[^）]*）/g, '');
  if (x >= 8 && x < 25.2 && z >= -30.8 && z <= -24) return '自強九舍中庭';
  const stair = STAIRS.find(candidate => projectToPath(x, z, candidate.path).distance <= (candidate.width / 2) ** 2);
  if (stair) return stair.id === 'jiu-plaza' ? '九舍樓梯' : '好漢坡';
  if (RAMPS.some(ramp => projectToPath(x, z, ramp.path).distance <= (ramp.width / 2) ** 2)) return '外部斜坡';
  if (projectToPath(x, z, LAYOUT.viewpoint_road).distance <= 4 ** 2) return '觀景步道';
  for (const building of LAYOUT.buildings) {
    if (!building.name) continue;
    const poly = building.pts;
    if (pointInPoly(x, z, poly)
      || projectToPath(x, z, [...poly, poly[0]]).distance <= 2 ** 2) return building.name;
  }
  return levelNames[platformLevel(x, z)];
}
