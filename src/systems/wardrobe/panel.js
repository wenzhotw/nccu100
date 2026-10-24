import {WARDROBE_ACTOR_IDS} from '../../actors/wardrobe-config.js';
/** Native top-layer modal traps focus and pointer events without replacing global input. */
export function mountGameWardrobePanel({controller,store,state,canOpen,resetInput,initialMessage='',document:doc=globalThis.document}){
 const make=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const button=make('button','角色換裝');button.type='button';button.className='chip';button.id='game-wardrobe-open';button.setAttribute('aria-haspopup','dialog');
 (doc.querySelector('#hud .col.r')||doc.body).append(button);
 const dialog=make('dialog');dialog.id='game-wardrobe-panel';dialog.setAttribute('aria-labelledby','game-wardrobe-title');
 const title=make('h2','四角色換裝');title.id='game-wardrobe-title';
 const hint=make('p','僅主角、蔣學長、金融與英文系。使用原骨架動畫，不是全身關節完成；雄鷹暫不支援。設定只存在本機，與遊戲進度分開。');
 const close=make('button','關閉');close.type='button';close.className='wardrobe-close';
 const label=make('label','選擇角色'),select=make('select');select.id='game-wardrobe-actor';label.htmlFor=select.id;
 const names={player:'主角',chiang:'蔣學長','bz26-D12':'金融學系','bz26-D23':'英國語文學系'};
 for(const id of WARDROBE_ACTOR_IDS){const o=make('option',names[id]);o.value=id;select.append(o);}
 const jsonLabel=make('label','貼上工作台匯出的 JSON'),json=make('textarea');json.id='game-wardrobe-json';jsonLabel.htmlFor=json.id;json.maxLength=4096;json.spellcheck=false;
 const apply=make('button','套用並保存此角色'),reset=make('button','還原此角色'),clear=make('button','清除所有換裝設定'),link=make('a','開啟換裝工作台');
 for(const n of [apply,reset,clear])n.type='button';link.href='./wardrobe/index.html';
 const status=make('p',initialMessage);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const actions=make('div');actions.className='wardrobe-actions';actions.append(apply,reset,clear);
 dialog.append(close,title,hint,label,select,jsonLabel,json,actions,status,link);doc.body.append(dialog);
 const baseline=id=>({schemaVersion:1,actorId:id,slots:{headwear:'default',outerwear:'default',leftHand:'default'}});
 function selected(){const c=store.read().actors[select.value]||baseline(select.value);json.value=JSON.stringify(c,null,2);}
 function guard(fn){return ()=>{try{fn();}catch(error){status.textContent=`未完成：${error.message}`;}};}
 let ownsLock=false;
 button.addEventListener('click',guard(()=>{
  if(!canOpen())return;
  // Reuse the existing reading-modal input/velocity lock only while this dialog owns it.
  resetInput();state.bzBoothBrowsing=true;ownsLock=true;
  try{dialog.showModal();}catch(error){state.bzBoothBrowsing=false;ownsLock=false;throw error;}
  try{selected();}catch(error){json.value='';status.textContent=`設定未載入：${error.message}。可用「清除所有換裝設定」復原；遊戲進度不受影響。`;}
  select.focus();
 }));
 dialog.addEventListener('close',()=>{if(ownsLock){state.bzBoothBrowsing=false;ownsLock=false;resetInput();}button.focus();});
 // Stop WASD/E/M from reaching the existing window listeners while typing. Native Escape/Tab stay intact.
 for(const name of ['keydown','keyup'])dialog.addEventListener(name,event=>event.stopPropagation());
 close.addEventListener('click',()=>dialog.close());
 select.addEventListener('change',guard(selected));
 apply.addEventListener('click',guard(()=>{
  const value=JSON.parse(json.value);if(value.actorId!==select.value)throw new Error('JSON 角色不符，請先選擇對應角色。');
  controller.apply(value);selected();status.textContent='已套用並保存；下次進入遊戲會載入此角色設定。';
 }));
 reset.addEventListener('click',guard(()=>{controller.reset(select.value);selected();status.textContent='此角色已還原，其他角色和遊戲進度不變。';}));
 clear.addEventListener('click',guard(()=>{controller.clear();selected();status.textContent='全部四角色換裝已還原；遊戲進度未變。';}));
 return {dispose(){if(dialog.open)dialog.close();dialog.remove();button.remove();}};
}
