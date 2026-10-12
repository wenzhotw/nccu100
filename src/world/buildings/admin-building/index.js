/**
 * 行政大樓。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { BOX, GRAD, SPH, basic, block, canvasTex, hText, mk, outline, toon } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { swZ } from '../../layout.js';
import { defineBuilding } from '../../registry.js';

function build() {
  /* ---------- 行政大樓（四維堂右側）：米色磁磚、深窗、中央凹入門廊、頂部直條窗、一樓柱廊 ---------- */
  const AD={x:45,z:-83};
  const adG=new THREE.Group();
  adG.position.set(AD.x,0,AD.z);
  scene.add(adG);
  function adWinTex(rx,ry){ return canvasTex(128,128,(g,w,h)=>{
    g.fillStyle='#ddd1be'; g.fillRect(0,0,w,h);
    g.strokeStyle='#cbbfab'; g.lineWidth=1; for(let i=0;i<=w;i+=8){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,h); g.stroke(); g.beginPath(); g.moveTo(0,i); g.lineTo(w,i); g.stroke(); }
    g.fillStyle='#cdc3b3'; g.fillRect(34,24,60,70);
    g.fillStyle='#b9ae9c'; g.fillRect(34,24,8,70); g.fillRect(34,24,60,8);
    g.fillStyle='#3e444a'; g.fillRect(42,32,44,54);
    g.fillStyle='#2a2e33'; g.fillRect(42,32,44,10);
    g.fillStyle='#5f6f7a'; g.fillRect(62,42,3,44);
    g.fillStyle='#d9cfbf'; g.fillRect(30,94,68,5);
  },[rx,ry]); }
  function adSlotTex(rx,ry){ return canvasTex(128,128,(g,w,h)=>{
    g.fillStyle='#ddd1be'; g.fillRect(0,0,w,h);
    g.strokeStyle='#cbbfab'; g.lineWidth=1; for(let i=0;i<=w;i+=8){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,h); g.stroke(); g.beginPath(); g.moveTo(0,i); g.lineTo(w,i); g.stroke(); }
    [[26,0],[80,0]].forEach(([x])=>{ g.fillStyle='#bdb29f'; g.fillRect(x-4,10,30,112); g.fillStyle='#3a4046'; g.fillRect(x,14,22,104); g.fillStyle='#262a2f'; g.fillRect(x,14,6,104); });
  },[rx,ry]); }
  function adGlassTex(rx){ return canvasTex(128,64,(g,w,h)=>{ g.fillStyle='#5f7d82'; g.fillRect(0,0,w,h); g.fillStyle='rgba(255,255,255,.18)'; g.fillRect(0,0,w,18); g.fillStyle='#d8d2c6'; for(let x=0;x<=w;x+=32) g.fillRect(x-2,0,4,h); g.fillRect(0,40,w,3); },[rx,1]); }
  const tm=t=>new THREE.MeshToonMaterial({map:t,gradientMap:GRAD});
  const ADC='#dbd0bd', ADC2='#cbbfab';
  function adBox(x,y,z,sx,sy,sz,matF,matS,out){ const m=new THREE.Mesh(BOX,[matS,matS,toon('#cfc7b9'),toon('#cfc7b9'),matF,matS]); m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.castShadow=m.receiveShadow=true; adG.add(m); if(out){ const o=outline(m,0); o.scale.set(1+2*out/sx,1+2*out/sy,1+2*out/sz); } return m; }
  /* 一樓：內縮的玻璃量體＋柱廊 */
  adBox(0,2.25,-0.2,28.4,4.5,23.6,tm(adGlassTex(9)),tm(adGlassTex(8)),0.04);
  for(let x=-15;x<=15.01;x+=3.75){ if(Math.abs(x)<7) continue; block(x,2.25,12.4,0.9,4.5,0.9,ADC,0.03,adG); }
  [-15.4,15.4].forEach(x=>{ for(let z=-11.5;z<=11.6;z+=4.6) block(x,2.25,z,0.9,4.5,0.9,ADC,0.03,adG); });
  /* 二至六樓：後段主體與兩側前凸量體，中間凹入成門廊 */
  adBox(0,13.25,-2,32,17.5,22,tm(adWinTex(10,5)),tm(adWinTex(7,5)),0.07);
  [-11.25,11.25].forEach(x=>adBox(x,13.25,11,9.5,17.5,4,tm(adWinTex(3,5)),tm(adWinTex(1,5)),0.06));
  /* 門廊內：每層陽台、矮牆、兩根巨柱、校名 */
  [8,11.5,15,18.5].forEach(y=>{ block(0,y,10.8,13,0.35,3.6,ADC2,0.02,adG); block(0,y+0.6,12.45,13,1.1,0.3,ADC,0.02,adG); });
  [-3,3].forEach(x=>block(x,11,12.3,1.3,22,1.3,ADC,0.04,adG));
  block(0,21.6,12,13,0.8,2.4,ADC2,0.03,adG);
  const adName=hText('樓大政行','#3b3936','700 120px "Noto Serif TC","Songti TC",serif',760,160,110);
  { const m=new THREE.Mesh(new THREE.PlaneGeometry(5.6,1.0),basic({map:adName,transparent:true})); m.position.set(0,12.15,12.62); adG.add(m); }
  /* 一樓入口與門前平台、階梯 */
  { const d=new THREE.Mesh(new THREE.PlaneGeometry(8,3.4),tm(adGlassTex(4))); d.position.set(0,2.9,11.62); adG.add(d); }
  block(0,0.6,12,14,1.2,6,'#cfc6b6',0.03,adG);
  [[0.9,15.5],[0.6,16.5],[0.3,17.5]].forEach(([h,z])=>block(0,h/2,z,14,h,1,'#ddd5c7',0.02,adG));
  [-1,1].forEach(s=>block(s*7.2,1.3,15.5,0.3,0.9,6,'#b9b1a2',0.02,adG));
  /* 腰線、七八樓直條窗、屋頂 */
  block(0,22.4,0,33.6,0.8,27.6,ADC2,0.05,adG);
  adBox(0,25.9,0,33,6.2,27,tm(adSlotTex(10,2)),tm(adSlotTex(8,2)),0.07);
  block(0,29.3,0,33.6,0.6,27.6,ADC2,0.05,adG);
  block(-5,30.9,-3,11,2.6,9,'#d8cfc0',0.04,adG);
  block(8,30.6,4,6,2,5,'#d8cfc0',0.04,adG);
  [-9,-6].forEach(x=>{ const t=new THREE.Mesh(new THREE.CylinderGeometry(1,1,2.2,14),toon('#c9c5bc')); t.position.set(x,30.7,6); t.castShadow=true; adG.add(t); outline(t,0.04); });
  { const a=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,5,5),toon('#9a9a9a')); a.position.set(10,32.5,-6); adG.add(a); }
  /* 門前廣場：蘑菇柱、球形灌木花台 */
  [31.5,35.5,54.5,58.5].forEach(x=>{
    mk(new THREE.CylinderGeometry(0.42,0.5,3,10),toon('#bab4a9'),x,1.5,-65.2,{out:0.03});
    mk(new THREE.CylinderGeometry(1.05,0.45,0.5,12),toon('#c6c0b4'),x,3.2,-65.2,{out:0.03});
    circC(x,-65.2,0.55);
  });
  [[33,-68.5],[57,-68.5]].forEach(([x,z])=>{
    block(x,0.3,z,3.4,0.6,2.2,'#b9ad9a',0.03);
    [[-0.8,'#9b5b3e'],[0.8,'#5f9d4a']].forEach(([dx,c])=>{ const b=mk(SPH,toon(c),x+dx,1.05,z,{}); b.scale.setScalar(0.55); outline(b,0.08); });
    boxC(x-1.7,x+1.7,z-1.1,z+1.1);
  });
  [[37,-65],[53,-65]].forEach(([x,z])=>{ mk(new THREE.CylinderGeometry(0.06,0.08,4.2,6),toon('#7d8288'),x,2.1,z,{out:0.02}); mk(SPH,toon('#fff6dc',{emissive:'#ffe6a8',emissiveIntensity:0.6}),x,4.3,z,{}).scale.setScalar(0.25); circC(x,z,0.2); });
  /* 碰撞：主體、兩側前凸量體、巨柱 */
  boxC(AD.x-16.2,AD.x+16.2,AD.z-13.5,AD.z+9);
  boxC(AD.x-16.2,AD.x-6.5,AD.z+9,AD.z+13);
  boxC(AD.x+6.5,AD.x+16.2,AD.z+9,AD.z+13);
  [-3,3].forEach(x=>circC(AD.x+x,AD.z+12.3,0.75));
  boxC(AD.x-6.5,AD.x+6.5,AD.z+9,AD.z+11.6);
  boxC(AD.x-7.4,AD.x-7,AD.z+13,AD.z+18.5);
  boxC(AD.x+7,AD.x+7.4,AD.z+13,AD.z+18.5);
}

export default defineBuilding({
  id: 'admin-building',
  name: '行政大樓',
  build,
  // 門前四階台階
  heightAt(x, z) {
    if (x > 38 && x < 52) { if (z <= -68 && z > -71.4) return 1.2; if (z <= -67 && z > -68) return 0.9; if (z <= -66 && z > -67) return 0.6; if (z <= -65 && z > -66) return 0.3; }
    return null;
  },
  zones: [{ priority: 170, test: p => (p.x > 27.3 && p.z < swZ(p.x)) ? '行政大樓前' : null }],
  map: [{ x: 45, z: -90, w: 34, d: 26, color: '#ddd2be', label: '行政大樓' }],
});
