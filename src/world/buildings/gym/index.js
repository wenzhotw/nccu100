/**
 * 體育館與旁邊的球場、跑道看台。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { BOX, GRAD, basic, block, canvasTex, hText, outline, toon } from '../../../render/kit.js';
import { circC, obbC } from '../../../core/collision.js';
import { palm } from '../../vegetation.js';
import { toW } from '../../building-kit.js';
import { defineBuilding } from '../../registry.js';

// 這棟建築的位置與尺寸（地圖、碰撞、高度判斷都會用到）
const GYM={x:114,z:-156,th:-1.25};
const gymLocal=(x,z)=>{ const dx=x-GYM.x, dz=z-GYM.z, c=Math.cos(GYM.th), s=Math.sin(GYM.th); return [dx*c-dz*s, dx*s+dz*c]; };
function gymH(x,z){ const [lx,lz]=gymLocal(x,z); if(Math.abs(lx)>23) return null;
  if(lz>=10&&lz<=16.6) return 1.6; if(lz>16.6&&lz<=20.2) return Math.max(0,1.6-0.2*Math.ceil((lz-16.6)/0.45)); return null; }

function build() {
  /* ---------- 體育館：倒梯形正面、內凹門廊與斜撐柱、黃色條紋牆、整排階梯 ---------- */
  const gymG=new THREE.Group();
  gymG.position.set(GYM.x,0,GYM.z);
  gymG.rotation.y=GYM.th;
  scene.add(gymG);
  const obbL=(x0,x1,z0,z1)=>{ const w=toW(GYM,(x0+x1)/2,(z0+z1)/2); obbC(w[0],w[1],(x1-x0)/2,(z1-z0)/2,GYM.th); };
  const gTileTex=canvasTex(64,64,(g,w,h)=>{ g.fillStyle='#efefec'; g.fillRect(0,0,w,h); g.strokeStyle='#d8d8d4'; g.lineWidth=1; for(let i=0;i<=w;i+=8){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,h); g.stroke(); g.beginPath(); g.moveTo(0,i); g.lineTo(w,i); g.stroke(); } },[0.5,0.5]);
  const GTILE=new THREE.MeshToonMaterial({map:gTileTex,gradientMap:GRAD});
  const GTRIM=toon('#5d6b78');
  const trap=(b,t,y0,y1)=>{ const s=new THREE.Shape(); s.moveTo(-b,y0); s.lineTo(b,y0); s.lineTo(t,y1); s.lineTo(-t,y1); s.closePath(); return s; };
  function gExtrude(shape,depth,mat,z,out){ const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}); const m=new THREE.Mesh(g,mat); m.position.z=z; m.castShadow=m.receiveShadow=true; gymG.add(m); if(out) outline(m,out); return m; }
  /* 主量體：依照片比例，底寬 38、頂寬 32、高 11.7 的梯形（上窄下寬） */
  block(0,0.8,-2,38,1.6,24,'#e6e6e2',0,gymG);
  gExtrude(trap(19,16,1.6,13.3),24,GTILE,-14,0.12);
  { const front=trap(19,16,1.6,13.3); const hole=new THREE.Path(); hole.moveTo(-9.4,1.6); hole.lineTo(-9.4,9.5); hole.lineTo(9.4,9.5); hole.lineTo(9.4,1.6); hole.closePath(); front.holes.push(hole);
    gExtrude(front,4,GTILE,10,0.08); }
  [-1,1].forEach(s=>{ const e=new THREE.Mesh(BOX,GTRIM); e.scale.set(0.45,12.1,0.4); e.position.set(s*17.5,7.45,14.1); e.rotation.z=s*Math.atan(3/11.7); gymG.add(e); });
  block(0,13.45,0.15,32.6,0.35,28.6,GTRIM,0.03,gymG);
  block(0,14.1,-1,24,1,20,'#c9ced3',0.04,gymG);
  /* 門廊內：後牆玻璃、頂部高窗、白色橫樑、六根斜撐柱 */
  { const gl=canvasTex(256,128,(g,w,h)=>{ g.fillStyle='#27313a'; g.fillRect(0,0,w,h); g.fillStyle='#4c5d6a'; for(let x=0;x<w;x+=32) g.fillRect(x+4,10,24,h-20); g.fillStyle='#3a4650'; g.fillRect(0,h/2-3,w,6); },[3,1]);
    const p=new THREE.Mesh(new THREE.PlaneGeometry(18.8,7.9),new THREE.MeshToonMaterial({map:gl,gradientMap:GRAD})); p.position.set(0,5.55,10.02); gymG.add(p);
    const cw=canvasTex(512,64,(g,w,h)=>{ g.fillStyle='#f4f4f1'; g.fillRect(0,0,w,h); g.fillStyle='#2b343c'; for(let x=4;x<w;x+=21) g.fillRect(x,10,15,44); });
    const q=new THREE.Mesh(new THREE.PlaneGeometry(18.8,1.1),basic({map:cw})); q.position.set(0,8.9,12.6); gymG.add(q);
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(18.8,4),toon('#8d949a')); ceil.rotation.x=Math.PI/2; ceil.position.set(0,9.49,12); gymG.add(ceil); }
  block(0,7.95,13.4,18.8,0.8,1.2,'#f4f4f1',0.03,gymG);
  block(0,9.35,12.6,18.8,0.3,0.3,'#f4f4f1',0,gymG);
  const GCOLS=[-7.8,-4.7,-1.6,1.6,4.7,7.8];
  GCOLS.forEach(x=>{
    block(x,4.6,13.2,0.75,6,0.75,'#f4f4f1',0.03,gymG);
    [-1,1].forEach(s=>{ const st=new THREE.Mesh(BOX,toon('#f4f4f1')); st.scale.set(0.3,1.5,0.5); st.position.set(x+s*0.55,7.0,13.2); st.rotation.z=-s*0.75; st.castShadow=true; gymG.add(st); outline(st,0).scale.set(1.15,1.05,1.1); });
  });
  /* 黃色條紋牆 */
  const yTex=canvasTex(128,256,(g,w,h)=>{ g.fillStyle='#efc21b'; g.fillRect(0,0,w,h);
    let r=7; const rnd=()=>{ r=(r*9301+49297)%233280; return r/233280; };
    for(let c=0;c<5;c++) for(let k=0;k<3;k++){ const x=10+c*24+rnd()*6, y=10+k*80+rnd()*30, l=26+rnd()*22; g.fillStyle=(c+k)%2?'#ffffff':'#1d1d1d'; g.fillRect(x,y,4,l); } });
  [-1,1].forEach(s=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(3.75,8.4),new THREE.MeshToonMaterial({map:yTex,gradientMap:GRAD})); p.position.set(s*11.28,5.8,14.03); gymG.add(p); });
  /* 館名 */
  { const nt=hText('體育館','#1f1f1f','900 120px "Noto Serif TC","Songti TC",serif',900,170,120);
    const p=new THREE.Mesh(new THREE.PlaneGeometry(10.5,1.7),basic({map:nt,transparent:true})); p.position.set(0,10.75,14.04); gymG.add(p); }
  /* 兩側較低的附屬量體 */
  [-1,1].forEach(s=>{ const sh=new THREE.Shape(); sh.moveTo(0,0); sh.lineTo(6*s,0); sh.lineTo(4.6*s,6.5); sh.lineTo(0,6.5); sh.closePath();
    const g=new THREE.ExtrudeGeometry(sh,{depth:22,bevelEnabled:false}); const m=new THREE.Mesh(g,GTILE); m.position.set(s*18.6,0,-12); m.castShadow=m.receiveShadow=true; gymG.add(m); outline(m,0.08);
    block(s*21.6,2.8,10.02,3.4,2.2,0.1,'#3a454f',0,gymG); });
  /* 門前平台與整排階梯（高 1.6，八階） */
  block(0,0.8,13.3,46,1.6,6.6,'#d7d3ca',0.03,gymG);
  for(let i=1;i<=8;i++){ const h=1.6-0.2*i; if(h<=0) break; block(0,h/2,16.6+0.45*(i-0.5),46,h,0.45,i%2?'#cfcac0':'#d9d5cc',0.01,gymG); }
  /* 碰撞 */
  obbL(-19.3,19.3,-14,10);
  obbL(-19.3,-9.4,10,14);
  obbL(9.4,19.3,10,14);
  obbL(-24.8,-18.6,-12,10);
  obbL(18.6,24.8,-12,10);
  GCOLS.forEach(x=>{ const w=toW(GYM,x,13.2); circC(w[0],w[1],0.5); });
  /* 旁邊的綠色球場與椰子樹 */
  { const ct=new THREE.Mesh(new THREE.PlaneGeometry(13,10),toon('#4f9f6a')); ct.rotation.x=-Math.PI/2; ct.position.set(-33,0.03,8); ct.receiveShadow=true; gymG.add(ct);
    const ln=(w,d,x,z)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),toon('#ffffff')); m.rotation.x=-Math.PI/2; m.position.set(x,0.04,z); gymG.add(m); };
    ln(12,0.1,-33,12.6); ln(12,0.1,-33,3.4); ln(0.1,9.2,-39,8); ln(0.1,9.2,-27,8); ln(0.1,9.2,-33,8);
    const cr=new THREE.Mesh(new THREE.RingGeometry(1.4,1.5,32),toon('#ffffff')); cr.rotation.x=-Math.PI/2; cr.position.set(-33,0.04,8); gymG.add(cr);
    [[-26,18],[-30,16],[26,18],[30,16],[34,14]].forEach(([lx,lz])=>{ const w=toW(GYM,lx,lz); palm(w[0],w[1],8+Math.random()*1.5); }); }
}

export default defineBuilding({
  id: 'gym',
  name: '體育館',
  build,
  heightAt: gymH,
  zones: [{ priority: 60, test: p => Math.hypot(p.x - GYM.x, p.z - GYM.z) < 27 ? '體育館' : null }],
  map: [{ x: 114, z: -156, w: 36, d: 28, color: '#d6dadd', label: '體育館' }],
});
