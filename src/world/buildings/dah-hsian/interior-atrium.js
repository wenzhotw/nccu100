/** 從2F可見的層退藏書中庭。依館方環景、建築方與2022實拍估算；上層僅作景觀。 */
import * as THREE from 'three';
const BOX=new THREE.BoxGeometry(1,1,1);
export function buildAtrium(parent,mat){
 const root=new THREE.Group();root.name='層退藏書中庭';parent.add(root);
 const batches=new Map(),pose=new THREE.Object3D();
 const box=(kind,x,y,z,w,h,d,name)=>{const m=new THREE.Mesh(BOX,mat(kind));m.position.set(x,y,z);m.scale.set(w,h,d);m.name=name;root.add(m);return m;};
 const batch=(kind,x,y,z,w,h,d,books=false)=>{const key=kind+(books?':books':'');if(!batches.has(key))batches.set(key,{kind,books,items:[]});batches.get(key).items.push([x,y,z,w,h,d]);};
 const colors=['bookBlue','bookRed','bookGreen','woodDark','bookGold','ink'];
 // 在局部座標造同一種書牆／桌位，再映射到中庭的三面。u沿牆，v由欄杆向後。
 for(let level=0;level<5;level++){
  const y=4.5+level*3.1,east=.15+level*1.5,north=-.2-level*1.35,south=16.2;
  const sides=[
   {name:'東',lo:north-3.4,hi:south+3.4,at:(u,v)=>[east+v,u],swap:true},
   {name:'北',lo:-22,hi:east,at:(u,v)=>[u,north-v]},
  ];
  for(const side of sides){
   const put=(kind,u,v,yy,w,h,d,name,repeat=false,books=false)=>{const [x,z]=side.at(u,v),ww=side.swap?d:w,dd=side.swap?w:d;return repeat?batch(kind,x,yy,z,ww,h,dd,books):box(kind,x,yy,z,ww,h,dd,name);};
   const middle=(side.lo+side.hi)/2,length=side.hi-side.lo;
   put('concrete',middle,1.65,y-.23,length,.46,3.3,side.name+'側閱讀平台');
   put('concrete',middle,0,y-.05,length,.6,.24,'層退清水模樓板帶');
   put('ink',middle,-.13,y-.15,length,.095,.018,'水平回風口',true);
   put('clear',middle,-.06,y+.7,length,1.15,.05,'通透玻璃欄杆');
   put('metal',middle,-.07,y+1.3,length,.045,.065,'欄杆扶手',true);
   put('wood',middle,3.08,y+1.4,length,2.7,.32,'藏書牆背板').userData.atriumBooks=true;
   for(let row=0;row<=5;row++)put('wood',middle,2.83,y+.12+row*.51,length,.055,.58,'藏書橫層板',true);
   put('light',middle,2.57,y+2.77,length,.045,.055,'書牆線燈',true);
   put('light',middle,.15,y-.38,length,.035,.07,'樓板下線燈',true);
   for(let u=side.lo+.06;u<side.hi;u+=1.1)put('wood',u,2.84,y+1.42,.045,2.65,.55,'書架豎框',true);
   for(let row=0;row<5;row++)for(let u=side.lo+.13,j=0;u<side.hi-.1;u+=.22,j++){
    const h=.32+((j*7+row*3)%5)*.026;
    put(colors[(j+row*2+level)%colors.length],u,2.51,y+.17+row*.51+h/2,.17,h,.20,'藏書書脊',true,true);
   }
   for(let u=side.lo+1.7;u<side.hi-1;u+=3.0){
    if(side.name==='東'&&u>8&&u<17)continue; // 斜梯槽內不放桌椅、屏風與燈具。
    put('metal',u,-.06,y+.72,.045,1.15,.06,'欄杆立柱',true);
    put('wood',u,1.25,y+.78,2.2,.1,1.05,'上層木桌',true);
    put('metal',u,1.86,y+1.25,2.2,.78,.04,'閱讀桌屏風',true);
    for(const delta of [-.9,.9])put('metal',u+delta,1.25,y+.37,.055,.74,.7,'上層桌腳',true);
    for(const delta of [-.55,.55]){
     put('bookGreen',u+delta,.5,y+.46,.48,.09,.48,'上層座椅',true);
     put('wood',u+delta,.28,y+.74,.5,.46,.06,'上層椅背',true);
    }
    put('light',u,1.85,y+1.72,.12,.65,.12,'上層閱讀燈',true);
   }
  }
  box('concrete',-7.5,y-.12,16.45,34,.72,.45,'南面垂直樓板帶');
  box('clear',-7.5,y+.7,16.2,34,1.15,.06,'南面玻璃欄杆');
  box('concrete',-7.5,y-.23,18,34,.46,3.3,'南面採光迴廊');
  box('clear',-7.5,y+1.5,23.8,34,2.7,.06,'南面高側採光窗');
  for(const x of [-22,-15,-8,-1,6])batch('concrete',x,y+1.4,20,.6,3.1,7.4);
  // 西面為垂直的清水模／採光迴廊，與層退書牆構成不同立面。
  box('concrete',-22.65,y-.12,(north+south)/2,.5,.72,south-north+6.8,'西面垂直樓板帶');
  box('clear',-22.35,y+.7,(north+south)/2,.06,1.15,south-north+6.6,'西面玻璃欄杆');
  box('glass',-25.4,y+1.5,(north+south)/2,.08,2.7,south-north+7,'高側採光窗');
  for(let z=north-2;z<south+3;z+=4)batch('concrete',-24,y+1.35,z,2.8,2.9,.4);
 }
 // 角落斜梯連接退台，從2F可見；上層整體仍不建立玩家可走區。
 const segment=(kind,a,b,width,depth,name)=>{
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const mesh=box(kind,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,width,delta.length(),depth,name);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
 };
 for(let level=0;level<4;level++){
  const y=4.5+level*3.1,x0=.15+level*1.5+.5,x1=x0+1.5,z0=9.6,z1=15.2;
  segment('concrete',[x0,y,z0],[x1,y+3.1,z1],1.25,.18,'中庭上層斜梯底板');
  for(let i=0;i<16;i++){
   const t=i/16,x=x0+(x1-x0)*t,z=z0+(z1-z0)*t;
   batch('concrete',x,y+t*3.1,z,1.3,.13,.39);
   for(const side of [-1,1])batch('metal',x+side*.66,y+t*3.1+.55,z,.035,1.1,.035);
  }
  for(const side of [-1,1])segment('metal',[x0+side*.66,y+1.1,z0],[x1+side*.66,y+4.2,z1],.065,.065,'上層斜梯扶手');
 }
 // 天窗為短跨採光格與深鋼桁架：格間是真正透光開口，遠處只留天空背景。
 const roof=20.8;
 for(let z=-11;z<=23;z+=4.2){
  box('ink',-7.2,roof-1.05,z,35,.22,.22,'天窗鋼桁架下弦');
  box('ink',-7.2,roof-.08,z,35,.22,.22,'天窗鋼桁架上弦');
  for(let x=-24;x<10;x+=2.2){
   const beam=box('metal',x+1.1,roof-.56,z,Math.hypot(2.2,.97),.13,.13,'天窗斜撐');beam.rotation.z=((Math.round((x+24)/2.2)%2)?1:-1)*Math.atan2(.97,2.2);
  }
 }
 for(let x=-24;x<11;x+=2.2){
  box('white',x,roof+.05,6,.09,.13,40,'天窗縱向分格');
  for(let z=-10.5;z<25;z+=1.05){
   batch('clear',x+.98,roof+.1,z,1.75,.04,.68);
   batch('white',x+.98,roof+.08,z-.5,2.05,.08,.075);
  }
 }
 for(const [key,b]of batches){const mesh=new THREE.InstancedMesh(BOX,mat(b.kind),b.items.length);mesh.name='中庭批次：'+key;mesh.userData.atriumBooks=b.books;b.items.forEach(([x,y,z,w,h,d],i)=>{pose.position.set(x,y,z);pose.scale.set(w,h,d);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);});mesh.instanceMatrix.needsUpdate=true;root.add(mesh);}
 return root;
}
