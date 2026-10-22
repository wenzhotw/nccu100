/** 依 2026-10-20 的 9033、9034、9028 照片建立坡道東側步道與草坡。 */
import * as THREE from 'three';
import { LAYOUT, RAMPS, STAIRS } from './layout.js';
import { CURB, heightAt, landscapeAt, pointInPoly, projectToPath, rampHeight, stairHeight } from './terrain.js';
import { PLAZA } from './layout.js';

const silver = new THREE.MeshToonMaterial({ color: '#b9c7c9' });
const brick = new THREE.MeshToonMaterial({ color: '#bd897a' });
const details = new THREE.MeshToonMaterial({ vertexColors: true });
const red = new THREE.MeshToonMaterial({ color: '#d36c61' });
const drain = new THREE.MeshToonMaterial({ color: '#5a646b' });
const CONE = new THREE.ConeGeometry(0.18, 0.55, 6);
const CONE_BAND = new THREE.CylinderGeometry(0.09,0.12,0.08,6);
const JERSEY = new THREE.BoxGeometry(0.6, 0.8, 1.2);
for (let i=0;i<JERSEY.attributes.position.count;i++) {
  if(JERSEY.attributes.position.getY(i)>0) JERSEY.attributes.position.setX(i,JERSEY.attributes.position.getX(i)*0.5);
}
JERSEY.computeVertexNormals();

/** 所有實體與碰撞共用此清單，避免畫面與阻擋位置不一致。 */
export function rampProps() {
  const parts=[], ramp=RAMPS[0],jiu=STAIRS.find(s=>s.id==='jiu-plaza');
  const add=(name,kind,x,z,w,h,d,th,base,color,shape='box')=>parts.push({name,kind,x,z,w,h,d,th,base,color,shape});
  // 照片 9027：坡頂以東到九舍 D 區西端的平路，西側護欄照坡道段的間距延續一段。
  const road=LAYOUT.roads.find(r=>r.osm===510811176);
  const top=road.pts.findIndex(([x,z])=>x===ramp.path.at(-1)[0]&&z===ramp.path.at(-1)[1]);
  const path=[...ramp.path,road.pts[top+1]];
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length;
    for(let s=i===ramp.path.length?2:1;s<length;s+=2) {
      if(i===1 && s<2) continue;
      const x=a[0]+ux*s+uz*2.7,z=a[1]+uz*s-ux*2.7;
      // 好漢坡支線接入道路處保留整個入口。
      if(STAIRS.some(stair=>projectToPath(x,z,stair.path).distance<(stair.width/2+1.1)**2)) continue;
      add('紐澤西護欄','jersey',x,z,0.6,0.8,1.2,Math.atan2(ux,uz),heightAt(a[0]+ux*s,a[1]+uz*s),'#c9c5ba','jersey');
    }
  }
  const [a,b]=jiu.path,length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length,th=-Math.atan2(uz,ux);
  // 照片 9034：側牆是沿踏階斜度的整面磁磚牆，一段梯段加一段頂端平台，不逐格疊方塊。
  const flight=Math.round((jiu.to-stairHeight(jiu,0))/0.3)*0.8;
  const sloped=(name,kind,x,z,w,th,top0,top1,base,color)=>parts.push({name,kind,x,z,w,h:Math.max(top0,top1)-base,d:0.3,th,base,top0,top1,color,shape:'sloped'});
  for(const side of [-1,1]) {
    for(const [s0,s1] of [[0,flight],[flight,length]]) {
      const mid=(s0+s1)/2,x=a[0]+ux*mid-uz*side*1.45,z=a[1]+uz*mid+ux*side*1.45;
      sloped('九舍磁磚側牆','stair-wall',x,z,s1-s0,th,stairHeight(jiu,s0)+0.7,stairHeight(jiu,s1-1e-6)+0.7,12,'#c7c7b6');
    }
    const x=b[0]+ux*0.6-uz*side*2,z=b[1]+uz*0.6+ux*side*2;
    add('九舍入口花台','planter',x,z,2,0.6,1.2,th,15,'#c7c7b6');
    add('入口三角錐','cone',b[0]+ux*0.9-uz*side*0.85,b[1]+uz*0.9+ux*side*0.85,0.36,0.55,0.36,0,15,'#ed9849','cone');
  }
  const east=STAIRS.find(s=>s.id==='haohanpo-east'),end=east.path.at(-1),prev=east.path.at(-2);
  const len=Math.hypot(end[0]-prev[0],end[1]-prev[1]),ex=(end[0]-prev[0])/len,ez=(end[1]-prev[1])/len;
  // 照片 9030：東支線上端兩側是一整段混凝土矮牆，頂面順著踏階下降。
  for(const side of [-1,1]) {
    const x=end[0]-ex*2-ez*side*1.45,z=end[1]-ez*2+ex*side*1.45;
    const low=heightAt(end[0]-ex*3.5,end[1]-ez*3.5),high=heightAt(end[0]-ex*0.5,end[1]-ez*0.5);
    sloped('東支線矮牆','east-stair-wall',x,z,3,-Math.atan2(ez,ex),low+0.7,high+0.7,low-0.3,'#c9c5ba');
  }
  return parts;
}

/** 點是否落在某座樓梯的實際踏面範圍（沿線在樓梯兩端之間、離中線不超過半寬加 margin）。 */
function onStair(x,z,margin=0) {
  return STAIRS.some(st=>st.path.slice(1).some((b,i)=>{
    const a=st.path[i],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),along=((x-a[0])*dx+(z-a[1])*dz)/l;
    return along>=-0.05&&along<=l+0.05&&Math.abs((x-a[0])*-dz+(z-a[1])*dx)/l<=st.width/2+margin;
  }));
}

/** 坡道東側離中線 o 公尺的偏移線，轉角取斜接點（角平分線方向），兩段偏移線在轉角正好相接。 */
export function eastOffset(o) {
  const P=RAMPS[0].path,n=P.slice(1).map((b,i)=>{const dx=b[0]-P[i][0],dz=b[1]-P[i][1],l=Math.hypot(dx,dz);return [-dz/l,dx/l];});
  return P.map((p,i)=>{
    if(i===0)return [p[0]+n[0][0]*o,p[1]+n[0][1]*o];
    if(i===P.length-1)return [p[0]+n.at(-1)[0]*o,p[1]+n.at(-1)[1]*o];
    const a=n[i-1],b=n[i],k=1+a[0]*b[0]+a[1]*b[1];
    return [p[0]+(a[0]+b[0])/k*o,p[1]+(a[1]+b[1])/k*o];
  });
}

/** 欄杆分段落在步道外緣，樓梯全寬加角色半徑保留缺口。 */
/** 坡頂圍籬離坡道中線的距離：照片 9032 圍籬立在草坡頂（接近第三層高度）、樓梯東側。 */
export const SLOPE_FENCE = 10;

export function rampRails(offset=4.2) {
  // 沿斜接偏移線取段：轉角內側兩段欄杆正好相接，不交疊成兩排。
  const line = eastOffset(offset), result = [];
  for (let i=1;i<line.length;i++) {
    const a=line[i-1], b=line[i], n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.5));
    const at=f=>[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
    for(let j=0;j<n;j++) {
      const start=at(j/n),end=at((j+1)/n),mid=start.map((v,k)=>(v+end[k])/2);
      // 坡頂圍籬可貼著樓梯側牆外立，路邊欄杆則在樓梯口前留出 1.8 公尺讓人走。
      if(STAIRS.some(stair=>projectToPath(...mid,stair.path).distance <= (stair.width/2+(offset>4.5?0.6:1.8))**2)) continue;
      // 坡頂接上紅磚廣場後改為平地，欄杆與圍籬到此為止。
      if(mid[0]>=PLAZA.x0-0.5&&mid[0]<=PLAZA.x1&&mid[1]>=PLAZA.z0&&mid[1]<=PLAZA.z1+0.5) continue;
      // 照片 9032：坡頂圍籬只沿草坡頂（地面接近第三層）圍，不跑到鋪面或半坡上。
      if(offset>4.5&&(heightAt(...mid)<14.5||['plaza','sidewalk'].includes(landscapeAt(...mid)?.kind))) continue;
      result.push({a:start,b:end});
    }
  }
  // 被樓梯與廣場切剩的零碎短段不留，避免路邊立著孤立的一小截欄杆。
  const runs=[];
  for(const r of result) {
    const last=runs.at(-1);
    if(last&&Math.hypot(last.at(-1).b[0]-r.a[0],last.at(-1).b[1]-r.a[1])<1e-6) last.push(r); else runs.push([r]);
  }
  return runs.filter(run=>run.reduce((sum,r)=>sum+Math.hypot(r.b[0]-r.a[0],r.b[1]-r.a[1]),0)>=1.5).flat();
}

export function rampDetailColliders() {
  const rails = [...rampRails().map(p=>({...p,kind:'sidewalk-rail'})),
    ...rampRails(SLOPE_FENCE).map(p=>({...p,kind:'slope-fence'}))].map(({a,b,kind})=>{
    const th=-Math.atan2(b[1]-a[1],b[0]-a[0]);
    return {kind,obb:true,cx:(a[0]+b[0])/2,cz:(a[1]+b[1])/2,
      hx:Math.hypot(b[0]-a[0],b[1]-a[1])/2,hz:0.04,th,cs:Math.cos(th),sn:Math.sin(th)};
  });
  return [...rails,...rampProps().map(p=>({kind:p.kind,obb:true,cx:p.x,cz:p.z,hx:p.w/2,hz:p.d/2,th:p.th,cs:Math.cos(p.th),sn:Math.sin(p.th)}))];
}

export function addRampDetails(group, rects, {addMerged,TOP,BOX,grass,edgeMaterial}) {
  // 坡道東側（人行道、草坡、九舍樓梯旁草坡）共用一套沿坡道的格網：每條偏移線在轉角取斜接（角平分線），
  // 兩段在轉角內側不重疊也不留縫；樓梯、建築與不屬於地景的格子挖掉，其餘高度一律取 heightAt。
  const quad=(q,pieces)=>{
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute([...q[0],...q[2],...q[1],...q[0],...q[3],...q[2]],3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(12),2));
    g.computeVertexNormals();pieces.push(g);
  };
  // 草坡格角若落在樓梯踏面範圍內，壓到該處踏面下 0.1 公尺，草不會從踏階冒出來。
  const lift=([x,z])=>[x,heightAt(x,z)+(onStair(x,z)?-0.1:0.02),z];
  // 人行道面固定是路面加路緣石，不被旁邊樓梯草坡抬高。
  const walkLift=([x,z])=>[x,rampHeight(RAMPS[0],projectToPath(x,z,RAMPS[0].path).s)+CURB+0.02,z];
  for(const [name,offsets,kinds,material] of [
    ['東側人行道',[2.95,3.367,3.783,4.2],['sidewalk'],brick],
    ['東側草坡',Array.from({length:17},(_,k)=>4.2+k*0.5),['grass-slope','bank'],grass]]) {
    const pieces=[],lines=offsets.map(eastOffset);
    for(let i=1;i<RAMPS[0].path.length;i++) {
      const len=Math.hypot(RAMPS[0].path[i][0]-RAMPS[0].path[i-1][0],RAMPS[0].path[i][1]-RAMPS[0].path[i-1][1]),n=Math.ceil(len/0.5);
      const at=(c,f)=>{const a=lines[c][i-1],b=lines[c][i];return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];};
      for(let j=0;j<n;j++) for(let c=0;c<offsets.length-1;c++) {
        const q=[at(c,j/n),at(c,(j+1)/n),at(c+1,(j+1)/n),at(c+1,j/n)];
        const m=[q.reduce((s,p)=>s+p[0],0)/4,q.reduce((s,p)=>s+p[1],0)/4];
        // 整格都在樓梯踏面底下才挖掉；跨在樓梯邊的格子保留，邊緣藏在樓梯側牆下，不留縫。
        if(q.every(p=>onStair(...p)))continue;
        if(LAYOUT.buildings.some(b=>pointInPoly(...m,b.pts)))continue;
        // 紅磚廣場範圍由廣場鋪面負責，草坡不蓋上去。
        if(name!=='東側人行道'&&m[0]>=PLAZA.x0&&m[0]<=PLAZA.x1&&m[1]>=PLAZA.z0&&m[1]<=PLAZA.z1)continue;
        // 草坡格只要有一角屬於地景就畫，與平台邊界重疊而不留縫；人行道只畫自己那一帶。
        const inside=name==='東側人行道'?kinds.includes(landscapeAt(...m)?.kind):[m,...q].some(p=>kinds.includes(landscapeAt(...p)?.kind));
        if(!inside)continue;
        quad(q.map(name==='東側人行道'?walkLift:lift),pieces);
      }
    }
    const mesh=addMerged(group,name,pieces,material);
    if(mesh) { mesh.userData.surface=true;mesh.userData.surfaceOffset=0.02; }
  }
  const rails=[],edges=[];
  function box(x,y,z,w,h,d,th=0) {
    rails.push(BOX.clone().scale(w,h,d).rotateY(th).translate(x,y,z));
    edges.push(BOX.clone().scale(w+0.03,h+0.03,d+0.03).rotateY(th).translate(x,y,z));
  }
  for(const {a,b} of rampRails()) {
    const th=-Math.atan2(b[1]-a[1],b[0]-a[0]),length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const base=(heightAt(...a)+heightAt(...b))/2;
    for(const y of [0.5,1]) box((a[0]+b[0])/2,base+y,(a[1]+b[1])/2,length,0.04,0.04,th);
    box(a[0],heightAt(...a)+0.5,a[1],0.05,1,0.05);
  }
  addMerged(group,'不鏽鋼欄杆',rails,silver);
  // 九舍樓梯每一階是一整塊沿樓梯方向的磚砌踏板（下緣埋到 12 公尺），頂端平台也是一整塊，邊緣不再是方格鋸齒。
  const jiu=STAIRS.find(s=>s.id==='jiu-plaza'),a=jiu.path[0],b=jiu.path[1];
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length,yaw=Math.atan2(ux,uz);
  const flight=Math.round((jiu.to-stairHeight(jiu,0))/0.3)*0.8;
  const spans=[...Array.from({length:Math.round(flight/0.8)},(_,k)=>[k*0.8,(k+1)*0.8]),[flight,length]];
  const stepParts=spans.map(([s0,s1])=>{const h=stairHeight(jiu,(s0+s1)/2),m=(s0+s1)/2;
    return BOX.clone().scale(jiu.width,h-12,s1-s0).rotateY(yaw).translate(a[0]+ux*m,(h+12)/2,a[1]+uz*m);});
  const steps=addMerged(group,'九舍磚砌踏面',stepParts,brick);steps.userData.surface=true;
  const stepEdges=spans.slice(1).map(([s0])=>BOX.clone().scale(jiu.width,0.01,0.02)
    .rotateY(yaw).translate(a[0]+ux*s0,stairHeight(jiu,s0)+0.005,a[1]+uz*s0));
  // 踏階前緣描邊與欄杆、設施描邊共用同一份網格。
  edges.push(...stepEdges);
  // 路緣石：人行道靠路面那一側的立面，從路面拉到人行道高度。
  const curbLine=eastOffset(2.95),curb=[];
  for(let i=1;i<curbLine.length;i++) {
    const a0=curbLine[i-1],b0=curbLine[i],n=Math.ceil(Math.hypot(b0[0]-a0[0],b0[1]-a0[1])/0.5);
    for(let j=0;j<n;j++) {
      const p0=[a0[0]+(b0[0]-a0[0])*j/n,a0[1]+(b0[1]-a0[1])*j/n],p1=[a0[0]+(b0[0]-a0[0])*(j+1)/n,a0[1]+(b0[1]-a0[1])*(j+1)/n];
      if(STAIRS.some(st=>projectToPath((p0[0]+p1[0])/2,(p0[1]+p1[1])/2,st.path).distance<=(st.width/2)**2))continue;
      const road=p=>rampHeight(RAMPS[0],projectToPath(...p,RAMPS[0].path).s)+0.01;
      quad([[p0[0],road(p0),p0[1]],[p1[0],road(p1),p1[1]],[p1[0],road(p1)+CURB+0.01,p1[1]],[p0[0],road(p0)+CURB+0.01,p0[1]]],curb);
    }
  }
  const curbMarker=new THREE.Group();curbMarker.name='人行道路緣石';group.add(curbMarker);
  // 紅色禁停線（路緣石內側）與西側排水溝沿同一套斜接偏移線鋪，轉角兩段正好相接，不會交叉成 X 凸到路面。
  const fence=[],lines=[],drains=[];
  const strip=(o,w,pieces)=>{
    const inner=eastOffset(o-w/2),outer=eastOffset(o+w/2);
    // 轉角內側的斜接點離兩段一樣近，高度用存進網格後的座標（單精度）計算，才和地面查詢落在同一段。
    const road=([x,z])=>{x=Math.fround(x);z=Math.fround(z);return [x,rampHeight(RAMPS[0],projectToPath(x,z,RAMPS[0].path).s)+0.025,z];};
    for(let i=1;i<inner.length;i++) {
      const n=Math.max(1,Math.ceil(Math.hypot(inner[i][0]-inner[i-1][0],inner[i][1]-inner[i-1][1])/0.5));
      const at=(l,f)=>[l[i-1][0]+(l[i][0]-l[i-1][0])*f,l[i-1][1]+(l[i][1]-l[i-1][1])*f];
      for(let j=0;j<n;j++) quad([at(inner,j/n),at(inner,(j+1)/n),at(outer,(j+1)/n),at(outer,j/n)].map(road),pieces);
    }
  };
  strip(2.85,0.08,lines);
  strip(-2.85,0.18,drains);
  for(const {a,b} of rampRails(SLOPE_FENCE)) {
    const fx=(a[0]+b[0])/2,fz=(a[1]+b[1])/2,th=-Math.atan2(b[1]-a[1],b[0]-a[0]);
    fence.push(BOX.clone().scale(0.04,0.9,0.04).translate(a[0],15.45,a[1]));
    for(const h of [0.35,0.9]) fence.push(BOX.clone().scale(Math.hypot(b[0]-a[0],b[1]-a[1]),0.04,0.04).rotateY(th).translate(fx,15+h,fz));
  }
  addMerged(group,'坡頂圍籬',fence,silver);
  addMerged(group,'紅色禁停線',lines,red);
  addMerged(group,'西側排水溝',drains,drain);
  const props=[];
  const colored=(geometry,color)=>{
    const tint=new THREE.Color(color),colors=[];
    for(let i=0;i<geometry.attributes.position.count;i++) colors.push(tint.r,tint.g,tint.b);
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));props.push(geometry);
  };
  curb.forEach(g=>colored(g,'#cfcabd'));
  for(const p of rampProps()) {
    const geometry=p.shape==='cone'?CONE.clone():p.shape==='jersey'?JERSEY.clone():BOX.clone().scale(p.w,p.h,p.d);
    if(p.shape==='sloped') {
      // 頂面沿長邊由 top0 線性升到 top1，底面埋在 base。
      const v=geometry.attributes.position;
      for(let i=0;i<v.count;i++) v.setY(i,v.getY(i)>0?p.top0+(v.getX(i)/p.w+0.5)*(p.top1-p.top0)-p.base-p.h/2:-p.h/2);
      geometry.computeVertexNormals();
    }
    geometry.rotateY(p.th).translate(p.x,p.base+p.h/2,p.z);
    colored(geometry,p.color);
    if(p.kind==='planter') {
      colored(BOX.clone().scale(p.w,0.015,p.d+0.006).rotateY(p.th).translate(p.x,p.base+0.3,p.z),'#eee8d5');
      colored(BOX.clone().scale(0.015,p.h,p.d+0.006).rotateY(p.th).translate(p.x,p.base+p.h/2,p.z),'#eee8d5');
    }
    if(p.kind==='planter') {
      // 廣場邊的花台保留核可尺寸，斜坡側另補同 footprint 的接地基座。
      const cs=Math.cos(p.th),sn=Math.sin(p.th);
      const ground=Math.min(...[[-p.w/2,-p.d/2],[p.w/2,-p.d/2],[p.w/2,p.d/2],[-p.w/2,p.d/2],[0,0]]
        .map(([x,z])=>heightAt(p.x+x*cs+z*sn,p.z-x*sn+z*cs)));
      if(ground<p.base) colored(BOX.clone().scale(p.w,p.base-ground,p.d).rotateY(p.th)
        .translate(p.x,(ground+p.base)/2,p.z),'#c7c7b6');
      colored(BOX.clone().scale(1.8,0.04,1).rotateY(p.th).translate(p.x,p.base+0.61,p.z),'#715b46');
      colored(BOX.clone().scale(1.6,0.22,0.8).rotateY(p.th).translate(p.x,p.base+0.72,p.z),'#6f9854');
    }
    if(p.kind==='cone') colored(CONE_BAND.clone().translate(p.x,p.base+0.25,p.z),'#fff3d9');
    const edge=geometry.clone();edge.deleteAttribute('color');
    edge.translate(-p.x,-p.base-p.h/2,-p.z).scale(1.025,1.025,1.025).translate(p.x,p.base+p.h/2,p.z);edges.push(edge);
    const marker=new THREE.Group();marker.name=p.name;marker.position.set(p.x,p.base,p.z);group.add(marker);
  }
  addMerged(group,'坡道與樓梯設施',props,details);
  for(const g of fence) {
    const edge=g.clone(),p=edge.attributes.position,n=edge.attributes.normal;
    for(let i=0;i<p.count;i++) p.setXYZ(i,p.getX(i)+n.getX(i)*0.015,p.getY(i)+n.getY(i)*0.015,p.getZ(i)+n.getZ(i)*0.015);
    edges.push(edge);
  }
  addMerged(group,'欄杆與設施描邊',edges,edgeMaterial);
}
