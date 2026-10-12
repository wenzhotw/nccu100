/**
 * 大仁樓遊戲版：以現有法學院的純色牆面、平面窗紋與粗輪廓為基準。
 * 保留四層立面、抬高入口、灰色雨棚、紅邊大階梯，捨去寫實洗石子與細小構件。
 * 側面、背面、屋頂及尺寸仍為照片之外的簡化推估。
 */
import * as THREE from 'three';
import { DAREN } from './layout.js';
const BOX = new THREE.BoxGeometry(1, 1, 1);
const C = { wall:'#9fa5aa', white:'#efefea', trim:'#d6d8d4', dark:'#434b51', canopy:'#59616a', glass:'#a9c2cc', glassLight:'#c6dce0', step:'#d6d3c5', red:'#c4735d' };

function texture(width, height, draw) {
  const c = document.createElement('canvas'); c.width=width; c.height=height;
  draw(c.getContext('2d'), width, height);
  const t = new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; t.anisotropy=4;
  // 與既有 canvasTex 一致，字型載入後由遊戲迴圈重畫題字。
  t.redraw=()=>{const g=c.getContext('2d');g.clearRect(0,0,width,height);draw(g,width,height);t.needsUpdate=true;};
  return t;
}

// 與遊戲既有建築一樣，窗戶是乾淨的平面色塊，沒有幾何小窗框或顆粒貼圖。
function facade(width, columns, entrance=false) {
  return texture(1024,512,(g,w,h)=>{
    const sx=w/width, sy=h/13.1;
    const rect=(x,y,ww,hh,color)=>{g.fillStyle=color;g.fillRect((x+width/2)*sx,(13.1-y-hh)*sy,ww*sx,hh*sy);};
    if(entrance){rect(-13,0,10.1,13.1,C.wall);rect(2.9,0,10.1,13.1,C.wall);rect(-2.9,6.3,5.8,6.8,C.wall);}
    else{g.fillStyle=C.wall;g.fillRect(0,0,w,h);}
    const pitch=width/columns;
    for(let row=0;row<4;row++) for(let col=0;col<columns;col++){
      const x=(col-(columns-1)/2)*pitch;
      if(entrance&&Math.abs(x)<2.9&&row<2)continue;
      const ww=columns===8?2.20:2.08, hh=1.82, y=.55+row*3.15;
      rect(x-ww/2-.065,y-.065,ww+.13,hh+.13,C.white);
      rect(x-ww/2,y,ww,hh,'#546873');
      rect(x-ww/2+.07,y+.07,ww-.14,hh-.14,C.glass);
      rect(x-ww/2+.07,y+hh-.40,ww-.14,.30,C.glassLight);
      rect(x-.045,y,.09,hh,C.white);
      rect(x-ww/2,y+1.22,ww,.085,C.white);
    }
  });
}

export function createDarenHall({materialFactory=(color,extra)=>new THREE.MeshToonMaterial({color,...extra})}={}) {
  const group=new THREE.Group(); group.name='daren-hall';
  group.userData={name:'大仁樓',style:'game-matched-simplified',reference:'two-facade-photos-and-two-game-style-references',inferred:['rear','sides','roof','dimensions']};
  const mat={};for(const [key,color] of Object.entries(C))mat[key]=materialFactory(color);
  const batches=new Map();
  let boxCount=0;
  function box(name,x,y,z,w,h,d,m,occluder=false){
    boxCount++;
    // 遊戲鏡頭只偵測一般 Mesh，主量體保留為獨立方塊以免鏡頭穿牆。
    if(occluder){
      const mesh=new THREE.Mesh(BOX,m);mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(w,h,d);
      mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return;
    }
    if(!batches.has(m))batches.set(m,[]);
    batches.get(m).push({name,x,y,z,w,h,d});
  }
  const bodyH=13.1, front=3.5;
  // 三個主量體與中央上方橋接量體，保留凹入門廊。
  box('後方主體',0,bodyH/2,-.45,26,bodyH,6.1,mat.wall,true);
  [-1,1].forEach(s=>box('正面側翼',s*7.95,bodyH/2,3.05,10.1,bodyH,.9,mat.wall,true));
  box('入口上方',0,9.7,3.05,5.8,6.8,.9,mat.wall,true);

  function face(name,w,h,t,x,y,z,ry=0){
    const material=materialFactory('#ffffff',{map:t,alphaTest:.5});
    const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);p.name=name;p.position.set(x,y,z);p.rotation.y=ry;p.receiveShadow=true;group.add(p);
  }
  face('正面平面窗紋',26,13.1,facade(26,8,true),0,6.55,3.516);
  face('後面簡化窗紋',26,13.1,facade(26,8),0,6.55,-3.516,Math.PI);
  const sideTex=facade(7,2);
  face('右側簡化窗紋',7,13.1,sideTex,13.016,6.55,0,Math.PI/2);
  face('左側簡化窗紋',7,13.1,sideTex,-13.016,6.55,0,-Math.PI/2);

  // 八開間以較寬白柱概括，省去寫實細肋與密集梯狀裝飾。
  for(let i=0;i<=8;i++){
    const x=(i-4)*3.25,bottom=Math.abs(x)<2.9?6.3:.1;
    box('白色直柱',x,(12.88+bottom)/2,3.66,.23,12.88-bottom,.27,mat.white);
  }
  [3.15,6.30,9.45,12.6].forEach(y=>{
    if(y>6.3)box('簡化樓層線',0,y,3.59,26,.18,.17,mat.trim);
    else[-1,1].forEach(s=>box('簡化樓層線',s*7.95,y,3.59,10.1,.18,.17,mat.trim));
  });
  // 平頂與大面積白色收邊，與遊戲其他校舍使用相同視覺語言。
  box('灰色題字帶',0,13.15,3.54,26.1,.83,.28,mat.canopy);
  box('白色平屋頂',0,13.70,0,26.7,.38,7.65,mat.white,true);
  box('屋頂陰影線',0,13.47,0,26.45,.08,7.45,mat.trim);
  [12.37,12.65,12.93].forEach(y=>box('中央遮陽百葉',0,y,3.83,6.2,.13,.52,mat.white));
  // 招牌由左往右讀「大仁樓」
  ['大','仁','樓'].forEach((char,i)=>{
    const t=texture(128,128,g=>{g.font='bold 92px "Noto Sans CJK TC","Noto Sans TC",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle=C.white;g.fillText(char,64,66);});
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(.74,.74),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));
    sign.name='屋簷題字'+char;sign.position.set((i-1)*4.2,13.16,3.693);group.add(sign);
  });

  // 雨棚、入口採幾個寬厚的色塊，遠看也能辨認。
  box('大雨棚',0,6.18,4.76,7.4,.48,3.45,mat.canopy,true);
  box('雨棚白色收邊',0,6.45,4.76,7.65,.15,3.6,mat.trim);
  box('入口陰影',0,4.65,2.64,5.2,3.1,.09,mat.dark);
  [-2.55,2.55].forEach(x=>box('入口方柱',x,4.7,3.28,.46,3.2,.72,mat.white));
  [-.72,.72].forEach(x=>box('大片玻璃門',x,4.59,2.75,1.32,2.84,.06,mat.glass));
  [-1.45,0,1.45].forEach(x=>box('簡化門框',x,4.6,2.83,.12,2.95,.11,mat.white));
  box('門框上緣',0,6.05,2.83,3.05,.14,.11,mat.white);

  // 階梯縮減為九個清楚的造型階，不再繪製數百片小磁磚。
  const sd=(DAREN.stairStart-DAREN.stairEnd)/DAREN.stairCount;
  const sh=DAREN.landingHeight/DAREN.stairCount;
  box('入口平台',0,DAREN.landingHeight/2,3.715,5.8,DAREN.landingHeight,2.07,mat.step,true);
  for(let i=0;i<DAREN.stairCount;i++){
    const h=(i+1)*sh,z=DAREN.stairStart-(i+.5)*sd;
    box('大階梯',0,h/2,z,5.8,h,sd+.004,mat.step);
    [-1,1].forEach(s=>box('紅磚邊帶',s*2.67,h+.015,z,.36,.03,sd+.008,mat.red));
  }
  const shape=new THREE.Shape();shape.moveTo(DAREN.stairStart,0);shape.lineTo(DAREN.stairEnd,0);shape.lineTo(DAREN.stairEnd,DAREN.landingHeight+.80);shape.lineTo(DAREN.stairStart,.55);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.33,bevelEnabled:false,steps:1});geo.rotateY(-Math.PI/2);
  [-1,1].forEach(s=>{
    const wall=new THREE.Mesh(geo,mat.trim);wall.name='階梯簡化側牆';wall.position.x=s<0?-3.0:3.33;wall.castShadow=wall.receiveShadow=true;group.add(wall);
    box('平台側牆',s*3.15,3.47,4.13,.34,.75,1.25,mat.trim);
  });
  box('建築基腳',0,.13,0,26.2,.26,7.12,mat.canopy);

  const transform=new THREE.Object3D();
  for(const [material,pieces]of batches){
    const batch=new THREE.InstancedMesh(BOX,material,pieces.length);batch.name='大仁樓色塊：'+pieces[0].name;batch.castShadow=batch.receiveShadow=true;
    pieces.forEach((p,i)=>{transform.position.set(p.x,p.y,p.z);transform.scale.set(p.w,p.h,p.d);transform.updateMatrix();batch.setMatrixAt(i,transform.matrix);});
    batch.instanceMatrix.needsUpdate=true;batch.userData.partCount=pieces.length;group.add(batch);
  }
  group.userData.parts=boxCount;group.userData.drawables=group.children.length;
  return group;
}
