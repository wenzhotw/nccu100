// scripts/baozhong-decor-v2.test.mjs（Grok，T065）：40 頂佈景放進 P05 v2 真實帳篷後的檢查（A32 四 (g)）。
// 用正式 ctx v2（decor-ctx.js）在 tents.js 建的帳篷 Group 裡逐檔建模，量測（含描邊）：
//   主招牌自動移位後在 (0,2.22,1.50)；其餘零件在 x,z ±1.45、y 0 至 4.5；主零件 ≤20、三角形 ≤2000、文字牌 ≤2；
//   垂邊（y 1.8 至 2.0、在 ±1.45 邊上）不得被佈景穿過；有 update 的跑 120 幀結構不變。
// 只列警告不擋：佈景零件擋在桌子正面海報前（z>1.30、y<0.75 與海報重疊）、伸進四角錐頂棚。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { createDecorCtx, _resetDecorCaches } from '../src/systems/baozhong/decor-ctx.js';
import { buildTents } from '../src/systems/baozhong/tents.js';
import { TENT } from '../src/systems/baozhong/tents-logic.js';

const rd = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const LAYOUT = rd('../src/systems/baozhong/layout.json');
const CONTENT = rd('../src/content/baozhong.json');
const DIR = new URL('../src/systems/baozhong/decor/', import.meta.url);
const IDS = fs.readdirSync(DIR).filter((f) => /^(D\d\d|F0\d)\.js$/.test(f)).map((f) => f.slice(0, -3)).sort();
const mats = new Map();
const OUTM = new THREE.MeshBasicMaterial({ color: '#2a2c4a', side: THREE.BackSide });
const deps = { THREE, toon: (c) => { if (!mats.has(c)) mats.set(c, new THREE.MeshToonMaterial({ color: c })); return mats.get(c); }, outlineMat: OUTM, makeSignTexture: () => null };
const E = 1e-6;

function boxIn(tent, n) {
  const inv = new THREE.Matrix4().copy(tent.matrixWorld).invert();
  const m = new THREE.Matrix4().multiplyMatrices(inv, n.matrixWorld), v = new THREE.Vector3(), p = n.geometry.attributes.position, b = new THREE.Box3();
  for (let i = 0; i < p.count; i++) b.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m));
  return b;
}
const overlap = (a, b) => a.min.x < b.max.x - E && a.max.x > b.min.x + E && a.min.y < b.max.y - E && a.max.y > b.min.y + E && a.min.z < b.max.z - E && a.max.z > b.min.z + E;
const roofY = (x, z) => TENT.roofBase + (TENT.roofTop - TENT.roofBase) * (1 - Math.max(Math.abs(x), Math.abs(z)) / TENT.half);

const tents = buildTents(LAYOUT, CONTENT.colleges, { content: CONTENT });
tents.group.updateMatrixWorld(true);
const warnings = [];

test('40 個佈景檔都在（D01 至 D37、F01 至 F03）', () => { assert.equal(IDS.length, 40); });

for (const id of IDS) {
  test(`${id}：真實帳篷 v2 內建模`, async () => {
    _resetDecorCaches();
    const T = tents.tents.get(id); assert.ok(T, `layout 沒有 ${id}`);
    const root = new THREE.Group(); T.group.add(root);
    try {
      const mod = await import(new URL(`${id}.js`, DIR));
      const res = mod.default(createDecorCtx(deps, root, T.collegeColor)) || {};
      T.group.updateMatrixWorld(true);
      let main = 0, tri = 0, signs = 0; const mainSigns = [];
      const vals = T.parts.canopy.filter((m) => m.userData.bz26Valance).map((m) => boxIn(T.group, m));
      const posters = T.parts.signs.filter((m) => m.userData.bz26Poster !== undefined).map((m) => boxIn(T.group, m));
      root.traverse((n) => {
        if (!n.isMesh) return;
        const g = n.geometry, idx = g.getIndex(); tri += (idx ? idx.count : g.attributes.position.count) / 3;
        if (n.material !== OUTM) main++;
        if (n.userData.bz26Sign) signs++;
        const b = boxIn(T.group, n);
        if (n.userData.bz26MainSign) { mainSigns.push(b); return; }
        assert.ok(b.min.x >= -1.45 - E && b.max.x <= 1.45 + E && b.min.z >= -1.45 - E && b.max.z <= 1.45 + E && b.min.y >= -E && b.max.y <= 4.5 + E,
          `${id} 零件出界 ${b.min.toArray().map((v) => v.toFixed(3))}～${b.max.toArray().map((v) => v.toFixed(3))}`);
        vals.forEach((vb, k) => assert.ok(!overlap(b, vb), `${id} 零件穿過垂邊（第 ${k + 1} 面） y ${b.min.y.toFixed(3)}～${b.max.y.toFixed(3)}`));
        posters.forEach((pb, k) => { if (b.max.z > 1.30 && overlap(b, new THREE.Box3(new THREE.Vector3(pb.min.x, pb.min.y, 1.0), new THREE.Vector3(pb.max.x, pb.max.y, 1.46)))) warnings.push(`${id} 擋到第 ${k + 1} 張海報（z ${b.max.z.toFixed(2)}）`); });
        const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, ry = roofY(cx, cz);
        if (b.min.y < ry - 0.01 && b.max.y > ry + 0.01) warnings.push(`${id} 零件穿過四角錐頂棚（y ${b.min.y.toFixed(2)}～${b.max.y.toFixed(2)}，該處頂棚 y ${ry.toFixed(2)}）`);
      });
      assert.ok(main <= 20, `${id} 主零件 ${main}`); assert.ok(tri <= 2000, `${id} 三角形 ${tri}`); assert.ok(signs <= 2, `${id} 文字牌 ${signs}`);
      assert.equal(mainSigns.length, 1, `${id} 主招牌（原 0,3.25,0）數量`);
      const c = mainSigns[0].getCenter(new THREE.Vector3());
      assert.ok(Math.abs(c.x) < E && Math.abs(c.y - 2.22) < E && Math.abs(c.z - 1.5) < E, `${id} 主招牌中心 ${c.toArray()}`);
      if (typeof res.update === 'function') {
        const before = []; root.traverse((n) => before.push(n));
        const colors = [...mats.values()].map((m) => m.color.getHex());
        for (let i = 0; i < 120; i++) res.update(1 / 60);
        const after = []; root.traverse((n) => after.push(n));
        assert.deepEqual(after, before, `${id} update 改了結構`);
        assert.deepEqual([...mats.values()].map((m) => m.color.getHex()), colors, `${id} update 改了共用材質顏色`);
      }
    } finally { T.group.remove(root); }
  });
}

test('警告清單（不擋）', () => {
  if (warnings.length) console.log('警告 ' + new Set(warnings).size + ' 項：\n' + [...new Set(warnings)].join('\n'));
  assert.ok(true);
});
