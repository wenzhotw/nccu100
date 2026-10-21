// 文學院候選模型。僅 D01、D02、D03；不改招生、互動、帳幕或其他學院。
// 參考的是卷軸、書頁與古代石雕的形制，沒有匯入參考照片或複製作品。
import * as THREE from 'three';
import { createDecorCtx } from './decor-ctx.js';
export const HUMANITIES_IDS = Object.freeze(['D01', 'D02', 'D03']);
const GEO = new Map(), ART = new Map();
const C = { paper: '#ead8ad', edge: '#c9ad84', ink: '#2a2c4a', red: '#ad3940', gold: '#c69b3c', stone: '#ddd5c4', blue: '#2d4f9e', wood: '#8a6a42' };
function geometry(key, make) { if (!GEO.has(key)) { const g = make(); g.computeBoundingBox(); GEO.set(key,g); } return GEO.get(key); }
function shape(points) { const s = new THREE.Shape(); points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y)); s.closePath(); return s; }
function extrude(key, s, depth) { return geometry(key,()=>new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.018,curveSegments:8})); }
// 橫向卷紙有真正弧度及厚度，不是方塊拉寬。
function scrollGeometry() { return geometry('scroll',()=>{ const s=new THREE.Shape();s.moveTo(-1.02,0);s.bezierCurveTo(-.65,-.10,.65,-.10,1.02,.02);s.lineTo(1.02,.07);s.bezierCurveTo(.65,-.05,-.65,-.05,-1.02,.05);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:1.05,bevelEnabled:false,curveSegments:16});g.rotateX(Math.PI/2); return g; }); }
export function buildHumanitiesLandmark(group,id,{toon,OUT,canvasTex}) {
  if(!HUMANITIES_IDS.includes(id)) return null;
  const root=new THREE.Group();root.name=`bz26-landmark-${id}`;root.userData.noOcc=true;root.userData.humanitiesCandidate=true;group.add(root);
  const ctx=createDecorCtx({THREE,toon,outlineMat:OUT},root,'#800020');
  const solids=[];
  const box=(w,h,d,c,x,y,z=1.86,out=.012)=>ctx.box(w,h,d,c,x,y,z,{out});
  const cyl=(r,h,c,x,y,z=1.86,o={})=>ctx.cyl(r,r,h,c,x,y,z,{seg:12,out:.012,...o});
  function mesh(g,c,x,y,z,outline=.015){const m=new THREE.Mesh(g,toon(c));m.position.set(x,y,z);m.receiveShadow=true;root.add(m);if(outline){const b=g.boundingBox.getSize(new THREE.Vector3()),o=new THREE.Mesh(g,OUT);o.scale.set(1+2*outline/Math.max(b.x,.02),1+2*outline/Math.max(b.y,.02),1+2*outline/Math.max(b.z,.02));m.add(o);}return m;}
  function art(key,w,h,x,y,z,draw,ry=0){if(!canvasTex)return;let mat=ART.get(key);if(!mat){mat=new THREE.MeshBasicMaterial({map:canvasTex(512,256,draw),transparent:true,toneMapped:false});ART.set(key,mat);}const m=new THREE.Mesh(geometry(`art${w}${h}`,()=>new THREE.PlaneGeometry(w,h)),mat);m.position.set(x,y,z);m.rotation.y=ry;root.add(m);}
  // 地面只占櫃檯左側，主圖懸在招牌上方，保留中央及右側通路。
  solids.push(box(.42,.13,.36,C.ink,-1.15,.065));
  solids.push(box(.13,2.72,.13,C.wood,-1.15,1.42));
  box(.22,.09,.21,C.gold,-1.15,.22);box(.22,.09,.21,C.gold,-1.15,2.66);
  box(1.28,.10,.13,C.wood,-.55,2.70);
  if(id==='D01'){
    // 卷紙兩軸與略下垂的紙面，筆尖朝下，筆桿斜倚並有套環。
    const paper=mesh(scrollGeometry(),C.paper,.12,3.93,1.86);paper.rotation.x=-.08;
    for(const x of [-.90,1.14]){cyl(.115,1.15,C.paper,x,3.40,1.87);for(const y of [2.79,4.01]){cyl(.09,.12,C.wood,x,y,1.87);cyl(.13,.035,C.gold,x,y+(y>3?.06:-.06),1.87);}}
    box(2.07,.045,.05,C.edge,.12,2.86,1.88);box(2.07,.045,.05,C.edge,.12,3.90,1.88);
    const brush=new THREE.Group();brush.position.set(-1.05,2.69,2.12);brush.rotation.z=-.30;brush.scale.set(.48,.48,.48);root.add(brush);
    const bc=createDecorCtx({THREE,toon,outlineMat:OUT},brush,'#800020');
    bc.cyl(.105,.075,2.55,C.wood,0,2.27,0,{seg:12,out:.012});
    for(const y of [1.01,3.55])bc.cyl(.12,.12,.09,C.gold,0,y,0,{seg:12,out:.009});
    bc.cyl(.115,.025,.57,C.paper,0,.68,0,{seg:12,out:.012});bc.cyl(.027,.002,.18,C.ink,0,.305,0,{seg:10,out:.005});
    cyl(.20,.10,C.ink,-1.02,2.78,2.12);box(.44,.08,.40,C.wood,-1.02,2.69,2.05);
    art('chinese-scroll',1.62,.83,.13,3.38,1.945,(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle=C.ink;g.textAlign='center';g.textBaseline='middle';g.font='700 118px "Noto Serif TC", "Songti TC", serif';g.fillText('文',w*.72,h*.47);g.fillText('學',w*.30,h*.56);g.fillStyle=C.red;g.fillRect(w*.09,h*.71,34,34);g.strokeStyle=C.paper;g.lineWidth=2;g.strokeRect(w*.09+5,h*.71+5,24,24);});
  }else if(id==='D02'){
    // 左右開展厚書，斜面與頁層提供真實體積，中央不做假拱門。
    for(const side of [-1,1]){
      const wing=new THREE.Group();wing.position.set(0,3.38,1.87);wing.rotation.y=side*.19;root.add(wing);
      const wc=createDecorCtx({THREE,toon,outlineMat:OUT},wing,'#800020');
      wc.box(1.18,1.43,.13,C.red,side*.58,0,-.06,{out:.016});
      for(let i=0;i<3;i++)wc.box(1.10-i*.025,1.32-i*.018,.045,i===2?C.paper:C.edge,side*(.57-i*.01),i*.013,.035+i*.045,{out:.004});
      wc.box(.04,1.27,.02,C.gold,side*1.045,.02,.158);
      for(const y of [-.52,.52])wc.box(1.00,.035,.02,C.gold,side*.55,y,.158);
    }
    cyl(.095,1.48,C.gold,0,3.38,1.88);
    // 一片翻起的弧頁，不抄參考展品圖文。
    const ps=new THREE.Shape();ps.moveTo(0,0);ps.bezierCurveTo(.12,.24,.45,.34,.63,.54);ps.lineTo(.65,.59);ps.bezierCurveTo(.43,.39,.12,.29,0,.06);ps.closePath();
    const pg=geometry('turning-page',()=>{const g=new THREE.ExtrudeGeometry(ps,{depth:1.18,bevelEnabled:false,curveSegments:10});g.rotateX(Math.PI/2);g.scale(1,1,.6);return g;});mesh(pg,C.paper,.01,3.99,1.97,.008);
    art('history-timeline',1.71,.88,0,3.38,2.155,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle=C.gold;g.lineWidth=8;g.beginPath();g.moveTo(35,h*.68);g.lineTo(w-35,h*.31);g.stroke();for(let i=0;i<4;i++){const x=55+i*(w-110)/3,y=h*.665-i*h*.11;g.fillStyle=C.red;g.beginPath();g.arc(x,y,11,0,Math.PI*2);g.fill();}g.fillStyle=C.ink;g.font='700 60px "Noto Serif TC",serif';g.textAlign='center';g.fillText('古今',w*.28,h*.37);g.fillText('世界',w*.73,h*.85);});
  }else{
    // 原創側臉剪影：額、鼻、上下唇、下巴與頸線都有轉折。
    const s=new THREE.Shape();s.moveTo(-.52,-.79);s.lineTo(.12,-.79);s.lineTo(.10,-.49);s.bezierCurveTo(.41,-.48,.53,-.40,.53,-.29);s.lineTo(.45,-.19);s.lineTo(.52,-.12);s.lineTo(.46,-.04);s.lineTo(.72,.02);s.lineTo(.51,.29);s.bezierCurveTo(.51,.71,.18,.91,-.22,.86);s.bezierCurveTo(-.77,.82,-.91,.42,-.82,.01);s.bezierCurveTo(-.79,-.28,-.55,-.38,-.52,-.79);s.closePath();
    const hole=new THREE.Path();hole.absellipse(-.20,.29,.30,.35,0,Math.PI*2,true,0);s.holes.push(hole);
    mesh(extrude('thinking-profile',s,.23),C.stone,.16,3.55,1.76,.018);
    box(1.52,.13,.43,C.blue,0,2.72,1.87);box(1.36,.045,.37,C.gold,0,2.80,1.87);
    // 開放的金色提問軌跡放在鏤空內，與輪廓同層，不用頭球或大字蓋住臉。
    const q=new THREE.Shape();q.moveTo(-.22,.23);q.bezierCurveTo(-.25,.54,.24,.55,.20,.26);q.bezierCurveTo(.18,.11,-.07,.10,-.07,-.06);q.lineTo(.01,-.06);q.bezierCurveTo(.01,.05,.28,.07,.28,.29);q.bezierCurveTo(.29,.66,-.35,.66,-.30,.23);q.closePath();
    mesh(extrude('question-curve',q,.025),C.gold,-.05,3.71,1.91,.003);cyl(.045,.035,C.gold,-.08,3.54,1.94,{rx:Math.PI/2});
    box(.13,.025,.018,C.ink,.62,3.84,2.015,0);
  }
  root.updateMatrixWorld(true);
  const parts=[...root.children],bounds=new THREE.Box3(),boxes=[];
  const inv=root.matrixWorld.clone().invert();
  root.traverse(m=>{if(!m.isMesh||m.material===OUT)return;m.geometry.computeBoundingBox();bounds.union(m.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld)));m.userData.bz26Landmark=id;});
  for(const m of solids)boxes.push(m.geometry.boundingBox.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld)));
  return {root,parts,bounds,boxes,source:`文學院原創候選：${id}`,candidate:true};
}
