/** 達賢戶外模型。只依賴 Three.js 與本區配置，可在 Node 直接驗收地面幾何。 */
import * as THREE from 'three';
import { BOUNDS, POND, HOUSE, groundHeight, insidePolygon } from './layout.js';

function shapeOf(points) {
  const s = new THREE.Shape();
  points.forEach(([x,z],i) => i ? s.lineTo(x,-z) : s.moveTo(x,-z));
  s.closePath(); return s;
}

export function createGround(material = new THREE.MeshToonMaterial({ color: COLORS.grass, side: THREE.DoubleSide })) {
  const group = new THREE.Group(); group.name = '達賢地面';
  // 景觀延伸到行走範圍外，鏡頭不會看見一片懸空的方形草坪。
  const x0=BOUNDS.x0-110,x1=BOUNDS.x1+110;
  const rear = shapeOf([[x0,BOUNDS.z0-130],[x1,BOUNDS.z0-130],[x1,-30],[x0,-30]]);
  rear.holes.push(new THREE.Path(POND.map(([x,z])=>new THREE.Vector2(x,-z))));
  const back = new THREE.Mesh(new THREE.ShapeGeometry(rear),material);
  back.rotation.x=-Math.PI/2; group.add(back);
  const zs=[-30,-20,0,28,36,50,70,90,104,210],vertices=[];
  const v=(x,z)=>[x,groundHeight(x,z),z];
  for(let x=x0;x<x1;x+=3){
    const right=Math.min(x+3,x1);
    for(let j=0;j<zs.length-1;j++){
      const a=v(x,zs[j]),b=v(x,zs[j+1]),c=v(right,zs[j+1]),d=v(right,zs[j]);
      vertices.push(...a,...b,...c,...a,...c,...d);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
  group.add(new THREE.Mesh(g,material));return group;
}

const BOX = new THREE.BoxGeometry(1,1,1);
const LEAF = new THREE.IcosahedronGeometry(1,1);
const ROCK = new THREE.IcosahedronGeometry(1,0);
export const TREE_POSITIONS=[[-40,74],[-37,48],[-42,13],[-41,-14],[-44,-43],[-43,-71],[-26,-96],[22,-98],[38,-89],[42,-66],[47,-39],[46,-14],[43,18],[42,57],[-33,101],[43,99]];
const COLORS = {
  concrete:'#afb8b5', edge:'#cbd3d0', seam:'#85918e', glass:'#536f77',
  glassLight:'#9bb9ba', glassDark:'#3f5f62', frame:'#d6ded7', louver:'#956b48',
  louverEdge:'#b38c62', paving:'#aaafa6', stone:'#a6afa1', grass:'#6fae5c',
  grassDark:'#648258', trunk:'#726653', leaves:'#456c4b', leavesLight:'#69874f',
  leavesDark:'#365e48', hedge:'#557447', rail:'#bfcac3', water:'#537d71', waterHighlight:'#bed1ba',
};

/** 小物件依材質與幾何批次繪製，主牆另保留一般 Mesh 供既有鏡頭遮擋使用。 */
function batch(parent, materialFor) {
  const lists=new Map(),outlines=new Map(),o=new THREE.Object3D();
  return {
    add(kind,x,y,z,w,h,d,angle=0,geometry=BOX){
      const key=kind+':'+geometry.uuid;
      if(!lists.has(key))lists.set(key,{kind,geometry,matrices:[]});
      o.position.set(x,y,z);o.rotation.set(0,angle,0);o.scale.set(w,h,d);o.updateMatrix();
      lists.get(key).matrices.push(o.matrix.clone());
      if(geometry===BOX&&Math.min(w,h,d)>0.18&&Math.max(w,h,d)>2){
        const t=Math.min(0.04,Math.min(w,h,d)*0.1);
        if(!outlines.has(geometry))outlines.set(geometry,[]);
        o.scale.set(w+2*t,h+2*t,d+2*t);o.updateMatrix();
        outlines.get(geometry).push(o.matrix.clone());
      }
    },
    finish(){
      for(const [geometry,matrices]of outlines){
        const m=new THREE.InstancedMesh(geometry,materialFor('outline'),matrices.length);
        matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));
        m.name='共用實例：描邊';parent.add(m);
      }
      for(const {kind,geometry,matrices}of lists.values()){
        const m=new THREE.InstancedMesh(geometry,materialFor(kind),matrices.length);
        matrices.forEach((matrix,i)=>m.setMatrixAt(i,matrix));
        m.instanceMatrix.needsUpdate=true;m.name='共用實例：'+kind;parent.add(m);
      }
    },
  };
}

function solid(parent, materialFor, kind,x,y,z,w,h,d,name) {
  const m=new THREE.Mesh(BOX,materialFor(kind));m.position.set(x,y,z);m.scale.set(w,h,d);
  m.name=name||kind;parent.add(m);
  const out=new THREE.Mesh(BOX,materialFor('outline'));
  out.scale.set(1+0.08/w,1+0.08/h,1+0.08/d);m.add(out);return m;
}

function ribbonWindows(b,x,y,z,w,h,face=0) {
  // 單一玻璃帶配細窗框，不以一個方塊模擬整棟窗戶。
  b.add('glass',x,y,z,w,h,0.1,face);
  const c=Math.cos(face),s=Math.sin(face);
  for(let offset=-w/2;offset<=w/2+0.01;offset+=1.55)
    b.add('frame',x+c*offset,y,z-s*offset,0.07,h+0.06,0.13,face);
  for(const dy of [-h/2,h*0.16,h/2])b.add('frame',x,y+dy,z,w,0.07,0.14,face);
}

function library(parent,materialFor) {
  const g=new THREE.Group();g.name='達賢本館';parent.add(g);
  const b=batch(g,materialFor);
  // 高度以建築師公布 31.7m × 0.8 為比例基準，地面高差另依照片估計。
  solid(g,materialFor,'glassDark',-1.25,3.6,-9.6,50.5,7.2,37.6,'本館後側基座');
  solid(g,materialFor,'glassDark',-6,5.55,18.3,41,3.1,18.4,'二樓入口玻璃量體');
  solid(g,materialFor,'glassDark',-1.25,11.0,-9.6,50.5,6.8,37.6,'下層主體');
  solid(g,materialFor,'glassDark',-6,11.0,18.3,41,6.8,18.4,'下層前側');
  solid(g,materialFor,'glassDark',-1.25,15.75,-0.3,50.5,2.2,55.6,'水平玻璃帶');
  solid(g,materialFor,'glassDark',-1.25,20.45,-0.3,50.5,7.1,55.6,'上層主體');
  // 大面積水平框、退縮與入口門廊的懸挑結構。
  for(const [y,x,w]of [[4,-6,41],[7.45,1.5,57],[14.55,1.5,57],[17,-1.25,51.7],[24.15,-1.25,51.7]])
    b.add('edge',x,y,-0.1,w,0.38,57.3);
  for(const x of [-26.1,24.4])b.add('edge',x,20.5,-0.1,0.65,7.5,56.7);
  b.add('concrete',-21.8,10.9,28.25,9.2,6.85,0.85);
  b.add('concrete',-21.8,20.55,28.25,9.2,7.1,0.85);
  b.add('concrete',24.0,20.55,28.25,1.0,7.1,0.85);
  // 正面斜向混凝土大板：上下兩帶、水平接縫；黃昏照片的暖色不當成材料色。
  function shutters(start,count,y,h){
    for(let i=0;i<count;i++){
      const x=start+i*3.46,angle=-0.30;
      b.add('concrete',x,y,28.8,3.22,h,0.26,angle);
      b.add('seam',x+Math.sin(angle)*0.14,y,28.8+Math.cos(angle)*0.14,3.17,0.025,0.018,angle);
      b.add('edge',x+Math.sin(angle)*0.15,y-h/2+0.05,28.8+Math.cos(angle)*0.15,3.17,0.07,0.03,angle);
    }
  }
  shutters(-15.3,9,10.9,6.85);shutters(-15.3,12,20.55,7.1);
  for(let i=0;i<4;i++)b.add('concrete',16.1+i*3.46,13.0,28.8,3.22,2.65,0.26,-0.30);
  ribbonWindows(b,-6,5.75,27.62,40.8,2.9);
  ribbonWindows(b,-1.2,15.75,27.63,50.5,2.1);
  ribbonWindows(b,21.5,6.9,12.62,13.0,4.4);
  // 入口位於右側退縮處，門廊可以走入；樑柱位置對照正面與側面照片。
  solid(g,materialFor,'concrete',28.1,7.8,25.6,0.8,7.6,0.8,'入口外柱');
  b.add('concrete',21.8,10.5,21,15,0.38,15.3);
  for(let z=14;z<28;z+=2.8)b.add('seam',21.6,10.27,z,14.6,0.16,0.22);
  b.add('concrete',18.1,5.1,27.7,6.8,2.2,0.45);
  // 池畔側、兩側的細直向遮陽及水平框。
  for(const [y,h]of [[10.9,6.4],[20.55,6.8]]){
    for(let x=-25.4;x<24;x+=1.42)b.add('louver',x,y,-28.55,0.16,h,1.15,0.12);
    for(const side of [-1,1])for(let z=-27;z<27;z+=1.7)
      b.add('louver',side<0?-26.8:24.8,y,z,1.1,h,0.15,0.12);
    for(const dy of [-h/2,h/2])b.add('edge',-1.2,y+dy,-29.05,51.3,0.25,0.5);
  }
  for(const y of [2.1,5.55,15.75]){
    ribbonWindows(b,-1.2,y,-28.48,50.1,y===15.75?2:2.7,Math.PI);
    ribbonWindows(b,-26.64,y,-0.1,54.4,y===15.75?2:2.7,-Math.PI/2);
    ribbonWindows(b,24.15,y,-8.6,37.0,y===15.75?2:2.7,Math.PI/2);
  }
  // 背面下方的折線外框與退縮，保留照片中的水平層次。
  b.add('edge',-3,7.45,-29.4,47,0.4,2.6);
  b.add('edge',-13,3.55,-29.4,27,0.4,2.6);
  for(const x of [-25,-13,-1,11,23])b.add('edge',x,3.5,-28.55,0.42,7,0.6);
  // 屋頂為鋸齒狀採光結構與綠化，不把採光罩當成太陽能板。
  b.add('grassDark',-1.2,24.4,-0.4,49.8,0.13,54.8);
  const roof=new THREE.Group();roof.name='屋頂採光罩';g.add(roof);
  for(let x=-17;x<=15;x+=4.0){
    const panel=new THREE.Mesh(new THREE.BoxGeometry(3.7,0.10,41),materialFor('glassLight'));
    panel.position.set(x,24.92,-0.5);panel.rotation.z=0.24;roof.add(panel);
    b.add('frame',x-1.8,24.49,-0.5,0.075,0.25,41);
    b.add('frame',x+1.8,25.34,-0.5,0.075,0.32,41);
    for(let z=-21;z<21;z+=3.1)b.add('frame',x,24.96,z,3.8,0.07,0.08);
  }
  b.add('concrete',-20.5,24.8,-17,5.5,1.0,6.5);
  b.finish();return g;
}

function readingHouse(parent,materialFor) {
  const g=new THREE.Group();g.name='湖濱悅讀小屋';g.position.set(HOUSE.x,0,HOUSE.z);g.rotation.y=HOUSE.angle;parent.add(g);
  const b=batch(g,materialFor),w=HOUSE.width,d=HOUSE.depth;
  solid(g,materialFor,'glassDark',0,3.72,0,w,6.35,d,'小屋玻璃量體');
  for(const y of [0.52,3.77,7.07])b.add('edge',0,y,0,w+1.5,0.3,d+1.9);
  for(const side of [-1,1]){
    for(const y of [2.1,5.35])ribbonWindows(b,0,y,side*(d/2+0.06),w,2.95,side>0?0:Math.PI);
    for(const y of [2.1,5.35])ribbonWindows(b,side*(w/2+0.06),y,0,d,2.95,side>0?Math.PI/2:-Math.PI/2);
    // 兩層臨池露台的細欄杆。
    for(const base of [0.7,3.95]){
      b.add('rail',0,base+0.86,side*(d/2+0.77),w+1.35,0.07,0.07);
      for(let x=-w/2-0.5;x<=w/2+0.5;x+=0.36)b.add('rail',x,base+0.43,side*(d/2+0.77),0.035,0.86,0.035);
    }
  }
  for(const x of [-9.5,0,9.5])b.add('concrete',x,0.03,0,0.75,0.85,8.3);
  // 外側樓梯依官方小屋平面圖呈現，入口與室內暫不開放。
  for(let i=0;i<18;i++)b.add('concrete',-10.8+i*1.1,0.65+i*0.178,-9.65,1.12,0.18,1.35);
  b.finish();return g;
}

function pathStrip(parent,materialFor,points,width){
  const vs=[];
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len*width/2,nz=dx/len*width/2;
    const segments=Math.ceil(len/2);
    for(let n=0;n<segments;n++){
      const t=n/segments,u=(n+1)/segments;
      const point=(v,side)=>{const x=a[0]+dx*v+nx*side,z=a[1]+dz*v+nz*side;return[x,groundHeight(x,z)+0.025,z];};
      const p=point(t,-1),q=point(t,1),r=point(u,1),s=point(u,-1);
      vs.push(...p,...q,...r,...p,...r,...s);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));g.computeVertexNormals();
  const m=new THREE.Mesh(g,materialFor('paving'));m.material.side=THREE.DoubleSide;parent.add(m);
}

function garden(parent,materialFor){
  const g=new THREE.Group();g.name='草坡與池畔園景';parent.add(g);const b=batch(g,materialFor);
  // 前草坡的石板留草縫，右側為主步道，與照片一致保留大片草坡。
  for(let row=0;row<31;row++)for(let col=0;col<5;col++){
    const z=36+row*1.74,x=15+col*2.35+(row%2)*0.45;
    b.add('paving',x,groundHeight(x,z)+0.035,z,2.04,0.055,1.12);
  }
  pathStrip(g,materialFor,[[21,36],[23,24],[33,24],[35,8],[35,-24],[24,-34],[0,-35],[-31,-36],[-36,-50],[-35,-80],[-22,-96],[7,-99],[28,-85],[27,-57],[26,-35],[35,-24]],2.6);
  // 門廊與前廣場的石板，同樣貼合高度。
  pathStrip(g,materialFor,[[-25,32],[16,32],[23,24]],3.6);
  // 本館到小屋的二樓空橋，僅保留外觀；本輪不開放室內。
  b.add('edge',-21.2,3.9,-34.1,2.65,0.22,10.8);
  for(const x of [-22.42,-19.98]){
    b.add('rail',x,4.85,-34.1,0.07,0.07,10.8);
    for(let z=-39.3;z<-29;z+=0.43)b.add('rail',x,4.37,z,0.035,0.93,0.035);
  }
  // 景觀池、岸線石塊與低灌木使用實際不規則輪廓。
  const water=new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(POND)),materialFor('water'));
  water.name='景觀池水面';water.rotation.x=-Math.PI/2;water.position.y=-0.22;g.add(water);
  for(let i=0;i<POND.length;i++){
    const a=POND[i],c=POND[(i+1)%POND.length],dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz);
    for(let n=0;n<len;n+=0.85){
      const t=n/len,x=a[0]+dx*t,z=a[1]+dz*t;
      b.add('stone',x,-0.10,z,0.68+(i%3)*0.1,0.48,0.58,(i+n)*0.7,ROCK);
    }
  }
  // 平靜水面以少量不規則亮紋表現，不引入高成本的即時反射。
  const rippleLines=[];
  for(let z=-88;z<-43;z+=2.7)for(let x=-22;x<20;x+=3.6){
    const offset=Math.sin(x*9+z)*0.65;
    if(insidePolygon(x,z,POND)&&insidePolygon(x+1.6,z+offset,POND))rippleLines.push(x,-0.205,z,x+1.6,-0.205,z+offset*0.12);
  }
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.Float32BufferAttribute(rippleLines,3));
  const rl=new THREE.LineSegments(rg,new THREE.LineBasicMaterial({color:COLORS.waterHighlight,transparent:true,opacity:0.28}));g.add(rl);
  // 石椅、細燈柱、場邊綠化。主要觀景方向不被樹冠擋住。
  for(const [x,z,angle]of [[33,40,0],[-34,-43,1.7],[28,-78,0],[-12,-97,1.4]]){
    const y=groundHeight(x,z);b.add('concrete',x,y+0.43,z,2.5,0.25,0.72,angle);
    for(const dx of [-0.88,0.88])b.add('seam',x+dx*Math.cos(angle),y+0.15,z-dx*Math.sin(angle),0.25,0.35,0.5,angle);
  }
  for(const [x,z]of [[30,68],[32,43],[38,10],[38,-23],[27,-38],[-31,-39],[-39,-68],[23,-96]]){
    const y=groundHeight(x,z);b.add('rail',x,y+1.85,z,0.07,3.7,0.07);b.add('edge',x,y+3.73,z,0.38,0.08,0.38);
  }
  // 遠景林帶與低丘只出現在區域外，與可走地面分開。
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2,x=Math.cos(a)*145,z=Math.sin(a)*220;
    b.add(i%2?'leavesDark':'leaves',x,-3,z,22+(i%3)*4,12+(i%4)*5,25,a,LEAF);
  }
  for(let i=0;i<45;i++){
    const x=-40+(i*17%83),z=-100+(i*23%82);
    if(insidePolygon(x,z,POND)||Math.abs(x)<30&&z>-32||Math.abs(x-HOUSE.x)<14&&Math.abs(z-HOUSE.z)<17)continue;
    b.add('hedge',x,groundHeight(x,z)+0.6,z,1.6,0.9,1.2,i,LEAF);
  }
  b.finish();return g;
}

/** 可見戶外全景；模型幾何與瀏覽器文字貼圖分離。 */
export function createOutdoorModel(materialFor) {
  const cache=new Map();
  const material=materialFor||((kind)=>{
    if(kind==='outline')return new THREE.MeshBasicMaterial({color:'#2a2c4a',side:THREE.BackSide});
    if(!cache.has(kind))cache.set(kind,new THREE.MeshToonMaterial({color:COLORS[kind]||COLORS.concrete}));
    return cache.get(kind);
  });
  const root=new THREE.Group();root.name='達賢戶外區域';
  root.add(createGround(material('grass')));
  library(root,material);readingHouse(root,material);garden(root,material);
  return root;
}

export { COLORS };
