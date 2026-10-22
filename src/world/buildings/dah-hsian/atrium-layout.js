/** 層退區的高度與退縮依照片估算；夾層不是額外虛構的整層教室。 */
export const ATRIUM_LEVELS=['3F','3MF','4F','4MF','5F','6F','7F','8F'].map((label,index)=>({label,index,y:4.5+index*3.1,east:.15+index*1.5,north:-.2-index*1.35,south:16.2,books:index<7}));
export const ATRIUM_STAIRS=[
 {a:{x:-19,y:0,z:17.5},b:{x:-19,y:4.5,z:23.1},width:3.2,entry:true},
 ...ATRIUM_LEVELS.slice(0,-1).map((l,i)=>({a:{x:l.east+.85,y:l.y,z:9.4},b:{x:ATRIUM_LEVELS[i+1].east+.85,y:ATRIUM_LEVELS[i+1].y,z:15.6},width:1.5})),
];
// 洞口沿目前D梯的共同座標開設；尺寸仍是遊戲估值，不代表實景測繪。
export const ENTRY_STAIR_OPENING={x0:ATRIUM_STAIRS[0].a.x-ATRIUM_STAIRS[0].width/2-.2,x1:ATRIUM_STAIRS[0].a.x+ATRIUM_STAIRS[0].width/2+.2,z0:ATRIUM_STAIRS[0].a.z-.4,z1:ATRIUM_STAIRS[0].b.z};
export const ENTRY_STAIR_GUARDS=[[[ENTRY_STAIR_OPENING.x0,ENTRY_STAIR_OPENING.z0],[ENTRY_STAIR_OPENING.x0,ENTRY_STAIR_OPENING.z1]],[[ENTRY_STAIR_OPENING.x1,ENTRY_STAIR_OPENING.z0],[ENTRY_STAIR_OPENING.x1,ENTRY_STAIR_OPENING.z1]],[[ENTRY_STAIR_OPENING.x0,ENTRY_STAIR_OPENING.z0],[ENTRY_STAIR_OPENING.x1,ENTRY_STAIR_OPENING.z0]]];
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
 for(const s of ATRIUM_STAIRS){const t=onStair(s,x,z);if(t!==null){const h=s.a.y+(s.b.y-s.a.y)*t;if(supportedStair(currentY,h))return h;}}
 if(currentY<3.9)return 0;
 let closest=ATRIUM_LEVELS[0];for(const l of ATRIUM_LEVELS)if(Math.abs(currentY-l.y)<Math.abs(currentY-closest.y))closest=l;
 return closest.y;
}
/** 完整主樓層通往後方公共走廊；夾層僅保留層退迴廊。開口尺寸為照片估算。 */
export function atriumRearExit(l){return ['3F','4F','5F','7F','8F'].includes(l.label)?{x:l.east+3.35,z:l.north-4.5,width:2.1}:null;}
export function atriumDoorFrames(l){const e=atriumRearExit(l);return e?[-1,1].map(side=>({x:e.x+side*1.12,z:e.z,w:.1,d:.16})):[];}
export function atriumPlatforms(l){
 return [
  {x0:-22.2,x1:l.east+4.8,z0:l.north-4.8,z1:l.north,side:'north'},
  {x0:l.east,x1:l.east+4.8,z0:l.north,z1:9.4,side:'east'},
  {x0:l.east+2.6,x1:l.east+4.8,z0:9.4,z1:15.6,side:'stair-side'},
  {x0:l.east,x1:l.east+4.8,z0:15.6,z1:24,side:'east'},
  ...((l.index===0)?outsideEntryStairOpening({x0:-22.2,x1:l.east,z0:16.2,z1:24,side:'south'}):[{x0:-22.2,x1:l.east,z0:16.2,z1:24,side:'south'}]),
  ...(atriumRearExit(l)?[{x0:l.east+2.1,x1:l.east+4.7,z0:l.north-7.8,z1:l.north-3,side:'rear'},{x0:l.east-3.5,x1:l.east+7,z0:l.north-8,z1:l.north-5.8,side:'rear'}]:[]),
 ];
}
/** 導航取平台聯集，畫面地板則分割成不重疊的實體，避免共面閃爍。 */
export function atriumVisiblePlatforms(l){return atriumPlatforms(l).map(r=>r.side==='rear'&&r.z1===l.north-3?{...r,z0:l.north-5.8,z1:l.north-4.8}:r);}
export function clampAtrium(p){
 // 洞口護欄有上下界：擋住3F與梯段上半部的身體，不能擋住2F梯口。
 const guardY=ATRIUM_LEVELS[0].y;
 if(p.y+1.8>guardY&&p.y<guardY+1.15)for(const [a,b]of ENTRY_STAIR_GUARDS){
  const x0=Math.min(a[0],b[0])-.033,x1=Math.max(a[0],b[0])+.033,z0=Math.min(a[1],b[1])-.033,z1=Math.max(a[1],b[1])+.033;
  const nx=Math.max(x0,Math.min(p.x,x1)),nz=Math.max(z0,Math.min(p.z,z1)),dx=p.x-nx,dz=p.z-nz,d=Math.hypot(dx,dz);
  if(d>=.4)continue;
  if(d>1e-8){p.x=nx+dx/d*.4;p.z=nz+dz/d*.4;}
  else {
   const moves=[{d:p.x-x0,x:x0-.4,z:p.z},{d:x1-p.x,x:x1+.4,z:p.z},{d:p.z-z0,x:p.x,z:z0-.4},{d:z1-p.z,x:p.x,z:z1+.4}];moves.sort((a,b)=>a.d-b.d);p.x=moves[0].x;p.z=moves[0].z;
  }
 }
 // 梯段先按角色半徑守住兩側扶手，避免越欄後被最近平台吸到別層。
 for(const stair of ATRIUM_STAIRS.slice(1)){
  const dx=stair.b.x-stair.a.x,dz=stair.b.z-stair.a.z,len=Math.hypot(dx,dz);
  const t=((p.x-stair.a.x)*dx+(p.z-stair.a.z)*dz)/(len*len),side=((p.x-stair.a.x)*dz-(p.z-stair.a.z)*dx)/len;
  if(t>0&&t<1&&Math.abs(side)<stair.width/2+.4&&supportedStair(p.y,stair.a.y+(stair.b.y-stair.a.y)*t)){
   const safe=Math.max(-stair.width/2+.4,Math.min(stair.width/2-.4,side)),shift=safe-side;p.x+=shift*dz/len;p.z-=shift*dx/len;return;
  }
 }
 if(p.y>.3){
  const first=ATRIUM_STAIRS[0],t=(p.z-first.a.z)/(first.b.z-first.a.z);
  if(t>0&&t<1&&Math.abs(p.x-first.a.x)<first.width/2+.4&&supportedStair(p.y,first.a.y+t*(first.b.y-first.a.y)))p.x=Math.max(first.a.x-first.width/2+.4,Math.min(first.a.x+first.width/2-.4,p.x));
  if(p.y<3.9)return;
 }
 if(p.y<3.9)return;
 for(const s of ATRIUM_STAIRS){const t=onStair(s,p.x,p.z);if(t!==null&&supportedStair(p.y,s.a.y+(s.b.y-s.a.y)*t))return;}
 const l=ATRIUM_LEVELS.reduce((a,b)=>Math.abs(a.y-p.y)<Math.abs(b.y-p.y)?a:b);
 let best={x:p.x,z:p.z},dist=Infinity;
 if(!walkSafe(l,p.x,p.z))for(const r of walkRects(l)){
  const q={x:Math.max(r.x0+.42,Math.min(r.x1-.42,p.x)),z:Math.max(r.z0+.42,Math.min(r.z1-.42,p.z))};
  const d=Math.hypot(q.x-p.x,q.z-p.z);if(d<dist&&walkSafe(l,q.x,q.z)){best=q;dist=d;}
 }
 p.x=best.x;p.z=best.z;avoidFurniture(p,l);
}
/** 同一份桌島描述同時供建模與阻擋，桌間留視覺呼吸及可走通道。 */
export function atriumDesks(l){
 if(!l.books)return [];
 const out=[];
 for(const side of ['east','north']){
  const lo=side==='east'?l.north:-22,hi=side==='east'?19.6:l.east-1;
  for(let u=lo+2.1;u<hi-1.5;u+=4.6){
   if(side==='east'&&u>6.1&&u<17.4)continue;
   if(side==='east'&&u>=17.4&&ATRIUM_COLUMNS.some(c=>c.x>l.east+.4&&c.x<l.east+4.2))continue; // 柱旁末端留空，不能以桌島封住繞柱路線。
   if(side==='east'&&u>=17.4)u=Math.max(u,18.8); // 扶手出口與桌椅之間保留橫向落腳平台。
   out.push({side,u,width:1.8,depth:2.2,x:side==='east'?l.east+1.35:u,z:side==='east'?u:l.north-1.35});
  }
 }
 return out;
}
export function atriumFurniture(l){
 const out=[];
 for(const d of atriumDesks(l)){
  const east=d.side==='east',w=east?d.depth:d.width,depth=east?d.width:d.depth;
  out.push({x0:d.x-w/2,x1:d.x+w/2,z0:d.z-depth/2,z1:d.z+depth/2});
  for(const delta of [-1.3,1.3])for(const v of [.8,1.9]){
   const cx=east?l.east+v:d.u+delta,cz=east?d.u+delta:l.north-v;
   out.push({x0:cx-.28,x1:cx+.28,z0:cz-.28,z1:cz+.28});
  }
 }
 return out;
}
export const ATRIUM_COLUMNS=[-22,-15,-8,-1,6].map(x=>({x,z:20,w:.6,d:.6}));
function avoidFurniture(p,l){
 for(const r of [...atriumFurniture(l),...[...ATRIUM_COLUMNS,...atriumDoorFrames(l)].map(c=>({x0:c.x-c.w/2,x1:c.x+c.w/2,z0:c.z-c.d/2,z1:c.z+c.d/2}))]){
  const x0=r.x0-.4,x1=r.x1+.4,z0=r.z0-.4,z1=r.z1+.4;
  if(p.x>x0&&p.x<x1&&p.z>z0&&p.z<z1){
   const candidates=[{x:x0,z:p.z},{x:x1,z:p.z},{x:p.x,z:z0},{x:p.x,z:z1}];
   const valid=candidates.filter(q=>walkSafe(l,q.x,q.z));
   valid.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
   if(valid[0]){p.x=valid[0].x;p.z=valid[0].z;}
  }
 }
}

function walkRects(l){return atriumPlatforms(l).map(r=>r.side==='rear'?r:({...r,x1:Math.min(r.x1,l.east+3.9),z0:Math.max(r.z0,l.north-3.9)}));}
function walkSafe(l,x,z){
 const rects=walkRects(l);
 for(let i=0;i<12;i++){
  const a=i/12*Math.PI*2,xx=x+Math.cos(a)*.4,zz=z+Math.sin(a)*.4;
  if(!rects.some(r=>xx>=r.x0&&xx<=r.x1&&zz>=r.z0&&zz<=r.z1))return false;
 }
 return true;
}

export const canUseDahExit=y=>Number.isFinite(y)&&y<2;
