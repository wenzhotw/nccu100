import {FURNITURE,interiorColliders,SOUTHWEST_STEP} from './interior-layout.js';
import {rearFurniture} from './rear-furniture-layout.js';
import {roomFrontAtBoundary} from './public-room-fronts.js';
import {ATRIUM_FLOOR_LEVELS,ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS,CORE_STAIR_LANDINGS,ENTRY_STAIR_FLIGHTS,ENTRY_STAIR_HOLES,ENTRY_STAIR_LANDINGS,MAIN_FLOORS,publicFloor,floorContains,floorBoundarySegments} from './public-floor-layout.js';
/** 主樓層水平依柱網校準；中間退台及全部y仍為遊戲估算，不代表MF/6F完整平面。 */
export const ATRIUM_LEVELS=ATRIUM_FLOOR_LEVELS;
export const ATRIUM_STAIRS=ALL_PUBLIC_STAIRS;
const NAV_STAIRS=[...ATRIUM_STAIRS,...CORE_STAIR_FLIGHTS],NAV_LANDINGS=[...ENTRY_STAIR_LANDINGS,...CORE_STAIR_LANDINGS];
// 洞口沿目前D梯的共同座標開設；尺寸仍是遊戲估值，不代表實景測繪。
export const ENTRY_STAIR_OPENING={x0:-15.05,x1:-9.4,z0:13.25,z1:19.55};
export const ENTRY_STAIR_GUARDS=ENTRY_STAIR_HOLES[0].map((a,i)=>[a,ENTRY_STAIR_HOLES[0][(i+1)%ENTRY_STAIR_HOLES[0].length]]).filter(([a,b])=>!(a[0]===-9.4&&b[0]===-9.4));
export function outsideEntryStairOpening(rect){
 const h=ENTRY_STAIR_OPENING,x0=Math.max(rect.x0,h.x0),x1=Math.min(rect.x1,h.x1),z0=Math.max(rect.z0,h.z0),z1=Math.min(rect.z1,h.z1);
 if(x0>=x1||z0>=z1)return [rect];
 return [{...rect,x1:x0},{...rect,x0:x1},{...rect,x0,x1,z1:z0},{...rect,x0,x1,z0:z1}].filter(r=>r.x1-r.x0>1e-6&&r.z1-r.z0>1e-6);
}
// Descending uses the engine's gravity, so feet can temporarily lag the tread.
const supportedStair=(currentY,height)=>currentY-height>=-.65&&currentY-height<=1.55;
function onStair(s,x,z){
 const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,den=dx*dx+dz*dz,t=((x-s.a.x)*dx+(z-s.a.z)*dz)/den;
 const side=Math.abs((x-s.a.x)*dz-(z-s.a.z)*dx)/Math.sqrt(den);
 return t>=-.08&&t<=1.08&&side<s.width/2?Math.max(0,Math.min(1,t)):null;
}
export function atriumHeight(x,z,currentY=0){
 for(const r of NAV_LANDINGS)if(x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1&&supportedStair(currentY,r.y))return r.y;
 for(const s of NAV_STAIRS){const t=onStair(s,x,z);if(t!==null){const h=s.a.y+(s.b.y-s.a.y)*t;if(supportedStair(currentY,h))return h;}}
 for(const f of PUBLIC_NAV_FLOORS)if(currentY>=f.y-.65&&currentY<=f.y+1.55&&floorContains(f,x,z))return f.y;
 return 0;
}
/** Registered west-corner connection; intermediate terraces have no invented rear rooms. */
export function atriumRearExit(l){
 if(l.estimatedTerraceOnly||l.label==='8F')return null;
 const f=publicFloor(l.label);return{x:-13.8,z:Math.min(...f.regions[0].map(p=>p[1])),width:2.2};
}
// A single sequential push can put a landing player back inside another
// closely spaced chair. Resolve the whole local seating group before returning.
const groundObstacles=interiorColliders(),experienceObjects=FURNITURE.filter(o=>o.sourceArea==='2F11');
function circleOverlapsBox(x,z,c,y){
 if(c.top!==undefined&&y>=c.top)return false;
 if(c.c)return Math.hypot(x-c.x,z-c.z)<c.r+.405;
 if(c.obb){const dx=x-c.cx,dz=z-c.cz,u=dx*c.cs-dz*c.sn,v=dx*c.sn+dz*c.cs;return Math.hypot(Math.max(0,Math.abs(u)-c.hx),Math.max(0,Math.abs(v)-c.hz))<.405;}
 return Math.hypot(x-Math.max(c.x0,Math.min(x,c.x1)),z-Math.max(c.z0,Math.min(z,c.z1)))<.405;
}
function clearExperienceLanding(p){
 const nearby=experienceObjects.some(o=>p.y<o.h&&Math.hypot(p.x-o.x,p.z-o.z)<1.3);
 if(!nearby||!groundObstacles.some(c=>circleOverlapsBox(p.x,p.z,c,p.y)))return;
 const floor=publicFloor('2F');
 for(let radius=.05;radius<=3;radius+=.05)for(let i=0;i<72;i++){
  const angle=i*Math.PI/36,x=p.x+Math.cos(angle)*radius,z=p.z+Math.sin(angle)*radius;
  if(groundObstacles.some(c=>circleOverlapsBox(x,z,c,p.y)))continue;
  let supported=true;for(let n=0;n<16;n++){const a=n*Math.PI/8;if(!floorContains(floor,x+Math.cos(a)*.405,z+Math.sin(a)*.405)){supported=false;break;}}
  if(supported){p.x=x;p.z=z;return;}
 }
}
export function clampAtrium(p){
 const stairsBySide=NAV_STAIRS.map(stair=>{const dx=stair.b.x-stair.a.x,dz=stair.b.z-stair.a.z;return {stair,side:Math.abs((p.x-stair.a.x)*dz-(p.z-stair.a.z)*dx)/Math.hypot(dx,dz)};}).sort((a,b)=>a.side-b.side);
 for(const {stair} of stairsBySide){
  const dx=stair.b.x-stair.a.x,dz=stair.b.z-stair.a.z,len=Math.hypot(dx,dz);
  const t=((p.x-stair.a.x)*dx+(p.z-stair.a.z)*dz)/(len*len),side=((p.x-stair.a.x)*dz-(p.z-stair.a.z)*dx)/len;
  const margin=stair.approachMargin||.5,along=stair.coreStair?t>=-margin/len&&t<=1+margin/len:t>0&&t<1,clampedT=Math.max(0,Math.min(1,t));
  if(along&&Math.abs(side)<stair.width/2+.4&&supportedStair(p.y,stair.a.y+(stair.b.y-stair.a.y)*clampedT)){
   const safe=Math.max(-stair.width/2+.4,Math.min(stair.width/2-.4,side)),shift=safe-side;p.x+=shift*dz/len;p.z-=shift*dx/len;return;
  }
 }
 for(const r of CORE_STAIR_LANDINGS)if(Math.abs(p.y-r.y)<.4&&p.x>=r.x0-.4&&p.x<=r.x1+.4&&p.z>=r.z0-.4&&p.z<=r.z1+.4){
  // Flight approach/exit paths were handled above. All remaining sides of the
  // turn have physical rails, so keep the body inside their clear rectangle.
  p.x=Math.max(r.x0+.4,Math.min(r.x1-.4,p.x));p.z=Math.max(r.z0+.4,Math.min(r.z1-.4,p.z));return;
 }
 for(const r of NAV_LANDINGS)if(p.x>=r.x0+.4&&p.x<=r.x1-.4&&p.z>=r.z0+.4&&p.z<=r.z1-.4&&Math.abs(p.y-r.y)<.65)return;
 if(p.y<3.9){
  // Upper wings extend beyond the 2F envelope. Their shared room bounds must
  // not turn the ground-floor entrance into a walkable path across empty space.
  p.x=Math.max(-22.6,Math.min(19.8,p.x));p.z=Math.max(-22.5,Math.min(19.8,p.z));
  const stepX=SOUTHWEST_STEP.x+.5,stepZ=SOUTHWEST_STEP.z-.5;
  if(p.x<stepX&&p.z>stepZ){if(stepX-p.x<p.z-stepZ)p.x=stepX;else p.z=stepZ;}
  clearExperienceLanding(p);return;
 }
 for(const f of PUBLIC_NAV_FLOORS){
  if(p.y+1.8<=f.y-.32||p.y>=f.y+1.3)continue;
  const onTop=p.y>=f.y-.2;
  for(const e of f.boundaries){
   const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len2=dx*dx+dz*dz;
   const t=Math.max(0,Math.min(1,((p.x-e.a[0])*dx+(p.z-e.a[1])*dz)/len2));
   const x=e.a[0]+t*dx,z=e.a[1]+t*dz,d=Math.hypot(p.x-x,p.z-z);
   const clearance=e.clearance;
   if(d>=clearance)continue;
   const side=(p.x-x)*e.nx+(p.z-z)*e.nz;
   if(onTop){if(side<clearance){p.x=x+e.nx*clearance;p.z=z+e.nz*clearance;}}
   else if(side>-clearance){p.x=x-e.nx*clearance;p.z=z-e.nz*clearance;}
  }
 }
 const l=ATRIUM_LEVELS.reduce((a,b)=>Math.abs(a.y-p.y)<Math.abs(b.y-p.y)?a:b);
 if(Math.abs(l.y-p.y)<1.55)avoidFurniture(p,l);
}
/** 同一份桌島描述同時供建模與阻擋，桌間留視覺呼吸及可走通道。 */
export function atriumDesks(l){
 if(!l.books)return [];
 const f=publicFloor(l.label),out=[];
 const approaches=ATRIUM_STAIRS.filter(s=>!s.entry&&s.a.y===l.y).map(s=>{
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),x=s.a.x-dx/len*1.1,z=s.a.z-dz/len*1.1,pad=s.width/2+.4;
  return{x0:Math.min(x,s.a.x)-pad,x1:Math.max(x,s.a.x)+pad,z0:Math.min(z,s.a.z)-pad,z1:Math.max(z,s.a.z)+.3};
 });
 for(const side of ['east','north']){
  const lo=side==='east'?l.north:-13,hi=side==='east'?5:l.east-1;
  for(let u=lo+2.1;u<hi;u+=4.6){
   const d={side,u,width:1.8,depth:1.8,offset:1.1,chairDepths:[.65,1.55],x:side==='east'?l.east+1.1:u,z:side==='east'?u:l.north-1.1};
   const east=side==='east',w=east?d.depth:d.width,depth=east?d.width:d.depth;
   const bounds=[{x0:d.x-w/2,x1:d.x+w/2,z0:d.z-depth/2,z1:d.z+depth/2}];
   for(const delta of [-1.3,1.3])for(const v of d.chairDepths){const x=east?l.east+v:u+delta,z=east?u+delta:l.north-v;bounds.push({x0:x-.28,x1:x+.28,z0:z-.28,z1:z+.28});}
   const clear= bounds.every(r=>!approaches.some(a=>r.x0<a.x1&&r.x1>a.x0&&r.z0<a.z1&&r.z1>a.z0));
   if(clear&&bounds.every(r=>[[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]].every(([x,z])=>floorContains(f,x,z))))out.push(d);
  }
 }
 return out;
}
export function atriumFurniture(l){
 const out=[];
 for(const d of atriumDesks(l)){
  const east=d.side==='east',w=east?d.depth:d.width,depth=east?d.width:d.depth;
  out.push({x0:d.x-w/2,x1:d.x+w/2,z0:d.z-depth/2,z1:d.z+depth/2});
  for(const delta of [-1.3,1.3])for(const v of d.chairDepths){
   const cx=east?l.east+v:d.u+delta,cz=east?d.u+delta:l.north-v;
   out.push({x0:cx-.28,x1:cx+.28,z0:cz-.28,z1:cz+.28});
  }
 }
 return out;
}
export const ATRIUM_COLUMNS=[-15,-8,-1,6,13].map(x=>({x,z:13,w:.6,d:.6}));
export function atriumColumns(l){
 const f=publicFloor(l.label);
 return ATRIUM_COLUMNS.filter(c=>[-1,1].every(sx=>[-1,1].every(sz=>floorContains(f,c.x+sx*c.w/2,c.z+sz*c.d/2))));
}
function avoidFurniture(p,l){
 const bookWalls=l.books?[
  {x0:l.east+2.9,x1:l.east+3.65,z0:l.north+1.8,z1:l.south-1.2},
  {x0:-12.6,x1:l.east+3.25,z0:l.north-3.65,z1:l.north-2.9},
 ]:[];
 for(const r of [...atriumFurniture(l),...bookWalls,...atriumColumns(l).map(c=>({x0:c.x-c.w/2,x1:c.x+c.w/2,z0:c.z-c.d/2,z1:c.z+c.d/2}))]){
  const x0=r.x0-.4,x1=r.x1+.4,z0=r.z0-.4,z1=r.z1+.4;
  if(p.x>x0&&p.x<x1&&p.z>z0&&p.z<z1){
   const candidates=[{x:x0,z:p.z},{x:x1,z:p.z},{x:p.x,z:z0},{x:p.x,z:z1}];
   const valid=candidates.filter(q=>walkSafe(l,q.x,q.z));
   valid.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
   if(valid[0]){p.x=valid[0].x;p.z=valid[0].z;}
  }
 }
 for(const o of rearFurniture(l.label)){
  if(o.type==='round'){
   const dx=p.x-o.x,dz=p.z-o.z,d=Math.hypot(dx,dz),radius=o.w/2+.4;
   if(d>=radius)continue;
   const q=d>.0001?{x:o.x+dx/d*radius,z:o.z+dz/d*radius}:{x:o.x+radius,z:o.z};
   if(walkSafe(l,q.x,q.z)){p.x=q.x;p.z=q.z;}continue;
  }
  // The source's rotated chairs have a rectangular footprint. Their enclosing
  // axis-aligned boxes falsely join diagonal corners and seal otherwise open
  // aisles. Resolve against the actual orientation with a circular body.
  let rectangles;
  if(o.type==='chair'){
   // Match the rendered hollow chair, not a solid wardrobe up to head height.
   // The existing hero has narrower legs/torso than head (actors/player.js).
   // Keep conservative horizontal radii per vertical band; no furniture moves.
   const bands=[{lo:0,hi:.33,r:.19},{lo:.33,hi:.72,r:.28},{lo:.72,hi:.86,r:.29},{lo:.86,hi:1.32,r:.38}],angle=o.yaw||0,c=Math.cos(angle),s=Math.sin(angle);
   const part=(x,z,w,d,lo,hi)=>{
    const scale=o.verticalScale||1,overlapping=bands.filter(b=>p.y+b.lo<o.y+hi*scale&&p.y+b.hi>o.y+lo*scale);
    return overlapping.length?{cx:o.x+x*c+z*s,cz:o.z+z*c-x*s,hx:w/2,hz:d/2,angle,radius:Math.max(...overlapping.map(b=>b.r))}:null;
   };
   rectangles=[part(0,0,o.w,o.d,.41,.51),part(0,o.d/2-.035,o.w,.07,.56,1.02)];
   for(const sx of [-1,1])for(const sz of [-1,1])rectangles.push(part(sx*(o.w/2-.05),sz*(o.d/2-.05),.05,.05,0,.41));
   rectangles=rectangles.filter(Boolean);
  }else rectangles=['taskChair'].includes(o.type)?[{cx:o.x,cz:o.z,hx:o.w/2,hz:o.d/2,angle:o.yaw||0}]:o.bounds.map(r=>({cx:(r.x0+r.x1)/2,cz:(r.z0+r.z1)/2,hx:(r.x1-r.x0)/2,hz:(r.z1-r.z0)/2,angle:0}));
  for(const r of rectangles){
   const c=Math.cos(r.angle),s=Math.sin(r.angle),dx=p.x-r.cx,dz=p.z-r.cz,lx=dx*c-dz*s,lz=dx*s+dz*c,nx=Math.max(-r.hx,Math.min(lx,r.hx)),nz=Math.max(-r.hz,Math.min(lz,r.hz)),ex=lx-nx,ez=lz-nz,d=Math.hypot(ex,ez);
   const radius=r.radius||.4;if(d>=radius)continue;
   const candidates=d>.00001?[{x:nx+ex/d*radius,z:nz+ez/d*radius}]:[{x:r.hx+radius,z:lz},{x:-r.hx-radius,z:lz},{x:lx,z:r.hz+radius},{x:lx,z:-r.hz-radius}];
   const world=candidates.map(q=>({x:r.cx+q.x*c+q.z*s,z:r.cz+q.z*c-q.x*s})).filter(q=>walkSafe(l,q.x,q.z)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
   if(world[0]){p.x=world[0].x;p.z=world[0].z;}
  }
 }
}

function walkSafe(l,x,z){const f=publicFloor(l.label);for(let i=0;i<16;i++){const a=i/16*Math.PI*2;if(!floorContains(f,x+Math.cos(a)*.4,z+Math.sin(a)*.4))return false;}return true;}

export const PUBLIC_NAV_FLOORS=ATRIUM_LEVELS.map(f=>{
 const p=publicFloor(f.id);
 // A partition has thickness; the floor outline follows its centre line.
 // Cache the surface allowance once rather than tracing room fronts every frame.
 return {...p,boundaries:floorBoundarySegments(p).map(e=>({...e,clearance:roomFrontAtBoundary(f.id,e)?.49:.415}))};
});

export const canUseDahExit=y=>Number.isFinite(y)&&y<2;
