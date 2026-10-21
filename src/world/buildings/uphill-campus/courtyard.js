/** 依 IMG_9019～9026 的中庭紅磚、草地與西北側停車設施配置。 */
import * as THREE from 'three';
import { BUILDING_FLOORS, FLOOR_H, LOBBY } from './layout.js';
import { heightAt } from './terrain.js';

export const COURTYARD_TREES = [10,16,22].flatMap(x=>[-30.6,-24.8].map(z=>({x,z,scale:0.75})));
export const COURTYARD_LAMPS = [11,17,23].flatMap(x=>[-30.2,-25.4].map(z=>({x,z})));
const brick = new THREE.MeshToonMaterial({color:'#b77666'});

export function courtyardProps() {
  return [
    ...COURTYARD_TREES.map(p=>({...p,w:0.6,d:0.6,h:2.0,kind:'courtyard-tree'})),
    ...COURTYARD_LAMPS.map(p=>({...p,w:0.18,d:0.18,h:5.6,kind:'courtyard-lamp'})),
    ...[8,10,12].map(x=>({x,z:-34.4,w:1.2,d:0.65,h:0.65,kind:'bike-rack'})),
    ...[8,10].map(x=>({x,z:-35.5,w:1.2,d:0.6,h:0.8,kind:'plaza-jersey'})),
  ];
}
/** 照片 9022、9027：九舍 D 區西端的圓弧樓梯間，四層樓高，每層一圈陽台帶。 */
export const D_TOWER = { x: 6.4, z: -37.4, r: 1.4, base: 15, floors: BUILDING_FLOORS[510739854] };
const TOWER = new THREE.CylinderGeometry(1, 1, 1, 18);
/** 圓弧樓梯間本體與描邊，交給建築擠出網格一起合併（greybox.js）。 */
export function dTowerGeometries() {
  const t=D_TOWER,height=t.floors*FLOOR_H,y=t.base+height/2;
  return { body: TOWER.clone().scale(t.r,height,t.r).translate(t.x,y,t.z),
    edge: TOWER.clone().scale(t.r+0.05,height+0.05,t.r+0.05).translate(t.x,y,t.z) };
}
export function courtyardColliders() {
  // 圓弧樓梯間以轉 45 度的方塊包住突出牆外的部分，角點落在半徑上。
  const t = D_TOWER, half = t.r / Math.SQRT2;
  return [...courtyardProps().map(p=>({courtyard:true,kind:p.kind,obb:true,cx:p.x,cz:p.z,hx:p.w/2,hz:p.d/2,th:0,cs:1,sn:0})),
    {courtyard:true,kind:'d-tower',obb:true,cx:t.x,cz:t.z,hx:half,hz:half,th:Math.PI/4,cs:Math.SQRT1_2,sn:Math.SQRT1_2}];
}
export function addCourtyard(group,{addMerged,TOP,BOX,wallMaterial,edgeMaterial}) {
  const {door}=LOBBY;
  for(const [name,x,z,w,d] of [['九舍中庭車道',(8+door.x)/2,door.z,door.x-8,3.6],['九舍北側廣場',7.5,-29.5,15,11]]) {
    const g=TOP.clone().scale(w,1,d).translate(x,15.025,z);
    // 兩片磚面共用同一世界座標紋理，交會處不疊面閃爍。
    if(name==='九舍中庭車道') {
      const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,15.03);
    }
    const m=addMerged(group,name,[g],brick);m.userData.brick=true;
  }
  const steel=[],edges=[];
  const box=(x,y,z,w,h,d)=>BOX.clone().scale(w,h,d).translate(x,y,z);
  for(const p of courtyardProps().filter(p=>['bike-rack','plaza-jersey'].includes(p.kind))) {
    const parts=p.kind==='bike-rack'
      ? [[p.x-p.w/2+0.04,p.h/2,p.z,0.08,p.h,0.08],[p.x+p.w/2-0.04,p.h/2,p.z,0.08,p.h,0.08],[p.x,p.h-0.04,p.z,p.w,0.08,0.08]]
      : [[p.x,0.15,p.z,p.w,0.3,p.d],[p.x,0.55,p.z,p.w,0.5,0.24]];
    for(const [x,y,z,w,h,d] of parts) {
      steel.push(box(x,heightAt(x,z)+y,z,w,h,d));
      edges.push(box(x,heightAt(x,z)+y,z,w+0.03,h+0.03,d+0.03));
    }
  }
  // 圓弧樓梯間的陽台帶與機車架同色，併進同一份網格，不另增繪製次數。
  const t=D_TOWER;
  for(let floor=1;floor<t.floors;floor++)steel.push(TOWER.clone().scale(t.r+0.08,0.14,t.r+0.08).translate(t.x,t.base+floor*FLOOR_H,t.z));
  addMerged(group,'廣場機車架與護欄',steel,wallMaterial);
  addMerged(group,'廣場設施描邊',edges,edgeMaterial);
}
