/**
 * 建模工具箱：卡通材質、描邊、方塊、平面、文字貼圖。所有建築都用這些函式。
 */
import * as THREE from 'three';
import { scene } from '../core/engine.js';

/* ---------- helpers ---------- */
function gradTex(steps){
  const d=new Uint8Array(steps.length*4);
  steps.forEach((v,i)=>{d[i*4]=d[i*4+1]=d[i*4+2]=v;d[i*4+3]=255;});
  const t=new THREE.DataTexture(d,steps.length,1,THREE.RGBAFormat);
  t.minFilter=t.magFilter=THREE.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;
}
/* 柔邊賽璐珞光照：陰影與受光之間是一條柔和但明確的明暗交界，亮面帶一點高光 */
function rampTex(){
  const N=256, d=new Uint8Array(N*4);
  for(let i=0;i<N;i++){ const x=i/(N-1);
    const s=x<0.40?0:x>0.50?1:(x-0.40)/0.10, ss=s*s*(3-2*s);
    let v=0.54+0.46*ss; const h=x<0.88?0:x>0.95?1:(x-0.88)/0.07; v+=0.05*h*h*(3-2*h);
    const c=Math.min(255,Math.round(v*255)); d[i*4]=d[i*4+1]=d[i*4+2]=c; d[i*4+3]=255; }
  const t=new THREE.DataTexture(d,N,1,THREE.RGBAFormat); t.minFilter=t.magFilter=THREE.LinearFilter; t.generateMipmaps=false; t.needsUpdate=true; return t;
}
const GRAD=rampTex();
/* 所有卡通材質加上邊緣光（rim light），讓角色與建築輪廓更立體 */
THREE.ShaderLib.toon.fragmentShader=THREE.ShaderLib.toon.fragmentShader.replace('#include <output_fragment>',
  `{ float rimD=1.0-clamp(dot(normal,normalize(vViewPosition)),0.0,1.0);
     float rimA=smoothstep(0.62,0.80,rimD)*0.30*clamp(normal.y*0.5+0.6,0.0,1.0);
     outgoingLight+=diffuseColor.rgb*vec3(1.0,0.95,0.86)*rimA; }
   #include <output_fragment>`);
const matCache={};
function toon(c,extra){
  const k=c+JSON.stringify(extra||{});
  if(!matCache[k]) matCache[k]=new THREE.MeshToonMaterial(Object.assign({color:c,gradientMap:GRAD},extra||{}));
  return matCache[k];
}
const OUT=new THREE.MeshBasicMaterial({color:'#2a2c4a',side:THREE.BackSide});
function outline(mesh,t){
  const g=mesh.geometry; if(!g.boundingBox) g.computeBoundingBox();
  const s=new THREE.Vector3(); g.boundingBox.getSize(s);
  const o=new THREE.Mesh(g,OUT);
  o.scale.set(1+2*t/Math.max(s.x,.01),1+2*t/Math.max(s.y,.01),1+2*t/Math.max(s.z,.01));
  o.castShadow=false; o.receiveShadow=false; mesh.add(o); return o;
}
function mk(geo,mat,x,y,z,o){
  o=o||{};
  const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z);
  m.castShadow=o.cast!==false; m.receiveShadow=true;
  if(o.out) outline(m,o.out);
  (o.parent||scene).add(m); return m;
}
const BOX=new THREE.BoxGeometry(1,1,1);
const SPH=new THREE.IcosahedronGeometry(1,1);
function block(x,y,z,sx,sy,sz,mat,out,parent){
  if(typeof mat==='string') mat=toon(mat);
  const m=mk(BOX,mat,x,y,z,{parent}); m.scale.set(sx,sy,sz);
  if(out){ const o=outline(m,0); o.scale.set(1+2*out/sx,1+2*out/sy,1+2*out/sz); }
  return m;
}
function canvasTex(w,h,draw,rep){
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const g=c.getContext('2d'); draw(g,w,h);
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; t.anisotropy=4;
  if(rep){ t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rep[0],rep[1]); }
  t.redraw=()=>{g.clearRect(0,0,w,h);draw(g,w,h);t.needsUpdate=true;}; return t;
}
function plane(w,h,mat,x,y,z,rx,ry){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
  m.position.set(x,y,z); m.rotation.x=rx||0; m.rotation.y=ry||0; m.receiveShadow=true; scene.add(m); return m;
}
const flat=(w,d,color,x,y,z)=>plane(w,d,typeof color==='string'?toon(color):color,x,y,z,-Math.PI/2);
const basic=(o)=>new THREE.MeshBasicMaterial(o);
function vText(txt,color,font,cw,ch){
  return canvasTex(cw,ch*txt.length+20,(g,w,h)=>{ g.font=font; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle=color; g.shadowColor='rgba(0,0,0,.35)'; g.shadowOffsetY=3; [...txt].forEach((c,i)=>g.fillText(c,w/2,10+ch*i+ch/2)); });
}
function hText(txt,color,font,w,h,spacing){
  return canvasTex(w,h,(g)=>{ g.font=font; g.textBaseline='middle'; g.fillStyle=color; g.shadowColor='rgba(0,0,0,.3)'; g.shadowOffsetY=3;
    const chars=[...txt], step=(w-spacing*2)/(chars.length-1||1);
    chars.forEach((c,i)=>{ const m=g.measureText(c).width; g.fillText(c,spacing+i*step-m/2,h/2+4); }); });
}

export { BOX, GRAD, OUT, SPH, basic, block, canvasTex, flat, gradTex, hText, mk, outline, plane, toon, vText };
