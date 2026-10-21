// 活動服裝用共用幾何。材質由正式 render/kit 注入，純模型可獨立驗證。
import * as THREE from 'three';
const BOX = new THREE.BoxGeometry(1, 1, 1);
const SPHERE = new THREE.IcosahedronGeometry(1, 1);
const geometries = new Map();
function cached(key, build) {
  if (!geometries.has(key)) geometries.set(key, build());
  return geometries.get(key);
}
export function createCostumeKit(n, { toon, OUT, canvasTex }) {
  function group(parent, name, pos = [0, 0, 0]) {
    const g = new THREE.Group(); g.name = `bz26-costume-${name}`;
    g.position.set(...pos); g.userData.noOcc = true; parent.add(g); return g;
  }
  function mesh(parent, name, color, pos, geo, scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const m = new THREE.Mesh(geo, toon(color)); m.name = `bz26-costume-${name}`;
    m.position.set(...pos); m.scale.set(...scale); m.rotation.set(...rotation);
    m.castShadow = true; m.receiveShadow = true; parent.add(m);
    if (!geo.boundingBox) geo.computeBoundingBox();
    const size = geo.boundingBox.getSize(new THREE.Vector3()).multiply(new THREE.Vector3(...scale));
    const thickness = Math.min(.007, Math.min(size.x, size.y, size.z) * .08);
    const edge = new THREE.Mesh(geo, OUT); edge.name = `${m.name}-outline`;
    edge.scale.set(1 + 2 * thickness / size.x, 1 + 2 * thickness / size.y, 1 + 2 * thickness / size.z);
    m.add(edge); return m;
  }
  const rig = group(n.rig, `${n.id}-body`), head = group(n.P.head, `${n.id}-head`);
  const left = group(n.P.shL, `${n.id}-left`), right = group(n.P.shR, `${n.id}-right`);
  const hipLeft = group(n.P.hipL, `${n.id}-hip-left`), hipRight = group(n.P.hipR, `${n.id}-hip-right`);
  return {
    rig, head, left, right, hipLeft, hipRight, group, root: n.g,
    label(parent, name, text, pos, width, height, bg = '#224477', fg = '#ffffff') {
      const lines = text.split('\n');
      const texture = canvasTex?.(768, 384, g => {
        g.fillStyle = bg; g.fillRect(0, 0, 768, 384);
        g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = 'bold 72px "Noto Sans TC", sans-serif';
        lines.forEach((line, i) => g.fillText(line, 384, 192 + (i - (lines.length - 1) / 2) * 110, 718));
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ map: texture || null, color: texture ? '#ffffff' : bg, side: THREE.DoubleSide }));
      plane.name = `bz26-costume-${name}`; plane.position.set(...pos); plane.userData.text = text;
      parent.add(plane); return plane;
    },
    box: (p, name, c, pos, size, rot) => mesh(p, name, c, pos, BOX, size, rot),
    sphere: (p, name, c, pos, scale) => mesh(p, name, c, pos, SPHERE, scale),
    cylinder: (p, name, c, pos, top, bottom, height, rot) => mesh(p, name, c, pos,
      cached(`c:${top}:${bottom}:${height}`, () => new THREE.CylinderGeometry(top, bottom, height, 12)), [1, 1, 1], rot),
    torus: (p, name, c, pos, radius, tube, rot) => mesh(p, name, c, pos,
      cached(`t:${radius}:${tube}`, () => new THREE.TorusGeometry(radius, tube, 6, 16)), [1, 1, 1], rot),
  };
}
