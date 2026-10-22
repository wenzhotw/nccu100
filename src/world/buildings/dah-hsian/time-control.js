/** 沿用HUD紙色按鈕；時段僅影響達賢視覺，不寫入劇情存檔。 */
const modes=['auto','afternoon','dusk','night'];
const labels={auto:'光線：自動日夜',afternoon:'光線：午後',dusk:'光線：黃昏',night:'光線：夜晚'};
export function bindDahTimeControl(button,clock,getTime){
 const refresh=()=>{button.textContent=labels[clock.mode];button.title='切換光線：自動日夜、午後、黃昏、夜晚';button.ariaLabel=button.textContent+'，按下切換下一個時段';};
 const click=()=>{clock.setMode(modes[(modes.indexOf(clock.mode)+1)%modes.length],getTime());refresh();};
 const keydown=e=>{if(e.key==='Enter'||e.key===' ')e.stopPropagation();};
 button.addEventListener('keydown',keydown);button.addEventListener('click',click);refresh();
 return {refresh,dispose(){button.removeEventListener('click',click);button.removeEventListener('keydown',keydown);}};
}
