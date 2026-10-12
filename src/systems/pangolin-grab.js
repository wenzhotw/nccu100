/**
 * 抱起穿山甲與警察制止。
 */
import { state } from '../core/state.js';
import { AU } from './audio.js';
import { player } from '../actors/player.js';
import { bubble, pBody, pang } from '../actors/pangolin.js';
import { openDialog, toast } from '../ui/dialog.js';
import { indoor, pos, spotById } from '../core/gameplay.js';
import { DIALOGS } from '../content/index.js';
import { cop } from '../actors/npc.js';

/* ---------- 抓穿山甲 → 警察制止 ---------- */
function grabPangolin(){ state.holdPang=true; AU.sfx('grab'); bubble.visible=false; toast('你把小穿抱了起來……');
  setTimeout(()=>{ if(!state.holdPang) return; cop.state='chase'; cop.chaseT=0; AU.sfx('whistle'); cop.sp.say('喂！住手！'); cop.sayT=2.5;
    cop.onCatch=()=>openDialog(DIALOGS.copStopsGrab.title,DIALOGS.copStopsGrab.lines,()=>{ releasePangolin(); cop.state='return'; toast(DIALOGS.toasts.pangolinReleased); }); },700); }
function releasePangolin(){ state.holdPang=false; const fx=Math.sin(player.rotation.y), fz=Math.cos(player.rotation.y);
  pang.position.set(pos.x+fx*1.2,0,pos.z+fz*1.2); pang.rotation.set(0,player.rotation.y,0); pBody.scale.setScalar(1); }
spotById('pangolin').ok=()=>!indoor()&&!state.holdPang&&!state.driving;
spotById('pangolin').alt={label:'抓起來',fn:grabPangolin};
{ const s=spotById('siwei-enter'), o=s.ok; s.ok=()=>o()&&!state.holdPang&&!state.driving; }
