/** Public-facing room construction. Floor plans locate fronts; heights/finishes remain visual estimates. */
import * as THREE from 'three';
import {MAIN_FLOORS,publicFloor,SOURCE_ZONES,floorSurfacePolygons,floorContains,CORE_STAIR_FLIGHTS,stairOpening,rectPolygon} from './public-floor-layout.js';
import {PUBLIC_ROOM_FRONTS} from './public-room-fronts.js';
import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
import {SOURCE_H_STAIRS,G_STAIR_ROUTE} from './source-stair-layout.js';
import {cloneDahMaterial} from './materials.js';
const BOX=new THREE.BoxGeometry(1,1,1);
export function buildPublicRooms(root,mat){
 const box=(kind,x,y,z,w,h,d,name)=>{const mesh=new THREE.Mesh(BOX,mat(kind));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.name=name;mesh.userData.cameraOccluder=kind!=='clear';root.add(mesh);return mesh;};
 const buildFront=(w,put)=>{const height=w.floor==='3F'?3.3:2.95;
  // Door apertures are cut out of the wall, with closed timber leaves and a
  // transom/header. They are not decals pasted over an uninterrupted slab.
  let from=w.lo;
  const cuts=[...w.doors.map(center=>({lo:center-(w.doorWidth||1)/2,hi:center+(w.doorWidth||1)/2,door:true})),...(w.openPassages||[]),{lo:w.hi,hi:w.hi}].sort((a,b)=>a.lo-b.lo);
  for(const cut of cuts){
   const lo=Math.max(w.lo,cut.lo),hi=Math.min(w.hi,cut.hi),center=(lo+hi)/2,width=hi-lo;
   if(lo>from)put('wall',(from+lo)/2,height/2,lo-from,height,.12,'來源房間隔牆');
   if(width>0){
    put('wall',center,(2.25+height)/2,width,height-2.25,.12,'房間門上橫牆');
   }
   if(cut.door&&width>0){
    const leaves=width>1.2?2:1,leafWidth=width/leaves;
    for(let i=0;i<leaves;i++){
     const u=lo+leafWidth*(i+.5);
     put('white',u,1.1,leafWidth-.06,2.2,.065,'關閉房間門');
     put('metal',u+(leaves===2?(i===0?1:-1):1)*Math.min(.32,leafWidth/2-.15),1,.045,.16,.055,'房間門把',w.face*.08);
    }
    for(const side of [-1,1])put('metal',center+side*(width/2-.01),1.125,.045,2.25,.14,'房間門框');
    put('metal',center,2.24,width+.02,.045,.14,'房間門框');
   }
   from=hi;
  }
 };
 for(const w of PUBLIC_ROOM_FRONTS){
  const level=MAIN_FLOORS.find(f=>f.id===w.floor),alongX=w.axis==='x';
  const put=(kind,u,y,length,h,depth,name,offset=0)=>{const mesh=box(kind,alongX?u:w.fixed+offset,level.y+y,alongX?w.fixed+offset:u,alongX?length:depth,h,alongX?depth:length,name);Object.assign(mesh.userData,{roomFrontFloor:w.floor,roomFrontKind:'axis'});return mesh;};
  buildFront(w,put);
 }
 // Official commons1: white writing surface and a dark screen on the WC's
 // east-facing wall. Plan fixes the wall; board/screen dimensions are estimates.
 const commonsY=MAIN_FLOORS.find(f=>f.id==='3F').y;
 box('white',-15.026,commonsY+1.6,-18.8,.04,1.2,6.4,'共享區書寫白板');
 box('metal',-15.0,commonsY+.99,-18.8,.09,.045,6.42,'共享區白板筆槽');
 box('ink',-15.0,commonsY+1.65,-18.8,.06,.63,1.05,'共享區壁掛螢幕');
 for(const [id,rear]of Object.entries(SOURCE_REAR_LAYOUT))if(rear.diagonal){
  const d=rear.diagonal,a=d.gameA,b=d.gameB,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,nx=uz,nz=-ux,y=MAIN_FLOORS.find(f=>f.id===id).y,angle=-Math.atan2(dz,dx);
  const put=(kind,u,yy,width,h,depth,name,offset=0)=>{const m=box(kind,a[0]+ux*u+nx*offset,y+yy,a[1]+uz*u+nz*offset,width,h,depth,name);m.rotation.y=angle;Object.assign(m.userData,{roomFrontFloor:id,roomFrontKind:'diagonal'});return m;};
  buildFront({floor:id,lo:0,hi:len,face:1,doors:d.gameDoorCenters.map(p=>(p[0]-a[0])*ux+(p[1]-a[1])*uz)},put);
  const poly=publicFloor(id).closedRooms[0];
  for(let j=1;j<poly.length;j++){
   const p=poly[j],q=poly[(j+1)%poly.length],dx=q[0]-p[0],dz=q[1]-p[1];
   const m=box('wall',(p[0]+q[0])/2,y+1.475,(p[1]+q[1])/2,Math.hypot(dx,dz),2.95,.12,'討論室背牆');m.rotation.y=-Math.atan2(dz,dx);
  }
 }

 for(const [id,rear]of Object.entries(SOURCE_REAR_LAYOUT)){
  const y=MAIN_FLOORS.find(f=>f.id===id).y,w=rear.windows;
  const lines=[...rear.outerEdges,{id:'south_reading',points:[[w.lo,w.fixed],[w.hi,w.fixed]]}];
  for(const {id:edgeId,points} of lines)for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);
   const put=(kind,t,yy,width,h,depth,name)=>{const mesh=box(kind,a[0]+dx*t,y+yy,a[1]+dz*t,width,h,depth,name);mesh.rotation.y=angle;mesh.userData.publicWindowFloor=id;return mesh;};
   if(id==='3F'&&edgeId==='commons_north_sawtooth'&&i%2===1){
    put('wall',.5,1.65,len,3.3,.16,'共享區蜂巢實牆');
    // The photographs establish white/gold hexagonal relief and narrow glass
    // returns. The gold motif and tile dimensions are visual approximations.
    const hex=new THREE.CylinderGeometry(.184,.184,.018,6).rotateX(Math.PI/2),tiles=[[],[]];
    for(let row=0;row<11;row++)for(let u=.22+(row%2)*.165;u<len-.17;u+=.33){
     const gold=(u/len<.36&&row>2&&row<8)||(u/len>.72&&row>7);
     tiles[gold?1:0].push([a[0]+dx*u/len-dz/len*.095,y+.24+row*.285,a[1]+dz*u/len+dx/len*.095]);
    }
    for(let k=0;k<2;k++){
     const material=mat('white').clone();material.color.set(k?'#d5ad49':'#dddcd1');
     const mesh=new THREE.InstancedMesh(hex,material,tiles[k].length),pose=new THREE.Object3D();mesh.name='共享區白金蜂巢片';
     tiles[k].forEach((p,n)=>{pose.position.set(...p);pose.rotation.y=angle;pose.updateMatrix();mesh.setMatrixAt(n,pose.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;root.add(mesh);
    }
    continue;
   }
   put('wall',.5,.25,len,.5,.16,'閱覽外窗矮牆');
   put('clear',.5,1.625,len,2.25,.055,'閱覽完整外窗');
   put('wall',.5,2.86,len,.18,.18,'閱覽外窗上樑');
   if(id==='3F')put('wall',.5,3.125,len,.35,.16,'共享區外窗上封板');
   const bays=Math.max(1,Math.ceil(len/3.5));
   for(let j=0;j<=bays;j++)put('white',j/bays,1.7,.14,2.4,.14,'閱覽外窗直框');
   // Official 4F AV photo establishes substantial opaque window piers;
   // exact bay registration/width remains an estimate, scoped to this façade.
   if(id==='4F'&&edgeId==='east_open_AV_exterior')for(let j=1;j<bays;j++)put('wall',j/bays,1.7,.72,2.55,.24,'影音區外窗實心壁柱');
   for(const yy of [.52,2.74])put('white',.5,yy,len,.055,.11,'閱覽外窗橫框');
  }
  // Rear commons/media/maker areas have exposed low ceilings in the official
  // 3F/4F photographs. Heights and beam spacing remain game estimates.
  // Restrict the ceiling to actual rear public polygons, never the atrium void.
  const floor=publicFloor(id),rearFloor={...floor,regions:[...rear.regions,...floor.rearShellConnections,SOURCE_ZONES[id].south_public_reading].filter(Boolean)};
  const polygons=floorSurfacePolygons(rearFloor),shapes=polygons.map(p=>new THREE.Shape(p.map(([x,z])=>new THREE.Vector2(x,-z))));
  // The ceiling below8F follows8F's actual stair opening, not the narrower
  //7F tread trace. Keep the7F lounge floor itself intact beneath that opening.
  const aboveOpening=id==='5F'?[G_STAIR_ROUTE.upperOpening,...CORE_STAIR_FLIGHTS.filter(s=>s.coreStair==='G').map(stairOpening),rectPolygon(G_STAIR_ROUTE.turn.x0,G_STAIR_ROUTE.turn.x1,G_STAIR_ROUTE.turn.z0,G_STAIR_ROUTE.turn.z1)]:id==='7F'?[SOURCE_H_STAIRS['8F'].enclosure]:id==='3F'?SOURCE_REAR_LAYOUT['4F'].exclusions.filter(e=>e.kind==='closedStairCore').map(e=>e.points):id==='4F'?SOURCE_REAR_LAYOUT['5F'].exclusions.filter(e=>e.kind==='closedStairCore').map(e=>e.points):[];
  const ceilingShapes=aboveOpening.length?floorSurfacePolygons({...rearFloor,holes:[...rearFloor.holes,...aboveOpening]}).map(p=>new THREE.Shape(p.map(([x,z])=>new THREE.Vector2(x,-z)))):shapes;
  // Closed thin slabs must cast from the light-facing surface. Back-face
  // shadow rendering places the shadow inside their thickness and stripes
  // the underside; keep receiving/casting shadows rather than disabling them.
  const ceilingMaterial=cloneDahMaterial(mat('concrete'));ceilingMaterial.shadowSide=THREE.FrontSide;
  const ceiling=new THREE.Mesh(new THREE.ExtrudeGeometry(ceilingShapes,{depth:.12,bevelEnabled:false}),ceilingMaterial);
  const ceilingHeight=id==='3F'?3.3:2.95;
  ceiling.geometry.rotateX(-Math.PI/2);ceiling.position.y=y+ceilingHeight;ceiling.name='公開後區裸露天花';ceiling.userData.cameraOccluder=true;ceiling.userData.rearCeilingFloor=id;root.add(ceiling);
  // Official commons1/2 photos show pale resilient flooring, while the
  // official 4F AV photographs show gray carpet. 5/7F finishes remain estimates.
  const finish=mat(id==='4F'?'carpet':'floor').clone();finish.color.set(id==='3F'?'#d5ccb0':id==='4F'?'#888d88':'#c2beb2');
  const carpet=new THREE.Mesh(new THREE.ShapeGeometry(shapes),finish);carpet.rotation.x=-Math.PI/2;carpet.position.y=y+.006;
  carpet.name=id==='3F'?'公開共享區淺米色地坪':id==='4F'?'公開後區灰色地毯':'公開後區中性地坪（估色）';carpet.userData.rearFloorFinish=id;root.add(carpet);
  const supported=(x,z,w,d)=>[-1,1].every(sx=>[-1,1].every(sz=>floorContains(rearFloor,x+sx*w/2,z+sz*d/2)));
  if(id==='3F'){
   // Commons1/2 show upright felt baffles, with linear fixtures beneath them.
   // Spacing/depth are photo estimates. Use the ceiling's cut polygons so no
   // panel closes the E stair opening or extends over the central atrium.
   const panelFloor={...rearFloor,holes:[...rearFloor.holes,...aboveOpening]};
   const felt=mat('concrete').clone();felt.color.set('#c8c4ad');
   for(let x=-37.5;x<19;x+=.48)for(let z=-21;z<19;z+=3.4){
    if(![-1,1].every(sx=>[-1,1].every(sz=>floorContains(panelFloor,x+sx*.025,z+sz*1.5))))continue;
    box('concrete',x,y+3.055,z,.05,.45,3,'共享區垂直吸音片').material=felt;
   }
  }
  for(let x=-38;x<19;x+=5.5)for(let z=-21;z<19;z+=5.5){
   if(!supported(x,z,2.8,.28))continue;
   box('concrete',x,y+ceilingHeight-.13,z,3.2,.25,.28,'公開後區裸露短樑');
   const lamp=box('light',x,y+2.62,z,2.1,.055,.10,'後區線形吊燈');lamp.userData.rearCeilingFloor=id;
   for(const dx of [-.85,.85])box('metal',x+dx,y+(2.65+ceilingHeight)/2,z,.018,ceilingHeight-2.65,.018,'線燈吊索');
   if(supported(x,z+1.3,3.8,.18))box('metal',x,y+ceilingHeight-.13,z+1.3,3.8,.16,.18,'公開後區外露管線');
  }
  for(const points of [...rear.wc.sideWalls,rear.wc.baffle]){
   const [a,b]=points,dx=b[0]-a[0],dz=b[1]-a[1];
   const wall=box('wall',(a[0]+b[0])/2,y+1.475,(a[1]+b[1])/2,Math.hypot(dx,dz),2.95,.12,'廁所前廊來源轉折牆');wall.rotation.y=-Math.atan2(dz,dx);
  }
 }
}
