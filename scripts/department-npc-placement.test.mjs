import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { departmentNpcHome, DEPARTMENT_NPC_POSITION } from '../src/systems/baozhong/department-npc-placement.js';
import { collidersOf } from '../src/systems/baozhong/tents-logic.js';
import { openCanopyColliders } from '../src/systems/baozhong/open-canopy-d26.js';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const layout = JSON.parse(read('../src/systems/baozhong/layout.json'));
const content = JSON.parse(read('../src/content/baozhong.json'));
const departments = layout.tents.filter(t => /^D\d\d$/.test(t.id));
const source = read('../src/systems/baozhong/index.js');
const colliders = layout.tents.flatMap(t => [...collidersOf(t), ...(t.id === 'D26' ? openCanopyColliders(t).slice(4, 6) : [])]);
function world(t, x, z) {
  const g = new THREE.Group();
  g.position.set(t.x, 0, t.z); g.rotation.y = t.rotY; g.updateMatrixWorld(true);
  return g.localToWorld(new THREE.Vector3(x, 0, z));
}
function clearance(p, c) {
  const dx = p.x - c.cx, dz = p.z - c.cz;
  const x = dx * c.cs - dz * c.sn, z = dx * c.sn + dz * c.cs;
  return Math.hypot(Math.max(Math.abs(x) - c.hx, 0), Math.max(Math.abs(z) - c.hz, 0));
}

test('all 37 departments use player-facing local front-left, including all three row orientations', () => {
  assert.equal(departments.length, 37);
  assert.equal(new Set(departments.map(t => t.rotY)).size, 3);
  assert.deepEqual(DEPARTMENT_NPC_POSITION, { x: -1.05, z: 2.4 });
  for (const t of departments) {
    const actual = departmentNpcHome(t), expected = world(t, -1.05, 2.4);
    assert.ok(Math.hypot(actual.x - expected.x, actual.z - expected.z) < 1e-10, t.id);
    const front = world(t, 0, 2.4), left = world(t, -1, 2.4);
    assert.ok((actual.x - front.x) * (left.x - front.x) + (actual.z - front.z) * (left.z - front.z) > 0, t.id);
    assert.ok(Math.hypot(actual.x - t.anchor[0], actual.z - t.anchor[1]) < 1.08, t.id);
  }
});

test('all department NPCs clear tables, walls, poles, neighboring booths and D26 torii with a 0.55 m envelope', () => {
  for (const t of departments) {
    const p = departmentNpcHome(t);
    for (const c of colliders) assert.ok(clearance(p, c) >= 0.55, `${t.id}: clearance ${clearance(p, c)}`);
  }
  // D04 的旗子伸出人體範圍，分別用完整包圍圓涵蓋旗座、旗布與木台。
  const political = departments.find(t => t.id === 'D04'), scale = 1.2;
  const props = [
    { name: 'flag pole and foot', x: .47, z: -.03, radius: .10 },
    { name: 'flag cloth through local x=.87', x: .67, z: -.03, radius: Math.hypot(.20, .008) },
    { name: 'platform .62 by .50 including slats', x: 0, z: 0, radius: Math.hypot(.31, .262) },
  ];
  for (const prop of props) {
    const p = world(political, DEPARTMENT_NPC_POSITION.x + prop.x * scale, DEPARTMENT_NPC_POSITION.z + prop.z * scale);
    for (const c of colliders) assert.ok(clearance(p, c) > prop.radius * scale, `D04 ${prop.name}: clearance ${clearance(p, c)}`);
  }
});

test('all 37 NPCs remain reachable from clear front approaches and original map anchors', () => {
  for (const t of departments) {
    const home = departmentNpcHome(t), approach = world(t, -1.05, 3.5);
    assert.ok(Math.hypot(home.x - approach.x, home.z - approach.z) < 2.4, t.id);
    assert.ok(Math.hypot(home.x - t.anchor[0], home.z - t.anchor[1]) < 2.4, t.id);
    for (let i = 0; i <= 20; i++) {
      const p = world(t, -1.05 * i / 20, 4 - 0.5 * i / 20);
      for (const c of colliders) assert.ok(clearance(p, c) >= 0.35, `${t.id}: approach step ${i}`);
    }
  }
});

test('production department spawn passes shifted home to addNPC; services and hall anchors stay untouched', () => {
  const loop = source.match(/for \(const b of CONTENT\.booths\) \{[\s\S]*?\n\}/)[0];
  const spawned = [];
  Function('CONTENT', 'byId', 'venueNPC', 'departmentNpcHome', 'onBooth', loop)(
    content, new Map(layout.tents.map(t => [t.id, t])), o => spawned.push(o), departmentNpcHome, () => {});
  assert.equal(spawned.length, 37);
  for (const o of spawned) {
    const t = layout.tents.find(t => `bz26-${t.id}` === o.id);
    assert.deepEqual(o.home, departmentNpcHome(t));
    assert.equal(o.face, t.rotY);
  }
  assert.match(source, /id: 'bz26-F01'.*home: \{ x: t\.anchor\[0\], z: t\.anchor\[1\] \}/);
  assert.match(source, /id: `bz26-\$\{f\.id\}`.*home: \{ x: t\.anchor\[0\], z: t\.anchor\[1\] \}/);
  assert.match(source, /home: \{ x: m\.x, z: m\.z \}/);
  assert.match(source, /home: \{ x: e\.x, z: e\.z \}/);
  // 共用 NPC 的 root、回家位置、對話點與子物件名牌都沿用同一個 home。
  const core = read('../src/actors/npc.js');
  assert.match(core, /n\.g\.position\.set\(o\.home\.x,0,o\.home\.z\)/);
  assert.match(core, /n\.spot=\{x:o\.home\.x,z:o\.home\.z,r:2\.4/);
  assert.match(core, /n\.g\.add\(n\.tag\)/);
  assert.match(core, /tx=n\.home\.x; tz=n\.home\.z/);
});
