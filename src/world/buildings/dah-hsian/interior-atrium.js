/** 從2F可見的層退藏書中庭。依館方環景、建築方與2022實拍估算；公共迴廊可沿斜梯到達。 */
import * as THREE from 'three';
import {ATRIUM_LEVELS,ATRIUM_STAIRS,atriumDesks,ATRIUM_COLUMNS,atriumRearExit,atriumVisiblePlatforms,atriumDoorFrames} from './atrium-layout.js';
const BOX=new THREE.BoxGeometry(1,1,1);
export function buildAtrium(parent,mat){
 const root=new THREE.Group();root.name='層退藏書中庭';parent.add(root);
 const batches=new Map(),pose=new THREE.Object3D();
 const box=(kind,x,y,z,w,h,d,name)=>{const m=new THREE.Mesh(BOX,mat(kind));m.position.set(x,y,z);m.scale.set(w,h,d);m.name=name;root.add(m);return m;};
 const batch=(kind,x,y,z,w,h,d,books=false)=>{const key=kind+(books?':books':'');if(!batches.has(key))batches.set(key,{kind,books,items:[]});batches.get(key).items.push([x,y,z,w,h,d]);};
 const colors=['bookBlue','bookRed','bookGreen','woodDark','bookGold','ink'];
 // 在局部座標造同一種書牆／桌位，再映射到中庭的三面。u沿牆，v由欄杆向後。
 for(const spec of ATRIUM_LEVELS){
  const {index:level,y,east,north,south}=spec,exit=atriumRearExit(spec);
  for(const r of atriumVisiblePlatforms(spec))box('concrete',(r.x0+r.x1)/2,y-.16,(r.z0+r.z1)/2,r.x1-r.x0,.32,r.z1-r.z0,r.side==='east'&&r.z1===9.4?'東側閱讀平台':'可行走層退平台');
  const sides=[
   {name:'東',lo:exit?north+1.8:north-4.8,hi:south+3.4,at:(u,v)=>[east+v,u],swap:true},
   {name:'北',lo:-22,hi:exit?east+1.8:east+4.8,at:(u,v)=>[u,north-v]},
  ];
  for(const side of sides){
   const put=(kind,u,v,yy,w,h,d,name,repeat=false,books=false)=>{const [x,z]=side.at(u,v),ww=side.swap?d:w,dd=side.swap?w:d;return repeat?batch(kind,x,yy,z,ww,h,dd,books):box(kind,x,yy,z,ww,h,dd,name);};
   const middle=(side.lo+side.hi)/2,length=side.hi-side.lo;
   const frontLo=side.swap?north:-22,frontHi=side.swap?south+3.4:east,frontMiddle=(frontLo+frontHi)/2,frontLength=frontHi-frontLo;

   put('concrete',frontMiddle,0,y-.05,frontLength,.34,.24,'層退清水模樓板帶');
   put('ink',frontMiddle,-.13,y-.15,frontLength,.095,.018,'水平回風口',true);
   put('clear',frontMiddle,-.06,y+.7,frontLength,1.15,.05,'通透玻璃欄杆');
   put('metal',frontMiddle,-.07,y+1.3,frontLength,.045,.065,'欄杆扶手',true);
   if(!spec.books)continue;
   put('woodDark',middle,4.58,y+1.4,length,2.7,.32,'藏書牆背板').userData.atriumBooks=true;
   for(let row=0;row<=5;row++)put('wood',middle,4.33,y+.12+row*.51,length,.08,.64,'藏書橫層板',true);
   put('light',middle,4.07,y+2.77,length,.045,.055,'書牆線燈',true);
   put('light',middle,.15,y-.38,length,.035,.07,'樓板下線燈',true);
   for(let u=side.lo+.06;u<side.hi;u+=1.35)put('wood',u,4.34,y+1.42,.08,2.65,.6,'書架豎框',true);
   for(let row=0;row<5;row++)for(let u=side.lo+.13,j=0;u<side.hi-.1;u+=.135,j++){
    const h=.32+((j*7+row*3)%5)*.026;
    put(colors[(j+row*2+level)%colors.length],u,4.01,y+.17+row*.51+h/2,.085+((j*3+row+level)%4)*.011,h,.20,'藏書書脊',true,true);
   }
   for(const desk of atriumDesks(spec).filter(d=>d.side===(side.swap?'east':'north'))){
    const {u,width,depth}=desk;
    put('metal',u,-.06,y+.72,.045,1.15,.06,'欄杆立柱',true);
    put('contact',u,1.35,y+.012,width+1,.004,depth+.3,'閱讀桌接地暗部',true);
    put('litWood',u,1.35,y+.78,width,.1,depth,'上層木桌',true);
    put('taskGlow',u,1.35,y+.834,width-.02,.006,depth-.02,'閱讀桌暖色亮斑',true);
    put('litWood',u,.28,y+.42,width,.74,.065,'閱讀桌木前板',true);
    // 實拍與5F/7F平面一致：中央隔板垂直欄杆，兩側讀者面對彼此。
    put('white',u,1.35,y+1.15,.04,.64,depth-.08,'閱讀桌中央屏風',true);
    for(const delta of [-.73,.73])put('metal',u+delta,1.35,y+.37,.055,.74,depth-.2,'上層桌腳',true);
    for(const delta of [-1.3,1.3])for(const v of [.8,1.9]){
     put('wood',u+delta,v,y+.46,.5,.09,.5,'上層座椅',true);
     put('wood',u+Math.sign(delta)*1.57,v,y+.74,.06,.46,.5,'上層椅背',true);
    }
    put('light',u,1.35,y+1.5,.08,.045,depth-.12,'上層閱讀燈',true);
   }
  }
  if(exit){
   // 後區只建立可通行公共走廊及其邊界，不捏造尚未建置房間內容。
   for(const r of atriumVisiblePlatforms(spec).filter(r=>r.side==='rear'))box('carpet',(r.x0+r.x1)/2,y+.006,(r.z0+r.z1)/2,r.x1-r.x0,.012,r.z1-r.z0,'後方公共走廊地毯');
   box('concrete',east+1.75,y+1.4,north-8,10.5,2.8,.16,'後方公共走廊端牆');
   for(const x of [east-3.5,east+7])box('concrete',x,y+1.4,north-6.9,.16,2.8,2.2,'後方公共走廊側牆');
   box('concrete',east+1.75,y+2.86,north-6.9,10.5,.12,2.2,'後方公共走廊頂板');
   for(const frame of atriumDoorFrames(spec))box('metal',frame.x,y+1.3,frame.z,frame.w,2.6,frame.d,'轉角出口細門框');
   box('metal',exit.x,y+2.65,exit.z,2.34,.12,.16,'轉角出口過樑');
   box('light',exit.x,y+2.65,north-6.8,2.1,.035,.12,'後方公共走廊燈');
  }
  box('concrete',-7.5,y-.12,16.45,34,.72,.45,'南面垂直樓板帶');
  box('clear',-7.5,y+.7,16.2,34,1.15,.06,'南面玻璃欄杆');

  box('clear',-7.5,y+1.5,23.8,34,2.7,.06,'南面高側採光窗');
  for(const c of ATRIUM_COLUMNS)batch('concrete',c.x,y+1.4,c.z,c.w,3.1,c.d);
  // 西面為垂直的清水模／採光迴廊，與層退書牆構成不同立面。
  box('concrete',-22.65,y-.12,(north+south)/2,.5,.72,south-north+6.8,'西面垂直樓板帶');
  box('clear',-22.35,y+.7,(north+south)/2,.06,1.15,south-north+6.6,'西面玻璃欄杆');
  box('glass',-25.4,y+1.5,(north+south)/2,.08,2.7,south-north+7,'高側採光窗');
  for(let z=north-2;z<south+3;z+=4)batch('concrete',-24,y+1.35,z,2.8,2.9,.4);
 }
 // 角落斜梯連接退台，從2F可見；與共用導航高度一致。
 const segment=(kind,a,b,width,depth,name)=>{
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const mesh=box(kind,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,width,delta.length(),depth,name);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
 };
 for(const stair of ATRIUM_STAIRS.slice(1)){
  const {a,b,width}=stair,dx=b.x-a.x,dz=b.z-a.z,h=b.y-a.y;
  segment('concrete',[a.x,a.y-.13,a.z],[b.x,b.y-.13,b.z],width,.15,'中庭上層斜梯底板');
  const count=24;
  for(let i=0;i<count;i++){
   const t=(i+.5)/count,x=a.x+dx*t,z=a.z+dz*t;
   const tread=box('concrete',x,a.y+h*t-.05,z,width,.10,Math.hypot(dx,dz)/count+.02,'中庭可行走梯級');tread.rotation.y=Math.atan2(dx,dz);
   for(const side of [-1,1])batch('metal',x+side*width/2,a.y+h*t+.55,z,.035,1.1,.035);
  }
  for(const side of [-1,1])segment('metal',[a.x+side*width/2,a.y+1.1,a.z],[b.x+side*width/2,b.y+1.1,b.z],.065,.065,'上層斜梯扶手');
 }
 // 天窗為短跨採光格與深鋼桁架：格間是真正透光開口，遠處只留天空背景。
 const roof=ATRIUM_LEVELS.at(-1).y+3.2;
 for(let z=-16;z<=23;z+=4.2){
  box('ink',-4,roof-1.05,z,42,.22,.22,'天窗鋼桁架下弦');
  box('ink',-4,roof-.08,z,42,.22,.22,'天窗鋼桁架上弦');
  for(let x=-24;x<17;x+=2.2){
   const beam=box('metal',x+1.1,roof-.56,z,Math.hypot(2.2,.97),.13,.13,'天窗斜撐');beam.rotation.z=((Math.round((x+24)/2.2)%2)?1:-1)*Math.atan2(.97,2.2);
  }
 }
 // 實拍屋面以灰色折板為主，折板間保留狹長採光帶；下方深桁架仍完整可見。
 for(let z=-16;z<=23;z+=4.2){
  const panel=box('metal',-4,roof+.28,z+1.65,42,.1,3.3,'屋頂不透明折板');panel.rotation.x=-.07;
  box('clear',-4,roof+.38,z+3.75,42,.045,.78,'屋頂狹長採光');
  for(let x=-24.5;x<17;x+=.48)batch('white',x,roof+.19,z+1.65,.025,.035,3.3);
  box('ink',-4,roof+.3,z+3.35,42,.11,.07,'採光帶長框');
  box('ink',-4,roof+.3,z+4.15,42,.11,.07,'採光帶長框');
  for(let x=-24.5;x<17;x+=2.2)box('white',x,roof+.36,z+3.75,.065,.065,.78,'採光帶短框');
 }
 for(const [key,b]of batches){const mesh=new THREE.InstancedMesh(BOX,mat(b.kind),b.items.length);mesh.name='中庭批次：'+key;mesh.userData.atriumBooks=b.books;b.items.forEach(([x,y,z,w,h,d],i)=>{pose.position.set(x,y,z);pose.scale.set(w,h,d);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);});mesh.instanceMatrix.needsUpdate=true;root.add(mesh);}
 return root;
}
