/** IMG_9009～9018：直接穿越的大廳；純模型供 Node 與正式場景共用。 */
import * as THREE from 'three';
import {mergeBufferGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {LOBBY} from './layout.js';

const BOX=new THREE.BoxGeometry(1,1,1);
const CYLINDER=new THREE.CylinderGeometry(1,1,1,16);
const glassMaterial=new THREE.MeshToonMaterial({color:'#b9ded0',transparent:true,opacity:0.36,side:THREE.DoubleSide,depthWrite:false});
export const lobbyColors={mint:'#c8dfcc',ivory:'#f4eee0',wood:'#986844',glass:'#b9ded0',grey:'#a6aaa4',red:'#c24d60',coffee:'#394047',pink:'#df8caa',yellow:'#efd257',blue:'#548eba'};
const materials=new Map();
const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshToonMaterial({color}));return materials.get(color);};
const edge=new THREE.MeshBasicMaterial({color:'#2a2c4a',side:THREE.BackSide});
const palette=new THREE.MeshToonMaterial({color:'#ffffff',vertexColors:true});
/** 小物保留具名來源供驗收，可見幾何按色票合成一份，避免每根扶手各畫一次。 */
function mergeParts(root) {
  root.updateMatrixWorld(true);const batches=new Map(),sources=[];
  root.traverseVisible(o=>{
    if(!o.isMesh||o.userData.sign||o.userData.signAtlas||o.name.includes('方磚地板')||o.name==='米白方磚地板')return;
    const mat=o.material,g=o.geometry.clone().applyMatrix4(o.matrixWorld);
    let target=mat;
    if(mat.isMeshToonMaterial&&!mat.transparent) {
      const a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3)mat.color.toArray(a,i);
      g.setAttribute('color',new THREE.Float32BufferAttribute(a,3));target=palette;
    }
    const list=batches.get(target)??[];list.push(g);batches.set(target,list);sources.push(o);
  });
  for(const [mat,list] of batches) {
    const mesh=new THREE.Mesh(mergeBufferGeometries(list.map(g=>g.index?g.toNonIndexed():g)),mat);
    mesh.name='大廳陳設合批';mesh.userData.noOcc=!!root.userData.noOcc;root.add(mesh);list.forEach(g=>g.dispose());
  }
  sources.forEach(o=>{o.visible=false;});
}
export function lobbyBox(group,name,x,y,z,w,h,d,color,out=0.02) {
  const m=new THREE.Mesh(BOX,material(color));m.name=name;m.position.set(x,y,z);m.scale.set(w,h,d);group.add(m);
  if(out) {const e=new THREE.Mesh(BOX,edge);e.scale.set(1+2*out/w,1+2*out/h,1+2*out/d);e.name=name+'描邊';m.add(e);}
  return m;
}
function round(group,name,x,y,z,r,h,color) {
  const m=new THREE.Mesh(CYLINDER,material(color));m.name=name;m.position.set(x,y,z);m.scale.set(r,h,r);group.add(m);
  const outline=new THREE.Mesh(CYLINDER,edge);outline.scale.set(1+0.03/r,1+0.06/h,1+0.03/r);m.add(outline);return m;
}
function sign(group,text,x,y,z,w=1.4,h=0.45,angle=0) {
  h=Math.max(h,0.5);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material(lobbyColors.ivory));m.name='標示：'+text;
  m.position.set(x,y,z);m.rotation.y=angle;m.userData.sign={text,w,h};group.add(m);return m;
}
const columns=[[27.5,-31.9],[31.2,-32],[34.6,-31.8],[34.9,-30.6],[34.9,-26.4],[31.2,-25.5],[27.5,-25.8],[27.4,-28.6]];
const furniture=[['服務台',27.4,-34.95,2.4,0.55,1.1,'wood'],['紅色圓沙發',28.1,-24.9,1.3,1.3,0.55,'red'],
  ['白色矮櫃',30.2,-24.3,1.2,0.5,0.8,'ivory'],['木長凳',32.2,-24.3,1.6,0.5,0.45,'wood'],['木邊桌',33.7,-24.4,0.7,0.6,0.7,'wood'],
  ['飲料機',30.3,-34.95,1.1,0.7,1.9,'red'],['咖啡機',31.7,-34.95,1.1,0.7,1.9,'coffee'],['販賣機',33.1,-34.95,1.1,0.7,1.9,'pink'],
  ['交誼沙發',35.7,-24.5,1.2,0.65,0.7,'grey']];
const chairs=[[27.3,-32.2],[28.7,-32.2],[28,-31.5],[28,-32.9]];
/** 標示整串置中繪製，字級先取格子高的七成，太寬就等比縮到格子寬的九成；measure(text,size) 回傳字寬。 */
export function signTextLayout(text,cell,measure) {
  let size=Math.min(90,cell.h*0.72);const width=measure(text,size);
  if(width>cell.w*0.9)size*=cell.w*0.9/width;
  return {text,size,x:cell.x+cell.w/2,y:cell.y+cell.h/2};
}
export const lobbyOBB=(name,x,z,w,d,th=0)=>({kind:'lobby',name,obb:true,cx:x,cz:z,hx:w/2,hz:d/2,th,cs:Math.cos(th),sn:Math.sin(th)});
export function isInsideLobby(x,z) {
  const {x0,x1,z0,z1}=LOBBY.bounds;return x>=x0&&x<=x1&&z>=z0&&z<=z1;
}
/** 房間真正的 Scene 在 mapLight 才取得，不把 callback 掛在會被搬走的戶外 Scene。 */
export function installLobbyRoof(s) {
  const previous=s.onBeforeRender;
  const position=new THREE.Vector3();let objects;
  s.onBeforeRender=function(renderer,world,camera,...rest) {
    previous?.call(this,renderer,world,camera,...rest);
    objects??=['九舍大廳屋頂','九舍大廳欄杆','九舍大廳欄杆描邊'].map(name=>s.getObjectByName(name));
    const p=camera.getWorldPosition(position),visible=!(isInsideLobby(p.x,p.z)&&p.y>LOBBY.base+LOBBY.ceiling);
    for(const o of objects)if(o)o.visible=visible;
  };
}
function shellParts() {
  const {x0,x1,z0,z1}=LOBBY.bounds,cx=(x0+x1)/2;
  const parts=[['北牆',cx,z0,x1-x0,0.3],['南牆',cx,z1,x1-x0,0.3]];
  for(const [side,{z,width}] of LOBBY.doors.entries()) for(const [a,b] of [[z0,z-width/2],[z+width/2,z1]])
    parts.push(['門側牆',side?x1:x0,(a+b)/2,0.3,b-a]);
  return parts;
}
export function wellPoint(t) {
  const {cx,cz,rx,rz}=LOBBY.well;
  // 兩個反向半圓的帶狀開口，內外弧共享圓心，端部以半圓封口。
  const r=rx/2-0.25,half=rz/4,outer=r+half,inner=r-half;
  const u=((t/(2*Math.PI))%1+1)%1*6,part=Math.floor(u),a=(u-part)*Math.PI;
  const arcs=[
    [cx+r,outer,-a],[cx-r,inner,a],[cx-2*r,half,-a],
    [cx-r,outer,Math.PI-a],[cx+r,inner,Math.PI+a],[cx+2*r,half,Math.PI-a],
  ];
  const [x,radius,angle]=arcs[part];
  return [x+radius*Math.cos(angle),cz+radius*Math.sin(angle)];
}
function wellParts() {
  const parts=[];
  for(let i=0;i<64;i++) {
    const t=(i+0.5)*Math.PI*2/64;
    if(t<0.30||t>Math.PI*2-0.30)continue;
    const a=wellPoint(i*Math.PI*2/64),b=wellPoint((i+1)*Math.PI*2/64);
    parts.push(['開口矮牆',(a[0]+b[0])/2,(a[1]+b[1])/2,Math.hypot(b[0]-a[0],b[1]-a[1])+0.03,0.16,-Math.atan2(b[1]-a[1],b[0]-a[0])]);
  }
  parts.push(['樓梯口內護牆',33.6,-28.6,0.16,1.4,0]);
  return parts;
}
export function lobbyColliders() {
  return [...shellParts(),...wellParts(),...columns.map(([x,z])=>['圓柱',x,z,0.46,0.46]),
    ...furniture.map(([n,x,z,w,d])=>[n,x,z,w,d]),['桌子',28,-32.2,0.9,0.9],...chairs.map(([x,z])=>['椅子',x,z,0.4,0.4])]
    .map(([n,x,z,w,d,th])=>lobbyOBB(n,x,z,w,d,th));
}
export function createLobby() {
  const g=new THREE.Group();g.name='九舍大廳室內';
  const {x0,x1,z0,z1}=LOBBY.bounds;
  for(const [n,x,z,w,d] of shellParts())lobbyBox(g,n,x,LOBBY.base+LOBBY.ceiling/2,z,w,LOBBY.ceiling,d,lobbyColors.mint,0.04);
  for(const [side,{z,width}] of LOBBY.doors.entries()) {
    const x=side?x1:x0;
    lobbyBox(g,'門楣',x,19,z,0.3,3,width,lobbyColors.mint,0.04);
    for(const dz of [-width/2,width/2])lobbyBox(g,'玻璃門框',x,16.25,z+dz,0.12,2.5,0.12,lobbyColors.ivory,0);
  }
  const floor=new THREE.Shape([[x0,-z1],[x1,-z1],[x1,-z0],[x0,-z0]].map(([x,z])=>new THREE.Vector2(x,z)));
  const hole=new THREE.Path();
  for(let i=0;i<=64;i++){const [x,z]=wellPoint(i*Math.PI*2/64);if(!i)hole.moveTo(x,-z);else hole.lineTo(x,-z);}
  floor.holes.push(hole);
  const fm=new THREE.Mesh(new THREE.ShapeGeometry(floor),material(lobbyColors.ivory));fm.name='米白方磚地板';fm.rotation.x=-Math.PI/2;fm.position.y=15.02;g.add(fm);
  for(const [x,z,w,d] of [[25.9,-29.65,0.4,10.3],[36.4,-29.65,0.4,10.3],[31.15,-34.9,10.9,0.4],[31.15,-24.4,10.9,0.4]])
    lobbyBox(g,'灰色格紋邊帶',x,15.035,z,w,0.01,d,lobbyColors.grey,0);
  for(const [n,x,z,w,d,th] of wellParts()) {
    const wall=lobbyBox(g,n,x,15.5,z,w,1,d,lobbyColors.ivory,0.02);wall.rotation.y=th??0;
    const rail=lobbyBox(g,'木扶手',x,16.04,z,w,0.09,d+0.06,lobbyColors.wood,0.015);rail.rotation.y=th??0;
  }
  lobbyBox(g,'開口下層方磚地板',31.2,12.02,-28.6,7,0.04,5,lobbyColors.ivory,0);
  const roof=new THREE.Group();roof.name='九舍大廳屋頂';g.add(roof);
  for(const [x,z,w,d] of [[27,-29.65,3.6,11.9],[35.75,-29.65,2.7,11.9],[31.6,-34,5.6,3.2],[31.6,-24.7,5.6,2]])
    lobbyBox(roof,'薄荷綠天花板',x,20.62,z,w,0.24,d,lobbyColors.mint,0.04);
  for(const z of [-34,-31.5,-25])lobbyBox(roof,'外露橫樑',31.15,20.3,z,11.9,0.4,0.3,lobbyColors.mint,0.03);
  const sky=lobbyBox(roof,'玻璃格子天窗',31.6,20.63,-28.5,5.6,0.08,6.4,lobbyColors.glass,0);sky.material=glassMaterial;
  for(let x=28.8;x<=34.4;x+=0.8)lobbyBox(roof,'天窗格子',x,20.69,-28.5,0.035,0.06,6.4,lobbyColors.grey,0);
  for(let z=-31.7;z<=-25.3;z+=0.8)lobbyBox(roof,'天窗格子',31.6,20.69,z,5.6,0.06,0.035,lobbyColors.grey,0);
  roof.traverse(o=>{o.userData.noOcc=true;});
  mergeParts(roof);
  for(const [x,z] of columns)round(g,'圓柱',x,17.75,z,0.23,5.5,lobbyColors.mint);
  const stairs=new THREE.Group();stairs.name='旋轉樓梯';g.add(stairs);
  for(let arm=0;arm<2;arm++)for(let i=0;i<10;i++) {
    const r=LOBBY.well.rx/2-0.25,t=(i+0.5)*Math.PI/10*(arm?1:-1);
    const x=LOBBY.well.cx+(arm?-r:r)+Math.cos(t)*r,z=LOBBY.well.cz+Math.sin(t)*r;
    const y=LOBBY.base-0.075-(arm*10+i)*0.15;
    const step=lobbyBox(stairs,'弧形踏階',x,y,z,1.15,0.15,0.45,lobbyColors.ivory,0.01);step.rotation.y=-t;
    const strip=lobbyBox(stairs,'黃色止滑條',x,y+0.085,z,1.1,0.02,0.06,lobbyColors.yellow,0);strip.rotation.y=-t;
  }
  for(const [n,x,z,w,d,h,c] of furniture) {
    if(n==='紅色圓沙發') {round(g,n,x,15+h/2,z,w/2,h,lobbyColors.red);round(g,'圓沙發中央靠背',x,15.85,z,0.23,0.9,lobbyColors.red);}
    else lobbyBox(g,n,x,15+h/2,z,w,h,d,lobbyColors[c]);
    if(['飲料機','咖啡機','販賣機'].includes(n)) {
      const screen=lobbyBox(g,'販賣展示窗',x,16.12,z+0.36,w-0.16,1.05,0.025,lobbyColors.glass,0);
      screen.userData.vending=true;
      sign(g,n==='飲料機'?'飲料':n==='咖啡機'?'咖啡':'販賣機',x,16.68,z+0.38,0.95,0.38);
    }
  }
  const table=new THREE.Group();table.name='桌椅';g.add(table);
  lobbyBox(table,'桌面',28,15.75,-32.2,0.9,0.08,0.9,lobbyColors.grey);
  lobbyBox(table,'桌腳',28,15.36,-32.2,0.1,0.72,0.1,lobbyColors.coffee,0.015);
  for(const [x,z] of chairs){lobbyBox(table,'椅座',x,15.45,z,0.4,0.08,0.4,lobbyColors.coffee,0.015);lobbyBox(table,'椅背',x,15.72,z-0.18,0.4,0.5,0.05,lobbyColors.coffee,0.015);}
  const partition=lobbyBox(g,'玻璃隔間',31.15,17.3,-35.35,10.6,2,0.04,lobbyColors.glass,0);partition.material=glassMaterial;
  for(const x of [26.4,28.6,30.8,33,35.2])lobbyBox(g,'隔間窗框',x,17.3,-35.29,0.07,2.1,0.08,lobbyColors.grey,0);
  lobbyBox(g,'公佈欄',35.9,16.9,-35.25,1.4,1.1,0.08,lobbyColors.wood,0.02);
  for(const [text,x,y,z,w,h] of [['服務台',26.6,18.7,-35.2,1.5,0.5],['WELCOME to FRONT DESK',29.3,18.7,-35.18,3.5,0.5],['DORM 9',35.7,18.2,-35.2,1.3,0.45],['往安九',34.9,16.8,-29.7,1.2,0.45]])sign(g,text,x,y,z,w,h);
  const signs=[];g.traverse(o=>{if(o.userData.sign)signs.push(o);});
  const signParts=signs.map((o,i)=>{
    const {w,h}=o.userData.sign;
    const rect={x:(i%2)*1024,y:Math.floor(i/2)*128,w:Math.round(128*w/h),h:128};
    o.userData.sign.atlas=rect;
    o.updateMatrixWorld(true);const geo=o.geometry.clone().applyMatrix4(o.matrixWorld),uv=geo.attributes.uv;
    for(let j=0;j<uv.count;j++)uv.setXY(j,(rect.x+uv.getX(j)*rect.w)/2048,1-(rect.y+(1-uv.getY(j))*rect.h)/512);
    o.visible=false;return geo;
  });
  const atlas=new THREE.Mesh(mergeBufferGeometries(signParts),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true}));
  atlas.name='室內標示圖集';atlas.userData.signAtlas=signs.map(o=>o.userData.sign);g.add(atlas);
  // 屋頂已合併，主場景只合併其他靜態陳設。
  roof.visible=false;mergeParts(g);roof.visible=true;
  return g;
}
