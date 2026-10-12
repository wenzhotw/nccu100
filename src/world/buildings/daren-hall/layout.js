/**
 * 大仁樓的共同尺寸與階梯高度。建模、碰撞和測試共用，避免外觀與可走範圍脫節。
 * 公尺尺寸依預定地及照片比例估計，並非實測圖面。
 */
export const DAREN = Object.freeze({
  x: 150, z: -13, width: 26, depth: 7, height: 13.9,
  stairWidth: 5.8, stairStart: 10.25, stairEnd: 4.75,
  stairCount: 9, landingHeight: 3.1, landingBack: 2.68,
});

export function localHeightAt(x, z) {
  if (Math.abs(x) > DAREN.stairWidth / 2) return null;
  if (z >= DAREN.landingBack && z <= DAREN.stairEnd) return DAREN.landingHeight;
  if (z > DAREN.stairEnd && z <= DAREN.stairStart) {
    const depth = (DAREN.stairStart - DAREN.stairEnd) / DAREN.stairCount;
    const step = Math.min(DAREN.stairCount, Math.floor((DAREN.stairStart - z) / depth) + 1);
    return step * DAREN.landingHeight / DAREN.stairCount;
  }
  return null;
}
