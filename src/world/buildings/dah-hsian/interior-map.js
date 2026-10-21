/** 2F與既有渲染工具接線。 */
import * as THREE from 'three';
import {scene} from '../../../core/engine.js';
import {colliders} from '../../../core/collision.js';
import {toon,basic,canvasTex,OUT} from '../../../render/kit.js';
import {createInteriorModel,INTERIOR_COLORS} from './interior-model.js';
import {interiorColliders} from './interior-layout.js';
function sign(parent,text,x,y,z,w,h,angle=0,bg=null,color='#eee9df'){
 const texture=canvasTex(1024,256,(g,cw,ch)=>{if(bg){g.fillStyle=bg;g.fillRect(0,0,cw,ch);}g.fillStyle=color;g.font='700 66px "Noto Sans TC",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,cw/2,ch/2,cw-40);});
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),basic({map:texture,transparent:!bg}));m.name='2樓標示：'+text;m.position.set(x,y,z);m.rotation.y=angle;parent.add(m);
 document.fonts?.load('700 66px "Noto Sans TC"',text).then(()=>texture.redraw());
}
export function buildInterior(){
 const materials=new Map();
 const floor=canvasTex(256,256,(g,w,h)=>{g.fillStyle='#d7d1c2';g.fillRect(0,0,w,h);g.strokeStyle='#bdb9ae';g.lineWidth=1;g.strokeRect(.5,.5,w-1,h-1);},[32,32]);
 const carpet=canvasTex(128,128,(g,w,h)=>{g.fillStyle='#51758a';g.fillRect(0,0,w,h);g.strokeStyle='#5b7c8d';g.lineWidth=1;for(let i=0;i<128;i+=8){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();}},[3,3]);
 const materialFor=kind=>{
  if(kind==='outline')return OUT;
  if(!materials.has(kind))materials.set(kind,toon(INTERIOR_COLORS[kind]||'#e4e2d8',kind==='floor'?{map:floor}:kind==='carpet'?{map:carpet}:kind==='clear'?{transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}:undefined));
  return materials.get(kind);
 };
 const model=createInteriorModel(materialFor);scene.add(model);colliders.push(...interiorColliders());
 sign(model,'國立政治大學　達賢圖書館',-11.5,2.25,-22.45,7.3,.55);
 sign(model,'Dah Hsian Seetoo Library',-11.5,1.7,-22.44,6.4,.28);
 sign(model,'諮詢・借閱服務',-7,2.9,-3.9,3.2,.4,Math.PI/2,'#35495a');
 sign(model,'↑ 預約取書　　挑空展示區 →',-12,3.15,-3.6,6,.5,0,'#35495a');
 sign(model,'出口・大廳 ←',-12,3.15,-3.58,5,.45,Math.PI,'#35495a');
 sign(model,'回達賢戶外',-22.6,3.3,-12,2.5,.4,Math.PI/2,'#35495a');
 sign(model,'2F　特藏中心',-.31,2.8,7,4,.5,-Math.PI/2,'#35495a');
 sign(model,'新書・期刊閱覽',-3,3.1,23.7,5,.45,Math.PI,'#35495a');
 sign(model,'感恩牆',-18.2,1.2,-22.4,1.4,.3);
 for(const z of [-17,-11,-6])sign(model,'作業區',-.32,2.7,z,1.3,.3,-Math.PI/2,null,'#35495a');
}
export function interiorLight(s){
 s.background=new THREE.Color('#c4d9e2');
 s.add(new THREE.HemisphereLight('#edf5ff','#a2a8ab',1));
 const light=new THREE.DirectionalLight('#fff9ef',.65);light.position.set(-10,20,16);s.add(light);
}
