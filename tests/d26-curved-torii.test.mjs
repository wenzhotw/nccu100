import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OPEN_CANOPY_D26 as G, buildOpenCanopyTorii, toriiCurveY, openCanopyColliders } from '../src/systems/baozhong/open-canopy-d26.js';
const mesh = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
const model = buildOpenCanopyTorii(new THREE.Group(), { mesh, toon: c => new THREE.MeshToonMaterial({ color: c }), outline() {} });

test('Actual extruded kasagi and shimaki have symmetric upturned ends and genuine thickness', () => {
  for (const part of model.parts.filter(p => p.userData.bz26ToriiCurved)) {
    const isCap = part.userData.bz26ToriiCurved === 'kasagi';
    const w = isCap ? G.capWidth : G.shimakiWidth, cy = isCap ? G.capY : G.shimakiY;
    const positions = part.geometry.attributes.position;
    const ysAt = x => [...Array(positions.count).keys()].filter(i => Math.abs(positions.getX(i) - x) < 1e-5).map(i => positions.getY(i));
    const mid = Math.max(...ysAt(0)), left = Math.max(...ysAt(-w / 2)), right = Math.max(...ysAt(w / 2));
    assert.ok(Math.abs(mid - cy) < 1e-5); assert.ok(Math.abs(left - right) < 1e-5);
    assert.ok(Math.abs(left - mid - G.capRise * (w / G.capWidth) ** 2) < 1e-5); assert.ok(ysAt(0).length > 2);
    assert.equal(part.geometry.type, 'ExtrudeGeometry');
    part.geometry.computeBoundingBox(); assert.ok(part.geometry.boundingBox.getSize(new THREE.Vector3()).z >= .179);
    assert.equal(positions.count / 3 < 200, true);
  }
  assert.equal(toriiCurveY(0), 3.06); assert.ok(Math.abs(toriiCurveY(G.capWidth / 2) - 3.28) < 1e-6);
});
test('Two inward-leaning tapered posts land on ground and fit their conservative collision boxes', () => {
  const posts = model.parts.filter(p => p.userData.bz26ToriiPost);
  assert.equal(posts.length, 2);
  const colliders = openCanopyColliders({ x: 0, z: 0, rotY: 0 });
  for (const p of posts) {
    assert.equal(p.geometry.parameters.radiusTop < p.geometry.parameters.radiusBottom, true);
    p.updateMatrix(); const b = new THREE.Box3().setFromBufferAttribute(p.geometry.attributes.position).applyMatrix4(p.matrix);
    assert.ok(b.min.y <= .001 && b.min.y > -.01); assert.ok(b.max.y > 3);
    assert.ok(colliders.some(c => b.min.x >= c.cx - c.hx - 1e-6 && b.max.x <= c.cx + c.hx + 1e-6 && b.min.z >= c.cz - c.hz - 1e-6 && b.max.z <= c.cz + c.hz + 1e-6));
  }
});
test('Curve projects to visible rise at ordinary 12m and 20m distances without changing game camera', () => {
  for (const d of [12, 20]) {
    const risePx = G.capRise / (2 * d * Math.tan(55 * Math.PI / 360)) * 900;
    assert.ok(risePx > 9, `${d}m: ${risePx}px`);
  }
});
