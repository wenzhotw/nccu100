import test from 'node:test';
import assert from 'node:assert/strict';

test('時段按鈕每次切換一個模式，使用當前遊戲時間並更新可讀標籤',async()=>{
 const {bindDahTimeControl}=await import('../src/world/buildings/dah-hsian/time-control.js');
 const button=new EventTarget(),calls=[];let time=20;
 const clock={mode:'auto',setMode(mode,t){this.mode=mode;calls.push([mode,t]);}};
 const ui=bindDahTimeControl(button,clock,()=>time);
 assert.match(button.textContent,/自動/);
 for(const [i,mode]of ['afternoon','dusk','night','auto'].entries()){
  time=21+i;button.dispatchEvent(new Event('click'));assert.deepEqual(calls.at(-1),[mode,time]);
 }
 assert.match(button.textContent,/自動/);ui.dispose();button.dispatchEvent(new Event('click'));assert.equal(calls.length,4);
});

test('按鈕的Enter與Space不會傳給遊戲跳躍／互動，其他鍵照常',async()=>{
 const {bindDahTimeControl}=await import('../src/world/buildings/dah-hsian/time-control.js');
 const b=new EventTarget();bindDahTimeControl(b,{mode:'auto',setMode(){}},()=>0);
 for(const key of ['Enter',' ']){const event=new Event('keydown',{cancelable:true});event.key=key;b.dispatchEvent(event);assert.equal(event.cancelBubble,true);assert.equal(event.defaultPrevented,false,'保留原生按鈕啟動');}
 const event=new Event('keydown');event.key='q';b.dispatchEvent(event);assert.equal(event.cancelBubble,false);
});
