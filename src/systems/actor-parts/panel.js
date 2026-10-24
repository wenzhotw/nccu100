import {defaultActorPartsCard,validateActorPartsCard,migrateLegacyCharacterCard} from '../../actors/actor-parts-config.js';

const OWNER='actor-parts';
const KIND_LABELS={player:'玩家',npc:'校園角色',human:'人形角色',animal:'動物角色',booth:'系攤角色',performer:'表演角色'};

/** 只讀登記資料產生選項；明確套用才寫入獨立設定，不替其他配裝器解除佔用。 */
export function mountActorPartsPanel({registry,controller,store,state,ownership,canOpen,resetInput,document:doc=globalThis.document}){
 const make=(tag,text)=>{const node=doc.createElement(tag);if(text)node.textContent=text;return node;};
 const makeButton=(id,text)=>{const node=make('button',text);node.id=id;node.type='button';return node;};
 const labelFor=(id,text)=>{const label=make('label',text);label.htmlFor=id;return label;};
 const button=makeButton('actor-parts-open','全角色設定');button.className='chip';button.setAttribute('aria-haspopup','dialog');
 (doc.querySelector('#hud .col.r')||doc.body).append(button);
 const dialog=make('dialog');dialog.id='actor-parts-panel';dialog.setAttribute('aria-labelledby','actor-parts-title');dialog.setAttribute('aria-describedby','actor-parts-hint');
 const close=makeButton('actor-parts-close','關閉');close.className='actor-parts-close';
 const title=make('h2','全角色・原生零件設定');title.id='actor-parts-title';
 const hint=make('p','依角色原有零件設定，預設保留原貌。原生裝配只複用這個角色自己的零件，不交換其他角色服裝、不改體型或顏色，也不新增肘膝關節。設定獨立保存，不改原遊戲進度與原換裝存檔。');hint.id='actor-parts-hint';
 const filters=make('div');filters.className='actor-parts-filters';
 const search=make('input');search.id='actor-parts-search';search.type='search';search.placeholder='名稱或角色 ID';search.autocomplete='off';
 const category=make('select');category.id='actor-parts-category';
 const searchField=make('div'),categoryField=make('div');searchField.append(labelFor(search.id,'搜尋角色'),search);categoryField.append(labelFor(category.id,'分類'),category);filters.append(searchField,categoryField);
 const count=make('p');count.id='actor-parts-count';count.className='actor-parts-detail';count.setAttribute('aria-live','polite');
 const select=make('select');select.id='actor-parts-actor';
 const actorStatus=make('p');actorStatus.id='actor-parts-actor-status';actorStatus.setAttribute('aria-live','polite');
 const conflict=make('p');conflict.id='actor-parts-owner';
 const fields=make('div');fields.id='actor-parts-fields';
 const json=make('textarea');json.id='actor-parts-json';json.maxLength=16384;json.spellcheck=false;json.setAttribute('aria-describedby','actor-parts-json-help');
 const jsonHelp=make('p','JSON 上限 16 KiB。只接受目前角色的完整設定；編輯尚未保存，請明確套用。匯出與下載取已保存設定，未保存時取原樣。');jsonHelp.id='actor-parts-json-help';jsonHelp.className='actor-parts-detail';
 const apply=makeButton('actor-parts-apply','套用選件並保存');
 const load=makeButton('actor-parts-import','載入 JSON 並套用');
 const migrate=makeButton('actor-parts-migrate','轉換三角色舊設定卡');
 const reload=makeButton('actor-parts-reload','重新載入已保存設定');
 const exportButton=makeButton('actor-parts-export','匯出已保存 JSON');
 const download=makeButton('actor-parts-download','下載已保存 JSON');
 const reset=makeButton('actor-parts-reset','還原此角色');
 const clear=makeButton('actor-parts-clear','清除全部新系統設定');
 const actions=make('div');actions.className='actor-parts-actions';actions.append(apply,load,migrate,reload,exportButton,download);
 const restoreActions=make('div');restoreActions.className='actor-parts-actions actor-parts-restore';restoreActions.append(reset,clear);
 const status=make('p');status.id='actor-parts-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 dialog.append(close,title,hint,filters,count,labelFor(select.id,'角色'),select,actorStatus,conflict,fields,labelFor(json.id,'設定卡 JSON'),json,jsonHelp,actions,restoreActions,status);doc.body.append(dialog);
 let selectedId='',entries=[],formReady=false,formSignature='',selectionSignature='',ownsLock=false,previousLock=false,previousFocus=null,disposed=false;
 const kindLabel=kind=>KIND_LABELS[kind]||kind||'其他角色';
 const current=()=>entries.find(entry=>entry.id===selectedId);
 const signature=entry=>entry?JSON.stringify([entry.id,entry.ready,entry.label,entry.kind,Object.entries(entry.slots||{}).map(([slot,def])=>[slot,def.label,def.allowNone,def.sources?.length||0])]):'';
 const ownerOf=()=>selectedId?ownership.ownerOf(selectedId):null;
 function ownerMessage(){
  const owner=ownerOf();
  conflict.textContent=owner==='wardrobe-v1'?'此角色由原「角色換裝」管理。請先關閉此視窗，在原面板還原此角色，再回來套用。這裡不會解除其他系統的配裝。':owner==='cards-preview'?'此角色由「設定卡預覽」管理。請先在設定卡預覽面板還原此角色，再回來套用。這裡不會解除其他系統的配裝。':owner===OWNER?'此角色使用新系統設定。「還原此角色」會恢復原貌並釋放配裝權。':owner?'此角色正由其他外觀系統管理，請先在該系統還原。':'沒有其他外觀系統佔用此角色。';
  if(!selectedId)conflict.textContent='';
  return !!owner&&owner!==OWNER;
 }
 function updateAvailability(){
  const entry=current(),conflicted=ownerMessage(),ready=!!entry?.ready&&(!entry.supported||entry.supported());
  apply.disabled=!formReady||!ready||conflicted;load.disabled=!ready||conflicted;
  migrate.disabled=!entry?.ready;reload.disabled=!entry;exportButton.disabled=!entry||!formReady;download.disabled=exportButton.disabled;
  reset.disabled=!selectedId||conflicted;json.disabled=!entry;
  for(const choice of fields.querySelectorAll('select'))choice.disabled=!ready||conflicted;
 }
 function resetForm(){formReady=false;formSignature='';fields.replaceChildren();json.value='';updateAvailability();}
 function renderSelected(){
  resetForm();const entry=current();selectionSignature=signature(entry);dialog.dataset.actorPartsSelectedId=selectedId;
  if(!entry){actorStatus.textContent=selectedId?`${selectedId} 目前未載入，已保留選取，不會改套用其他角色。請回到該場景後再試。`:'請選擇角色。未載入角色會標示等待，進入對應場景後可用。';return;}
  const currentError=controller.status?.(entry.id);
  actorStatus.textContent=`${entry.label||entry.id}（${entry.id}）・${kindLabel(entry.kind)}・${entry.ready?'已載入':'尚未載入，請進入對應場景'}${entry.supported&&!entry.supported()?'。目前形態暫不支援零件編輯。':''}${currentError?`。保存設定尚未成功還原：${currentError}`:''}`;
  const saved=store.read();
  const card=validateActorPartsCard(saved.actors?.[entry.id]||defaultActorPartsCard(entry),entry);
  for(const [slot,definition] of Object.entries(entry.slots||{})){
   const row=make('label',definition.label||slot),choice=make('select');choice.dataset.slot=slot;
   const choices=[['default','原樣（不替換）'],['native','原生裝配（本角色零件）']];if(definition.allowNone===true)choices.push(['none','卸下此零件']);
   for(const [value,text] of choices){const option=make('option',text);option.value=value;choice.append(option);}
   choice.value=card.parts[slot];row.append(choice);fields.append(row);
   choice.addEventListener('change',guard(()=>{json.value=JSON.stringify(cardFromForm(),null,2);status.textContent='選件尚未保存。按「套用選件並保存」才會改變角色。';}));
  }
  json.value=JSON.stringify(card,null,2);formSignature=signature(entry);formReady=true;updateAvailability();
 }
 function refreshList(){
  entries=registry.list();const previousCategory=category.value;
  category.replaceChildren();const all=make('option','全部角色');all.value='';category.append(all);
  for(const kind of [...new Set(entries.map(entry=>entry.kind||''))].filter(Boolean).sort()){const option=make('option',kindLabel(kind));option.value=kind;category.append(option);}
  category.value=[...category.children].some(option=>option.value===previousCategory)?previousCategory:'';
  const query=search.value.trim().toLocaleLowerCase(),shown=entries.filter(entry=>(!category.value||entry.kind===category.value)&&(!query||`${entry.label||''} ${entry.id}`.toLocaleLowerCase().includes(query)));
  select.replaceChildren();const placeholder=make('option','請選擇角色');placeholder.value='';select.append(placeholder);
  const selected=current();
  for(const entry of shown){const option=make('option',`${entry.label||entry.id}（${entry.id}）${entry.ready?'':' · 尚未載入'}`);option.value=entry.id;option.disabled=!entry.ready;select.append(option);}
  if(selectedId&&!shown.some(entry=>entry.id===selectedId)){
   const option=make('option',selected?`${selected.label||selectedId}（目前選取，不符合篩選）`:`${selectedId}（目前未載入）`);option.value=selectedId;option.disabled=!selected?.ready;select.append(option);
  }
  const pending=entries.filter(entry=>!entry.ready).map(entry=>entry.id),readyCount=entries.length-pending.length;
  dialog.dataset.actorPartsKnownCount=String(entries.length);dialog.dataset.actorPartsReadyCount=String(readyCount);dialog.dataset.actorPartsPendingIds=JSON.stringify(pending);dialog.dataset.actorPartsSelectedId=selectedId;
  select.value=selectedId;count.textContent=`已生成 ${readyCount}／${entries.length} 位，等待場景或事件 ${pending.length} 位。篩選顯示 ${shown.length} 位。${selectedId&&selected&&!shown.includes(selected)?'目前選取已保留。':''}`;
 }
 function requireEntry({ready=false,write=false}={}){
  // 在每次操作前重新讀取，避免場景切換後拿舊表單套用到新角色或新形態。
  const entry=registry.list().find(item=>item.id===selectedId);
  if(!entry)throw new Error('目前選取角色未載入，請先選擇可用角色。');
  if(ready&&entry.supported&&!entry.supported())throw new Error('角色目前形態暫不支援零件編輯。');
  if(ready&&!entry.ready)throw new Error('此角色尚未載入，請進入對應場景後再套用。');
  if(write&&ownership.ownerOf(selectedId)&&ownership.ownerOf(selectedId)!==OWNER)throw new Error('此角色由其他外觀系統管理，請先在原面板還原。');
  return entry;
 }
 function cardFromForm(){
  const entry=requireEntry({ready:true,write:true}),choices=fields.querySelectorAll('select');
  if(!formReady||formSignature!==signature(entry)||choices.length!==Object.keys(entry.slots||{}).length)throw new Error('選件尚未完整載入，請重新載入已保存設定。');
  const card=defaultActorPartsCard(entry),seen=new Set();
  for(const choice of choices){const slot=choice.dataset.slot;if(!Object.hasOwn(entry.slots,slot)||seen.has(slot))throw new Error('選件欄位不完整或重複。');seen.add(slot);card.parts[slot]=choice.value;}
  return validateActorPartsCard(card,entry);
 }
 function showError(error){status.textContent=`未完成：${error instanceof Error?error.message:String(error)}`;try{updateAvailability();}catch{apply.disabled=true;load.disabled=true;reset.disabled=true;}}
 function guard(fn){return event=>{if(disposed)return;try{fn(event);}catch(error){showError(error);}};}
 function reloadSelected(){refreshList();renderSelected();}
 function exportSaved(){const entry=requireEntry(),saved=store.read().actors?.[entry.id],card=validateActorPartsCard(saved||(entry.ready?controller.exportCard(entry.id):defaultActorPartsCard(entry)),entry);json.value=JSON.stringify(card,null,2);return card;}
 function unlock(){if(!ownsLock)return;state.bzBoothBrowsing=previousLock;ownsLock=false;resetInput();}
 button.addEventListener('click',guard(()=>{
  if(dialog.open||!canOpen())return;
  previousFocus=doc.activeElement;previousLock=state.bzBoothBrowsing;resetInput();state.bzBoothBrowsing=true;ownsLock=true;
  try{dialog.showModal();}catch(error){unlock();throw error;}
  try{reloadSelected();status.textContent='選擇角色與零件後再套用，僅開啟面板不會改變外觀。';}catch(error){showError(error);}
  select.focus();
 }));
 dialog.addEventListener('close',()=>{unlock();const focusTarget=previousFocus?.isConnected===false?button:previousFocus||button;focusTarget.focus();});
 // 原生 dialog 處理 Tab 焦點循環與 Escape；阻止快捷鍵冒泡，不阻止原生輸入。
 for(const name of ['keydown','keyup'])dialog.addEventListener(name,event=>event.stopPropagation());
 close.addEventListener('click',()=>dialog.close());
 select.addEventListener('change',guard(()=>{selectedId=select.value;status.textContent='';renderSelected();}));
 search.addEventListener('input',guard(refreshList));category.addEventListener('change',guard(refreshList));
 json.addEventListener('input',()=>{status.textContent='JSON 尚未套用。按「載入 JSON 並套用」才會保存。';});
 apply.addEventListener('click',guard(()=>{controller.apply(cardFromForm());reloadSelected();status.textContent='已套用並保存此角色。重新開啟或重新載入遊戲會讀取這份獨立設定。';}));
 load.addEventListener('click',guard(()=>{const entry=requireEntry({ready:true,write:true});controller.apply(validateActorPartsCard(json.value,entry));reloadSelected();status.textContent='JSON 已套用並保存，原遊戲進度與原換裝存檔不變。';}));
 migrate.addEventListener('click',guard(()=>{const entry=requireEntry({ready:true});json.value=JSON.stringify(migrateLegacyCharacterCard(json.value,entry),null,2);status.textContent='已將舊三角色設定卡轉為新 JSON，尚未套用或保存。請確認後按「載入 JSON 並套用」。原角色換裝設定不在此轉換範圍。';}));
 reload.addEventListener('click',guard(()=>{reloadSelected();status.textContent='已重新載入保存的設定，未保存的編輯已捨棄。';}));
 exportButton.addEventListener('click',guard(()=>{exportSaved();status.textContent='已將保存的設定匯出至 JSON 欄位，可複製或下載。未保存的選件不會包含在內。';}));
 download.addEventListener('click',guard(()=>{
  const card=exportSaved(),view=doc.defaultView||globalThis,URLApi=view.URL||globalThis.URL,BlobType=view.Blob||globalThis.Blob;
  if(typeof URLApi?.createObjectURL!=='function'||typeof BlobType!=='function')throw new Error('目前環境無法下載，請複製上方 JSON。');
  const url=URLApi.createObjectURL(new BlobType([json.value],{type:'application/json;charset=utf-8'})),link=make('a');link.href=url;link.download=`actor-parts-${card.actorId.replace(/[^a-zA-Z0-9_-]/g,'_')}.json`;doc.body.append(link);
  try{link.click();status.textContent='已準備下載此角色的保存設定，JSON 欄位亦可複製。';}finally{link.remove();setTimeout(()=>URLApi.revokeObjectURL(url),0);}
 }));
 reset.addEventListener('click',guard(()=>{if(!selectedId)throw new Error('請先選擇角色。');if(ownerOf()&&ownerOf()!==OWNER)throw new Error('此角色由其他外觀系統管理，請先在原面板還原。');controller.reset(selectedId);reloadSelected();status.textContent='已還原此角色並清除它的新系統設定，其他外觀系統與進度不變。';}));
 clear.addEventListener('click',guard(()=>{controller.clear();reloadSelected();status.textContent='已清除全部新系統設定。原角色換裝、設定卡預覽與遊戲進度不變。';}));
 const unsubscribe=registry.subscribe(guard(()=>{refreshList();if(dialog.open&&selectionSignature!==signature(current())){renderSelected();status.textContent='角色載入狀態或形態已更新，已重新讀取設定，請確認後再套用。';}else if(dialog.open)updateAvailability();}));
 guard(()=>{refreshList();renderSelected();})();
 return {dispose(){if(disposed)return;if(dialog.open)dialog.close();else unlock();disposed=true;if(typeof unsubscribe==='function')unsubscribe();dialog.remove();button.remove();}};
}
