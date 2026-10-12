/**
 * 四維道兩側的門字型綠屋頂建築。
 */
import * as THREE from 'three';
import { GRAD, basic, block, canvasTex, mk, plane } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { winMat } from '../main-gate/index.js';

/* ---------- 四維道兩側：門字型綠屋頂建築 ---------- */
function hipRoof(L,W,H,ridge){
  const r=ridge!==undefined?ridge:Math.max(0.01,(L-W)/2), a=[-L/2,0,-W/2], b=[L/2,0,-W/2], c=[L/2,0,W/2], d=[-L/2,0,W/2], e=[-r,H,0], f=[r,H,0];
  const v=[].concat(d,c,f, d,f,e, b,a,e, b,e,f, c,b,f, a,d,e);
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(v,3)); g.computeVertexNormals(); return g;
}
const ROOF=new THREE.MeshToonMaterial({color:'#5e8058',gradientMap:GRAD,side:THREE.DoubleSide});
const wallTex=canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#e5e1d6'; g.fillRect(0,0,w,h); g.fillStyle='#5f7584'; g.fillRect(18,34,92,50); g.fillStyle='#d2cdc0'; g.fillRect(14,84,100,8); g.fillStyle='#cfcabd'; g.fillRect(0,0,w,5); });
function wing(cx,cz,L,W,alongZ){
  const t=wallTex.clone(); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(Math.round(L/3.2),2); t.needsUpdate=true;
  const sx=alongZ?W:L, sz=alongZ?L:W;
  block(cx,3.25,cz,sx,6.5,sz,new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}),0.05);
  block(cx,0.3,cz,sx+0.06,0.6,sz+0.06,'#8f8a80');
  const r=mk(hipRoof(L+1.8,W+1.8,2.6),ROOF,cx,6.5,cz,{out:0.06}); if(alongZ) r.rotation.y=Math.PI/2;
  block(cx,9.12,cz,alongZ?0.3:L-W,0.22,alongZ?L-W:0.3,'#46623f');
  boxC(cx-sx/2,cx+sx/2,cz-sz/2,cz+sz/2);
}
[-1,1].forEach(s=>{
  wing(s*28,-32.5,35,6,true);
  wing(s*21.5,-17.5,19,5,false);
  wing(s*21.5,-47.5,19,5,false);
  block(s*23.4,4.1,-32,3.2,8.2,6,'#ece9e1',0.05);
  block(s*23.4,8.3,-32,3.6,0.25,6.4,'#d6d2c8',0.03);
  const ry=s>0?-Math.PI/2:Math.PI/2;
  plane(2.4,2.9,basic({color:'#3f4a52'}),s*21.78,1.45,-32,0,ry);
  plane(3.8,1.6,winMat,s*21.78,5.4,-32,0,ry);
  block(s*21.7,3.1,-32,0.4,0.18,6.2,'#d6d2c8');
  boxC(s>0?21.8:-25,s>0?25:-21.8,-35,-29);
  [-25.5,-38.5].forEach(z=>{ block(s*13.4,0.45,z,1,0.9,6,'#4f9a48',0.04); boxC(s*13.4-0.5,s*13.4+0.5,z-3,z+3); });
});

export { hipRoof };
