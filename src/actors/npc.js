/**
 * NPC 系統與角色名單。
 */
import * as THREE from 'three';
import { state } from '../core/state.js';
import { late } from '../core/late.js';
import { scene } from '../core/engine.js';
import { AU } from '../systems/audio.js';
import { BOX, SPH, basic, canvasTex, outline, toon } from '../render/kit.js';
import { resolve } from '../core/collision.js';
import { police } from './police-car.js';
import { IX } from '../world/layout.js';
import { outlineU, part } from './player.js';
import { dlg, openDialog } from '../ui/dialog.js';
import { groundH, indoor, lerpA, pos, spots } from '../core/gameplay.js';

/* ---------- NPC：校長、學務長、蔣學長、方同學、駐校警察、路人同學 ---------- */
const NPCS=[];
const npcTmp=new THREE.Vector3();
state.holdPang=false; state.driving=false; state.carSpeed=0; state.carYaw=Math.PI/2;
function rrect(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function textSprite(w,h,draw,sx,sy){ const t=canvasTex(w,h,draw); const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,transparent:true})); s.scale.set(sx,sy,1); s.userData.tex=t; return s; }
function nameTag(label,col){ return textSprite(512,112,(g,w,h)=>{ g.font='700 36px "Noto Sans TC",sans-serif'; const tw=Math.min(w-20,g.measureText(label).width+56), x=(w-tw)/2;
  g.fillStyle='rgba(26,24,38,.8)'; rrect(g,x,12,tw,h-24,36); g.fill(); g.strokeStyle=col; g.lineWidth=4; g.stroke();
  g.fillStyle=col; g.textAlign='center'; g.textBaseline='middle'; g.fillText(label,w/2,h/2+2); },2.3,0.5); }
function speech(){ let text=''; const spr=textSprite(720,190,(g,w,h)=>{ if(!text) return; let fs=44; g.font=`900 ${fs}px "Noto Sans TC",sans-serif`; while(g.measureText(text).width>w-90&&fs>26){ fs-=2; g.font=`900 ${fs}px "Noto Sans TC",sans-serif`; }
    const tw=Math.min(w-20,g.measureText(text).width+64), x=(w-tw)/2;
    g.fillStyle='#ffffff'; g.strokeStyle='#2b2436'; g.lineWidth=5; rrect(g,x,10,tw,116,32); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(w/2-20,124); g.lineTo(w/2,170); g.lineTo(w/2+20,124); g.fill(); g.stroke(); g.fillRect(w/2-17,116,34,11);
    g.fillStyle='#2b2436'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,w/2,70); },3.6,0.95);
  spr.say=t=>{ if(t!==text){ text=t; spr.userData.tex.redraw(); } spr.visible=!!t; }; spr.visible=false; return spr; }
function npcFace(brow,mode){ return canvasTex(256,256,g=>{ g.save(); g.translate(128,0); g.scale(0.78,1); g.translate(-128,0); g.lineCap='round';
  [84,172].forEach(cx=>{ const cy=110;
    if(mode==='closed'){ g.strokeStyle='#2a1f2b'; g.lineWidth=5; g.beginPath(); g.moveTo(cx-11,cy+2); g.quadraticCurveTo(cx,cy+8,cx+11,cy+2); g.stroke(); }
    else if(mode==='panic'){ g.fillStyle='#ffffff'; g.beginPath(); g.arc(cx,cy,15,0,7); g.fill(); g.strokeStyle='#2a1f2b'; g.lineWidth=4; g.stroke(); g.fillStyle='#2a1f2b'; g.beginPath(); g.arc(cx,cy,5,0,7); g.fill(); }
    else { g.fillStyle='#2a1f2b'; g.beginPath(); g.ellipse(cx,cy,9,13,0,0,7); g.fill(); g.fillStyle='#fff'; g.beginPath(); g.arc(cx-3,cy-5,3.5,0,7); g.fill(); }
    g.strokeStyle=brow; g.lineWidth=5; g.beginPath(); if(mode==='panic'){ g.moveTo(cx-13,cy-24); g.lineTo(cx+13,cy-32); } else { g.moveTo(cx-12,cy-27); g.lineTo(cx+12,cy-28); } g.stroke(); });
  g.fillStyle='rgba(255,130,130,.28)'; [62,194].forEach(x=>{ g.beginPath(); g.ellipse(x,148,14,7,0,0,7); g.fill(); });
  if(mode==='panic'){ g.fillStyle='#7a3238'; g.beginPath(); g.ellipse(128,182,13,18,0,0,7); g.fill(); }
  else { g.strokeStyle='#9a4a50'; g.lineWidth=4; g.beginPath(); g.moveTo(113,170); g.quadraticCurveTo(128,182,143,170); g.stroke(); }
  g.restore(); }); }
function makePerson(o){
  const g=new THREE.Group(), rig=new THREE.Group(); g.add(rig); scene.add(g); g.userData.noOcc=true;
  const P={}, top=o.top||'#5a7fb0', pants=o.pants||'#2f3446', skin=o.skin||'#ffe1cc';
  const tor=part(new THREE.CapsuleGeometry(0.18,0.16,6,14),top,0,0.52,0,rig,0.014); tor.scale.z=0.85;
  if(o.suit){ part(BOX,'#ffffff',0,0.6,0.148,rig).scale.set(0.09,0.16,0.01); part(BOX,o.tie||'#6b3f8f',0,0.57,0.156,rig).scale.set(0.035,0.15,0.01);
    [-1,1].forEach(s=>{ const l=part(BOX,top,s*0.06,0.6,0.152,rig); l.scale.set(0.05,0.18,0.012); l.rotation.z=-s*0.35; });
    if(o.pin) part(SPH,'#f4f4f4',-0.1,0.64,0.15,rig).scale.setScalar(0.02); }
  if(o.buttons){ for(let i=0;i<3;i++) part(SPH,'#c9ced6',0,0.62-i*0.07,0.157,rig).scale.setScalar(0.012); }
  if(o.police){ part(BOX,'#e8c547',-0.08,0.62,0.154,rig).scale.set(0.05,0.06,0.01); part(BOX,'#e8c547',0.09,0.64,0.152,rig).scale.set(0.07,0.02,0.01); part(new THREE.CylinderGeometry(0.19,0.19,0.05,18),'#1a1d26',0,0.43,0,rig).scale.z=0.88; }
  if(o.hood) part(new THREE.TorusGeometry(0.13,0.05,8,16),top,0,0.68,-0.04,rig).rotation.x=Math.PI/2.2;
  if(o.bag){ const b=part(BOX,o.bag,0,0.53,-0.19,rig); b.scale.set(0.24,0.28,0.12); outline(b,0).scale.set(1.12,1.1,1.2); }
  part(new THREE.CylinderGeometry(0.182,0.19,0.14,18),pants,0,0.38,0,rig,0.012).scale.z=0.85;
  const arm=s=>{ const sh=new THREE.Group(); sh.position.set(s*0.21,0.65,0); rig.add(sh);
    part(new THREE.CapsuleGeometry(0.052,0.08,4,10),top,0,-0.06,0,sh,0.012);
    part(new THREE.CapsuleGeometry(0.046,0.06,4,10),o.shortSleeve?skin:top,0,-0.16,0,sh,0.01);
    part(SPH,skin,0,-0.25,0,sh).scale.setScalar(0.046); return sh; };
  P.shL=arm(-1); P.shR=arm(1);
  if(o.watch){ const w=part(new THREE.TorusGeometry(0.05,0.017,6,14),'#7f8a90',0,-0.21,0,P.shL); w.rotation.x=Math.PI/2; }
  if(o.flyer){ const f=part(BOX,'#ffffff',0,-0.3,0.07,P.shR); f.scale.set(0.17,0.22,0.012); const t=part(BOX,'#e6c47d',0,-0.25,0.078,P.shR); t.scale.set(0.13,0.04,0.004); }
  const leg=s=>{ const hp=new THREE.Group(); hp.position.set(s*0.085,0.33,0); rig.add(hp);
    part(new THREE.CapsuleGeometry(0.06,0.09,4,10),pants,0,-0.1,0,hp,0.01);
    const sh=part(SPH,o.shoe||'#2a2a2e',0,-0.24,0.03,hp); sh.scale.set(0.07,0.05,0.1); outlineU(sh,1.15); return hp; };
  P.hipL=leg(-1); P.hipR=leg(1);
  const hc=new THREE.Group(); hc.position.y=0.99; rig.add(hc); P.head=hc;
  const sk=part(new THREE.SphereGeometry(0.28,28,20),skin,0,0,0,hc); sk.scale.set(1.05,0.97,1); outlineU(sk,1.045);
  const brow=o.brow||o.hair||'#2a2220';
  P.fA=npcFace(brow,'open'); P.fB=npcFace(brow,'closed'); P.fC=npcFace(brow,'panic');
  P.fm=basic({map:P.fA,transparent:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const f=new THREE.Mesh(new THREE.SphereGeometry(0.2815,32,20,Math.PI/2-0.8,1.6,Math.PI*0.38,Math.PI*0.42),P.fm); f.scale.set(1.05,0.97,1); hc.add(f);
  const hm=toon(o.hair||'#2a2220',{side:THREE.DoubleSide});
  const capH=part(new THREE.SphereGeometry(0.296,28,14,0,Math.PI*2,0,Math.PI*(o.hairStyle==='bowl'?0.45:0.38)),hm,0,0.012,-0.006,hc); capH.scale.set(1.05,0.97,1); outlineU(capH,1.04);
  const back=part(new THREE.SphereGeometry(0.299,28,18,Math.PI/2+1.05,Math.PI*2-2.1,0,Math.PI*(o.hairStyle==='short'?0.58:0.66)),hm,0,0,-0.01,hc); back.scale.set(1.05,0.97,1);
  if(o.hairStyle==='bowl'){ const fr=part(new THREE.SphereGeometry(0.302,28,10,Math.PI/2-0.95,1.9,Math.PI*0.28,Math.PI*0.13),hm,0,0.005,0,hc); fr.scale.set(1.05,0.97,1); }
  if(o.hairStyle==='side'){ const s1=part(SPH,hm,-0.06,0.22,0.12,hc); s1.scale.set(0.24,0.08,0.16); s1.rotation.z=0.25; }
  if(o.glasses){ const gm=toon(o.glasses); [-0.078,0.078].forEach(x=>{ const r=part(new THREE.TorusGeometry(0.056,0.009,6,18),gm,x,-0.045,0.272,hc); if(o.rect) r.scale.set(1.15,0.78,1); }); part(BOX,gm,0,-0.04,0.282,hc).scale.set(0.05,0.01,0.01); }
  if(o.cap){ part(new THREE.CylinderGeometry(0.3,0.3,0.12,20),o.cap,0,0.19,0,hc,0.012); part(new THREE.CylinderGeometry(0.33,0.31,0.07,20),o.cap,0,0.28,0.01,hc);
    const v=part(BOX,'#14171f',0,0.15,0.27,hc); v.scale.set(0.32,0.03,0.18); part(BOX,'#e8c547',0,0.24,0.31,hc).scale.set(0.08,0.07,0.01); }
  g.scale.setScalar(o.scale||1.2);
  return {g,rig,P};
}
const PANIC=['哇啊啊啊！','警車暴衝了！','快跑！','救命啊！','誰在開警車啦！'];
function addNPC(o){
  const b=makePerson(o.look);
  const n=Object.assign({},o,{g:b.g,rig:b.rig,P:b.P,pi:0,fear:0,state:'idle',ph:Math.random()*6,blink:2+Math.random()*3,sayT:Math.random()*2,si:-1,chaseT:0});
  n.g.position.set(o.home.x,0,o.home.z); n.g.rotation.y=o.face||0;
  if(o.tag){ n.tag=nameTag(o.tag,o.tagCol||'#e6c47d'); n.tag.position.y=1.62; n.g.add(n.tag); }
  n.sp=speech(); n.sp.position.y=o.tag?2.12:1.8; n.g.add(n.sp);
  n.spot={x:o.home.x,z:o.home.z,r:2.4,label:'交談',ok:()=>!state.driving&&!state.holdPang&&n.fear<=0&&n.state!=='chase'&&n.state!=='chaseCar'&&(o.indoorNPC?indoor():!indoor()),
    fn:()=>openDialog(o.title||o.tag||'同學',typeof o.lines==='function'?o.lines():o.lines,o.after)};
  spots.push(n.spot); NPCS.push(n); return n;
}
function npcUpdate(n,dt){
  const p=n.g.position, dP=Math.hypot(pos.x-p.x,pos.z-p.z), sameSide=n.indoorNPC?indoor():!indoor();
  let tx=null,tz=null,spd=0;
  if(state.driving&&!n.indoorNPC&&n!==cop&&Math.abs(state.carSpeed)>1.5&&Math.hypot(police.position.x-p.x,police.position.z-p.z)<13){ if(n.fear<=0&&Math.random()<0.6) AU.sfx('scream'); n.fear=3.2; }
  if(n.fear>0){ n.fear-=dt; let ax=p.x-police.position.x, az=p.z-police.position.z; const l=Math.hypot(ax,az)||1; tx=p.x+ax/l*5; tz=p.z+az/l*5; spd=6.2; }
  else if(n.state==='chase'){ n.chaseT+=dt; tx=pos.x; tz=pos.z; spd=n.chaseSpd||9;
    if(n.chaseT>14&&dP>12){ const bx=Math.sin(state.yaw), bz=Math.cos(state.yaw); p.x=pos.x+bx*7; p.z=pos.z+bz*7; n.chaseT=0; }
    if(dP<2.1&&dlg.hidden&&!state.busy&&!state.driving){ n.state='talk'; const f=n.onCatch; n.onCatch=null; if(f) f(); } }
  else if(n.state==='chaseCar'){ tx=police.position.x; tz=police.position.z; spd=7; }
  else if(n.state==='return'){ tx=n.home.x; tz=n.home.z; spd=4.5; if(Math.hypot(tx-p.x,tz-p.z)<0.6){ n.state='idle'; n.g.rotation.y=n.face||0; } }
  else if(n.state==='talk'){ n.g.rotation.y=lerpA(n.g.rotation.y,Math.atan2(pos.x-p.x,pos.z-p.z),1-Math.exp(-dt*6)); }
  else if(sameSide&&(dP<3.4||(!dlg.hidden&&dP<6))){ n.g.rotation.y=lerpA(n.g.rotation.y,Math.atan2(pos.x-p.x,pos.z-p.z),1-Math.exp(-dt*5)); }
  else if(n.path){ const w=n.path[n.pi]; if(Math.hypot(w[0]-p.x,w[1]-p.z)<0.5) n.pi=(n.pi+1)%n.path.length; else { tx=w[0]; tz=w[1]; spd=n.speed||1.3; } }
  let moving=false;
  if(tx!==null){ const dx=tx-p.x, dz=tz-p.z, d=Math.hypot(dx,dz);
    if(d>0.08){ const st=Math.min(d,spd*dt); npcTmp.set(p.x+dx/d*st,0,p.z+dz/d*st); resolve(npcTmp,0.35); p.x=npcTmp.x; p.z=npcTmp.z;
      n.g.rotation.y=lerpA(n.g.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*9)); moving=true; } }
  p.y=groundH(p.x,p.z);
  const P=n.P, a=moving?Math.min(1,spd/3):0; n.ph+=dt*(moving?4+spd*1.2:0); const s=Math.sin(n.ph);
  P.hipL.rotation.x=-s*0.8*a; P.hipR.rotation.x=s*0.8*a;
  const panic=n.fear>0;
  if(panic){ P.shL.rotation.set(0,0,-2.5+Math.sin(state.time*18)*0.3); P.shR.rotation.set(0,0,2.5-Math.sin(state.time*18)*0.3); }
  else if(n.wave&&!moving&&sameSide&&dP<9){ P.shL.rotation.set(s*0.9*a,0,-0.12); P.shR.rotation.set(-0.3,0,2.3+Math.sin(state.time*7)*0.35); }
  else { P.shL.rotation.set(s*0.9*a,0,-0.12); P.shR.rotation.set(-s*0.9*a,0,0.12); }
  n.rig.position.y=Math.abs(Math.cos(n.ph))*0.06*a;
  n.blink-=dt; if(panic) P.fm.map=P.fC; else if(n.blink<0&&n.blink>-0.12) P.fm.map=P.fB; else { P.fm.map=P.fA; if(n.blink<=-0.12) n.blink=2+Math.random()*3; }
  n.sayT-=dt;
  if(panic){ if(n.sayT<=0||!n.sp.visible){ n.sp.say(PANIC[Math.floor(Math.random()*PANIC.length)]); n.sayT=1.3; } }
  else if(n.sayT<=0){ if(n.shout&&sameSide&&dP<26&&dP>3.6){ n.si=(n.si+1)%n.shout.length; n.sp.say(n.shout[n.si]); n.sayT=2.6; } else { n.sp.say(''); n.sayT=1; } }
  if(n.tag) n.tag.visible=sameSide&&dP<24&&dP>2.6;
  if(!panic&&n.shout&&dP<=3.6&&n.sp.visible&&n.state!=='chase') n.sp.say('');
  n.spot.x=p.x; n.spot.z=p.z;
}
/* 角色 */
addNPC({tag:'校長　李蔡彥',title:'校長．李蔡彥',indoorNPC:true,home:{x:IX,z:-12.5},face:0,
  look:{top:'#26304f',pants:'#1f2433',suit:true,tie:'#6b3f8f',pin:true,hair:'#a3a7ab',brow:'#6d6f72',hairStyle:'side',glasses:'#b9bdc3',shoe:'#1c1c20'},
  lines:()=>!state.haveMap?['你好，我是政大校長李蔡彥。','明年就是政大創校一百週年了。','我想請你幫個忙：走遍校園，收集大家的校園故事。','把故事收集齊全，就能找到政大的百年寶藏。','這張「百年秘寶地圖」交給你，上面標出了故事可能藏著的地方。按 M 就能打開。']
    :state.found<3?[`目前收集到 ${state.found} 個校園故事，還差 ${3-state.found} 個。`,'打開百年秘寶地圖看看，還有哪裡沒去過。']
    :['三個校園故事都收集齊了，真了不起！','百年寶藏的線索，就藏在這些故事裡。謝謝你為政大的一百年留下紀錄。'],
  after:()=>{ if(!state.haveMap) late.giveMap(); }});
addNPC({tag:'學務長　蔡炎龍',title:'學務長．蔡炎龍',home:{x:-27,z:-56},path:[[-27,-56],[-35,-57.5]],speed:0.9,
  look:{top:'#1f2a44',pants:'#2e2e36',buttons:true,shortSleeve:true,hair:'#3a2a22',hairStyle:'bowl',glasses:'#4f545b',rect:true,watch:true},
  lines:['你好，我是學務長蔡炎龍。','學生生活、社團活動、獎助學金和生活輔導，都可以到學務處找我們。','課業之外的經驗也很重要，多參加活動吧！']});
addNPC({tag:'外交系　蔣學長',title:'外交系．蔣學長',home:{x:4.5,z:-6},path:[[4.5,-6],[4.5,-22]],speed:1.1,
  look:{top:'#2b3140',pants:'#2b3140',suit:true,tie:'#b23a3a',hair:'#141414',hairStyle:'side',shoe:'#121214'},
  shout:['輝達！鮮乳！大巨蛋！'],
  lines:['大巨蛋……','大家都說不可能……','我辦到了……']});
addNPC({tag:'新聞系　蔻蔻學姊',title:'新聞系．蔻蔻學姊',home:{x:-4.6,z:-45},path:[[-4.6,-45],[-4.6,-57]],speed:0.9,
  look:{top:'#b8323a',pants:'#2b2b33',suit:true,tie:'#f4f1ea',hair:'#2a1c18',hairStyle:'bowl',shoe:'#1c1c20'},
  shout:['我們政大也很了不起！'],
  lines:()=>state.haveBadge?['爛Ｏ大有什麼了不起！','我們政大最了不起！','徽章要好好戴著喔。']:['爛Ｏ大有什麼了不起！','我們政大最了不起！','來，這個給你，戴上它！'],
  after:()=>{ if(!state.haveBadge) late.giveBadge(); }});
addNPC({tag:'資管系　方同學',title:'資管系．方同學',home:{x:-60,z:-62.5},face:Math.PI,wave:true,
  look:{top:'#3f7d6a',pants:'#2e3550',hood:true,hair:'#161616',flyer:true,shoe:'#f2f2ee'},
  shout:['歡迎加入政大金融科技創新實驗室！'],
  lines:['嗨！我是資管系的方同學。','歡迎加入政大金融科技創新實驗室！','我們有金融科技的講座、實作和專題活動，有興趣的話歡迎來找我們！']});
const cop=addNPC({tag:'駐校警察',title:'駐校警察',tagCol:'#9fc3ff',home:{x:-11.3,z:1.2},face:-Math.PI/2,chaseSpd:9.6,
  look:{top:'#24324f',pants:'#1c2233',police:true,buttons:true,cap:'#1c2a4a',hair:'#1d1a18',shoe:'#111114'},
  lines:['我是駐校警察，有什麼事都可以找我。','校園裡騎車開車都要放慢，注意安全。']});
const STU_LINES=[['今天的課好多……'],['圖書館好像還有位子，要不要去？'],['等一下要去社團開會！'],['期中考快到了，好緊張。'],['中午要吃什麼啊？']];
const STU=[['#e98a6a','#3c4a6b','#2b2220','#f2c94c'],['#7fb3e6','#40444f','#5a3a2a','#d8433f'],['#f2f2ee','#2e3a5a','#151515','#5b8ed6'],['#c9a0dc','#3a3f4a','#3a2a22',null],['#9fd6c2','#4a4036','#151515','#e8a33c'],['#f0c94a','#2e3550','#4a3022',null]];
[[[-3.2,0],[-3.2,-24]],[[3.5,-40],[3.5,-58]],[[-12,-62.4],[-24,-64.5]],[[30,-55.8],[60,-50.4]],[[-30,-72],[-38,-73.5]],[[-1,-66],[12,-63.6]]].forEach((path,i)=>{
  const c=STU[i]; addNPC({title:'同學',home:{x:path[0][0],z:path[0][1]},path,speed:1.1+Math.random()*0.5,look:{top:c[0],pants:c[1],hair:c[2],bag:c[3],hairStyle:i%2?'short':'side',scale:1.1},lines:STU_LINES[i%STU_LINES.length]}); });

export { NPCS, cop, npcUpdate };
