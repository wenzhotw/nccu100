// 玩家從帳篷正面（本地 +z）看攤位時，左側是本地 −x。
// 前移至 2.4 公尺，讓 D26 鳥居柱與服裝留有空隙，桌面中央也不再被人擋住。
export const DEPARTMENT_NPC_POSITION = Object.freeze({ x: -1.05, z: 2.4 });

export function departmentNpcHome(tent) {
  const { x, z } = DEPARTMENT_NPC_POSITION;
  const cs = Math.cos(tent.rotY), sn = Math.sin(tent.rotY);
  return { x: tent.x + x * cs + z * sn, z: tent.z - x * sn + z * cs };
}
