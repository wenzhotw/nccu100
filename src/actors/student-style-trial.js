/** 大眼少年三表情：平斜上瞼切住虹膜，輪廓與顏色分層，仍只用既有三張 canvas。 */
export function drawStudentStyleFace(g,brow,mode){
 g.save();g.lineCap='round';g.lineJoin='round';
 for(const [cx,sign] of [[76,-1],[180,1]]){
  const cy=96,x=v=>cx+sign*v*.80;
  if(mode==='closed'){
   g.strokeStyle='#2a2c4a';g.lineWidth=5;g.beginPath();g.moveTo(x(-30),cy+3);g.quadraticCurveTo(cx,cy+13,x(32),cy-3);g.stroke();
  }else{
   const panic=mode==='panic',top=panic?-49:-47;
   g.beginPath();g.moveTo(x(-31),cy+1);g.bezierCurveTo(x(-25),cy+top,x(13),cy+top-4,x(32),cy-8);g.bezierCurveTo(x(32),cy+31,x(-20),cy+45,x(-31),cy+1);g.closePath();
   g.fillStyle='#fff8ee';g.fill();g.save();g.clip();
   const rx=panic?15:21,ry=panic?28:39;
   g.fillStyle='#3b414c';g.beginPath();g.ellipse(cx,cy-3,rx,ry,0,0,Math.PI*2);g.fill();
   g.fillStyle='#535f6b';g.beginPath();g.ellipse(cx,cy+14,rx-3,ry*.43,0,0,Math.PI*2);g.fill();
   g.fillStyle='#252b3b';g.beginPath();g.ellipse(cx,cy-5,panic?7:12,panic?13:24,0,0,Math.PI*2);g.fill();
   g.fillStyle='#fff8ee';g.beginPath();g.ellipse(cx-6,cy-12,4.5,6,0,0,Math.PI*2);g.fill();g.restore();
   g.strokeStyle='#2a2c4a';g.lineWidth=5.5;g.beginPath();g.moveTo(x(-31),cy+1);g.bezierCurveTo(x(-25),cy+top,x(13),cy+top-4,x(32),cy-8);g.lineTo(x(36),cy-10);g.stroke();
   g.lineWidth=1.6;g.beginPath();g.moveTo(x(27),cy+16);g.quadraticCurveTo(cx,cy+38,x(-19),cy+24);g.stroke();
  }
  g.fillStyle=brow;g.beginPath();
  if(mode==='panic'){g.moveTo(x(-28),cy-51);g.lineTo(x(-4),cy-60);g.lineTo(x(29),cy-50);g.lineTo(x(25),cy-44);g.lineTo(x(-4),cy-51);}
  else{g.moveTo(x(-27),cy-47);g.lineTo(x(5),cy-57);g.lineTo(x(31),cy-51);g.lineTo(x(24),cy-44);g.lineTo(x(5),cy-47);g.lineTo(x(-27),cy-40);}g.closePath();g.fill();
 }
 // 鼻樑、鼻尖與口鼻面由頭面連續幾何表達，嘴線保持短小而非大弧笑臉。
 if(mode==='panic'){g.fillStyle='#9a4a50';g.beginPath();g.ellipse(128,183,12,13,0,0,Math.PI*2);g.fill();}
 else{g.strokeStyle='#8c5553';g.lineWidth=2.5;g.beginPath();g.moveTo(107,183);g.quadraticCurveTo(128,189,149,183);g.stroke();}
 g.restore();
}
