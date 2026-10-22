// T075（Grok）：邀請人泡泡＋四維堂前氣球拱門。純邏輯與模型在 Node 測；實際碰撞清單另由 scripts/bz26-arch-shots.mjs 在瀏覽器檢查。
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as THREE from 'three';
import { CAMPUS_GUIDE } from '../src/world/campus-guide-layout.js';
import { swZ } from '../src/world/layout.js';
import { signPlacement } from '../src/systems/baozhong/activity-sign-logic.js';
import { INVITE_BUBBLE, inviteBubbleText, applyInviteBubble, archPlacement, pillarColliders, placementConflicts, createArchPresence, ARCH } from '../src/systems/baozhong/festival-arch-logic.js';
import { buildBalloonArch, countTriangles, BANNER_TEXT, MODEL_BUDGET } from '../src/systems/baozhong/balloon-arch.js';

const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const LAYOUT = JSON.parse(read('src/systems/baozhong/layout.json'));
// 四維堂入口：直接讀 siwei-hall/index.js 這唯一來源（Node 不能 import 它，因為會帶進 three 場景與 DOM）。
const entrance = (() => { const m = read('src/world/buildings/siwei-hall/index.js').match(/entrance:\s*\{\s*x:\s*(-?[\d.]+),\s*z:\s*(-?[\d.]+),\s*r:\s*([\d.]+)/); return { x: +m[1], z: +m[2], r: +m[3] }; })();
const P = archPlacement({ hallFront: CAMPUS_GUIDE.hallFront, avenue: CAMPUS_GUIDE.avenue, swZ, entrance });

test('邀請人泡泡：未參加時顯示指定原文，答應後收掉，離場後再出現', () => {
  assert.equal(INVITE_BUBBLE, '你想要來包種茶節嗎？我帶你去吧。');
  assert.equal(inviteBubbleText(new Set()), INVITE_BUBBLE);
  assert.equal(inviteBubbleText(new Set(['achv_bz26_explorer'])), INVITE_BUBBLE);
  assert.equal(inviteBubbleText(new Set(['bz26_active'])), null);
  const said = [], host = { bubble: undefined, sp: { say: t => said.push(t) } };
  assert.equal(applyInviteBubble(host, new Set()), true); assert.equal(host.bubble, INVITE_BUBBLE);
  assert.equal(applyInviteBubble(host, new Set()), false);
  assert.equal(applyInviteBubble(host, new Set(['bz26_active'])), true); assert.equal(host.bubble, null); assert.deepEqual(said, ['']);
  assert.equal(applyInviteBubble(host, new Set()), true); assert.equal(host.bubble, INVITE_BUBBLE);
  assert.equal(applyInviteBubble(null, new Set()), false);
});
test('泡泡沿用 npc.js 既有的 bubble 規則（40 公尺內、對話框關著才畫）；原邀請台詞不變', () => {
  assert.match(read('src/actors/npc.js'), /if\(!panic&&n\.bubble\)\{ n\.sp\.say\(sameSide&&dP<40&&dlg\.hidden\?n\.bubble:''\); \}/);
  const C = JSON.parse(read('src/content/baozhong.json'));
  assert.deepEqual(C.host.invite, ['要不要參加包種茶節？和各系聊聊，集章挑戰學院問答吧！']);
});
test('拱門位置由既有座標推得：四維堂中線、四維道南緣與入口之間、跨過大道並面向大道', () => {
  assert.equal(P.x, CAMPUS_GUIDE.hallFront.x);
  assert.equal(P.rotY, 0);
  assert.ok(P.z < swZ(P.x) - 5.2, '不站在四維道路面');
  assert.ok(P.z > entrance.z + entrance.r + 2, '離入口互動圈至少 2 公尺');
  assert.ok(P.z > CAMPUS_GUIDE.hallFront.z, '在四維堂正面門廳前');
  assert.ok(P.half * 2 - 2 * ARCH.PILLAR_R >= CAMPUS_GUIDE.avenue.width, '柱間淨寬不小於大道寬');
  assert.deepEqual(P.pillars.map(p => p.side), ['left', 'right']);
  assert.ok(P.pillars[0].x < P.x && P.pillars[1].x > P.x);
  assert.deepEqual(pillarColliders(P).map(c => c.c), [true, true]);
  assert.throws(() => archPlacement({ hallFront: CAMPUS_GUIDE.hallFront, avenue: CAMPUS_GUIDE.avenue, swZ: () => -70, entrance }), /入口/);
});
test('拱門不壓到帳篷、看板、四維堂前花台／公告欄／燈柱，也不擋入口與通道', () => {
  // 下列是瀏覽器實測 window.__game.colliders 中拱門附近的四維堂外觀碰撞（siwei-hall/exterior.js）與路燈，只當測試資料。
  const siwei = [
    { x0: -10.5, x1: -7.5, z0: -70.8, z1: -70.2 }, { x0: 7.5, x1: 10.5, z0: -70.8, z1: -70.2 },
    { x0: -13.1, x1: -9.9, z0: -68.55, z1: -67.45 }, { x0: 9.9, x1: 13.1, z0: -68.55, z1: -67.45 },
    { x0: -8.1, x1: -4.9, z0: -68.55, z1: -67.45 }, { x0: 4.9, x1: 8.1, z0: -68.55, z1: -67.45 },
    { x0: -14.2, x1: 14.2, z0: -107, z1: -76, top: 11 },
    { c: true, x: -6.5, z: -73.5, r: 0.18 }, { c: true, x: 6.5, z: -73.5, r: 0.18 }, { c: true, x: -6.8, z: -56, r: 0.18 }, { c: true, x: 6.8, z: -56, r: 0.18 },
  ];
  const sign = signPlacement(CAMPUS_GUIDE.fountain.z, []);
  const spots = [{ label: '進入四維堂', ...entrance }, { label: '邀請人', x: LAYOUT.host.x, z: LAYOUT.host.z, r: 2.4 },
    ...LAYOUT.tents.map(t => ({ label: t.id, x: t.anchor[0], z: t.anchor[1], r: 2.4 }))];
  assert.deepEqual(placementConflicts(P, { colliders: [...siwei, { ...sign.box }], spots, tents: LAYOUT.tents }), []);
  // 自己的柱子碰撞已在清單裡也不算衝突
  assert.deepEqual(placementConflicts(P, { colliders: [...siwei, ...pillarColliders(P)], tents: LAYOUT.tents }), []);
  // 反例：真的有東西時要抓得到
  const q = P.pillars[1];
  assert.equal(placementConflicts(P, { colliders: [{ c: true, x: q.x + 0.5, z: q.z, r: 0.3 }] })[0].kind, 'pillar-collider');
  assert.equal(placementConflicts(P, { colliders: [{ x0: -0.5, x1: 0.5, z0: P.z - 0.2, z1: P.z + 0.2 }] })[0].kind, 'passage-blocked');
  assert.equal(placementConflicts(P, { spots: [{ label: 'npc', x: q.x, z: q.z + 1, r: 2.4 }] })[0].kind, 'pillar-spot');
  assert.equal(placementConflicts(P, { tents: [{ id: 'X', box: [q.x - 1, q.x + 1, q.z - 1, q.z + 1, 2.6] }] })[0].with.id, 'X');
});

function fakeScene() { const children = []; return { children, add: o => { if (!children.includes(o)) children.push(o); }, remove: o => { const i = children.indexOf(o); if (i >= 0) children.splice(i, 1); } }; }
test('生命週期：開場才建立、只建一次；收場藏起並移除柱子碰撞；重開不重複；dispose 全部清掉', () => {
  const scene = fakeScene(), foreign = { c: true, x: 99, z: 99, r: 1 }, colliders = [foreign];
  let builds = 0, disposed = 0;
  const A = createArchPresence({ scene, colliders, placement: P, build: () => { builds++; return { group: new THREE.Group(), dispose: () => disposed++ }; } });
  assert.equal(A.active, false); assert.equal(A.group, null); assert.equal(builds, 0); assert.deepEqual(colliders, [foreign]);
  A.setActive(false); assert.equal(builds, 0);
  for (let round = 0; round < 3; round++) {
    A.setActive(true); A.setActive(true);
    assert.equal(builds, 1); assert.equal(scene.children.length, 1); assert.equal(A.group.visible, true);
    assert.equal(A.group.name, 'bz26-balloon-arch'); assert.deepEqual([A.group.position.x, A.group.position.z], [P.x, P.z]);
    assert.equal(colliders.length, 3); assert.equal(colliders.filter(c => c.owner === 'bz26-arch').length, 2);
    A.setActive(false); A.setActive(false);
    assert.equal(A.group.visible, false); assert.deepEqual(colliders, [foreign]); assert.equal(scene.children.length, 1);
  }
  A.setActive(true); A.dispose();
  assert.equal(A.active, false); assert.equal(A.group, null); assert.equal(scene.children.length, 0); assert.equal(disposed, 1); assert.deepEqual(colliders, [foreign]);
});

function kitStub() {
  const texts = [], mats = new Map();
  const ctx = new Proxy({}, { get: (t, k) => k === 'measureText' ? (s => ({ width: [...s].length * 100 })) : k === 'fillText' ? (s => texts.push(s)) : (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  return { texts, mats,
    toon: (c, extra = {}) => { const key = c + JSON.stringify(extra); if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ color: c, ...extra })); return mats.get(key); },
    OUT: new THREE.MeshBasicMaterial({ side: THREE.BackSide }),
    canvasTex: (w, h, draw) => { draw(ctx, w, h); return new THREE.Texture(); } };
}
test('模型：橫幅字正確、藍鵲在左柱頂、穿山甲在右柱頂、三角形數量有上限、dispose 只放自己的資源', () => {
  const kit = kitStub(), m = buildBalloonArch({ ...kit, placement: P });
  assert.equal(BANNER_TEXT, '2026政治大學數位包種茶節');
  assert.ok(kit.texts.includes(BANNER_TEXT));
  const banners = []; m.group.traverse(o => { if (o.name === 'bz26-arch-banner') banners.push(o); });
  assert.equal(banners.length, 2, '正反兩面');
  assert.ok(banners.every(b => Math.abs(b.position.z) > ARCH.TUBE_R), '橫幅在拱管前後，不被拱管擋住');
  assert.ok(m.magpie.position.x < 0 && m.pangolin.position.x > 0);
  assert.equal(m.magpie.position.x, -P.half); assert.equal(m.pangolin.position.x, P.half);
  assert.equal(m.magpie.position.y, ARCH.PILLAR_TOP); assert.equal(m.pangolin.position.y, ARCH.PILLAR_TOP);
  const colors = root => { const s = new Set(); root.traverse(o => { if (!o.isMesh || o.material === kit.OUT) return; const c=o.geometry.attributes.color; if(c)for(let i=0;i<c.count;i++)s.add('#'+new THREE.Color(c.getX(i),c.getY(i),c.getZ(i)).getHexString()); }); return s; };
  const mc = colors(m.magpie), pc = colors(m.pangolin);
  for (const c of ['#1f56d0', '#15161c', '#e0262a', '#fff9eb']) assert.ok(mc.has(c), `藍鵲缺 ${c}`);
  assert.ok(!pc.has('#1f56d0') && pc.has('#7d5530'));
  assert.ok(pc.has('#a87a48') && pc.has('#9a6a3c'), '大塊疊鱗有兩個棕色');
  let normalY=0, scaleVertices=0;
  m.pangolin.traverse(o=>{if(!o.isMesh||o.material===kit.OUT)return;const c=o.geometry.attributes.color,n=o.geometry.attributes.normal;for(let i=0;i<c.count;i++){const hex=new THREE.Color(c.getX(i),c.getY(i),c.getZ(i)).getHexString();if(['a87a48','9a6a3c'].includes(hex)){normalY+=n.getY(i);scaleVertices++;}}});
  assert.ok(normalY/scaleVertices>.2,'鱗片外側法線朝上，FrontSide 在遊戲中才看得到');
  const tris = countTriangles(m.group);
  assert.ok(tris <= MODEL_BUDGET.triangles, `三角形 ${tris}`);
  let meshes=0, shadows=0; m.group.traverse(o=>{if(o.isMesh){meshes++;if(o.castShadow)shadows++;}});
  assert.ok(meshes<=MODEL_BUDGET.meshes, `網格 ${meshes}`);
  assert.ok(shadows<=MODEL_BUDGET.shadowCasters, `陰影 ${shadows}`);
  assert.ok(meshes===8 && shadows===3, '三個合批實體、三個描邊、正反兩面橫幅');
  m.dispose(); m.dispose();
});
test('整合：main.js 在包種茶節之後載入本模組；index.js 不改（版本鎖不動）', () => {
  const main = read('src/main.js');
  const a = main.indexOf("import './systems/baozhong/index.js';"), b = main.indexOf("import './systems/baozhong/festival-arch.js';"), s = main.indexOf("import './systems/save.js';");
  assert.ok(a >= 0 && b > a && s > b);
  assert.doesNotMatch(read('src/systems/baozhong/index.js'), /festival-arch/);
  const w = read('src/systems/baozhong/festival-arch.js');
  assert.doesNotMatch(w, /applyInviteBubble|host\.sp\.material|host\.sp\.renderOrder/);
  assert.match(w, /CAMPUS_GUIDE\.hallFront/); assert.match(w, /SIWEI_HALL\.interior\.entrance/); assert.match(w, /flags\.has\('bz26_active'\)/);
});


test('同座標外部圓柱不可誤當自己的碰撞體', () => {
  const q=P.pillars[0];
  for(const owner of [undefined,'foreign']) assert.ok(placementConflicts(P,{colliders:[{c:true,x:q.x,z:q.z,r:.2,owner}]}).some(c=>c.kind==='pillar-collider'));
  assert.deepEqual(placementConflicts(P,{colliders:pillarColliders(P)}),[]);
});
test('連續充氣柱：每5公分射線都有實體，動物腳掌確實接頂，淺拱接柱且通道可走', () => {
  const kit=kitStub(),m=buildBalloonArch({...kit,placement:P});m.group.updateMatrixWorld(true);
  const structure=m.group.getObjectByName('bz26-arch-structure');
  const ray=new THREE.Raycaster();
  for(const side of [-1,1]) for(let y=.10;y<ARCH.PILLAR_TOP-.03;y+=.05){
    ray.set(new THREE.Vector3(side*P.half,y,3),new THREE.Vector3(0,0,-1));
    assert.ok(ray.intersectObject(structure).length>0, `柱身缺口 side=${side} y=${y}`);
  }
  for(const animal of [m.magpie,m.pangolin]) {
    const main=animal.children.find(o=>o.isMesh && o.material!==kit.OUT),pos=main.geometry.attributes.position;
    let contact=0;for(let i=0;i<pos.count;i++){const y=pos.getY(i)*animal.scale.y; if(Math.abs(y)<.03 && Math.hypot(pos.getX(i),pos.getZ(i))*animal.scale.x<.65)contact++;}
    assert.ok(contact>=4, `${animal.name} 腳掌沒有落在頂端支撐圓盤`);
  }
  assert.ok(ARCH.RISE<1.5,'不是高半圓');
  assert.ok(ARCH.SPRING_Y+ARCH.TUBE_R<ARCH.PILLAR_TOP,'拱樑端部嵌入柱身');
  assert.ok(ARCH.SPRING_Y-ARCH.TUBE_R>2.5,'可走過的淨高');
  assert.ok(P.half*2-1.4>=CAMPUS_GUIDE.avenue.width,'低處實體不吃掉大道淨寬');
  m.dispose();
});
