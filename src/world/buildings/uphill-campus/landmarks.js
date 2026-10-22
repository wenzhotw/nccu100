/** 山上校區的純地標模型與碰撞資料，文字貼圖由地圖入口建立。 */
import * as THREE from 'three';
import { ANCHORS, LOBBY, STOP, STAIRS } from './layout.js';
import { heightAt } from './terrain.js';

const BOX = new THREE.BoxGeometry(1, 1, 1);
const stone = new THREE.MeshToonMaterial({ color: '#b4b0a2' });
const bronze = new THREE.MeshToonMaterial({ color: '#514a36' });
const hedge = new THREE.MeshToonMaterial({ color: '#447b42' });
const steel = new THREE.MeshToonMaterial({ color: '#26343c' });
const blue = new THREE.MeshToonMaterial({ color: '#216aaf' });
const glass = new THREE.MeshToonMaterial({ color: '#c6e5ec', transparent: true, opacity: 0.45 });
const roofMaterial = new THREE.MeshToonMaterial({ color: '#759c94' });
const signMaterial = new THREE.MeshToonMaterial({ color: '#24563e' });
const cityMaterial = new THREE.MeshToonMaterial({ color: '#7fabb4', fog: false });
const towerMaterial = new THREE.MeshToonMaterial({ color: '#528e97', fog: false });

/** 位置為核可錨點的局部偏移，牌面與通路保留半公尺淨空。 */
export function landmarkSigns() {
  return [
    ['好漢坡下', -3.5, -0.5, Math.PI / 2, '自強五舍・六舍', ANCHORS['好漢坡下']],
    ['好漢坡上', 0.5, 4.5, 0, '自強五舍・六舍', ANCHORS['五舍入口']],
    // 照片 9034：藍色直式指標立在樓梯左手邊（西側）下段的土坡上，牌面離樓梯與道路各留半公尺。
    ['九舍樓梯下', -0.36, -3.3, 0, '自強九舍・十舍', { x: STAIRS[2].path.at(-1)[0], z: STAIRS[2].path.at(-1)[1] }],
    // 坡頂牌立在廣場西南角路邊，牌面迎向上坡來車，指往中庭的九舍大廳。
    ['外部斜坡上', 1.24, 6.04, 2.48, '自強九舍・十舍', { x: LOBBY.door.x, z: LOBBY.door.z }],
    // 山居牌以站牌 STOP 為基準，放在道路對面的空地，沿南側道路往東指向安九。
    ['山居下車點', 0, 6.7, 0, '安九食堂・自強九舍', { x: 14.9, z: 4.6 }],
  ].map(([anchor, dx, dz, yaw, destination, target]) => {
    const a = anchor === '山居下車點' ? STOP : ANCHORS[anchor], x = a.x + dx, z = a.z + dz;
    const toward = { x: target.x, z: target.z };
    const faces = [1, -1].map(side => {
      const facing = yaw + (side < 0 ? Math.PI : 0);
      const tx = toward.x - x, tz = toward.z - z;
      // 讀者前方是牌面法線的反方向，右方是文字平面的局部正 x。
      const right = tx * Math.cos(facing) - tz * Math.sin(facing);
      const forward = -tx * Math.sin(facing) - tz * Math.cos(facing);
      const angle = Math.atan2(right, forward);
      const arrow = Math.abs(angle) <= Math.PI / 4 ? '↑'
        : Math.abs(angle) >= Math.PI * 3 / 4 ? '↓' : angle > 0 ? '→' : '←';
      return { side, toward: { ...toward }, text: `${arrow} ${destination}` };
    });
    return { anchor, x, z, base: heightAt(x, z), yaw, toward, faces, text: faces[0].text, width: anchor === '九舍樓梯下' ? 0.7 : 2.2, height: anchor === '九舍樓梯下' ? 2.4 : 0.65, color: anchor === '九舍樓梯下' ? '#216aaf' : '#24563e' };
  });
}

function canopyPosts() {
  const a = ANCHORS['遮雨棚西端'];
  return [-1, 1].map(dz => ({ x: a.x, z: a.z + dz, base: heightAt(a.x, a.z + dz) }));
}

function shelters() {
  const a = ANCHORS['好漢坡站'];
  return [-1, 0, 1].map(i => {
    const x = a.x + i * 2.8, z = a.z + 1.2 - i;
    return { x, z, base: heightAt(x, z) };
  });
}

/** 同材質方塊集中成實例，重複零件不增加獨立繪製物件。 */
function boxes(parent, name, material, parts) {
  const mesh = new THREE.InstancedMesh(BOX, material, parts.length), o = new THREE.Object3D();
  parts.forEach(([x, y, z, w, h, d], i) => {
    o.position.set(x, y, z); o.scale.set(w, h, d); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
  });
  mesh.name = name; parent.add(mesh); return mesh;
}

function placed(parent, name) {
  const a = ANCHORS[name], group = new THREE.Group(); group.name = name;
  group.position.set(a.x, heightAt(a.x, a.z), a.z); parent.add(group); return group;
}

/** 碰撞只包住落地零件，圓環四周不設看不見的整圈障礙。 */
export function landmarkColliders() {
  const a = ANCHORS['蔣公銅像'];
  const statue = [[0, 0, 1.1, 0.9], [-2.2, 0, 0.3, 2.3], [2.2, 0, 0.3, 2.3],
    [0, -2.2, 1.9, 0.3], [0, 2.2, 1.9, 0.3]].map(([x, z, hx, hz]) =>
    ({ landmark: '蔣公銅像', cx: a.x + x, cz: a.z + z, hx, hz, th: 0 }));
  const station = shelters().flatMap(s => [
    { landmark: '好漢坡站', cx: s.x, cz: s.z + 0.55, hx: 1.1, hz: 0.06, th: 0 },
    ...[-1.05, 1.05].map(dx => ({ landmark: '好漢坡站', cx: s.x + dx, cz: s.z - 0.5, hx: 0.06, hz: 0.06, th: 0 })),
  ]);
  const posts = canopyPosts().map(p => ({ landmark: '遮雨棚', cx: p.x, cz: p.z, hx: 0.12, hz: 0.12, th: 0 }));
  const signs = landmarkSigns().map(s => ({ landmark: '指路牌', sign: s.anchor,
    cx: s.x, cz: s.z, hx: s.width / 2, hz: 0.08, th: s.yaw }));
  return [...statue, ...station, ...posts, ...signs];
}

export function createLandmarks() {
  const root = new THREE.Group(); root.name = '山上校區地標';
  const statue = placed(root, '蔣公銅像');
  boxes(statue, '石材基座', stone, [[0, 0.7, 0, 2.2, 1.4, 1.8]]);
  boxes(statue, '騎馬像', bronze, [[0, 2.1, 0, 1.9, 0.65, 0.65],
    [0.75, 2.6, 0, 0.45, 0.9, 0.5], [0.95, 3, 0, 0.65, 0.35, 0.45],
    [-0.6, 1.65, -0.23, 0.18, 0.9, 0.18], [-0.6, 1.65, 0.23, 0.18, 0.9, 0.18],
    [0.6, 1.65, -0.23, 0.18, 0.9, 0.18], [0.6, 1.65, 0.23, 0.18, 0.9, 0.18],
    [-0.1, 2.85, 0, 0.45, 0.9, 0.5], [-0.1, 3.5, 0, 0.4, 0.4, 0.4]]);
  boxes(statue, '圓環綠籬', hedge, [[-2.2, 0.5, 0, 0.6, 1, 4.6], [2.2, 0.5, 0, 0.6, 1, 4.6],
    [0, 0.5, -2.2, 3.8, 1, 0.6], [0, 0.5, 2.2, 3.8, 1, 0.6]]);
  const station = placed(root, '好漢坡站'), a = ANCHORS['好漢坡站'];
  station.userData.shelters = shelters();
  const frames = [], panes = [];
  for (const s of station.userData.shelters) {
    const x = s.x - a.x, z = s.z - a.z, base = s.base - station.position.y;
    for (const dx of [-1.05, 1.05]) for (const dz of [-0.5, 0.55]) frames.push([x + dx, base + 1.2, z + dz, 0.12, 2.4, 0.12]);
    frames.push([x, base + 2.45, z, 2.4, 0.16, 1.5]);
    panes.push([x, base + 1.3, z + 0.55, 2.1, 1.9, 0.06]);
  }
  boxes(station, '候車亭黑框', steel, frames);
  boxes(station, '候車亭玻璃', glass, panes);
  boxes(station, '藍色站牌', blue, [[0, 2.1, 0.7, 1, 0.55, 0.1]]);
  const canopy = placed(root, '遮雨棚西端'); canopy.name = '遮雨棚';
  const west = ANCHORS['遮雨棚西端'], east = ANCHORS['遮雨棚東端'];
  canopy.userData.posts = canopyPosts();
  // 東端銜接既有建築，僅西端路外落柱，整片棚下保持淨空。
  boxes(canopy, '遮雨棚柱', steel, canopy.userData.posts.map(p => {
    const h = canopy.position.y + 2.8 - p.base;
    return [p.x - west.x, p.base - canopy.position.y + h / 2, p.z - west.z, 0.24, h, 0.24];
  }));
  boxes(canopy, '遮雨棚頂', roofMaterial, [[(east.x - west.x) / 2, 2.9, 0, east.x - west.x + 0.4, 0.2, 2.6]]);
  const signs = new THREE.Group(); signs.name = '指路牌'; root.add(signs);
  for (const s of landmarkSigns()) {
    const g = new THREE.Group(); g.name = `指路牌：${s.anchor}`;
    g.position.set(s.x, s.base, s.z); g.rotation.y = s.yaw; signs.add(g);
    boxes(g, '指路牌柱', steel, [[0, 1.1, 0, 0.12, 2.2, 0.12]]);
    boxes(g, '指路牌板', s.anchor === '九舍樓梯下' ? blue : signMaterial, [[0, 2.05, 0, s.width, s.height, 0.14]]);
  }
  const viewpoint = ANCHORS['觀景步道'], city = new THREE.Group(); city.name = '台北市區遠景';
  const cx = viewpoint.x - 285, cz = viewpoint.z - 285;
  city.position.set(cx, heightAt(cx, cz), cz); city.userData.noOcc = true; root.add(city);
  const blocks = Array.from({ length: 18 }, (_, i) => {
    const h = 12 + i % 5 * 6;
    return [(i % 9 - 4) * 17, h / 2, Math.floor(i / 9) * 22, 10 + i % 3 * 2, h, 12];
  });
  boxes(city, '台北市區方塊群', cityMaterial, blocks);
  const tower = new THREE.Group(); tower.name = '台北101'; city.add(tower);
  boxes(tower, '101基座與尖塔', towerMaterial, [[0, 10, 0, 18, 20, 18], [0, 132, 0, 7, 14, 7], [0, 146, 0, 1.2, 18, 1.2]]);
  const tiers = new THREE.InstancedMesh(new THREE.CylinderGeometry(10, 7, 13, 4), towerMaterial, 8);
  const o = new THREE.Object3D();
  for (let i = 0; i < 8; i++) {
    o.position.set(0, 26.5 + i * 13, 0); o.rotation.y = Math.PI / 4;
    const width = 1 - i * 0.025; o.scale.set(width, 1, width); o.updateMatrix(); tiers.setMatrixAt(i, o.matrix);
  }
  tiers.name = '101節狀塔身'; tower.add(tiers);
  city.traverse(o => { o.userData.noOcc = true; });
  return root;
}
