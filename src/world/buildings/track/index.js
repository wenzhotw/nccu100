/**
 * 田徑場：8 道藍色跑道、自然草皮內場、足球門與橄欖球門柱、跳遠沙坑、外圍欄杆。司令台在 command-stand 資料夾。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { basic, block, canvasTex, hText, mk, toon } from '../../../render/kit.js';
import { circC, obbC } from '../../../core/collision.js';
import { toW } from '../../building-kit.js';
import { defineBuilding } from '../../registry.js';

// 這棟建築的位置與尺寸（地圖、碰撞、高度判斷都會用到）
const TRK={x:80,z:-126,th:-1.25};

function build() {
  /* ---------- 田徑場 ---------- */
  function stadiumShape(L,R){ const s=new THREE.Shape(); s.moveTo(-L/2,-R); s.lineTo(L/2,-R); s.absarc(L/2,0,R,-Math.PI/2,Math.PI/2,false); s.lineTo(-L/2,R); s.absarc(-L/2,0,R,Math.PI/2,Math.PI*1.5,false); return s; }
  function stadiumRing(L,r0,r1){ const s=stadiumShape(L,r1); s.holes.push(stadiumShape(L,r0)); return s; }
  const trackG=new THREE.Group();
  trackG.position.set(TRK.x,0,TRK.z);
  trackG.rotation.y=TRK.th;
  scene.add(trackG);
  function tflat(shape,col,y){ const m=new THREE.Mesh(new THREE.ShapeGeometry(shape,32),typeof col==='string'?toon(col):col); m.rotation.x=-Math.PI/2; m.position.y=y; m.receiveShadow=true; trackG.add(m); return m; }
  /* 依照片：外圈淺灰水泥地 → 8 道藍色跑道 → 自然草皮內場（不畫足球線） */
  tflat(stadiumShape(30,21.6),'#c9cbc6',0.02);
  tflat(stadiumRing(30,12.5,19),'#4a86d0',0.03);
  tflat(stadiumShape(30,12.5),'#5aa64a',0.032);
  // 很淡的割草條紋
  for(let i=-5;i<=5;i+=2){ const st=new THREE.Mesh(new THREE.PlaneGeometry(2.6,24),toon('#62b052')); st.rotation.x=-Math.PI/2; st.position.set(i*2.6,0.036,0); st.receiveShadow=true; trackG.add(st); }
  const LINE=toon('#ffffff');
  for(let k=0;k<=8;k++){ const r=12.5+k*0.8125; tflat(stadiumRing(30,r-0.05,r+0.05),LINE,0.04); }
  const fl=(w,d,x,z,col)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),col||LINE); m.rotation.x=-Math.PI/2; m.position.set(x,0.042,z); trackG.add(m); return m; };
  // 起跑線與道次數字（照片：1、2…）
  fl(0.14,6.5,-6,-15.75);
  for(let k=0;k<8;k++){ const t=hText(String(k+1),'#ffffff','900 120px Arial,sans-serif',160,160,0);
    const p=new THREE.Mesh(new THREE.PlaneGeometry(0.62,0.62),basic({map:t,transparent:true})); p.rotation.x=-Math.PI/2; p.rotation.z=Math.PI/2; p.position.set(-7,0.045,-(12.5+(k+0.5)*0.8125)); trackG.add(p); }
  /* 足球門（體育館那一端）與橄欖球 H 門柱（綜合院館那一端） */
  { const x=-25.6, W=toon('#ffffff');
    [-3.2,3.2].forEach(z=>block(x,1.2,z,0.14,2.4,0.14,W,0.02,trackG)); block(x,2.4,0,0.14,0.14,6.5,W,0.02,trackG);
    [-3.2,3.2].forEach(z=>block(x-1.6,0.06,z,3.2,0.12,0.1,W,0,trackG)); block(x-3.2,0.06,0,0.1,0.12,6.5,W,0,trackG);
    const net=new THREE.Mesh(new THREE.PlaneGeometry(3.6,6.4),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0.35,side:THREE.DoubleSide})); net.position.set(x-1.6,1.2,0); net.rotation.y=Math.PI/2; net.rotation.x=-0.6; trackG.add(net);
    [-3.2,3.2].forEach(z=>{ const w=toW(TRK,x,z); circC(w[0],w[1],0.2); }); }
  { const x=25.6, W=toon('#ffffff');
    [-2.8,2.8].forEach(z=>{ block(x,4,z,0.16,8,0.16,W,0.02,trackG); const w=toW(TRK,x,z); circC(w[0],w[1],0.2); });
    block(x,1.5,0,0.16,0.16,5.6,W,0.02,trackG); }
  /* 跳遠沙坑：體育館那一端的灰色水泥區，上面蓋著藍色防水布和沙包 */
  { const cx=-21.5, cz=-5.5;
    fl(7.5,4.4,cx,cz,toon('#c3c5c0'));
    const tarp=new THREE.Mesh(new THREE.PlaneGeometry(5.2,2.4),toon('#2f5d8a')); tarp.rotation.x=-Math.PI/2; tarp.position.set(cx,0.06,cz); trackG.add(tarp);
    for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; mk(new THREE.SphereGeometry(0.22,8,6),toon('#3e6f9e'),cx+Math.cos(a)*2.5,0.12,cz+Math.sin(a)*1.15,{parent:trackG}).scale.set(1.3,0.6,1); } }
  [[-24,-17],[24,-17],[-24,17],[24,17]].forEach(([x,z])=>{
    mk(new THREE.CylinderGeometry(0.18,0.25,16,8),toon('#b9bec4'),x,8,z,{parent:trackG,out:0.03});
    block(x,16.4,z,2.4,1.4,0.5,toon('#f4f2e8',{emissive:'#fff2c0',emissiveIntensity:0.6}),0.03,trackG);
    const w=toW(TRK,x,z); circC(w[0],w[1],0.35);
  });
  /* 跑道外圍的白色鐵管欄杆（司令台兩側、停車場那一邊），司令台本身在 command-stand 資料夾 */
  const RAIL=toon('#f2f2ee');
  function rail(x0,x1,z){ const len=x1-x0, xc=(x0+x1)/2;
    [0.55,1.05].forEach(y=>block(xc,y,z,len,0.08,0.08,RAIL,0.015,trackG));
    for(let x=x0;x<=x1+0.01;x+=2.2) block(x,0.55,z,0.09,1.1,0.09,RAIL,0.015,trackG);
    const w=toW(TRK,xc,z); obbC(w[0],w[1],len/2,0.15,TRK.th); }
  rail(-33,-13.5,23.2); rail(13.5,33,23.2);
  /* 運動場使用須知看板 */
  { const t=canvasTex(256,192,(g,w,h)=>{ g.fillStyle='#8fa57a'; g.fillRect(0,0,w,h); g.fillStyle='#f1f0e2'; g.fillRect(10,10,w-20,h-20);
      g.fillStyle='#c0392b'; for(let i=0;i<5;i++){ g.beginPath(); g.arc(40+i*44,40,15,0,7); g.lineWidth=4; g.strokeStyle='#c0392b'; g.stroke(); }
      g.fillStyle='#2f3a2a'; g.font='900 22px "Noto Sans TC",sans-serif'; g.textAlign='center'; g.fillText('國立政治大學運動場使用須知',w/2,84);
      g.fillStyle='#6d7563'; for(let y=100;y<170;y+=10) g.fillRect(24,y,w-48,4); });
    const x=-34.5, z=23.2;
    [-1,1].forEach(d=>block(x,1,z+d*0.9,0.12,2,0.12,'#7d7462',0.015,trackG));
    block(x,1.7,z,0.1,1.3,1.9,'#8a8068',0.02,trackG);
    const p=new THREE.Mesh(new THREE.PlaneGeometry(1.75,1.2),basic({map:t})); p.position.set(x-0.06,1.7,z); p.rotation.y=-Math.PI/2; trackG.add(p);
    const w=toW(TRK,x,z); obbC(w[0],w[1],0.2,1,TRK.th); }
}

export default defineBuilding({
  id: 'track',
  name: '田徑場',
  build,
  zones: [{ priority: 50, test: p => Math.hypot(p.x - TRK.x, p.z - TRK.z) < 34 ? '田徑場' : null }],
  map: [{
    draw(g, mx, my) {
      g.save(); g.translate(mx(TRK.x), my(TRK.z)); g.rotate(-TRK.th);
      g.fillStyle = '#8fbf72'; g.strokeStyle = '#c1734f'; g.lineWidth = 8; g.beginPath(); g.ellipse(0, 0, 46, 30, 0, 0, 7); g.fill(); g.stroke(); g.restore();
      g.fillStyle = '#4a3520'; g.font = '700 22px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.fillText('田徑場', mx(TRK.x), my(TRK.z) + 7);
    },
  }],
});
