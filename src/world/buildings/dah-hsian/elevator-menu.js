/** 原生dialog/按鈕的樓層互動；遊戲鎖定與搭乘由runtime接線。 */
export function bindDahElevatorMenu({dialog,buttons,cancelButton,onSelect,onClose}){
 let current=null,disposed=false;
 const listeners=[];
 const listen=(target,type,fn)=>{target.addEventListener(type,fn);listeners.push(()=>target.removeEventListener(type,fn));};
 const close=(reason='cancel')=>{if(!dialog.open)return false;dialog.close();current=null;onClose?.(reason);return true;};
 listen(cancelButton,'click',()=>close());
 listen(dialog,'cancel',event=>{event.preventDefault();close();});
 listen(dialog,'keydown',event=>{if(dialog.open){
  event.stopPropagation();
  if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault();
 }});
 for(const [id,button]of buttons)listen(button,'click',()=>{
  if(!dialog.open||button.disabled)return;
  const from=current;close('travel');onSelect(from,id);
 });
 return {
  open(id){
   if(disposed||!buttons.has(id)||dialog.open)return false;
   current=id;for(const [key,button]of buttons)button.disabled=key===id;
   dialog.showModal();([...buttons.values()].find(b=>!b.disabled)||cancelButton).focus();return true;
  },close,
  dispose(){if(disposed)return;disposed=true;close('scene-exit');listeners.forEach(remove=>remove());},
 };
}
