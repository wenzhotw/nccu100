/** 普通學生的隔離造型樣板。只供建構期明確選用，不改全域幾何或已登記的來源。 */
import * as THREE from 'three';
let shapes;
function sharedShapes(){
 if(shapes)return shapes;
 // 延後到試點才配置，正常遊戲不增加資源或改變原建構亂數順序。
 const hand=new THREE.SphereGeometry(1,12,8);
 const shoe=new THREE.SphereGeometry(1,12,8);
 const p=shoe.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  // 球形鞋楦：壓平下緣、降低鞋尖，腳背保留圓弧，不增加細節零件。
  const sole=y<0?Math.max(-.9,y)/.9:y*(z>0?1-.12*z:1);
  p.setXYZ(i,x,sole,z);
 }
 shoe.computeVertexNormals();
 const cap=new THREE.SphereGeometry(.296,16,12,0,Math.PI*2,0,Math.PI*.38);
 const cp=cap.attributes.position;
 for(let i=0;i<cp.count;i++){
  const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i);
  cp.setXYZ(i,x,y+.012*(x/.296)*(z/.296),z);
 }
 cap.computeVertexNormals();
 shapes={hand,shoe,cap,
  back:new THREE.SphereGeometry(.299,16,12,Math.PI/2+1.05,Math.PI*2-2.1,0,Math.PI*.66),
  fringe:new THREE.SphereGeometry(1,12,8),bag:new THREE.SphereGeometry(.5,16,12)};
 return shapes;
}
function geometryWithOutline(node,geometry){
 const old=node.geometry;node.geometry=geometry;
 for(const child of node.children)if(child.isMesh&&child.geometry===old)child.geometry=geometry;
}
export function finishStudentStyleTrial(model,appearance,look){
 if(look.hairStyle!=='side'||look.suit||look.cap||look.police||look.hood||look.flyer)throw new Error('造型試點只支援一般側分髮學生');
 const s=sharedShapes();
 for(const side of ['L','R']){
  geometryWithOutline(model.limbParts[`arm${side}`].hand,s.hand);
  geometryWithOutline(model.limbParts[`leg${side}`].shoe,s.shoe);
 }
 const [cap,back,fringe]=appearance.hair;
 geometryWithOutline(cap,s.cap);geometryWithOutline(back,s.back);geometryWithOutline(fringe,s.fringe);
 if(look.bag)geometryWithOutline(appearance.accessory[0],s.bag);
}
