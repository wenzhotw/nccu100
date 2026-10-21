/** 達賢場景接線：沿用卡通材質、文字貼圖與既有碰撞，不改共用引擎。 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { colliders } from '../../../core/collision.js';
import { toon, basic, canvasTex, OUT, outline } from '../../../render/kit.js';
import { groundHeight, buildingColliders } from './layout.js';
import { tree, FOLIAGE } from '../../vegetation.js';
import { COLORS, TREE_POSITIONS, createOutdoorModel } from './model.js';

function concreteTexture() {
  return canvasTex(256,512,(g,w,h)=>{
    g.fillStyle='#e0e3df';g.fillRect(0,0,w,h);
    // 細直木紋模板與橫向施工縫，色差刻意收斂，不把清水模畫成木牆。
    for(let x=0;x<w;x+=3){g.fillStyle=`rgba(105,108,99,${0.018+(x%17)*0.002})`;g.fillRect(x,0,1,h);}
    g.strokeStyle='rgba(97,103,96,.14)';g.lineWidth=1;
    for(const y of [128,256,384]){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  });
}

function textSign(parent,text,x,y,z,w,h,color,background,angle=0) {
  const texture=canvasTex(512,128,(g,cw,ch)=>{
    if(background){g.fillStyle=background;g.fillRect(0,0,cw,ch);}
    g.font='700 54px "Noto Serif TC","Songti TC",serif';g.fillStyle=color;
    g.textAlign='center';g.textBaseline='middle';g.fillText(text,cw/2,ch/2,cw-30);
  });
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),basic({map:texture,transparent:!background}));
  plane.name='館名字樣：'+text;plane.position.set(x,y,z);plane.rotation.y=angle;parent.add(plane);
  // 新場景首次出現的中文字型可能較晚完成；完成後重繪本場景文字。
  if(document.fonts)document.fonts.load('700 54px "Noto Sans TC"',text).then(()=>texture.redraw());
}

export function buildMap() {
  const texture=concreteTexture();const materials=new Map();
  const materialFor=kind=>{
    if(kind==='outline')return OUT;
    if(!materials.has(kind))materials.set(kind,toon(COLORS[kind]||COLORS.concrete,
      kind==='concrete'?{map:texture}:undefined));
    return materials.get(kind);
  };
  const model=createOutdoorModel(materialFor);scene.add(model);
  // 與校園共用同一種樹，並將樹根及樹冠判定提高至當地草坡。
  for(const [x,z]of TREE_POSITIONS){
    const start=scene.children.length,count=FOLIAGE.length;
    tree(x,z,0.95);
    if(FOLIAGE.length===count)continue; // 共用工具會略過既有預定地。
    const y=groundHeight(x,z);
    scene.children.slice(start).forEach(root=>{root.position.y+=y;root.name='達賢共用樹';});
    const foliage=FOLIAGE.at(-1);foliage.y0+=y;foliage.y1+=y;
    // 進場時全域 prefab 已完成合批；這些是一般網格，使用既有材質淡出分支。
    foliage.setFade=null;
  }
  colliders.push(...buildingColliders());
  // 入口清水模牆上的館名，位置對照照片；未宣稱複製原書法字形。
  textSign(model,'達賢圖書館',18.1,5.15,27.96,5.7,1.25,'#4a5556');
  // 草坡下方既有指南校區石碑，只重繪文字，不使用他人照片作貼圖。
  const marker=new THREE.Mesh(new THREE.BoxGeometry(8.2,2.3,0.55),toon('#ad9b85'));
  outline(marker,0.04);
  marker.name='指南校區石碑';marker.position.set(-22,groundHeight(-22,89)+1.15,89);model.add(marker);
  textSign(model,'國立政治大學',-22,groundHeight(-22,89)+1.65,89.29,7.4,0.7,'#e6d09b');
  textSign(model,'指南校區',-22,groundHeight(-22,89)+0.80,89.29,5.6,0.8,'#e6d09b');
  colliders.push({x0:-26.1,x1:-17.9,z0:88.7,z1:89.3});
}

export function mapLight(s) {
  const sky='#b4d6ed';s.background=new THREE.Color(sky);s.fog=new THREE.Fog(sky,120,330);
  s.add(new THREE.HemisphereLight('#e5efff','#667f75',0.85));
  const sun=new THREE.DirectionalLight('#fff9ef',0.75);sun.position.set(-48,70,55);s.add(sun);
}
