/** 達賢2F模型。純Three幾何，Node可驗證，正式材質由interior-map注入。 */
import * as THREE from 'three';
import {FURNITURE,COLUMNS,WALLS,ENTRANCE_STRUCTURES,RESTROOM_DOORS,ENTRANCE_DOORS,UTILITY_DOOR} from './interior-layout.js';
import {buildAtrium} from './interior-atrium.js';
const BOX=new THREE.BoxGeometry(1,1,1);
export const INTERIOR_COLORS={concrete:'#c7c6bd',wall:'#e4e2d8',floor:'#d7d1c2',carpet:'#51758a',white:'#ecebe6',wood:'#bb9469',woodDark:'#8b684c',gratitude:'#827c55',glass:'#b1cfce',clear:'#bdd8da',ink:'#35495a',metal:'#b6c5c4',light:'#fff6d7',sofa:'#967b68',green:'#75a95a',bookRed:'#bc7969',bookGold:'#d6b465',bookBlue:'#7195a4',bookGreen:'#8ca68b'};
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
 for(const z of [-9.5,-7.2,-5,-2.7])repeat('metal',-5.3,1.8,z,.1,3.6,.07);
 for(const y of [.05,3.55])repeat('metal',-5.3,y,-6.1,.1,.07,6.8);
 const reserveDoor=new THREE.Group();reserveDoor.name='預約室玻璃門';root.add(reserveDoor);
 for(const z of [-2.7,-.4])box(reserveDoor,'metal',-5.3,1.8,z,.12,3.6,.07,'預約室門框');
 box(reserveDoor,'metal',-5.3,3.55,-1.55,.12,.08,2.4,'預約室門楣');
 box(reserveDoor,'clear',-5.42,1.7,-3.4,.06,3.3,1.3,'預約室退開門片');
 box(reserveDoor,'metal',-5.48,1.25,-2.94,.05,.7,.06,'預約室門把');
 for(const x of [-5.3,-3.5,-1.7,0])box(root,'metal',x,1.8,-.4,.06,3.6,.1,'預約室南玻璃框');
 for(const y of [.05,3.55])box(root,'metal',-2.65,y,-.4,5.3,.07,.1,'預約室南橫框');
 // 大廳北側的窗列，在感恩牆左端把視線接到室外。
 for(const x of [-14,-11.2,-8.4,-5.6,-2.8]){
  box(root,'white',x-1.35,2.1,-22.84,.09,4.2,.13,'大廳北窗直框');
  box(root,'white',x,2.8,-22.84,2.75,.08,.13,'大廳北窗橫框');
 }

 // 只封非公開作業區，從走道看見其門與特藏展示外牆。
 box(root,'wall',11,2.1,-3,22,4.2,38,'非公開作業區',true);
 for(const z of [-17,-11,-6]){
  box(root,'ink',-.23,1.15,z,.06,2.3,1.35,'關閉作業門');
  box(root,'metal',-.28,1.05,z+.4,.08,.07,.12,'門把');
 }
 // 窗面不當成透明無形開口：邊界牆及玻璃共同阻擋。
 for(let z=-19;z<=22;z+=3){
  if(z<0)continue;
  box(root,'clear',-22.77,2.15,z,.07,3.5,2.8,'西側落地玻璃');
  repeat('white',-22.68,2.1,z-1.5,.12,4.2,.09);
 }
 // 廁所前廊西端的窄窗補回可見邊界，和既有外牆碰撞一致。
 box(root,'clear',-22.77,2.1,-16.3,.07,3.8,2.6,'廁所前廊西端玻璃');
 for(const z of [-17.6,-15])box(root,'white',-22.7,2.1,z,.12,4.2,.08,'前廊窗框');
 for(let x=-20;x<22;x+=3){
  box(root,'clear',x,2.15,23.87,2.9,3.5,.06,'南側落地玻璃');
  repeat('white',x-1.5,2.1,23.8,.09,4.2,.13);
 }
 const garden=new THREE.Group();garden.name='窗外露台與植栽';root.add(garden);
 // 室內外是分場景；此處補同一道2F門的外部視景，按戶外門/柱/欄杆的相對位置轉入室內座標。
 // 不能沿用西窗通用草坪直接接在出館門檻。
 box(garden,'floor',-32.4,-.14,-12,19.2,.28,30,'入口外2F鋪磚平台');
 const portico=new THREE.Group();portico.name='門廊外柱列';garden.add(portico);
 for(const z of [-25.4,-13.4,-1.4]){
  box(portico,'concrete',-36.34,1.65,z,.8,3.3,.8,'門廊外清水模柱');
  box(portico,'concrete',-29.7,3.14,z,14.1,.42,.38,'門廊外橫樑');
 }
 for(let z=-26;z<3;z+=2.45)box(portico,'concrete',-29.7,3.14,z,14.1,.24,.22,'門廊外細樑');
 const rails=new THREE.Group();rails.name='門廊外欄杆';garden.add(rails);
 box(rails,'metal',-42,.98,-12,.06,.06,30,'門廊外欄杆扶手');
 for(let z=-27;z<=3;z+=.34)box(rails,'metal',-42,.48,z,.035,.92,.035,'門廊外垂直欄條');
 box(garden,'woodDark',0,-.12,27,48,.18,6,'南側木露台');
 box(garden,'green',0,-.25,42,76,.2,25,'窗外草坡');
 box(garden,'green',-32,-.25,0,18,.2,65,'西側草坪');
 box(garden,'green',-10,-.25,-32,30,.2,18,'大廳窗外草坡');
 for(let x=-23;x<24;x+=1.2)repeat('wood',x,-.015,27,.022,.016,5.9);
 for(let x=-22;x<25;x+=3){repeat('metal',x,.52,30,.045,1,.045);repeat('metal',x,.95,30,3.1,.04,.045);}
 for(const [x,z]of [[-14,-30],[-5,-32],[-24,35],[-16,38],[-7,37],[2,39],[12,37],[22,36],[-46,-16],[-46,-5],[-31,10],[-30,24]]){
  box(garden,'woodDark',x,1.7,z,.35,3.4,.35,'窗外樹幹');
  const canopy=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),mat('green'));canopy.position.set(x,4,z);canopy.scale.set(2.6,3,2.4);garden.add(canopy);
 }
 for(const o of ENTRANCE_STRUCTURES){
  if(o.name==='感恩牆隔牆')continue;
  const wall=box(root,'wall',o.x,o.h/2,o.z,o.w,o.h,o.d,o.name);wall.userData.cameraOccluder=true;
 }
 // 廁所前廊可走，隔間內部不以缺少照片的擺設臆造。
 for(const o of [...RESTROOM_DOORS,UTILITY_DOOR]){
  const g=new THREE.Group();g.name=o.label+'門組';g.position.set(o.x,0,o.z);g.rotation.y=o.angle||0;root.add(g);
  box(g,'wood',0,1.15,0,o.w,2.3,.09,o.name);
  for(const x of [-o.w/2-.05,o.w/2+.05])box(g,'metal',x,1.18,.03,.06,2.36,.07,'廁所門框');
  box(g,'metal',0,2.36,.03,o.w+.16,.07,.07,'廁所門楣');
  box(g,'metal',.35,1.05,.10,.20,.05,.07,'廁所門把');
 }
 // 隱私牆前的小畫框沿實景位置，不重製照片中的畫作。
 box(root,'woodDark',-14.94,2.1,-20.1,.08,1.05,1.5,'廁所前畫框');
 box(root,'bookGold',-14.88,2.1,-20.1,.03,.85,1.3,'中性展示畫面');
 // 兩道白框玻璃門形成風除室；門片停在兩側，中央留下可見且可走的開口。
 for(const x of ENTRANCE_DOORS){
  const g=new THREE.Group();g.name='風除室玻璃門';g.position.x=x;root.add(g);
  for(const z of [-15,-13.2,-10.8,-9])box(g,'white',0,2.1,z,.15,4.2,.09,'入口門框');
  for(const y of [.035,2.75,4.1])box(g,'white',0,y,-12,.15,.08,6.1,'入口橫框');
  box(g,'clear',0,3.42,-12,.06,1.25,6,'門上亮窗');
  for(const z of [-14.1,-9.9]){
   box(g,'clear',0,1.37,z,.06,2.65,1.72,'固定側玻璃');
   // 門片沿滑軌退入固定玻璃前，不把開啟門畫成能穿越的關閉玻璃。
   const parked=z<-12?-13.94:-10.06;
   box(g,'clear',.11,1.37,parked,.06,2.65,1.28,'開啟玻璃門片');
   for(const zz of [parked-.65,parked+.65])box(g,'white',.11,1.37,zz,.09,2.7,.055,'門片直框');
   box(g,'metal',.18,1.3,parked+(z<-12?.4:-.4),.07,.55,.055,'門片把手');
   box(g,'white',.15,1.08,z,.02,.07,1.6,'玻璃防撞標記');
  }
  box(g,'ink',.18,2.84,-12,.13,.13,.34,'自動門感應器');
 }
 box(root,'ink',-21,.008,-12,3.4,.016,2.3,'入口深色地墊');
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
 // 木質感恩牆是大廳東側隔牆；北端保留採光窗，不能把它轉成端牆。
 const gratitude=new THREE.Group();gratitude.name='大廳側面感恩牆';gratitude.position.set(-2.35,0,-17);gratitude.rotation.y=-Math.PI/2;root.add(gratitude);
 box(gratitude,'gratitude',0,2.1,0,11.2,3.7,.18,'感恩牆基底',true);
 const petalShape=new THREE.Shape();petalShape.moveTo(0,1);petalShape.bezierCurveTo(-.35,.5,-1,-.4,-.5,-.8);petalShape.quadraticCurveTo(0,-1.1,.5,-.8);petalShape.bezierCurveTo(1,-.4,.35,.5,0,1);
 const petal=new THREE.ExtrudeGeometry(petalShape,{depth:.7,bevelEnabled:true,bevelSize:.07,bevelThickness:.07,bevelSegments:1,steps:1});
 const colors=['bookRed','bookGold','bookBlue','bookGreen','white'];
 for(let i=0;i<190;i++){
  const a=i*2.39996,r=.95+((i*17)%23)/23*.55;
  const m=new THREE.Mesh(petal,mat(colors[i%colors.length]));
  // 右側圍館名的花瓣圈，向窗邊延伸成左側散落的陶片。
  const ring=i<130;
  m.position.set(ring?2+Math.cos(a)*r*1.55:-4.8+(i-130)/60*5.6,ring?2.12+Math.sin(a)*r*.85:2.05+Math.sin(i*1.7)*.7,.14);
  m.scale.set(.09+(i%3)*.022,.13,.065);m.rotation.z=a;gratitude.add(m);
 }
 const plaque=box(gratitude,'ink',-3.1,1.02,.25,4.4,.8,.10,'捐贈名錄斜面');plaque.rotation.x=-.24;
 // 服務櫃台外形是圓角弧端，碰撞採其保守外框；後方工作區不開放。
 for(const o of FURNITURE){
  const g=new THREE.Group();g.name=o.name;g.position.set(o.x,0,o.z);root.add(g);
  if(o.kind==='counter'){
   const s=new THREE.Shape(),w=o.w/2,d=o.d/2,r=1.4;
   s.moveTo(w,-d);s.lineTo(-w+r,-d);s.quadraticCurveTo(-w,-d,-w,-d+r);s.lineTo(-w,d-r);s.quadraticCurveTo(-w,d,-w+r,d);s.lineTo(w,d);s.closePath();
   const geo=new THREE.ExtrudeGeometry(s,{depth:o.h,bevelEnabled:false,curveSegments:10});geo.rotateX(-Math.PI/2);
   const m=new THREE.Mesh(geo,mat('white'));m.name='服務櫃台弧形本體';g.add(m);

   for(const z of [-2,0,2]){box(g,'metal',-.65,1.12,z,.7,.08,.8,'桌面');box(g,'ink',-.55,1.42,z,.1,.5,.65,'工作螢幕');}
  }else if(o.kind==='core'){
   box(g,'wood',0,2,0,o.w,4,o.d,'木色核心',true);
   box(g,'ink',-o.w/2-.09,2.2,0,.08,1.05,1.4,'櫃台資訊螢幕');
   box(g,'display',-o.w/2-.14,2.2,0,.02,.88,1.23,'櫃台螢幕畫面');
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
  }else if(o.kind==='bench'){
   box(g,'wood',0,.43,0,o.w,.1,o.d,'長凳木座面');
   for(const x of [-o.w/2+.16,o.w/2-.16])box(g,'wood',x,.21,0,.08,.42,o.d,'長凳腳');
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
 // 西側電梯位在核心的東面，不能直接貼在外側採光窗上。
 for(const z of [3.3,6.3]){
  box(root,'metal',-15.15,1.5,z,.10,2.9,1.65,'電梯門');
  box(root,'ink',-15.08,1.5,z,.015,2.85,.025,'電梯門縫');
  box(root,'ink',-15.07,1.15,z+1.05,.06,.28,.16,'電梯呼叫面板');
 }
 box(root,'metal',-16.8,1.45,-7.66,1.65,2.9,.08,'B梯旁電梯門');
 box(root,'ink',-16.8,1.45,-7.72,.025,2.85,.015,'B梯旁電梯門縫');
 box(root,'clear',-19.25,1.4,-7.66,1.5,2.8,.07,'B梯關閉玻璃門');
 for(const x of [-20.05,-18.45])box(root,'metal',x,1.43,-7.73,.07,2.86,.1,'B梯門框');
 box(root,'metal',-19.25,2.86,-7.73,1.67,.07,.1,'B梯門楣');
 box(root,'metal',-18.7,1.2,-7.76,.06,.6,.06,'B梯門把');
 for(const [kind,list]of batches){const m=new THREE.InstancedMesh(BOX,mat(kind),list.length);m.name='2樓批次：'+kind;list.forEach(([x,y,z,w,h,d],i)=>{transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,0,0);transform.updateMatrix();m.setMatrixAt(i,transform.matrix);});m.instanceMatrix.needsUpdate=true;root.add(m);}
 return root;
}
