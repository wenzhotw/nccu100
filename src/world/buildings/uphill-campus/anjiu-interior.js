/**
 * 安九食堂室內：依照片 9052 到 9067 與規劃負責人 2026-10-28 核可的第七版平面圖。
 * 座標以房間自己為準，x 越大越東，z 越大越南；南邊是正門，北邊玻璃隔間後是旋轉樓梯。
 * 純模型供 Node 與正式場景共用；招牌、壁畫、地磚的畫布貼圖在 map.js 的 buildAnjiu 補上。
 */
import * as THREE from 'three';
import {mergeBufferGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {lobbyBox,lobbyColors,lobbyOBB,mergeParts} from './lobby.js';
import {LOBBY} from './layout.js';

const CEIL=4.2;
/** 第七版平面：南區用餐大廳、北區樓梯廳、西北角福利社；左上沒用到的空間是實心牆。 */
export const PLAN={
  hall:{x0:0,x1:20,z0:0,z1:30},
  north:{x0:4.2,x1:20,z0:-10,z1:0},
  mainDoor:{x:5.7,w:2.8},
  divider:{x0:4.2,x1:7.2},
  // 福利社往西、往南擴大，門在店面右上角，緊貼分隔門；走出分隔門左轉就是。
  shop:{x0:-4,frontX:4.2,z0:-2.5,z1:3.5,door:{z0:-2.3,z1:-0.5}},
  stalls:[
    ...['手作烘焙','麵食小館','湯包蒸餃','現煮麵食'].map((name,i)=>({side:'west',frontX:3.4,z0:4+i*6,z1:10+i*6,name})),
    ...['滷味小舖','炸雞專賣','韓式料理','自助餐'].map((name,i)=>({side:'east',frontX:16.8,z0:14+i*3.5,z1:17.5+i*3.5,name})),
  ],
  dishReturn:{x0:17,z0:9,z1:14},
  dining:{x0:9,x1:16,cols:[10,12.5,15],rows:[10.5,12.7,14.9,17.1,19.3,21.5]},
  green:{cols:[9.5,12,14.5,17],z0:1.8,z1:7.8},
  wood:{x0:8.8,x1:13.5,z0:23.5,z1:29.5,cols:[10,12.3]},
  pillars:[9,16,23].map(z=>[8.2,z]),
  stair:{cx:13.5,cz:-4.6,r:2.5},
  // 照片 9065、9066：樓梯開口四角是白色圓柱。
  stairColumns:[[10.6,-7.3],[16.4,-7.3],[10.6,-2.4],[16.4,-2.4]],
  // 照片 9054、9055：正門東側、店家前面的深色方桌配高背椅。
  cafe:[[14.9,24.6],[14.9,27.4]],
  northTables:[6.5,9,11.5,14,16.5],
  eastTables:[-6.6,-5.0,-3.4,-1.8],
};
const S=PLAN.stair;
/** 旋轉樓梯：樓梯口在西側朝南，往北、往東繞上去，最後幾階穿過天花板開口接九舍大廳。 */
const STEP_N=14,STEP_DA=Math.PI/9,SOLID_TOP=2.4;
const steps=Array.from({length:STEP_N},(_,i)=>{const a=Math.PI+i*STEP_DA;return {i,a,x:S.cx+1.5*Math.cos(a),z:S.cz+1.5*Math.sin(a),top:0.3*(i+1)};});

export const ANJIU={id:'anjiu',name:'安九',
  entrance:{x:LOBBY.stairTop.x,z:LOBBY.stairTop.z,r:1.4,room:'uphill-campus',label:'走下旋轉樓梯'},
  // 返回房間沿用 main 的 core/room-navigation.js 契約（returnRoom）。
  // 回到大廳時站在樓梯口東南方，離下樓互動範圍半公尺以上，也避開圓柱。
  returnRoom:'uphill-campus',returnTo:{x:LOBBY.stairTop.x+1.7,z:LOBBY.stairTop.z-2.0,face:-Math.PI/2},
  // 下樓後站在 T 字路口，面向西邊的福利社。
  spawn:{x:9.6,z:-1.2,yaw:Math.PI/2,face:-Math.PI/2,pitch:0.22},
  exit:{x:12,z:-2.9,r:1.2,label:'走上旋轉樓梯'},
  bounds:{x0:-3.7,x1:19.7,z0:-9.7,z1:29.7},
  heightAt:()=>0,background:'#e9e4d6',
  camera:{x0:-3.6,x1:19.7,z0:-9.7,z1:29.7,ceil:3.85,maxDist:6.5},miniSub:'玻璃隔間後是旋轉樓梯'};

const C={wall:'#f3efe4',ceil:'#efeadc',beam:'#e8e2d2',orange:'#e8961c',counter:'#efe3c4',counterBase:'#4a3a32',steel:'#b8bcbe',
  black:'#2b2928',table:'#c99560',light:'#fbfbf4',tile:'#e7e3d9',green:'#7cc243',greenTable:'#e3c79a',highTop:'#b97c45',
  stool:'#c58a52',purple:'#5b4a7c',navy:'#2f4c72',red:'#b23a3a',yellow:'#e0b63a',tray:'#4f9a46',shopGreen:'#5f9a3a',
  fridge:'#f2f4f4',goods:['#e05a4f','#f2c14e','#5aa9e6','#7bc47f'],stairTile:'#f1ebdd',rail:'#a8742e',mint:lobbyColors.mint};

const box=(g,n,x,y,z,w,h,d,c,out=0.02)=>lobbyBox(g,n,x,y,z,w,h,d,c,out);
/** 以範圍建立方塊：x0..x1、y0..y1、z0..z1。 */
const span=(g,n,x0,x1,y0,y1,z0,z1,c,out=0.02)=>box(g,n,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2,x1-x0,y1-y0,z1-z0,c,out);
const edge=new THREE.MeshBasicMaterial({color:'#2a2c4a',side:THREE.BackSide});
const mats=new Map();const toonOf=c=>{if(!mats.has(c))mats.set(c,new THREE.MeshToonMaterial({color:c}));return mats.get(c);};
const CYL=new THREE.CylinderGeometry(1,1,1,14);
function cyl(g,n,x,y,z,r,h,c,out=0.015) {
  const m=new THREE.Mesh(CYL,toonOf(c));m.name=n;m.position.set(x,y,z);m.scale.set(r,h,r);g.add(m);
  if(out){const e=new THREE.Mesh(CYL,edge);e.scale.set(1+out/r,1+out/h,1+out/r);m.add(e);}return m;
}
const glass=new THREE.MeshToonMaterial({color:'#bfe0e6',transparent:true,opacity:0.3,side:THREE.DoubleSide,depthWrite:false});
function pane(g,n,x,y,z,w,h,d) {const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),glass);m.name=n;m.position.set(x,y,z);g.add(m);return m;}
/** 招牌：先放一塊平面記下文字與顏色，最後整批貼進同一張圖集。angle 為平面法線朝向（0 朝南）。 */
function sign(g,text,x,y,z,w,h,angle,bg='#ffffff',fg='#2f3a4a') {
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),toonOf('#ffffff'));m.name='招牌：'+text;
  m.position.set(x,y,z);m.rotation.y=angle;m.userData.anjiuSign={text,w,h,bg,fg};g.add(m);return m;
}
const EAST=Math.PI/2,WEST=-Math.PI/2,NORTH=Math.PI;

/* ---------- 碰撞 ---------- */
const wallOBB=(n,x0,x1,z0,z1)=>lobbyOBB(n,(x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0);
export function anjiuColliders() {
  const {hall,north,shop,divider}=PLAN,list=[
    wallOBB('西牆',-0.3,0,shop.z1,hall.z1),wallOBB('南牆',hall.x0,hall.x1,hall.z1,hall.z1+0.3),
    wallOBB('東牆',hall.x1,hall.x1+0.3,north.z0,hall.z1),wallOBB('北牆',north.x0,north.x1,north.z0-0.3,north.z0),
    wallOBB('左上實心牆',shop.x0,north.x0,north.z0,shop.z0),
    // 福利社可以走進去：只擋店面白牆、門角、南牆與店內陳設。
    wallOBB('福利社白牆',shop.frontX-0.3,shop.frontX,shop.door.z1,shop.z1),wallOBB('福利社門角',shop.frontX-0.3,shop.frontX,shop.z0,shop.door.z0),
    wallOBB('福利社南牆',shop.x0,shop.frontX,shop.z1,shop.z1+0.3),
    ...SHOP_ITEMS.map(([n,x0,x1,z0,z1])=>wallOBB(n,x0,x1,z0,z1)),
    wallOBB('玻璃隔間',divider.x1,hall.x1,-0.1,0.1),
    wallOBB('西側店家',0,3.4,4,28),wallOBB('東側店家',16.8,hall.x1,14,28),wallOBB('回收區',16.3,hall.x1,PLAN.dishReturn.z0,PLAN.dishReturn.z1),
    ...PLAN.pillars.map(([x,z])=>lobbyOBB('橘色方柱',x,z,0.7,0.7)),
    ...PLAN.green.cols.map(x=>lobbyOBB('綠椅長桌',x,(PLAN.green.z0+PLAN.green.z1)/2,1.9,PLAN.green.z1-PLAN.green.z0+0.2)),
    ...PLAN.dining.cols.flatMap(x=>PLAN.dining.rows.map(z=>lobbyOBB('用餐桌',x,z,1.7,1.6))),
    ...PLAN.wood.cols.map(x=>lobbyOBB('高腳桌',x,26,1.9,3.2)),
    ...PLAN.cafe.map(([x,z])=>lobbyOBB('咖啡方桌',x,z,2.0,2.0)),
    ...PLAN.stairColumns.map(([x,z])=>lobbyOBB('樓梯白色圓柱',x,z,0.7,0.7)),
    ...PLAN.northTables.map(x=>lobbyOBB('北牆高腳桌',x,-8.9,2.0,1.9)),
    ...PLAN.eastTables.map(z=>lobbyOBB('東側高腳桌',18.6,z,2.6,1.4)),
    // 樓梯下方是封起來的儲物空間；低處踏階另外擋，高處踏階人可以從下面走過。
    lobbyOBB('樓梯下方儲物',S.cx,S.cz,2.6,2.6,Math.PI/4),
    ...steps.filter(s=>s.top<=SOLID_TOP).map(s=>lobbyOBB('安九踏階',s.x,s.z,1.8,2.4*STEP_DA+0.04,-s.a)),
  ];
  return list;
}

/* ---------- 建築外殼：牆、天花、樑、柱，攝影機會被擋住 ---------- */
function shell(g) {
  const {hall,north,shop,divider}=PLAN,hole={x0:S.cx-2.9,x1:S.cx+2.9,z0:S.cz-2.9,z1:S.cz+2.9};
  span(g,'西牆',-0.3,0,0,CEIL,shop.z1,hall.z1,C.wall,0.03);
  span(g,'東牆',hall.x1,hall.x1+0.3,0,CEIL,north.z0,hall.z1,C.wall,0.03);
  span(g,'北牆',north.x0,north.x1,0,CEIL,north.z0-0.3,north.z0,C.wall,0.03);
  span(g,'左上實心牆',north.x0-0.3,north.x0,0,CEIL,north.z0,shop.z0,C.wall,0.03);
  span(g,'福利社北牆',shop.x0,north.x0,0,CEIL,shop.z0-0.3,shop.z0,C.wall,0.03);
  span(g,'福利社西牆',shop.x0-0.3,shop.x0,0,CEIL,shop.z0,shop.z1,C.wall,0.03);
  span(g,'福利社南牆',shop.x0,shop.frontX,0,CEIL,shop.z1,shop.z1+0.3,C.wall,0.03);
  // 南牆：正門兩側是腰牆加玻璃窗，上方實牆。
  const door=g.getObjectByName('正門')??new THREE.Group();door.name='正門';g.add(door);
  const d0=PLAN.mainDoor.x-PLAN.mainDoor.w/2,d1=PLAN.mainDoor.x+PLAN.mainDoor.w/2;
  for(const [x0,x1] of [[0,d0],[d1,hall.x1]]) {
    span(g,'南牆腰牆',x0,x1,0,0.9,hall.z1,hall.z1+0.3,C.wall,0.02);
    for(let x=x0;x<x1-0.1;x+=2)span(g,'南窗窗框',x,x+0.08,0.9,2.8,hall.z1+0.1,hall.z1+0.2,C.steel,0);
  }
  span(g,'南牆上牆',0,hall.x1,2.8,CEIL,hall.z1,hall.z1+0.3,C.wall,0.02);
  span(door,'正門門楣',d0,d1,2.5,2.8,hall.z1,hall.z1+0.3,C.steel,0.02);
  for(const x of [d0,PLAN.mainDoor.x,d1])span(door,'正門門框',x-0.05,x+0.05,0,2.5,hall.z1+0.05,hall.z1+0.25,C.steel,0);
  span(door,'正門推把',PLAN.mainDoor.x-0.5,PLAN.mainDoor.x+0.5,1.0,1.06,hall.z1+0.02,hall.z1+0.06,C.steel,0);
  // 天花板：北區樓梯上方留方形開口。
  for(const [x0,x1,z0,z1] of [[hall.x0,hall.x1,hall.z0,hall.z1],[shop.x0,north.x0,shop.z0,shop.z1],
    [north.x0,hole.x0,north.z0,north.z1],[hole.x1,north.x1,north.z0,north.z1],[hole.x0,hole.x1,north.z0,hole.z0],[hole.x0,hole.x1,hole.z1,north.z1]])
    span(g,'天花板',x0,x1,CEIL,CEIL+0.2,z0,z1,C.ceil,0);
  for(let z=5;z<hall.z1;z+=5)span(g,'天花橫樑',hall.x0,hall.x1,CEIL-0.45,CEIL,z-0.2,z+0.2,C.beam,0.02);
  span(g,'天花縱樑',9.8,10.2,CEIL-0.45,CEIL,hall.z0,hall.z1,C.beam,0.02);
  // 照片 9058：分隔門口上方有綠色天花。
  span(g,'綠色天花',divider.x0,divider.x1,CEIL-0.06,CEIL-0.02,-2.5,0,C.shopGreen,0);
  for(const [x,z] of PLAN.pillars)span(g,'橘色方柱',x-0.35,x+0.35,0,CEIL,z-0.35,z+0.35,C.orange,0.03);
  // 樓梯廳：開口四角白色圓柱，天花是白樑框出的薄荷綠板（照片 9066）。
  for(const [x,z] of PLAN.stairColumns)cyl(g,'樓梯白色圓柱',x,CEIL/2,z,0.35,CEIL,C.wall,0.03);
  span(g,'樓梯廳薄荷綠天花',north.x0,north.x1,CEIL-0.03,CEIL-0.01,north.z0,north.z1,C.mint,0);
  for(const z of [hole.z0,hole.z1])span(g,'樓梯廳白樑',north.x0,north.x1,CEIL-0.4,CEIL,z-0.2,z+0.2,C.wall,0.02);
  for(const x of [hole.x0,hole.x1])span(g,'樓梯廳白樑',x-0.2,x+0.2,CEIL-0.4,CEIL,north.z0,north.z1,C.wall,0.02);
}

/* ---------- 玻璃隔間與分隔門 ---------- */
function partition(g) {
  const {divider,hall}=PLAN;
  const part=new THREE.Group();part.name='玻璃隔間框';g.add(part);
  pane(g,'玻璃隔間',(divider.x1+hall.x1)/2,1.55,0,hall.x1-divider.x1,2.3,0.04);
  span(part,'隔間踢腳',divider.x1,hall.x1,0,0.4,-0.08,0.08,C.steel,0.01);
  span(part,'隔間上牆',divider.x1,hall.x1,2.7,CEIL,-0.12,0.12,C.wall,0.02);
  for(let x=divider.x1;x<=hall.x1+0.01;x+=2.1)span(part,'隔間直框',x-0.04,x+0.04,0.4,2.7,-0.06,0.06,C.steel,0);
  span(part,'隔間橫框',divider.x1,hall.x1,2.62,2.7,-0.06,0.06,C.steel,0);
  // 照片 9061、9062：大片玻璃上方還有一排氣窗。
  span(part,'隔間氣窗橫框',divider.x1,hall.x1,2.18,2.24,-0.06,0.06,C.steel,0);
  // 照片 9058、9061：玻璃中段貼一條橘色腰帶。
  span(part,'玻璃橘色腰帶',divider.x1,hall.x1,1.0,1.12,0.03,0.05,C.orange,0);
  const door=new THREE.Group();door.name='分隔門';g.add(door);
  for(const x of [divider.x0+0.05,divider.x1-0.05])span(door,'分隔門門框',x-0.05,x+0.05,0,2.6,-0.08,0.08,C.steel,0.01);
  span(door,'分隔門門楣',divider.x0,divider.x1,2.6,CEIL,-0.12,0.12,C.wall,0.02);
  // 推開的玻璃門片貼在東側，紅色春聯貼在門框上（照片 9063）。
  pane(door,'分隔門門片',divider.x1-0.1,1.3,-0.6,0.04,2.4,1.0);
  span(door,'門框春聯',divider.x1-0.02,divider.x1+0.02,0.9,2.2,0.09,0.12,C.red,0);
}

/* ---------- 店家、回收區、東牆 ---------- */
function stalls(g) {
  for(const s of PLAN.stalls) {
    const west=s.side==='west',dir=west?1:-1,f=s.frontX,back=west?0:PLAN.hall.x1,mid=(s.z0+s.z1)/2,len=s.z1-s.z0;
    const kitchen=new THREE.Group();kitchen.name='店家：'+s.name;g.add(kitchen);
    // 照片 9055、9057：整排是一條連續的開放櫃台，店與店之間只有矮隔板，後面是磁磚牆的開放廚房。
    span(kitchen,'店家櫃台',Math.min(f,f-0.7*dir),Math.max(f,f-0.7*dir),0,0.85,s.z0,s.z1,C.counterBase,0.02);
    span(kitchen,'店家櫃台檯面',Math.min(f+0.1*dir,f-0.8*dir),Math.max(f+0.1*dir,f-0.8*dir),0.85,1.0,s.z0,s.z1,C.counter,0.02);
    const rowStart=!PLAN.stalls.some(o=>o.side===s.side&&o.z1===s.z0),rowEnd=!PLAN.stalls.some(o=>o.side===s.side&&o.z0===s.z1);
    if(rowStart)span(kitchen,'店家端牆',Math.min(back,f),Math.max(back,f),0,CEIL,s.z0-0.15,s.z0+0.05,C.wall,0.02);
    else span(kitchen,'店家隔牆',Math.min(back,f-0.8*dir),Math.max(back,f-0.8*dir),0,1.1,s.z0-0.05,s.z0+0.05,C.wall,0.01);
    if(rowEnd)span(kitchen,'店家端牆',Math.min(back,f),Math.max(back,f),0,CEIL,s.z1-0.05,s.z1+0.15,C.wall,0.02);
    span(kitchen,'廚房磁磚牆',Math.min(back,back+0.04*dir),Math.max(back,back+0.04*dir),0.9,2.4,s.z0,s.z1,'#e3e0d6',0);
    span(kitchen,'店家門楣',Math.min(f,f-0.3*dir),Math.max(f,f-0.3*dir),2.4,CEIL,s.z0,s.z1,C.counter,0.02);
    span(kitchen,'廚房不鏽鋼台',Math.min(back,back+0.7*dir),Math.max(back,back+0.7*dir),0,0.9,s.z0+0.3,s.z1-0.3,C.steel,0.02);
    span(kitchen,'廚房冰箱',Math.min(back+0.8*dir,back+1.6*dir),Math.max(back+0.8*dir,back+1.6*dir),0,1.9,s.z0+0.4,s.z0+1.3,C.fridge,0.02);
    span(kitchen,'菜單看板',Math.min(back+0.02*dir,back+0.06*dir),Math.max(back+0.02*dir,back+0.06*dir),1.4,2.2,mid-0.8,mid+0.8,'#3a3330',0);
    sign(kitchen,s.name,f+0.02*dir,3.05,mid,Math.min(2.6,len-0.6),0.7,west?EAST:WEST,['#fff4e0','#f08a3c','#7a2430','#fbe7a0'][PLAN.stalls.indexOf(s)%4],
      ['#7a2430','#ffffff','#ffffff','#2f6a2a'][PLAN.stalls.indexOf(s)%4]);
  }
  // 回收區：白色磁磚牆、送餐盤窗口與分類桶（照片 9060）。
  const dr=new THREE.Group();dr.name='回收區';g.add(dr);const {x0,z0,z1}=PLAN.dishReturn;
  span(dr,'回收區磁磚牆',x0,x0+0.25,0,CEIL,z0,z1,'#e9e6dc',0.02);
  span(dr,'回收窗口',x0-0.02,x0,1.0,1.8,z0+2.6,z1-0.8,'#3b3a38',0);
  span(dr,'回收區側門',x0-0.02,x0,0,2.2,z0+0.6,z0+1.6,'#f6f6f2',0.01);
  for(const [k,c] of ['#4f8fd0','#8a8f93','#e2563f'].entries())span(dr,'分類桶',x0-0.6,x0-0.1,0,0.7,z0+2.7+k*0.6,z0+3.2+k*0.6,c,0.02);
  sign(dr,'回收餐盤',x0-0.03,2.2,z1-1.6,1.4,0.45,WEST,'#ffffff','#c23b2e');
  // 東牆北段：白牆與投影幕（照片 9061）。
  span(g,'投影幕',PLAN.hall.x1-0.05,PLAN.hall.x1,1.4,3.4,2.0,7.0,'#fbfbf8',0.01);
}

/* ---------- 福利社 ---------- */
function shop(g) {
  const {shop:s}=PLAN,f=s.frontX,shopG=new THREE.Group();shopG.name='福利社';g.add(shopG);
  span(shopG,'福利社地磚',s.x0,f-0.3,0,0.02,s.z0,s.z1,'#dcdcd6',0);
  // 照片 9058：分隔門前的店面是白牆，掛直式店名、百葉門與海報；只有門口在分隔門北側。
  span(shopG,'福利社白牆',f-0.3,f,0,CEIL,s.door.z1,s.z1,C.wall,0.02);
  span(shopG,'福利社門角',f-0.3,f,0,CEIL,s.z0,s.door.z0,C.wall,0.02);
  span(shopG,'福利社門楣',f-0.3,f,2.6,CEIL,s.door.z0,s.door.z1,C.wall,0.02);
  // 由南往北：公告欄、直式黑底店名、百葉門、一排海報（地圖、美食），再來是門口。
  span(shopG,'公告欄',f,f+0.04,1.0,2.0,2.9,3.4,'#eef2f4',0.01);
  const vsign=sign(shopG,'福利社',f+0.05,1.8,2.6,0.42,1.3,EAST,'#2b2b2b','#ffffff');vsign.name='招牌：福利社直式';vsign.userData.anjiuSign.vertical=true;
  span(shopG,'百葉門',f,f+0.04,0,2.1,1.4,2.3,'#f4f4f0',0.01);
  for(let y=0.3;y<2.0;y+=0.18)span(shopG,'百葉',f+0.04,f+0.06,y,y+0.05,1.45,2.25,'#c9cbc8',0);
  for(const [z,c] of [[0.7,'#8fc3a8'],[0.05,'#8fb3d9'],[-0.45,'#f4f1e6']])span(shopG,'走廊海報',f,f+0.03,0.5,2.3,z,z+0.6,c,0.01);
  for(const z of [s.door.z0,s.door.z1])span(shopG,'福利社門框',f-0.08,f+0.02,0,2.6,z-0.05,z+0.05,C.steel,0);
  span(shopG,'自動門機箱',f-0.25,f+0.02,2.35,2.6,s.door.z0,s.door.z1,'#8f9396',0.01);
  pane(shopG,'福利社門片',f-0.12,1.3,s.door.z0+0.45,0.04,2.3,0.9);
  sign(shopG,'福利社',f+0.06,3.1,(s.door.z0+s.door.z1)/2,1.6,0.5,EAST,'#ffffff','#b8322a');
  sign(shopG,'WELCOME',f-0.09,1.5,s.door.z0+0.45,0.8,0.5,EAST,C.shopGreen,'#ffffff');
  // 店內（照片 9063）：進門右手邊是與門垂直的櫃檯；左手邊一排與門平行的中島貨架圍出 U 型走道；
  // 離門最遠的西牆是冰櫃，由左到右是一台臥式冰淇淋冰櫃，再來是數台直立透明冰櫃。
  for(const [n,x0,x1,z0,z1,h,c] of SHOP_ITEMS) {
    const m=span(shopG,n,x0,x1,0,h,z0,z1,c,0.02);
    if(n==='直立冰櫃') {
      span(shopG,'冰櫃玻璃門',x1,x1+0.03,0.15,h-0.15,z0+0.06,z1-0.06,'#2d4a63',0);
      for(let k=0;k<4;k++)span(shopG,'冰櫃飲料',x1+0.03,x1+0.05,0.3+k*0.42,0.55+k*0.42,z0+0.12,z1-0.12,C.goods[(k+Math.round(z0*2)+8)%4],0);
    } else if(n==='冰淇淋冰櫃') {
      span(shopG,'冰淇淋玻璃蓋',x0+0.05,x1-0.05,h,h+0.03,z0+0.05,z1-0.05,'#bfe3ef',0);
      for(let k=0;k<3;k++)span(shopG,'冰淇淋',x0+0.15,x1-0.15,h-0.12,h-0.02,z0+0.15+k*0.45,z0+0.5+k*0.45,['#f6c1cf','#f7e3a1','#a8d8b9'][k],0);
    } else if(n==='福利社櫃檯') {
      span(shopG,'收銀機',x0+0.4,x0+0.9,h,h+0.3,z0+0.1,z1-0.1,'#3b3a38',0.01);
    } else if(n!=='貨架') {
      for(const side of [x0-0.02,x1])for(let k=0;k<3;k++)span(shopG,'貨架商品',side,side+0.02,0.3+k*0.45,0.6+k*0.45,z0+0.1,z1-0.1,C.goods[(k+2)%4],0);
    }
    m.userData.shopItem=true;
  }
  for(let k=0;k<3;k++)span(shopG,'貨架商品',f-0.92,f-0.9,0.3+k*0.45,0.6+k*0.45,0.1,3.2,C.goods[k],0);
}
/** 福利社陳設與碰撞共用：[名稱, x0, x1, z0, z1, 高, 顏色]。 */
const SHOP_ITEMS=[
  ['福利社櫃檯',0.6,3.2,-2.5,-1.95,1.0,C.counter],
  ['中島貨架',-0.7,0,0.1,2.3,1.5,'#d8d3c8'],
  ['貨架',3.3,3.9,0.1,3.3,1.6,'#d8d3c8'],
  ['冰淇淋冰櫃',-4,-3.2,1.9,3.4,0.85,C.fridge],
  ...[-2.4,-1.4,-0.4,0.6].map(z=>['直立冰櫃',-4,-3.3,z,z+1.0,1.95,'#e9edef']),
];

/* ---------- 家具：桌椅、高腳桌、樓梯 ---------- */
function seating(g) {
  const {dining,green,wood}=PLAN;
  // 用餐區：固定式南北向桌子，東西兩側各兩張方凳（照片 9057、9059）。
  for(const x of dining.cols)for(const z of dining.rows) {
    box(g,'用餐桌',x,0.75,z,0.8,0.05,1.6,C.table,0.015);
    box(g,'桌腳',x,0.37,z,0.12,0.74,0.12,C.steel,0);
    for(const dx of [-0.65,0.65])for(const dz of [-0.45,0.45]) {
      box(g,'方凳',x+dx,0.45,z+dz,0.38,0.05,0.38,C.black,0.012);box(g,'凳腳',x+dx,0.22,z+dz,0.07,0.44,0.07,C.steel,0);
    }
  }
  // 玻璃隔間前：南北向長桌配綠色鏤空椅（照片 9061、9062）。
  for(const x of green.cols) {
    const z1=x===green.cols.at(-1)?green.z1-0.8:green.z1,len=z1-green.z0,mid=(green.z0+z1)/2;
    box(g,'綠椅長桌',x,0.74,mid,0.75,0.04,len,C.greenTable,0.015);
    for(const dz of [-len/2+0.1,len/2-0.1])for(const dx of [-0.3,0.3])box(g,'長桌桌腳',x+dx,0.36,mid+dz,0.05,0.72,0.05,C.steel,0);
    for(let z=green.z0+0.4;z<z1-0.2;z+=0.75)for(const side of [-1,1]) {
      box(g,'綠色椅子',x+side*0.62,0.45,z,0.42,0.05,0.42,C.green,0.012);
      box(g,'綠色椅背',x+side*0.84,0.75,z,0.05,0.55,0.4,C.green,0.012);
      box(g,'綠椅椅腳',x+side*0.62,0.22,z,0.36,0.44,0.05,C.green,0);
    }
  }
  // 正門旁木地板區：南北向高腳桌與木面高腳凳，上方黑色軌道燈框（照片 9053、9054）。
  span(g,'正門木地板',wood.x0,wood.x1,0,0.04,wood.z0,wood.z1,'#c58a52',0);
  for(const x of wood.cols) {
    box(g,'高腳桌',x,1.05,26,0.9,0.05,3.0,C.highTop,0.015);
    for(const dz of [-1.3,1.3])box(g,'高腳桌框',x,0.52,26+dz,0.8,1.0,0.05,C.black,0);
    for(let z=24.9;z<27.3;z+=0.8)for(const side of [-1,1])highStool(g,x+side*0.7,z);
    for(const dz of [-1.6,1.6])box(g,'軌道燈框',x,3.4,26+dz,1.6,0.05,0.05,C.black,0);
    for(const dx of [-0.8,0.8])box(g,'軌道燈框',x+dx,3.4,26,0.05,0.05,3.2,C.black,0);
  }
  for(const [x,z] of PLAN.cafe) {
    box(g,'咖啡方桌',x,0.75,z,0.8,0.05,0.8,'#2f2a28',0.015);box(g,'方桌桌腳',x,0.37,z,0.16,0.74,0.16,'#4a3a32',0);
    for(const [dx,dz,bx,bz] of [[0,-0.62,0,-0.2],[0,0.62,0,0.2],[-0.62,0,-0.2,0],[0.62,0,0.2,0]]) {
      box(g,'高背椅',x+dx,0.47,z+dz,0.42,0.06,0.42,'#4a3328',0.012);
      box(g,'高背椅背',x+dx+bx,0.85,z+dz+bz,bx?0.06:0.42,0.75,bz?0.06:0.42,'#4a3328',0.012);
    }
  }
  // 北區：北牆一排南北向高腳桌，樓梯東側四張東西向，右邊緊貼東牆（照片 9064）。
  span(g,'北區木地板',PLAN.north.x0,PLAN.north.x1,0,0.04,PLAN.north.z0,-7.6,'#c9a77c',0);
  span(g,'東側木地板',16.9,PLAN.north.x1,0,0.04,-7.6,-0.6,'#c9a77c',0);
  for(const x of PLAN.northTables) {
    box(g,'北牆高腳桌',x,1.05,-8.9,0.8,0.05,1.8,C.highTop,0.015);
    box(g,'高腳桌框',x,0.52,-8.9,0.05,1.0,1.6,C.black,0);
    for(const dz of [-0.45,0.45])for(const side of [-1,1])highStool(g,x+side*0.62,-8.9+dz);
    lamp(g,x,-9.5);
  }
  for(const z of PLAN.eastTables) {
    box(g,'東側高腳桌',18.6,1.05,z,2.4,0.05,0.7,C.highTop,0.015);
    box(g,'高腳桌框',18.6,0.52,z,2.2,1.0,0.05,C.black,0);
    for(const dx of [-0.75,0,0.75])for(const side of [-1,1])highStool(g,18.6+dx,z+side*0.52);
    lamp(g,19.5,z);
  }
}
function highStool(g,x,z) {cyl(g,'高腳凳',x,0.75,z,0.18,0.05,C.stool,0.012);box(g,'高腳凳腳',x,0.37,z,0.28,0.74,0.04,C.black,0);}
function lamp(g,x,z) {cyl(g,'桌燈燈座',x,1.25,z,0.03,0.4,C.steel,0);cyl(g,'桌燈燈罩',x,1.5,z,0.17,0.24,C.light,0.01);}

function stair(g) {
  const st=new THREE.Group();st.name='旋轉樓梯下端';g.add(st);
  for(const {i,a,x,z,top} of steps) {
    // 照片 9065、9066：下半段是實心到地的白色弧形量體，上半段是懸空的白色斜板。
    // 踏階深度取外緣弧長，相鄰踏階在外緣接起來，不會出現縫隙。
    const y0=top<=SOLID_TOP?0:top-0.12,tx=-Math.sin(a),tz=Math.cos(a);
    // 懸空段踏階往外移、縮窄，內側由弧形底板接住，方塊角才不會穿出底板。
    const solid=top<=SOLID_TOP,r=solid?1.5:1.7,w=solid?1.8:1.4,d=solid?2.4*STEP_DA+0.04:1.5*STEP_DA+0.1;
    const cx=S.cx+r*Math.cos(a),cz=S.cz+r*Math.sin(a);
    const body=box(st,'踏階',cx,(y0+top)/2,cz,w,top-y0,d,C.wall,0);body.rotation.y=-a;
    const tread=box(st,'踏階面磚',cx,top+0.01,cz,w,0.02,1.5*STEP_DA+0.1,C.stairTile,0);tread.rotation.y=-a;
    const strip=box(st,'黃色止滑條',cx-tx*0.26,top+0.025,cz-tz*0.26,w-0.05,0.02,0.07,lobbyColors.yellow,0);strip.rotation.y=-a;
  }
  sign(st,'往九舍大廳',12,3.0,-1.8,1.4,0.4,0,'#385846','#ffffff');
}

/**
 * 旋轉樓梯的平滑曲面（照片 9065、9066）：內外兩道白色扶牆沿螺旋連續升起，
 * 下半段扶牆落到地面，上半段漸漸收成懸空的弧形底板，扶牆頂是一條圓木扶手。
 * t 以踏階為單位，0 是第一階前緣，STEP_N 是最上面一階後緣。
 */
const SEG=8,SOLID_T=SOLID_TOP/0.3-1;
const helixA=t=>Math.PI+(t-0.5)*STEP_DA,pitch=t=>0.3*t+0.15;
const smooth=(e0,e1,x)=>{const k=Math.min(1,Math.max(0,(x-e0)/(e1-e0)));return k*k*(3-2*k);};
const underside=t=>smooth(SOLID_T,SOLID_T+2,t)*(pitch(t)-0.55);
/** 依 (t, 高度列) 產生雙面帶狀曲面；rows 每個元素回傳該 t 的 [半徑, 高度]。 */
function helixSurface(name,rows,color) {
  const n=STEP_N*SEG,pos=[],idx=[];
  for(let k=0;k<=n;k++){const t=k/SEG,a=helixA(t);for(const row of rows){const [r,y]=row(t);pos.push(S.cx+r*Math.cos(a),y,S.cz+r*Math.sin(a));}}
  const w=rows.length;
  for(let k=0;k<n;k++)for(let j=0;j<w-1;j++){const p=k*w+j,q=p+w;idx.push(p,q,p+1,p+1,q,q+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color,side:THREE.DoubleSide}));m.name=name;return m;
}
function stairSurfaces() {
  const g=new THREE.Group();g.name='旋轉樓梯曲面';
  for(const [name,r] of [['旋轉樓梯外扶牆',2.45],['旋轉樓梯內扶牆',0.55]])
    g.add(helixSurface(name,[t=>[r,underside(t)],t=>[r,pitch(t)+0.95]],C.wall));
  g.add(helixSurface('旋轉樓梯底板',[t=>[0.55,underside(t)-0.01],t=>[1.5,underside(t)-0.01],t=>[2.45,underside(t)-0.01]],'#e9e4d6'));
  const rails=[2.52,0.48].map(r=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
    Array.from({length:STEP_N*2+1},(_,k)=>{const t=k/2,a=helixA(t);return new THREE.Vector3(S.cx+r*Math.cos(a),pitch(t)+0.98,S.cz+r*Math.sin(a));})),STEP_N*SEG,0.07,6));
  const rail=new THREE.Mesh(mergeBufferGeometries(rails),new THREE.MeshToonMaterial({color:C.rail}));rail.name='旋轉樓梯木扶手';g.add(rail);
  return g;
}

/* ---------- 天花板設備：日光燈、布幔、管線 ---------- */
function ceilingGear(g) {
  for(let z=2;z<PLAN.hall.z1;z+=3.5)for(const x of [5.5,9.5,13.5,17.5])box(g,'日光燈',x,3.55,z,1.2,0.06,0.12,C.light,0);
  for(const [x,z] of [[6,-5],[6,-8],[18,-4],[18,-8.5],[10,-1.2],[16,-1.2],[-2.2,-1],[-2.2,2],[1.6,-1],[1.6,2]])box(g,'日光燈',x,3.55,z,1.2,0.06,0.12,C.light,0);
  // 照片 9064：北牆上方紅、黃管線與綠色線槽。
  span(g,'綠色線槽',PLAN.north.x0,PLAN.north.x1,3.6,3.68,-9.95,-9.3,C.tray,0);
  span(g,'紅色管線',PLAN.north.x0,PLAN.north.x1,3.78,3.92,-9.75,-9.6,C.red,0);
  span(g,'黃色管線',PLAN.north.x0,PLAN.north.x1,3.74,3.8,-9.5,-9.44,C.yellow,0);
}
/** 紫藍布幔：沿東西向垂下的半圓弧，雙面材質，單獨合成一份。 */
function drapes() {
  const parts=[],c=new THREE.Color();
  for(let k=0;k<6;k++) {
    const geo=new THREE.CylinderGeometry(1,1,10.4,14,1,true,Math.PI,Math.PI).rotateZ(Math.PI/2).scale(1,0.55,1).translate(13.8,CEIL-0.05,0.9+k*2.0);
    c.set(k%2?C.navy:C.purple);const a=new Float32Array(geo.attributes.position.count*3);for(let i=0;i<a.length;i+=3)c.toArray(a,i);
    geo.setAttribute('color',new THREE.Float32BufferAttribute(a,3));parts.push(geo);
  }
  const m=new THREE.Mesh(mergeBufferGeometries(parts),new THREE.MeshToonMaterial({color:'#ffffff',vertexColors:true,side:THREE.DoubleSide}));
  m.name='布幔';m.userData.noOcc=true;return m;
}
/** 方磚地板：大廳與北區兩塊，貼圖座標在 map.js 依世界座標補上。 */
function tileFloor() {
  const {hall,north}=PLAN,geos=[[hall.x0,hall.x1,hall.z0,hall.z1],[north.x0,north.x1,north.z0,north.z1]]
    .map(([x0,x1,z0,z1])=>new THREE.PlaneGeometry(x1-x0,z1-z0).rotateX(-Math.PI/2).translate((x0+x1)/2,0.01,(z0+z1)/2));
  const m=new THREE.Mesh(mergeBufferGeometries(geos),new THREE.MeshToonMaterial({color:C.tile}));m.name='安九方磚地板';m.userData.noOcc=true;return m;
}
/** 樓梯開口上方：一段圓筒內壁與淡色頂蓋，看上去通往九舍大廳。 */
function well(g) {
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(2.9,2.9,2.6,24,1,true),new THREE.MeshToonMaterial({color:C.mint,side:THREE.BackSide}));
  shaft.name='樓梯開口內壁';shaft.position.set(S.cx,CEIL+1.3,S.cz);shaft.userData.noOcc=true;g.add(shaft);
  const cap=new THREE.Mesh(new THREE.CircleGeometry(2.9,24).rotateX(Math.PI/2),new THREE.MeshBasicMaterial({color:'#f4f8ee'}));
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(2.85,2.85,1.0,32,1,true),new THREE.MeshToonMaterial({color:C.wall,side:THREE.DoubleSide}));
  rim.name='大廳開口扶牆';rim.position.set(S.cx,CEIL+0.8,S.cz);rim.userData.noOcc=true;g.add(rim);
  const cap2=new THREE.Mesh(new THREE.TorusGeometry(2.85,0.08,6,40).rotateX(Math.PI/2),new THREE.MeshToonMaterial({color:C.rail}));
  cap2.name='大廳開口木扶手';cap2.position.set(S.cx,CEIL+1.32,S.cz);cap2.userData.noOcc=true;g.add(cap2);
  cap.name='九舍大廳天花';cap.position.set(S.cx,CEIL+2.6,S.cz);cap.userData.noOcc=true;g.add(cap);
}
/** 窗外：南牆玻璃後方一片淡綠，避免看到空白。 */
function outdoor(g) {
  const m=new THREE.Mesh(new THREE.PlaneGeometry(26,6),new THREE.MeshBasicMaterial({color:'#cfe6c8'}));
  m.name='窗外綠意';m.position.set(10,3,PLAN.hall.z1+1.2);m.rotation.y=Math.PI;m.userData.noOcc=true;g.add(m);
  pane(g,'南窗玻璃',10,1.85,PLAN.hall.z1+0.15,20,1.9,0.03);
}
function mural(g) {
  const m=new THREE.Mesh(new THREE.PlaneGeometry(15.2,2.4),new THREE.MeshToonMaterial({color:'#d9dcdc'}));
  m.name='城市壁畫';m.position.set((PLAN.north.x0+PLAN.north.x1)/2,2.2,PLAN.north.z0+0.02);m.userData.anjiuMural=true;m.userData.noOcc=true;g.add(m);
}
/** 所有招牌平面合成一張圖集：每塊 128 像素高，寬依比例，依序排進 2048×1024。 */
function signAtlas(g) {
  const signs=[];g.traverse(o=>{if(o.userData.anjiuSign)signs.push(o);});
  let cx=0,cy=0;const parts=signs.map(o=>{
    const {w,h}=o.userData.anjiuSign,cw=Math.round(128*w/h);
    if(cx+cw>2048){cx=0;cy+=128;}
    const rect={x:cx,y:cy,w:cw,h:128};cx+=cw;o.userData.anjiuSign.atlas=rect;
    o.updateMatrixWorld(true);const geo=o.geometry.clone().applyMatrix4(o.matrixWorld),uv=geo.attributes.uv;
    for(let j=0;j<uv.count;j++)uv.setXY(j,(rect.x+uv.getX(j)*rect.w)/2048,1-(rect.y+(1-uv.getY(j))*rect.h)/1024);
    o.visible=false;return geo;
  });
  const atlas=new THREE.Mesh(mergeBufferGeometries(parts),new THREE.MeshBasicMaterial({color:'#ffffff'}));
  atlas.name='安九招牌圖集';atlas.userData.anjiuAtlas=signs.map(o=>o.userData.anjiuSign);atlas.userData.noOcc=true;g.add(atlas);
}

export function createAnjiu() {
  const g=new THREE.Group();g.name='安九食堂室內';
  const shellG=new THREE.Group();shellG.name='安九外殼';g.add(shellG);
  const furnish=new THREE.Group();furnish.name='安九陳設';furnish.userData.noOcc=true;g.add(furnish);
  shell(shellG);partition(shellG);stalls(shellG);shop(shellG);stair(shellG);
  seating(furnish);ceilingGear(furnish);
  signAtlas(g);
  mergeParts(shellG);mergeParts(furnish);
  g.add(drapes(),tileFloor(),stairSurfaces());well(g);outdoor(g);mural(g);
  return g;
}
