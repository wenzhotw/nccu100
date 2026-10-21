/** 達賢戶外配置。前草坡朝 +z，池畔朝 -z；標高由照片估計，非現地測繪。 */
import site from './site-data.js';
export const POND = site.features.pond.outline;
export const LIBRARY_OUTLINE = site.features.library.outline;
export const HOUSE_OUTLINE = site.features.house.outline;
export const SCALE = site.scale;
export const HOUSE = { x: -15.255, z: -53.207, width: 24.25, depth: 16, angle: 1.183 };
export const BOUNDS = { x0: -59, x1: 62, z0: -106, z1: 104 };
export const SPAWN = { x: 21, z: 86, yaw: 0, pitch: 0.24, face: Math.PI };
export const DECK_Y = 4;
export const TREE_PLAZA={x:43,z:62,inner:4,radius:14,base:.4,tread:.8,rise:.2};
export const PLAZA_WALL={x:43,z:61.88,w:28,d:.3,bottom:.4,top:2.8};
export const BENCHES=[[33,40,0],[-34,-43,1.7],[28,-78,0],[-12,-97,1.4]];
export const LAMPS=[[30,68],[32,43],[38,10],[38,-23],[27,-38],[-31,-39],[-39,-68],[23,-96]];
export function housePoint(x,z) {
  const cs=Math.cos(HOUSE.angle),sn=Math.sin(HOUSE.angle);
  return {x:HOUSE.x+x*cs+z*sn,z:HOUSE.z-x*sn+z*cs};
}
export function houseLocal(x,z) {
  const dx=x-HOUSE.x,dz=z-HOUSE.z,cs=Math.cos(HOUSE.angle),sn=Math.sin(HOUSE.angle);
  return {x:dx*cs-dz*sn,z:dx*sn+dz*cs};
}
export const BRIDGE={start:{x:-21.2,z:-27.8},end:housePoint(-HOUSE.width/2-.35,2.2),width:2.8};
/** 兩跑戶外樓梯，半階平台位於外側；每階0.2公尺。 */
export const OUTDOOR_STEPS=[
  ...Array.from({length:10},(_,i)=>({x:-31.1,z:-27.8-i*.55,y:(i+1)*.2,w:2.5,d:.56})),
  {x:-29.55,z:-33.6,y:2,w:5.6,d:1.6},
  ...Array.from({length:10},(_,i)=>({x:-28,z:-32.75+i*.55,y:2+(i+1)*.2,w:2.5,d:.56})),
  {x:-25.2,z:-27.8,y:4,w:5.8,d:2.2},
];
export function onBridge(x,z,margin=0) {
  const a=BRIDGE.start,b=BRIDGE.end,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  const t=((x-a.x)*dx+(z-a.z)*dz)/(len*len);
  return t>=-margin/len&&t<=1+margin/len&&Math.abs((x-a.x)*dz-(z-a.z)*dx)/len<=BRIDGE.width/2+margin;
}
export const TERRACE_RAILS=[[[29.5,25],[29.5,3]],[[29.5,3],[24,-6]],[[24,-6],[23,-23]],[[23,-23],[16,-28.7]],[[16,-28.7],[-19.65,-28.7]],[[-22.8,-28.7],[-25.8,-28.6]]];
export const HOUSE_RAILS=[
  [[-13,-8.75],[13,-8.75]], [[-13,8.75],[13,8.75]],
  [[-13,-8.7],[-13,.5]], [[-13,3.9],[-13,8.7]],
];

function railBox(a,b,base=4) {
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  return {obb:true,cx:(a[0]+b[0])/2,cz:(a[1]+b[1])/2,hx:len/2,hz:.09,cs:dx/len,sn:-dz/len,top:base+1.05,bottom:base-.3};
}
export function raisedColliders() {
  const {start:a,end:b,width}=BRIDGE,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  const rails=TERRACE_RAILS.map(([a,b])=>railBox(a,b));
  for(const [a,b]of HOUSE_RAILS){const p=housePoint(...a),q=housePoint(...b);rails.push(railBox([p.x,p.z],[q.x,q.z]));}
  for(const [a,b]of HOUSE_RAILS.slice(0,2)){const p=housePoint(...a),q=housePoint(...b);rails.push(railBox([p.x,p.z],[q.x,q.z],.4));}
  for(const z of [24,16,8,0,-8])rails.push({x0:20.77,x1:21.43,z0:z-1.85,z1:z+1.85,bottom:3.9,top:4.52});
  for(const side of [-1,1]){
    const nx=dz/len*(width/2-.1)*side,nz=-dx/len*(width/2-.1)*side;
    rails.push(railBox([a.x+nx,a.z+nz],[b.x+nx,b.z+nz]));
  }
  return rails;
}

/** 本區局部反覆解相鄰箱，避免後處理把角色推回先前的牆。 */
function pushFromBox(p,c,r=.4) {
  if(c.top!==undefined&&p.y>=c.top||c.bottom!==undefined&&p.y+1.45<c.bottom)return;
  const cs=c.obb?c.cs:1,sn=c.obb?c.sn:0;
  const cx=c.obb?c.cx:(c.x0+c.x1)/2,cz=c.obb?c.cz:(c.z0+c.z1)/2;
  const hx=c.obb?c.hx:(c.x1-c.x0)/2,hz=c.obb?c.hz:(c.z1-c.z0)/2;
  let x=(p.x-cx)*cs-(p.z-cz)*sn,z=(p.x-cx)*sn+(p.z-cz)*cs;
  const nx=Math.max(-hx,Math.min(x,hx)),nz=Math.max(-hz,Math.min(z,hz)),dx=x-nx,dz=z-nz,d=Math.hypot(dx,dz);
  if(d>=r)return;
  if(d>1e-8){x=nx+dx/d*(r+1e-6);z=nz+dz/d*(r+1e-6);}
  else {const distances=[hx-x,hx+x,hz-z,hz+z],i=distances.indexOf(Math.min(...distances));
    if(i===0)x=hx+r;else if(i===1)x=-hx-r;else if(i===2)z=hz+r;else z=-hz-r;}
  p.x=cx+x*cs+z*sn;p.z=cz-x*sn+z*cs;
}

/** 腳下支撐與地形分開；二樓平台下方不會把一樓行人吸上樓。 */
export function walkHeight(x,z,footY=0) {
  const terrain=groundHeight(x,z);
  let height=terrain;
  const wall=PLAZA_WALL;
  if(Math.abs(x-wall.x)<=wall.w/2&&Math.abs(z-wall.z)<=wall.d/2&&footY+.26>=wall.top)height=Math.max(height,wall.top);
  for(const step of OUTDOOR_STEPS)if(Math.abs(x-step.x)<=step.w/2&&Math.abs(z-step.z)<=step.d/2&&footY+.26>=step.y)height=Math.max(height,step.y);
  const local=houseLocal(x,z);
  const onHouse=Math.abs(local.x)<=HOUSE.width/2+.9&&Math.abs(local.z)<=HOUSE.depth/2+.9;
  if(onHouse)height=Math.max(height,.4);
  const supported=insidePolygon(x,z,LIBRARY_OUTLINE)||onBridge(x,z,.05)||onHouse;
  return supported&&footY+0.26>=DECK_Y
    ? Math.max(height,DECK_Y) : height;
}

/** 前草坡接二樓，兩側坡道降到一樓；平台下方另保留低處地面。 */
export function groundHeight(x, z) {
  const plaza=TREE_PLAZA,r=Math.hypot(x-plaza.x,z-plaza.z);
  if(z>=plaza.z&&r<plaza.radius)return plaza.base+Math.max(0,Math.floor((r-plaza.inner)/plaza.tread))*plaza.rise;
  if(z>=plaza.z&&r<plaza.radius+4){const natural=z>=90?0:z>36?4*(90-z)/54:4;return 2.8+(natural-2.8)*(r-plaza.radius)/4;}
  if (z >= 90) return 0;
  if (z > 36) return 4 * (90 - z) / 54;
  if (z >= 28) return 4;
  if (Math.abs(x)>=30&&z>0) return 4*z/28;
  return 0;
}

/** 射線法只判斷水平位置，角色高度另外由 groundHeight 決定。 */
export function insidePolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[i], [bx, bz] = polygon[j];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

/** 水池兩側都有岸線；保留半公尺岸邊間隙，不讓角色踏入景觀池。 */
export function keepOnLand(p, polygon = POND) {
  const margin = 0.52;
  const within = insidePolygon(p.x, p.z, polygon);
  const area = polygon.reduce((a, v, i) => {
    const n = polygon[(i + 1) % polygon.length]; return a + v[0] * n[1] - n[0] * v[1];
  }, 0);
  let closest = Infinity, candidate = null;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (!len) continue;
    const t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / (len * len)));
    const x = a[0] + t * dx, z = a[1] + t * dz, d = Math.hypot(p.x - x, p.z - z);
    if (!within && d >= margin) continue;
    const sign = area > 0 ? 1 : -1;
    const q = { x: x + sign * dz / len * margin, z: z - sign * dx / len * margin };
    if (d < closest && !insidePolygon(q.x, q.z, polygon)) { closest = d; candidate = q; }
  }
  if (candidate) { p.x = candidate.x; p.z = candidate.z; }
  p.x = Math.max(BOUNDS.x0 + 0.5, Math.min(BOUNDS.x1 - 0.5, p.x));
  p.z = Math.max(BOUNDS.z0 + 0.5, Math.min(BOUNDS.z1 - 0.5, p.z));
  if(polygon===POND){
    const boxes=[...buildingColliders(),...raisedColliders()];
    for(let n=0;n<12;n++){
      const x=p.x,z=p.z;for(const box of boxes)pushFromBox(p,box);
      if(Math.hypot(p.x-x,p.z-z)<1e-7)break;
    }
    // 柱與欄杆之間不足一個身寬時，來回推動仍可能卡在窄縫。
    // 從殘留重疊物件的四側選最近的完整安全點，不放寬可見物件。
    const overlaps=(q,c)=>{const copy={...q};pushFromBox(copy,c);return Math.hypot(copy.x-q.x,copy.z-q.z)>1e-7;};
    const remaining=boxes.filter(c=>overlaps(p,c));
    if(remaining.length){
      let best=null,bestDistance=Infinity;
      for(const c of remaining){
        const cs=c.obb?c.cs:1,sn=c.obb?c.sn:0,cx=c.obb?c.cx:(c.x0+c.x1)/2,cz=c.obb?c.cz:(c.z0+c.z1)/2;
        const hx=c.obb?c.hx:(c.x1-c.x0)/2,hz=c.obb?c.hz:(c.z1-c.z0)/2;
        const x=(p.x-cx)*cs-(p.z-cz)*sn,z=(p.x-cx)*sn+(p.z-cz)*cs;
        for(const [xx,zz]of [[-hx-.40001,z],[hx+.40001,z],[x,-hz-.40001],[x,hz+.40001]]){
          const q={x:cx+xx*cs+zz*sn,z:cz-xx*sn+zz*cs,y:p.y},distance=Math.hypot(q.x-p.x,q.z-p.z);
          if(distance>=bestDistance||insidePolygon(q.x,q.z,POND)||boxes.some(box=>overlaps(q,box)))continue;
          if(q.x<BOUNDS.x0+.5||q.x>BOUNDS.x1-.5||q.z<BOUNDS.z0+.5||q.z>BOUNDS.z1-.5)continue;
          best=q;bestDistance=distance;
        }
      }
      if(best){p.x=best.x;p.z=best.z;}
    }
  }
}

/** 門廊保留開口，主樓玻璃背後與小屋本體不可穿越。 */
export function buildingColliders() {
  const cs=Math.cos(HOUSE.angle),sn=Math.sin(HOUSE.angle);
  return [
    {x0:PLAZA_WALL.x-PLAZA_WALL.w/2,x1:PLAZA_WALL.x+PLAZA_WALL.w/2,z0:PLAZA_WALL.z-PLAZA_WALL.d/2,z1:PLAZA_WALL.z+PLAZA_WALL.d/2,bottom:PLAZA_WALL.bottom,top:PLAZA_WALL.top},
    { x0:-26.7,x1:10.15,z0:-24.8,z1:28.05,top:25.4 },
    { x0:9.6,x1:10.4,z0:9.9,z1:16.7,top:7.45 },
    ...[21,9,-3].map(z=>({x0:23.3,x1:24.1,z0:z-.4,z1:z+.4,top:7.45})),
    { obb:true,cx:housePoint(1.05,0).x,cz:housePoint(1.05,0).z,hx:HOUSE.width/2-1.05,hz:HOUSE.depth/2-.15,cs,sn,top:7.5 },
    ...[-1,1].map(side=>({obb:true,cx:housePoint(-HOUSE.width/2,side*(HOUSE.depth/2-.12)).x,cz:housePoint(-HOUSE.width/2,side*(HOUSE.depth/2-.12)).z,hx:.3,hz:.275,cs,sn,bottom:.3,top:7.4})),
    ...BENCHES.map(([x,z,a])=>({obb:true,cx:x,cz:z,hx:1.25,hz:.36,cs:Math.cos(a),sn:Math.sin(a),top:groundHeight(x,z)+.56})),
    ...LAMPS.map(([x,z])=>({x0:x-.06,x1:x+.06,z0:z-.06,z1:z+.06,top:groundHeight(x,z)+3.8})),
  ];
}

export function zoneName(p) {
  if (p.z > 38) return '達賢圖書館・入口草坡';
  if (p.z > 12) return '達賢圖書館・入口廣場';
  if (p.z < -68) return '達賢圖書館・景觀池畔';
  if (p.z < -35 && p.x < -1) return '湖濱悅讀小屋';
  if (p.z < -30) return '達賢圖書館・湖濱步道';
  return '達賢圖書館・戶外廊道';
}
