/**
 * 手機省電：場景蓋完、烘焙之後，把很小的東西（外接球半徑小於 0.6 公尺）設成不投影。
 * 這些小東西的影子在手機的陰影解析度下本來就幾乎看不到，卻每一個都要多畫一次（陰影那一輪）。
 * 只在觸控裝置執行；電腦版畫面完全不變。合併過的大網格、工具箱的批次（InstancedMesh）、userData.noOcc 底下會動的東西（玩家、NPC）不動；想保留影子的設 userData.keepShadow。
 */
import * as THREE from 'three';
import { MOBILE, scene } from '../core/engine.js';

const s = new THREE.Vector3();
let turnedOff = 0;
function trim() {
  scene.updateMatrixWorld(true);
  const walk = o => {
    if (o.userData.noOcc || o.userData.keepShadow) return;   // 會動的東西（玩家、NPC、車……）整棵跳過，影子照舊
    if (o.isMesh && o.castShadow && !o.isInstancedMesh && o.geometry) {
      const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      o.getWorldScale(s);
      if (g.boundingSphere.radius * Math.max(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z)) < 0.6) { o.castShadow = false; turnedOff++; }
    }
    o.children.forEach(walk);
  };
  walk(scene);
}
if (MOBILE) {
  // 所有模組載入完（各系統的擺設也蓋好）再做一次；按下開始後幾秒再補一次（晚一點才出現的擺設）
  setTimeout(trim, 0);
  document.getElementById('go')?.addEventListener('click', () => setTimeout(trim, 3000), { once: true });
}
export const mobileShadowStats = () => ({ mobile: MOBILE, turnedOff });
