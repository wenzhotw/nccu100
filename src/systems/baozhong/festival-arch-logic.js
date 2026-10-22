// src/systems/baozhong/festival-arch-logic.js（T075，Grok）：四維堂前氣球拱門與邀請人泡泡的純邏輯（不 import 遊戲模組，可在 Node 測）。
// 位置一律由呼叫端傳入既有的單一來源：CAMPUS_GUIDE.hallFront／avenue（world/campus-guide-layout.js）、
// 四維道中心線 swZ（world/layout.js）、四維堂入口 interior.entrance（world/buildings/siwei-hall/index.js）。

/** 邀請人頭上的泡泡（Wenzel 指定原文，一字不改）。 */
export const INVITE_BUBBLE = '你想要來包種茶節嗎？我帶你去吧。';
/** 只在會場還沒開時邀請；答應（bz26_active）後收掉。 */
export const inviteBubbleText = flags => (flags && flags.has('bz26_active') ? null : INVITE_BUBBLE);
/**
 * 套到邀請人 NPC：沿用 actors/npc.js 的 n.bubble（有字就在 40 公尺內、沒開對話時一直顯示；NPC 本身不畫時泡泡跟著不畫）。
 * 收掉時順手清空目前畫面上的字。回傳是否有變動。
 */
export function applyInviteBubble(host, flags) {
  if (!host) return false;
  const text = inviteBubbleText(flags);
  if (host.bubble === text) return false;
  host.bubble = text;
  if (!text) host.sp.say('');
  return true;
}

/** 拱門尺寸（公尺）。PILLAR_R 是柱子碰撞半徑，柱子外觀最寬處約 0.7。 */
export const ARCH = Object.freeze({ PILLAR_R: 0.62, PILLAR_TOP: 4.45, SPRING_Y: 3.65, RISE: 1.25, TUBE_R: 0.52 });
// 四維道路面半寬：world/zones.js 的「四維道」區域判斷用 |z - swZ(x)| < 5.2；拱門放在路面南緣再退 0.6 公尺（四維堂那一側）。
export const SIWEI_HALF = 5.2;
const ROAD_MARGIN = 0.6, SIDE_CLEAR = 0.1;

/**
 * 拱門中心與兩根柱子：x 對齊四維堂正面中線，跨距 = 校園大道寬 + 兩側柱子；
 * z 落在四維道南緣與四維堂入口互動圈之間，面向大道（+z，玩家從噴水池走過來的方向）。
 */
export function archPlacement({ hallFront, avenue, swZ, entrance }) {
  const x = hallFront.x;
  const z = +(swZ(x) - SIWEI_HALF - ROAD_MARGIN).toFixed(3);
  const half = avenue.width / 2 + ARCH.PILLAR_R + SIDE_CLEAR;
  const doorEdge = entrance.z + entrance.r;   // 入口互動圈最靠大道的一點
  if (!(z > doorEdge + 2)) throw new Error(`拱門太靠近四維堂入口（z=${z}，入口圈到 ${doorEdge}）`);
  if (!(z < swZ(x) - SIWEI_HALF)) throw new Error('拱門柱子不能站在四維道路面上');
  const pillars = [-1, 1].map(s => ({ side: s < 0 ? 'left' : 'right', x: +(x + s * half).toFixed(3), z, r: ARCH.PILLAR_R }));
  return { x, z, rotY: 0, half, pillars, passage: { x0: x - half + ARCH.PILLAR_R, x1: x + half - ARCH.PILLAR_R, z0: z - 0.8, z1: z + 0.8 },
    source: { hallFront, avenueWidth: avenue.width, roadCenterZ: swZ(x), entrance } };
}
/** 只有柱子有碰撞（圓形，同 core/collision.js 的 circC 格式）；拱頂與橫幅不擋人。 */
export const pillarColliders = p => p.pillars.map(q => ({ c: true, x: q.x, z: q.z, r: q.r, owner: 'bz26-arch' }));

const MARGIN = 0.45;   // 同 activity-sign-logic 的留白
function circleHits(cx, cz, r, c) {
  if (c.c) return Math.hypot(cx - c.x, cz - c.z) < r + c.r + MARGIN;
  let b = c;
  if (c.obb) { const hx = Math.abs(c.hx * c.cs) + Math.abs(c.hz * c.sn), hz = Math.abs(c.hx * c.sn) + Math.abs(c.hz * c.cs); b = { x0: c.cx - hx, x1: c.cx + hx, z0: c.cz - hz, z1: c.cz + hz }; }
  const nx = Math.max(b.x0, Math.min(cx, b.x1)), nz = Math.max(b.z0, Math.min(cz, b.z1));
  return Math.hypot(cx - nx, cz - nz) < r + MARGIN;
}
function rectHits(R, c) {
  if (c.c) { const nx = Math.max(R.x0, Math.min(c.x, R.x1)), nz = Math.max(R.z0, Math.min(c.z, R.z1)); return Math.hypot(c.x - nx, c.z - nz) < c.r; }
  let b = c;
  if (c.obb) { const hx = Math.abs(c.hx * c.cs) + Math.abs(c.hz * c.sn), hz = Math.abs(c.hx * c.sn) + Math.abs(c.hz * c.cs); b = { x0: c.cx - hx, x1: c.cx + hx, z0: c.cz - hz, z1: c.cz + hz }; }
  return R.x0 < b.x1 && R.x1 > b.x0 && R.z0 < b.z1 && R.z1 > b.z0;
}
/**
 * 檢查柱子與通道：柱子不壓到任何碰撞體、帳篷、看板或互動點（NPC 站位）；柱間通道沒有碰撞體擋路。
 * 回傳衝突清單，空陣列代表 OK。tents 是 layout.json 的 tents（box: [x0,x1,z0,z1,h]）。
 */
export function placementConflicts(p, { colliders = [], spots = [], tents = [], extra = [] } = {}) {
  const out = [];
  const solids = [...colliders.filter(c => c.owner !== 'bz26-arch'),
    ...tents.map(t => ({ x0: t.box[0], x1: t.box[1], z0: t.box[2], z1: t.box[3], id: t.id })), ...extra];
  for (const q of p.pillars) {
    for (const c of solids) if (circleHits(q.x, q.z, q.r, c)) out.push({ kind: 'pillar-collider', side: q.side, with: c });
    for (const s of spots) if (Math.hypot(q.x - s.x, q.z - s.z) < q.r + (s.r || 0)) out.push({ kind: 'pillar-spot', side: q.side, with: { label: s.label, x: s.x, z: s.z, r: s.r } });
  }
  for (const c of solids) if (rectHits(p.passage, c)) out.push({ kind: 'passage-blocked', with: c });
  return out;
}

/**
 * 拱門生命週期：會場開→建一次、掛上場景、加柱子碰撞；會場收→藏起並移除碰撞；重複開關不重複建立。
 * build() 回傳 { group, dispose }；scene 只需 add/remove。
 */
export function createArchPresence({ build, scene, colliders, placement, groundY = 0 }) {
  let built = null, active = false, builds = 0;
  const boxes = pillarColliders(placement);
  function setActive(on) {
    on = !!on;
    if (on && !built) {
      built = build(); builds++;
      built.group.name = 'bz26-balloon-arch';
      built.group.position.set(placement.x, groundY, placement.z); built.group.rotation.y = placement.rotY;
      scene.add(built.group);
    }
    if (built) built.group.visible = on;
    for (const b of boxes) { const i = colliders.indexOf(b); if (on && i < 0) colliders.push(b); else if (!on && i >= 0) colliders.splice(i, 1); }
    active = on; return active;
  }
  return {
    setActive, colliders: boxes,
    get active() { return active; }, get group() { return built?.group || null; }, get builds() { return builds; },
    dispose() { setActive(false); if (built) { scene.remove(built.group); built.dispose(); built = null; } },
  };
}
