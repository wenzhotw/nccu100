/**
 * 行政大樓。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { BOX, GRAD, SPH, basic, block, canvasTex, flat, hText, mk, outline, plane, toon } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { swZ } from '../../layout.js';
import { defineBuilding } from '../../registry.js';

/* ---------- 門前坡道（依實景照片）：從左邊車道那一側往右上升到入口平台的高度 ---------- */
const WALK = { x0: 28.5, xr: 38, x1: 61.2, zIn: -70, zOut: -66, top: 1.2 };
/** 門前紅磚坡道的高度；不在坡道上回傳 null */
function walkH(x, z) {
  if (z <= WALK.zIn || z > WALK.zOut || x < WALK.x0) return null;
  if (x < WALK.xr) return WALK.top * (x - WALK.x0) / (WALK.xr - WALK.x0);
  if (x <= WALK.x1) return WALK.top;
  // 右端往下三階回到地面
  if (x <= WALK.x1 + 0.5) return 0.9;
  if (x <= WALK.x1 + 1) return 0.6;
  if (x <= WALK.x1 + 1.5) return 0.3;
  return null;
}

function build() {
  /* ---------- 行政大樓（四維堂右側）：灰色花崗石、深窗、中央凹入門廊、頂部直條窗、一樓柱廊 ---------- */
  const AD={x:45,z:-83};
  const adG=new THREE.Group();
  adG.position.set(AD.x,0,AD.z);
  scene.add(adG);
  // 花崗石底：淺灰加黑白小斑點
  function granite(g,w,h){
    g.fillStyle='#a3a7ac'; g.fillRect(0,0,w,h);
    for(let i=0;i<260;i++){ g.fillStyle=i%3?'rgba(70,70,72,.22)':'rgba(255,255,255,.35)'; g.fillRect(Math.random()*w,Math.random()*h,1.5,1.5); }
    g.strokeStyle='#8e9297'; g.lineWidth=1; for(let i=0;i<=w;i+=32){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,h); g.stroke(); } for(let i=0;i<=h;i+=42){ g.beginPath(); g.moveTo(0,i); g.lineTo(w,i); g.stroke(); }
  }
  function adWinTex(rx,ry){ return canvasTex(128,128,(g,w,h)=>{
    granite(g,w,h);
    // 方形深窗：外框內縮一圈，上方與左側是陰影
    g.fillStyle='#8a8e93'; g.fillRect(30,22,68,74);
    g.fillStyle='#6f7378'; g.fillRect(30,22,10,74); g.fillRect(30,22,68,10);
    g.fillStyle='#3a4046'; g.fillRect(40,32,50,58);
    g.fillStyle='#262a2f'; g.fillRect(40,32,50,12);
    g.fillStyle='#5f6f7a'; g.fillRect(64,44,3,46);
    g.fillStyle='#b8bcc0'; g.fillRect(26,96,76,5);
  },[rx,ry]); }
  function adSlotTex(rx,ry){ return canvasTex(128,128,(g,w,h)=>{
    granite(g,w,h);
    [[26,0],[80,0]].forEach(([x])=>{ g.fillStyle='#a3a29c'; g.fillRect(x-4,10,30,112); g.fillStyle='#3a4046'; g.fillRect(x,14,22,104); g.fillStyle='#262a2f'; g.fillRect(x,14,6,104); });
  },[rx,ry]); }
  function adGlassTex(rx){ return canvasTex(128,64,(g,w,h)=>{ g.fillStyle='#5f7d82'; g.fillRect(0,0,w,h); g.fillStyle='rgba(255,255,255,.18)'; g.fillRect(0,0,w,18); g.fillStyle='#c9c8c2'; for(let x=0;x<=w;x+=32) g.fillRect(x-2,0,4,h); g.fillRect(0,40,w,3); },[rx,1]); }
  const tm=t=>new THREE.MeshToonMaterial({map:t,gradientMap:GRAD});
  const ADC='#a6aaaf', ADC2='#92969b', SIDE='#9da1a6';
  function adBox(x,y,z,sx,sy,sz,matF,matS,out){ const m=new THREE.Mesh(BOX,[matS,matS,toon(SIDE),toon(SIDE),matF,matS]); m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.castShadow=m.receiveShadow=true; adG.add(m); if(out){ const o=outline(m,0); o.scale.set(1+2*out/sx,1+2*out/sy,1+2*out/sz); } return m; }
  /* 一樓：內縮的玻璃量體＋柱廊。左側（靠車道）內縮比較多，留出可以走的騎樓（照片：騎樓、外梯、候車處） */
  const CORE_L=-10.2;
  adBox((CORE_L+14.2)/2,2.25,-0.2,14.2-CORE_L,4.5,23.6,tm(adGlassTex(9)),tm(adGlassTex(8)),0.04);
  for(let x=-15;x<=15.01;x+=3.75){ if(Math.abs(x)<7) continue; block(x,2.25,12.4,0.9,4.5,0.9,ADC,0.03,adG); }
  [-15.4,15.4].forEach(x=>{ for(let z=-11.5;z<=11.6;z+=4.6) block(x,2.25,z,0.9,4.5,0.9,ADC,0.03,adG); });
  /* 騎樓天花板（二樓樓板底） */
  block((-16+CORE_L)/2,4.45,-0.5,16+CORE_L,0.1,26,'#d8d7d1',0,adG);
  /* 騎樓內的外梯：靠玻璃量體，從前面往後爬上二樓，外側是厚實的石材矮牆 */
  { const x0=CORE_L-2, x1=CORE_L, zb=11.2, zt=3.2, n=14, run=(zb-zt)/n, rise=4.2/n;
    for(let i=0;i<n;i++) block((x0+x1)/2,rise*(i+0.5),zb-run*(i+0.5),x1-x0,rise,run,i%2?'#bebdb7':'#b4b3ad',0,adG);
    block((x0+x1)/2,4.2,zt-0.8,x1-x0,0.12,1.6,'#b4b3ad',0,adG);
    // 矮牆：沿樓梯斜上去，用擠出的梯形做
    const s=new THREE.Shape(); s.moveTo(zb+0.2,0); s.lineTo(zb+0.2,1.1); s.lineTo(zt,4.2+1.0); s.lineTo(zt-1.6,4.2+1.0); s.lineTo(zt-1.6,0); s.lineTo(zb+0.2,0);
    const g=new THREE.ExtrudeGeometry(s,{depth:0.4,bevelEnabled:false}); g.rotateY(-Math.PI/2);
    const w=new THREE.Mesh(g,toon(ADC)); w.position.set(x0,0,0); w.castShadow=w.receiveShadow=true; adG.add(w); outline(w,0.03); }
  /* 候車處：騎樓裡靠玻璃牆的長椅、時刻表看板 */
  [-3.5,-7.5].forEach(z=>{
    block(CORE_L-0.45,0.45,z,0.5,0.08,2.6,'#8a6a42',0.02,adG);
    block(CORE_L-0.2,0.75,z,0.08,0.5,2.6,'#8a6a42',0.02,adG);
    [-1.1,1.1].forEach(dz=>block(CORE_L-0.45,0.22,z+dz,0.42,0.44,0.08,'#6b7178',0,adG));
  });
  { const t=canvasTex(256,320,(g,w,h)=>{ g.fillStyle='#2f6f4f'; g.fillRect(0,0,w,h); g.fillStyle='#fff'; g.textAlign='center';
      g.font='900 40px "Noto Sans TC",sans-serif'; g.fillText('校園公車',w/2,56); g.font='700 28px "Noto Sans TC",sans-serif'; g.fillText('乘車處',w/2,96);
      g.fillStyle='#f4f4ee'; g.fillRect(20,116,w-40,184); g.fillStyle='#2c3138'; g.font='500 22px "Noto Sans TC",sans-serif'; g.textAlign='left';
      ['一路　往山上校區','　07:30 起','　每 15 分一班','　末班 22:00'].forEach((l,i)=>g.fillText(l,30,152+i*38)); });
    block(CORE_L-0.06,1.9,-5.5,0.1,1.7,1.4,'#2f6f4f',0.02,adG);
    const p=new THREE.Mesh(new THREE.PlaneGeometry(1.32,1.62),basic({map:t})); p.position.set(CORE_L-0.12,1.9,-5.5); p.rotation.y=-Math.PI/2; adG.add(p); }
  /* 二至六樓：後段主體與兩側前凸量體，中間凹入成門廊 */
  adBox(0,13.25,-2,32,17.5,22,tm(adWinTex(10,5)),tm(adWinTex(7,5)),0.07);
  [-11.25,11.25].forEach(x=>adBox(x,13.25,11,9.5,17.5,4,tm(adWinTex(3,5)),tm(adWinTex(1,5)),0.06));
  /* 門廊內：每層陽台、矮牆、兩根巨柱、校名 */
  [8,11.5,15,18.5].forEach(y=>{ block(0,y,10.8,13,0.35,3.6,ADC2,0.02,adG); block(0,y+0.6,12.45,13,1.1,0.3,ADC,0.02,adG); });
  [-3,3].forEach(x=>block(x,11,12.3,1.3,22,1.3,ADC,0.04,adG));
  block(0,21.6,12,13,0.8,2.4,ADC2,0.03,adG);
  const adName=hText('樓大政行','#2f2e2c','700 120px "Noto Serif TC","Songti TC",serif',760,160,110);
  { const m=new THREE.Mesh(new THREE.PlaneGeometry(5.6,1.0),basic({map:adName,transparent:true})); m.position.set(0,12.15,12.62); adG.add(m); }
  /* 一樓入口與門前平台（平台高度和坡道最高處一樣） */
  { const d=new THREE.Mesh(new THREE.PlaneGeometry(8,3.4),tm(adGlassTex(4))); d.position.set(0,2.9,11.62); adG.add(d); }
  block(0,0.6,12,14,1.2,6,'#b1b0aa',0.03,adG);
  /* 腰線、七八樓直條窗、屋頂 */
  block(0,22.4,0,33.6,0.8,27.6,ADC2,0.05,adG);
  adBox(0,25.9,0,33,6.2,27,tm(adSlotTex(10,2)),tm(adSlotTex(8,2)),0.07);
  block(0,29.3,0,33.6,0.6,27.6,ADC2,0.05,adG);
  block(-5,30.9,-3,11,2.6,9,'#bebdb7',0.04,adG);
  block(8,30.6,4,6,2,5,'#bebdb7',0.04,adG);
  [-9,-6].forEach(x=>{ const t=new THREE.Mesh(new THREE.CylinderGeometry(1,1,2.2,14),toon('#c9c5bc')); t.position.set(x,30.7,6); t.castShadow=true; adG.add(t); outline(t,0.04); });
  { const a=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,5,5),toon('#9a9a9a')); a.position.set(10,32.5,-6); adG.add(a); }

  /* ---------- 門前紅磚坡道：人字形紅磚夾灰色斜帶，外側是擋土牆和不鏽鋼扶手 ---------- */
  const brick=canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#c4694f'; g.fillRect(0,0,w,h);
    g.strokeStyle='#a5533d'; g.lineWidth=1.5;
    // 人字形鋪法：45 度交錯的短磚
    for(let y=-w;y<h+w;y+=16) for(let x=-w;x<w*2;x+=32){ g.beginPath(); g.moveTo(x,y); g.lineTo(x+16,y+16); g.lineTo(x+32,y); g.stroke(); g.beginPath(); g.moveTo(x+16,y+16); g.lineTo(x+16,y+32); g.stroke(); }
    for(let i=0;i<400;i++){ g.fillStyle='rgba(120,50,30,.15)'; g.fillRect(Math.random()*w,Math.random()*h,2,2); }
    g.strokeStyle='#64666a'; g.lineWidth=22; g.beginPath(); g.moveTo(-20,h*0.75); g.lineTo(w*0.6,-20); g.stroke(); g.beginPath(); g.moveTo(w*0.4,h+20); g.lineTo(w+20,h*0.25); g.stroke(); },[1/5,1/5]);
  const brickM=tm(brick), wallM=toon('#a9a8a2');
  { const s=new THREE.Shape(); s.moveTo(WALK.x0,-0.1); s.lineTo(WALK.x0,0.02); s.lineTo(WALK.xr,WALK.top); s.lineTo(WALK.x1,WALK.top); s.lineTo(WALK.x1,-0.1); s.lineTo(WALK.x0,-0.1);
    const g=new THREE.ExtrudeGeometry(s,{depth:WALK.zOut-WALK.zIn,bevelEnabled:false});
    const m=new THREE.Mesh(g,[wallM,brickM]); m.position.z=WALK.zIn; m.castShadow=m.receiveShadow=true; scene.add(m); outline(m,0.03); }
  // 右端三階
  [[0.9,0.25],[0.6,0.75],[0.3,1.25]].forEach(([h,dx])=>block(WALK.x1+dx,h/2,(WALK.zIn+WALK.zOut)/2,0.5,h,WALK.zOut-WALK.zIn,'#bebdb7',0.02));
  // 坡道靠牆那一側的排水溝蓋
  flat(WALK.x1-WALK.xr,0.25,'#7c7e82',(WALK.xr+WALK.x1)/2,WALK.top+0.01,WALK.zIn+0.2);
  /* 門前大階梯：從廣場上到平台，兩側擋牆 */
  const ST={x0:39,x1:51,z0:WALK.zOut,d:0.8};
  [[0.9,0],[0.6,1],[0.3,2]].forEach(([h,i])=>block((ST.x0+ST.x1)/2,h/2,ST.z0+ST.d*(i+0.5),ST.x1-ST.x0,h,ST.d,'#c4c3bd',0.02));
  [ST.x0-0.2,ST.x1+0.2].forEach(x=>{
    const s=new THREE.Shape(); s.moveTo(0,0); s.lineTo(0,WALK.top+0.5); s.lineTo(ST.d*3,0.5); s.lineTo(ST.d*3,0); s.lineTo(0,0);
    const g=new THREE.ExtrudeGeometry(s,{depth:0.4,bevelEnabled:false}); g.rotateY(-Math.PI/2);
    const m=new THREE.Mesh(g,wallM); m.position.set(x+0.2,0,ST.z0); m.castShadow=m.receiveShadow=true; scene.add(m); outline(m,0.03);
    boxC(x-0.2,x+0.2,ST.z0,ST.z0+ST.d*3); });
  /* 不鏽鋼扶手：坡道外側（高度超過半公尺的地方）與大階梯中間 */
  const steel=toon('#c9ced3',{emissive:'#8a9097',emissiveIntensity:0.15});
  function rail(xa,xb,z){
    const ya=walkH(xa,WALK.zOut-0.1)+0.9, yb=walkH(xb,WALK.zOut-0.1)+0.9, len=Math.hypot(xb-xa,yb-ya);
    const r=mk(BOX,steel,(xa+xb)/2,(ya+yb)/2,z,{}); r.scale.set(len,0.06,0.06); r.rotation.z=Math.atan2(yb-ya,xb-xa);
    const n=Math.max(1,Math.round((xb-xa)/1.6));
    for(let i=0;i<=n;i++){ const x=xa+(xb-xa)*i/n, h=walkH(x,WALK.zOut-0.1); block(x,h+0.45,z,0.05,0.9,0.05,steel); }
    boxC(xa,xb,z-0.12,z+0.12);
  }
  rail(32.5,ST.x0-0.4,WALK.zOut-0.12);
  rail(ST.x1+0.4,WALK.x1,WALK.zOut-0.12);
  { const z0=ST.z0, z1=ST.z0+ST.d*3, r=mk(BOX,steel,45,(WALK.top+0.3)/2+0.9,(z0+z1)/2,{}); r.scale.set(0.06,0.06,Math.hypot(z1-z0,WALK.top-0.3)); r.rotation.x=Math.atan2(WALK.top-0.3,z1-z0);
    [z0+0.1,z1-0.1].forEach((z,i)=>block(45,(i?0.3:WALK.top)+0.45,z,0.05,0.9,0.05,steel)); circC(45,(z0+z1)/2,0.12); }

  /* ---------- 門前廣場：蘑菇柱、球形灌木花台、路燈 ---------- */
  [31.5,35.5,54.5,58.5].forEach(x=>{
    mk(new THREE.CylinderGeometry(0.42,0.5,3,10),toon('#bab4a9'),x,1.5,-65.2,{out:0.03});
    mk(new THREE.CylinderGeometry(1.05,0.45,0.5,12),toon('#c6c0b4'),x,3.2,-65.2,{out:0.03});
    circC(x,-65.2,0.55);
  });
  // 花台原本在門口兩側，現在那裡是坡道，往廣場移
  [[33,-61.6],[57,-61.6]].forEach(([x,z])=>{
    block(x,0.3,z,3.4,0.6,2.2,'#b9ad9a',0.03);
    [[-0.8,'#9b5b3e'],[0.8,'#5f9d4a']].forEach(([dx,c])=>{ const b=mk(SPH,toon(c),x+dx,1.05,z,{}); b.scale.setScalar(0.55); outline(b,0.08); });
    boxC(x-1.7,x+1.7,z-1.1,z+1.1);
  });
  [[37,-65],[53,-65]].forEach(([x,z])=>{ mk(new THREE.CylinderGeometry(0.06,0.08,4.2,6),toon('#7d8288'),x,2.1,z,{out:0.02}); mk(SPH,toon('#fff6dc',{emissive:'#ffe6a8',emissiveIntensity:0.6}),x,4.3,z,{}).scale.setScalar(0.25); circC(x,z,0.2); });

  /* ---------- 車道上的公車停靠區（大樓左側，對著騎樓裡的候車處） ---------- */
  { const x0=24.9, x1=26.5, z0=-97, z1=-86, c='#f2c94c';
    flat(x1-x0,0.15,c,(x0+x1)/2,0.026,z0); flat(x1-x0,0.15,c,(x0+x1)/2,0.026,z1);
    flat(0.15,z1-z0,c,x0,0.026,(z0+z1)/2); flat(0.15,z1-z0,c,x1,0.026,(z0+z1)/2);
    for(let z=z0+1;z<z1;z+=1.4){ const d=flat(0.12,1.5,c,(x0+x1)/2,0.026,z); d.rotation.z=Math.PI/4; }
    const t=canvasTex(256,96,(g,w,h)=>{ g.fillStyle=c; g.font='900 72px "Noto Sans TC",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('公車',w/2,h/2+4); });
    plane(1.4,0.55,basic({map:t,transparent:true}),(x0+x1)/2,0.03,z1+1.2,-Math.PI/2); }

  /* ---------- 碰撞 ---------- */
  // 一樓玻璃量體（左邊留出騎樓）、二樓以上壓在柱子上
  boxC(AD.x+CORE_L-0.2,AD.x+16.2,AD.z-13.5,AD.z+9);
  boxC(AD.x+CORE_L-0.2,AD.x-6.5,AD.z+9,AD.z+11.8);
  boxC(AD.x+6.5,AD.x+16.2,AD.z+9,AD.z+13);
  // 騎樓外側柱子、前排柱子、外梯
  for(let z=-11.5;z<=11.6;z+=4.6) circC(AD.x-15.4,AD.z+z,0.55);
  [-15,-11.25,-7.5].forEach(x=>circC(AD.x+x,AD.z+12.4,0.55));
  boxC(AD.x+CORE_L-2.4,AD.x+CORE_L,AD.z+1.6,AD.z+11.4);
  [-3.5,-7.5].forEach(z=>boxC(AD.x+CORE_L-0.75,AD.x+CORE_L,AD.z+z-1.3,AD.z+z+1.3));
  // 門廊巨柱、入口
  [-3,3].forEach(x=>circC(AD.x+x,AD.z+12.3,0.75));
  boxC(AD.x-6.5,AD.x+6.5,AD.z+9,AD.z+11.6);
}

export default defineBuilding({
  id: 'admin-building',
  name: '行政大樓',
  build,
  // 入口平台、門前大階梯、門前坡道
  heightAt(x, z) {
    if (x > 38 && x < 52 && z <= -66 && z > -71.4) return 1.2;
    if (x > 39 && x < 51) { if (z > -66 && z <= -65.2) return 0.9; if (z > -65.2 && z <= -64.4) return 0.6; if (z > -64.4 && z <= -63.6) return 0.3; }
    return walkH(x, z);
  },
  zones: [{ priority: 170, test: p => (p.x > 27.3 && p.z < swZ(p.x)) ? '行政大樓前' : null }],
  map: [{ x: 45, z: -90, w: 34, d: 26, color: '#b9bcbf', label: '行政大樓' }],
});
