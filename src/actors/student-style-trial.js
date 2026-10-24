/** 普通學生的隔離造型樣板。只供建構期明確選用，不改全域幾何或已登記的來源。 */
import * as THREE from 'three';
let shapes;
function sharedShapes(){
 if(shapes)return shapes;
 // 延後到試點才配置，正常遊戲不增加資源或改變原建構亂數順序。
 const hand=new THREE.SphereGeometry(1,12,8);
 const shoe=new THREE.SphereGeometry(1,12,8);
 const power=(n,e)=>Math.sign(n)*Math.pow(Math.abs(n),e);
 const p=shoe.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  // 同一球面拓撲：寬圓鞋頭、收窄後跟、完整腳背及平底，不新增材質或零件。
  const sole=y<0?Math.max(-.9,y)/.9:y*(1-.25*Math.max(0,z)+.1*(1-z*z));
  p.setXYZ(i,power(x,.7)*(1+.12*z),sole,power(z,.7));
 }
 shoe.computeVertexNormals();
 const cap=new THREE.SphereGeometry(.296,16,12,0,Math.PI*2,0,Math.PI*.38);
 const cp=cap.attributes.position,edge=Math.PI*.38;
 for(let i=0;i<cp.count;i++){
  const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i),theta=Math.acos(Math.min(1,Math.max(-1,y/.296)));
  // 沿同一球面抬起前額帽緣，讓斜瀏海主導前方輪廓，不把髮殼推出頭皮。
  const next=theta*(1-.28*Math.pow(Math.max(0,z/.296),2)*Math.pow(theta/edge,2));
  const ratio=Math.sin(theta)>1e-6?Math.sin(next)/Math.sin(theta):1;
  cp.setXYZ(i,x*ratio,.296*Math.cos(next),z*ratio);
 }
 cap.computeVertexNormals();
 const fringe=new THREE.SphereGeometry(1,12,8),fp=fringe.attributes.position;
 for(let i=0;i<fp.count;i++){
  const x=fp.getX(i),y=fp.getY(i),z=fp.getZ(i);
  fp.setXYZ(i,x,y*.65+x*.5,z*.85);
 }
 fringe.computeVertexNormals();
 const bag=new THREE.SphereGeometry(.5,16,12),bp=bag.attributes.position;
 for(let i=0;i<bp.count;i++){
  // 基本球面受控映射為圓角矩形薄包，仍保留原背包的長寬厚與掛點。
  bp.setXYZ(i,.5*power(bp.getX(i)/.5,.4),.5*power(bp.getY(i)/.5,.4),.5*power(bp.getZ(i)/.5,.65));
 }
 bag.computeVertexNormals();
 shapes={hand,shoe,cap,back:new THREE.SphereGeometry(.299,16,12,Math.PI/2+1.05,Math.PI*2-2.1,0,Math.PI*.66),fringe,bag};
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

/** 日系卡通大眼的三表情，仍畫在既有三張 canvas，不增加貼圖或寫實漸層。 */
export function drawStudentStyleFace(g,brow,mode){
 g.save();g.translate(128,0);g.scale(.78,1);g.translate(-128,0);g.lineCap='round';g.lineJoin='round';
 for(const cx of [83,173]){
  const cy=113;
  if(mode==='closed'){
   g.strokeStyle='#2a2c4a';g.lineWidth=5;g.beginPath();g.moveTo(cx-21,cy+1);g.quadraticCurveTo(cx,cy+19,cx+21,cy+1);g.stroke();
   g.lineWidth=3;g.beginPath();g.moveTo(cx-17,cy+6);g.lineTo(cx-22,cy+3);g.moveTo(cx+17,cy+6);g.lineTo(cx+22,cy+3);g.stroke();
  }else{
   g.beginPath();g.moveTo(cx-22,cy-4);g.bezierCurveTo(cx-18,cy-31,cx+17,cy-31,cx+22,cy-4);g.bezierCurveTo(cx+24,cy+23,cx-20,cy+23,cx-22,cy-4);g.closePath();
   g.fillStyle='#fff8ee';g.fill();g.save();g.clip();
   const panic=mode==='panic',rx=panic?11:15,ry=panic?17:24;
   g.fillStyle='#52678b';g.beginPath();g.ellipse(cx,cy+1,rx,ry,0,0,Math.PI*2);g.fill();
   g.fillStyle='#8fb8d2';g.beginPath();g.ellipse(cx,cy+10,rx-2,ry*.5,0,0,Math.PI*2);g.fill();
   g.fillStyle='#2a2c4a';g.beginPath();g.ellipse(cx,cy-2,panic?5:7,panic?10:15,0,0,Math.PI*2);g.fill();
   g.fillStyle='#ffffff';g.beginPath();g.arc(cx-5,cy-10,5,0,Math.PI*2);g.arc(cx+6,cy+8,2.5,0,Math.PI*2);g.fill();g.restore();
   g.strokeStyle='#2a2c4a';g.lineWidth=4;g.beginPath();g.moveTo(cx-22,cy-4);g.bezierCurveTo(cx-18,cy-31,cx+17,cy-31,cx+22,cy-4);g.stroke();
  }
  g.strokeStyle=brow;g.lineWidth=4;g.beginPath();
  if(mode==='panic'){g.moveTo(cx-18,cy-37);g.quadraticCurveTo(cx,cy-48,cx+18,cy-40);}
  else{g.moveTo(cx-18,cy-34);g.quadraticCurveTo(cx,cy-41,cx+18,cy-34);}g.stroke();
 }
 g.fillStyle='rgba(255,130,130,.24)';for(const x of [57,199]){g.beginPath();g.ellipse(x,151,13,6,0,0,Math.PI*2);g.fill();}
 g.strokeStyle='#d58e7b';g.lineWidth=2;g.beginPath();g.moveTo(128,145);g.lineTo(125,151);g.lineTo(129,152);g.stroke();
 if(mode==='panic'){g.fillStyle='#9a4a50';g.beginPath();g.ellipse(128,173,7,10,0,0,Math.PI*2);g.fill();}
 else{g.strokeStyle='#9a4a50';g.lineWidth=3;g.beginPath();g.moveTo(120,171);g.quadraticCurveTo(128,177,136,171);g.stroke();}
 g.restore();
}
