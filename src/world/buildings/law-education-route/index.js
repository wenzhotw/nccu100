/** 從使用者已確認位置的 Godot 場景匯入法學院到教育學院的照片街區。 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { colliders } from '../../../core/collision.js';
import { LOTS } from '../../layout.js';
import { defineBuilding } from '../../registry.js';
import data from './district.json';

const textureFiles = import.meta.glob('./textures/*.{jpg,png}', { eager: true, query: '?url', import: 'default' });
const textures = new Map();
const matrix = new THREE.Matrix4();
const geometries = {
  box: new THREE.BoxGeometry(1, 1, 1),
  quad: new THREE.PlaneGeometry(1, 1),
  sphere: new THREE.SphereGeometry(.5, 12, 6),
  cylinder: new THREE.CylinderGeometry(.5, .5, 1, 12),
};

function material(batch) {
  const leaf = batch.kind === 'quad';
  const params = { color: batch.color, roughness: .84, side: leaf ? THREE.DoubleSide : THREE.FrontSide };
  if (batch.texture) {
    const file = batch.texture.split('/').pop();
    if (!textures.has(file)) {
      const url = textureFiles[`./textures/${file}`];
      if (!url) throw new Error(`街區貼圖遺失：${file}`);
      const tex = new THREE.TextureLoader().load(url);
      tex.encoding = THREE.sRGBEncoding;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      textures.set(file, tex);
    }
    params.map = textures.get(file);
  }
  if (leaf) params.alphaTest = .4;
  if (batch.name.includes('_glass_')) { params.roughness = .27; params.metalness = .28; }
  const result = new THREE.MeshStandardMaterial(params);
  // Godot 的世界座標三向貼圖，避免大型地坪拉伸成一張模糊貼圖。
  if (params.map && !leaf) {
    result.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec3 districtPos; varying vec3 districtNormal;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        districtPos = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
        districtNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);`);
      shader.fragmentShader = 'varying vec3 districtPos; varying vec3 districtNormal;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        vec3 weight = pow(abs(normalize(districtNormal)), vec3(4.0));
        weight /= max(dot(weight, vec3(1.0)), .001);
        vec3 p = districtPos * .3;
        diffuseColor *= texture2D(map, p.zy) * weight.x + texture2D(map, p.xz) * weight.y + texture2D(map, p.xy) * weight.z;`);
    };
    result.customProgramCacheKey = () => 'district-triplanar-v1';
  }
  return result;
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
    const mesh = new THREE.InstancedMesh(geometries[batch.kind], material(batch), batch.matrices.length);
    mesh.name = batch.name;
    batch.matrices.forEach((values, i) => {
      matrix.fromArray(values);
      // 舊網頁地坪最高約 0.03；略抬高新地坪，遮住被替代的舊道路。
      if (batch.name.startsWith('LawEducationWalk_') && matrix.elements[13] < .2) matrix.elements[13] += .045;
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = !batch.name.includes('_lawn_'); mesh.receiveShadow = true;
    group.add(mesh);
  }
  for (const label of data.labels) addLabel(label, group);
  colliders.push(...data.colliders.map(c => ({ ...c })));
  LOTS.push(...data.lots.map(l => ({ ...l })));
  group.userData = { source: 'Godot photo_architecture.tscn', districts: data.groups };
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
