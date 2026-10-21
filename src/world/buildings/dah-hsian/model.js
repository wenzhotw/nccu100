/** 達賢戶外模型。只依賴 Three.js 與本區配置，可在 Node 直接驗收地面幾何。 */
import * as THREE from 'three';
import { BOUNDS, POND, HOUSE, BRIDGE, DECK_Y, LIBRARY_OUTLINE, TERRACE_RAILS, HOUSE_RAILS, OUTDOOR_STEPS, TREE_PLAZA, PLAZA_WALL, BENCHES, LAMPS, groundHeight, insidePolygon } from './layout.js';

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
  const zs=[-30,-20,0,28,36,48,50,62,70,76,80,90,104,210],vertices=[];
  const xs=[x0,-59,-40,-30,-26,0,26,30,40,62,x1];
  const v=(x,z)=>[x,z>=TREE_PLAZA.z&&Math.hypot(x-TREE_PLAZA.x,z-TREE_PLAZA.z)<TREE_PLAZA.radius?TREE_PLAZA.base-.03:groundHeight(x,z),z];
  for(let k=0;k<xs.length-1;k++)for(let x=xs[k];x<xs[k+1];x+=2){
    const right=Math.min(x+2,xs[k+1]);
    for(let j=0;j<zs.length-1;j++){
      const fine=x>=26&&x<=62&&zs[j]>=48&&zs[j]<80;
      const dz=fine?.4:zs[j+1]-zs[j];
      for(let z=zs[j];z<zs[j+1]-.0001;z+=dz){
        const end=Math.min(z+dz,zs[j+1]);
        // x=30是低處與側坡的分界，各區用自己的端點標高，不跨過斷面補一張斜草坪。
        const xx=x===30?30.00001:x,rr=right===30?29.99999:right;
        const edge=end===28&&right<=30?27.99999:end;
        const a=v(xx,z),b=v(xx,edge),c=v(rr,edge),d=v(rr,z);
        if(fine&&[a,b,c,d].some(q=>q[1]===TREE_PLAZA.base-.03)){
          for(const q of [a,b,c,d])q[1]=Math.min(q[1],TREE_PLAZA.base-.03);
        }
        vertices.push(...a,...b,...c,...a,...c,...d);
      }
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
  group.add(new THREE.Mesh(g,material));return group;
}

const BOX = new THREE.BoxGeometry(1,1,1);
const LEAF = new THREE.IcosahedronGeometry(1,1);
const ROCK = new THREE.IcosahedronGeometry(1,0);
export const TREE_POSITIONS=[[-40,74],[-37,48],[-42,13],[-41,-14],[-44,-43],[-43,-71],[-26,-96],[22,-98],[38,-89],[42,-66],[47,-39],[46,-14],[43,18],[42,57],[-33,101],[43,99],[TREE_PLAZA.x,TREE_PLAZA.z]];
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
  b.add('glass',x,y,z,w,h,.08,face);
  const c=Math.cos(face),s=Math.sin(face),nx=Math.sin(face)*.11,nz=Math.cos(face)*.11;
  for(let offset=-w/2;offset<=w/2+.01;offset+=1.55)
    b.add('frame',x+c*offset+nx,y,z-s*offset+nz,.085,h+.06,.1,face);
  for(const dy of [-h/2,h*.16,h/2])b.add('frame',x+nx,y+dy,z+nz,w,.085,.1,face);
}

function library(parent,materialFor) {
  const g=new THREE.Group();g.name='達賢本館';parent.add(g);const b=batch(g,materialFor);
  // 二樓外部平台與一樓分開。主體玻璃退到 x=10，保留完整長門廊。
  solid(g,materialFor,'glassDark',-8.25,1.8,1.75,36.5,3.6,52.5,'一樓退縮量體');
  solid(g,materialFor,'glassDark',-8.25,5.75,1.75,36.5,3.5,52.5,'二樓退縮量體');
  solid(g,materialFor,'glassDark',-1.1,11,-.2,50.8,6.9,56.4,'下段懸挑量體');
  solid(g,materialFor,'glassDark',-1.1,15.75,-.2,50.8,2.1,56.4,'中央窗帶');
  solid(g,materialFor,'glassDark',-1.1,20.55,-.2,50.8,7.1,56.4,'上段量體');
  // 平台依實際輪廓轉角，不再用一張傾斜草坪代替。
  const deckGeometry=new THREE.ExtrudeGeometry(shapeOf(LIBRARY_OUTLINE),{depth:.36,bevelEnabled:false});
  const deck=new THREE.Mesh(deckGeometry,materialFor('paving'));deck.rotation.x=-Math.PI/2;
  deck.position.y=DECK_Y-.36;deck.name='二樓戶外平台';g.add(deck);
  for(const [y,w]of [[7.45,57],[14.55,57],[17,51.8],[24.2,51.8]])
    solid(g,materialFor,'edge',-1.1,y,-.2,w,.34,57.2,'水平混凝土框');
  // 清水模正面兩段斜板，板間保留深窗縫及一道水平施工縫。
  for(const [y,h,count]of [[10.98,6.7,12],[20.57,6.9,12]]){
    b.add('concrete',-22.1,y,28.25,8.9,h,.75);
    for(let i=0;i<count;i++){
      const x=-15.7+i*3.48,angle=-.38;
      b.add('concrete',x,y,28.7,3.15,h,.38,angle);
      b.add('seam',x-.07,y,28.91,3.1,.035,.02,angle);
      // 後方玻璃與細白框形成斜板間的窄亮縫。
      b.add('frame',x-1.62,y,28.12,.085,h,.11);
    }
    b.add('concrete',26.4,y,28.25,1.2,h,.75);
  }
  ribbonWindows(b,-8.25,5.75,28.08,36.5,3.48);
  ribbonWindows(b,-1.1,15.75,28.08,50.8,2.05);
  // 深門廊：玻璃沿左側，右側樑柱、長椅與外欄杆。
  ribbonWindows(b,10.08,5.75,-4.5,40,3.48,Math.PI/2);
  solid(g,materialFor,'concrete',10,5.75,13.3,.8,3.5,6.8,'入口館名牆');
  for(const z of [21,9,-3]) {
    solid(g,materialFor,'concrete',23.7,5.65,z,.8,3.3,.8,'門廊外柱');
    b.add('concrete',17,7.14,z,14.2,.42,.38);
  }
  for(let z=-9;z<27;z+=2.45)b.add('concrete',17,7.14,z,14.2,.24,.22);
  for(const z of [24,16,8,0,-8]){
    b.add('louver',21.1,4.44,z,.66,.15,3.7);
    for(const dz of [-1.35,1.35])b.add('edge',21.1,4.2,z+dz,.62,.4,.32);
  }
  // 下層三側玻璃；背側玻璃退到 z=-24.5，讓空橋接點外面留出走道。
  for(const y of [1.8,5.75]){
    ribbonWindows(b,-8.25,y,-24.57,36.5,3.45,Math.PI);
    ribbonWindows(b,-26.56,y,1.75,52.5,3.45,-Math.PI/2);
  }
  // 橘褐色直立外框內是橫向百葉；只放在池側及側立面的後半段。
  function louvers(x,z,width,angle,y,h){
    const cs=Math.cos(angle),sn=Math.sin(angle);
    ribbonWindows(b,x,y,z,width,h,angle);
    const count=Math.floor(width/3.4),span=width/count;
    for(let i=0;i<=count;i++){
      const u=-width/2+i*span;
      b.add('louverEdge',x+u*cs,y,z-u*sn,.18,h+.2,1.08,angle);
    }
    for(let i=0;i<count;i++)for(let v=-h/2+.15;v<h/2;v+=.28){
      const u=-width/2+(i+.5)*span;
      b.add('louver',x+u*cs,y+v,z-u*sn,span-.2,.075,.62,angle);
    }
  }
  for(const [y,h]of [[11,6.6],[20.55,6.8]]){
    louvers(-1.1,-28.6,50.5,Math.PI,y,h);
    louvers(-26.85,-13.8,27.3,-Math.PI/2,y,h);
    louvers(24.65,-13.8,27.3,Math.PI/2,y,h);
    for(const side of [-1,1]){
      // 朝前草坡的側面為不透明清水模及小窗，不把百葉鋪滿四面。
      const x=side<0?-26.7:24.5;
      b.add('concrete',x,y,14.1,.5,h,27.8);
      for(let z=3.3;z<27;z+=4.6)for(const dy of [-h*.25,h*.25]){
        b.add('glassDark',x+side*.27,y+dy,z,.03,1.08,1.55);
        b.add('frame',x+side*.30,y+dy-.56,z,.06,.06,1.66);
      }
    }
  }
  ribbonWindows(b,-26.88,15.75,-.2,55.4,2.05,-Math.PI/2);
  ribbonWindows(b,24.68,15.75,-.2,55.4,2.05,Math.PI/2);
  ribbonWindows(b,-1.1,15.75,-28.6,50.5,2.05,Math.PI);
  // 露台外欄杆沿 OSM 轉折，前草坡開口不設橫擋。
  for(const [a,c]of TERRACE_RAILS)
    railSegment(b,a,c,4);
  for(const step of OUTDOOR_STEPS)b.add('concrete',step.x,step.y-.1,step.z,step.w,.2,step.d);
  for(const x of [-32.4,-29.8,-29.3,-26.7]){
    const ascending=x>-29.5;
    for(let i=0;i<10;i++){
      const z=ascending?-32.75+i*.55:-27.8-i*.55,y=ascending?2+(i+1)*.2:(i+1)*.2;
      b.add('rail',x,y+.49,z,.045,.96,.045);
      b.add('rail',x,y+.98,z,.065,.065,.64);
    }
  }
  for(const x of [-25.9,-14,-2])solid(g,materialFor,'edge',x,1.82,-24.5,.45,3.64,.5,'池側落地柱');
  // 屋頂鋸齒採光與外周綠化。從地面只見收邊，空拍用來核對方向。
  b.add('grassDark',-1.1,24.44,-.2,50.4,.13,55.8);
  for(let x=-17;x<=15;x+=4){
    const panel=new THREE.Mesh(BOX,materialFor('glassLight'));panel.position.set(x,24.96,-.5);
    panel.scale.set(3.72,.11,40);panel.rotation.z=.21;panel.name='鋸齒採光罩';g.add(panel);
    b.add('frame',x-1.8,24.58,-.5,.08,.25,40);b.add('frame',x+1.8,25.33,-.5,.08,.35,40);
  }
  for(let z=-22;z<=20;z+=4)b.add('edge',-22.5,24.86,z,3.2,.65,2.3);
  b.add('concrete',19,24.9,-17,5.1,1,9);
  b.finish();return g;
}

function railSegment(b,a,c,base){
  const dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz),angle=Math.atan2(-dz,dx);
  b.add('rail',(a[0]+c[0])/2,base+.94,(a[1]+c[1])/2,len,.07,.07,angle);
  b.add('edge',(a[0]+c[0])/2,base+.07,(a[1]+c[1])/2,len,.14,.18,angle);
  for(let t=0;t<=len;t+=.34)b.add('rail',a[0]+dx*t/len,base+.48,a[1]+dz*t/len,.035,.9,.035);
}

function readingHouse(parent,materialFor) {
  const g=new THREE.Group();g.name='湖濱悅讀小屋';g.position.set(HOUSE.x,0,HOUSE.z);g.rotation.y=HOUSE.angle;parent.add(g);
  const b=batch(g,materialFor),w=HOUSE.width,d=HOUSE.depth;
  // 二樓入口退縮，端面一半清水模、一半玻璃；大端框保留環景中的深度。
  solid(g,materialFor,'glassDark',1.05,2.08,0,w-2.1,3.35,d-.3,'小屋一樓玻璃');
  solid(g,materialFor,'glassDark',1.05,5.62,0,w-2.1,3.25,d-.3,'小屋二樓退縮玻璃');
  solid(g,materialFor,'edge',0,3.82,0,w+1.8,.36,d+1.8,'小屋二樓露台');
  solid(g,materialFor,'edge',0,.23,0,w+1.8,.34,d+1.8,'小屋底板與水上挑檐');
  solid(g,materialFor,'edge',0,7.44,0,w+2.1,.34,d+2.1,'小屋屋頂');
  b.add('grassDark',0,7.65,0,w+1.2,.08,d+1.2);
  for(const side of [-1,1]){
    for(const y of [2.08,5.62])ribbonWindows(b,1.05,y,side*(d/2-.09),w-2.1,3.2,side>0?0:Math.PI);

    for(const y of [2.08,5.62])ribbonWindows(b,w/2+.04,y,0,d-.3,3.2,Math.PI/2);
    solid(g,materialFor,'concrete',-w/2,3.85,side*(d/2-.12),.6,7.1,.55,'小屋入口端框柱');
  }
  solid(g,materialFor,'concrete',-w/2,7.2,0,.6,.55,d+.45,'小屋入口端框樑');
  solid(g,materialFor,'concrete',-10.25,5.62,-4.1,.35,3.25,7.4,'小屋二樓入口實牆');
  ribbonWindows(b,-10.32,5.62,3.55,7.1,3.2,-Math.PI/2);
  ribbonWindows(b,-10.32,2.08,0,d-.3,3.2,-Math.PI/2);
  // 一樓入口前的下層露台與橋面上下分開；橋口不再被橫欄杆封住。
  for(const [a,c]of HOUSE_RAILS)railSegment(b,a,c,4);
  for(const side of [-1,1])railSegment(b,[-13,side*8.75],[13,side*8.75],.4);
  for(const x of [-9,0,9])for(const z of [-5.8,5.8])
    solid(g,materialFor,'concrete',x,-.18,z,.5,.8,.65,'小屋水上支柱');
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
  // 長短石板錯落留草縫，四角分別取地面高度，不讓厚方塊浮在坡上。
  const stones=[];
  for(let row=0;row<31;row++)for(let col=0;col<5;col++){
    const z=36+row*1.74,x=15+col*2.35+(row%2)*.45;
    const w=col===1&&row%3===0?3.1:1.85+(row+col)%3*.16;
    const d=.86+(row%3)*.13;
    const v=(xx,zz)=>[xx,groundHeight(xx,zz)+.012,zz];
    const a=v(x-w/2,z-d/2),c=v(x+w/2,z-d/2),e=v(x+w/2,z+d/2),f=v(x-w/2,z+d/2);
    stones.push(...a,...f,...e,...a,...e,...c);
  }
  const stoneGeo=new THREE.BufferGeometry();stoneGeo.setAttribute('position',new THREE.Float32BufferAttribute(stones,3));stoneGeo.computeVertexNormals();
  const stoneMesh=new THREE.Mesh(stoneGeo,materialFor('paving'));stoneMesh.name='貼坡石板';g.add(stoneMesh);
  pathStrip(g,materialFor,[[21,36],[23,24],[33,24],[35,8],[35,-24],[24,-34],[0,-35],[-31,-36],[-36,-50],[-35,-80],[-22,-96],[7,-99],[28,-85],[27,-57],[26,-35],[35,-24]],2.6);
  // 門廊與前廣場的石板，同樣貼合高度。
  pathStrip(g,materialFor,[[-25,32],[16,32],[23,24]],3.6);
  // 兩端共用同一組接點；一般厚板 Mesh 也接入現有鏡頭遮擋。
  const a=BRIDGE.start,c=BRIDGE.end,dx=c.x-a.x,dz=c.z-a.z;
  const bridge=new THREE.Group();bridge.name='達賢空橋';bridge.position.set((a.x+c.x)/2,0,(a.z+c.z)/2);
  bridge.rotation.y=Math.atan2(dx,dz);g.add(bridge);
  const length=Math.hypot(dx,dz)+.2;
  solid(bridge,materialFor,'edge',0,DECK_Y-.18,0,BRIDGE.width,.36,length,'空橋樓板');
  const rails=batch(bridge,materialFor);
  for(const x of [-BRIDGE.width/2+.1,BRIDGE.width/2-.1]){
    rails.add('rail',x,4.96,0,.07,.07,length);
    rails.add('edge',x,4.08,0,.14,.16,length);
    for(let z=-length/2;z<=length/2;z+=.32)rails.add('rail',x,4.5,z,.04,.9,.04);
  }
  rails.finish();
  // 老樹廣場：弧形踏面、立面、中央低處樹穴。與腳下查詢共用每階尺寸。
  const plaza=TREE_PLAZA,steps=[];
  const treeWell=new THREE.Mesh(new THREE.CircleGeometry(plaza.inner,48),materialFor('grassDark'));
  treeWell.rotation.x=-Math.PI/2;treeWell.position.set(plaza.x,plaza.base,plaza.z);treeWell.name='老樹樹穴';g.add(treeWell);
  const p=(r,a,y)=>[plaza.x+Math.cos(a)*r,y,plaza.z+Math.sin(a)*r];
  for(let i=0;i<13;i++){
    const ri=plaza.inner+i*plaza.tread,ro=Math.min(plaza.radius,ri+plaza.tread),y=plaza.base+i*plaza.rise;
    for(let k=0;k<64;k++){
      const a=k/64*Math.PI,c=(k+1)/64*Math.PI;
      const aa=p(ri,a,y),bb=p(ro,a,y),cc=p(ro,c,y),dd=p(ri,c,y);
      steps.push(...aa,...dd,...cc,...aa,...cc,...bb);
      if(i>0){const loA=p(ri,a,y-plaza.rise),loC=p(ri,c,y-plaza.rise);steps.push(...loA,...dd,...aa,...loA,...loC,...dd);}
    }
  }
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.Float32BufferAttribute(steps,3));pg.computeVertexNormals();
  const pm=new THREE.Mesh(pg,materialFor('stone'));pm.name='老樹廣場弧形階梯';g.add(pm);
  const wall=PLAZA_WALL;
  solid(g,materialFor,'concrete',wall.x,(wall.top+wall.bottom)/2,wall.z,wall.w,wall.top-wall.bottom,wall.d,'老樹廣場擋土牆');
  for(const a of [.15,Math.PI*.5,Math.PI-.15])for(let i=0;i<13;i++){
    const r=plaza.inner+(i+.5)*plaza.tread,y=plaza.base+i*plaza.rise;
    b.add('rail',plaza.x+Math.cos(a)*r,y+.48,plaza.z+Math.sin(a)*r,.045,.96,.045);
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
  for(const [x,z,angle]of BENCHES){
    const y=groundHeight(x,z);b.add('concrete',x,y+0.43,z,2.5,0.25,0.72,angle);
    for(const dx of [-0.88,0.88])b.add('seam',x+dx*Math.cos(angle),y+0.15,z-dx*Math.sin(angle),0.25,0.35,0.5,angle);
  }
  for(const [x,z]of LAMPS){
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
    if(x>15&&x<37&&z<-35&&z>-65)continue;
    b.add('hedge',x,groundHeight(x,z)+.25,z,1,.4,.8,i,LEAF);
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
