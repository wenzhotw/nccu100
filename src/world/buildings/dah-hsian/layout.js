/** 達賢戶外配置。前草坡朝 +z，池畔朝 -z；標高由照片估計，非現地測繪。 */
import site from './site-data.js';
export const POND = site.features.pond.outline;
export const LIBRARY_OUTLINE = site.features.library.outline;
export const HOUSE_OUTLINE = site.features.house.outline;
export const SCALE = site.scale;
export const HOUSE = { x: -15.255, z: -53.207, width: 24.25, depth: 16, angle: 1.183 };
export const BOUNDS = { x0: -59, x1: 62, z0: -106, z1: 104 };
export const SPAWN = { x: 21, z: 86, yaw: 0, pitch: 0.24, face: Math.PI };

/** 同一個連續坡面供模型與玩家腳底讀取。入口平台比池畔高約四個遊戲公尺。 */
export function groundHeight(x, z) {
  if (z >= 90) return 0;
  if (z > 36) return 4 * (90 - z) / 54;
  if (z >= 28) return 4;
  if (z > -30) return 4 * (z + 30) / 58;
  return 0;
}

/** 射線法只判斷水平位置，角色高度另外由 groundHeight 決定。 */
export function insidePolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[i], [bx, bz] = polygon[j];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

/** 水池兩側都有岸線；保留半公尺岸邊間隙，不讓角色踏入景觀池。 */
export function keepOnLand(p, polygon = POND) {
  const margin = 0.52;
  const within = insidePolygon(p.x, p.z, polygon);
  const area = polygon.reduce((a, v, i) => {
    const n = polygon[(i + 1) % polygon.length]; return a + v[0] * n[1] - n[0] * v[1];
  }, 0);
  let closest = Infinity, candidate = null;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (!len) continue;
    const t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / (len * len)));
    const x = a[0] + t * dx, z = a[1] + t * dz, d = Math.hypot(p.x - x, p.z - z);
    if (!within && d >= margin) continue;
    const sign = area > 0 ? 1 : -1;
    const q = { x: x + sign * dz / len * margin, z: z - sign * dx / len * margin };
    if (d < closest && !insidePolygon(q.x, q.z, polygon)) { closest = d; candidate = q; }
  }
  if (candidate) { p.x = candidate.x; p.z = candidate.z; }
  p.x = Math.max(BOUNDS.x0 + 0.5, Math.min(BOUNDS.x1 - 0.5, p.x));
  p.z = Math.max(BOUNDS.z0 + 0.5, Math.min(BOUNDS.z1 - 0.5, p.z));
}

/** 門廊保留開口，主樓玻璃背後與小屋本體不可穿越。 */
export function buildingColliders() {
  const cs=Math.cos(HOUSE.angle),sn=Math.sin(HOUSE.angle);
  return [
    { x0: -26.5, x1: 24, z0: -28.4, z1: 9.2, top: 25.4 },
    { x0: -26.5, x1: 14.5, z0: 9.2, z1: 27.5, top: 25.4 },
    { x0: 14.5, x1: 28, z0: 9.2, z1: 12.5, top: 25.4 },
    { x0: 27.7, x1: 28.5, z0: 25.2, z1: 26, top: 12.7 },
    { x0: 14.7, x1: 21.5, z0: 27.475, z1: 27.925, top: 6.2 },
    { obb: true, cx: HOUSE.x, cz: HOUSE.z, hx: HOUSE.width/2+0.75, hz: HOUSE.depth/2+0.95,
      cs, sn },
    { obb: true, cx: HOUSE.x-1.45*cs-9.65*sn, cz: HOUSE.z+1.45*sn-9.65*cs,
      hx: 9.91, hz: 0.675, cs, sn },
  ];
}

export function zoneName(p) {
  if (p.z > 38) return '達賢圖書館・入口草坡';
  if (p.z > 12) return '達賢圖書館・入口廣場';
  if (p.z < -68) return '達賢圖書館・景觀池畔';
  if (p.z < -35 && p.x < -1) return '湖濱悅讀小屋';
  if (p.z < -30) return '達賢圖書館・湖濱步道';
  return '達賢圖書館・戶外廊道';
}
