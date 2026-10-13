/**
 * 鍵盤、滑鼠、觸控搖桿。
 */
import { state } from './state.js';
import { late } from './late.js';
import { $ } from './dom.js';
import { renderer } from './engine.js';
import { AU } from '../systems/audio.js';
import { advance, banner, dlg } from '../ui/dialog.js';

/* ---------- input ---------- */
const keys={};
state.stickV={x:0,y:0}; state.yaw=0; state.pitch=0.3; state.dist=6; state.started=false; state.busy=false;
addEventListener('keydown',e=>{
  keys[e.code]=true; if(!state.started||state.busy) return;
  if(e.code==='Space'){ e.preventDefault(); if(!dlg.hidden) advance(); else late.jump(); }
  if(e.code==='KeyE'||e.code==='KeyF'||e.code==='Enter'){ if(!dlg.hidden) advance(); else late.interact(); }
  if(e.code==='KeyQ'&&dlg.hidden) late.interactAlt();
  if(e.code==='KeyM'){ if($('mapw').hidden) late.openMap(); else late.closeMap(); }
  if(e.code==='Escape') late.closeMap();
});
addEventListener('keyup',e=>{ keys[e.code]=false; });
const cv=renderer.domElement;
let lx=0, ly=0; state.camPtr=null;
cv.addEventListener('pointerdown',e=>{ if(state.camPtr!==null) return; state.camPtr=e.pointerId; lx=e.clientX; ly=e.clientY; try{cv.setPointerCapture(e.pointerId);}catch(_){} });
cv.addEventListener('pointermove',e=>{ if(e.pointerId!==state.camPtr) return; state.yaw-=(e.clientX-lx)*0.0055; state.pitch=Math.min(1.15,Math.max(-0.05,state.pitch+(e.clientY-ly)*0.004)); lx=e.clientX; ly=e.clientY; });
const endCam=e=>{ if(e.pointerId===state.camPtr) state.camPtr=null; };
cv.addEventListener('pointerup',endCam);
cv.addEventListener('pointercancel',endCam);
cv.addEventListener('wheel',e=>{ e.preventDefault(); state.dist=Math.min(14,Math.max(3.5,state.dist+e.deltaY*0.006)); },{passive:false});
const stick=$('stick'), knob=$('knob');
let stickPtr=null;
function stickMove(e){ const r=stick.getBoundingClientRect(); let dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2); const m=Math.hypot(dx,dy), lim=48; if(m>lim){dx*=lim/m;dy*=lim/m;} knob.style.transform=`translate(${dx}px,${dy}px)`; state.stickV={x:dx/lim,y:-dy/lim}; }
stick.addEventListener('pointerdown',e=>{ stickPtr=e.pointerId; try{stick.setPointerCapture(e.pointerId);}catch(_){} stickMove(e); });
stick.addEventListener('pointermove',e=>{ if(e.pointerId===stickPtr) stickMove(e); });
const stickEnd=e=>{ if(e.pointerId!==stickPtr) return; stickPtr=null; state.stickV={x:0,y:0}; knob.style.transform=''; };
stick.addEventListener('pointerup',stickEnd);
stick.addEventListener('pointercancel',stickEnd);
state.flyHeld=false;
const jumpBtn=$('jump');
jumpBtn.addEventListener('pointerdown',e=>{ e.preventDefault(); if(!dlg.hidden) advance(); else { late.jump(); state.flyHeld=true; } });
const jumpEnd=()=>{ state.flyHeld=false; };
jumpBtn.addEventListener('pointerup',jumpEnd);
jumpBtn.addEventListener('pointercancel',jumpEnd);
jumpBtn.addEventListener('pointerleave',jumpEnd);
$('act').addEventListener('click',()=>late.interact());
$('act2').addEventListener('click',()=>late.interactAlt());
$('snd').addEventListener('click',()=>{ AU.init(); const m=AU.toggle(); $('snd').classList.toggle('off',m); });
$('go').addEventListener('click',()=>{ AU.init(); document.body.classList.remove('title'); late.camT.set(late.pos.x,late.pos.y+0.9,late.pos.z); state.camD=state.dist; $('intro').classList.add('gone'); state.started=true; setTimeout(()=>banner('政大正門'),500); });

export { keys };
