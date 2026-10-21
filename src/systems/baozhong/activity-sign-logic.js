/** 看板留在噴水池西側，避開大道中心線，並以現存碰撞體確認空位。 */
export function signPlacement(fountainZ, colliders) {
  const overlaps = (b, c) => {
    if (c.c) { const x = Math.max(b.x0, Math.min(c.x,b.x1)), z = Math.max(b.z0,Math.min(c.z,b.z1)); return Math.hypot(x-c.x,z-c.z) < c.r + .45; }
    if (c.obb) {
      const hx = Math.abs(c.hx*c.cs)+Math.abs(c.hz*c.sn), hz = Math.abs(c.hx*c.sn)+Math.abs(c.hz*c.cs);
      c = {x0:c.cx-hx,x1:c.cx+hx,z0:c.cz-hz,z1:c.cz+hz};
    }
    return b.x0 < c.x1+.45 && b.x1 > c.x0-.45 && b.z0 < c.z1+.45 && b.z1 > c.z0-.45;
  };
  const rejected = [];
  for (const x of [-9.6,-9.2,-10.2,-11.2,-12.2]) {
    // ground.js 的橫向步道寬 4.4 公尺，讓看板離北緣再退 1.5 公尺。
    const z = fountainZ - 2.2 - 1.5;
    const box = {x0:x-2.8,x1:x+2.8,z0:z-.3,z1:z+.3,top:4.7};
    // 同時保留面向大道的互動站位，不讓玩家站進既有碰撞體。
    const approach = {x0:x-.6,x1:x+.6,z0:z+.4,z1:z+2};
    const blocking = colliders.filter(c => overlaps(box,c) || overlaps(approach,c));
    if (!blocking.length) return {x,z,box,approach};
    rejected.push({x,z,blocking});
  }
  const error = new Error('噴水池西側沒有已確認的看板空位');
  error.placements = rejected;
  throw error;
}
