/** 游泳館共用尺寸。沿用預定地，正面朝 +Z 的法學院，尺寸依照片比例簡化。 */
export const SWIM = Object.freeze({
  x: -118, z: -126, width: 26, depth: 14, height: 10.7,
  front: 7, entranceX: -7.4, entranceBack: 6.43,
  landingHeight: 1.1, landingWidth: 5.4, landingFront: 8.75,
  stairWidth: 4.4, stairStart: 11.15, stairCount: 4,
  rampLeft: -4.7, rampRight: 4.3, rampBack: 7.2, rampFront: 8.6,
  frontNormal: Object.freeze({ x: 0, z: 1 }),
});

export function localHeightAt(x, z) {
  const s = SWIM;
  if (Math.abs(x - s.entranceX) <= s.landingWidth / 2 && z >= s.entranceBack && z <= s.landingFront) return s.landingHeight;
  if (Math.abs(x - s.entranceX) <= s.stairWidth / 2 && z > s.landingFront && z <= s.stairStart) {
    const depth = (s.stairStart - s.landingFront) / s.stairCount;
    const step = Math.min(s.stairCount, Math.floor((s.stairStart - z) / depth) + 1);
    return step * s.landingHeight / s.stairCount;
  }
  if (x >= s.rampLeft && x <= s.rampRight && z >= s.rampBack && z <= s.rampFront) {
    return s.landingHeight * (s.rampRight - x) / (s.rampRight - s.rampLeft);
  }
  return null;
}

/** 碰撞與模型共用。保留凹入門廊，平台及斜坡表面由 heightAt 處理。 */
export function localCollisionBoxes() {
  const s = SWIM;
  return [
    [-13, 13, -7, s.entranceBack],
    [-13, -10.1, s.entranceBack, 7.16],
    [-4.7, 13, s.entranceBack, 7.16],
    ...[-10.0, -4.8].map(x => [x - .21, x + .21, 8.21, 8.63]),
    [-10.2, -10.02, 7.2, s.stairStart],
    [s.rampLeft, s.rampRight, 8.62, 8.80],
  ];
}
