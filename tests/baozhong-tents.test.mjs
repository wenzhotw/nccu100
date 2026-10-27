// scripts/baozhong-tents.test.mjs（P05 v2，Grok，T065）：帳篷真實化 v2 的規格測試（A32 四 (a)(b)(c)(d)）＋ A25 座標與碰撞開關。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { TENT, boothInfo, clothColor, drawOfficialSign, drawPoster, faceColors, fitText, normTent, relocateSign, signVisibility } from '../src/systems/baozhong/tents-logic.js';
import { buildTents } from '../src/systems/baozhong/tents.js';

const rd = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const LAYOUT = rd('../src/systems/baozhong/layout.json');
const CONTENT = rd('../src/content/baozhong.json');
const CONTENT_TEXT = fs.readFileSync(new URL('../src/content/baozhong.json', import.meta.url), 'utf8');

/** 假的 2D 畫布：記錄 fillText 與是否用了圖片。 */
function fakeCanvas() {
  const calls = { text: [], image: 0 };
  const g = {
    font: '10px x', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: '', textBaseline: '', lineCap: '',
    createLinearGradient: () => ({ addColorStop() {} }),
    fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, fill() {},
    measureText(t) { const px = +(/(\d+)px/.exec(this.font) || [0, 10])[1]; return { width: [...String(t)].length * px * 0.95 }; },
    fillText(t, x, y) { calls.text.push({ t, x, y, font: this.font, fill: this.fillStyle }); },
    drawImage() { calls.image++; }, putImageData() { calls.image++; },
  };
  return { g, calls };
}
function build(opts = {}) {
  const colliders = [{ x0: 0, x1: 1, z0: 0, z1: 1 }];
  let texCount = 0;
  const canvasTex = (w, h, draw) => { texCount++; const { g } = fakeCanvas(); draw(g, w, h); return new THREE.Texture(); };
  const api = buildTents(LAYOUT, CONTENT.colleges, { content: CONTENT, colliders, deps: { canvasTex }, ...opts });
  api.group.updateMatrixWorld(true);
  return { api, colliders, tex: () => texCount };
}
function localBox(tentGroup, mesh) {
  tentGroup.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(tentGroup.matrixWorld).invert();
  const m = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld);
  const box = new THREE.Box3(), v = new THREE.Vector3(), p = mesh.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(m));
  return box;
}
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

test('layout.json：41 頂（D01 至 D37、F01 至 F04）＋11 位關主＋大會考，座標照 A25（v2.02 友校交流搬到中文系東邊、兩頂並排）', () => {
  const ids = LAYOUT.tents.map(t => t.id).sort();
  const want = [...Array.from({ length: 37 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`), 'F01', 'F02', 'F03', 'F04'].sort();
  assert.deepEqual(ids, want);
  const by = Object.fromEntries(LAYOUT.tents.map(t => [t.id, t]));
  assert.deepEqual([by.D01.x, by.D01.z, by.D01.rotY], [-27, -71.96, -0.1781]);
  assert.deepEqual([by.F03.x, by.F03.z, by.F03.rotY], [-23.46, -71.32, -0.1781]);
  assert.deepEqual([by.F04.x, by.F04.z, by.F04.rotY, by.F04.partOf], [-20.5, -70.79, -0.1781, 'F03']);
  // 兩頂沿中文系那一排並排：中心相距 3 公尺（剛好貼齊），和 D01 同一條線。
  assert.ok(near(Math.hypot(by.F04.x - by.F03.x, by.F04.z - by.F03.z), 3, 0.01));
  assert.ok(near((by.F03.z - by.D01.z) / (by.F03.x - by.D01.x), 0.18, 0.005) && near((by.F04.z - by.D01.z) / (by.F04.x - by.D01.x), 0.18, 0.005));
  assert.deepEqual(by.D37.anchor, [7.3, -27.5]);
  for (const t of LAYOUT.tents) {   // A25 碰撞框就是中心 ±1.5、高 2.6
    assert.ok(near(t.box[0], t.x - 1.5, 1e-9) && near(t.box[1], t.x + 1.5, 1e-9) && near(t.box[2], t.z - 1.5, 1e-9) && near(t.box[3], t.z + 1.5, 1e-9) && t.box[4] === 2.6, t.id);
  }
  assert.equal(LAYOUT.hall.masters.length, 11);
  assert.deepEqual([LAYOUT.hall.exam.x, LAYOUT.hall.exam.z], [303.5, -20.5]);
});

test('(a) 帳篷色：紅、白、藍、紅白間隔、色碼；友校交流 F03、F04 一律白；沒資料時輪流', () => {
  assert.deepEqual(faceColors('D01', 'red'), Array(4).fill('#d32f2f'));
  assert.deepEqual(faceColors('D01', '藍'), Array(4).fill('#1565c0'));
  assert.deepEqual(faceColors('D01', '紅白間隔'), ['#d32f2f', '#f5f5f5', '#d32f2f', '#f5f5f5']);
  assert.deepEqual(faceColors('D01', '#123abc'), Array(4).fill('#123abc'));
  assert.deepEqual(faceColors('F03', 'red'), Array(4).fill('#f5f5f5'));
  assert.deepEqual(faceColors('F04', 'red'), Array(4).fill('#f5f5f5'));
  assert.deepEqual([0, 1, 2, 3].map(i => faceColors('D02', undefined, i)[0]), ['#d32f2f', '#f5f5f5', '#1565c0', '#d32f2f']);
  assert.equal(faceColors('D02', undefined, 3)[1], '#f5f5f5');
  assert.equal(normTent('purple'), null);
  assert.equal(clothColor('D01', '#800020'), '#800020');
  assert.equal(clothColor('F01', null), '#f5a623');
  assert.equal(clothColor('F03', null), '#c62828');
  assert.equal(clothColor('F04', null), '#c62828');
});

test('(c) 主招牌自動移位：(0,3.25,0) 移到 (0,2.22,1.50)，其他牌子不動', () => {
  assert.deepEqual(relocateSign({ x: 0, y: 3.25, z: 0, w: 1 }), { x: 0, y: 2.22, z: 1.5, ry: 0, moved: true });
  assert.deepEqual(relocateSign({ x: 0, y: 3.25, z: 0, ry: 0.4 }), { x: 0, y: 2.22, z: 1.5, ry: 0, moved: true });
  assert.deepEqual(relocateSign({ x: 0.6, y: 1.65, z: -1.22 }), { x: 0.6, y: 1.65, z: -1.22, ry: 0, moved: false });
  assert.deepEqual(relocateSign({}), { x: 0, y: 0, z: 0, ry: 0, moved: false });
});

test('(e) 沒有 baozhong-booths.json 時：中文名取凍結內容、英文留空、海報字句全部摘自凍結 baozhong.json', () => {
  for (const b of CONTENT.booths) {
    const info = boothInfo(b.id, null, b);
    assert.equal(info.zh, b.dept); assert.equal(info.en, ''); assert.equal(info.no, b.id);
    assert.equal(info.posters.length, 3);
    for (const p of info.posters) for (const s of [p.title, ...p.lines]) if (s) assert.ok(CONTENT_TEXT.includes(s), `${b.id}「${s}」不在凍結內容`);
  }
  const f = boothInfo('F02', null, null, CONTENT.functions[0]);
  assert.equal(f.zh, '醫護站');
  const g = boothInfo('D26', { id: 'D26', no: 12, zh: '日本語文學系', en: 'Department of Japanese', tent: 'blue', posters: [{ title: 'A', lines: ['1', '2', '3', '4'] }] }, CONTENT.booths[25]);
  assert.deepEqual([g.no, g.en, g.posters[0].lines.length, g.posters.length], ['12', 'Department of Japanese', 3, 3]);
});

test('(a)(b)(d) 建模：柱子、四角錐頂、垂邊、官方招牌、桌巾與 3 張海報的位置尺寸', () => {
  const { api } = build();
  assert.equal(api.tents.size, 41);
  for (const T of api.tents.values()) {
    const g = T.group, P = T.parts;
    assert.equal(P.frame.filter(m => m.geometry.type === 'CylinderGeometry').length, 4);
    for (const p of P.frame.filter(m => m.geometry.type === 'CylinderGeometry')) {
      const b = localBox(g, p); assert.ok(near(Math.abs((b.min.x + b.max.x) / 2), 1.1, 1e-6) && near(Math.abs((b.min.z + b.max.z) / 2), 1.1, 1e-6), `${T.id} 柱子`);
    }
    const roofs = P.canopy.filter(m => !m.userData.bz26Valance), vals = P.canopy.filter(m => m.userData.bz26Valance);
    assert.equal(roofs.length, 4); assert.equal(vals.length, 4);
    for (const r of roofs) { const b = localBox(g, r); assert.ok(near(b.min.y, 2.0, 1e-6) && near(b.max.y, 2.9, 1e-6) && b.max.x <= 1.45 + 1e-6 && b.min.x >= -1.45 - 1e-6 && b.max.z <= 1.45 + 1e-6 && b.min.z >= -1.45 - 1e-6, `${T.id} 頂棚`); }
    for (const v of vals) { const b = localBox(g, v);
      assert.ok(near(b.min.y, 1.8, 1e-6) && near(b.max.y, 2.0, 1e-6), `${T.id} 垂邊高`);
      const edge = Math.max(Math.abs(b.min.x), Math.abs(b.max.x), Math.abs(b.min.z), Math.abs(b.max.z));
      assert.ok(near(edge, 1.45, 1e-6), `${T.id} 垂邊在 ±1.45 邊上（${edge}）`); }
    const s = P.signs.find(m => m.userData.bz26Official), sb = localBox(g, s);
    assert.ok(near(sb.min.x, -0.8, 1e-6) && near(sb.max.x, 0.8, 1e-6) && near(sb.min.y, 1.78 - 0.21, 1e-6) && near(sb.max.y, 1.78 + 0.21, 1e-6) && near(sb.min.z, 1.47, 1e-6), `${T.id} 官方招牌`);
    const posters = P.signs.filter(m => m.userData.bz26Poster !== undefined);
    assert.equal(posters.length, 3);
    posters.forEach((p, k) => { const b = localBox(g, p);
      assert.ok(near(b.max.x - b.min.x, 0.48, 1e-6) && near(b.max.y - b.min.y, 0.55, 1e-6) && near((b.min.y + b.max.y) / 2, 0.38, 1e-6) && near(b.min.z, 1.31, 1e-6), `${T.id} 海報 ${k}`);
      assert.ok(b.min.x >= -0.8 - 1e-6 && b.max.x <= 0.8 + 1e-6, `${T.id} 海報在桌子寬度內`); });
    const top = Math.max(...P.counter.filter(m => !m.userData.bz26Sign).map(m => localBox(g, m).max.y));
    assert.ok(near(top, 0.75, 1e-6), `${T.id} 桌面高 0.75（${top}）`);
    const cloth = P.counter[0].material.color.getHexString();
    assert.equal('#' + cloth, new THREE.Color(clothColor(T.id, T.collegeColor)).getHexString().replace(/^/, '#'));
  }
  const d01 = api.tents.get('D01');
  assert.equal('#' + d01.parts.counter[0].material.color.getHexString(), '#800020');
  const f03 = api.tents.get('F03');
  for (const r of f03.parts.canopy) assert.equal('#' + r.material.color.getHexString(), '#f5f5f5');
  for (const r of api.tents.get('F04').parts.canopy) assert.equal('#' + r.material.color.getHexString(), '#f5f5f5');
});

test('帳篷正面（本地 +z）朝向 A25 的 NPC 錨點，旋轉與位置照 layout', () => {
  const { api } = build();
  for (const t of LAYOUT.tents) {
    const g = api.tents.get(t.id).group;
    assert.ok(near(g.position.x, t.x) && near(g.position.z, t.z) && near(g.rotation.y, t.rotY), t.id);
    const front = new THREE.Vector3(0, 0, 2.2).applyMatrix4(g.matrixWorld);
    assert.ok(Math.hypot(front.x - t.anchor[0], front.z - t.anchor[1]) < 0.06, `${t.id} 錨點在正前方 2.2 公尺（差 ${Math.hypot(front.x - t.anchor[0], front.z - t.anchor[1]).toFixed(3)}）`);
  }
});

test('會場開關：碰撞用物件比對放回與拿掉、不重複、不動別人的碰撞', () => {
  const { api, colliders } = build();
  const other = colliders[0];
  assert.equal(api.group.visible, false); assert.equal(colliders.length, 1);
  api.setActive(true); api.setActive(true);
  assert.equal(colliders.length, 329); // GPT repair: 8 physical OBBs per tent, no filled shell.
  assert.equal(api.group.visible, true);
  colliders.push({ x0: 5, x1: 6, z0: 5, z1: 6 });
  api.setActive(false);
  assert.equal(colliders.length, 2); assert.equal(colliders[0], other);
  assert.equal(api.colliders.length, 41 * 8);
  assert.ok(api.colliders.every(c => c.obb && Number.isFinite(c.top)));
  assert.equal(new Set(api.colliders).size, api.colliders.length);
});

test('文字牌遠近：35 公尺外不畫；第一次靠近才畫貼圖（官方招牌 1 張＋海報 3 張）', () => {
  const { api, tex } = build();
  api.setActive(true);
  assert.equal(tex(), 0);
  api.update({ x: -27, z: -69.8 });   // D01 錨點
  const d01 = api.tents.get('D01'), d37 = api.tents.get('D37');
  assert.ok(d01.parts.signs.every(s => s.visible));
  assert.ok(d37.parts.signs.every(s => !s.visible));
  const n1 = tex(); assert.ok(n1 >= 4 && n1 % 4 === 0, `貼圖數 ${n1}`);
  api.update({ x: -27, z: -69.8 }); assert.equal(tex(), n1);
  assert.ok(d01.parts.signs[0].material.map);
  const ch = signVisibility([{ id: 'A', x: 0, z: 0 }], 34.9, 0, new Map());
  assert.deepEqual(ch, ['A']);
  const st = new Map(); signVisibility([{ id: 'A', x: 0, z: 0 }], 36, 0, st); assert.equal(st.get('A'), false);
});

test('(b) 官方招牌畫法：只有文字（活動名、中文系名、英文系名、編號），沒有任何圖片', () => {
  const { g, calls } = fakeCanvas();
  drawOfficialSign(g, 1024, 269, { zh: '日本語文學系', en: 'Department of Japanese', no: '12' });
  const t = calls.text.map(c => c.t);
  for (const s of ['2026', '政大包種茶節', '日本語文學系', 'Department of Japanese', '12']) assert.ok(t.includes(s), s);
  assert.equal(calls.image, 0);
  const zh = calls.text.find(c => c.t === '日本語文學系'); assert.equal(zh.fill, '#1565c0');
  const no = calls.text.find(c => c.t === '12'); assert.equal(no.fill, '#ffffff'); assert.ok(no.x > 1024 * 0.8 && no.y > 269 * 0.6, '編號在右下');
  const long = fakeCanvas(); drawOfficialSign(long.g, 1024, 269, { zh: '傳播學院大一大二不分系', en: 'Undeclared Major Program, College of Communication', no: 'D22' });
  for (const c of long.calls.text) { const px = +/(\d+)px/.exec(c.font)[1]; assert.ok([...c.t].length * px * 0.95 <= 1024 * 0.62, `字放得下：${c.t}`); }
});

test('(d) 海報畫法：標題加最多 3 行，長句縮字或截斷，不用亂數（同一攤畫兩次一樣）', () => {
  const a = fakeCanvas(), b = fakeCanvas();
  const P = { title: '系上活動', lines: ['一', '二', '三', '四'] };
  drawPoster(a.g, 256, 293, P, 'D35', 0); drawPoster(b.g, 256, 293, P, 'D35', 0);
  assert.deepEqual(a.calls.text.map(c => c.t), ['系上活動', '一', '二', '三']);
  assert.deepEqual(a.calls.text, b.calls.text);
  const m = (t, px) => [...t].length * px;
  assert.deepEqual(fitText(m, '短', 100, 20), { text: '短', px: 20 });
  const f = fitText(m, '這是一句非常非常長的海報文字沒有辦法放進去', 100, 20, 10);
  assert.ok(f.text.endsWith('…') && m(f.text, f.px) <= 100);
});
