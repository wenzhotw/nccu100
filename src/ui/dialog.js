/**
 * 對話框、提示訊息、地區名稱橫幅。
 */
import { state } from '../core/state.js';
import { late } from '../core/late.js';
import { $ } from '../core/dom.js';
import { AU } from '../systems/audio.js';

/* ---------- UI ---------- */
const dlg=$('dlg'), dname=$('dname'), dtext=$('dtext');
let dlgLines=[], dlgI=0, typing=null, dlgEnd=null, typedFull='';
function openDialog(name,lines,onEnd){ dlgLines=lines; dlgI=0; dlgEnd=onEnd||null; dname.textContent=name; dlg.hidden=false; document.body.classList.add('talk'); AU.sfx('open'); $('act').hidden=true; typeLine(); }
function typeLine(){
  typedFull=dlgLines[dlgI]; let k=0; dtext.textContent=''; clearInterval(typing);
  typing=setInterval(()=>{ k++; if(k%2===1) AU.sfx('blip'); dtext.textContent=typedFull.slice(0,k); if(k>=typedFull.length){clearInterval(typing);typing=null;} },32);
}
function advance(){
  if(dlg.hidden) return;
  if(typing){ clearInterval(typing); typing=null; dtext.textContent=typedFull; return; }
  dlgI++; if(dlgI<dlgLines.length) typeLine(); else { dlg.hidden=true; document.body.classList.remove('talk'); state.talkFocus=null; const f=dlgEnd; dlgEnd=null; if(f) f(); }
}
dlg.addEventListener('click',advance);
let toastT=0;
function toast(s){ const t=$('toast'); t.textContent=s; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2600); }
let bannerT=0;
function banner(s){ $('bannerText').textContent=s; const b=$('banner'); b.classList.add('on'); clearTimeout(bannerT); bannerT=setTimeout(()=>b.classList.remove('on'),2600); }

// 讓較早載入的模組也能在執行時呼叫到這裡定義的東西
late.dlg = dlg;

export { advance, banner, dlg, openDialog, toast };
