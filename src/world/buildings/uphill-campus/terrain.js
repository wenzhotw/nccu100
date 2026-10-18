// 依三層分區查詢地面高度，保持純函式，供後續階梯、坡道與場景共用。
import { REGIONS, LEVELS, STAIRS } from './layout.js';

/** 投影到最近的折線段，等距時保留較小的沿線距離。 */
function projectToPath(x, z, path) {
  let nearest = { distance: Infinity, s: 0 };
  let walked = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1], [bx, bz] = path[i];
    const dx = bx - ax, dz = bz - az;
    const length = Math.hypot(dx, dz);
    const t = length === 0 ? 0
      : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (length * length)));
    const distance = (x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2;
    if (distance < nearest.distance) nearest = { distance, s: walked + t * length };
    walked += length;
  }
  return nearest;
}

/** 沿折線累加實際水平長度，轉角不另加距離。 */
function pathLength(path) {
  return path.slice(1).reduce((sum, [x, z], i) =>
    sum + Math.hypot(x - path[i][0], z - path[i][1]), 0);
}

/** 每階踏面走完才升高，多餘路長平均分配給休息平台。 */
export function stairHeight(stair, s) {
  const parent = stair.joinStair ? STAIRS.find(candidate => candidate.id === stair.joinStair) : null;
  const from = parent
    ? stairHeight(parent, projectToPath(...stair.path[0], parent.path).s)
    : stair.from;
  const length = pathLength(stair.path);
  const steps = Math.round((stair.to - from) / 0.3);
  const landings = Math.floor((steps - 1) / 12);
  if (length + 1e-10 < steps * 0.8 + landings * 1.6) {
    throw new Error('階梯路徑太短，無法容納踏面與休息平台。');
  }
  const landingDepth = landings > 0 ? (length - steps * 0.8) / landings : 0;
  if (s <= 0) return from;
  if (s >= length) return stair.to;
  let risen = 0;
  for (let step = 1; step <= steps; step++) {
    const end = step * 0.8 + Math.floor((step - 1) / 12) * landingDepth;
    if (s + 1e-10 < end) break;
    risen = step;
  }
  return from + risen * 0.3;
}

/** 以水平射線的交點奇偶判斷座標是否在多邊形內。 */
export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** 分區外回傳 null，讓高度備援與後續通路判斷各自處理。 */
export function regionAt(x, z) {
  return REGIONS.find(region => pointInPoly(x, z, region.poly))?.level ?? null;
}

/** 投影夾在線段兩端之間，以距離平方比較，省去開根號。 */
function distanceToPolySquared(x, z, poly) {
  let nearest = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i];
    const dx = bx - ax, dz = bz - az;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared === 0 ? 0
      : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSquared));
    const distance = (x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2;
    nearest = Math.min(nearest, distance);
  }
  return nearest;
}

/** 平台高度查詢，後續階梯與坡道可在平台判斷前優先處理。 */
export function heightAt(x, z) {
  let nearestStair = null;
  let nearestProjection = { distance: Infinity };
  for (const stair of STAIRS) {
    const projection = projectToPath(x, z, stair.path);
    // 跨階梯等距時保留配置順序，同座階梯由投影保留較小的 s。
    if (projection.distance <= (stair.width / 2) ** 2
      && projection.distance < nearestProjection.distance) {
      nearestStair = stair;
      nearestProjection = projection;
    }
  }
  if (nearestStair) return stairHeight(nearestStair, nearestProjection.s);

  const level = regionAt(x, z);
  if (level !== null) return LEVELS[level];

  let nearestLevel = REGIONS[0].level;
  let nearestDistance = Infinity;
  for (const region of REGIONS) {
    const distance = distanceToPolySquared(x, z, region.poly);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestLevel = region.level;
    }
  }
  return LEVELS[nearestLevel];
}
