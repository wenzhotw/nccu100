// src/systems/baozhong/decor-ctx.js v2（v1 Claude，T059／T060；v2 Grok，T065 規格 (c)）：攤位佈景的正式 ctx。
// v2 只改一處：ctx.sign 放在 (0, 3.25, 0) 的主招牌，自動移到 (0, 2.22, 1.50)（官方招牌上方、頂棚正面前），40 檔不用改。
// 要舊行為（例如和 B47 測試替身逐項比對）時，deps 傳 relocateMainSign: false。
// 純函式，依賴由呼叫端注入（正式版見 decor-loader.js，用 kit.js 的 toon 與 OUT），方便在 node 測試。
// 語意與 GPT「攤位佈景」B47 baozhong-decor.test.mjs 的測試替身一致：
// box 一段、cyl／cone 預設 8 段、sphere 為 IcosahedronGeometry(r,1)、torus 為 (6,16,arc)、sign 為 PlaneGeometry(w,h)。
// 形狀依參數共用（全場 40 頂共用同一份）、材質依色碼共用；佈景程式不得改共用材質。

import { relocateSign } from './tents-logic.js';

const GEO = new Map();
const SIGN = new Map();
const AR = /[֐-ࣿ]/;  // 希伯來、阿拉伯字母：右到左

function geo(THREE, key, make) {
  let g = GEO.get(key);
  if (!g) { g = make(); g.computeBoundingBox(); GEO.set(key, g); }
  return g;
}
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

export function createDecorCtx(deps, group, collegeColor) {
  const { THREE, toon, outlineMat, makeSignTexture } = deps;
  const mat = (c) => toon(String(c));
  const tmp = new THREE.Vector3();

  function place(g, color, x, y, z, o, minSize) {
    const m = new THREE.Mesh(g, mat(color));
    m.position.set(x, y, z);
    m.rotation.set(num(o.rx, 0), num(o.ry, 0), num(o.rz, 0));
    m.castShadow = false; m.receiveShadow = true;
    const out = o.out === true ? 0.03 : num(o.out, 0);
    if (out > 0) {
      g.boundingBox.getSize(tmp);
      const b = new THREE.Mesh(g, outlineMat);
      b.scale.set(1 + 2 * out / Math.max(tmp.x, minSize), 1 + 2 * out / Math.max(tmp.y, minSize), 1 + 2 * out / Math.max(tmp.z, minSize));
      b.castShadow = false; b.receiveShadow = false;
      m.add(b);
    }
    group.add(m);
    return m;
  }

  const ctx = {
    THREE, group, color: collegeColor, mat,
    box(sx, sy, sz, color, x, y, z, o = {}) {
      return place(geo(THREE, `b${sx},${sy},${sz}`, () => new THREE.BoxGeometry(sx, sy, sz)), color, x, y, z, o, 0);
    },
    cyl(rTop, rBot, h, color, x, y, z, o = {}) {
      const s = o.seg ?? 8;
      return place(geo(THREE, `c${rTop},${rBot},${h},${s}`, () => new THREE.CylinderGeometry(rTop, rBot, h, s)), color, x, y, z, o, 0.01);
    },
    cone(r, h, color, x, y, z, o = {}) {
      const s = o.seg ?? 8;
      return place(geo(THREE, `n${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s)), color, x, y, z, { ry: o.ry, out: o.out }, 0.01);
    },
    sphere(r, color, x, y, z, o = {}) {
      return place(geo(THREE, `s${r}`, () => new THREE.IcosahedronGeometry(r, 1)), color, x, y, z, { out: o.out }, 0.01);
    },
    torus(r, tube, color, x, y, z, o = {}) {
      const arc = o.arc ?? Math.PI * 2;
      return place(geo(THREE, `t${r},${tube},${arc}`, () => new THREE.TorusGeometry(r, tube, 6, 16, arc)), color, x, y, z, { rx: o.rx, ry: o.ry }, 0.01);
    },
    sign(text, o = {}) {
      const w = o.w ?? 1, h = o.h ?? 0.4, bg = o.bg ?? '#ffffff', fg = o.fg ?? '#000000';
      const key = `${text}|${w}|${h}|${bg}|${fg}`;
      let m = SIGN.get(key);
      if (!m) {
        m = new THREE.MeshBasicMaterial({ map: makeSignTexture(String(text), w, h, bg, fg), toneMapped: false });
        SIGN.set(key, m);
      }
      const mesh = new THREE.Mesh(geo(THREE, `p${w},${h}`, () => new THREE.PlaneGeometry(w, h)), m);
      const at = deps.relocateMainSign === false
        ? { x: num(o.x, 0), y: num(o.y, 0), z: num(o.z, 0), ry: num(o.ry, 0), moved: false }
        : relocateSign(o);
      mesh.position.set(at.x, at.y, at.z);
      mesh.rotation.y = at.ry;
      mesh.userData.bz26Sign = true;
      if (at.moved) mesh.userData.bz26MainSign = true;
      group.add(mesh);
      return mesh;
    },
  };
  return Object.freeze(ctx);
}

// 文字牌貼圖：底色圓角、字自動縮到放得下；阿拉伯文設右到左。
export function drawSign(g, cw, ch, text, bg, fg) {
  const r = Math.min(cw, ch) * 0.18;
  g.fillStyle = bg;
  g.beginPath();
  g.moveTo(r, 0); g.lineTo(cw - r, 0); g.quadraticCurveTo(cw, 0, cw, r); g.lineTo(cw, ch - r);
  g.quadraticCurveTo(cw, ch, cw - r, ch); g.lineTo(r, ch); g.quadraticCurveTo(0, ch, 0, ch - r);
  g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.closePath(); g.fill();
  g.lineWidth = Math.max(4, ch * 0.06); g.strokeStyle = '#2a2c4a'; g.stroke();
  let px = Math.floor(ch * 0.62);
  const font = (p) => `900 ${p}px "Noto Sans TC","PingFang TC","Microsoft JhengHei","Noto Sans Arabic","Geeza Pro",sans-serif`;
  g.font = font(px);
  while (px > 10 && g.measureText(text).width > cw * 0.88) { px -= 2; g.font = font(px); }
  g.direction = AR.test(text) ? 'rtl' : 'ltr';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg;
  g.fillText(text, cw / 2, ch / 2 + px * 0.04);
}

export function _resetDecorCaches() { GEO.clear(); SIGN.clear(); }
export const _caches = { GEO, SIGN };
