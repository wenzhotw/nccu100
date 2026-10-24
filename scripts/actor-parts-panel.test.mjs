import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountActorPartsPanel} from '../src/systems/actor-parts/panel.js';
import {defaultActorPartsCard,validateActorPartsCard} from '../src/actors/actor-parts-config.js';
import {defaultCharacterCard} from '../src/actors/character-card-config.js';

class Node{
 constructor(tag,doc){Object.assign(this,{tag,doc,children:[],events:{},attrs:{},dataset:{},value:'',textContent:'',open:false,disabled:false});}
 get isConnected(){return this===this.doc.body||!!this.parent?.isConnected;}
 append(...nodes){for(const node of nodes){this.children.push(node);node.parent=this;if(this.tag==='select'&&this.children.length===1)this.value=node.value;}}
 replaceChildren(...nodes){for(const node of this.children)node.parent=null;this.children=[];this.append(...nodes);}
 querySelectorAll(tag){return this.children.flatMap(node=>[...(node.tag===tag?[node]:[]),...node.querySelectorAll(tag)]);}
 setAttribute(key,value){this.attrs[key]=value;}
 addEventListener(key,fn){(this.events[key]??=[]).push(fn);}
 fire(key,event={}){for(const fn of this.events[key]||[])fn(event);}
 focus(){this.doc.activeElement=this;}
 showModal(){if(this.showFailure)throw Error('modal unavailable');this.open=true;}
 close(){this.open=false;this.fire('close');}
 remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}}
 click(){this.doc.clicks.push({tag:this.tag,href:this.href,download:this.download});this.fire('click');}
}
const actor=(id='player',extras={})=>({id,label:id==='player'?'玩家':id,kind:'human',ready:true,root:{},slots:{body:{label:'衣身',sources:[{}],allowNone:false},hat:{label:'帽子',sources:[{}],allowNone:true}},...extras});
function setup(initial=[actor(),actor('campus-npc',{label:'校園同學'}),actor('pending',{ready:false,label:'等待角色',kind:'animal'})]){
 const doc={clicks:[],createElement(tag){return new Node(tag,doc);},querySelector(){return null;}};doc.body=new Node('body',doc);
 const blobs=[],revoked=[];doc.defaultView={Blob,URL:{createObjectURL(blob){blobs.push(blob);return 'blob:actor-parts-test';},revokeObjectURL(url){revoked.push(url);}}};
 const state={},calls=[],saved={actors:{}},owners=new Map(),listeners=new Set();let entries=initial;
 const registry={list:()=>entries,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);}};
 const store={read:()=>saved};
 const ownership={ownerOf:id=>owners.get(id)||null};
 const controller={
  apply(card){calls.push(['apply',card]);saved.actors[card.actorId]=structuredClone(card);owners.set(card.actorId,'actor-parts');},
  reset(id){calls.push(['reset',id]);delete saved.actors[id];owners.delete(id);},
  clear(){calls.push(['clear']);saved.actors={};for(const [id,owner] of owners)if(owner==='actor-parts')owners.delete(id);},
  exportCard(id){calls.push(['export',id]);return saved.actors[id]||defaultActorPartsCard(entries.find(entry=>entry.id===id));},
  status(){return '';},
 };
 const panel=mountActorPartsPanel({registry,controller,store,state,ownership,canOpen:()=>!state.busy&&!state.bzBoothBrowsing,resetInput:()=>calls.push(['resetInput']),document:doc});
 const all=()=>{const result=[];function walk(node){result.push(node);node.children.forEach(walk);}walk(doc.body);return result;};
 const id=value=>all().find(node=>node.id===value);
 const choose=value=>{id('actor-parts-actor').value=value;id('actor-parts-actor').fire('change');};
 const open=()=>id('actor-parts-open').fire('click');
 const update=(next,event={type:'ready'})=>{entries=next;for(const fn of listeners)fn(event);};
 return {doc,state,calls,saved,owners,registry,store,controller,panel,id,choose,open,update,listeners,blobs,revoked};
}
const applies=s=>s.calls.filter(call=>call[0]==='apply');
const part=(s,slot)=>s.id('actor-parts-fields').querySelectorAll('select').find(node=>node.dataset.slot===slot);

test('原生 modal 阻擋遊戲輸入，無自動套用，關閉及 dispose 還原焦點與鎖',()=>{
 const s=setup(),button=s.id('actor-parts-open'),dialog=s.id('actor-parts-panel');button.focus();s.open();
 assert.equal(dialog.open,true);assert.equal(s.state.bzBoothBrowsing,true);assert.equal(applies(s).length,0);assert.equal(s.id('actor-parts-apply').disabled,true);
 let stopped=0;for(const event of ['keydown','keyup'])dialog.fire(event,{key:'w',stopPropagation(){stopped++;}});assert.equal(stopped,2);
 dialog.close();assert.equal(s.state.bzBoothBrowsing,undefined);assert.equal(s.doc.activeElement,button);assert.equal(s.calls.filter(call=>call[0]==='resetInput').length,2);
 s.state.busy=true;s.open();assert.equal(dialog.open,false);s.state.busy=false;dialog.showFailure=true;s.open();assert.equal(s.state.bzBoothBrowsing,undefined);assert.match(s.id('actor-parts-status').textContent,/modal unavailable/);
 dialog.showFailure=false;s.open();s.panel.dispose();assert.equal(s.state.bzBoothBrowsing,undefined);assert.equal(s.listeners.size,0);assert.equal(s.doc.body.children.length,0);s.panel.dispose();
});

test('依 metadata 產生全部角色與必要部件，未載入選項停用，選件需明確保存',()=>{
 const s=setup();s.open();
 assert.equal(s.id('actor-parts-actor').children.find(option=>option.value==='pending').disabled,true);
 assert.equal(s.id('actor-parts-panel').dataset.actorPartsKnownCount,'3');assert.equal(s.id('actor-parts-panel').dataset.actorPartsReadyCount,'2');assert.deepEqual(JSON.parse(s.id('actor-parts-panel').dataset.actorPartsPendingIds),['pending']);
 s.choose('player');assert.equal(part(s,'body').children.some(option=>option.value==='none'),false);
 assert.deepEqual(part(s,'hat').children.map(option=>option.value),['default','native','none']);
 part(s,'hat').value='none';part(s,'hat').fire('change');assert.equal(applies(s).length,0);
 assert.equal(JSON.parse(s.id('actor-parts-json').value).parts.hat,'none');s.id('actor-parts-apply').fire('click');
 assert.equal(applies(s).length,1);assert.equal(s.saved.actors.player.parts.hat,'none');assert.equal(s.owners.get('player'),'actor-parts');
 part(s,'hat').value='native';s.id('actor-parts-reload').fire('click');assert.equal(part(s,'hat').value,'none');
 s.id('actor-parts-panel').close();s.open();assert.equal(part(s,'hat').value,'none');
 part(s,'body').value='none';s.id('actor-parts-apply').fire('click');assert.equal(applies(s).length,1);assert.match(s.id('actor-parts-status').textContent,/必要部件/);
});

test('JSON 原文以 byte 上限驗證，拒絕壞 JSON、跨角色、非完整欄位與舊格式',()=>{
 const s=setup();s.open();s.choose('player');const json=s.id('actor-parts-json'),button=s.id('actor-parts-import');
 const card=defaultActorPartsCard(s.registry.list()[0]),raw=JSON.stringify(card);
 for(const size of [16383,16384]){json.value=raw+' '.repeat(size-raw.length);button.fire('click');}
 assert.equal(applies(s).length,2);
 const extra={...card,parts:{...card.parts,invalid:'none'}},missing={...card,parts:{body:'default'}};
 for(const value of [raw+' '.repeat(16385-raw.length),'bad',JSON.stringify({...card,actorId:'campus-npc'}),JSON.stringify(extra),JSON.stringify(missing),JSON.stringify(defaultCharacterCard('bz26-D26')),raw+'　'.repeat(5500)]){json.value=value;button.fire('click');}
 assert.equal(applies(s).length,2);assert.match(s.id('actor-parts-status').textContent,/16 KiB/);
});

test('所有其他外觀 owner 必須原面板還原，不能從新面板套用或解除',()=>{
 const s=setup();s.open();
 for(const owner of ['wardrobe-v1','cards-preview','another-owner']){
  s.owners.set('player',owner);s.choose('player');assert.equal(s.id('actor-parts-apply').disabled,true);assert.equal(s.id('actor-parts-import').disabled,true);assert.equal(s.id('actor-parts-reset').disabled,true);
  s.id('actor-parts-apply').fire('click');s.id('actor-parts-import').fire('click');s.id('actor-parts-reset').fire('click');
  assert.equal(s.owners.get('player'),owner);assert.equal(applies(s).length,0);assert.equal(s.calls.some(call=>call[0]==='reset'),false);
 }
 s.owners.set('player','actor-parts');s.choose('player');assert.equal(s.id('actor-parts-reset').disabled,false);s.id('actor-parts-reset').fire('click');assert.equal(s.owners.has('player'),false);
 s.owners.set('campus-npc','wardrobe-v1');s.id('actor-parts-clear').fire('click');assert.equal(s.owners.get('campus-npc'),'wardrobe-v1');assert.match(s.id('actor-parts-status').textContent,/原角色換裝/);
});

test('搜尋、分類與 unrelated ready 不清空草稿，也不偷偷改選角色',()=>{
 const s=setup();s.open();s.choose('player');part(s,'hat').value='none';part(s,'hat').fire('change');const draft=s.id('actor-parts-json').value;
 s.id('actor-parts-search').value='校園';s.id('actor-parts-search').fire('input');assert.equal(s.id('actor-parts-actor').value,'player');assert.match(s.id('actor-parts-count').textContent,/目前選取已保留/);
 s.id('actor-parts-category').value='animal';s.id('actor-parts-category').fire('change');assert.equal(s.id('actor-parts-actor').value,'player');
 s.update([...s.registry.list(),actor('newcomer')]);assert.equal(s.id('actor-parts-json').value,draft);assert.equal(part(s,'hat').value,'none');assert.equal(s.id('actor-parts-actor').value,'player');
});

test('已選角色卸載時保留 ID 並停用，重新 ready 才能編輯，無自動套用',()=>{
 const s=setup();s.open();s.choose('player');
 s.update(s.registry.list().filter(entry=>entry.id!=='player'),{type:'remove'});
 assert.equal(s.id('actor-parts-actor').value,'player');assert.equal(s.id('actor-parts-apply').disabled,true);assert.match(s.id('actor-parts-actor-status').textContent,/未載入/);
 s.id('actor-parts-apply').fire('click');assert.equal(applies(s).length,0);
 assert.equal(s.id('actor-parts-panel').dataset.actorPartsKnownCount,'2');assert.equal(s.id('actor-parts-panel').dataset.actorPartsReadyCount,'1');assert.equal(s.id('actor-parts-panel').dataset.actorPartsSelectedId,'player');
 s.update([actor(),...s.registry.list()]);assert.equal(s.id('actor-parts-panel').dataset.actorPartsKnownCount,'3');assert.equal(s.id('actor-parts-panel').dataset.actorPartsReadyCount,'2');assert.equal(s.id('actor-parts-actor').value,'player');assert.equal(s.id('actor-parts-apply').disabled,false);assert.equal(applies(s).length,0);
 s.choose('pending');assert.equal(s.id('actor-parts-import').disabled,true);assert.match(s.id('actor-parts-actor-status').textContent,/尚未載入/);
 s.id('actor-parts-import').fire('click');assert.equal(applies(s).length,0);
 s.update(s.registry.list().map(entry=>entry.id==='pending'?{...entry,ready:true}:entry));assert.deepEqual(JSON.parse(s.id('actor-parts-panel').dataset.actorPartsPendingIds),[]);assert.equal(s.id('actor-parts-panel').dataset.actorPartsReadyCount,'3');assert.match(s.id('actor-parts-count').textContent,/等待場景或事件 0 位/);
});

test('缺欄、重複欄與未通知的形態改變都不能套用不完整表單',()=>{
 for(const mode of ['missing','duplicate','changed']){
  const s=setup();s.open();s.choose('player');
  if(mode==='missing')part(s,'hat').remove();
  if(mode==='duplicate')part(s,'hat').dataset.slot='body';
  if(mode==='changed')s.registry.list()[0].slots.extra={label:'新道具',sources:[{}],allowNone:true};
  s.id('actor-parts-apply').fire('click');assert.equal(applies(s).length,0);assert.match(s.id('actor-parts-status').textContent,/完整|重複/);
 }
});

test('讀取保存失敗會清空並停用表單，保留明確清除救援；controller 失敗保留輸入',()=>{
 const s=setup();s.open();s.choose('player');s.store.read=()=>{throw Error('保存資料損壞');};s.id('actor-parts-reload').fire('click');
 assert.equal(s.id('actor-parts-apply').disabled,true);assert.equal(s.id('actor-parts-json').value,'');assert.equal(s.id('actor-parts-fields').children.length,0);assert.match(s.id('actor-parts-status').textContent,/保存資料損壞/);
 s.id('actor-parts-apply').fire('click');assert.equal(applies(s).length,0);
 s.store.read=()=>s.saved;s.id('actor-parts-clear').fire('click');assert.equal(s.calls.some(call=>call[0]==='clear'),true);
 part(s,'hat').value='native';part(s,'hat').fire('change');const raw=s.id('actor-parts-json').value;s.controller.apply=()=>{throw Error('儲存空間不足');};s.id('actor-parts-apply').fire('click');
 assert.equal(s.id('actor-parts-json').value,raw);assert.equal(part(s,'hat').value,'native');assert.match(s.id('actor-parts-status').textContent,/儲存空間不足/);
 s.controller.status=()=> '原換裝正在使用';s.id('actor-parts-reload').fire('click');assert.match(s.id('actor-parts-actor-status').textContent,/保存設定尚未成功還原：原換裝正在使用/);
});

test('匯出與下載是已保存設定，不暗存草稿；未載入角色從 store 匯出而非 controller',async()=>{
 const s=setup();s.open();s.choose('player');part(s,'hat').value='native';s.id('actor-parts-apply').fire('click');part(s,'hat').value='none';part(s,'hat').fire('change');
 s.id('actor-parts-export').fire('click');assert.equal(JSON.parse(s.id('actor-parts-json').value).parts.hat,'native');assert.equal(applies(s).length,1);
 s.id('actor-parts-download').fire('click');assert.equal(s.doc.clicks.at(-1).download,'actor-parts-player.json');assert.equal(JSON.parse(await s.blobs[0].text()).parts.hat,'native');
 await new Promise(resolve=>setTimeout(resolve,1));assert.deepEqual(s.revoked,['blob:actor-parts-test']);
 const pending=s.registry.list().find(entry=>entry.id==='pending');s.saved.actors.pending=defaultActorPartsCard(pending);s.saved.actors.pending.parts.hat='none';s.choose('pending');
 const count=s.calls.filter(call=>call[0]==='export').length;s.id('actor-parts-export').fire('click');assert.equal(JSON.parse(s.id('actor-parts-json').value).parts.hat,'none');assert.equal(s.calls.filter(call=>call[0]==='export').length,count);
});

test('舊三角色卡只在明確轉換時變成新 JSON，不暗中套用或保存',()=>{
 const old=defaultCharacterCard('bz26-D26'),entry=actor('bz26-D26',{slots:Object.fromEntries(Object.keys(old.parts).map(slot=>[slot,{label:slot,sources:[{}],allowNone:!['top','bottom'].includes(slot)}]))});
 const s=setup([entry]);s.open();s.choose(entry.id);old.parts.dress='none';s.id('actor-parts-json').value=JSON.stringify(old);s.id('actor-parts-migrate').fire('click');
 const next=validateActorPartsCard(s.id('actor-parts-json').value,entry);assert.equal(next.kind,'nccu100.actor-parts');assert.equal(next.parts.dress,'none');assert.equal(applies(s).length,0);assert.deepEqual(s.saved.actors,{});assert.match(s.id('actor-parts-status').textContent,/尚未套用或保存/);
 s.id('actor-parts-import').fire('click');assert.equal(applies(s).length,1);
});

test('不支援形態停用套用並顯示原因，還原仍可用',()=>{
 const s=setup([actor('animal',{supported:()=>false})]);s.open();s.choose('animal');assert.equal(s.id('actor-parts-apply').disabled,true);assert.equal(s.id('actor-parts-import').disabled,true);assert.equal(s.id('actor-parts-reset').disabled,false);assert.match(s.id('actor-parts-actor-status').textContent,/目前形態暫不支援/);
 s.id('actor-parts-import').fire('click');assert.equal(applies(s).length,0);
});

test('手機寬度包含 padding，篩選與操作可換行，CSS 不滲入其他面板',()=>{
 const css=readFileSync(new URL('../src/systems/actor-parts/panel.css',import.meta.url),'utf8');
 assert.match(css,/#actor-parts-panel,#actor-parts-panel \*\{box-sizing:border-box\}/);
 assert.match(css,/width:min\(640px,calc\(100vw - 28px\)\);max-width:calc\(100vw - 28px\)/);
 assert.match(css,/max-height:calc\(100dvh - 32px\);overflow:auto/);
 assert.match(css,/flex-wrap:wrap/);assert.match(css,/@media\(max-width:420px\)/);
});
