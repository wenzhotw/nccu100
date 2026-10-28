// 參考充氣活動門重畫：連續圓柱、淺弧橫樑、台灣藍鵲與穿山甲。
// 純模型，不修改活動生命週期或入口；靜態色塊合批，描邊不投影。
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ARCH } from './festival-arch-logic.js';
export const BANNER_TEXT = '蓋亞造界虛擬包種茶節';
export const MODEL_BUDGET = Object.freeze({ triangles: 12000, meshes: 12, shadowCasters: 4 });
// 貼背盾片：中央只微微隆起，尾端鈍尖，不用會形成尖刺的圓錐。
function shieldGeometry() {
  const rim=[[-.80,0,.65],[.80,0,.65],[1,0,0],[.52,0,-.70],[0,0,-1],[-.52,0,-.70],[-1,0,0]];
  const positions=[],uv=[];
  for(let i=0;i<rim.length;i++)for(const v of [[0,.35,0],rim[i],rim[(i+1)%rim.length]]){positions.push(...v);uv.push((v[0]+1)/2,(v[2]+1)/2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
const G = {
  ball: new THREE.SphereGeometry(1, 10, 6),
  cone: new THREE.ConeGeometry(1, 1, 10),
  leg: new THREE.CylinderGeometry(1, 1, 1, 8),
  ring: new THREE.TorusGeometry(1, .12, 6, 20).rotateX(Math.PI / 2),
  plate: shieldGeometry(),
};
const C = { blue:'#1f56d0', deep:'#173f9e', black:'#15161c', red:'#e0262a', white:'#fff9eb', cyan:'#20b8d3', yellow:'#f0c94a', pink:'#ed5688', brown:'#7d5530', tan:'#c79a6c' };

export function buildBalloonArch({ toon, OUT, canvasTex, placement }) {
  const group = new THREE.Group(); group.userData.noOcc = true;
  const owned = [], batches = new Map(), outlines = new Map();
  const parts = [];
  // 將各零件座標烘進幾何；每個物件僅一個彩色網格與一個描邊網格。
  function add(geo, color, x,y,z, sx,sy,sz, parent=group, rotation=[0,0,0], outline=.022) {
    const o = new THREE.Object3D(); o.position.set(x,y,z); o.scale.set(sx,sy,sz); o.rotation.set(...rotation); o.updateMatrix();
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(o.matrix);
    const col = new THREE.Color(color), a = new Float32Array(g.attributes.position.count*3);
    for(let i=0;i<a.length;i+=3) { a[i]=col.r;a[i+1]=col.g;a[i+2]=col.b; }
    g.setAttribute('color',new THREE.BufferAttribute(a,3));
    if(!batches.has(parent)) { batches.set(parent,[]); outlines.set(parent,[]); }
    batches.get(parent).push(g);
    if(outline) { const shell=g.clone(), p=shell.attributes.position,n=shell.attributes.normal;
      for(let i=0;i<p.count;i++) {p.setXYZ(i,p.getX(i)+n.getX(i)*outline,p.getY(i)+n.getY(i)*outline,p.getZ(i)+n.getZ(i)*outline);}
      outlines.get(parent).push(shell);
    }
    return g;
  }
  const R=.70, H=ARCH.PILLAR_TOP, half=placement.half;
  // 單一連續表面，三個顏色區段共享接縫位置，不是堆疊球體。
  const profile=[[0,.04],[.50,.04],[.65,.09],[R,.22],[R,1.40],[R,2.65],[R,H-.24],[.64,H-.10],[0,H-.10]].map(([r,y])=>new THREE.Vector2(r,y));
  const pillar=new THREE.LatheGeometry(profile,20).toNonIndexed();
  for(const side of [-1,1]) {
    const p = pillar.clone(), pos=p.attributes.position;
    // 依三角形所處帶狀區域指定整片顏色，維持清楚的平塗色塊。
    const colors=new Float32Array(pos.count*3);
    for(let i=0;i<pos.count;i+=3) {const y=(pos.getY(i)+pos.getY(i+1)+pos.getY(i+2))/3, c=new THREE.Color(y<1.4?C.blue:y<2.65?C.yellow:C.cyan);for(let j=0;j<3;j++)colors.set([c.r,c.g,c.b],(i+j)*3);}
    const base=add(p,C.blue,side*half,0,0,1,1,1,group,[0,0,0],.025);base.setAttribute('color',new THREE.BufferAttribute(colors,3));p.dispose();
    add(G.ring,C.pink,side*half,H-.13,0,.70,.70,.70);
    add(G.ball,C.pink,side*half,H-.10,0,.66,.10,.66,group,[0,0,0],0);
    parts.push({kind:'pillar',side,yMin:.04,yMax:H,radius:R});
    // 海浪沿圓柱表面包覆，不是漂浮裝飾球。兩排白色扇形浪紋。
    const vp=[], vn=[], uv=[];
    for(let row=0;row<2;row++)for(let j=0;j<8;j++)for(let k=0;k<8;k++) {
      const angle=j*Math.PI/4+row*Math.PI/8;
      const verts=[];
      for(const [t,thick] of [[k/8,0],[(k+1)/8,0],[(k+1)/8,.075],[k/8,.075]]) {
        const a=angle+(t-.5)*Math.PI/4, y=.18+row*.52+Math.sin(t*Math.PI)*.42+thick;
        verts.push([Math.sin(a)*(R+.008),y,Math.cos(a)*(R+.008)]);
      }
      for(const idx of [0,1,2,0,2,3]) {const v=verts[idx];vp.push(...v);vn.push(v[0]/(R+.008),0,v[2]/(R+.008));uv.push(0,0);}
    }
    const wave=new THREE.BufferGeometry();wave.setAttribute('position',new THREE.Float32BufferAttribute(vp,3));wave.setAttribute('normal',new THREE.Float32BufferAttribute(vn,3));wave.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    add(wave,C.white,side*half,0,0,1,1,1,group,[0,0,0],0);wave.dispose();
  }
  pillar.dispose();
  // 平緩寬拱：端點伸入柱身，與照片同樣是一根完整充氣橫樑。
  const beamY=x=>ARCH.SPRING_Y+ARCH.RISE*(1-(x/half)**2);
  const path=new THREE.CatmullRomCurve3(Array.from({length:25},(_,i)=>{const x=-half+2*half*i/24;return new THREE.Vector3(x,beamY(x),0);}));
  const beam=new THREE.TubeGeometry(path,32,ARCH.TUBE_R,10,false);
  add(beam,C.blue,0,0,0,1,1,1,group,[0,0,0],.028);beam.dispose();
  parts.push({kind:'beam',endpoints:[[-half,beamY(-half),0],[half,beamY(half),0]],radius:ARCH.TUBE_R});
  // 紅色布帶緊貼拱樑前後。字沿淺弧排，不放巨大懸空長方牌。
  const tex=canvasTex(1024,128,(g,w,h)=>{
    g.fillStyle='#d9282f';g.fillRect(0,0,w,h);
    g.fillStyle='#f0c94a';g.fillRect(0,0,w,5);g.fillRect(0,h-5,w,5);
    let fs=66;g.font=`900 ${fs}px "Noto Sans TC",sans-serif`;
    while(g.measureText(BANNER_TEXT).width>w-50&&fs>36){fs-=2;g.font=`900 ${fs}px "Noto Sans TC",sans-serif`;}
    g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff9eb';g.fillText(BANNER_TEXT,w/2,h/2);
  });
  const face=new THREE.MeshBasicMaterial({map:tex});owned.push(tex,face);
  for(const side of [1,-1]) {
    const pp=[],uu=[],ii=[],N=32,BW=half*1.74,BH=.82;
    for(let i=0;i<=N;i++){const x=(i/N-.5)*BW;for(const dy of [-BH/2,BH/2]){pp.push(x,beamY(x)+dy,0);uu.push(side>0?i/N:1-i/N,dy<0?0:1);}}
    for(let i=0;i<N;i++){const a=i*2;ii.push(...(side>0?[a,a+2,a+1,a+2,a+3,a+1]:[a,a+1,a+2,a+2,a+1,a+3]));}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uu,2));geo.setIndex(ii);geo.computeVertexNormals();owned.push(geo);
    const m=new THREE.Mesh(geo,face);m.name='bz26-arch-banner';m.position.z=side*(ARCH.TUBE_R+.018);m.userData.texture='banner';group.add(m);
  }
  const magpie=new THREE.Group();magpie.name='bz26-arch-magpie';magpie.position.set(-half,H,0);magpie.rotation.y=1.12;group.add(magpie);
  buildMagpie(add,magpie);
  const pangolin=new THREE.Group();pangolin.name='bz26-arch-pangolin';pangolin.position.set(half,H,0);pangolin.rotation.y=-1.12;group.add(pangolin);
  buildPangolin(add,pangolin);
  for(const [parent,list] of batches) {
    const geo=mergeBufferGeometries(list,false);list.forEach(g=>g.dispose());owned.push(geo);
    const mesh=new THREE.Mesh(geo,toon('#ffffff',{vertexColors:true}));mesh.name=parent===group?'bz26-arch-structure':parent.name+'-color';mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
    const shells=outlines.get(parent);if(shells.length){const g=mergeBufferGeometries(shells,false);shells.forEach(s=>s.dispose());owned.push(g);const out=new THREE.Mesh(g,OUT);out.name='bz26-arch-outline';parent.add(out);}
  }
  group.userData.parts=parts;
  return {group,magpie,pangolin,bannerText:BANNER_TEXT,texture:tex,dispose(){for(const r of owned)r.dispose();owned.length=0;}};
}

function buildMagpie(add,b) {
  // 抬頭的大黑頭、紅嘴紅腳與外展長尾，輪廓優先於羽毛細節。
  add(G.ball,C.blue,0,.85,0,.48,.61,.57,b,[.15,0,0]);
  add(G.ball,C.black,0,1.38,.33,.36,.42,.36,b);
  add(G.ball,C.black,0,1.70,.46,.34,.34,.35,b);
  add(G.cone,C.red,0,1.65,.95,.15,.56,.14,b,[Math.PI/2,0,0],.014);
  for(const s of [-1,1]) {
    add(G.ball,C.yellow,s*.28,1.77,.61,.085,.09,.07,b,[0,0,0],0);
    add(G.ball,C.black,s*.325,1.77,.64,.045,.054,.042,b,[0,0,0],0);
    add(G.ball,C.deep,s*.40,.85,-.05,.15,.43,.52,b,[.30,0,s*.1]);
    add(G.ball,C.white,s*.42,.60,-.38,.11,.12,.13,b,[0,0,0],0);
    add(G.leg,C.red,s*.19,.24,.08,.05,.43,.05,b,[0,0,0],.01);
    add(G.ball,C.red,s*.19,.06,.21,.09,.06,.23,b,[0,0,0],.01);
  }
  for(const [x,len] of [[-.16,1.9],[0,2.55],[.16,2.15]]) {
    // 合批前直接將尾羽旋轉／平移套在幾何上，避免額外 draw call。
    const rot=[-.28,0,x*.35], cy=.63-Math.sin(.28)*len/2, cz=-.36-Math.cos(.28)*len/2;
    add(G.ball,C.blue,x,cy,cz,.13,.075,len/2+.08,b,rot,.012);
    add(G.ball,C.black,x,cy-Math.sin(.28)*(len/2-.30),cz-Math.cos(.28)*(len/2-.30),.132,.078,.19,b,rot,0);
    add(G.ball,C.white,x,cy-Math.sin(.28)*(len/2-.12),cz-Math.cos(.28)*(len/2-.12),.13,.078,.16,b,rot,0);
  }
  b.scale.setScalar(1.25);
}

function buildPangolin(add,p) {
  add(G.ball,C.brown,0,.62,0,.52,.46,.83,p);
  add(G.ball,C.tan,0,.49,.80,.25,.24,.32,p,[.15,0,0]);
  add(G.cone,C.tan,0,.40,1.18,.19,.58,.17,p,[Math.PI/2+.18,0,0]);
  add(G.ball,C.black,0,.345,1.47,.055,.052,.055,p,[0,0,0],0);
  for(const s of [-1,1]) {
    add(G.ball,C.black,s*.205,.58,.94,.047,.052,.046,p,[0,0,0],0);
    for(const z of [-.40,.40]) {add(G.ball,C.brown,s*.35,.24,z,.17,.25,.19,p);add(G.ball,C.tan,s*.35,.07,z+.09,.17,.07,.19,p,[0,0,0],.012);}
  }
  // 大片重疊屋瓦鱗，五列五片，以少量大形狀保留辨識。
  for(let row=0;row<6;row++)for(let j=0;j<5;j++) {
    const z=.60-row*.23, t=z/.86, k=Math.sqrt(1-t*t), a=(j-2)*.57+(row%2?.10:0);
    add(G.plate,(row+j)%2?'#a87a48':'#9a6a3c',Math.sin(a)*.52*k,.62+Math.cos(a)*.46*k,z,.29,.10,.33,p,[-.18,0,-a],.009);
  }
  // 一體錐形長尾，朝外下垂，不再是一串分離球。
  const points=[new THREE.Vector3(0,.59,-.65),new THREE.Vector3(0,.42,-1.15),new THREE.Vector3(0,.10,-1.75),new THREE.Vector3(0,-.15,-2.18)];
  const tail=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,1,8,false);
  const pos=tail.attributes.position, nor=tail.attributes.normal, curve=new THREE.CatmullRomCurve3(points);
  for(let i=0;i<=12;i++){const center=curve.getPointAt(i/12),r=.29*(1-i/12)+.018;for(let j=0;j<=8;j++){const n=i*9+j;pos.setXYZ(n,center.x+nor.getX(n)*r,center.y+nor.getY(n)*r,center.z+nor.getZ(n)*r);}}
  tail.computeVertexNormals();add(tail,C.brown,0,0,0,1,1,1,p,[0,0,0],.02);tail.dispose();
  for(let i=0;i<6;i++){const t=i/7,q=curve.getPointAt(t),r=.29*(1-t)+.018;add(G.plate,i%2?'#a87a48':'#9a6a3c',q.x,q.y+r*.82,q.z,r,.07,.27,p,[-.35,0,0],.006);}
  p.scale.setScalar(1.35);
}
export function countTriangles(root){let n=0;root.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});return n;}
