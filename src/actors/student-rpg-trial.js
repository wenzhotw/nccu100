/** 明確選用的完整少年造型。專用 profile 與共享基本幾何，完全不改正式角色。 */
import * as THREE from 'three';
import { createHumanoid } from './humanoid-factory.js';
const C=Object.freeze({skin:'#e9b28e',jacket:'#4b8d8c',trim:'#377473',shirt:'#d7c9b0',pants:'#34455e',shoe:'#d9d4c7',sole:'#80766b',hair:'#423127',bag:'#b2784e',strap:'#835636'});
let geometry;
const power=(n,e)=>Math.sign(n)*Math.pow(Math.abs(n),e);
function mapVertices(g,fn){const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,...fn(p.getX(i),p.getY(i),p.getZ(i)));g.computeVertexNormals();return g;}
// 共用標準化頭面映射：柔卵形頰頜、較平前臉與連續鼻樑鼻尖，臉片同步外偏移。
function jaw(g,r,head=true){return mapVertices(g,(x,y,z)=>{
 const nx=x/r,ny=y/r,nz=z/r,lower=Math.max(0,-ny),blend=lower*lower*(3-2*lower);
 const px=x*(1-.23*blend),py=ny<-.65?r*(-.65+(ny+.65)*.72):y;
 let pz=z;
 if(nz>0){
  pz=r*Math.pow(nz,.68)*.93;
  const tip=.15*Math.exp(-((nx/.13)**2)-((ny+.36)/.14)**2);
  const bridge=.045*Math.exp(-((nx/.08)**2)-((ny+.17)/.24)**2);
  if(head)pz+=r*(tip+bridge)*Math.min(1,nz*4);
 }
 return [px*(head?.84:1),py*(head?1.08:1),pz];
});}
function shapes(){
 if(geometry)return geometry;
 // 外套的胸、側腰與下襬輪廓連續，不使用橢圓軀幹套白色矩形。
 const torso=mapVertices(new THREE.CylinderGeometry(.145,.138,.36,16,6),(x,y,z)=>{
  const t=(y+.18)/.36,waist=1-.08*Math.exp(-(((t-.25)/.18)**2)),chest=1+.06*Math.exp(-(((t-.70)/.22)**2));
  return [x*waist*chest,y-(y>.12?(y-.12)*Math.abs(x)/.145:0),z*(1-.45*Math.max(0,Math.min(1,(y-.06)/.12)))];
 });
 const forearm=mapVertices(new THREE.SphereGeometry(1,12,8),(x,y,z)=>{const wrist=Math.max(0,y);return [x*(1-.30*wrist),y,z*(1-.12*Math.max(0,-y))];});
 const sleeve=mapVertices(new THREE.CapsuleGeometry(.065,.22,6,12),(x,y,z)=>{const t=(y+.175)/.35,w=.72+.34*Math.sin(Math.min(1,t)*Math.PI*.75);return [x*w,y>.11?.11+(y-.11)*.5:y,z*w];});
 const leg=mapVertices(new THREE.CylinderGeometry(.065,.043,.45,12,6),(x,y,z)=>{const knee=1-.06*Math.exp(-(((y+.015)/.06)**2));return [x*knee,y,z*knee];});
 const waist=mapVertices(new THREE.CylinderGeometry(.125,.13,.10,14,1),(x,y,z)=>[x,y+(y<0?.018*(1-Math.abs(x)/.13):0),z*.97]);
 const skull=jaw(new THREE.SphereGeometry(.19,28,20),.19);
 // 臉片直接沿頭殼同一三角拓撲取前臉，避免鼻樑區不同取樣互相穿透。
 const face=skull.clone();face.scale(1.008,1.008,1.008);
 const uv=face.attributes.uv,indices=[],source=skull.index.array;
 for(let i=0;i<source.length;i+=3){const tri=[source[i],source[i+1],source[i+2]];if(tri.every(v=>uv.getX(v)>=3/28-1e-6&&uv.getX(v)<=11/28+1e-6&&uv.getY(v)>=.2-1e-6&&uv.getY(v)<=.65+1e-6))indices.push(...tri);}
 face.setIndex(indices);
 for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)-3/28)/(8/28),(uv.getY(i)-.2)/.45);
 // 額頭、耳旁到後頸採連續曲線邊界，不再留下水平半球帽簷。
 const cap=mapVertices(new THREE.SphereGeometry(.205,16,12,0,Math.PI*2,0,Math.PI*.72),(x,y,z)=>{
  const t=Math.acos(Math.min(1,Math.max(-1,y/.205))),h=Math.hypot(x,z),front=h>1e-6?z/h:0,az=Math.atan2(x,z);
  const edge=Math.PI*(.50-.10*Math.max(0,front)**2+.20*Math.max(0,-front)+.018*Math.sin(az*5));
  const next=t*edge/(Math.PI*.72),k=Math.sin(t)>1e-6?Math.sin(next)/Math.sin(t):1;
  return [x*k,.205*Math.cos(next),z*k];
 });
 jaw(cap,.205,false);
 const bang=mapVertices(new THREE.SphereGeometry(1,12,8),(x,y,z)=>[x*(.28+.72*(y+1)/2),y,z*(.55+.45*(y+1)/2)]);
 const bag=mapVertices(new THREE.SphereGeometry(.5,16,12),(x,y,z)=>[.5*power(x*2,.4),.5*power(y*2,.4),.5*power(z*2,.65)]);
 const shoe=mapVertices(new THREE.SphereGeometry(1,12,8),(x,y,z)=>[power(x,.7)*(1+.12*z),Math.max(-.65,y)*(1-.25*Math.max(0,z)),power(z,.7)]);
 // 鞋底中心 .055，保留原版含描邊局部最低界 .0325，不移動整個角色。
 const soleDepth=(.055-.0325)/(.016*1.035);
 const sole=mapVertices(new THREE.SphereGeometry(1,12,8),(x,y,z)=>[power(x,.65)*(1+.12*z),power(y,.4)*(y<0?soleDepth:1),power(z,.65)]);
 const inner=mapVertices(new THREE.PlaneGeometry(.08,.065,4,4),(x,y)=>{
  const t=(y+.0325)/.065;x*=t;y-=.017*Math.abs(x)/.04*t;
  const a=Math.min(.9,Math.abs(x)/.145),sourceY=(.9375+y-.79-.12*a)/(1-a),bodyT=(sourceY+.18)/.36,r=.138+.007*bodyT,wide=(1-.08*Math.exp(-(((bodyT-.25)/.18)**2)))*(1+.06*Math.exp(-(((bodyT-.70)/.22)**2)));
  return [x,y,Math.sqrt(Math.max(0,r*r-(x/wide)**2))*.78*(1-.45*Math.max(0,Math.min(1,(sourceY-.06)/.12)))+.0015];
 });
 // 閉合膠囊彎成後領U形，避免開放半環兩端出現黑洞。
 const hood=mapVertices(new THREE.CapsuleGeometry(.025,.28,6,16),(x,y,z)=>{const a=y/.28*Math.PI;return [(.09+x)*Math.sin(a),z,-(.09+x)*Math.cos(a)];});
 const zip=mapVertices(new THREE.CylinderGeometry(.003,.003,.29,6,12),(x,y,z)=>{const sy=.755+y-.79,t=(sy+.18)/.36;return [x,y,z+(.138+.007*t)*.78*(1-.45*Math.max(0,Math.min(1,(sy-.06)/.12)))+.001];});
 const flow=sign=>{const g=mapVertices(new THREE.PlaneGeometry(.12,.24,4,8),(x,y)=>{const t=1-(y+.12)/.24,theta=.25+1.65*t,phi=.15+1.9*t+(x/.06)*.22*Math.sin(Math.PI*(.08+.92*t));return [sign*.211*Math.sin(theta)*Math.sin(phi),.211*Math.cos(theta),.211*Math.sin(theta)*Math.cos(phi)];});return jaw(g,.211,false);};
 geometry={flowL:flow(-1),flowR:flow(1),torso,forearm,sleeve,leg,waist,skull,face,cap,bang,bag,shoe,sole,inner,
  neck:new THREE.CylinderGeometry(.037,.048,.11,12),cuff:new THREE.CylinderGeometry(.047,.045,.05,12),
  hem:new THREE.CylinderGeometry(.138,.139,.045,16),zip,
  hood,ear:new THREE.SphereGeometry(.028,12,8),thumb:new THREE.CapsuleGeometry(.012,.022,4,8),
  strap:new THREE.CapsuleGeometry(.012,.20,4,8)};
 return geometry;
}
const spec=(geometry,color,position,scale=null,outlineScale=null)=>({geometry,color,position,scale,outlineScale});
function profile(){return {kind:'npc',scale:1.1,noOcc:true,
 torso:spec(['cylinder',.145,.138,.36,16],C.jacket,[0,.79,0],[1,1,.78],1.035),
 bottom:spec(['cylinder',.125,.13,.10,14],C.pants,[0,.58,0],[1,1,.78],1.03),
 arm:{pivot:[.14,.91,0],upper:spec(['capsule',.065,.22,6,12],C.jacket,[0,-.155,0],null,1.045),forearm:spec(['sphere',1,12,8],C.skin,[0,-.405,0],[.034,.065,.023],1.06),hand:null},
 leg:{pivot:[.073,.62,0],upper:spec(['cylinder',.065,.043,.45,12],C.pants,[0,-.275,0],null,1.04),shoe:spec(['sphere',1,12,8],C.shoe,[0,-.53,.04],[.07,.052,.125],1.04),sole:spec(['sphere',1,12,8],C.sole,[0,-.565,.04],[.073,.016,.13],1.035)},
 head:{pivot:[0,1.15,0],center:null,skull:spec(['sphere',.19,28,20],C.skin,[0,0,0],[1.02,1.05,1],1.035)}};
}
function replaceShape(mesh,g){const old=mesh.geometry;mesh.geometry=g;for(const child of mesh.children)if(child.isMesh&&child.geometry===old)child.geometry=g;}
export function createRpgStudentTrial({parent,part,outlineU,BOX,SPH,toon,basic,faceTexture}){
 const G=shapes(),appearance={hair:[],hairTop:[],headwear:[],accessory:[],body:[],top:[],protected:[]};
 const model=createHumanoid(profile(),{parent,part,outlineU,BOX,SPH});
 const {root:g,body:rig,joints:P,headCenter:hc,limbParts}=model;
 replaceShape(model.parts.bottom,G.waist);replaceShape(model.parts.torso,G.torso);replaceShape(model.parts.skull,G.skull);
 hc.scale.setScalar(.70);
 const neck=part(G.neck,C.skin,0,1.0,0,rig);appearance.body.push(neck);
 const inner=part(G.inner,C.shirt,0,.9375,0,rig);appearance.top.push(inner);
 const hem=part(G.hem,C.trim,0,.615,0,rig);hem.scale.z=.78;outlineU(hem,1.02);appearance.top.push(hem);
 const zip=part(G.zip,C.shirt,0,.755,0,rig);appearance.top.push(zip);
 const hood=part(G.hood,C.jacket,0,.947,0,rig);hood.scale.x=1.18;outlineU(hood,1.025);appearance.top.push(hood);
 for(const sign of [-1,1]){const ear=part(G.ear,C.skin,sign*.17,-.025,.008,hc);ear.scale.set(.62,1,.55);appearance.body.push(ear);}
 for(const side of ['L','R']){
  replaceShape(limbParts[`arm${side}`].sleeve,G.sleeve);replaceShape(limbParts[`arm${side}`].forearm,G.forearm);replaceShape(limbParts[`leg${side}`].leg,G.leg);replaceShape(limbParts[`leg${side}`].shoe,G.shoe);replaceShape(limbParts[`leg${side}`].sole,G.sole);
  const cuff=part(G.cuff,C.trim,0,-.325,0,P[`sh${side}`]);outlineU(cuff,1.025);appearance.top.push(cuff);
  const sign=side==='L'?-1:1,thumb=part(G.thumb,C.skin,-sign*.028,-.396,.015,P[`sh${side}`]);thumb.rotation.z=sign*.4;appearance.body.push(thumb);
 }
 const pack=part(G.bag,C.bag,0,.80,-.16,rig);pack.scale.set(.23,.29,.11);outlineU(pack,1.045);appearance.accessory.push(pack);
 for(const s of [-1,1]){const strap=part(G.strap,C.strap,s*.115,.82,-.105,rig);strap.rotation.z=-s*.10;appearance.accessory.push(strap);}
 P.fA=faceTexture(C.hair,'open');P.fB=faceTexture(C.hair,'closed');P.fC=faceTexture(C.hair,'panic');
 P.fm=basic({map:P.fA,transparent:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 const face=new THREE.Mesh(G.face,P.fm);face.scale.copy(model.parts.skull.scale);hc.add(face);appearance.protected.push(face);
 const hm=toon(C.hair,{side:THREE.DoubleSide}),hairRoot=new THREE.Group();hairRoot.scale.set(.84,1.08,1);hc.add(hairRoot);
 const cap=part(G.cap,hm,0,.006,-.005,hairRoot);cap.scale.copy(model.parts.skull.scale);outlineU(cap,1.035);
 appearance.hair.push(cap);appearance.hairTop.push(cap);
 // 三片大瀏海而非一頂球帽。共用葉片式球面拓撲，輪廓由大小／角度構成。
 for(const [x,y,z,sx,sy,sz,rx,rz]of [[-.105,.035,.15,.058,.13,.035,-.45,-.38],[-.025,.10,.165,.080,.13,.032,-.60,-.62],[.095,.11,.13,.052,.09,.033,-.55,-.50]]){
  const lock=part(G.bang,hm,x,y,z,hairRoot);lock.scale.set(sx,sy,sz);lock.rotation.set(rx,0,rz);outlineU(lock,1.03);appearance.hair.push(lock);appearance.hairTop.push(lock);
 }
 // 耳旁與後頸以五片貼頭大髮束接續短後帽，打破水平半球截面。
 for(const s of [-1,1]){const lock=part(G.bang,hm,s*.166,.025,-.075,hairRoot);lock.scale.set(.052,.075,.063);lock.rotation.set(-.18,0,s*.22);appearance.hair.push(lock);}
 for(const s of [-1,0,1]){const lock=part(G.bang,hm,s*.10,-.005,s===0?-.175:-.14,hairRoot);lock.scale.set(s===0?.085:.075,.12,.058);lock.rotation.set(.35,-s*.20,-s*.25);appearance.hair.push(lock);}
 const flowMat=toon('#59402e',{side:THREE.DoubleSide});
 for(const sign of [-1,1])for(const offset of [0,.28]){const flow=part(sign<0?G.flowL:G.flowR,flowMat,0,.006,-.005,hairRoot);flow.scale.copy(model.parts.skull.scale);flow.rotation.y=sign*offset;appearance.hair.push(flow);}
 g.userData.studentStyle='rpg-profile-v3';
 return {g,rig,P,limbParts,appearance,assembly:model};
}
