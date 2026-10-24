/** 日系卡通大眼的三表情，仍畫在既有三張 canvas，不增加貼圖或寫實漸層。 */
export function drawStudentStyleFace(g,brow,mode){
 g.save();g.lineCap='round';g.lineJoin='round';
 for(const cx of [76,180]){
  const cy=96;
  if(mode==='closed'){
   g.strokeStyle='#2a2c4a';g.lineWidth=5;g.beginPath();g.moveTo(cx-33,cy+1);g.quadraticCurveTo(cx,cy+19,cx+33,cy+1);g.stroke();
   g.lineWidth=3;g.beginPath();g.moveTo(cx-17,cy+6);g.lineTo(cx-32,cy+3);g.moveTo(cx+17,cy+6);g.lineTo(cx+32,cy+3);g.stroke();
  }else{
   g.beginPath();g.moveTo(cx-32,cy-4);g.bezierCurveTo(cx-28,cy-48,cx+28,cy-48,cx+32,cy-4);g.bezierCurveTo(cx+34,cy+39,cx-30,cy+39,cx-32,cy-4);g.closePath();
   g.fillStyle='#fff8ee';g.fill();g.save();g.clip();
   const panic=mode==='panic',rx=panic?16:22,ry=panic?27:38;
   g.fillStyle='#657078';g.beginPath();g.ellipse(cx,cy+1,rx,ry,0,0,Math.PI*2);g.fill();
   g.fillStyle='#a3b5b8';g.beginPath();g.ellipse(cx,cy+10,rx-2,ry*.5,0,0,Math.PI*2);g.fill();
   g.fillStyle='#2a2c4a';g.beginPath();g.ellipse(cx,cy-2,panic?7:11,panic?13:21,0,0,Math.PI*2);g.fill();
   g.fillStyle='#ffffff';g.beginPath();g.arc(cx-5,cy-10,5,0,Math.PI*2);g.arc(cx+6,cy+8,2.5,0,Math.PI*2);g.fill();g.restore();
   g.strokeStyle='#2a2c4a';g.lineWidth=6;g.beginPath();g.moveTo(cx-32,cy-4);g.bezierCurveTo(cx-28,cy-48,cx+28,cy-48,cx+32,cy-4);g.stroke();
  }
  g.strokeStyle=brow;g.lineWidth=4;g.beginPath();
  if(mode==='panic'){g.moveTo(cx-28,cy-48);g.quadraticCurveTo(cx,cy-56,cx+28,cy-50);}
  else{g.moveTo(cx-28,cy-46);g.quadraticCurveTo(cx,cy-53,cx+28,cy-46);}g.stroke();
 }
 g.fillStyle='rgba(255,130,130,.24)';for(const x of [57,199]){g.beginPath();g.ellipse(x,151,13,6,0,0,Math.PI*2);g.fill();}
 // 鼻樑與鼻尖由頭面幾何表達，不再畫三角鼻點。
 if(mode==='panic'){g.fillStyle='#9a4a50';g.beginPath();g.ellipse(128,183,14,13,0,0,Math.PI*2);g.fill();}
 else{g.strokeStyle='#9a4a50';g.lineWidth=3;g.beginPath();g.moveTo(98,183);g.quadraticCurveTo(128,194,158,183);g.stroke();}
 g.restore();
}
