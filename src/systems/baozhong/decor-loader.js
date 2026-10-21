// src/systems/baozhong/decor-loader.js v2（v1 Claude；v2 依 T064 描述由 Grok 重建，T065）：載入各系佈景檔並掛到帳篷上。
// 佈景檔放 ./decor/D01.js…（一系一檔，export default function build(ctx)）；Vite 依需要分批載入。核心在 decor-loader-core.js。
import * as THREE from 'three';
import { toon, OUT, canvasTex } from '../../render/kit.js';
import { createDecorCtx, drawSign } from './decor-ctx.js';
import { createDecorLoader } from './decor-loader-core.js';

const files = import.meta.glob('./decor/*.js');

function makeSignTexture(text, w, h, bg, fg) {
  const cw = 512, ch = Math.max(64, Math.round(512 * h / w));
  return canvasTex(cw, ch, (g) => drawSign(g, cw, ch, text, bg, fg));
}
const deps = { THREE, toon, outlineMat: OUT, makeSignTexture };

const L = createDecorLoader({
  THREE, files,
  createCtx: (root, color) => createDecorCtx(deps, root, color),
  warn: (...a) => console.warn(...a),
});

export const mountDecor = L.mountDecor;
export const updateDecor = L.updateDecor;
export const unmountDecor = L.unmountDecor;
export const unmountAllDecor = L.unmountAllDecor;
export const _live = L.live;
