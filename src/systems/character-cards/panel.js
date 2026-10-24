import {CHARACTER_CARD_CATALOG,defaultCharacterCard,validateCharacterCard,characterCardPartChoices} from '../../actors/character-card-config.js';
/** 明確操作才套用。原生 dialog 保留 Tab/Escape，輸入不傳至遊戲快捷鍵。 */
export function mountCardPreviewPanel({controller,store,state,ownership,canOpen,resetInput,initialMessage='',document:doc=globalThis.document}){
 const make=(tag,text)=>{const node=doc.createElement(tag);if(text)node.textContent=text;return node;};
 const button=make('button','設定卡預覽');button.type='button';button.className='chip';button.id='card-preview-open';button.setAttribute('aria-haspopup','dialog');(doc.querySelector('#hud .col.r')||doc.body).append(button);
 const dialog=make('dialog');dialog.id='card-preview-panel';dialog.setAttribute('aria-labelledby','card-preview-title');
 const title=make('h2','三套服裝・遊戲內預覽');title.id='card-preview-title';
 const hint=make('p','僅限目前的預覽網址。三位系攤 NPC 使用原動畫；沒有新肘膝。原模型衣身一體，上衣與褲裝尚不能安全卸下。一般遊戲不載入設定卡，遊戲進度與原換裝資料不變。請先進入包種茶節查看攤位。');
 const close=make('button','關閉');close.type='button';close.className='card-close';
 const label=make('label','角色'),select=make('select');select.id='card-preview-actor';label.htmlFor=select.id;
 for(const [id,def] of Object.entries(CHARACTER_CARD_CATALOG)){const option=make('option',def.label);option.value=id;select.append(option);}
 const fields=make('div');fields.id='card-preview-parts';const labels={top:'上衣',bottom:'褲裝',dress:'長袍／和服',headwear:'髮飾／假髮',custom:'腰帶／領巾','hand.L':'左手道具'};
 const jsonLabel=make('label','設定卡 JSON'),json=make('textarea');json.id='card-preview-json';jsonLabel.htmlFor=json.id;json.maxLength=4096;json.spellcheck=false;
 const apply=make('button','套用選件並保存預覽'),load=make('button','載入 JSON 並套用'),reset=make('button','還原此角色'),clear=make('button','清除全部預覽設定');
 for(const node of [apply,load,reset,clear])node.type='button';
 const status=make('p',initialMessage);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const conflict=make('p');conflict.id='card-preview-owner';
 const link=make('a','離開預覽，回到一般遊戲');link.href='./index.html';
 const actions=make('div');actions.className='card-actions';actions.append(apply,load,reset,clear);
 dialog.append(close,title,hint,label,select,conflict,fields,jsonLabel,json,actions,status,link);doc.body.append(dialog);
 function describeOwner(){const owner=ownership.ownerOf(select.value);conflict.textContent=owner==='wardrobe-v1'?'此角色已有原「角色換裝」配裝。請關閉此視窗，在原面板還原此角色，再回來套用設定卡。':owner==='cards-preview'?'此角色由設定卡預覽管理。若要使用原「角色換裝」，請先在這裡還原此角色。':'此角色目前沒有其他配裝器佔用。';}
 let formReady=false;
 function selected(){
  formReady=false;apply.disabled=true;
  const card=store.read().actors[select.value]||defaultCharacterCard(select.value);json.value=JSON.stringify(card,null,2);fields.replaceChildren();
  for(const [slot,id] of Object.entries(CHARACTER_CARD_CATALOG[select.value].parts)){
   const row=make('label',labels[slot]),choice=make('select');choice.dataset.slot=slot;
   for(const [value,text] of characterCardPartChoices(select.value,slot).map(value=>[value,value==='default'?'原樣':value==='none'?'卸下':`裝配：${id}`])){const o=make('option',text);o.value=value;choice.append(o);}choice.value=card.parts[slot];row.append(choice);fields.append(row);
  }describeOwner();formReady=true;apply.disabled=false;
 }
 const guard=fn=>()=>{try{fn();}catch(error){status.textContent=`未完成：${error.message}`;describeOwner();}};
 let ownsLock=false;
 button.addEventListener('click',guard(()=>{
  if(!canOpen())return;resetInput();state.bzBoothBrowsing=true;ownsLock=true;
  try{dialog.showModal();}catch(error){state.bzBoothBrowsing=false;ownsLock=false;throw error;}
  try{selected();}catch(error){fields.replaceChildren();json.value='';status.textContent=`預覽設定未載入：${error.message}。可清除全部預覽設定，原遊戲與換裝不受影響。`;}
  select.focus();
 }));
 dialog.addEventListener('close',()=>{if(ownsLock){state.bzBoothBrowsing=false;ownsLock=false;resetInput();}button.focus();});
 for(const name of ['keydown','keyup'])dialog.addEventListener(name,event=>event.stopPropagation());
 close.addEventListener('click',()=>dialog.close());select.addEventListener('change',guard(selected));
 apply.addEventListener('click',guard(()=>{
  if(!formReady)throw new Error('選件尚未完整載入，請先清除損壞預覽設定或重新選擇角色。');
  const choices=fields.querySelectorAll('select');
  if(choices.length!==Object.keys(CHARACTER_CARD_CATALOG[select.value].parts).length)throw new Error('預覽選件不完整');
  const card=defaultCharacterCard(select.value);for(const choice of fields.querySelectorAll('select'))card.parts[choice.dataset.slot]=choice.value;
  controller.apply(validateCharacterCard(card,select.value));selected();status.textContent='已套用並保存此預覽角色。關閉視窗可在攤位看原動畫與服裝。';
 }));
 load.addEventListener('click',guard(()=>{controller.apply(validateCharacterCard(json.value,select.value));selected();status.textContent='JSON 已套用並保存於遊戲預覽專用空間。';}));
 reset.addEventListener('click',guard(()=>{controller.reset(select.value);selected();status.textContent='已還原此角色並釋放配裝權，其他配裝與進度不變。';}));
 clear.addEventListener('click',guard(()=>{controller.clear();selected();status.textContent='三角色預覽已清除，原四角色換裝與進度不變。';}));
 return {dispose(){if(dialog.open)dialog.close();dialog.remove();button.remove();}};
}
