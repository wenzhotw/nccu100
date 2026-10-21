/**
 * 樂活館共用尺寸。低翼朝向正門，長立面面向八德道。
 * 依 OpenNCCU 3D 模型：主體緊貼拉直後的八德道南側人行道，東西範圍約 x 32～58（原本 x 38、z 3）。
 */
export const LOHAS = Object.freeze({
  x: 45, z: -1.4, width: 26, depth: 10,
  front: -5, back: 5, height: 12.4, towerHeight: 15.5,
  wingLeft: -20.3, wingRight: -13, wingFront: -4.6, wingBack: 4.6,
  arcadeRight: -15.5, landingHeight: .72,
  stairFront: -6.4, stairCount: 4,
  columnX: -19.72, columnZ: Object.freeze([-4.15, 0, 4.15]),
  heartX: -19, heartZ: -3.25,
  frontNormal: Object.freeze({ x: 0, z: -1 }),
});

/** 高度與模型使用相同端點，室內及屋頂不開放。 */
export function localHeightAt(x, z) {
  const s = LOHAS;
  if (x >= s.wingLeft && x <= s.arcadeRight && z >= s.wingFront && z <= s.wingBack) return s.landingHeight;
  if (x >= s.wingLeft && x <= s.arcadeRight && z >= s.stairFront && z < s.wingFront) {
    const d = (s.wingFront - s.stairFront) / s.stairCount;
    const step = Math.min(s.stairCount, Math.floor((z - s.stairFront) / d) + 1);
    return step * s.landingHeight / s.stairCount;
  }
  return null;
}

/** 固定障礙物，不把架空柱廊誤判成整棟實心碰撞。 */
export function localCollisionBoxes() {
  const s = LOHAS;
  return [
    [-13, 8.5, -5.02, 5.05],
    [8.5, 13, -4.35, 5.05],
    [8.5, 8.8, -5.55, -4.35],
    [12.7, 13, -5.55, -4.35],
    [s.arcadeRight, s.wingRight, s.wingFront, s.wingBack],
    ...s.columnZ.map(z => [s.columnX - .22, s.columnX + .22, z - .22, z + .22]),
    [s.heartX - .94, s.heartX + .94, s.heartZ - .4, s.heartZ + .4],
  ];
}

/** 建築占地、柱廊與階梯不種草，另留 0.3 公尺容納草葉寬度及任意轉向的風擺。 */
export function localExcludesGrass(x, z) {
  const s = LOHAS, pad = .3;
  const inside = (x0, x1, z0, z1) => x >= x0 - pad && x <= x1 + pad && z >= z0 - pad && z <= z1 + pad;
  return inside(-s.width / 2, s.width / 2, s.front, s.back + .05)
    || inside(8.5, s.width / 2, -5.55, s.back + .05)
    || inside(s.wingLeft, s.wingRight, s.wingFront, s.wingBack)
    || inside(s.wingLeft, s.arcadeRight, s.stairFront, s.wingFront);
}
