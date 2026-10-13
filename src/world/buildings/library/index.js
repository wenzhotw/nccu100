/**
 * 中正圖書館：抬高的基座、階梯、梯形正面。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { GRAD, SPH, basic, block, canvasTex, flat, hText, mk, outline, plane, toon } from '../../../render/kit.js';
import { boxC, circC, colliders, obbC } from '../../../core/collision.js';
import { swZ } from '../../layout.js';
import { brickMat } from '../../terrain/ground.js';
import { tree } from '../../vegetation.js';
import { mbox } from '../../building-kit.js';
import { defineBuilding } from '../../registry.js';
import { asPrefab } from '../../prefabs/index.js';

// 這棟建築的位置與尺寸（地圖、碰撞、高度判斷都會用到）
const LBX=-46;
const LAMP_POLE=new THREE.CylinderGeometry(0.07,0.09,4,8), LAMP_HEAD=new THREE.ConeGeometry(0.42,0.22,12);

/**
 * 石獅（坐姿的傳統石獅，Q 版比例）：大頭、一圈捲毛鬃毛、凸眼、張嘴露牙、頸圈和鈴鐺、前腿直立、後腿蹲坐、捲尾巴。
 * 右邊那隻腳踩繡球，左邊那隻腳邊有小獅子（傳統一公一母）。原點在台座頂面，臉朝 +z。
 */
function makeLion(s){
  const g=new THREE.Group(), ST=toon('#dcd7cc'), CURL=toon('#aca394'), DARK=toon('#5f584e');
  const sp=(x,y,z,sx,sy,sz,mat,out)=>{ const m=mk(SPH,mat||ST,x,y,z,{parent:g,out:out??0.025}); m.scale.set(sx,sy??sx,sz??sx); return m; };
  // 身體：後半蹲坐、胸口挺起
  sp(0,0.3,-0.12,0.36,0.32,0.4);
  sp(0,0.58,0.1,0.3,0.36,0.27);
  // 後腿（兩側鼓起）與後腳掌
  [-1,1].forEach(k=>{ sp(k*0.22,0.2,-0.08,0.15,0.2,0.27); sp(k*0.22,0.06,0.16,0.1,0.06,0.12); });
  // 前腿與前腳掌
  [-1,1].forEach(k=>{ const l=mk(new THREE.CapsuleGeometry(0.075,0.32,4,10),ST,k*0.13,0.25,0.25,{parent:g,out:0.02}); l.rotation.x=0.08;
    sp(k*0.13,0.06,0.32,0.1,0.07,0.12); });
  // 腳邊：右獅踩繡球，左獅帶小獅子
  if(s>0){ sp(0.15,0.11,0.42,0.12,0.12,0.12,CURL); for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; sp(0.15+Math.cos(a)*0.1,0.11+Math.sin(a)*0.1,0.48,0.03,0.03,0.03,CURL,0); } }
  else { sp(-0.17,0.12,0.42,0.1,0.1,0.11); sp(-0.17,0.24,0.47,0.08,0.08,0.08); }
  // 頸圈和鈴鐺
  const col=mk(new THREE.TorusGeometry(0.2,0.035,6,18),CURL,0,0.8,0.12,{parent:g}); col.rotation.x=Math.PI/2-0.25;
  sp(0,0.7,0.33,0.065,0.065,0.065,CURL);
  // 頭：大大的，一圈捲毛
  const head=new THREE.Group(); head.position.set(0,1.02,0.2); g.add(head); g.userData.head=head;
  const hp=(x,y,z,sx,sy,sz,mat,out)=>{ const m=mk(SPH,mat||ST,x,y,z,{parent:head,out:out??0.025}); m.scale.set(sx,sy??sx,sz??sx); return m; };
  hp(0,0,0,0.29,0.27,0.27);
  for(let i=0;i<12;i++){ const a=i/12*Math.PI*2; hp(Math.cos(a)*0.3,Math.sin(a)*0.28+0.02,-0.06,0.09,0.09,0.08,CURL,0.015); }
  for(let i=0;i<7;i++){ const a=(i/6-0.5)*2.4; hp(Math.sin(a)*0.2,0.24+Math.cos(a)*0.06,-0.14,0.08,0.07,0.08,CURL,0.015); }
  // 耳朵、眉毛、凸眼、寬鼻、張開的嘴和牙
  [-1,1].forEach(k=>{ hp(k*0.25,0.18,0.02,0.07,0.06,0.05);
    hp(k*0.11,0.11,0.21,0.09,0.035,0.05,CURL,0);
    hp(k*0.11,0.04,0.22,0.075,0.075,0.06);
    hp(k*0.11,0.04,0.272,0.03,0.03,0.015,DARK,0); });
  hp(0,-0.04,0.27,0.1,0.06,0.07);
  hp(0,-0.15,0.22,0.13,0.06,0.05,toon('#a8746e'),0);
  [-1,1].forEach(k=>hp(k*0.07,-0.12,0.255,0.025,0.03,0.02,toon('#ffffff'),0));
  // 捲尾巴
  [[0,0.42,-0.48,0.1],[0,0.6,-0.5,0.11],[0.02,0.76,-0.44,0.1]].forEach(([x,y,z,r])=>sp(x,y,z,r,r,r,CURL,0.015));
  return g;
}

function build() {
  /* ---------- 中正圖書館：抬高的基座、四段階梯、梯形正面、格柵牆、直條遮陽頂帶 ---------- */
  const LC='#ece6d8', LC2='#ddd5c4', LTAN='#c9ad84', LPIL='#bdb8ad', LSTEP='#aeadaa', LBRICK='#c4735d';
  const boxT=(x0,x1,z0,z1,top)=>colliders.push({x0,x1,z0,z1,top});
  function finTex(rx){ return canvasTex(256,128,(g,w,h)=>{ g.fillStyle='#ece6d8'; g.fillRect(0,0,w,h);
    for(let x=0;x<w;x+=32){ g.fillStyle='#9fb2bc'; g.fillRect(x+9,30,15,58); g.fillStyle='#f6f3ec'; g.fillRect(x+9,57,15,3); g.fillRect(x+15,30,3,58);
      g.fillStyle='#c4bcab'; g.fillRect(x+24,0,8,h); g.fillStyle='#fbf9f4'; g.fillRect(x,0,8,h); }
    g.fillStyle='#d8d0bf'; g.fillRect(0,0,w,10); g.fillRect(0,h-14,w,14); },[rx,1]); }
  const finMat=rx=>new THREE.MeshToonMaterial({map:finTex(rx),gradientMap:GRAD});
  function sideTex(rx,ry){ return canvasTex(128,128,(g,w,h)=>{ g.fillStyle=LC; g.fillRect(0,0,w,h);
    g.fillStyle='#a9bcc4'; g.fillRect(0,18,w,44); g.fillStyle='#f6f3ec'; for(let x=0;x<=w;x+=32) g.fillRect(x,18,4,44); g.fillRect(0,38,w,3);
    g.fillStyle=LTAN; g.fillRect(0,70,w,40); },[rx,ry]); }
  const sideMat=(rx,ry)=>new THREE.MeshToonMaterial({map:sideTex(rx,ry),gradientMap:GRAD});
  const latTex2=canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#f3efe6'; g.fillRect(0,0,w,h);
    for(let x=0;x<w;x+=32) for(let y=0;y<h;y+=32){ g.fillStyle='#8f8a80'; g.fillRect(x+6,y+6,20,20); g.fillStyle='#c8c2b5'; g.fillRect(x+6,y+6,20,5); g.fillRect(x+6,y+6,5,20); } },[3,3]);
  const libFacTex=canvasTex(1024,512,(g,w,h)=>{
    const px=512/11.2, Y=m=>Math.round(m*px);
    const winBand=(y0,y1)=>{ g.fillStyle='#9fb3bd'; g.fillRect(0,y0,w,y1-y0); g.fillStyle='rgba(255,255,255,.25)'; g.fillRect(0,y0,w,(y1-y0)*0.3);
      g.fillStyle='#f4f1ea'; for(let x=0;x<=w;x+=40) g.fillRect(x-3,y0,6,y1-y0); g.fillRect(0,y0,w,6); g.fillRect(0,y1-6,w,6); g.fillRect(0,(y0+y1)/2-2,w,4); };
    winBand(Y(0),Y(2.2)); g.fillStyle=LTAN; g.fillRect(0,Y(2.2),w,Y(1.6));
    winBand(Y(3.8),Y(6.0)); g.fillStyle=LTAN; g.fillRect(0,Y(6.0),w,Y(1.4));
    g.fillStyle='#e9cf9d'; g.fillRect(0,Y(7.4),w,h-Y(7.4));
    g.fillStyle='rgba(255,240,200,.6)'; for(let x=30;x<w;x+=110){ g.beginPath(); g.arc(x,Y(8.6),10,0,7); g.fill(); }
    g.fillStyle='#7d7a74'; for(let x=0;x<=w;x+=52) g.fillRect(x-3,Y(7.4),6,h-Y(7.4)); g.fillRect(0,Y(7.4),w,8); g.fillRect(0,Y(8.3),w,4);
    g.fillStyle='#5b4a3a'; g.fillRect(w/2-60,Y(8.3),120,h-Y(8.3));
  });
  /* 正面中段 */
  mbox(LBX,9.2,-109,26,11.2,10,toon(LC),sideMat(3,3),sideMat(3,3),0.06);
  plane(26,11.2,new THREE.MeshToonMaterial({map:libFacTex,gradientMap:GRAD}),LBX,9.2,-103.98);
  [-13,-4.33,4.33,13].forEach(dx=>block(LBX+dx,9.2,-103.6,1.1,11.2,0.8,LPIL,0.03));
  const libName=hText('館書圖正中','#c69b3c','700 120px "Noto Serif TC","Songti TC",serif',880,160,110);
  plane(5.6,1.15,basic({map:libName,transparent:true}),LBX,11.85,-103.95);
  block(LBX,16.7,-108.6,28,3.8,12.4,finMat(14),0.06);
  for(let dx=-13;dx<=13.01;dx+=1.3) block(LBX+dx,14.35,-103.3,0.3,0.9,1.4,LC,0.015);
  block(LBX,18.75,-108.6,28.4,0.3,12.8,LC2,0.03);
  /* 斜向兩翼：格柵牆 */
  function libWing(cx,cz,th){
    const g=new THREE.Group(); g.position.set(cx,0,cz); g.rotation.y=th; scene.add(g);
    block(0,1.8,0,13,3.6,10,LC2,0.04,g);
    block(0,9.2,0,13,11.2,10,sideMat(4,3),0.05,g);
    const lp=new THREE.Mesh(new THREE.PlaneGeometry(12.4,10.6),new THREE.MeshToonMaterial({map:latTex2,gradientMap:GRAD})); lp.position.set(0,9.2,5.02); g.add(lp);
    block(0,16.7,0.6,13.6,3.8,11.4,finMat(7),0.06,g);
    for(let x=-6.2;x<=6.21;x+=1.3) block(x,14.35,5.3,0.3,0.9,1.3,LC,0.015,g);
    block(0,18.75,0.6,14,0.3,11.8,LC2,0.03,g);
    obbC(cx,cz,6.6,5.1,th);
  }
  libWing(LBX-21.1,-105.3,0.5);
  libWing(LBX+21.1,-105.3,-0.5);
  /* 兩側與後段，圍出中庭 */
  [-1,1].forEach(s=>{ mbox(LBX+s*21.5,7.4,-116.5,9,14.8,13,sideMat(3,4),sideMat(4,4),sideMat(4,4),0.06); block(LBX+s*21.5,16.7,-116.5,9.6,3.8,13.6,finMat(5),0.05); block(LBX+s*21.5,18.75,-116.5,10,0.3,14,LC2,0.03); });
  mbox(LBX,7.4,-121,34,14.8,4,sideMat(10,4),sideMat(1,4),sideMat(1,4),0.06);
  block(LBX,16.7,-121,34,3.8,4.6,finMat(17),0.05);
  block(LBX,9,-110,26,0.1,8,'#ddd5c4');
  [-4,4].forEach(dx=>mk(new THREE.CylinderGeometry(1.3,1.3,2.4,16),toon('#d7d5cf'),LBX+dx,20.1,-112,{out:0.04}));
  block(LBX-21.5,19.9,-117,5,2,6,'#e7e4dd',0.03);
  block(LBX+21.5,19.9,-117,5,2,6,'#e7e4dd',0.03);
  mk(new THREE.CylinderGeometry(0.07,0.09,9,6),toon('#d9d9d9'),LBX,23.4,-106,{out:0.02});
  { const flagTex=canvasTex(192,128,(g,w,h)=>{ g.fillStyle='#d9282f'; g.fillRect(0,0,w,h); g.fillStyle='#1f3c8f'; g.fillRect(0,0,w/2,h/2); g.fillStyle='#ffffff'; g.beginPath(); g.arc(w/4,h/4,16,0,7); g.fill(); });
    const fg=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.6,8,1),new THREE.MeshToonMaterial({map:flagTex,gradientMap:GRAD,side:THREE.DoubleSide}));
    fg.position.set(LBX+1.25,27,-106); scene.add(fg); }
  boxC(LBX-13,LBX+13,-114,-104);
  [-1,1].forEach(s=>boxC(LBX+s*21.5-4.6,LBX+s*21.5+4.6,-123.2,-109.8));
  boxC(LBX-17,LBX+17,-123.2,-119);
  /* 基座平台（高 3.6） */
  block(LBX,1.8,-99,40,3.6,10,'#d6d0c4',0.05);
  { const st=canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#cfcac0'; g.fillRect(0,0,w,h); g.strokeStyle='#bdb7ab'; g.lineWidth=2; for(let i=0;i<=w;i+=32){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,h); g.stroke(); g.beginPath(); g.moveTo(0,i); g.lineTo(w,i); g.stroke(); } },[8,2]);
    plane(40,10,new THREE.MeshToonMaterial({map:st,gradientMap:GRAD}),LBX,3.605,-99,-Math.PI/2);
    const ct=canvasTex(256,256,(g)=>{ g.strokeStyle='#a39c8e'; g.lineWidth=7; [110,80,50,20].forEach(r=>{ g.beginPath(); g.arc(128,128,r,0,7); g.stroke(); }); });
    plane(6,6,basic({map:ct,transparent:true}),LBX,3.615,-98,-Math.PI/2); }
  [-1,1].forEach(s=>{ block(LBX+s*14,4.1,-94.3,12,1,0.5,'#f2efe8',0.02); block(LBX+s*19.75,4.1,-99,0.5,1,10,'#f2efe8',0.02);
    boxT(LBX+s*20-0.5,LBX+s*20+0.5,-104,-94,3.4); });
  /* 前方：兩段灰石階梯、中間平台與石獅、兩側草坪與紅磚邊帶 */
  const STEPC='#9d9fa3', STEPE='#dcdcd6';
  for(let i=1;i<=7;i++){ const h=0.2*i; block(LBX,h/2,-78-0.57*(i-0.5),22,h,0.57,i%2?STEPC:'#a6a8ac',0.01); }
  flat(22.4,0.35,STEPE,LBX,0.025,-77.8);
  block(LBX,0.7,-84,22,1.4,4,'#a7a8aa',0.02);
  flat(22,0.3,STEPE,LBX,1.41,-82.2);
  flat(22,0.3,STEPE,LBX,1.41,-85.85);
  for(let i=1;i<=11;i++){ const h=1.4+0.2*i; block(LBX,h/2,-86-0.727*(i-0.5),18,h,0.727,i%2?STEPC:'#a6a8ac',0.01); }
  [-1,1].forEach(s=>{
    block(LBX+s*9.4,1.8,-90,0.8,3.6,8,'#b5b6b8',0.02); boxC(s>0?LBX+9:LBX-9.8,s>0?LBX+9.8:LBX-9,-94,-86);
    boxT(s>0?LBX+9:LBX-20,s>0?LBX+20:LBX-9,-104,-93.8,3.4);
    block(LBX+s*8.6,3.2,-90,0.06,0.06,8.5,'#c9ccd0'); [-86.5,-88.5,-90.5,-92.5].forEach(z=>block(LBX+s*8.6,2.7-(z+86.5)*-0.27,z,0.06,1,0.06,'#c9ccd0'));
    /* 石獅：在第一段階梯上方的平台兩側 */
    const x=LBX+s*10.2, z=-83.6, y0=1.4;
    block(x,y0+0.55,z,1,1.1,1,'#efece6',0.02);
    // 獅子本體放在一個群組裡（名稱「石獅-左／右」），天氣系統會讓它跳下台座講話（systems/weather）
    const lion=makeLion(s); lion.name=s>0?'石獅-右':'石獅-左'; lion.position.set(x,y0+1.1,z); scene.add(lion); circC(x,z,0.6);
    /* 紅磚邊帶與草坪上的細磚步道 */
    flat(1.1,18,brickMat(1,9),LBX+s*11.6,0.03,-85);
    [14.5,17.5].forEach(d=>block(LBX+s*d,0.08,-86,0.7,0.16,16,brickMat(1,8),0.01));
    block(LBX+s*16,0.08,-77.7,9,0.16,0.7,brickMat(4,1),0.01);
    tree(LBX+s*18.6,-90,0.85);
    /* 白色路燈 */
    const lx=LBX+s*12.6, lz=-80.5;
    asPrefab(()=>{   // 白色路燈（工具箱預製物件）
      mk(LAMP_POLE,toon('#efefea'),lx,2,lz,{out:0.02});
      mk(LAMP_HEAD,toon('#efefea'),lx,4.15,lz,{out:0.02});
      mk(SPH,toon('#fff6dc',{emissive:'#ffe6a8',emissiveIntensity:0.6}),lx,3.95,lz,{}).scale.setScalar(0.18);
    }); circC(lx,lz,0.15);
  });
  /* NCCU 白色立牌 */
  { const t=canvasTex(128,320,(g,w,h)=>{ g.fillStyle='#ecebe6'; g.fillRect(0,0,w,h); g.fillStyle='#7b6a5e'; g.fillRect(10,14,w-20,46);
      g.fillStyle='#8a3a3a'; g.font='italic 900 34px Georgia,serif'; g.textAlign='center'; g.fillText('NCCU',w/2,140); g.fillRect(24,150,w-48,3); g.font='12px sans-serif'; g.fillText('政治大學',w/2,172); });
    const x=LBX-19, z=-77.2; block(x,1.2,z,0.9,2.4,0.4,'#ecebe6',0.03);
    [0.21,-0.21].forEach((dz,i)=>plane(0.86,2.3,basic({map:t}),x,1.2,z+dz,0,i?0:Math.PI)); boxC(x-0.5,x+0.5,z-0.25,z+0.25); }
  /* 四維道上的樹陣與白色小路燈（商學院與圖書館之間） */
  [-72,-66,-60,-40,-34].forEach(x=>[-3.2,3.2].forEach(dz=>{ const z=swZ(x)+dz; flat(1.6,1.6,'#4c4d50',x,0.03,z); tree(x,z,0.75); }));
  [-57,-43].forEach(x=>{ const z=swZ(x)+3.6; mk(new THREE.CylinderGeometry(0.06,0.07,3.4,6),toon('#c9ccd0'),x,1.7,z,{out:0.015}); block(x,3.5,z,0.4,0.18,0.4,'#e6e7e8',0.02); circC(x,z,0.12); });
  [[LBX-26,-68],[LBX-24,-72.5],[LBX+6,-73]].forEach(p=>tree(p[0],p[1],0.65));
}

export default defineBuilding({
  id: 'library',
  name: '中正圖書館',
  build,
  // 兩段灰石階梯與抬高的入口平台
  heightAt(x, z) {
    const dx = Math.abs(x - LBX);
    if (dx < 11 && z <= -78 && z > -82) return Math.min(1.4, 0.2 * Math.ceil((-78 - z) / 0.57));
    if (dx < 11 && z <= -82 && z > -86) return 1.4;
    if (dx < 9 && z <= -86 && z > -94) return Math.min(3.6, 1.4 + 0.2 * Math.ceil((-86 - z) / 0.727));
    if (dx < 20 && z <= -94 && z > -104) return 3.6;
    return null;
  },
  zones: [{ priority: 160, test: p => (p.x < -19 && p.z < swZ(p.x)) ? '中正圖書館前' : null }],
  map: [{ x: -46, z: -110, w: 44, d: 26, color: '#e6dccb', label: '中正圖書館' }],
});
