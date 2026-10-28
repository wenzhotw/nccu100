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
export function mergeParts(root) {
  root.updateMatrixWorld(true);const batches=new Map(),sources=[];
  root.traverseVisible(o=>{
    if(!o.isMesh||o.userData.sign||o.userData.signAtlas||o.name==='米白方磚地板')return;
    const mat=o.material,g=o.geometry.clone().applyMatrix4(o.matrixWorld);
    let target=mat;
    if(mat.isMeshToonMaterial&&!mat.transparent) {
      // 已烘好光影漸層的頂點色保留，其餘以材質色填入。
      if(!(mat.vertexColors&&g.attributes.color)) {
        const a=new Float32Array(g.attributes.position.count*3);for(let i=0;i<a.length;i+=3)mat.color.toArray(a,i);
        g.setAttribute('color',new THREE.Float32BufferAttribute(a,3));
      }
      target=palette;
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
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material(lobbyColors.ivory));m.name='標示：'+text;
  m.position.set(x,y,z);m.rotation.y=angle;m.userData.sign={text,w,h};group.add(m);return m;
}
const {cx:WX,cz:WZ,r:WR}=LOBBY.well,B=LOBBY.bounds,FLOOR=LOBBY.base,CEIL=LOBBY.base+LOBBY.ceiling;
/** 開口東側留 1.2 公尺缺口給樓梯口，對應的半角。 */
const GAP=0.6/WR;
// 八根圓柱圍在開口外 1 公尺，錯開東側樓梯口與東西向通道。
const columns=Array.from({length:8},(_,k)=>{const a=Math.PI/8+k*Math.PI/4;return [WX+(WR+1)*Math.cos(a),WZ+(WR+1)*Math.sin(a)];});
// 北側是服務台與販賣區（照片 9014、9015），南側是沙發、矮櫃與交誼區（照片 9009、9012）。
const furniture=[['服務台',27.3,B.z0+0.45,2.4,0.55,1.1,'wood'],
  ['飲料機',30.8,B.z0+0.45,1.0,0.7,1.85,'red'],['咖啡機',32.0,B.z0+0.45,1.0,0.7,1.85,'coffee'],['販賣機',33.2,B.z0+0.45,1.0,0.7,1.85,'pink'],
  ['紅色圓沙發',27.4,B.z1-1.5,1.3,1.3,0.45,'red'],['白色矮櫃',29.6,B.z1-0.4,1.2,0.45,0.8,'ivory'],['木長凳',31.6,B.z1-0.4,1.6,0.45,0.45,'wood'],
  ['木邊桌',33.2,B.z1-0.4,0.6,0.5,0.7,'wood'],['交誼沙發',35.9,B.z1-2.2,1.2,0.65,0.7,'grey']];
// 桌椅放在東南角空地，避開開口外的通道與北側服務台、販賣區。
const TABLE=[33.4,B.z1-2.6];
const chairs=[[TABLE[0]-0.7,TABLE[1]],[TABLE[0]+0.7,TABLE[1]],[TABLE[0],TABLE[1]+0.7],[TABLE[0],TABLE[1]-0.7]];
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
/** 圓形開口的邊線（照片 9009、9016 從大廳俯看是一圈矮牆）。 */
export function wellPoint(t) {return [WX+WR*Math.cos(t),WZ+WR*Math.sin(t)];}
function wellParts() {
  const parts=[];
  for(let i=0;i<48;i++) {
    const t=(i+0.5)*Math.PI*2/48;
    if(t<GAP||t>Math.PI*2-GAP)continue;
    const a=wellPoint(i*Math.PI*2/48),b=wellPoint((i+1)*Math.PI*2/48);
    parts.push(['開口矮牆',(a[0]+b[0])/2,(a[1]+b[1])/2,Math.hypot(b[0]-a[0],b[1]-a[1])+0.03,0.16,-Math.atan2(b[1]-a[1],b[0]-a[0])]);
  }
  // 樓梯口內側一道低欄，玩家停在樓梯口互動下樓，不會走進開口上空。
  parts.push(['樓梯口內護欄',WX+WR-0.35,WZ,0.12,1.4,0]);
  return parts;
}
/**
 * 旋轉樓梯的光影：戶外地圖不能另加光源（美術規範硬規則 5），以顏色烘出天窗光。
 * 越往下越暗，踏面受天窗直射較亮、踢面較暗。
 */
const LIT=new THREE.Color('#fbf7ec'),DIM=new THREE.Color('#b9b2a2'),RISER_LIT=new THREE.Color('#ddd5c4'),RISER_DIM=new THREE.Color('#8f897c');
export function stairShade(k) {
  const t=Math.min(1,k/19);
  return {tread:LIT.clone().lerp(DIM,t),riser:RISER_LIT.clone().lerp(RISER_DIM,t)};
}
const shadedMaterial=new THREE.MeshToonMaterial({color:'#ffffff',vertexColors:true});
/** 依頂點高度上色：top 在 y1、bottom 在 y0，中間線性過渡。 */
function verticalShade(geometry,y0,y1,top,bottom) {
  const p=geometry.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();
  for(let i=0;i<p.count;i++){c.copy(bottom).lerp(top,Math.max(0,Math.min(1,(p.getY(i)-y0)/(y1-y0))));c.toArray(a,i*3);}
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(a,3));return geometry;
}

/** 旋轉樓梯：二十階繞中柱轉一圈又四分之一，從樓梯口往下一層到 12 公尺。 */
export function spiralSteps() {
  return Array.from({length:20},(_,k)=>{
    const a=-k*Math.PI/8,top=FLOOR-(k+1)*0.15,mid=(0.4+WR-0.15)/2;
    return {k,a,top,x:WX+mid*Math.cos(a),z:WZ+mid*Math.sin(a),length:WR-0.15-0.4,width:0.62};
  });
}
export function lobbyColliders() {
  return [...shellParts(),...wellParts(),...columns.map(([x,z])=>['圓柱',x,z,0.46,0.46]),
    ...furniture.map(([n,x,z,w,d])=>[n,x,z,w,d]),['桌子',...TABLE,0.9,0.9],...chairs.map(([x,z])=>['椅子',x,z,0.4,0.4])]
    .map(([n,x,z,w,d,th])=>lobbyOBB(n,x,z,w,d,th));
}
export function createLobby() {
  const g=new THREE.Group();g.name='九舍大廳室內';
  const {x0,x1,z0,z1}=LOBBY.bounds;
  for(const [n,x,z,w,d] of shellParts())lobbyBox(g,n,x,FLOOR+LOBBY.ceiling/2,z,w,LOBBY.ceiling,d,lobbyColors.mint,0.04);
  for(const [side,{z,width}] of LOBBY.doors.entries()) {
    const x=side?x1:x0,top=FLOOR+2.5;
    lobbyBox(g,'門楣',x,(top+CEIL)/2,z,0.3,CEIL-top,width,lobbyColors.mint,0.04);
    for(const dz of [-width/2,width/2])lobbyBox(g,'玻璃門框',x,FLOOR+1.25,z+dz,0.12,2.5,0.12,lobbyColors.ivory,0);
  }
  const floor=new THREE.Shape([[x0,-z1],[x1,-z1],[x1,-z0],[x0,-z0]].map(([x,z])=>new THREE.Vector2(x,z)));
  const hole=new THREE.Path();
  for(let i=0;i<=64;i++){const [x,z]=wellPoint(i*Math.PI*2/64);if(!i)hole.moveTo(x,-z);else hole.lineTo(x,-z);}
  floor.holes.push(hole);
  const fm=new THREE.Mesh(new THREE.ShapeGeometry(floor),material(lobbyColors.ivory));fm.name='米白方磚地板';fm.rotation.x=-Math.PI/2;fm.position.y=FLOOR+0.02;g.add(fm);
  // 照片 9011：地板沿牆一圈灰色格紋邊帶。
  for(const [x,z,w,d] of [[x0+0.6,(z0+z1)/2,0.4,z1-z0-0.8],[x1-0.6,(z0+z1)/2,0.4,z1-z0-0.8],[(x0+x1)/2,z0+0.6,x1-x0-0.8,0.4],[(x0+x1)/2,z1-0.6,x1-x0-0.8,0.4]])
    lobbyBox(g,'灰色格紋邊帶',x,FLOOR+0.035,z,w,0.01,d,lobbyColors.grey,0);
  for(const [n,x,z,w,d,th] of wellParts()) {
    if(n==='開口矮牆') {
      const wall=lobbyBox(g,n,x,FLOOR+0.5,z,w,1,d,lobbyColors.ivory,0.02);wall.rotation.y=th??0;
      const rail=lobbyBox(g,'木扶手',x,FLOOR+1.04,z,w,0.09,d+0.06,lobbyColors.wood,0.015);rail.rotation.y=th??0;
    } else {
      // 樓梯口是兩根不鏽鋼短柱拉一條紅繩，不是一塊木板（碰撞仍擋在樓梯口內側）。
      const post=new THREE.Group();post.name=n;g.add(post);
      for(const dz of [-d/2,d/2])round(post,'樓梯口短柱',x,FLOOR+0.45,z+dz,0.04,0.9,lobbyColors.grey);
      lobbyBox(post,'樓梯口紅繩',x,FLOOR+0.82,z,0.03,0.03,d,lobbyColors.red,0);
    }
  }
  // 下層地板：天窗正下方一圈光斑，往外漸暗。
  const poolGeometry=new THREE.CircleGeometry(WR,32,0,Math.PI*2).rotateX(-Math.PI/2);
  {const p=poolGeometry.attributes.position,a=new Float32Array(p.count*3),c=new THREE.Color();
    for(let i=0;i<p.count;i++){c.copy(LIT).lerp(DIM,Math.min(1,Math.hypot(p.getX(i),p.getZ(i))/WR));c.toArray(a,i*3);}
    poolGeometry.setAttribute('color',new THREE.Float32BufferAttribute(a,3));}
  const lower=new THREE.Mesh(poolGeometry,shadedMaterial);lower.name='開口下層方磚地板';lower.position.set(WX,12.02,WZ);g.add(lower);
  // 開口內壁從大廳地板往下到下層：上緣靠天窗較亮，往下漸暗，往下看是一個有深度的圓筒。
  // 圓筒翻面（鏡射後法線朝內），從開口裡面看得到內壁，且能與其他陳設共用正面材質合併。
  const shaftGeometry=verticalShade(new THREE.CylinderGeometry(WR,WR,3,32,4,true).scale(-1,1,1),-1.5,1.5,new THREE.Color('#dcecdf'),new THREE.Color('#8aa392'));
  {const n=shaftGeometry.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,-n.getX(i),n.getY(i),-n.getZ(i));}
  const shaft=new THREE.Mesh(shaftGeometry,shadedMaterial);
  shaft.name='開口內壁';shaft.position.set(WX,13.5,WZ);g.add(shaft);
  // 天窗灑下的光柱：很淡的半透明圓柱，不是光源。
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(WR-0.3,WR-0.1,CEIL-12.05,24,1,true),
    new THREE.MeshBasicMaterial({color:'#fff6d8',transparent:true,opacity:0.12,depthWrite:false,side:THREE.DoubleSide}));
  beam.name='天窗光柱';beam.position.set(WX,(CEIL+12.05)/2,WZ);beam.userData.noOcc=true;g.add(beam);
  const roof=new THREE.Group();roof.name='九舍大廳屋頂';g.add(roof);
  const sk=WR+0.4;
  for(const [x,z,w,d] of [[(x0+WX-sk)/2,(z0+z1)/2,WX-sk-x0,z1-z0],[(WX+sk+x1)/2,(z0+z1)/2,x1-WX-sk,z1-z0],[WX,(z0+WZ-sk)/2,2*sk,WZ-sk-z0],[WX,(WZ+sk+z1)/2,2*sk,z1-WZ-sk]])
    lobbyBox(roof,'薄荷綠天花板',x,CEIL+0.12,z,w,0.24,d,lobbyColors.mint,0.04);
  for(const z of [z0+3,WZ-sk-0.6,WZ+sk+0.6])lobbyBox(roof,'外露橫樑',(x0+x1)/2,CEIL-0.2,z,x1-x0,0.4,0.3,lobbyColors.mint,0.03);
  // 照片 9018：開口正上方的玻璃格子天窗。
  const sky=lobbyBox(roof,'玻璃格子天窗',WX,CEIL+0.13,WZ,2*sk,0.08,2*sk,lobbyColors.glass,0);sky.material=glassMaterial;
  for(let v=-sk;v<=sk+1e-9;v+=0.8){lobbyBox(roof,'天窗格子',WX+v,CEIL+0.19,WZ,0.035,0.06,2*sk,lobbyColors.grey,0);lobbyBox(roof,'天窗格子',WX,CEIL+0.19,WZ+v,2*sk,0.06,0.035,lobbyColors.grey,0);}
  roof.traverse(o=>{o.userData.noOcc=true;});
  mergeParts(roof);
  for(const [x,z] of columns)round(g,'圓柱',x,FLOOR+LOBBY.ceiling/2,z,0.23,LOBBY.ceiling,lobbyColors.mint);
  const stairs=new THREE.Group();stairs.name='旋轉樓梯';g.add(stairs);
  {const column=new THREE.Mesh(verticalShade(new THREE.CylinderGeometry(0.32,0.32,3.2,16,4),-1.6,1.6,LIT,DIM),shadedMaterial);
    column.name='旋轉樓梯中柱';column.position.set(WX,13.6,WZ);stairs.add(column);
    const out=new THREE.Mesh(CYLINDER,edge);out.scale.set(0.35,3.26,0.35);column.add(out);}
  // 每階是從中柱到外緣的扇形踏板，相鄰兩階略為重疊，往下看是一圈接一圈的螺旋。
  const span=Math.PI/8+0.04;
  for(const st of spiralSteps()) {
    // 踏階本體（踢面與側邊）用較暗的踢面色，頂面另疊一片較亮的踏面色。
    const {tread,riser}=stairShade(st.k);
    const wedge=new THREE.CylinderGeometry(WR-0.12,WR-0.12,0.15,6,1,false,Math.PI/2-st.a-span/2,span);
    const step=new THREE.Mesh(wedge,material('#'+riser.getHexString()));step.name='弧形踏階';step.position.set(WX,st.top-0.075,WZ);stairs.add(step);
    const out=new THREE.Mesh(wedge,edge);out.scale.set(1.01,1.15,1.01);step.add(out);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(WR-0.13,WR-0.13,0.012,6,1,false,Math.PI/2-st.a-span/2+0.01,span-0.02),material('#'+tread.getHexString()));
    top.name='踏面';top.position.set(WX,st.top+0.002,WZ);stairs.add(top);
    // 黃色止滑條沿每階往下走的前緣。
    const front=st.a-Math.PI/16,mid=(0.32+WR-0.12)/2;
    const strip=lobbyBox(stairs,'黃色止滑條',WX+mid*Math.cos(front),st.top+0.005,WZ+mid*Math.sin(front),WR-0.12-0.32,0.02,0.06,lobbyColors.yellow,0);strip.rotation.y=-front;
  }
  for(const [n,x,z,w,d,h,c] of furniture) {
    if(n==='紅色圓沙發') {round(g,n,x,FLOOR+h/2,z,w/2,h,lobbyColors.red);round(g,'圓沙發中央靠背',x,FLOOR+0.75,z,0.22,0.6,lobbyColors.red);}
    else lobbyBox(g,n,x,FLOOR+h/2,z,w,h,d,lobbyColors[c]);
    if(['飲料機','咖啡機','販賣機'].includes(n)) {
      const screen=lobbyBox(g,'販賣展示窗',x,FLOOR+1.05,z+0.36,w-0.16,1.0,0.025,lobbyColors.glass,0);
      screen.userData.vending=true;
      sign(g,n==='飲料機'?'飲料':n==='咖啡機'?'咖啡':'販賣機',x,FLOOR+1.65,z+0.38,0.9,0.3);
    }
  }
  const table=new THREE.Group();table.name='桌椅';g.add(table);
  lobbyBox(table,'桌面',TABLE[0],FLOOR+0.75,TABLE[1],0.9,0.06,0.9,lobbyColors.grey);
  lobbyBox(table,'桌腳',TABLE[0],FLOOR+0.36,TABLE[1],0.1,0.72,0.1,lobbyColors.coffee,0.015);
  for(const [x,z] of chairs){
    lobbyBox(table,'椅座',x,FLOOR+0.45,z,0.4,0.06,0.4,lobbyColors.coffee,0.015);
    const back=lobbyBox(table,'椅背',x+(x-TABLE[0])*0.25,FLOOR+0.72,z+(z-TABLE[1])*0.25,0.4,0.5,0.05,lobbyColors.coffee,0.015);back.rotation.y=Math.atan2(x-TABLE[0],z-TABLE[1]);
  }
  // 照片 9009、9012：南牆是玻璃隔間，掛公佈欄與 DORM 9 門牌。
  const partition=lobbyBox(g,'玻璃隔間',(x0+x1)/2,FLOOR+1.3,z1-0.25,x1-x0-0.6,2.2,0.04,lobbyColors.glass,0);partition.material=glassMaterial;
  for(let x=x0+0.9;x<x1-0.3;x+=2.2)lobbyBox(g,'隔間窗框',x,FLOOR+1.3,z1-0.29,0.07,2.3,0.08,lobbyColors.grey,0);
  lobbyBox(g,'公佈欄',29.4,FLOOR+1.5,z1-0.33,1.4,1.0,0.06,lobbyColors.wood,0.02);
  for(const [text,x,y,z,w,h,angle] of [['服務台',26.6,FLOOR+2.75,z0+0.2,1.2,0.4,0],['WELCOME to FRONT DESK',28.7,FLOOR+2.75,z0+0.22,2.8,0.4,0],
    ['DORM 9',33.6,FLOOR+2.6,z1-0.33,1.0,0.35,Math.PI],['往安九',WX+WR+0.25,FLOOR+1.35,WZ-0.95,0.9,0.3,-Math.PI/2]])sign(g,text,x,y,z,w,h,angle);
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
