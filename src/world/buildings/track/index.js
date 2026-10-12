/**
 * 田徑場。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { block, mk, toon } from '../../../render/kit.js';
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
  tflat(stadiumShape(30,20.5),'#80b4e6',0.02);
  tflat(stadiumRing(30,12.5,18),'#3d7fd1',0.03);
  tflat(stadiumShape(30,12.5),'#5cb54a',0.032);
  for(let i=-3;i<=3;i+=2){ const st=new THREE.Mesh(new THREE.PlaneGeometry(4.3,24),toon('#6cc458')); st.rotation.x=-Math.PI/2; st.position.set(i*4.3,0.036,0); st.receiveShadow=true; trackG.add(st); }
  const LINE=toon('#ffffff');
  for(let r=12.5;r<=18.01;r+=1.1) tflat(stadiumRing(30,r-0.06,r+0.06),LINE,0.04);
  const fl=(w,d,x,z)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),LINE); m.rotation.x=-Math.PI/2; m.position.set(x,0.042,z); trackG.add(m); };
  fl(0.12,20,0,0);
  fl(28,0.12,0,10);
  fl(28,0.12,0,-10);
  fl(0.12,20,14,0);
  fl(0.12,20,-14,0);
  { const cc=new THREE.Mesh(new THREE.RingGeometry(2.8,2.95,40),LINE); cc.rotation.x=-Math.PI/2; cc.position.y=0.042; trackG.add(cc); }
  [-1,1].forEach(s=>{ fl(0.12,8,s*10,0); fl(4,0.12,s*12,4); fl(4,0.12,s*12,-4);
    [-1.6,1.6].forEach(z=>block(s*14,1,z,0.12,2,0.12,'#ffffff',0.02,trackG)); block(s*14,2,0,0.12,0.12,3.3,'#ffffff',0.02,trackG); });
  [[-24,-17],[24,-17],[-24,17],[24,17]].forEach(([x,z])=>{
    mk(new THREE.CylinderGeometry(0.18,0.25,16,8),toon('#b9bec4'),x,8,z,{parent:trackG,out:0.03});
    block(x,16.4,z,2.4,1.4,0.5,toon('#f4f2e8',{emissive:'#fff2c0',emissiveIntensity:0.6}),0.03,trackG);
    const w=toW(TRK,x,z); circC(w[0],w[1],0.35);
  });
  /* 跑道旁的看台棚 */
  block(0,1.6,23,9,3.2,3.5,'#f1f1ee',0.03,trackG); block(0,3.35,23,10,0.3,4.4,'#e2e3e0',0.03,trackG);
  { const w=toW(TRK,0,23); obbC(w[0],w[1],4.6,1.9,TRK.th); }
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
