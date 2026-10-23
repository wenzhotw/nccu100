/**
 * 角色快照：用遊戲真正的角色程式（player.js、npc.js、包種茶節服裝、友校 T 恤）把每個角色建出來，
 * 再把每個零件的形狀、大小、位置、顏色、貼圖內容寫成純資料。
 * 換底層之後重建一次，資料一樣就代表外觀一樣。
 *
 * 必須用 `node --import ./tests/characters/register.mjs` 載入（見 snapshot.test.mjs）。
 */
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { NPCS, addNPC } from '../../src/actors/npc.js';
import { player, setOutfit, becomeEagle } from '../../src/actors/player.js';
import { toon, OUT, canvasTex } from '../../src/render/kit.js';
import { costumeLook } from '../../src/systems/baozhong/npc-costume-profiles.js';
import { mountNpcCostume } from '../../src/systems/baozhong/npc-costumes.js';
import { mountCollegeTee } from '../../src/systems/baozhong/college-tee.js';
import { DJ_SPOTS } from '../../src/systems/baozhong/radio-logic.js';
import npcsJson from '../../src/content/npcs.json';
import bz from '../../src/content/baozhong.json';
import programs from '../../src/content/baozhong-programs.json';
import missionaries from '../../src/content/missionaries.json';
import oldPrincipal from '../../src/content/old-principal.json';
import fountain from '../../src/content/fountain-swim.json';

const r4 = v => Math.round(v * 1e4) / 1e4 || 0;
const vec = v => [r4(v.x), r4(v.y), r4(v.z)];
const hash = obj => createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 12);

function geometryOf(geo) {
  if (geo.parameters) {
    const p = {};
    for (const [k, v] of Object.entries(geo.parameters)) p[k] = typeof v === 'number' ? r4(v) : v;
    // 有額外平移、旋轉過的共用幾何（例如頭髮尖刺）參數相同但頂點不同，所以也記頂點雜湊
    return { type: geo.type, ...p, verts: vertsHash(geo) };
  }
  return { type: geo.type, verts: vertsHash(geo) };
}
const vertCache = new WeakMap();
function vertsHash(geo) {
  if (!vertCache.has(geo)) {
    const a = geo.attributes.position?.array || [];
    vertCache.set(geo, hash(Array.from(a, r4)));
  }
  return vertCache.get(geo);
}
function textureOf(tex) {
  if (!tex) return null;
  return tex.image?.__hash ? `canvas:${tex.image.__hash}` : `${tex.type}:${tex.image?.width || 0}x${tex.image?.height || 0}`;
}
function materialOf(mat) {
  if (Array.isArray(mat)) return mat.map(materialOf);
  const m = { type: mat.type };
  if (mat.color) m.color = `#${mat.color.getHexString()}`;
  if (mat === OUT) m.outline = true;
  if (mat.side !== THREE.FrontSide) m.side = mat.side;
  if (mat.transparent) { m.transparent = true; m.opacity = r4(mat.opacity); }
  if (mat.map) m.map = textureOf(mat.map);
  if (mat.depthTest === false) m.depthTest = false;
  return m;
}

/** 把一個角色的整棵物件樹攤平成零件清單；路徑用索引表示，不依賴名字 */
export function serialize(root) {
  const parts = [];
  (function walk(o, path) {
    const node = { path, kind: o.type };
    if (o.name) node.name = o.name;
    node.pos = vec(o.position); node.rot = vec(o.rotation); node.scale = vec(o.scale);
    if (!o.visible) node.hidden = true;
    if (o.isMesh || o.isSprite) { node.geo = o.isMesh ? geometryOf(o.geometry) : 'sprite'; node.mat = materialOf(o.material); }
    if (o.renderOrder) node.renderOrder = o.renderOrder;
    parts.push(node);
    o.children.forEach((c, i) => walk(c, `${path}/${i}`));
  })(root, '0');
  return parts;
}

/** 摘要：給表單用，人和 AI 一眼看得懂 */
export function summarize(parts) {
  const meshes = parts.filter(p => p.geo && p.geo !== 'sprite');
  const visible = meshes.filter(p => !p.hidden);
  const colors = new Set(visible.flatMap(p => [].concat(p.mat).filter(m => m && m.color && !m.outline).map(m => m.color)));
  return { meshes: meshes.length, visibleMeshes: visible.length, outlines: visible.filter(p => [].concat(p.mat).some(m => m.outline)).length, colors: colors.size };
}

const byId = new Map(NPCS.map(n => [n.id, n]));
const out = [];
const add = (id, root) => { const parts = serialize(root); out.push({ id, fingerprint: hash(parts), ...summarize(parts), parts }); };

/* 1. 主角：一般、泳裝、雄鷹（雄鷹不可逆，所以最後做） */
add('player', player);
setOutfit('swim'); add('player#swim', player); setOutfit('normal');
becomeEagle(); add('player#eagle', player);

/* 2. 校園常駐 NPC 與路人（npc.js 載入時就建好了） */
for (const n of npcsJson.npcs) add(n.id, byId.get(n.id).g);
NPCS.filter(n => !n.id && n.title === npcsJson.students.title).forEach((n, i) => add(`students-${i}`, n.g));

/* 3. 包種茶節：系攤位、學院關主（都會套活動服裝）、工作人員 */
const venue = (id, look) => { const n = addNPC({ id, home: { x: 0, z: 0 }, look: costumeLook(id, look), dialog: [{ lines: ['……'] }] }); mountNpcCostume(n, { toon, OUT, canvasTex, groundH: () => 0 }); return n; };
for (const b of bz.booths) add(`bz26-${b.id}`, venue(`bz26-${b.id}`, b.npc.look).g);
for (const c of bz.colleges) add(`bz26-${c.id}`, venue(`bz26-${c.id}`, c.master.look).g);
add('bz26-host', addNPC({ id: 'bz26-host', home: { x: 0, z: 0 }, look: bz.host.look, dialog: [{ lines: ['……'] }] }).g);
add('bz26-F01', venue('bz26-F01', bz.service.look).g);
for (const f of bz.functions) add(`bz26-${f.id}`, venue(`bz26-${f.id}`, f.look).g);

/* 4. 政大之聲、學程帳篷、友校交流 */
for (const d of DJ_SPOTS) add(d.id, addNPC({ id: d.id, home: { x: 0, z: 0 }, look: d.look, dialog: [{ lines: ['……'] }] }).g);
for (const p of programs.programs) add(`bz26-pg-${p.id}`, addNPC({ id: `bz26-pg-${p.id}`, home: { x: 0, z: 0 }, look: p.npc.look, dialog: [{ lines: ['……'] }] }).g);
for (const s of programs.partners.schools) {
  const look = s.tee ? { ...s.npc.look, top: s.tee.color } : s.npc.look;
  const n = addNPC({ id: `bz26-pt-${s.id}`, home: { x: 0, z: 0 }, look, dialog: [{ lines: ['……'] }] });
  if (s.tee) mountCollegeTee(n, s.tee, { toon, canvasTex });
  add(`bz26-pt-${s.id}`, n.g);
}

/* 5. 特殊事件角色（只建人；老校長的馬是另一個模型，不在角色系統範圍內） */
for (const p of missionaries.pair) add(p.id, addNPC({ ...p, home: { x: 0, z: 0 }, dialog: [{ lines: ['……'] }] }).g);
add('old-principal', addNPC({ id: 'old-principal', home: { x: 0, z: 0 }, look: oldPrincipal.look, dialog: [{ lines: ['……'] }] }).g);
(fountain.crowd.people || []).forEach((look, i) => add(`fountain-crowd-${i}`, addNPC({ id: `fountain-crowd-${i}`, home: { x: 0, z: 0 }, look: { ...look, scale: 1.1 }, dialog: [{ lines: ['……'] }] }).g));

export const CHARACTERS = out;
