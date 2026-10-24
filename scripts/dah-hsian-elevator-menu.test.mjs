import test from 'node:test';
import assert from 'node:assert/strict';
class Dialog extends EventTarget{open=false;showModal(){this.open=true;}close(){this.open=false;}}
const button=()=>Object.assign(new EventTarget(),{disabled:false,focused:false,focus(){this.focused=true;}});
const fixtures=()=>({dialog:new Dialog(),buttons:new Map([['2F',button()],['4F',button()]]),cancelButton:button()});
test('樓層選擇停用當前樓層，鍵盤焦點到目的層，選定只送出一次',async()=>{
 const {bindDahElevatorMenu}=await import('../src/world/buildings/dah-hsian/elevator-menu.js');
 const f=fixtures(),requests=[],closed=[];
 const menu=bindDahElevatorMenu({...f,onSelect:(from,to)=>requests.push([from,to]),onClose:reason=>closed.push(reason)});
 assert.equal(menu.open('2F'),true);assert.equal(f.dialog.open,true);assert.equal(f.buttons.get('2F').disabled,true);assert.equal(f.buttons.get('4F').focused,true);
 f.buttons.get('2F').dispatchEvent(new Event('click'));assert.deepEqual(requests,[]);
 f.buttons.get('4F').dispatchEvent(new Event('click'));f.buttons.get('4F').dispatchEvent(new Event('click'));
 assert.deepEqual(requests,[['2F','4F']]);assert.deepEqual(closed,['travel']);assert.equal(f.dialog.open,false);
});

test('取消與原生Escape不搭乘，關閉後可重開，未知樓層不開啟',async()=>{
 const {bindDahElevatorMenu}=await import('../src/world/buildings/dah-hsian/elevator-menu.js');
 const f=fixtures(),requests=[],closed=[];
 const menu=bindDahElevatorMenu({...f,onSelect:(...args)=>requests.push(args),onClose:reason=>closed.push(reason)});
 assert.equal(menu.open('missing'),false);assert.equal(f.dialog.open,false);
 menu.open('4F');f.cancelButton.dispatchEvent(new Event('click'));assert.equal(f.dialog.open,false);assert.deepEqual(requests,[]);
 menu.open('2F');const event=new Event('cancel',{cancelable:true});f.dialog.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(f.dialog.open,false);assert.deepEqual(closed,['cancel','cancel']);
});

test('選樓層期間阻止按鍵傳到遊戲，保留按鈕與Tab的原生操作',async()=>{
 const {bindDahElevatorMenu}=await import('../src/world/buildings/dah-hsian/elevator-menu.js');
 const f=fixtures(),menu=bindDahElevatorMenu({...f,onSelect(){}});menu.open('2F');
 for(const key of [' ','Enter','w','e','Tab']){const e=new Event('keydown',{cancelable:true});e.key=key;f.dialog.dispatchEvent(e);assert.equal(e.cancelBubble,true,key);assert.equal(e.defaultPrevented,false,key);}
 menu.close();const e=new Event('keydown');f.dialog.dispatchEvent(e);assert.equal(e.cancelBubble,false);
});

test('離開場景會關閉並解除舊選單，舊按鈕與取消事件不再執行',async()=>{
 const {bindDahElevatorMenu}=await import('../src/world/buildings/dah-hsian/elevator-menu.js');
 const f=fixtures(),requests=[],closed=[],menu=bindDahElevatorMenu({...f,onSelect:(...args)=>requests.push(args),onClose:reason=>closed.push(reason)});
 menu.open('2F');menu.dispose();assert.equal(f.dialog.open,false);assert.deepEqual(closed,['scene-exit']);assert.equal(menu.open('4F'),false);
 f.buttons.get('4F').dispatchEvent(new Event('click'));f.cancelButton.dispatchEvent(new Event('click'));assert.deepEqual(requests,[]);assert.deepEqual(closed,['scene-exit']);
});

test('長按Enter或空白鍵的重複事件不能意外啟動已聚焦樓層',async()=>{
 const {bindDahElevatorMenu}=await import('../src/world/buildings/dah-hsian/elevator-menu.js');const f=fixtures();
 const menu=bindDahElevatorMenu({...f,onSelect(){}});menu.open('2F');
 for(const key of ['Enter',' ']){const e=new Event('keydown',{cancelable:true});Object.assign(e,{key,repeat:true});f.dialog.dispatchEvent(e);assert.equal(e.defaultPrevented,true,key);}
});
