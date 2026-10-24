/** 可在Node驗證的鏡頭遮擋收集。新場景可明確標記薄板／細柱，舊場景門檻不變。 */
import * as THREE from 'three';
export function collectCameraOccluders(root,{outline,sky}={}){
 const bounds=new THREE.Box3(),size=new THREE.Vector3(),list=[];
 const walk=o=>{
  if(o.userData?.noOcc||o.userData?.cameraSkipSubtree)return;
  if(o.isMesh&&o.material!==outline&&!o.isInstancedMesh&&o!==sky){
   const type=o.geometry.type,eligible=type==='BoxGeometry'||type==='ExtrudeGeometry'||type==='CylinderGeometry'&&o.geometry.parameters.radiusTop>.6;
   if(o.userData?.cameraOccluder)list.push(o);
   else if(eligible){bounds.setFromObject(o);bounds.getSize(size);if(Math.max(size.x,size.z)>1.4&&size.y>.25)list.push(o);}
  }
  o.children.forEach(walk);
 };
 root.children.forEach(walk);return list;
}
