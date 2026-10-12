/**
 * 醉夢溪北岸的沿溪道路。
 * 依 Google Earth 照片：從體育館南邊沿著溪往東，經過八角亭、四維網球場、游泳池南側，
 * 接上行政大樓旁車道、四維堂東側車道、環山一道，最後到社資中心附近。
 * 路線座標在 world/layout.js 的 CREEK_ROAD，地圖和區域判斷也共用。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { toon } from '../../render/kit.js';
import { CREEK_ROAD } from '../layout.js';

const W = 4.2;   // 游泳館南側跟溪之間很窄（照片上也是），所以路不寬
for (let i = 0; i < CREEK_ROAD.length - 1; i++) {
  const [x0, z0] = CREEK_ROAD[i], [x1, z1] = CREEK_ROAD[i + 1];
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
  const g = new THREE.Group(); g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); g.rotation.y = Math.atan2(dx, dz); scene.add(g);
  // 多鋪 W 的長度，讓轉角接得起來
  const road = new THREE.Mesh(new THREE.PlaneGeometry(W, len + W * 0.9), toon('#5b6270'));
  road.rotation.x = -Math.PI / 2; road.position.y = 0.0205; road.receiveShadow = true; g.add(road);
  [-W / 2 + 0.2, W / 2 - 0.2].forEach(u => {
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.12, len), toon('#f4f4ee')); e.rotation.x = -Math.PI / 2; e.position.set(u, 0.023, 0); g.add(e);
  });
  for (let v = -len / 2 + 2; v < len / 2 - 1; v += 4) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2), toon('#f4f4ee')); d.rotation.x = -Math.PI / 2; d.position.set(0, 0.023, v); g.add(d);
  }
}
