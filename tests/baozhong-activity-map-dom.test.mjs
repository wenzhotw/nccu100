import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mountActivityMap } from '../src/systems/baozhong/activity-map.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const layout=read('../src/systems/baozhong/layout.json'),content=read('../src/content/baozhong.json');
// 最小 DOM 替身只測事件與生命週期，不宣稱取代瀏覽器排版檢查。
function fakeDocument() {
  class Node {
    constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.dataset={};this.events=new Map();this.style={setProperty(){}};this.value='';this.isConnected=true;}
    append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
    setAttribute(k,v){this.attrs[k]=String(v);} getAttribute(k){return this.attrs[k];}
    replaceChildren(...nodes){this.children=[];this.append(...nodes);}
    remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
    focus(){this.doc.activeElement=this;}
    contains(n){return n===this||this.children.some(c=>c.contains(n));}
    addEventListener(k,fn){if(!this.events.has(k))this.events.set(k,new Set());this.events.get(k).add(fn);}
    removeEventListener(k,fn){this.events.get(k)?.delete(fn);}
    emit(k,event={}){for(const fn of this.events.get(k)||[])fn({target:this,preventDefault(){},stopPropagation(){},...event});}
    querySelectorAll(selector){const tags=selector.toUpperCase().split(',');return this.children.flatMap(c=>[...(tags.includes(c.tagName)?[c]:[]),...c.querySelectorAll(selector)]);}
    closest(){return this.dataset.boothId?this:this.parent?.closest();}
  }
  const doc={events:new Map()}; doc.createElement=tag=>new Node(tag,doc);doc.createElementNS=(_,tag)=>new Node(tag,doc);
  doc.head=doc.createElement('head');doc.body=doc.createElement('body');doc.hud=doc.createElement('div');doc.body.append(doc.hud);
  doc.querySelector=s=>s==='#hud .col.r'?doc.hud:null;
  for(const k of ['addEventListener','removeEventListener','emit'])doc[k]=Node.prototype[k];
  doc.activeElement=doc.hud;return doc;
}
const find=(node,p)=>p(node)?node:node.children.map(c=>find(c,p)).find(Boolean);
test('地圖開關、既有忙碌狀態、鍵盤、搜尋、蓋章與離場完整清理',()=>{
  const doc=fakeDocument(),state={busy:false,flags:new Set(['bz26_st_D26'])};const p=Object.freeze({x:0,z:-32});
  const api=mountActivityMap({layout,content,state,getPosition:()=>p,document:doc,fountain:{x:0,z:-32}});
  state.busy=true;assert.equal(api.open(),false);state.busy=false;
  assert.equal(api.open(),true);assert.equal(state.busy,true);assert.equal(doc.activeElement.tagName,'BUTTON');assert.equal(doc.activeElement.textContent,'關閉');
  const search=find(doc.body,n=>n.tagName==='INPUT');search.value='D26';search.emit('input');
  const row=find(doc.body,n=>n.dataset.boothId==='D26');assert.match(row.textContent,/已蓋章/);
  assert.equal(api.select('unknown'),false);assert.equal(api.select('D26'),true);assert.equal(api.target.id,'D26');assert.deepEqual(p,{x:0,z:-32});
  doc.emit('keydown',{code:'Escape'});assert.equal(state.busy,false);
  doc.emit('keydown',{code:'KeyG'});assert.equal(state.busy,true);
  api.dispose();api.dispose();assert.equal(state.busy,false);assert.equal(doc.hud.children.length,0);assert.equal(doc.head.children.length,0);assert.equal(doc.body.children.length,1);assert.equal(doc.events.get('keydown').size,0);assert.equal(api.target,null);assert.equal(api.open(),false);
});
test('沒有 busy 自有欄位時關閉後復原，室內不顯示室外目標',()=>{
  const doc=fakeDocument(),state={room:'siwei-hall'};
  const api=mountActivityMap({layout,content,state,getPosition:()=>({x:300,z:0}),document:doc});
  api.open();api.close();assert.equal(Object.hasOwn(state,'busy'),false);
  api.select('D26');api.update();assert.equal(find(doc.body,n=>n.id==='bz-activity-target').hidden,true);
  api.select(null);assert.equal(api.target,null);api.dispose();
});
test('非活動時按鈕隱藏且G無效，離場關閉地圖並清目標，重入可再開',()=>{
 const doc=fakeDocument(),state={busy:false};const api=mountActivityMap({layout,content,state,getPosition:()=>({x:0,z:-32}),document:doc});const button=find(doc.hud,n=>n.id==='bz-activity-button');
 api.setActive(false);assert.equal(button.hidden,true);assert.equal(api.open(),false);assert.equal(api.select('D26'),false);doc.emit('keydown',{code:'KeyG'});assert.equal(state.busy,false);
 api.setActive(true);assert.equal(button.hidden,false);assert.equal(api.open(),true);api.select('D26');api.setActive(false);assert.equal(state.busy,false);assert.equal(api.target,null);assert.equal(find(doc.body,n=>n.id==='bz-activity-map').hidden,true);assert.equal(find(doc.body,n=>n.id==='bz-activity-target').hidden,true);
 api.setActive(true);assert.equal(api.open(),true);api.close();api.dispose();
});
