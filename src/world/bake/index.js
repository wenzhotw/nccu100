/**
 * 靜態烘焙：場景蓋完之後，把「沒有名字、純色、不透明、沒貼圖、不會發光」的小方塊／造型
 * 直接合併成少數幾個大網格（每區塊、每種材質一個），大幅減少 draw call。
 *
 * 跟工具箱（world/prefabs）不同：工具箱是「同一種形狀重複出現」用 InstancedMesh；
 * 這裡是「形狀都不一樣，但顏色材質簡單」，用真的幾何合併（把每個方塊的頂點直接移到世界座標，
 * 用頂點顏色取代各自的純色材質），合併成一個大 BufferGeometry。
 *
 * 只動「外觀上看不出來」的東西，以下情況一律跳過，照舊畫：
 *   - 有名字的網格（之後可能被用名字找到，例如石獅子、check-model 系列檢查腳本會用到的建築關鍵部位）
 *   - userData.noOcc 底下的整棵子樹（這是現有慣例：會動、會變色的東西都這樣標，玩家、NPC、警車、雨傘……）
 *   - 貼圖、透明、會發光（emissive）的材質：合併後會變成純色，外觀會跑掉（單面、雙面都支援，各自合併）
 *   - 大型方塊／圓柱（鏡頭防穿模 camera-occlusion.js 用同一個「箱型、夠大」規則找牆面擋鏡頭，
 *     這些一定要維持原本的個別網格，否則鏡頭會穿牆）
 *   - 室內場景（每個房間是蓋房間時才建立，烘焙只在開場的室外場景跑一次，不會動到還沒蓋的房間）
 *
 * 在所有建築、地形、工具箱（flushPrefabs）都蓋完之後呼叫一次 flushBake()。
 * 說明：docs/bake.md
 */
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene } from '../../core/engine.js';
import { GRAD, OUT } from '../../render/kit.js';

const CHUNK = 48;            // 跟工具箱用同一個區塊大小，鏡頭看不到的區塊整批不畫
const buckets = new Map();   // key → { kind, cast, recv, geoms: [] }
let flushed = false;

/** 跟 camera-occlusion.js 判斷「夠大、箱型，可能擋鏡頭」用同一條規則：這種網格不烘焙，維持原樣 */
const bb = new THREE.Box3(), bsz = new THREE.Vector3();
function isOccluderShape(o) {
  const t = o.geometry.type;
  const ok = t === 'BoxGeometry' || t === 'ExtrudeGeometry' || (t === 'CylinderGeometry' && o.geometry.parameters.radiusTop > 0.6);
  if (!ok) return false;
  bb.setFromObject(o); bb.getSize(bsz);
  return Math.max(bsz.x, bsz.z) > 1.4 && bsz.y > 0.25;
}

/** 這個網格能不能被烘焙合併？回傳 'toon'｜'basic'｜'outline'｜false */
function bakeKind(o) {
  if (!o.isMesh || o.isInstancedMesh || !o.visible || o.name) return false;
  const g = o.geometry;
  if (!g || !g.attributes || !g.attributes.position) return false;
  const mat = o.material;
  if (Array.isArray(mat)) return false;
  if (mat === OUT) return isOccluderShape(o) ? false : 'outline';
  if (!mat.isMeshToonMaterial && !mat.isMeshBasicMaterial) return false;
  if (mat.map || mat.alphaMap || mat.vertexColors) return false;
  if (mat.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return false;   // 有自訂 shader（例如樹冠淡出）的不要動
  if (mat.transparent || mat.opacity < 1) return false;
  if (mat.side !== THREE.FrontSide && mat.side !== THREE.DoubleSide) return false;
  if (mat.emissive && mat.emissive.getHex() !== 0) return false;
  if (isOccluderShape(o)) return false;
  return (mat.isMeshToonMaterial ? 'toon' : 'basic') + (mat.side === THREE.DoubleSide ? '-ds' : '');
}

/** 把一個網格的幾何搬到世界座標，記進對應的批次 */
function record(o, kind) {
  let g = o.geometry.clone().applyMatrix4(o.matrixWorld);
  if (g.index) g = g.toNonIndexed();   // 原本形狀有沒有索引不一樣（方塊有、有些自訂形狀沒有），統一成沒有索引才能合併
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (kind !== 'outline') {
    const c = o.material.color, n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const e = o.matrixWorld.elements, cx = Math.floor(e[12] / CHUNK), cz = Math.floor(e[14] / CHUNK);
  const cast = kind !== 'outline' && !!o.castShadow, recv = kind !== 'outline' && !!o.receiveShadow;
  const key = `${kind}|${cx},${cz}|${cast ? 1 : 0}|${recv ? 1 : 0}`;
  let b = buckets.get(key);
  if (!b) { b = { kind, cast, recv, geoms: [] }; buckets.set(key, b); }
  b.geoms.push(g);
}

/** 共用的頂點色材質：合併後不再用各自的純色，改用每個頂點記的顏色 */
const matCache = {};
function vcMat(kind) {
  if (matCache[kind]) return matCache[kind];
  const side = kind.endsWith('-ds') ? THREE.DoubleSide : THREE.FrontSide;
  const m = kind.startsWith('toon') ? new THREE.MeshToonMaterial({ vertexColors: true, color: '#ffffff', gradientMap: GRAD, side })
    : new THREE.MeshBasicMaterial({ vertexColors: true, color: '#ffffff', side });
  matCache[kind] = m;
  return m;
}

/**
 * 掃一遍場景，把能烘焙的網格搬進批次、從場景移除（先記錄，最後才真正合併加回場景）。
 * 跟 userData.noOcc 的用法一樣：遇到就不再往下找。
 */
function collect(root) {
  const toRemove = [];
  const walk = o => {
    if (o.userData && o.userData.noOcc) return;
    const kind = bakeKind(o);
    if (kind) { record(o, kind); toRemove.push(o); return; }   // 烘焙掉的不用再往下找孩子（沒有孩子）
    o.children.slice().forEach(walk);
  };
  root.children.slice().forEach(walk);
  toRemove.forEach(o => o.parent && o.parent.remove(o));
}

/** 全部建築、地形、工具箱都蓋完之後呼叫一次 */
export function flushBake() {
  if (flushed) return;
  flushed = true;
  scene.updateMatrixWorld(true);
  collect(scene);
  for (const b of buckets.values()) {
    const merged = mergeBufferGeometries(b.geoms, false);
    if (!merged) continue;   // 合併失敗（理論上不會）就放棄這一批，外觀不受影響，只是少省一點 draw call
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    const mat = b.kind === 'outline' ? OUT : vcMat(b.kind);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
    mesh.userData.noOcc = true; mesh.userData.baked = true;
    scene.add(mesh);
  }
  performance.mark && performance.mark('bake-flushed');
}

/** 統計（給 ?perf 和測試看） */
export function bakeStats() {
  let tris = 0;
  for (const b of buckets.values()) for (const g of b.geoms) tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  return { buckets: buckets.size, mergedTris: Math.round(tris), flushed };
}
