// 依三層分區查詢地面高度，保持純函式，供後續階梯、坡道與場景共用。
import { REGIONS, LEVELS } from './layout.js';

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
