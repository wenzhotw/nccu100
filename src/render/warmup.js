/**
 * 預熱：停在開始畫面時，先把看得到的材質編譯好、貼圖送進顯示卡。
 * 不然第一次轉頭看到新東西時才編譯、才上傳，手機上會一頓一頓的。
 * 貼圖上傳完，kit.js 的畫布貼圖會自動釋放畫布記憶體。每一幀只送一小批，不會卡住開始畫面。
 */
import { camera, renderer, scene } from '../core/engine.js';

const KEYS = ['map', 'alphaMap', 'emissiveMap', 'normalMap', 'gradientMap'];
let done = false;
function warm() {
  try { renderer.compile(scene, camera); } catch { /* 編譯失敗就照舊等用到再編 */ }
  const seen = new Set(), list = [];
  scene.traverseVisible(o => {
    const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of ms) for (const k of KEYS) { const t = m[k]; if (t && t.isTexture && !t.isRenderTargetTexture && !seen.has(t)) { seen.add(t); list.push(t); } }
  });
  let i = 0;
  const step = () => {
    const end = Math.min(list.length, i + 12);
    for (; i < end; i++) { try { renderer.initTexture(list[i]); } catch { /* 單張失敗不影響其他 */ } }
    if (i < list.length) requestAnimationFrame(step); else done = true;
  };
  requestAnimationFrame(step);
}
setTimeout(warm, 300);
export const warmupDone = () => done;
