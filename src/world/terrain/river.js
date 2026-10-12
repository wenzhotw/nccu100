/**
 * 醉夢溪（指南溪）與小橋。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { block } from '../../render/kit.js';
import { circC } from '../../core/collision.js';
import { WV, waterU } from '../../render/water.js';

/* ---------- 醉夢溪（地圖上的指南溪），在四維堂與圖書館後方 ---------- */
const RIV=[[-250,-126],[-185,-136],[-115,-143],[-70,-152],[-20,-164],[20,-178],[45,-200],[60,-230]];
const rivMat=new THREE.ShaderMaterial({uniforms:waterU,vertexShader:WV,
  fragmentShader:'uniform float t;varying vec3 vW;void main(){float f=sin((vW.x*0.6+vW.z*0.8)*0.9+t*2.2+sin(vW.x*1.3+t)*1.2);float g=sin(vW.z*0.35-t*1.3+vW.x*0.5);vec3 c=mix(vec3(0.20,0.56,0.70),vec3(0.46,0.81,0.86),0.5+0.25*g);c=mix(c,vec3(0.96,0.99,1.0),smoothstep(0.88,0.97,f)*0.85);gl_FragColor=vec4(c,1.0);}'});
for(let i=0;i<RIV.length-1;i++){
  const [x0,z0]=RIV[i],[x1,z1]=RIV[i+1], dx=x1-x0, dz=z1-z0, len=Math.hypot(dx,dz);
  const g=new THREE.Group(); g.position.set((x0+x1)/2,0,(z0+z1)/2); g.rotation.y=Math.atan2(dx,dz); scene.add(g);
  const w=new THREE.Mesh(new THREE.PlaneGeometry(6,len+3),rivMat); w.rotation.x=-Math.PI/2; w.position.y=0.03; g.add(w);
  [-1,1].forEach(s=>{ block(s*3.25,0.22,0,0.5,0.44,len+3,'#a8a091',0.02,g); block(s*3.25,0.47,0,0.7,0.08,len+3,'#c6bdac',0,g); });
}
const BR={x:-45,z:-158}, BD={x:0.973,z:-0.233}, BN={x:0.233,z:0.973};
{ const brG=new THREE.Group(); brG.position.set(BR.x,0,BR.z); brG.rotation.y=Math.atan2(BN.x,BN.z); scene.add(brG);
  block(0,0.2,0,4.6,0.4,9,'#b98552',0.04,brG);
  for(let z=-4.2;z<=4.21;z+=0.7) block(0,0.41,z,4.5,0.02,0.05,'#9c6c40',0,brG);
  [-2.2,2.2].forEach(x=>{ for(let z=-4.3;z<=4.31;z+=1.075) block(x,0.9,z,0.18,0.9,0.18,'#c9533d',0.025,brG); block(x,1.32,0,0.22,0.14,8.8,'#d95f45',0.025,brG); }); }
for(let i=0;i<RIV.length-1;i++){ const [x0,z0]=RIV[i],[x1,z1]=RIV[i+1], len=Math.hypot(x1-x0,z1-z0);
  for(let t=0;t<=len;t+=1.8){ const x=x0+(x1-x0)*t/len, z=z0+(z1-z0)*t/len; if(Math.hypot(x-BR.x,z-BR.z)<6) continue; circC(x,z,3.4); } }
for(let v=-4.4;v<=4.41;v+=0.8) [-2.2,2.2].forEach(u=>circC(BR.x+u*BD.x+v*BN.x,BR.z+u*BD.z+v*BN.z,0.22));
function riverDist(x,z){ let best=1e9; for(let i=0;i<RIV.length-1;i++){ const [x0,z0]=RIV[i],[x1,z1]=RIV[i+1], dx=x1-x0, dz=z1-z0, t=Math.max(0,Math.min(1,((x-x0)*dx+(z-z0)*dz)/(dx*dx+dz*dz))); best=Math.min(best,Math.hypot(x-x0-dx*t,z-z0-dz*t)); } return best; }

export { BD, BN, BR, RIV, riverDist };
