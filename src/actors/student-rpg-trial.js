/** 明確選用的完整少年造型。專用 profile 與共享基本幾何，完全不改正式角色。 */
import * as THREE from 'three';
import { createHumanoid } from './humanoid-factory.js';
const C=Object.freeze({skin:'#ffe1cc',jacket:'#4b8d8c',shirt:'#d7c9b0',pants:'#34455e',shoe:'#d9d4c7',sole:'#80766b',hair:'#423127',bag:'#b2784e',strap:'#835636'});
let geometry;
const power=(n,e)=>Math.sign(n)*Math.pow(Math.abs(n),e);
function mapVertices(g,fn){const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,...fn(p.getX(i),p.getY(i),p.getZ(i)));g.computeVertexNormals();return g;}
function jaw(g,r){return mapVertices(g,(x,y,z)=>{const lower=Math.max(0,-y/r);return [x*(1-.24*lower),y,z*(1-.1*lower)];});}
function shapes(){
 if(geometry)return geometry;
 const torso=mapVertices(new THREE.CapsuleGeometry(.145,.09,6,14),(x,y,z)=>[x*(y>0?1.18:1.02),Math.max(-.12,y),z]);
 const skull=jaw(new THREE.SphereGeometry(.19,28,20),.19);
 const face=jaw(new THREE.SphereGeometry(.1913,32,20,Math.PI/2-.8,1.6,Math.PI*.38,Math.PI*.42),.1913);
 const cap=mapVertices(new THREE.SphereGeometry(.205,16,12,0,Math.PI*2,0,Math.PI*.53),(x,y,z)=>{
  const t=Math.acos(Math.min(1,Math.max(-1,y/.205))),front=Math.max(0,z/.205),next=t*(1-.34*front*front);
  const k=Math.sin(t)>1e-6?Math.sin(next)/Math.sin(t):1;return [x*k,.205*Math.cos(next),z*k];
 });
 const bang=mapVertices(new THREE.SphereGeometry(1,12,8),(x,y,z)=>[x*(.28+.72*(y+1)/2),y,z*(.55+.45*(y+1)/2)]);
 const bag=mapVertices(new THREE.SphereGeometry(.5,16,12),(x,y,z)=>[.5*power(x*2,.4),.5*power(y*2,.4),.5*power(z*2,.65)]);
 const shoe=mapVertices(new THREE.SphereGeometry(1,12,8),(x,y,z)=>[power(x,.7)*(1+.12*z),Math.max(-.65,y)*(1-.25*Math.max(0,z)),power(z,.7)]);
 // 鞋底中心 .055，保留原版含描邊局部最低界 .0325，不移動整個角色。
 const soleDepth=(.055-.0325)/(.016*1.035);
 const sole=mapVertices(new THREE.SphereGeometry(1,12,8),(x,y,z)=>[power(x,.65)*(1+.12*z),power(y,.4)*(y<0?soleDepth:1),power(z,.65)]);
 const inner=mapVertices(new THREE.PlaneGeometry(.10,.24,4,10),(x,y)=>{
  // 內搭沿外衫曲面貼合；頂部中央做小 V，不再使用向外鼓起的白膠囊。
  if(y>.119&&Math.abs(x)<.001)y-=.018;
  const shirtY=.765+y-.72,capY=Math.max(0,Math.abs(shirtY)-.045),wide=shirtY>0?1.18:1.02;
  return [x,y,Math.sqrt(Math.max(0,.145*.145-capY*capY-(x/wide)**2))*.78+.002];
 });
 geometry={torso,skull,face,cap,bang,bag,shoe,sole,inner,
  back:new THREE.SphereGeometry(.207,16,12,Math.PI/2+1.05,Math.PI*2-2.1,0,Math.PI*.72),
  neck:new THREE.CylinderGeometry(.05,.055,.08,12),cuff:new THREE.TorusGeometry(.05,.006,6,18),
  strap:new THREE.CapsuleGeometry(.012,.20,4,8),hand:new THREE.SphereGeometry(1,12,8)};
 return geometry;
}
const spec=(geometry,color,position,scale=null,outlineScale=null)=>({geometry,color,position,scale,outlineScale});
function profile(){return {kind:'npc',scale:1.1,noOcc:true,
 torso:spec(['capsule',.145,.09,6,14],C.jacket,[0,.72,0],[1,1,.78],1.035),
 bottom:spec(['cylinder',.13,.135,.10,14],C.pants,[0,.565,0],[1,1,.78],1.03),
 arm:{pivot:[.17,.86,0],upper:spec(['capsule',.052,.13,4,12],C.jacket,[0,-.095,0],null,1.06),forearm:spec(['capsule',.039,.12,4,10],C.skin,[0,-.24,0],null,1.09),hand:spec(['sphere',1,12,8],C.skin,[0,-.345,0],[.037,.046,.034],1.09)},
 leg:{pivot:[.075,.55,0],upper:spec(['capsule',.064,.29,4,12],C.pants,[0,-.22,0],null,1.04),shoe:spec(['sphere',1,12,8],C.shoe,[0,-.46,.04],[.075,.052,.135],1.04),sole:spec(['sphere',1,12,8],C.sole,[0,-.495,.04],[.078,.016,.14],1.035)},
 head:{pivot:[0,1.07,0],center:null,skull:spec(['sphere',.19,28,20],C.skin,[0,0,0],[1.02,1.05,1],1.035)}};
}
function replaceShape(mesh,g){const old=mesh.geometry;mesh.geometry=g;for(const child of mesh.children)if(child.isMesh&&child.geometry===old)child.geometry=g;}
export function createRpgStudentTrial({parent,part,outlineU,BOX,SPH,toon,basic,faceTexture}){
 const G=shapes(),appearance={hair:[],hairTop:[],headwear:[],accessory:[],body:[],top:[],protected:[]};
 const model=createHumanoid(profile(),{parent,part,outlineU,BOX,SPH});
 const {root:g,body:rig,joints:P,headCenter:hc,limbParts}=model;
 replaceShape(model.parts.torso,G.torso);replaceShape(model.parts.skull,G.skull);
 const neck=part(G.neck,C.skin,0,.90,0,rig);appearance.body.push(neck);
 const inner=part(G.inner,C.shirt,0,.765,0,rig);appearance.top.push(inner);
 for(const side of ['L','R']){
  replaceShape(limbParts[`arm${side}`].hand,G.hand);replaceShape(limbParts[`leg${side}`].shoe,G.shoe);replaceShape(limbParts[`leg${side}`].sole,G.sole);
  const cuff=part(G.cuff,C.shirt,0,-.19,0,P[`sh${side}`]);cuff.rotation.x=Math.PI/2;appearance.top.push(cuff);
 }
 const pack=part(G.bag,C.bag,0,.735,-.16,rig);pack.scale.set(.23,.29,.11);outlineU(pack,1.045);appearance.accessory.push(pack);
 for(const s of [-1,1]){const strap=part(G.strap,C.strap,s*.115,.755,-.105,rig);strap.rotation.z=-s*.10;appearance.accessory.push(strap);}
 P.fA=faceTexture(C.hair,'open');P.fB=faceTexture(C.hair,'closed');P.fC=faceTexture(C.hair,'panic');
 P.fm=basic({map:P.fA,transparent:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 const face=new THREE.Mesh(G.face,P.fm);face.scale.copy(model.parts.skull.scale);hc.add(face);appearance.protected.push(face);
 const hm=toon(C.hair,{side:THREE.DoubleSide});
 const cap=part(G.cap,hm,0,.006,-.005,hc);cap.scale.copy(model.parts.skull.scale);outlineU(cap,1.035);
 const back=part(G.back,hm,0,0,-.008,hc);back.scale.copy(model.parts.skull.scale);appearance.hair.push(cap,back);appearance.hairTop.push(cap);
 // 三片大瀏海而非一頂球帽。共用葉片式球面拓撲，輪廓由大小／角度構成。
 for(const [x,y,z,sx,sy,sz,rx,rz]of [[-.10,.06,.14,.070,.10,.035,-.60,-.25],[-.02,.10,.165,.073,.105,.032,-.65,-.38],[.085,.10,.13,.060,.085,.033,-.60,-.45]]){
  const lock=part(G.bang,hm,x,y,z,hc);lock.scale.set(sx,sy,sz);lock.rotation.set(rx,0,rz);outlineU(lock,1.03);appearance.hair.push(lock);appearance.hairTop.push(lock);
 }
 for(const s of [-1,1]){const lock=part(G.bang,hm,s*.177,-.035,.025,hc);lock.scale.set(.038,.105,.055);lock.rotation.z=s*.12;appearance.hair.push(lock);}
 g.userData.studentStyle='rpg-profile-v3';
 return {g,rig,P,limbParts,appearance,assembly:model};
}
