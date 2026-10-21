import { CAMPUS_GUIDE as G } from '../../world/campus-guide-layout.js';
import { SIWEI, swZ, bdZ } from '../../world/layout.js';
import { activityEntries } from './activity-map-logic.js';
export function activityGuideModel(layout, content, position=null) {
 const entries=activityEntries(layout,content);
 const points=[...entries,{x:SIWEI.x0,z:swZ(SIWEI.x0)},{x:SIWEI.x1,z:swZ(SIWEI.x1)},G.gate,G.hallFront,G.fountain];
 if(position&&Number.isFinite(position.x)&&Number.isFinite(position.z))points.push(position);
 const bounds={minX:Math.min(...points.map(p=>p.x))-10,maxX:Math.max(...points.map(p=>p.x))+10,minZ:Math.min(...points.map(p=>p.z))-16,maxZ:Math.max(...points.map(p=>p.z))+13};
 const roads=[
  {id:'avenue',name:'中央大道',width:G.avenue.width,points:[[G.avenue.x,G.avenue.z-G.avenue.length/2],[G.avenue.x,G.avenue.z+G.avenue.length/2]]},
  {id:'crosswalk',name:'噴水池橫向步道',width:G.crosswalk.depth,points:[[G.crosswalk.x-G.crosswalk.width/2,G.crosswalk.z],[G.crosswalk.x+G.crosswalk.width/2,G.crosswalk.z]]},
  {id:'siwei',name:'四維道',width:10,points:[[SIWEI.x0,swZ(SIWEI.x0)],[SIWEI.x1,swZ(SIWEI.x1)]]},
  {id:'bade',name:'八德道',width:4.4,points:[[Math.max(-86,bounds.minX),bdZ(-86)],[0,bdZ(0)],[Math.min(92.5,bounds.maxX),bdZ(Math.min(92.5,bounds.maxX))]]},
 ];
 const landmarks=[{id:'gate',name:'校門',...G.gate},{id:'fountain',name:'噴水池',...G.fountain},{id:'hall',name:'四維堂',...G.hallFront}];
 const zones=[...new Set(entries.map(e=>e.college))].map(name=>{const es=entries.filter(e=>e.college===name);return {name,color:es[0].color,entries:es};});
 return {entries,bounds,roads,landmarks,zones,position,gatePlaza:G.gatePlaza};
}
// Same north-up convention as systems/map-painter.js: +z is north; +x is west.
export function guideProjection(bounds,width,height,pad=35){const scale=Math.min((width-pad*2)/(bounds.maxX-bounds.minX),(height-pad*2)/(bounds.maxZ-bounds.minZ));const ox=(width-(bounds.maxX-bounds.minX)*scale)/2,oy=(height-(bounds.maxZ-bounds.minZ)*scale)/2;return {scale,xy:(x,z)=>[ox+(bounds.maxX-x)*scale,oy+(bounds.maxZ-z)*scale]};}
