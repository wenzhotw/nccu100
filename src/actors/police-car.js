/**
 * 警車模型（停在校門東側）。
 */
import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { BOX, basic, block, canvasTex, mk, outline, toon } from '../render/kit.js';

/* 警車 */
function makePolice(){
  const g=new THREE.Group(); scene.add(g);
  const lo=mk(BOX,toon('#22305a'),0,0.55,0,{parent:g}); lo.scale.set(1.8,0.5,4.3); outline(lo,0).scale.set(1.04,1.1,1.02);
  const up=mk(BOX,toon('#f6f6f2'),0,0.95,0,{parent:g}); up.scale.set(1.8,0.32,4.3); outline(up,0).scale.set(1.04,1.12,1.02);
  const cab=mk(BOX,toon('#f6f6f2'),0,1.42,-0.3,{parent:g}); cab.scale.set(1.62,0.66,2.5); outline(cab,0).scale.set(1.05,1.08,1.04);
  [-1,1].forEach(s=>{ const w=new THREE.Mesh(new THREE.PlaneGeometry(2.2,0.5),toon('#27313b')); w.position.set(s*0.82,1.45,-0.3); w.rotation.y=s*Math.PI/2; g.add(w); });
  { const w=new THREE.Mesh(new THREE.PlaneGeometry(1.45,0.52),toon('#27313b')); w.position.set(0,1.45,0.96); w.rotation.x=-0.25; g.add(w); }
  block(-0.38,1.83,-0.3,0.72,0.14,0.32,'#d8433f',0.015,g); block(0.38,1.83,-0.3,0.72,0.14,0.32,'#2d58c4',0.015,g);
  const tx=canvasTex(256,64,(c,w,h)=>{ c.fillStyle='#22305a'; c.fillRect(0,0,w,h); c.fillStyle='#ffffff'; c.font='900 40px "Noto Sans TC",sans-serif'; c.textBaseline='middle'; c.fillText('警察',14,h/2+2); c.font='700 26px sans-serif'; c.fillText('POLICE',110,h/2+2); });
  [-1,1].forEach(s=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(2.0,0.42),basic({map:tx})); p.position.set(s*0.915,0.55,0.1); p.rotation.y=s*Math.PI/2; g.add(p); });
  [[-0.85,1.35],[0.85,1.35],[-0.85,-1.35],[0.85,-1.35]].forEach(([x,z])=>{ const w=mk(new THREE.CylinderGeometry(0.34,0.34,0.24,14),toon('#222228'),x,0.34,z,{parent:g}); w.rotation.z=Math.PI/2; });
  [-0.6,0.6].forEach(x=>{ mk(BOX,toon('#fff7d6',{emissive:'#fff2c0',emissiveIntensity:0.5}),x,0.78,2.16,{parent:g,cast:false}).scale.set(0.4,0.16,0.04); mk(BOX,toon('#d23a3a'),x,0.8,-2.16,{parent:g,cast:false}).scale.set(0.4,0.14,0.04); });
  return g;
}
const police=makePolice();
police.position.set(-14.6,0,3.5);
police.rotation.y=Math.PI/2;

export { police };
