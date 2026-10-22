/** 實拍褐色斑羽鴨群，另有文化局記載的綠頭鴨。數量與路線為遊戲配置，非動物普查。 */
import * as THREE from 'three';
import {WATER_Y} from './layout.js';
import {COLORS} from './model.js';
const oval=new THREE.SphereGeometry(1,10,7),box=new THREE.BoxGeometry(1,1,1);
const colors={brown:'#665743',feather:'#94816b',dark:'#443f36',wing:'#735f49',head:'#355844',grey:'#93917f',bill:'#7c7662',yellow:'#b39a48',eye:'#222c25',white:'#d4ccae'};
const routes=[{x:4,z:-83,rx:3.4,rz:2.3,phase:0},{x:1,z:-84,rx:3.1,rz:1.8,phase:1.4},{x:7,z:-82,rx:3,rz:2.6,phase:3.1},{x:-14,z:-71,rx:3.5,rz:2,phase:.8},{x:-16,z:-72,rx:3,rz:1.7,phase:2.5}];
export function createDucks(materialFor){
 const root=new THREE.Group();root.name='景觀池鴨群';const mats=new Map();
 const mat=k=>{if(!mats.has(k))mats.set(k,materialFor?materialFor(colors[k]):new THREE.MeshToonMaterial({color:colors[k]}));return mats.get(k);};
 for(const [i,route]of routes.entries()){
  const g=new THREE.Group();g.name='池中鴨'+(i+1);g.userData.route=route;root.add(g);
  const part=(kind,x,y,z,w,h,d,name,geometry=oval)=>{const m=new THREE.Mesh(geometry,mat(kind));m.name=name;m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;};
  const male=i===2;
  part(male?'grey':'brown',0,.16,0,.24,.17,.43,'鴨身');
  part('wing',0,.22,.02,.2,.11,.32,'收攏雙翼');
  const tail=part('dark',0,.23,-.39,.16,.065,.18,'上翹尾羽');tail.rotation.x=-.3;
  part(male?'head':'brown',0,.35,.29,.105,.19,.12,'鴨頸');
  part(male?'head':'feather',0,.49,.36,.135,.13,.145,'鴨頭');
  part(male?'yellow':'bill',0,.46,.535,.16,.035,.23,'扁嘴',box);
  for(const side of [-1,1])part('eye',side*.12,.515,.415,.019,.019,.019,'鴨眼');
  if(male)part('white',0,.31,.31,.112,.024,.12,'頸白環');
  else for(let row=0;row<3;row++)for(let n=0;n<5;n++)for(const side of [-1,1]){
   const m=part('feather',side*(.15+row*.026),.31-row*.045,-.2+n*.095,.012,.035,.075,'褐色斑羽');m.rotation.x=.45;
  }
  // 細V形尾流貼在水面；不碰撞角色，不把動物當作硬牆。
  const wakeGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.22,.005,-.25),new THREE.Vector3(-.45,.005,-.8),new THREE.Vector3(.22,.005,-.25),new THREE.Vector3(.45,.005,-.8)]);
  const wake=new THREE.LineSegments(wakeGeo,new THREE.LineBasicMaterial({color:COLORS.waterHighlight,transparent:true,opacity:.35}));wake.name='細尾流';g.add(wake);
 }
 updateDucks(root,0,false);return root;
}
/** 用絕對時間求位置，避免低幀率積分漂出岸線；減少動態時停在固定自然站位。 */
export function updateDucks(root,time,reducedMotion=false){
 for(const g of root.children){
  const r=g.userData.route,t=(reducedMotion?0:time)*.035+r.phase;
  g.position.set(r.x+Math.cos(t)*r.rx,WATER_Y+(reducedMotion?0:Math.sin(time*1.4+r.phase)*.012),r.z+Math.sin(t)*r.rz);
  g.rotation.y=Math.atan2(-Math.sin(t)*r.rx,Math.cos(t)*r.rz);
  const wake=g.getObjectByName('細尾流');wake.visible=!reducedMotion;wake.material.opacity=.25+Math.sin(time*.65+r.phase)*.07;
 }
}
