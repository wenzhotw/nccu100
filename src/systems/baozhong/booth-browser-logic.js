// Independent counter-front entry points. These never reuse an NPC's moving spot.
export const BOOTH_BROWSE_LOCAL = Object.freeze({ x: 0.65, z: 2.35, radius: 2.15 });
export function boothBrowsePoint(tent) {
  const { x, z } = BOOTH_BROWSE_LOCAL, c = Math.cos(tent.rotY), s = Math.sin(tent.rotY);
  return { id: tent.id, x: tent.x + x * c + z * s, z: tent.z - x * s + z * c };
}
export function boothLocalPosition(tent, position) {
  const dx = position.x - tent.x, dz = position.z - tent.z;
  const c = Math.cos(tent.rotY), s = Math.sin(tent.rotY);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}
export function nearestBrowseBooth(tents, position) {
  let result = null, distance = Infinity;
  for (const tent of tents) {
    if (!/^D\d{2}$/.test(tent.id)) continue;
    const local = boothLocalPosition(tent, position);
    // No reading through the side/back cloth. A broad front zone works on touch.
    if (local.z < 1.35 || local.z > 4.4 || Math.abs(local.x) > 2.2) continue;
    const p = boothBrowsePoint(tent), d = Math.hypot(position.x - p.x, position.z - p.z);
    if (d < BOOTH_BROWSE_LOCAL.radius && d < distance) { result = tent; distance = d; }
  }
  return result;
}
