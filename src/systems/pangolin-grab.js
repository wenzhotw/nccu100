/**
 * 抱起穿山甲與警察制止。
 */
import { state } from '../core/state.js';
import { AU } from './audio.js';
import { player } from '../actors/player.js';
import { bubble, pBody, pang } from '../actors/pangolin.js';
import { openDialog, toast } from '../ui/dialog.js';
import { indoor, pos, spots } from '../core/gameplay.js';
import { cop } from '../actors/npc.js';

/* ---------- 抓穿山甲 → 警察制止 ---------- */
function grabPangolin(){ state.holdPang=true; AU.sfx('grab'); bubble.visible=false; toast('你把小穿抱了起來……');
  setTimeout(()=>{ if(!state.holdPang) return; cop.state='chase'; cop.chaseT=0; AU.sfx('whistle'); cop.sp.say('喂！住手！'); cop.sayT=2.5;
    cop.onCatch=()=>openDialog('駐校警察',['住手！請把穿山甲放下！','穿山甲是保育類野生動物，依法不可以捕捉、飼養或騷擾。','牠只是出來散步，請輕輕把牠放回地上。'],()=>{ releasePangolin(); cop.state='return'; toast('你把小穿放回地上了'); }); },700); }
function releasePangolin(){ state.holdPang=false; const fx=Math.sin(player.rotation.y), fz=Math.cos(player.rotation.y);
  pang.position.set(pos.x+fx*1.2,0,pos.z+fz*1.2); pang.rotation.set(0,player.rotation.y,0); pBody.scale.setScalar(1); }
spots[0].ok=()=>!indoor()&&!state.holdPang&&!state.driving;
spots[0].alt={label:'抓起來',fn:grabPangolin};
{ const o=spots[1].ok; spots[1].ok=()=>o()&&!state.holdPang&&!state.driving; }
