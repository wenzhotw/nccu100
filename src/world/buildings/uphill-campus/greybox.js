/** 山上灰盒的純建模與碰撞資料，供場景接線與 Node 幾何驗收共用。 */
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { R, LEVELS, STAIRS, RAMPS, LAYOUT, FLOOR_H, REGIONS, FILL_REGIONS, BRIDGES, BUILDING_FLOORS, LOBBY, PLAZA, ZQ10, footprintOf } from './layout.js';
import { heightAt, platformLevel, wallSegments, projectToPath, rampHeight, landscapeAt } from './terrain.js';
import { addRampDetails, rampDetailColliders } from './ramp-details.js';
import { addLobbyExterior } from './lobby-exterior.js';
import { addCourtyard, courtyardColliders, dTowerGeometries } from './courtyard.js';
import {createLobby,lobbyColliders} from './lobby.js';
import { zq10Colliders, deckGeometry } from './zq10-model.js';

const CELL = 0.25;
/** 每兩根木樁之間兩條橫木，跨懸崖時留空。 */
export function fenceRails() {
  const rails = [];
  const corners = [[R.x0, R.z0], [R.x1, R.z0], [R.x1, R.z1], [R.x0, R.z1]];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % 4], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const at = d => a.map((v, k) => v + (b[k] - v) * d / length);
    for (let d = 0; d < length; d += 2.5) {
      const start = at(d), end = at(Math.min(length, d + 2.5));
      const ha = heightAt(...start), hb = heightAt(...end);
      if (Math.abs(ha - hb) > 0.5) continue;
      for (const offset of [0.45, 0.9]) rails.push({ a: start, b: end, y: Math.max(ha, hb) + offset });
    }
  });
  return rails;
}
const TOP = new THREE.BufferGeometry();
TOP.setAttribute('position', new THREE.Float32BufferAttribute([
  -0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5,
  -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0, -0.5,
], 3));
TOP.computeVertexNormals();
const BOX = new THREE.BoxGeometry(1, 1, 1);
const SIDES = new THREE.BufferGeometry();
const boxFaces = BOX.toNonIndexed(), boxVertices = boxFaces.attributes.position;
const sideVertices = [];
for (let i = 0; i < boxVertices.count; i++) {
  if (boxFaces.attributes.normal.getY(i) !== 0) continue;
  sideVertices.push(boxVertices.getX(i), boxVertices.getY(i), boxVertices.getZ(i));
}
SIDES.setAttribute('position', new THREE.Float32BufferAttribute(sideVertices, 3));
SIDES.computeVertexNormals();
boxFaces.dispose();
const grass = new THREE.MeshToonMaterial({ color: '#8fca6c' });
const concrete = new THREE.MeshToonMaterial({ color: '#c9b98f' });
const buildingMaterial = new THREE.MeshToonMaterial({ color: '#d8d4cc' });
const wallMaterial = new THREE.MeshToonMaterial({ color: '#a9a49a' });
const edgeMaterial = new THREE.MeshBasicMaterial({ color: '#2a2c4a', side: THREE.BackSide });
const roadMaterial = new THREE.MeshToonMaterial({ color: '#6e7177' });

/** 道路按四分之一公尺取樣，跨越懸崖或大台階的小格留空，不接出垂直路面。 */
function addRoads(group) {
  const cells = new Map();
  for (const road of LAYOUT.roads) for (let i = 1; i < road.pts.length; i++) {
    const [ax, az] = road.pts[i - 1], [bx, bz] = road.pts[i];
    const dx = bx - ax, dz = bz - az, squared = dx * dx + dz * dz;
    if (!squared) continue;
    const x0 = Math.max(R.x0, Math.floor((Math.min(ax, bx) - 3) / CELL) * CELL);
    const x1 = Math.min(R.x1, Math.max(ax, bx) + 3);
    const z0 = Math.max(R.z0, Math.floor((Math.min(az, bz) - 3) / CELL) * CELL);
    const z1 = Math.min(R.z1, Math.max(az, bz) + 3);
    for (let z = z0; z < z1; z += CELL) for (let x = x0; x < x1; x += CELL) {
      const cx = x + CELL / 2, cz = z + CELL / 2;
      const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / squared));
      if ((cx - ax - t * dx) ** 2 + (cz - az - t * dz) ** 2 > 9) continue;
      if (RAMPS.some(ramp => projectToPath(cx, cz, ramp.path).distance <= (ramp.width / 2) ** 2)) continue;
      const key = `${x},${z}`;
      if (cells.has(key)) continue;
      const h = heightAt(cx, cz);
      if ([[0.001, 0.001], [CELL - 0.001, 0.001], [0.001, CELL - 0.001], [CELL - 0.001, CELL - 0.001]]
        .some(([ox, oz]) => Math.abs(heightAt(x + ox, z + oz) - h) > 0.051)) continue;
      cells.set(key, { x, z, h });
    }
  }
  const geometries = [];
  for (let z = R.z0; z < R.z1; z += CELL) {
    let start = null, h = 0;
    for (let x = R.x0; x <= R.x1; x += CELL) {
      const cell = cells.get(`${x},${z}`);
      if (start !== null && (!cell || Math.abs(cell.h - h) > 1e-8)) {
        geometries.push(TOP.clone().scale(x - start, 1, CELL).translate((x + start) / 2, h + 0.03, z + CELL / 2));
        start = null;
      }
      if (cell && start === null) { start = x; h = cell.h; }
    }
  }
  // 核可柏油路中線保留完整水平窄帶，補足階梯與坡道挖槽邊緣的小格。
  for (const road of LAYOUT.roads.filter(r => [510739837,1313447898,1313447899].includes(r.osm))) {
    const points = road.osm === 1313447899 ? road.pts.slice(-2) : road.pts;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b[0] - a[0], dz = b[1] - a[1];
      geometries.push(TOP.clone().scale(Math.hypot(dx, dz), 1, 1.6)
        .rotateY(-Math.atan2(dz, dx)).translate((a[0]+b[0])/2, 12.03, (a[1]+b[1])/2));
    }
  }
  addMerged(group, '道路', geometries, roadMaterial);
}

function addMerged(group, name, geometries, material) {
  if (!geometries.length) return;
  const geometry = mergeBufferGeometries(geometries.map(g => g.index ? g.toNonIndexed() : g));
  geometries.forEach(g => g.dispose());
  const mesh = new THREE.Mesh(geometry, material); mesh.name = name; group.add(mesh);
  return mesh;
}

function buildings() {
  return LAYOUT.buildings.filter(b => b.pts.every(([x, z]) =>
    x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1)).map(b => ({ ...b, pts: footprintOf(b),
    base: b.osm === LOBBY.osm ? LOBBY.base : Math.min(...b.pts.map(([x, z]) => LEVELS[platformLevel(x, z)])),
    height: (BUILDING_FLOORS[b.osm] ?? (/十舍/.test(b.name) ? 8 : /九舍/.test(b.name) ? 6 : /五舍|六舍|七八舍/.test(b.name) ? 5 : 2)) * FLOOR_H,
  }));
}

/** 依 x 切線保留輪廓的一側，east 為真時留 x 大於切線的部分。 */
export function clipBuildingX(pts, cutX, east) {
  // 交換兩軸後沿用 clipBuilding：第二軸小於切線的一側是西側。
  return clipBuilding(pts.map(([x, z]) => [z, x]), cutX, !east).map(([z, x]) => [x, z]);
}

/** 十舍架空：整棟或切線東側的牆底抬到架空層頂（照片 8988、8998）。 */
function liftedParts(b) {
  const lift = ZQ10.lifted.find(l => l.building === b.osm);
  if (!lift) return [b];
  const top = b.base + b.height;
  if (lift.fromX === undefined) return [{ ...b, base: lift.bottom, height: top - lift.bottom }];
  const east = { ...b, pts: clipBuildingX(b.pts, lift.fromX, true), base: lift.bottom, height: top - lift.bottom };
  const west = clipBuildingX(b.pts, lift.fromX, false), ground = ZQ10.groundFloor;
  if (ground?.building !== b.osm) return [{ ...b, pts: west }, east];
  // 一樓挖出門廊與走廊：一樓只擠出實心塊，樓上恢復完整輪廓。
  return [{ ...b, pts: west, base: ground.top, height: top - ground.top },
    ...ground.parts.map(pts => ({ ...b, pts, height: ground.top - b.base })), east];
}

/** 沿核可切線保留原輪廓，不以包圍盒取代建築外形。 */
function clipBuilding(pts, cutZ, north) {
  const result = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const inside = p => north ? p[1] <= cutZ : p[1] >= cutZ;
    if (inside(a)) result.push(a);
    if (inside(a) !== inside(b)) {
      const t = (cutZ - a[1]) / (b[1] - a[1]);
      result.push([a[0] + t * (b[0] - a[0]), cutZ]);
    }
  }
  return result;
}

/** 斜坡牆用共用接點連成封閉牆帶，內部取樣處不產生端蓋或描邊。 */
function rampWallGeometry(segments, outline = 0) {
  const nodes = [{ p: segments[0].a, low: segments[0].lowA, high: segments[0].highA },
    ...segments.map(s => ({ p: s.b, low: s.lowB, high: s.highB }))];
  const vertices = [], indices = [];
  const normals = segments.map(s => {
    const dx = s.b[0]-s.a[0], dz = s.b[1]-s.a[1], length = Math.hypot(dx,dz);
    return [-dz/length,dx/length];
  });
  nodes.forEach(({p,low,high},i) => {
    const a=normals[Math.max(0,i-1)], b=normals[Math.min(i,normals.length-1)];
    const d=1+a[0]*b[0]+a[1]*b[1], width=0.25+outline;
    const nx=(a[0]+b[0])/d*width, nz=(a[1]+b[1])/d*width;
    vertices.push(p[0]+nx,low-outline,p[1]+nz, p[0]-nx,low-outline,p[1]-nz,
      p[0]+nx,high+1.1+outline,p[1]+nz, p[0]-nx,high+1.1+outline,p[1]-nz);
  });
  const face=(a,b,c,d)=>indices.push(a,c,b,a,d,c);
  for(let i=1;i<nodes.length;i++) {
    const a=(i-1)*4,b=i*4;
    face(a,a+2,b+2,b); face(a+1,b+1,b+3,a+3);
    face(a+2,a+3,b+3,b+2); face(a,b,b+1,a+1);
  }
  face(0,1,3,2);
  const last=(nodes.length-1)*4; face(last,last+2,last+3,last+1);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(Array(nodes.length*8).fill(0),2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

/** 各棟擠出後才合併，描邊也以每棟中心膨脹，避免整座校區一起放大。 */
function addBuildingsAndWalls(group) {
  const shapes = [], edges = [];
  group.userData.buildings = buildings().map(b => ({ osm: b.osm, base: b.base, height: b.height }));
  for (const b of buildings()) {
    if(b.osm===LOBBY.osm)continue;
    const bridge = BRIDGES.find(v => v.building === b.osm);
    const parts = bridge ? [
      { pts: clipBuilding(b.pts, bridge.cutZ, true), base: b.base, height: b.height },
      { pts: clipBuilding(b.pts, bridge.cutZ, false), base: bridge.bottom, height: b.base + b.height - bridge.bottom, bridge: true },
    ] : liftedParts(b);
    for (const part of parts) {
      const shape = new THREE.Shape(part.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      const g = new THREE.ExtrudeGeometry(shape, { depth: part.height, bevelEnabled: false, steps: 1 });
      g.rotateX(-Math.PI / 2).translate(0, part.base, 0);
      if (part.bridge) {
        const mesh = new THREE.Mesh(g, new THREE.MeshToonMaterial({ color: '#d8d4cc', side: THREE.DoubleSide }));
        mesh.name = '高架連通段'; group.add(mesh);
      } else shapes.push(g);
      g.computeBoundingBox();
      const center = g.boundingBox.getCenter(new THREE.Vector3()), size = g.boundingBox.getSize(new THREE.Vector3());
      edges.push(g.clone().translate(-center.x, -center.y, -center.z)
        .scale(1 + 0.08 / size.x, part.bridge ? 1 : 1 + 0.08 / size.y, 1 + 0.08 / size.z)
        .translate(center.x, center.y, center.z));
    }
    if (bridge) for (const [x, z] of bridge.posts) {
      const base = heightAt(x, z);
      shapes.push(BOX.clone().scale(bridge.postWidth, bridge.bottom - base, bridge.postWidth)
        .translate(x, (bridge.bottom + base) / 2, z));
    }
  }
  // 大廳以南的建物由十二公尺平台補至大廳地板，避免牆底浮空。
  const lobby = buildings().find(b => b.osm === LOBBY.osm);
  const fillShape = new THREE.Shape(clipBuilding(lobby.pts, LOBBY.bounds.z1, false).map(([x,z]) => new THREE.Vector2(x,-z)));
  const fill = new THREE.ExtrudeGeometry(fillShape, { depth: 3, bevelEnabled: false, steps: 1 });
  fill.rotateX(-Math.PI/2).translate(0,12,0);
  fill.computeBoundingBox();
  const fc=fill.boundingBox.getCenter(new THREE.Vector3()), fs=fill.boundingBox.getSize(new THREE.Vector3());
  edges.push(fill.clone().translate(-fc.x,-fc.y,-fc.z).scale(1+0.08/fs.x,1+0.08/fs.y,1+0.08/fs.z).translate(fc.x,fc.y,fc.z));
  addMerged(group, '九舍大廳下層填充', [fill], buildingMaterial);
  // 照片 9022、9027 的九舍 D 區西端圓弧樓梯間，併進建築網格。
  const tower = dTowerGeometries(); shapes.push(tower.body); edges.push(tower.edge);
  addMerged(group, '建築', shapes, buildingMaterial);
  addMerged(group, '建築描邊', edges, edgeMaterial);
  const walls = [], wallEdges = [];
  const chains = wallChains();
  for (const { a, b, segments, ramp } of chains) {
    if (ramp) {
      walls.push(rampWallGeometry(segments));
      wallEdges.push(rampWallGeometry(segments, 0.03));
      continue;
    }
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const theta = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    const along = p => ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / length;
    const bottom = segments.flatMap(s => [[along(s.a), s.low], [along(s.b), s.low]]);
    const top = segments.flatMap(s => [[along(s.a), s.high + 1.1], [along(s.b), s.high + 1.1]]).reverse();
    const shape = new THREE.Shape([...bottom, ...top].map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false, steps: 1 });
    g.translate(0, 0, -0.25).rotateY(theta).translate(a[0], 0, a[1]);
    walls.push(g);
    g.computeBoundingBox();
    const center = g.boundingBox.getCenter(new THREE.Vector3());
    const low = Math.min(...segments.map(s => s.low)), high = Math.max(...segments.map(s => s.high)) + 1.1;
    // 整串只有一份背面描邊，避免畫出每個取樣段的接縫。
    wallEdges.push(g.clone().translate(-center.x, -center.y, -center.z).rotateY(-theta)
      .scale(1 + 0.06 / length, 1 + 0.06 / (high - low), 1.12)
      .rotateY(theta).translate(center.x, center.y, center.z));
  }
  addMerged(group, '擋土牆', walls, wallMaterial).userData.chains = chains.length;
  addMerged(group, '擋土牆描邊', wallEdges, edgeMaterial).userData.chains = chains.length;
}

/** 只在通路包圍框附近作精確投影，其餘直接取平台，避免整圖重算階梯。 */
const passages = [...STAIRS.map(p => ({ ...p, kind: p.id === 'jiu-plaza' ? 'jiu-stairs' : 'stairs' })),
  ...RAMPS.map(p => ({ ...p, kind: 'ramp' }))].map(p => ({ ...p,
  x0: Math.min(...p.path.map(v => v[0])) - p.width / 2,
  x1: Math.max(...p.path.map(v => v[0])) + p.width / 2,
  z0: Math.min(...p.path.map(v => v[1])) - p.width / 2,
  z1: Math.max(...p.path.map(v => v[1])) + p.width / 2,
}));

function surfaceAt(x, z) {
  for (const p of passages) {
    if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
    for (let i = 1; i < p.path.length; i++) {
      const [ax, az] = p.path[i - 1], [bx, bz] = p.path[i];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - ax - dx * t, z - az - dz * t) <= p.width / 2) {
        return { kind: p.kind, h: heightAt(x, z) };
      }
    }
  }
  return landscapeAt(x, z) ?? { kind: 'platform', h: LEVELS[platformLevel(x, z)] };
}

/** 等高網格先合併成水平長條，再合併上下相同長條，通路自動挖槽。 */
function surfaceRects() {
  const rects = [];
  let previous = new Map();
  for (let z = R.z0; z < R.z1; z += CELL) {
    const current = new Map();
    let run = null;
    function flush() {
      if (!run) return;
      const key = `${run.x0},${run.x1},${run.kind},${run.h}`;
      const existing = previous.get(key);
      if (existing) { existing.z1 = z + CELL; current.set(key, existing); }
      else { rects.push(run); current.set(key, run); }
    }
    // 分區內不逐格重算多邊形，只在該列跨越邊線或進入通路時切段。
    const cuts = new Set([R.x0, R.x1]), cz = z + CELL / 2;
    const cut = x => cuts.add(Math.max(R.x0, Math.min(R.x1,
      R.x0 + Math.ceil((x - R.x0) / CELL - 0.5) * CELL)));
    for (const region of [...REGIONS, ...FILL_REGIONS]) region.poly.forEach(([ax, az], i) => {
      const [bx, bz] = region.poly[(i + 1) % region.poly.length];
      if ((az > cz) !== (bz > cz)) cut(ax + (bx - ax) * (cz - az) / (bz - az));
    });
    // 紅磚廣場邊界也切段，廣場外的平台不會被整段算成廣場而漏畫。
    if (cz >= PLAZA.z0 && cz <= PLAZA.z1) { cut(PLAZA.x0); cut(PLAZA.x1); }
    const nearby = passages.filter(p => cz >= p.z0 - 8 && cz <= p.z1 + 8);
    nearby.forEach(p => { cut(p.x0 - 8); cut(p.x1 + 8); });
    const xs = [...cuts].sort((a, b) => a - b);
    for (let j = 1; j < xs.length; j++) {
      const detailed = nearby.some(p => xs[j] > p.x0 - 8 && xs[j - 1] < p.x1 + 8);
      for (let x = xs[j - 1]; x < xs[j];) {
        const end = detailed ? Math.min(xs[j], x + CELL) : xs[j];
        const value = surfaceAt(x + CELL / 2, z + CELL / 2);
        if (run && run.kind === value.kind && Math.abs(run.h - value.h) < 1e-8) run.x1 = end;
        else { flush(); run = { x0: x, x1: end, z0: z, z1: z + CELL, ...value }; }
        x = end;
      }
    }
    flush(); previous = current;
  }
  return rects;
}

/** 不依賴 engine 或 document，離線與瀏覽器取得同一份幾何。 */
export function createGreybox() {
  const group = new THREE.Group(); group.name = '山上校區灰盒';
  const rects = surfaceRects();
  const tops = [], sides = [];
  for (const r of rects.filter(r => r.kind === 'platform')) {
    let pieces=[r];
    // 大廳範圍的草地挖掉，地板與圓形開口由 lobby.js 接手。
    const L=LOBBY.bounds;
    if(r.h===LOBBY.base&&r.x1>L.x0&&r.x0<L.x1&&r.z1>L.z0&&r.z0<L.z1) {
      const x0=Math.max(r.x0,L.x0),x1=Math.min(r.x1,L.x1),z0=Math.max(r.z0,L.z0),z1=Math.min(r.z1,L.z1);
      pieces=[{...r,x1:x0},{...r,x0:x1},{...r,x0,x1,z1:z0},{...r,x0,x1,z0:z1}].filter(p=>p.x1>p.x0&&p.z1>p.z0);
    }
    // 側面也只留在大廳範圍外，否則地板開口底下會看到一整片平台側壁。
    for(const p of pieces) {
      tops.push(TOP.clone().scale(p.x1-p.x0,1,p.z1-p.z0).translate((p.x0+p.x1)/2,p.h,(p.z0+p.z1)/2));
      if (p.h > 0) sides.push(SIDES.clone().scale(p.x1 - p.x0, p.h, p.z1 - p.z0)
        .translate((p.x0 + p.x1) / 2, p.h / 2, (p.z0 + p.z1) / 2));
    }
  }
  addMerged(group, '平台側面', sides, concrete);
  const platformGeometry = mergeBufferGeometries(tops);
  tops.forEach(g => g.dispose());
  const platform = new THREE.Mesh(platformGeometry, grass);
  platform.name = '平台'; platform.userData.surface = true; group.add(platform);
  {
    const parts = rects.filter(r => r.kind === 'stairs');
    const inst = new THREE.InstancedMesh(BOX, concrete, parts.length), o = new THREE.Object3D();
    parts.forEach((r, i) => {
      const depth = 0.3;
      o.position.set((r.x0 + r.x1) / 2, r.h - depth / 2, (r.z0 + r.z1) / 2);
      o.scale.set(r.x1 - r.x0, depth, r.z1 - r.z0); o.updateMatrix(); inst.setMatrixAt(i, o.matrix);
    });
    inst.name = '階梯與休息平台';
    inst.userData.surface = true; group.add(inst);
  }
  const slopes = rects.filter(r => r.kind === 'ramp').map(r => {
    const geometry = TOP.clone().scale(r.x1 - r.x0, 1, r.z1 - r.z0)
      .translate((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2);
    const ramp = RAMPS.reduce((best, candidate) =>
      projectToPath((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, candidate.path).distance
      < projectToPath((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, best.path).distance ? candidate : best);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      vertices.setY(i, vertices.getZ(i) >= ramp.path[0][1] ? ramp.from
        : rampHeight(ramp, projectToPath(vertices.getX(i), vertices.getZ(i), ramp.path).s));
    }
    geometry.computeVertexNormals();
    return geometry;
  });
  addMerged(group, '坡道斜面', slopes, roadMaterial).userData.surface = true;
  addBuildingsAndWalls(group);
  addRoads(group);
  addLobbyExterior(group, { addMerged, BOX, buildingMaterial, edgeMaterial });
  group.add(createLobby());
  addCourtyard(group, { addMerged, TOP, BOX, wallMaterial, edgeMaterial });
  addRampDetails(group, rects, { addMerged, TOP, BOX, grass, concrete, edgeMaterial });
  // 十舍磚地中庭，貼圖由 zq10.js 進場時換上。
  const deck = new THREE.Mesh(deckGeometry(), new THREE.MeshToonMaterial({ color: '#a3a8ae' }));
  deck.name = '十舍磚地中庭'; deck.position.y = 0.02; deck.userData.surface = true; deck.userData.surfaceOffset = 0.02; deck.userData.noOcc = true; group.add(deck);
  return group;
}

/** 本地長軸沿牆，角度配合 collision.js 的旋轉座標慣例。 */
export function greyboxColliders() {
  const runs = wallChains().flatMap(chain => {
    if (!chain.ramp) return [chain];
    const result = [];
    for (const s of chain.segments) {
      const last = result.at(-1);
      if (last && Math.abs((last.b[0]-last.a[0])*(s.b[1]-s.a[1])
        -(last.b[1]-last.a[1])*(s.b[0]-s.a[0])) < 1e-6) last.b = s.b;
      else result.push({ ...s });
    }
    return result;
  });
  const walls = runs.map(({ a, b, ramp, side }) => {
    const th = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    return { kind: 'wall', ...(ramp ? { ramp, side } : {}), obb: true, cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2,
      hx: Math.hypot(b[0] - a[0], b[1] - a[1]) / 2, hz: 0.25,
      th, cs: Math.cos(th), sn: Math.sin(th) };
  });
  return [...walls, ...rampDetailColliders(), ...courtyardColliders(), ...lobbyColliders(), ...zq10Colliders(), ...buildings().flatMap(b => {
    // 架空層可以走，改由 zq10Colliders 的柱子與邊沿擋人；部分架空只留切線西側實心段。
    const lift = ZQ10.lifted.find(l => l.building === b.osm);
    if (lift && lift.fromX === undefined) return [];
    // 一樓挖出門廊與走廊的棟別，只用一樓實心塊擋人。
    if (lift && ZQ10.groundFloor?.building === b.osm) return ZQ10.groundFloor.parts.flatMap(pts => buildingBoxes({ ...b, pts }));
    if (lift) return buildingBoxes({ ...b, pts: clipBuildingX(b.pts, lift.fromX, false) });
    if(b.osm===LOBBY.osm)return buildingBoxes({...b,pts:clipBuilding(b.pts,LOBBY.bounds.z1,false)});
    const bridge = BRIDGES.find(v => v.building === b.osm);
    if (!bridge) return buildingBoxes(b);
    return [...buildingBoxes({ ...b, pts: clipBuilding(b.pts, bridge.cutZ, true) }),
      ...bridge.posts.map(([cx, cz]) => ({ kind: 'post', bridge: b.osm, obb: true,
        cx, cz, hx: bridge.postWidth / 2, hz: bridge.postWidth / 2, th: 0, cs: 1, sn: 0 }))];
  })];
}

/** 一般牆接合同方向段，斜坡牆連同轉角接成牆帶，保留階梯與路口開口。 */
export function wallChains() {
  const chains = [];
  for (const segment of wallSegments()) {
    const last = chains.at(-1), { a, b, source } = segment;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const lx = last ? last.b[0] - last.a[0] : 0, lz = last ? last.b[1] - last.a[1] : 0;
    if (last && last.source === source && Math.hypot(last.b[0] - a[0], last.b[1] - a[1]) < 1e-6
      && ((segment.ramp && last.ramp === segment.ramp && last.side === segment.side)
        || (Math.abs(lx * dz - lz * dx) < 1e-6 && lx * dx + lz * dz > 0))) {
      last.b = b; last.segments.push(segment);
    } else chains.push({ a, b, source, ...(segment.ramp ? { ramp: segment.ramp, side: segment.side } : {}), segments: [segment] });
  }
  return chains;
}

/** 沿建築主軸取內部網格，以最多四個大矩形保留凹處的通路。 */
function buildingBoxes(b) {
  let longest = 0, th = 0;
  b.pts.forEach(([x, z], i) => {
    const next = b.pts[(i + 1) % b.pts.length], dx = next[0] - x, dz = next[1] - z;
    if (dx * dx + dz * dz > longest) { longest = dx * dx + dz * dz; th = -Math.atan2(dz, dx); }
  });
  const cs = Math.cos(th), sn = Math.sin(th), step = 0.25;
  const pts = b.pts.map(([x, z]) => [x * cs - z * sn, x * sn + z * cs]);
  const x0 = Math.min(...pts.map(p => p[0])), z0 = Math.min(...pts.map(p => p[1]));
  const nx = Math.ceil((Math.max(...pts.map(p => p[0])) - x0) / step);
  const nz = Math.ceil((Math.max(...pts.map(p => p[1])) - z0) / step);
  function inside(x, z) {
    let yes = false;
    pts.forEach(([ax, az], i) => {
      const [bx, bz] = pts[(i + 1) % pts.length];
      if ((az > z) !== (bz > z) && x < ax + (bx - ax) * (z - az) / (bz - az)) yes = !yes;
    });
    return yes;
  }
  const cells = Array.from({ length: nz }, (_, z) => Array.from({ length: nx }, (_, x) =>
    inside(x0 + (x + 0.5) * step, z0 + (z + 0.5) * step)));
  const result = [];
  const covered = Array.from({ length: nz }, () => Array(nx).fill(false));
  for (let part = 0; part < 4; part++) {
    const sums = Array.from({ length: nz + 1 }, () => Array(nx + 1).fill(0));
    for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++)
      sums[z + 1][x + 1] = sums[z][x + 1] + sums[z + 1][x] - sums[z][x] + (cells[z][x] && !covered[z][x] ? 1 : 0);
    const heights = Array(nx).fill(0);
    let best = null, area = 0;
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) heights[x] = cells[z][x] ? heights[x] + 1 : 0;
      const stack = [];
      for (let x = 0; x <= nx; x++) {
        let left = x;
        while (stack.length && stack.at(-1).h > (heights[x] ?? 0)) {
          const v = stack.pop(); left = v.x;
          const top = z - v.h + 1;
          const gain = sums[z + 1][x] - sums[top][x] - sums[z + 1][v.x] + sums[top][v.x];
          if (gain > area) {
            area = gain; best = { x: v.x, z: top, w: x - v.x, d: v.h };
          }
        }
        if (x < nx) stack.push({ x: left, h: heights[x] });
      }
    }
    if (!best) break;
    for (let z = best.z; z < best.z + best.d; z++) for (let x = best.x; x < best.x + best.w; x++) covered[z][x] = true;
    const x = x0 + (best.x + best.w / 2) * step, z = z0 + (best.z + best.d / 2) * step;
    result.push({ kind: 'building', building: b.osm, obb: true,
      cx: x * cs + z * sn, cz: -x * sn + z * cs, hx: best.w * step / 2 + 0.05, hz: best.d * step / 2 + 0.05, th, cs, sn });
  }
  return result;
}


