import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCardPreviewPanel} from '../src/systems/character-cards/panel.js';
import {defaultCharacterCard} from '../src/actors/character-card-config.js';
class Node{
 constructor(tag,doc){Object.assign(this,{tag,doc,children:[],events:{},attrs:{},dataset:{},value:'',open:false});}
 append(...nodes){for(const n of nodes){this.children.push(n);n.parent=this;if(this.tag==='select'&&this.children.length===1)this.value=n.value;}}
 replaceChildren(...nodes){for(const n of this.children)n.parent=null;this.children=[];this.append(...nodes);}
 querySelectorAll(tag){return this.children.flatMap(n=>[...(n.tag===tag?[n]:[]),...n.querySelectorAll(tag)]);}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 fire(k,event={}){for(const fn of this.events[k]||[])fn(event);}
 focus(){this.doc.activeElement=this;}
 showModal(){if(this.showFailure)throw Error('modal unavailable');this.open=true;}
 close(){this.open=false;this.fire('close');}
 remove(){this.parent.children.splice(this.parent.children.indexOf(this),1);}
}
function setup(){
 const doc={createElement(tag){return new Node(tag,doc);},querySelector(){return null;}};doc.body=new Node('body',doc);
 const state={},calls=[],store={read:()=>({actors:{}})},ownership={ownerOf:()=>null},controller={apply:v=>calls.push(['apply',v]),reset:id=>calls.push(['reset',id]),clear:()=>calls.push(['clear'])};
 const panel=mountCardPreviewPanel({controller,store,state,ownership,canOpen:()=>!state.busy&&!state.bzBoothBrowsing,resetInput:()=>calls.push(['resetInput']),document:doc});
 const all=()=>{const result=[];function walk(n){result.push(n);n.children.forEach(walk);}walk(doc.body);return result;};
 return {doc,state,calls,panel,store,ownership,id:id=>all().find(n=>n.id===id),text:text=>all().find(n=>n.textContent===text)};
}
test('預覽對話框 lock/輸入/關閉/focus 與原換裝共存，不自動套用',()=>{
 const s=setup(),button=s.id('card-preview-open'),dialog=s.id('card-preview-panel');button.fire('click');
 assert.equal(dialog.open,true);assert.equal(s.state.bzBoothBrowsing,true);assert.equal(s.calls.some(c=>c[0]==='apply'),false);
 let stopped=0;for(const key of ['keydown','keyup'])dialog.fire(key,{stopPropagation(){stopped++;}});assert.equal(stopped,2);
 s.ownership.ownerOf=()=> 'wardrobe-v1';s.id('card-preview-actor').fire('change');assert.match(s.id('card-preview-owner').textContent,/原面板還原/);
 dialog.close();assert.equal(s.state.bzBoothBrowsing,false);assert.equal(s.doc.activeElement,button);
 s.state.busy=true;button.fire('click');assert.equal(dialog.open,false);s.state.busy=false;dialog.showFailure=true;button.fire('click');assert.equal(s.state.bzBoothBrowsing,false);
});
test('逐件與原始JSON只在明確套用時送controller，超限或跨角色拒絕',()=>{
 const s=setup();s.id('card-preview-open').fire('click');
 const part=s.id('card-preview-parts').querySelectorAll('select')[0];part.value='none';assert.equal(s.calls.some(c=>c[0]==='apply'),false);
 s.text('套用選件並保存預覽').fire('click');assert.equal(s.calls.at(-1)[1].parts.top,'none');
 const input=s.id('card-preview-json'),load=s.text('載入 JSON 並套用'),raw=JSON.stringify(defaultCharacterCard('bz26-D26'));
 for(const bytes of [4095,4096]){input.value=raw+' '.repeat(bytes-raw.length);load.fire('click');}
 assert.equal(s.calls.filter(c=>c[0]==='apply').length,3);
 for(const text of [raw+' '.repeat(4097-raw.length),'bad',JSON.stringify(defaultCharacterCard('bz26-D31'))]){input.value=text;load.fire('click');}
 assert.equal(s.calls.filter(c=>c[0]==='apply').length,3);
 s.panel.dispose();assert.equal(s.state.bzBoothBrowsing,false);assert.equal(s.doc.body.children.length,0);
});
test('損壞預覽儲存有清除通道，不會套用空欄或改寫其他存檔',()=>{
 const s=setup();s.store.read=()=>{throw Error('corrupt');};s.id('card-preview-open').fire('click');
 assert.equal(s.id('card-preview-json').value,'');assert.equal(s.id('card-preview-parts').children.length,0);
 s.store.read=()=>({actors:{}});s.text('套用選件並保存預覽').fire('click');assert.equal(s.calls.some(c=>c[0]==='apply'),false);
 s.id('card-preview-actor').fire('change');s.store.read=()=>{throw Error('again');};s.id('card-preview-actor').value='bz26-D31';s.id('card-preview-actor').fire('change');
 s.store.read=()=>({actors:{}});s.text('套用選件並保存預覽').fire('click');assert.equal(s.calls.some(c=>c[0]==='apply'),false);
 s.text('清除全部預覽設定').fire('click');assert.equal(s.calls.some(c=>c[0]==='clear'),true);assert.equal(s.calls.some(c=>c[0]==='apply'),false);
});
