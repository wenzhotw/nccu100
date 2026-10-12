/**
 * 樹與椰子樹的產生器，以及大道兩旁的植栽。
 */
import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { SPH, mk, toon } from '../render/kit.js';
import { circC } from '../core/collision.js';
import { inLot } from './layout.js';

/* ---------- 樹、椰子、路燈 ---------- */
const TRUNK=new THREE.CylinderGeometry(0.2,0.3,2.6,7);
const greens=['#4c9a47','#5cb150','#6bc35b'];
function tree(x,z,s){
  if(inLot(x,z)) return;
  s=s||1; const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=Math.random()*6; scene.add(g);
  const tr=mk(TRUNK,toon('#7a5a43'),0,1.3,0,{parent:g,out:0.05}); tr.scale.setScalar(s); tr.position.y=1.3*s;
  [[0,3.6,0,1.8],[1.1,3.1,0.3,1.25],[-0.9,3.3,-0.4,1.3],[0.2,4.6,-0.2,1.15]].forEach((b,i)=>{
    const m=mk(SPH,toon(greens[(i+Math.floor(Math.abs(x)))%3]),b[0]*s,b[1]*s,b[2]*s,{parent:g,out:0.1}); m.scale.setScalar(b[3]*s);
  });
  circC(x,z,0.4*s);
}
const FROND=new THREE.ConeGeometry(0.34,3.6,4);
FROND.rotateX(Math.PI/2);
FROND.translate(0,0,1.8);
const palms=[];
function palm(x,z,h,fan){
  if(inLot(x,z)) return;
  h=h||9; const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  mk(new THREE.CylinderGeometry(fan?0.22:0.24,fan?0.3:0.34,h,9),toon(fan?'#8f7c66':'#cfc7b8'),0,h/2,0,{parent:g,out:0.04});
  if(!fan) mk(new THREE.CylinderGeometry(0.27,0.25,1.5,9),toon('#7ea84c'),0,h+0.7,0,{parent:g,out:0.03});
  const crown=new THREE.Group(); crown.position.y=fan?h:h+1.4; g.add(crown);
  const n=fan?13:9, off=Math.random()*6;
  for(let i=0;i<n;i++){ const p=new THREE.Group(); p.rotation.order='YXZ'; p.rotation.y=off+i/n*Math.PI*2; p.rotation.x=fan?(-0.5+Math.random()*0.9):(-0.15+Math.random()*0.8); crown.add(p);
    const f=mk(FROND,toon(i%2?'#4f9a3e':'#5fae46'),0,0,0,{parent:p});
    if(fan) f.scale.set(2.6,0.2,0.5+Math.random()*0.15); else f.scale.set(1.7,0.22,1+Math.random()*0.25); }
  palms.push(crown); circC(x,z,0.4);
}
[[-14,-68],[14,-68],[-17,-60],[16,-58]].forEach(p=>palm(p[0],p[1],8.5+Math.random()));
[-1,1].forEach(s=>{
  [[15,-22.5],[21,-23],[15,-41.5],[21,-41]].forEach(p=>palm(s*p[0],p[1],9+Math.random()*1.5));
  [[17.5,-27.5],[17.5,-36.5]].forEach(p=>palm(s*p[0],p[1],3.8+Math.random(),true));
});
[[-42,16.9],[-30,16.9],[30,16.9],[42,16.9]].forEach(p=>tree(p[0],p[1],0.95));
[[-36,7.5],[-29,7.5],[-21.5,7.3],[10,-5],[-10.5,-24.5],[10.5,-24.5],[-10.5,-39.5],[10.5,-39.5],[-9.5,-58],[9.5,-60],[-30,-62],[28,-8],[33,2],[28,-60],[45,-48],[31,-55]].forEach(p=>tree(p[0],p[1],0.9+Math.random()*0.3));

export { palm, palms, tree };
