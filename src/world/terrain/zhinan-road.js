/**
 * 指南路對面的行道樹、公車站、機車。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { BOX, basic, block, canvasTex, mk, outline, plane, toon } from '../../render/kit.js';
import { boxC, circC } from '../../core/collision.js';
import { tree } from '../vegetation.js';

/* ---------- 指南路對面：行道樹、公車站、機車 ---------- */
// 麥當勞到八方雲集那段（shop-street.js）實景沒有行道樹，騎樓前直接是機車
for(let x=-143;x<=190;x+=11) if(x<82||x>148) tree(x,37,0.9);
mk(new THREE.CylinderGeometry(0.06,0.06,2.8,6),toon('#4a5560'),27,1.4,17.4,{out:0.02});
const busTex=canvasTex(256,320,(g,W,H)=>{ g.fillStyle='#1f5fae'; g.fillRect(0,0,W,H); g.fillStyle='#fff'; g.textAlign='center'; g.font='900 92px "Noto Sans TC",sans-serif'; g.fillText('政大',W/2,140); g.font='500 40px "Noto Sans TC",sans-serif'; g.fillText('公車站',W/2,220); });
block(27,2.6,17.4,0.9,1.1,0.08,'#1f5fae',0.02);
plane(0.86,1.06,basic({map:busTex}),27,2.6,17.45);
circC(27,17.4,0.15);
const WHEEL=new THREE.CylinderGeometry(0.22,0.22,0.12,12);
for(let i=0;i<6;i++){
  const g=new THREE.Group(); g.position.set(-38+i*1.3,0,14.6); g.rotation.y=Math.PI+(Math.random()-.5)*.15; scene.add(g);
  const c=['#e9eef2','#d6463a','#f0c94a','#5b8ed6','#9fd6c2','#2c2f38'][i%6];
  const b=mk(BOX,toon(c),0,0.52,0,{parent:g}); b.scale.set(0.42,0.5,1.3); outline(b,0).scale.set(1.12,1.1,1.04);
  const s=mk(BOX,toon('#2d2b33'),0,0.83,-0.2,{parent:g}); s.scale.set(0.36,0.1,0.6);
  [-0.5,0.55].forEach(z=>{ const w=mk(WHEEL,toon('#26242c'),0,0.22,z,{parent:g}); w.rotation.z=Math.PI/2; });
  const hb=mk(BOX,toon('#3a3d45'),0,1.05,0.55,{parent:g}); hb.scale.set(0.6,0.06,0.06);
}
boxC(-38.5,-31,13.8,15.4);
