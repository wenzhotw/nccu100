/** 從使用者已確認位置的 Godot 場景匯入法學院到教育學院的照片街區。 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { toon } from '../../../render/kit.js';
import { colliders } from '../../../core/collision.js';
import { LOTS } from '../../layout.js';
import { defineBuilding } from '../../registry.js';
import raw from './district.json';

/*
 * 街區裡的法學院、游泳館不載入，改用原本的 law-school、swimming-hall 模組。
 * district.json 是 Godot 轉出的檔案，不直接改它，在這裡過濾：
 * 這兩個群組的模型、招牌、坡道、預定地，以及落在它們範圍內的碰撞都略過。
 */
const SKIP_GROUPS = new Set(['LawCollege', 'SwimmingPool']);
const SKIP_LOTS = new Set(['法學院', '游泳館']);
const groupOf = b => b.name.split('_')[0];
const skipBoxes = [...SKIP_GROUPS].map(g => {
  const pts = raw.batches.filter(b => groupOf(b) === g).flatMap(b => b.matrices.map(m => [m[12], m[14]]));
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
  return { x0: Math.min(...xs) - 1, x1: Math.max(...xs) + 1, z0: Math.min(...zs) - 1, z1: Math.max(...zs) + 1 };
});
const inSkip = (x, z) => skipBoxes.some(b => x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1);
// 鳳凰林（樹、石牌、長椅）原本落在原版法學院東端裡面，整組往北挪到法學院和四維道步道之間
const PHOENIX = { x0: -106, x1: -89, z0: -108, z1: -96, dz: 15 };
const inPhoenix = (x, z) => x > PHOENIX.x0 && x < PHOENIX.x1 && z > PHOENIX.z0 && z < PHOENIX.z1;
const movedMatrix = m => (inPhoenix(m[12], m[14]) ? m.map((v, i) => (i === 14 ? v + PHOENIX.dz : v)) : m);
const data = {
  ...raw,
  batches: raw.batches.filter(b => !SKIP_GROUPS.has(groupOf(b))).map(b => ({ ...b, matrices: b.matrices.map(movedMatrix) })),
  labels: raw.labels.filter(l => !inSkip(l.matrix[12], l.matrix[14])).map(l => ({ ...l, matrix: movedMatrix(l.matrix) })),
  ramps: raw.ramps.filter(r => !inSkip(r.matrix[12], r.matrix[14])),
  lots: raw.lots.filter(l => !SKIP_LOTS.has(l.name)).map(l => (inPhoenix(l.x, l.z)
    ? { ...l, z: l.z + PHOENIX.dz, entry: l.entry && [l.entry[0], l.entry[1] + PHOENIX.dz] } : l)),
  colliders: raw.colliders.filter(c => !inSkip((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2)).map(c => (inPhoenix((c.x0 + c.x1) / 2, (c.z0 + c.z1) / 2)
    ? { ...c, z0: c.z0 + PHOENIX.dz, z1: c.z1 + PHOENIX.dz } : c)),
};

const matrix = new THREE.Matrix4();
const geometries = {
  box: new THREE.BoxGeometry(1, 1, 1),
  quad: new THREE.PlaneGeometry(1, 1),
  sphere: new THREE.IcosahedronGeometry(1, 1),
  cylinder: new THREE.CylinderGeometry(.5, .5, 1, 12),
};

// 沿用原專案的卡通光照、輪廓光，以及明亮的建築、道路與草地色系。
const palette = {
  wall:'#777e83', trim:'#efefea', fins:'#d4915a', frame:'#52636f', glass:'#5c7686',
  dark:'#43515c', stone:'#c4c7c0', road:'#5b6270', paving:'#d8cdb9', brick:'#c77563',
  cream:'#e5e1d6', green:'#4f9a48', yellow:'#efd54a', white:'#f4f4ee', red:'#d87368',
  pink:'#b89b91', rose:'#ae7380', tile:'#c5bfb2', roof:'#64756e', metal:'#97a2a1',
  bark:'#7a5a43', leaf:'#5cb150', lawn:'#86c35a', soil:'#bd9974', blue:'#69a8c0',
  playgreen:'#75b454', rubber:'#353a43', carwhite:'#e9eef2', carblue:'#5885ae',
};
const playgroundSphere = new THREE.SphereGeometry(.5, 12, 6);
function material(batch) {
  return toon(palette[batch.name.split('_')[1]] || batch.color);
}

function addLabel(label, parent) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const lines = label.text.split('\n');
  ctx.font = '64px "Noto Sans TC", sans-serif';
  canvas.width = Math.ceil(Math.max(...lines.map(t => ctx.measureText(t).width)) + 16);
  canvas.height = lines.length * 80;
  ctx.font = '64px "Noto Sans TC", sans-serif';
  ctx.fillStyle = label.color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, i * 80 + 40));
  const tex = new THREE.CanvasTexture(canvas); tex.encoding = THREE.sRGBEncoding;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(canvas.width / 64 * label.size, canvas.height / 64 * label.size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  mesh.applyMatrix4(new THREE.Matrix4().fromArray(label.matrix));
  parent.add(mesh);
}

// 傾斜平台以平面方程求高度，保留游泳館階梯及無障礙坡道的可行走性。
const ramps = data.ramps.map(r => {
  const m = new THREE.Matrix4().fromArray(r.matrix);
  return { inverse: m.clone().invert(), normal: new THREE.Vector3(0, 1, 0).transformDirection(m),
    top: new THREE.Vector3(0, r.size[1] / 2, 0).applyMatrix4(m), size: r.size };
});
function heightAt(x, z) {
  let best = null;
  for (const r of ramps) {
    const y = r.top.y - (r.normal.x * (x - r.top.x) + r.normal.z * (z - r.top.z)) / r.normal.y;
    const local = new THREE.Vector3(x, y, z).applyMatrix4(r.inverse);
    if (Math.abs(local.x) <= r.size[0] / 2 && Math.abs(local.z) <= r.size[2] / 2) best = Math.max(best ?? 0, y);
  }
  return best;
}

function build() {
  const group = new THREE.Group(); group.name = '法學院－教育學院照片街區';
  for (const batch of data.batches) {
    const mesh = new THREE.InstancedMesh((batch.name === 'LawEducationWalk_leaf_sphere' ? geometries.sphere : batch.kind === 'sphere' ? playgroundSphere : geometries[batch.kind]), material(batch), batch.matrices.length);
    mesh.name = batch.name;
    batch.matrices.forEach((values, i) => {
      matrix.fromArray(values);
      // 舊網頁地坪最高約 0.03；略抬高新地坪，遮住被替代的舊道路。
      if (batch.name.startsWith('LawEducationWalk_') && matrix.elements[13] < .2) matrix.elements[13] += .045;
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    const surface = batch.name.split('_')[1];
    // 薄地坪與窗框不投影，避免與重疊地面產生鋸齒狀陰影；量體保留投影。
    mesh.castShadow = ['wall','pink','rose','tile','roof','cream','bark','leaf','carblue'].includes(surface);
    mesh.receiveShadow = ['road','paving','brick','lawn','soil'].includes(surface);
    group.add(mesh);
  }
  for (const label of data.labels) addLabel(label, group);
  colliders.push(...data.colliders.map(c => ({ ...c })));
  LOTS.push(...data.lots.map(l => ({ ...l })));
  group.userData = { source: 'Godot photo_architecture.tscn', districts: data.groups, batchCount: data.batches.length, lots: data.lots };
  scene.add(group);
}

function drawDistrictMap(ctx, mx, my) {
  // 同一份矩陣畫出街區地坪與道路，避免大地圖和實際道路各用一套位置。
  for (const batch of data.batches) {
    if (!/^LawEducationWalk_(lawn|road|brick|paving)_/.test(batch.name)) continue;
    ctx.fillStyle = batch.name.includes('_lawn_') ? '#c8d2ae' : '#c0b5a1';
    for (const m of batch.matrices) {
      if (m[13] > .2) continue;
      ctx.beginPath();
      [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].forEach(([x,z], i) => {
        const px = mx(m[0]*x+m[8]*z+m[12]), py = my(m[2]*x+m[10]*z+m[14]);
        if (i) ctx.lineTo(px,py); else ctx.moveTo(px,py);
      });
      ctx.closePath(); ctx.fill();
    }
  }
}

export default defineBuilding({
  id: 'law-education-route',
  name: '法學院－教育學院照片街區',
  build, heightAt,
  zones: data.lots.map(l => ({ priority: 20, test: p => Math.abs(p.x-l.x) < l.w/2+3 && Math.abs(p.z-l.z) < l.d/2+3 ? l.name : null })),
  map: [{draw:drawDistrictMap}, ...data.lots.map(l => ({ x: l.x, z: l.z, w: l.w, d: l.d, color: '#aeb8a2', label: l.name }))],
});
