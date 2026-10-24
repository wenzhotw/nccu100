import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dev/wardrobe-preview.js',import.meta.url),'utf8');
const select=source.slice(source.indexOf('  const selectActor='),source.indexOf('  const guard='));
test('工作台 wardrobe 建立失敗，釋放先建立的 arms 並清除場景角色',()=>{
 let disposed=0;const visible=new Set(),root={position:{set(){}},rotation:{set(){}}};
 const input={id:'player',root},ctx={save(){},inputs:new Map([['player',input]]),$(){return {value:'player'};},scene:{add(n){visible.add(n);},remove(n){visible.delete(n);}},activateArticulatedArms(){return {dispose(){disposed++;}};},createWardrobeActor(){throw new Error('injected wardrobe failure');}};
 vm.createContext(ctx);
 assert.throws(()=>vm.runInContext(`let current,arms,wardrobe;${select};selectActor();`,ctx),/injected wardrobe failure/);
 assert.equal(disposed,1);assert.equal(visible.size,0);
 assert.equal(vm.runInContext('arms',ctx),null);assert.equal(vm.runInContext('wardrobe',ctx),null);
});
