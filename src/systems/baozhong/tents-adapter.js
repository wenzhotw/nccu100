// src/systems/baozhong/tents-adapter.js（P05 v2，Grok，T065）：把 tents.js 接上遊戲（材質、畫布、碰撞、地面高度、場景）。
// 只在瀏覽器用；node 測試直接用 tents.js 並注入替身。
import { scene } from '../../core/engine.js';
import { colliders } from '../../core/collision.js';
import { OUT, canvasTex, toon } from '../../render/kit.js';
import { heightAt } from '../../world/registry.js';
import { buildTents } from './tents.js';

/** 建 40 頂帳篷並加進校園場景；預設關閉（不顯示、沒有碰撞），由 index.js 依 bz26_active 開關。 */
export function createTents(layout, content, booths) {
  const api = buildTents(layout, content.colleges, {
    content, booths, colliders, heightAt: (x, z) => heightAt(x, z),
    deps: { toon, OUT, canvasTex },
  });
  api.group.userData.noOcc = true;
  scene.add(api.group);
  return api;
}
