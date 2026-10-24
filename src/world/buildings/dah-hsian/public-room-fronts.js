import {ATRIUM_PORTALS} from './atrium-portals.js';
import {publicFloor} from './public-floor-layout.js';
import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
/** Closed room fronts traced from the official column-registered plans.
 * Positions/materials/door widths are visual estimates, not surveyed dimensions.
 * We model public-facing partitions, not invented accessible room interiors.
 */
export const PUBLIC_ROOM_FRONTS=Object.freeze([
 ...Object.entries(SOURCE_REAR_LAYOUT).flatMap(([floor,f])=>f.fronts.map(w=>{
  const portal=ATRIUM_PORTALS.find(p=>p.floor===floor&&p.frontId===w.id);
  return {...w,floor,doors:portal?[]:w.doorCenters,source:f.source,doorHeight:portal?.height,
   openPassages:portal?[{lo:portal.lo,hi:portal.hi}]:w.id.includes('wc')?[{lo:f.wc.opening[0][0],hi:f.wc.opening[1][0]}]:[],
  };
 })),
 {id:'commons_wc_east',floor:'3F',axis:'z',fixed:-15.126,lo:-22,hi:-14.623,face:1,doors:[],source:'official dhl3f WC east side, 3Fcommons1 writing wall'},
 {id:'commons_east_partition',floor:'3F',axis:'z',fixed:-8.211,lo:-23.677,hi:-14.4,face:-1,doors:[],source:'official dhl3f continuous east partition between north column bays'},
 {id:'commons_wc_north_return',floor:'3F',axis:'z',fixed:-14.958,lo:-23.677,hi:-22,face:1,doors:[],source:'official dhl3f WC wall meets north sawtooth exterior'},
 {floor:'8F',axis:'x',fixed:-16.565,lo:-12.5,hi:12.738,face:1,doors:[-11.2,-6.9,-2.5,.8,5.2,9.2,11.7],source:'north meeting/research/office strip'},
 {floor:'8F',axis:'z',fixed:15.144,lo:-1.478,hi:12.217,face:-1,doors:[-.4,6.5],source:'30-person conference / seminar rooms'},
 {floor:'8F',axis:'x',fixed:16.739,lo:-7.387,hi:12.738,face:-1,doors:[-5.6,.3,6.2],source:'south research room strip'},
 {floor:'8F',axis:'x',fixed:15.02,lo:-7.387,hi:12.738,face:1,doors:[-6.6,-4.85,-3.1,-1.35,.4,2.15,3.9,5.65,7.4,9.15,10.9],source:'individual study room frontage, north side of south corridor'},
]);
export function roomFrontAtBoundary(id,e){
 const room=PUBLIC_ROOM_FRONTS.some(w=>{
  if(w.floor!==id)return false;
  const u=w.axis==='x'?0:1,v=1-u;
  return Math.abs(e.a[v]-w.fixed)<.18&&Math.abs(e.b[v]-w.fixed)<.18&&Math.min(e.a[u],e.b[u])>=w.lo-.1&&Math.max(e.a[u],e.b[u])<=w.hi+.1;
 });
 if(room)return true;
 const rear=SOURCE_REAR_LAYOUT[id];if(!rear)return false;
 const w=rear.windows,lines=[...rear.outerEdges.map(e=>e.points),[[w.lo,w.fixed],[w.hi,w.fixed]],...rear.wc.sideWalls];
 // The pocket's unmodeled toilet interiors are outside the public route. Do not
 // paint a glass fence across those source-open approaches.
 lines.push(rear.wc.points.concat([rear.wc.points[0]]));
 for(const poly of publicFloor(id).closedRooms)lines.push([...poly,poly[0]]);
 return lines.some(points=>points.slice(1).some((b,i)=>{
  const a=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  return [e.a,e.b].every(p=>{const t=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(len*len);return t>=-.02&&t<=1.02&&Math.abs((p[0]-a[0])*dz-(p[1]-a[1])*dx)/len<.22;});
 }));
}
