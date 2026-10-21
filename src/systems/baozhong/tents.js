// src/systems/baozhong/tents.js（P05 v2，Grok，T065）：40 頂真實帳篷。
// 規格：Claude工作區 A32 四 (a) 快速帳（四角錐頂、垂邊、紅白藍或紅白間隔）、(b) 淡藍官方招牌、
// (c) 系上主招牌自動移位（在 decor-ctx.js）、(d) 桌板加學院色桌巾、正面 3 張手繪海報。座標沿用 A25（layout.json）。
// 遊戲相依（toon、OUT、canvasTex、碰撞清單、地面高度）由 tents-adapter.js 注入，所以 node 也能建模測試。
import * as THREE from 'three';
import { TENT, boothInfo, clothColor, collidersOf, drawOfficialSign, drawPoster, faceColors, signVisibility, recoverTentOverlap } from './tents-logic.js';

let WALL = null, ROOF = null, VAL = null, POLE = null, BOARD = null, DRAPE_F = null, DRAPE_S = null, POSTER = null, SIGN = null, BACK = null;
function shared() {
  if (ROOF) return;
  const h = TENT.half, b = TENT.roofBase, t = TENT.roofTop;
  ROOF = new THREE.BufferGeometry();   // 前面（+z）一片三角形，其他三面轉 90 度共用
  ROOF.setAttribute('position', new THREE.Float32BufferAttribute([-h, b, h, h, b, h, 0, t, 0], 3));
  ROOF.computeVertexNormals(); ROOF.computeBoundingBox();
  VAL = new THREE.BoxGeometry(2 * h, TENT.valanceTop - TENT.valanceBottom, TENT.valanceT);
  WALL = new THREE.BoxGeometry(2 * h, TENT.valanceBottom, TENT.wallT);
  POLE = new THREE.CylinderGeometry(TENT.poleR, TENT.poleR, 2.2, 8);
  const T = TENT.table, w = T.x1 - T.x0, d = T.z1 - T.z0;
  BOARD = new THREE.BoxGeometry(w, T.board, d);
  DRAPE_F = new THREE.BoxGeometry(w, T.h - 0.07, 0.01);
  DRAPE_S = new THREE.BoxGeometry(0.01, T.h - 0.07, d);
  POSTER = new THREE.PlaneGeometry(TENT.posters.w, TENT.posters.h);
  SIGN = new THREE.PlaneGeometry(TENT.official.w, TENT.official.h);
  BACK = new THREE.BoxGeometry(TENT.official.w + 0.02, TENT.official.h + 0.02, 0.012);
}

const asList = (b) => Array.isArray(b) ? b : (b && Array.isArray(b.booths) ? b.booths : []);

/**
 * buildTents(layout, colleges, opts) → { group, tents, setActive(on), update(playerPos), refreshSigns(id), isActive() }
 * layout：layout.json；colleges：baozhong.json 的 colleges（取學院色）；
 * opts：{ content（baozhong.json）, booths（baozhong-booths.json，可缺）, deps:{ toon, OUT, canvasTex }, colliders（遊戲碰撞清單）, heightAt(x,z) }
 */
export function buildTents(layout, colleges, opts = {}) {
  shared();
  const { content = {}, deps = {}, colliders = null, heightAt = null } = opts;
  const toon = deps.toon || ((c, e) => new THREE.MeshToonMaterial(Object.assign({ color: c }, e || {})));
  const OUT = deps.OUT || new THREE.MeshBasicMaterial({ color: '#2a2c4a', side: THREE.BackSide });
  const canvasTex = deps.canvasTex || null;
  const booths = new Map(asList(opts.booths).map(b => [b && b.id, b]));
  const depts = new Map((content.booths || []).map(b => [b.id, b]));
  const fns = new Map((content.functions || []).map(f => [f.id, f]));
  const colColor = new Map((colleges || []).map(c => [c.id, c.color]));

  const group = new THREE.Group(); group.name = 'bz26-tents'; group.visible = false;
  const tents = new Map(), mine = [], signState = new Map();
  const outline = (m, t) => { m.geometry.computeBoundingBox(); const s = new THREE.Vector3(); m.geometry.boundingBox.getSize(s);
    const o = new THREE.Mesh(m.geometry, OUT); o.scale.set(1 + 2 * t / Math.max(s.x, 0.01), 1 + 2 * t / Math.max(s.y, 0.01), 1 + 2 * t / Math.max(s.z, 0.01)); m.add(o); return o; };
  const mesh = (g, mat, x, y, z, parent) => { const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.castShadow = false; m.receiveShadow = true; parent.add(m); return m; };

  layout.tents.forEach((t, i) => {
    const dept = depts.get(t.id), info = boothInfo(t.id, booths.get(t.id), dept, fns.get(t.id));
    const collegeColor = dept ? colColor.get(dept.college) : null;
    const g = new THREE.Group(); g.name = `bz26-tent-${t.id}`;
    g.position.set(t.x, heightAt ? (heightAt(t.x, t.z) ?? 0) : 0, t.z); g.rotation.y = t.rotY;
    group.add(g);
    const parts = { canopy: [], counter: [], frame: [], signs: [], walls: [] };
    // (a) 柱子、頂棚、垂邊
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = mesh(POLE, toon('#cfd8dc'), sx * TENT.pole, 1.1, sz * TENT.pole, g); outline(p, 0.012); parts.frame.push(p); }
    const colors = faceColors(t.id, info.tent, i);
    const roofMat = c => toon(c, { side: THREE.DoubleSide });
    colors.forEach((c, k) => {
      const th = k * Math.PI / 2;
      const r = mesh(ROOF, roofMat(c), 0, 0, 0, g); r.rotation.y = th; parts.canopy.push(r);
      const d = TENT.half - TENT.valanceT / 2;
      const v = mesh(VAL, toon(c), Math.sin(th) * d, (TENT.valanceBottom + TENT.valanceTop) / 2, Math.cos(th) * d, g); v.rotation.y = th; parts.canopy.push(v);
      v.userData.bz26Valance = true;
      if (k > 0) {   // GPT-038：三面布幕（右、後、左），正面開放；貼在 ±1.45 外側，不碰 40 檔佈景的可用空間
        const wd = TENT.half + TENT.wallT / 2;
        const w = mesh(WALL, toon(c), Math.sin(th) * wd, TENT.valanceBottom / 2, Math.cos(th) * wd, g); w.rotation.y = th; w.userData.bz26Wall = true; parts.walls.push(w);
      }
    });
    // (d) 桌板、桌巾、海報
    const T = TENT.table, cx = (T.x0 + T.x1) / 2, cz = (T.z0 + T.z1) / 2, cloth = toon(clothColor(t.id, collegeColor));
    const top = mesh(BOARD, cloth, cx, T.h - T.board / 2, cz, g); outline(top, 0.012); parts.counter.push(top);
    const dh = T.h - 0.07;
    parts.counter.push(mesh(DRAPE_F, cloth, cx, T.h - 0.03 - dh / 2, T.z1 - 0.005, g));
    for (const sx of [T.x0 + 0.005, T.x1 - 0.005]) parts.counter.push(mesh(DRAPE_S, cloth, sx, T.h - 0.03 - dh / 2, cz, g));
    const lazy = [];
    TENT.posters.xs.forEach((x, k) => {
      const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
      const p = mesh(POSTER, mat, x, TENT.posters.y, TENT.posters.z, g); p.userData.bz26Sign = true; p.userData.bz26Poster = k;
      parts.counter.push(p); parts.signs.push(p);
      lazy.push(() => canvasTex && canvasTex(256, 293, (c, w, h) => drawPoster(c, w, h, info.posters[k], t.id, k)));
    });
    // (b) 官方招牌：背板加畫布
    const O = TENT.official;
    const back = mesh(BACK, toon('#1565c0'), O.x, O.y, O.z - 0.008, g); parts.frame.push(back);
    const smat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    const sign = mesh(SIGN, smat, O.x, O.y, O.z, g); sign.userData.bz26Sign = true; sign.userData.bz26Official = true; parts.signs.push(sign);
    lazy.push(() => canvasTex && canvasTex(1024, 269, (c, w, h) => drawOfficialSign(c, w, h, info)));
    const mats = [...parts.signs.map(s => s.material)];
    let textured = false;
    const ensureTex = () => { if (textured || !canvasTex) return; textured = true; lazy.forEach((f, k) => { const tex = f(); if (tex) { mats[k].map = tex; mats[k].needsUpdate = true; } }); };
    if (colliders) mine.push(...collidersOf(t, g.position.y));
    tents.set(t.id, { id: t.id, group: g, parts, info, collegeColor: collegeColor || clothColor(t.id, null), colors, ensureTex, layout: t });
  });

  function applySigns(id) {
    const T = tents.get(id); if (!T) return;
    const near = !!signState.get(id);
    if (near) T.ensureTex();
    T.group.traverse(n => { if (n.isMesh && n.userData.bz26Sign) n.visible = near && !n.userData.bz26Hidden; });
  }
  let active = false, lastRecoveryKey = null, lastRecovery = { status: 'inactive' };
  return {
    group, tents,
    isActive: () => active,
    /** 會場開關：模型顯示與碰撞一起放回或拿掉（用物件比對，不靠索引）。 */
    setActive(on) {
      if (active !== !!on) lastRecoveryKey = null;
      active = !!on; group.visible = active;
      if (colliders) for (const c of mine) { const k = colliders.indexOf(c); if (active && k < 0) colliders.push(c); else if (!active && k >= 0) colliders.splice(k, 1); }
      if (!active) signState.clear();
      return active;
    },
    /** 每幀：35 公尺外文字牌（官方招牌、海報、佈景 sign）不畫；第一次靠近才畫貼圖。 */
    update(p, motion = null, groundAt = heightAt) {
      if (!active || !p) return;
      let recoveredNow = false;
      if (motion && motion.grounded && !motion.room && !motion.driving && !motion.swimming) {
        const key = `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`;
        if (key !== lastRecoveryKey) {
          lastRecovery = recoverTentOverlap(p, mine, colliders || mine, groundAt);
          lastRecoveryKey = key;
          if (lastRecovery.status === 'recovered') { p.x = lastRecovery.position.x; p.z = lastRecovery.position.z; recoveredNow = true; }
          else if (lastRecovery.status === 'blocked') console.warn('[bz26] Tent recovery blocked:', lastRecovery.reason);
        }
      } else { lastRecoveryKey = null; lastRecovery = {status: 'not-grounded'}; }
      for (const id of signVisibility(layout.tents, p.x, p.z, signState)) applySigns(id);
      return lastRecovery.status === 'recovered' && !recoveredNow ? {status: 'unchanged'} : lastRecovery;
    },
    /** 佈景掛上後呼叫，讓新加的 sign 套用目前遠近狀態。 */
    refreshSigns(id) { if (signState.has(id)) applySigns(id); },
    colliders: mine,
  };
}
