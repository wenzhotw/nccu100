import test from 'node:test';
import assert from 'node:assert/strict';
import {mountGameWardrobePanel} from '../src/systems/wardrobe/panel.js';
class Node {
 constructor(tag,doc){this.tag=tag;this.doc=doc;this.children=[];this.events={};this.attrs={};this.value='';this.open=false;}
 append(...nodes){for(const n of nodes){this.children.push(n);n.parent=this;if(this.tag==='select'&&this.children.length===1)this.value=n.value;}}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 fire(k,event={}){for(const fn of this.events[k]||[])fn(event);}
 focus(){this.doc.activeElement=this;}
 showModal(){if(this.showFailure)throw Error('modal unavailable');this.open=true;}
 close(){this.open=false;this.fire('close');}
 remove(){this.parent.children.splice(this.parent.children.indexOf(this),1);}
}
function setup(){const doc={createElement(tag){return new Node(tag,doc);},querySelector(){return null;}};doc.body=new Node('body',doc);
 const state={},calls=[],store={read:()=>({actors:{}})},controller={apply:v=>calls.push(['apply',v]),reset:id=>calls.push(['reset',id]),clear:()=>calls.push(['clear'])};
 const panel=mountGameWardrobePanel({controller,store,state,canOpen:()=>!state.busy&&!state.bzBoothBrowsing,resetInput:()=>calls.push(['resetInput']),document:doc});
 const all=()=>{const a=[];function add(n){a.push(n);n.children.forEach(add);}add(doc.body);return a;};const id=i=>all().find(n=>n.id===i),text=t=>all().find(n=>n.textContent===t);
 return {doc,state,calls,panel,id,text,store};
}
test('native modal owns reading lock, resets controls and stops game key bubbling, then restores focus',()=>{
 const s=setup(),button=s.id('game-wardrobe-open'),dialog=s.id('game-wardrobe-panel');button.fire('click');assert.equal(dialog.open,true);assert.equal(s.state.bzBoothBrowsing,true);
 let stops=0;dialog.fire('keydown',{key:'w',stopPropagation(){stops++;}});dialog.fire('keyup',{stopPropagation(){stops++;}});assert.equal(stops,2);
 dialog.close();assert.equal(s.state.bzBoothBrowsing,false);assert.equal(s.doc.activeElement,button);assert.equal(s.calls.filter(c=>c[0]==='resetInput').length,2);
 s.state.busy=true;button.fire('click');assert.equal(dialog.open,false);
});
test('modal failure releases lock, malformed/mismatched JSON never applies, matching JSON is explicit',()=>{
 const s=setup(),dialog=s.id('game-wardrobe-panel'),button=s.id('game-wardrobe-open');dialog.showFailure=true;button.fire('click');assert.equal(s.state.bzBoothBrowsing,false);dialog.showFailure=false;button.fire('click');
 const input=s.id('game-wardrobe-json'),apply=s.text('套用並保存此角色');input.value='bad';apply.fire('click');input.value='{"actorId":"chiang"}';apply.fire('click');assert.equal(s.calls.some(c=>c[0]==='apply'),false);
 input.value=JSON.stringify({actorId:'player'});apply.fire('click');assert.equal(s.calls.filter(c=>c[0]==='apply').length,1);
 s.panel.dispose();assert.equal(s.state.bzBoothBrowsing,false);assert.equal(s.doc.body.children.length,0);
});
test('corrupt settings stay visible as errors with explicit clear recovery',()=>{
 const s=setup();s.store.read=()=>{throw Error('corrupt');};s.id('game-wardrobe-open').fire('click');assert.equal(s.id('game-wardrobe-panel').open,true);assert.equal(s.id('game-wardrobe-json').value,'');
 s.text('清除所有換裝設定').fire('click');assert.equal(s.calls.some(c=>c[0]==='clear'),true);
});
