/** 1F公開外觀。平面：2026 A1招租附件；咖啡木面：Tina05–13、Morris01–19。
 * 店內僅呈現窗後可見家具，不新增進店玩法。A1新裝修缺照片，保留既有建築窗框。
 */
import * as THREE from 'three';
import {LAKESIDE_SHOPS,LOWER_WC,PICNIC_TABLES,CAFE_BENCHES,LOWER_WC_SCREEN,LOWER_WC_ENTRIES,LOWER_WC_FRONT_WALLS,LOWER_WC_END_WALLS,LOWER_WC_TURN_WALLS,SHOP_WAITING_CHAIRS,HOTPOT_MENU,LAKESIDE_Y,LAKESIDE_DECK,LAKESIDE_TREAD} from './layout.js';
const box=new THREE.BoxGeometry(1,1,1);
export function createLakeside(materialFor){
 const root=new THREE.Group();root.name='1F湖邊公共層';
 const add=(g,kind,x,y,z,w,h,d,name,angle=0)=>{
  const m=new THREE.Mesh(box,materialFor(kind));m.position.set(x,y,z);m.scale.set(w,h,d);m.rotation.y=angle;m.name=name||kind;g.add(m);return m;
 };
 // 2F平台底板、廊下燈與地面排水。兩側留下湖畔通路，不把1F鋪成草地。
 const deck=(points,top,name)=>{
  const s=new THREE.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:top,bevelEnabled:false}),materialFor('paving'));
  mesh.rotation.x=-Math.PI/2;mesh.name=name;root.add(mesh);
 };
 deck(LAKESIDE_TREAD,LAKESIDE_Y/2,'1F曲線外踏階');deck(LAKESIDE_DECK,LAKESIDE_Y,'1F曲線抬高廊坪');
 // 側廊末端用平緩坡銜接零高處，避免看不見的30cm斷層。
 const ramp=new THREE.BufferGeometry();ramp.setAttribute('position',new THREE.Float32BufferAttribute([10.1,.3,-2.4,15,0,1,15,.3,-2.4,10.1,.3,-2.4,10.1,0,1,15,0,1],3));ramp.computeVertexNormals();
 const slope=new THREE.Mesh(ramp,materialFor('paving'));slope.name='1F側廊緩坡';root.add(slope);
 add(root,'paving',13,.015,9,5.6,.03,37.5,'1F側廊鋪面');
 add(root,'paving',-21.3,LAKESIDE_Y-.015,-19.6,2.5,.03,10,'1F廁所前廊地坪');
 add(root,'concrete',-7.8,3.7,-26.8,39.8,.22,4.4,'湖畔廊下平台封邊');
 add(root,'seam',-7.8,LAKESIDE_Y+.006,-26.5,39.8,.012,.06,'湖畔線型排水');
 for(let x=-25;x<13;x+=3.4){
  add(root,'seam',x,LAKESIDE_Y+.004,-26.8,.018,.008,3.8,'廊下地坪分縫');
  add(root,'lamp',x,3.56,-26.8,.26,.035,.26,'廊下圓燈');
 }
 for(const s of LAKESIDE_SHOPS){
  const g=new THREE.Group();g.name=s.name;g.position.set(s.x,LAKESIDE_Y,s.z);root.add(g);
  const timber=s.id==='A3',frame=timber?'timber':'frame';
  const front=-s.d/2;
  add(g,'shopFloor',0,.06,0,s.w,.12,s.d,'店內地坪');
  add(g,timber?'timberLight':'shopWall',0,1.8,s.d/2-.08,s.w,3.6,.16,'店內後牆');
  for(const side of [-1,1])if(!timber||side<0)add(g,'shopWall',side*(s.w/2-.08),1.8,0,.16,3.6,s.d,'店面分戶牆');
  if(!timber){
  add(g,frame,0,3.35,front,s.w,.35,.15,'店面上緣');
  add(g,frame,0,.06,front,s.w,.1,.15,'窗下立面');
  const glass=add(g,'shopGlass',0,1.6,front-.015,s.w-.18,2.95,.045,'1F店面湖面玻璃');
  glass.renderOrder=2;
  for(let x=-s.w/2;x<=s.w/2+.01;x+=s.w/6)add(g,frame,x,1.6,front-.06,.075,3,.12,'店面窗直框');
  for(const y of [.1,.85,2.05,2.75,3.15])add(g,frame,0,y,front-.06,s.w,.075,.12,'店面窗橫框');
  for(const x of [-3.15,3.15]){
   const vent=new THREE.Group();vent.name='店前上方通風窗';g.add(vent);
   for(let y=2.84;y<3.13;y+=.07)add(vent,'frame',x,y,front-.12,1.5,.035,.07,'上亮窗通風百葉');
  }
  if(s.id==='A2'){
   const door=new THREE.Group();door.name='小尚品入口玻璃門';g.add(door);
   for(const x of [-.5,.5]){
    add(door,'shopGlass',x,1.1,front-.1,.94,2.15,.04,'小尚品門片');
    add(door,'rail',x+(x<0?.34:-.34),1.15,front-.18,.04,.48,.055,'小尚品門把');
   }
  }
  }else{
   const rounded=(x,y,w,h,r)=>{
    const p=new THREE.Shape(),l=x-w/2,t=y+h/2,b=y-h/2,rr=x+w/2;
    p.moveTo(l+r,b);p.lineTo(rr-r,b);p.quadraticCurveTo(rr,b,rr,b+r);p.lineTo(rr,t-r);p.quadraticCurveTo(rr,t,rr-r,t);p.lineTo(l+r,t);p.quadraticCurveTo(l,t,l,t-r);p.lineTo(l,b+r);p.quadraticCurveTo(l,b,l+r,b);return p;
   };
   const face=rounded(0,1.8,s.w,3.6,.01);
   for(const [x,w,r]of [[-3.95,3,.32],[-.8,3,.32],[2.15,1.85,.02],[3.9,.83,.02],[4.9,.83,.02]]){
    const door=x>3,shape=rounded(x,door?2.04:1.84,w,door?1.3:1.9,r);
    face.holes.push(new THREE.Path(shape.getPoints()));
    const glass=new THREE.Mesh(new THREE.ShapeGeometry(shape),materialFor('shopGlass'));
    glass.position.z=front-.07;glass.name=x===-3.95?'1F咖啡湖面玻璃':'咖啡圓角窗玻璃';glass.renderOrder=2;g.add(glass);
    if(x<0){
     const rim=rounded(x,1.84,w+.16,2.06,r+.08);rim.holes.push(new THREE.Path(shape.getPoints()));
     const frame=new THREE.Mesh(new THREE.ExtrudeGeometry(rim,{depth:.055,bevelEnabled:false}),materialFor('timberLight'));frame.position.z=front-.18;frame.name='圓角窗木框';g.add(frame);
    }
    if(!door)add(g,'timber',x,1.45,front-.12,w,.065,.08,'咖啡窗中橫框');
   }
   const wood=new THREE.Mesh(new THREE.ExtrudeGeometry(face,{depth:.12,bevelEnabled:false}),materialFor('timber'));
   wood.position.z=front-.12;wood.name='咖啡圓角窗木立面';g.add(wood);
   for(const x of [1.42,2.15,2.88])add(g,'timber',x,1.84,front-.15,.055,1.88,.08,'小窗直格');
   for(const y of [1.2,1.84,2.48])add(g,'timber',2.15,y,front-.15,1.84,.055,.08,'小窗橫格');
  }
  if(timber){
   // 深橘木門、窗下橫板與兩窗之間的幾何拼木柱。
   for(let y=.12;y<.85;y+=.16)add(g,'timberLight',0,y,front-.1,s.w-.2,.13,.025,'窗下橫木板');
   for(let x=-s.w/2;x<s.w/2;x+=.3)add(g,x%1>.4?'timberLight':'timber',x,3.1,front-.1,.27,.72,.04,'上緣直拼木板');
   const pillar=new THREE.Group();pillar.name='咖啡拼木柱';pillar.position.set(.98,0,front-.15);g.add(pillar);
   add(pillar,'timber',0,1.45,0,.85,2.9,.18,'拼木柱底');
   for(let row=0;row<7;row++)for(const side of [-1,1]){
    const strip=add(pillar,'timberDark',side*.2,.7+row*.22,-.11,.5,.055,.03,'拼木箭形');strip.rotation.z=side*.68;
   }
   // Tina06正面左端雙門；Tina07左側回折為細木格窗，不把門誤移到側面。
   const side=s.w/2+.015;
   add(g,'shopGlass',side,1.84,0,.04,1.92,s.d-.2,'咖啡側面玻璃');
   for(let z=front;z<s.d/2;z+=1.1)add(g,'timber',side+.04,1.8,z,.12,3.5,.08,'側面細木框');
   add(g,'timber',side+.05,.45,0,.14,.84,s.d,'側窗下木板');
   add(g,'timber',side+.05,3.12,0,.14,.74,s.d,'側窗上木板');
   const doors=new THREE.Group();doors.name='咖啡轉角雙門';g.add(doors);
   for(const x of [3.9,4.9]){
    add(doors,'timber',x,.69,front-.15,.94,1.38,.1,'咖啡門下木板');
    for(const dx of [-.47,.47])add(doors,'timber',x+dx,1.4,front-.17,.08,2.8,.12,'咖啡門框');
    add(doors,'timberDark',x+(x<4.5?.32:-.32),1.2,front-.25,.05,.24,.06,'咖啡門把');
   }
   add(g,'timberLight',0,3.42,0,s.w,.12,s.d,'咖啡木梁天花');
   for(let z=front+.5;z<s.d/2;z+=1.7)add(g,'timber',0,3.29,z,s.w,.18,.13,'咖啡天花木梁');
   for(const x of [-3,0,3]){
    add(g,'timberDark',x,2.96,-2,.035,.66,.035,'咖啡吊燈線');
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.15,10,7),materialFor('lamp'));lamp.name='咖啡暖色吊燈';lamp.position.set(x,2.59,-2);g.add(lamp);
   }
   for(const bench of CAFE_BENCHES){
    const x=bench.x-s.x,z=bench.z-s.z;
    add(g,'timber',x,.48,z,bench.w,.07,bench.d,'咖啡窗下長凳');
    for(const dx of [-bench.w*.36,bench.w*.36])for(const dz of [-.17,.17])add(g,'timberDark',x+dx,.23,z+dz,.045,.46,.045,'長凳腳');
    add(g,'timberDark',x,.18,z,bench.w*.72,.04,.04,'長凳腳橫撐');
   }
   add(g,'timber',-2.5,1.02,2.8,5,.16,.85,'窗後咖啡吧台');
   add(g,'timberDark',-2.5,.5,2.8,5,1,.74,'咖啡吧台櫃');
   add(g,'pot',-3,1.3,2.8,1,.55,.65,'咖啡機');
   for(const x of [-4,-2,0]){
    add(g,'timberDark',x,.44,-4.9,.6,.1,.6,'咖啡窗邊椅');
    add(g,'timber',x,.73,-5.15,.6,.6,.08,'咖啡椅背');
   }
   add(g,'timber',-2.4,.96,front+1.05,5.7,.11,.55,'咖啡臨窗長桌');
   add(g,'upholstery',-3,.45,.2,3.4,.85,.9,'咖啡沙發座');
   add(g,'timberDark',-3,.82,.6,3.4,.65,.18,'咖啡沙發背');

   for(const x of [-3,0,3]){
    add(g,'timberLight',x,.75,-2.7,1.7,.1,.8,'咖啡窗後桌');
    add(g,'timberDark',x,.36,-2.7,.14,.72,.4,'桌腳');
   }
  }else if(s.id==='A2'){
   // 校方2024年報實拍：米白卡座、淺木桌椅與桌面鍋口。
   for(const x of [-3,0,3]){
    add(g,'upholstery',x,.65,1.8,2.3,1.3,.55,'小尚品米白卡座');
    add(g,'timberLight',x,.78,.4,2,.1,1,'小尚品餐桌');
    for(const dx of [-.5,.5])add(g,'pot',x+dx,.84,.4,.42,.035,.42,'桌面鍋口');
    for(const dx of [-.55,.55]){
     add(g,'timberLight',x+dx,.45,-.7,.55,.1,.55,'小尚品餐椅');
     add(g,'timberLight',x+dx,.8,-.95,.55,.65,.08,'餐椅椅背');
    }
   }
  }
 }
 const w=LOWER_WC,g=new THREE.Group();g.name='1F廁所前廊';g.position.y=LAKESIDE_Y;root.add(g);
 // 1F圖面左側前廊接店面方向；照片前景為白色無障礙滑門，後方是轉入的廁所口。
 add(g,'shopFloor',w.x,-.02,w.z,w.w,.04,w.d,'1F廁所凹間連續地板');
 add(g,'concrete',w.x-.5,1.8,w.z,2,3.6,w.d,'1F廁所內部關閉量體');
 for(const wall of LOWER_WC_END_WALLS)add(g,'concrete',wall.x,wall.h/2,wall.z,wall.w,wall.h,wall.d,'1F廁所凹間端牆');
 for(const [z0,z1]of LOWER_WC_FRONT_WALLS)add(g,'concrete',w.frontX,1.8,(z0+z1)/2,.2,3.6,z1-z0,'廁所入口間牆');
 add(g,'concrete',w.frontX,3.0,w.z,.2,1.2,w.d,'廁所入口上樑');
 for(const [i,entry]of LOWER_WC_ENTRIES.entries()){
  const {name,z}=entry,portal=new THREE.Group();portal.name=name;portal.position.set(w.frontX,0,z);g.add(portal);
  for(const side of [-1,1])add(portal,'frame',.055,1.15,side*entry.w/2,.1,2.3,.065,'入口白框');
  add(portal,'frame',.055,2.3,0,.1,.08,entry.w+.1,'入口白框');
  if(i===0){
   add(portal,'frame',.03,1.1,0,.05,2.2,entry.w-.08,'白色滑門片');
   for(let zz=-.6;zz<.7;zz+=.1)add(portal,'seam',.065,1.1,zz,.006,2.17,.009,'滑門垂直細縫');
   add(portal,'pot',.1,1.05,.82,.04,.22,.11,'無障礙門開關');
   add(portal,'lamp',.123,1.05,.82,.01,.055,.055,'門開關按鈕');
  }else{
   add(portal,'shopFloor',-.45,-.02,0,.9,.04,entry.w,'廁所轉入口地坪');
   const turn=LOWER_WC_TURN_WALLS[i-1];
   add(g,'shopWall',turn.x,turn.h/2,turn.z,turn.w,turn.h,turn.d,'廁所入口轉折牆');
   for(let y=.25;y<2.4;y+=.3)add(portal,'seam',-.72,y,-.35,.012,.008,1.4,'入口磁磚分縫');
  }
 }
 const screen=LOWER_WC_SCREEN;
 add(g,'concrete',screen.x,screen.h/2,screen.z,screen.w,screen.h,screen.d,'1F廁所前廊側牆');
 add(g,'pot',-21.3,1.2,-14.77,2.2,2.4,.1,'廁所前廊末端設備雙門');
 for(const x of [-21.35,-21.15])add(g,'rail',x,1.12,-14.85,.13,.04,.06,'設備門把');
 for(const t of PICNIC_TABLES){
  const table=new THREE.Group();table.name='湖邊野餐桌';table.position.set(t.x,0,t.z);root.add(table);
  for(let z=-.4;z<=.4;z+=.2)add(table,'timber',0,.8,z,t.w,.08,.18,'野餐桌木條');
  for(const z of [-.9,.9]){
   add(table,'timber',0,.44,z,t.w,.09,.43,'野餐長凳');
   for(const x of [-.9,.9])for(const dz of [-.15,.15])add(table,'pot',x,.23,z+dz,.045,.42,.045,'野餐凳鋼腳');
  }
  for(const x of [-.9,.9]){
   for(const z of [-.32,.32]){const leg=add(table,'pot',x,.39,z,.045,.78,.045,'野餐桌鋼架');leg.rotation.x=z<0?-.15:.15;}
   add(table,'pot',x,.73,0,.045,.045,.95,'野餐桌橫撐');
   for(const side of [-1,1]){const brace=add(table,'pot',x,.33,side*.65,.04,.04,.65,'野餐桌斜撐');brace.rotation.x=side*.35;}
  }
 }
 for(const chair of SHOP_WAITING_CHAIRS){
  const c=new THREE.Group();c.name='小尚品候位摺椅';c.position.set(chair.x,LAKESIDE_Y,chair.z);root.add(c);
  add(c,'pot',0,.44,0,chair.w,.055,.45,'黑色摺椅座');
  add(c,'pot',0,.76,.18,.48,.26,.055,'黑色摺椅背');
  for(const x of [-.21,.21])for(const side of [-1,1]){
   const leg=add(c,'pot',x,.24,side*.03,.027,.58,.027,'摺椅交叉腳');leg.rotation.x=side*.55;
  }
 }
 const menu=new THREE.Group();menu.name='小尚品菜單架';menu.position.set(HOTPOT_MENU.x,LAKESIDE_Y,HOTPOT_MENU.z);root.add(menu);
 add(menu,'pot',0,.95,0,HOTPOT_MENU.w,.8,.06,'菜單深色板');
 for(const x of [-.25,.25])add(menu,'pot',x,.35,.1,.035,.7,HOTPOT_MENU.d,'菜單架腳');
 for(let y=.75;y<1.25;y+=.1)add(menu,'frame',0,y,-.035,.48,.008,.01,'菜單行列');
 const vent=new THREE.Group();vent.name='1F停車層通風帶';root.add(vent);
 for(const z of [-6,0,6,12,18,24]){
  add(vent,'seam',10.045,2.4,z,.03,1.4,4.7,'停車層通風暗口');
  for(let dz=-2.25;dz<=2.25;dz+=.18)add(vent,'frame',10.1,2.4,z+dz,.08,1.4,.035,'通風口直柵');
  for(const dz of [-2.4,2.4])add(vent,'concrete',10.11,2.4,z+dz,.14,1.55,.18,'通風帶間柱');
 }
 return root;
}
