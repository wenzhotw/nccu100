/** 依 2026-10-20 的 9033、9034、9028 照片建立坡道東側步道與草坡。 */
import * as THREE from 'three';
import { LAYOUT, RAMPS, STAIRS } from './layout.js';
import { heightAt, projectToPath, rampHeight, rampLandscape } from './terrain.js';

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
  for(const side of [-1,1]) {
    for(let s=0;s<length;s+=0.4) {
      const end=Math.min(s+0.4,length),mid=(s+end)/2,x=a[0]+ux*mid-uz*side*1.45,z=a[1]+uz*mid+ux*side*1.45;
      add('九舍磁磚側牆','stair-wall',x,z,end-s+0.01,0.7,0.3,th,heightAt(a[0]+ux*mid,a[1]+uz*mid),'#c7c7b6');
    }
    const x=b[0]+ux*0.6-uz*side*2,z=b[1]+uz*0.6+ux*side*2;
    add('九舍入口花台','planter',x,z,2,0.6,1.2,th,15,'#c7c7b6');
    add('入口三角錐','cone',b[0]+ux*0.9-uz*side*0.85,b[1]+uz*0.9+ux*side*0.85,0.36,0.55,0.36,0,15,'#ed9849','cone');
  }
  const east=STAIRS.find(s=>s.id==='haohanpo-east'),end=east.path.at(-1),prev=east.path.at(-2);
  const len=Math.hypot(end[0]-prev[0],end[1]-prev[1]),ex=(end[0]-prev[0])/len,ez=(end[1]-prev[1])/len;
  for(const side of [-1,1]) for(let s=0.5;s<3.5;s+=0.5) {
    const x=end[0]-ex*s-ez*side*1.45,z=end[1]-ez*s+ex*side*1.45;
    add('東支線矮牆','east-stair-wall',x,z,0.51,0.7,0.3,-Math.atan2(ez,ex),heightAt(end[0]-ex*s,end[1]-ez*s),'#c9c5ba');
  }
  return parts;
}

/** 欄杆分段落在步道外緣，樓梯全寬加角色半徑保留缺口。 */
export function rampRails(offset=4.2) {
  const ramp = RAMPS[0], result = [];
  for (let i=1;i<ramp.path.length;i++) {
    const a=ramp.path[i-1], b=ramp.path[i], length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const ux=(b[0]-a[0])/length, uz=(b[1]-a[1])/length;
    const at=s=>[a[0]+ux*s-uz*offset,a[1]+uz*s+ux*offset];
    for(let s=0;s<length;s+=0.5) {
      const start=at(s),end=at(Math.min(s+0.5,length)),mid=start.map((v,k)=>(v+end[k])/2);
      if(STAIRS.some(stair=>projectToPath(...mid,stair.path).distance <= (stair.width/2+1.8)**2)) continue;
      result.push({a:start,b:end});
    }
  }
  return result;
}

export function rampDetailColliders() {
  const rails = [...rampRails().map(p=>({...p,kind:'sidewalk-rail'})),
    ...rampRails(7.2).map(p=>({...p,kind:'slope-fence'}))].map(({a,b,kind})=>{
    const th=-Math.atan2(b[1]-a[1],b[0]-a[0]);
    return {kind,obb:true,cx:(a[0]+b[0])/2,cz:(a[1]+b[1])/2,
      hx:Math.hypot(b[0]-a[0],b[1]-a[1])/2,hz:0.04,th,cs:Math.cos(th),sn:Math.sin(th)};
  });
  return [...rails,...rampProps().map(p=>({kind:p.kind,obb:true,cx:p.x,cz:p.z,hx:p.w/2,hz:p.d/2,th:p.th,cs:Math.cos(p.th),sn:Math.sin(p.th)}))];
}

export function addRampDetails(group, rects, {addMerged,TOP,BOX,grass,edgeMaterial}) {
  for(const [kind,name,material] of [['sidewalk','東側人行道',brick],['grass-slope','東側草坡',grass]]) {
    const pieces=rects.filter(r=>r.kind===kind).map(r=>{
      const g=TOP.clone().scale(r.x1-r.x0,1,r.z1-r.z0).translate((r.x0+r.x1)/2,0,(r.z0+r.z1)/2);
      const p=g.attributes.position;
      for(let i=0;i<p.count;i++) p.setY(i,(rampLandscape(p.getX(i),p.getZ(i))?.h ?? heightAt(p.getX(i),p.getZ(i)))+0.02);
      g.computeVertexNormals();return g;
    });
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
  const stepParts=rects.filter(r=>r.kind==='jiu-stairs').map(r=>BOX.clone()
    .scale(r.x1-r.x0,0.3,r.z1-r.z0).translate((r.x0+r.x1)/2,r.h-0.15,(r.z0+r.z1)/2));
  const steps=addMerged(group,'九舍磚砌踏面',stepParts,brick);steps.userData.surface=true;
  const jiu=STAIRS.find(s=>s.id==='jiu-plaza'),a=jiu.path[0],b=jiu.path[1];
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length;
  const stepEdges=[];
  for(let i=1;i<=10;i++) stepEdges.push(BOX.clone().scale(2.4,0.01,0.02)
    .rotateY(Math.atan2(ux,uz)).translate(a[0]+ux*i*0.8,12+i*0.3+0.005,a[1]+uz*i*0.8));
  addMerged(group,'九舍踏階描邊',stepEdges,edgeMaterial);
  const fence=[],lines=[],drains=[];
  for(let i=1;i<RAMPS[0].path.length;i++) {
    const a=RAMPS[0].path[i-1],b=RAMPS[0].path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const ux=(b[0]-a[0])/len,uz=(b[1]-a[1])/len,th=-Math.atan2(uz,ux);
    for(let s=0;s<len;s+=0.5) {
      const mid=Math.min(s+0.25,len),x=a[0]+ux*mid,z=a[1]+uz*mid;
      lines.push(TOP.clone().scale(Math.min(0.5,len-s),1,0.08).rotateY(th).translate(x-uz*2.85,heightAt(x,z)+0.024,z+ux*2.85));
      drains.push(TOP.clone().scale(Math.min(0.5,len-s),1,0.18).rotateY(th).translate(x+uz*2.85,heightAt(x,z)+0.025,z-ux*2.85));
      // 草坡頂的透空圍籬沿第三層平台，不跨進九舍樓梯。
    }
  }
  for(const {a,b} of rampRails(7.2)) {
    const fx=(a[0]+b[0])/2,fz=(a[1]+b[1])/2,th=-Math.atan2(b[1]-a[1],b[0]-a[0]);
    fence.push(BOX.clone().scale(0.04,0.9,0.04).translate(a[0],15.45,a[1]));
    for(const h of [0.35,0.9]) fence.push(BOX.clone().scale(Math.hypot(b[0]-a[0],b[1]-a[1]),0.04,0.04).rotateY(th).translate(fx,15+h,fz));
  }
  addMerged(group,'坡頂圍籬',fence,silver);
  for(const g of [...lines,...drains]) {
    const p=g.attributes.position;
    for(let i=0;i<p.count;i++) p.setY(i,rampHeight(RAMPS[0],projectToPath(p.getX(i),p.getZ(i),RAMPS[0].path).s)+0.025);
    g.computeVertexNormals();
  }
  addMerged(group,'紅色禁停線',lines,red);
  addMerged(group,'西側排水溝',drains,drain);
  const props=[];
  const colored=(geometry,color)=>{
    const tint=new THREE.Color(color),colors=[];
    for(let i=0;i<geometry.attributes.position.count;i++) colors.push(tint.r,tint.g,tint.b);
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));props.push(geometry);
  };
  for(const p of rampProps()) {
    const geometry=p.shape==='cone'?CONE.clone():p.shape==='jersey'?JERSEY.clone():BOX.clone().scale(p.w,p.h,p.d);
    geometry.rotateY(p.th).translate(p.x,p.base+p.h/2,p.z);
    colored(geometry,p.color);
    if(['stair-wall','planter'].includes(p.kind)) {
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
