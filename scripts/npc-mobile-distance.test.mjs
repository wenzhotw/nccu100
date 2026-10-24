import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

function harness() {
  const source = fs.readFileSync(new URL('../src/actors/npc.js', import.meta.url), 'utf8');
  const pos = new THREE.Vector3();
  const context = vm.createContext({
    MOBILE: true, pos, state: { room: null, time: 0, driving: false },
    dlg: { hidden: true }, npcTmp: new THREE.Vector3(), resolve() {}, groundH: () => 0,
    lerpA: (a,b,t) => a+(b-a)*t,
  });
  vm.runInContext(source.slice(source.indexOf('const NPC_FAR='), source.indexOf('/* 角色：')) +
    '\nglobalThis.update = npcUpdate;', context);
  const P = Object.fromEntries(['hipL','hipR','shL','shR'].map(name => [name, new THREE.Object3D()]));
  Object.assign(P, { fm: {}, fA: {}, fB: {}, fC: {} });
  const n = {
    g: new THREE.Object3D(), rig: new THREE.Object3D(), P,
    path: [[80,0]], pi: 0, home: {x:0,z:0}, state: 'idle',
    fear: 0, ph: 0, blink: 3, sayT: 3, spot: {}, tag: {},
    sp: { say() {}, visible: false },
  };
  n.g.position.x = 60;
  return { n, pos, update: context.update };
}
test('far mobile NPC remains on route and updates interaction coordinates while mesh is hidden', () => {
  const { n, update } = harness();
  update(n, 0.1);
  assert.equal(n.rig.visible, false);
  assert.ok(n.g.position.x > 60);
  assert.equal(n.spot.x, n.g.position.x);
  assert.equal(n.tag.visible, false);
});
test('returning NPC continues toward home beyond 50m and reappears when approached', () => {
  const { n, pos, update } = harness();
  n.state = 'return'; update(n, 0.1);
  assert.ok(n.g.position.x < 60);
  assert.equal(n.rig.visible, false);
  pos.x = n.g.position.x; update(n, 0.1);
  assert.equal(n.rig.visible, true);
});
test('adding a story after hook to a previously hidden NPC restores its visual and executes callback', () => {
  const { n, update } = harness(); update(n, 0.1);
  let calls = 0; n.after = () => calls++;
  update(n, 0.1);
  assert.equal(n.rig.visible, true); assert.equal(calls, 1);
});
