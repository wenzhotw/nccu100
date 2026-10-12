/**
 * 遠山。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { GRAD } from '../../render/kit.js';

/* 遠山：四維堂後方（南側）的層層群山，北側與兩側小山 */
const MT_TREE=new THREE.IcosahedronGeometry(1,0);
function mountain(x,z,rx,h,rz,seed,cols,fogOn,trees){
  const geo=new THREE.SphereGeometry(1,56,22,0,Math.PI*2,0,Math.PI/2);
  const p=geo.attributes.position, c=new Float32Array(p.count*3), col=new THREE.Color();
  const cA=new THREE.Color(cols[0]), cB=new THREE.Color(cols[1]), cC=new THREE.Color(cols[2]);
  for(let i=0;i<p.count;i++){ let vx=p.getX(i), vy=p.getY(i), vz=p.getZ(i);
    const n=Math.sin(vx*4.1+seed)*0.5+Math.sin(vz*3.3+seed*1.7)*0.45+Math.sin((vx+vz)*7.3+seed*0.3)*0.22+Math.sin(vx*13+vz*11+seed)*0.09;
    const k=1+0.14*n*Math.min(1,vy*4); vx*=k; vz*=k; const ny=Math.max(0,vy*(1+0.28*n));
    p.setXYZ(i,vx,ny,vz);
    const t=Math.min(1,ny/1.15); col.copy(cA).lerp(cB,Math.min(1,t*1.7)); if(t>0.55) col.lerp(cC,(t-0.55)/0.45*0.7);
    const sp=Math.sin(vx*41+seed)*Math.sin(vz*37+seed*2)*Math.sin(ny*29); if(sp>0.25) col.multiplyScalar(0.86);
    c[i*3]=col.r; c[i*3+1]=col.g; c[i*3+2]=col.b; }
  geo.setAttribute('color',new THREE.BufferAttribute(c,3)); geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,new THREE.MeshToonMaterial({vertexColors:true,gradientMap:GRAD,fog:fogOn}));
  m.position.set(x,-0.5,z); m.scale.set(rx,h,rz); m.userData.noOcc=true; scene.add(m);
  trees=0;
  if(trees){ const inst=new THREE.InstancedMesh(MT_TREE,new THREE.MeshToonMaterial({color:cols[3]||cols[0],gradientMap:GRAD,fog:fogOn}),trees), o=new THREE.Object3D(); let k=0, tries=0;
    while(k<trees&&tries<trees*12){ tries++; const i=Math.floor(Math.random()*p.count), vy=p.getY(i); if(vy<0.06||vy>0.9) continue;
      const s=(1.6+Math.random()*2.2)*Math.max(1,rx/90); o.position.set(x+p.getX(i)*rx,-0.5+vy*h+s*0.4,z+p.getZ(i)*rz); o.scale.set(s,s*1.15,s); o.updateMatrix(); inst.setMatrixAt(k++,o.matrix); }
    inst.count=k; inst.userData.noOcc=true; scene.add(inst); }
  return m;
}
const MT_NEAR=['#3f7d45','#5fa354','#93c96d','#356b3b'], MT_MID=['#4c8a62','#6ea97a','#a3cf98','#3f7a55'], MT_FAR=['#7aa3c0','#93b8d1','#c4dbea'];
/* 四維堂正後方的主山脈（近） */
[[-230,-262,70,62,46,1],[-140,-275,85,88,52,2],[-40,-268,80,76,48,3],[55,-282,90,104,56,4],[150,-266,78,70,48,5],[240,-275,72,60,46,6]].forEach(m=>mountain(m[0],m[1],m[2],m[3],m[4],m[5],MT_NEAR,true,150));
/* 第二層（中） */
[[-190,-330,110,120,60,7],[-60,-345,120,138,66,8],[80,-338,115,128,62,9],[220,-325,100,110,58,10]].forEach(m=>mountain(m[0],m[1],m[2],m[3],m[4],m[5],MT_MID,true,100));
/* 最遠的藍色山稜 */
[[-260,-430,150,150,70,11],[-60,-450,170,175,75,12],[150,-440,160,160,72,13],[330,-410,130,130,64,14]].forEach(m=>mountain(m[0],m[1],m[2],m[3],m[4],m[5],MT_FAR,false,0));
/* 北側、東西兩側小山 */
[[-160,160,90,50,50,15],[40,175,110,58,55,16],[220,150,90,46,50,17]].forEach(m=>mountain(m[0],m[1],m[2],m[3],m[4],m[5],MT_MID,true,70));
[[-360,-120,70,70,90,18],[480,-110,70,62,90,19],[-360,40,60,48,70,20],[480,60,60,44,70,21]].forEach(m=>mountain(m[0],m[1],m[2],m[3],m[4],m[5],MT_NEAR,true,80));
