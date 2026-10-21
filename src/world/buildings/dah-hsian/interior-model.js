/** 達賢2F模型。純Three幾何，Node可驗證，正式材質由interior-map注入。 */
import * as THREE from 'three';
import {FURNITURE,COLUMNS,WALLS} from './interior-layout.js';
import {buildAtrium} from './interior-atrium.js';
const BOX=new THREE.BoxGeometry(1,1,1);
export const INTERIOR_COLORS={concrete:'#c7c6bd',wall:'#e4e2d8',floor:'#d7d1c2',carpet:'#51758a',white:'#ecebe6',wood:'#bb9469',woodDark:'#8b684c',glass:'#b1cfce',clear:'#bdd8da',ink:'#35495a',metal:'#b6c5c4',light:'#fff6d7',sofa:'#967b68',green:'#75a95a',bookRed:'#bc7969',bookGold:'#d6b465',bookBlue:'#7195a4',bookGreen:'#8ca68b'};
export function createInteriorModel(materialFor){
 const materials=new Map();
 const mat=materialFor||((kind)=>{if(!materials.has(kind))materials.set(kind,kind==='outline'?new THREE.MeshBasicMaterial({color:'#2a2c4a',side:THREE.BackSide}):new THREE.MeshToonMaterial({color:INTERIOR_COLORS[kind]||INTERIOR_COLORS.wall}));return materials.get(kind);});
 const root=new THREE.Group();root.name='達賢2樓公開空間';
 const batches=new Map();const transform=new THREE.Object3D();
 const box=(parent,kind,x,y,z,w,h,d,name,outlined=false)=>{
  if(['書格背板','書格','書脊','格門鎖','桌腳','工作螢幕','展示層板','取還書槽','機柱藍光面'].includes(name)){repeat(kind,x+parent.position.x,y+parent.position.y,z+parent.position.z,w,h,d);return null;}
  const m=new THREE.Mesh(BOX,mat(kind));m.position.set(x,y,z);m.scale.set(w,h,d);m.name=name||kind;if(name?.includes('天花')||name?.includes('清水模柱'))m.userData.cameraOccluder=true;parent.add(m);
  if(outlined){const out=new THREE.Mesh(BOX,mat('outline'));out.scale.set(1+.03/w,1+.03/h,1+.03/d);m.add(out);}return m;
 };
 const repeat=(kind,x,y,z,w,h,d)=>{if(!batches.has(kind))batches.set(kind,[]);batches.get(kind).push([x,y,z,w,h,d]);};
 box(root,'floor',0,-.12,.5,46,.24,47,'2樓地板');
 box(root,'carpet',-11.4,-.013,8,22.8,.05,16,'挑空區藍地毯');
 box(root,'carpet',-.3,-.013,20,45,.05,8,'閱覽區藍地毯');
 for(const o of WALLS){
  if(o.x===-22.9||o.z===24){
   box(root,'concrete',o.x,.14,o.z,o.w,.28,o.d,'窗下矮基座');
   box(root,'concrete',o.x,4.08,o.z,o.w,.24,o.d,'窗上橫樑');
  }else box(root,o.kind||'concrete',o.x,o.h/2,o.z,o.w,o.h,o.d,'2樓邊界牆',o.kind!=='clear');
 }
 for(const z of [-22.75,-20,-17,-13.25])repeat('metal',-6.1,1.8,z,.1,3.6,.07);
 for(const y of [.05,3.55])repeat('metal',-6.1,y,-18,.1,.07,9.5);
 // 只封非公開作業區，從走道看見其門與特藏展示外牆。
 box(root,'wall',11,2.1,-3,22,4.2,38,'非公開作業區',true);
 for(const z of [-17,-11,-6]){
  box(root,'ink',-.23,1.15,z,.06,2.3,1.35,'關閉作業門');
  box(root,'metal',-.28,1.05,z+.4,.08,.07,.12,'門把');
 }
 // 窗面不當成透明無形開口：邊界牆及玻璃共同阻擋。
 for(let z=-19;z<=22;z+=3){
  if(Math.abs(z+12)<2)continue;
  box(root,'clear',-22.77,2.15,z,.07,3.5,2.8,'西側落地玻璃');
  repeat('white',-22.68,2.1,z-1.5,.12,4.2,.09);
 }
 for(let x=-20;x<22;x+=3){
  box(root,'clear',x,2.15,23.87,2.9,3.5,.06,'南側落地玻璃');
  repeat('white',x-1.5,2.1,23.8,.09,4.2,.13);
 }
 const garden=new THREE.Group();garden.name='窗外露台與植栽';root.add(garden);
 box(garden,'woodDark',0,-.12,27,48,.18,6,'南側木露台');
 box(garden,'green',0,-.25,42,76,.2,25,'窗外草坡');
 box(garden,'green',-32,-.25,0,18,.2,65,'西側草坪');
 for(let x=-23;x<24;x+=1.2)repeat('wood',x,-.015,27,.022,.016,5.9);
 for(let x=-22;x<25;x+=3){repeat('metal',x,.52,30,.045,1,.045);repeat('metal',x,.95,30,3.1,.04,.045);}
 for(const [x,z]of [[-24,35],[-16,38],[-7,37],[2,39],[12,37],[22,36],[-30,-16],[-32,-5],[-31,10],[-30,24]]){
  box(garden,'woodDark',x,1.7,z,.35,3.4,.35,'窗外樹幹');
  const canopy=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),mat('green'));canopy.position.set(x,4,z);canopy.scale.set(2.6,3,2.4);garden.add(canopy);
 }
 // 西側風除入口，門前不放實體中央板，玩家由互動鈕進出。
 for(const z of [-13.65,-10.35])box(root,'metal',-22.78,2.05,z,.16,4.1,.12,'入口門框');
 box(root,'white',-22.78,4.05,-12,.18,.15,3.4,'入口門楣');
 box(root,'ink',-21.5,.005,-12,2.6,.01,3.2,'入口深色地墊');
 for(const [x,z]of COLUMNS)box(root,'concrete',x,2.1,z,.7,4.2,.7,'2樓清水模柱',true);
 // 大廳淺色裸樑、細管線及吊燈；挑空中央不鋪低天花。
 box(root,'white',-11.5,4.35,-11.5,23,.18,23,'大廳天花');
 box(root,'white',-11.5,4.35,20.5,23,.18,7,'閱覽窗邊天花');
 for(let z=-21;z<=-3;z+=3.5){
  box(root,'concrete',-11.5,4.1,z,23,.45,.3,'大廳外露樑');
  repeat('white',-11.5,3.9,z+.55,22,.08,.07);
  for(const x of [-18,-10,-3])repeat('light',x,3.65,z+1.1,4,.045,.10);
 }
 for(let x=-20;x<20;x+=4)repeat('light',x,3.9,20.5,2.7,.04,.09);
 buildAtrium(root,mat);
 // 感恩牆：彩色陶片圍繞館名，採幾何與自畫字樣，不使用照片貼圖。
 box(root,'woodDark',-11.5,2.1,-22.77,16,3.7,.18,'感恩牆基底',true);
 const petal=new THREE.IcosahedronGeometry(1,1);
 const colors=['bookRed','bookGold','bookBlue','bookGreen','white'];
 for(let i=0;i<100;i++){
  const a=i*2.39996,r=1.1+((i*17)%23)/23*2;
  const m=new THREE.Mesh(petal,mat(colors[i%colors.length]));
  m.position.set(-11.5+Math.cos(a)*r*2.1,2.15+Math.sin(a)*r*.49,-22.59);
  m.scale.set(.11+(i%3)*.025,.15,.07);m.rotation.z=a;root.add(m);
 }
 // 服務櫃台外形是圓角弧端，碰撞採其保守外框；後方工作區不開放。
 for(const o of FURNITURE){
  const g=new THREE.Group();g.name=o.name;g.position.set(o.x,0,o.z);root.add(g);
  if(o.kind==='counter'){
   const s=new THREE.Shape(),w=o.w/2,d=o.d/2,r=1.4;
   s.moveTo(w,-d);s.lineTo(-w+r,-d);s.quadraticCurveTo(-w,-d,-w,-d+r);s.lineTo(-w,d-r);s.quadraticCurveTo(-w,d,-w+r,d);s.lineTo(w,d);s.closePath();
   const geo=new THREE.ExtrudeGeometry(s,{depth:o.h,bevelEnabled:false,curveSegments:10});geo.rotateX(-Math.PI/2);
   const m=new THREE.Mesh(geo,mat('white'));m.name='服務櫃台弧形本體';g.add(m);

   box(g,'ink',.61,2.1,-1.4,.09,1,1.1,'櫃台資訊螢幕');
   for(const z of [-2,0,2]){box(g,'metal',-.65,1.12,z,.7,.08,.8,'桌面');box(g,'ink',-.55,1.42,z,.1,.5,.65,'工作螢幕');}
  }else if(o.kind==='core'){
   box(g,'wood',0,2,0,o.w,4,o.d,'木色核心',true);
  }else if(['lockers','reserve','books'].includes(o.kind)){
   box(g,o.kind==='lockers'?'white':'wood',0,o.h/2,0,o.w,o.h,o.d,'書架外框',true);
   const rows=o.kind==='lockers'?4:3,cols=o.kind==='lockers'?8:3;
   // 大廳望向書架是西側面，格門與層板放在真正可見的一面。
   if(o.kind==='lockers'||o.kind==='reserve'){
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
     const y=(i+.5)*o.h/rows,z=-o.d/2+(j+.5)*o.d/cols;
     box(g,'ink',-o.w/2-.012,y,z,.025,o.h/rows-.06,o.d/cols-.06,'書格背板');
     if(o.kind==='lockers')box(g,'white',-o.w/2-.04,y,z-o.d/cols*.32,.035,.055,.055,'格門鎖');
     for(let k=0;k<2;k++)box(g,colors[(i+j+k)%4],-o.w/2-.035,y-.04,z-.1+k*.13,.025,o.h/rows*.6,.08,'書脊');
    }
   }else{
    for(let i=0;i<rows;i++)for(let j=0;j<6;j++){
     const y=(i+.5)*o.h/rows;
     box(g,'ink',0,y,-o.d/2-.015,o.w-.12,o.h/rows-.08,.03,'書格');
     box(g,colors[(i+j)%4],-o.w/2+.2+j*(o.w-.4)/6,y,-o.d/2-.04,(o.w-.4)/8,o.h/rows*.63,.05,'書脊');
    }
   }
  }else if(o.kind==='stairs'){
   const flight=box(g,'concrete',0,1.9,-.15,o.w,.18,Math.hypot(o.d,4),'斜向樓梯底板');flight.rotation.x=-Math.atan2(4,o.d);
   for(let i=0;i<20;i++)box(g,'concrete',0,(i+1)*.2-.07,-o.d/2+i*.3,o.w,.14,.3,'可見上樓階梯');
   for(const side of [-1,1])for(let i=0;i<20;i++)box(g,'metal',side*(o.w/2-.1),(i+1)*.2+.5,-o.d/2+i*.3,.045,1,.045,'樓梯扶手柱');
   for(const side of [-1,1]){
    const rail=box(g,'wood',side*(o.w/2-.1),2.6,0,.065,.065,Math.hypot(o.d,4),'樓梯連續扶手');rail.rotation.x=-Math.atan2(4,o.d);
   }
   box(g,'metal',0,.55,-o.d/2-.05,o.w,1.1,.08,'關閉樓梯欄門',true);
  }else if(o.kind==='gate'){
   box(g,'metal',0,.52,0,o.w,1.04,o.d,'閘門機柱',true);
   box(g,'ink',0,1.07,0,o.w+.015,.035,o.d*.8,'閘門頂蓋');
   box(g,'bookBlue',o.w/2+.012,.65,0,.02,.7,o.d*.65,'機柱藍光面');
  }else if(o.kind==='table'){
   box(g,'wood',0,.71,0,o.w,.1,o.d,'閱讀桌面',true);
   for(const x of [-o.w/2+.15,o.w/2-.15])for(const z of [-o.d/2+.15,o.d/2-.15])box(g,'metal',x,.34,z,.06,.68,.06,'桌腳');
  }else if(o.kind==='sofa'||o.kind==='chair'){
   const chair=o.kind==='chair',fabric=chair?'bookBlue':'sofa';
   box(g,fabric,0,.4,0,o.w,.22,o.d,'座墊',true);
   box(g,fabric,0,.72,chair?-o.d/2+.08:o.d/2-.1,o.w,.48,.16,'椅背',true);
   for(const x of [-o.w/2+.09,o.w/2-.09]){
    box(g,chair?'wood':'sofa',x,.58,0,.09,.16,o.d,'扶手');
    for(const z of [-o.d/2+.09,o.d/2-.09])box(g,'wood',x,.18,z,.05,.36,.05,'座椅腳');
   }
  }else{
   box(g,'white',0,o.h/2,0,o.w,o.h,o.d,'自助設備本體',true);
   box(g,'ink',0,o.h*.78,-o.d/2-.015,o.w*.75,o.h*.25,.03,'觸控螢幕');
   box(g,'bookBlue',0,o.h*.79,-o.d/2-.035,o.w*.57,o.h*.13,.015,'螢幕顯示');
   box(g,'ink',0,o.h*.35,-o.d/2-.02,o.w*.6,.08,.04,'取還書槽');
  }
 }
 // 特藏正面：中央展示螢幕、兩側暗底格櫃與陶器，保留書牆下的觀看焦點。
 box(root,'wood',-.27,1.7,8,.16,3.4,14,'特藏正面飾板');
 box(root,'ink',-.4,1.7,8,.08,1.85,6.2,'展示螢幕黑框');
 box(root,'display',-.46,1.7,8,.04,1.65,6,'自畫典藏展示畫面');
 const vaseProfile=[new THREE.Vector2(.13,0),new THREE.Vector2(.14,.05),new THREE.Vector2(.25,.15),new THREE.Vector2(.24,.3),new THREE.Vector2(.12,.4),new THREE.Vector2(.09,.53)];
 const vaseGeo=new THREE.LatheGeometry(vaseProfile,10);
 for(const z of [2.5,13.5]){
  box(root,'ink',-.4,1.7,z,.12,2.7,3.9,'特藏暗底展示龕');
  for(const yy of [.45,1.35,2.25]){
   box(root,'wood',-.6,yy,z,.5,.055,3.8,'特藏水平層板');
   for(let j=0;j<3;j++){
    const v=new THREE.Mesh(vaseGeo,mat(['white','bookGold','bookGreen'][j]));v.name='典藏陶器';v.position.set(-.68,yy+.04,z-1.25+j*1.25);v.scale.setScalar(.8+(j%2)*.25);root.add(v);
   }
  }
  for(const zz of [z-1.9,z-.65,z+.65,z+1.9])box(root,'wood',-.6,1.7,zz,.5,2.7,.045,'展示豎框');
  repeat('light',-.64,3.03,z,.44,.03,3.8);
 }
 for(const z of [2,8]){
  box(root,'metal',-22.55,1.55,z,.12,3,1.9,'電梯門');repeat('ink',-22.45,1.55,z,.015,2.9,.04);
 }
 for(const [kind,list]of batches){const m=new THREE.InstancedMesh(BOX,mat(kind),list.length);m.name='2樓批次：'+kind;list.forEach(([x,y,z,w,h,d],i)=>{transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,0,0);transform.updateMatrix();m.setMatrixAt(i,transform.matrix);});m.instanceMatrix.needsUpdate=true;root.add(m);}
 return root;
}
