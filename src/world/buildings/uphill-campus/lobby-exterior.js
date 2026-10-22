/** 依 IMG_9019、9021、9023 建立九舍大廳外觀；室內開口由 8c 接續。 */
import * as THREE from 'three';
import {mergeBufferGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LOBBY } from './layout.js';

const glass = new THREE.MeshToonMaterial({ color: '#b9ded0', transparent: true, opacity: 0.72 });

export function addLobbyExterior(group, { addMerged, BOX, buildingMaterial, edgeMaterial }) {
  // 屋頂欄杆沿大廳範圍一圈（2026-10-22 大廳往南擴大後，與室內共用 LOBBY.bounds）。
  const {x0,x1,z0,z1}=LOBBY.bounds,pts=[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]];
  const roof=LOBBY.base+LOBBY.ceiling, rails=[], edges=[], frames=[];
  const box=(x,y,z,w,h,d,angle=0)=>BOX.clone().scale(w,h,d).rotateY(angle).translate(x,y,z);
  const part=(x,y,z,w,h,d,angle=0)=>{
    rails.push(box(x,y,z,w,h,d,angle));
    edges.push(box(x,y,z,w+0.03,h+0.03,d+0.03,angle));
  };
  for(let i=1;i<pts.length;i++) {
    const a=pts[i-1], b=pts[i], dx=b[0]-a[0], dz=b[1]-a[1], length=Math.hypot(dx,dz);
    if(!length)continue;
    const angle=-Math.atan2(dz,dx);
    for(const y of [roof+0.05,roof+LOBBY.parapet-0.05])part((a[0]+b[0])/2,y,(a[1]+b[1])/2,length,0.1,0.1,angle);
    const n=Math.ceil(length/0.65);
    for(let j=0;j<n;j++)part(a[0]+dx*j/n,roof+LOBBY.parapet/2,a[1]+dz*j/n,0.1,LOBBY.parapet,0.1,angle);
  }
  addMerged(group,'九舍大廳欄杆',rails,buildingMaterial).userData.noOcc=true;
  addMerged(group,'九舍大廳欄杆描邊',edges,edgeMaterial).userData.noOcc=true;
  const {x,z}=LOBBY.door;
  const panes=[-2.2,2.2].map(dz=>BOX.clone().scale(0.08,2.1,1.4).translate(0,0,dz));
  const door=new THREE.Mesh(mergeBufferGeometries(panes),glass);panes.forEach(g=>g.dispose());
  door.name='九舍大廳入口';door.position.set(x,LOBBY.base+1.05,z);group.add(door);
  // 玻璃門向兩側敞開，門洞中線保持可見且可穿越。
  // 西立面玻璃分成中間雙扇門與兩側固定窗，白框位置以門口為中心。
  for(const dz of [-2.9,-1.5,0,1.5,2.9])frames.push(box(x-0.06,16.05,z+dz,0.12,2.1,0.09));
  frames.push(box(x-0.06,17.13,z,0.12,0.12,6.0));
  frames.push(box(x-0.06,15.06,z,0.12,0.12,6.0));
  for(const dz of [-0.18,0.18])frames.push(box(x-0.12,16.05,z+dz,0.08,0.35,0.04));
  addMerged(group,'九舍大廳門框',frames,buildingMaterial);
  for(const [name,y,dz,w,h] of [['九舍大廳橫幅',17.85,0,6.5,0.65],['九舍大廳直式牌',16.3,3.45,0.42,2.4]]) {
    const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),buildingMaterial);
    face.name=name;face.position.set(x-0.28,y,z+dz);face.rotation.y=-Math.PI/2;
    if(name==='九舍大廳橫幅')face.userData.sign={text:'政大學生宿舍歡迎您',w,h};group.add(face);
  }
}
