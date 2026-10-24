/** 日系卡通大眼的三表情，仍畫在既有三張 canvas，不增加貼圖或寫實漸層。 */
export function drawStudentStyleFace(g,brow,mode){
 g.save();g.translate(128,0);g.scale(.78,1);g.translate(-128,0);g.lineCap='round';g.lineJoin='round';
 for(const cx of [83,173]){
  const cy=96;
  if(mode==='closed'){
   g.strokeStyle='#2a2c4a';g.lineWidth=5;g.beginPath();g.moveTo(cx-21,cy+1);g.quadraticCurveTo(cx,cy+19,cx+21,cy+1);g.stroke();
   g.lineWidth=3;g.beginPath();g.moveTo(cx-17,cy+6);g.lineTo(cx-27,cy+3);g.moveTo(cx+17,cy+6);g.lineTo(cx+27,cy+3);g.stroke();
  }else{
   g.beginPath();g.moveTo(cx-27,cy-4);g.bezierCurveTo(cx-22,cy-33,cx+22,cy-33,cx+27,cy-4);g.bezierCurveTo(cx+28,cy+25,cx-25,cy+25,cx-27,cy-4);g.closePath();
   g.fillStyle='#fff8ee';g.fill();g.save();g.clip();
   const panic=mode==='panic',rx=panic?13:18,ry=panic?19:26;
   g.fillStyle='#52678b';g.beginPath();g.ellipse(cx,cy+1,rx,ry,0,0,Math.PI*2);g.fill();
   g.fillStyle='#8fb8d2';g.beginPath();g.ellipse(cx,cy+10,rx-2,ry*.5,0,0,Math.PI*2);g.fill();
   g.fillStyle='#2a2c4a';g.beginPath();g.ellipse(cx,cy-2,panic?5:7,panic?10:15,0,0,Math.PI*2);g.fill();
   g.fillStyle='#ffffff';g.beginPath();g.arc(cx-5,cy-10,5,0,Math.PI*2);g.arc(cx+6,cy+8,2.5,0,Math.PI*2);g.fill();g.restore();
   g.strokeStyle='#2a2c4a';g.lineWidth=4;g.beginPath();g.moveTo(cx-27,cy-4);g.bezierCurveTo(cx-22,cy-33,cx+22,cy-33,cx+27,cy-4);g.stroke();
  }
  g.strokeStyle=brow;g.lineWidth=4;g.beginPath();
  if(mode==='panic'){g.moveTo(cx-18,cy-37);g.quadraticCurveTo(cx,cy-48,cx+18,cy-40);}
  else{g.moveTo(cx-18,cy-34);g.quadraticCurveTo(cx,cy-41,cx+18,cy-34);}g.stroke();
 }
 g.fillStyle='rgba(255,130,130,.24)';for(const x of [57,199]){g.beginPath();g.ellipse(x,151,13,6,0,0,Math.PI*2);g.fill();}
 g.strokeStyle='#d58e7b';g.lineWidth=2;g.beginPath();g.moveTo(128,145);g.lineTo(125,151);g.lineTo(129,152);g.stroke();
 if(mode==='panic'){g.fillStyle='#9a4a50';g.beginPath();g.ellipse(128,183,8,10,0,0,Math.PI*2);g.fill();}
 else{g.strokeStyle='#9a4a50';g.lineWidth=3;g.beginPath();g.moveTo(117,183);g.quadraticCurveTo(128,189,139,183);g.stroke();}
 g.restore();
}
