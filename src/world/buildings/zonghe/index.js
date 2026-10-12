/**
 * 綜合院館。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { GRAD, block, canvasTex } from '../../../render/kit.js';
import { obbC } from '../../../core/collision.js';
import { toW } from '../../building-kit.js';
import { defineBuilding } from '../../registry.js';

// 這棟建築的位置與尺寸（地圖、碰撞、高度判斷都會用到）
const ZH={x:130,z:-84,th:-2.21};

function build() {
  /* ---------- 綜合院館：田徑場另一端的兩棟高樓 ---------- */
  const zhG=new THREE.Group();
  zhG.position.set(ZH.x,0,ZH.z);
  zhG.rotation.y=ZH.th;
  scene.add(zhG);
  const zhTex=(rx,ry,band)=>canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#e9cdbd'; g.fillRect(0,0,w,h);
    g.fillStyle='#d9b9a7'; g.fillRect(0,0,w,4);
    if(band){ g.fillStyle='#f3e2d6'; g.fillRect(0,78,w,12); g.fillStyle='#6d6766'; g.fillRect(6,40,w-12,34); }
    else { g.fillStyle='#6d6766'; [[18,36],[74,36]].forEach(([x,y])=>g.fillRect(x,y,34,38)); } },[rx,ry]);
  const zm=(t)=>new THREE.MeshToonMaterial({map:t,gradientMap:GRAD});
  block(-11,24,0,16,48,14,zm(zhTex(6,16)),0.1,zhG);
  block(-11,48.4,0,16.4,0.8,14.4,'#d9b9a7',0.05,zhG);
  block(-13,49.8,-2,6,2,5,'#e3c6b4',0.04,zhG);
  block(9,21,-2,14,42,16,zm(zhTex(5,14)),0.1,zhG);
  block(10.5,43.5,-3.5,11,3,13,zm(zhTex(4,1)),0.06,zhG);
  block(6,46,-4,6,2,8,'#e3c6b4',0.04,zhG);
  for(let y=4;y<41;y+=3) block(13,y,6.4,7.6,0.35,0.6,'#f5e7dc',0.02,zhG);
  block(13,21,5.95,7.4,42,0.1,zm(zhTex(3,14,true)),0,zhG);
  block(-0.5,7,-7,10,14,10,'#8d939b',0.05,zhG);
  block(-0.5,3.2,8.5,12,0.4,5,'#e7e4dd',0.04,zhG);
  [-5,4].forEach(x=>block(x,1.5,10.6,0.4,3,0.4,'#e7e4dd',0.02,zhG));
  { const a=toW(ZH,-11,0), b=toW(ZH,9,-2), c=toW(ZH,-0.5,-7);
    obbC(a[0],a[1],8.2,7.2,ZH.th); obbC(b[0],b[1],7.2,8.2,ZH.th); obbC(c[0],c[1],5.2,5.2,ZH.th); }
}

export default defineBuilding({
  id: 'zonghe',
  name: '綜合院館',
  build,
  zones: [{ priority: 40, test: p => Math.hypot(p.x - ZH.x, p.z - ZH.z) < 24 ? '綜合院館' : null }],
  map: [{ x: 130, z: -84, w: 30, d: 24, color: '#e9cdbd', label: '綜合院館' }],
});
