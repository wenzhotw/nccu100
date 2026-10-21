/** 8c：安九只建立樓梯下端，並驗證正式 gameplay 的跨房間契約。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';

test('8c 安九入口與返回點在大廳，出生與返回點不在碰撞裡',async()=>{
  const {ANJIU,anjiuColliders,createAnjiu}=await import('../anjiu-interior.js');
  const {greyboxColliders}=await import('../greybox.js');
  const {resolve,setActiveColliders,setRoomClamp}=await import('../../../../core/collision.js');
  assert.equal(ANJIU.id,'anjiu');assert.equal(ANJIU.entrance.room,'uphill-campus');
  assert.equal(ANJIU.entrance.label,'走下旋轉樓梯');assert.equal(ANJIU.exit.label,'走上旋轉樓梯');
  assert.equal(ANJIU.returnTo.room,'uphill-campus');
  assert.deepEqual([ANJIU.entrance.x,ANJIU.entrance.z],[34.6,-28.6]);
  const model=createAnjiu();for(const name of ['旋轉樓梯下端','木雕擺飾','藍色椅子'])assert.ok(model.getObjectByName(name),name);
  assert.ok(new THREE.Box3().setFromObject(model.getObjectByName('旋轉樓梯下端')).min.z>=-1,'樓梯不得藏在北側端牆外');
  for(const [s,boxes] of [[ANJIU.spawn,anjiuColliders()],[ANJIU.returnTo,greyboxColliders()]]) {
    const p={...s,y:15};setActiveColliders(boxes);setRoomClamp(()=>{});
    try{resolve(p);assert.ok(Math.hypot(p.x-s.x,p.z-s.z)<1e-6);}finally{setActiveColliders([]);setRoomClamp(null);}
  }
});

test('8c gameplay 跨房間入口與返回，舊入口未填 room 仍屬山下',()=>{
  execFileSync(process.execPath,['--input-type=module','-e',`
    import assert from 'node:assert/strict';import * as THREE from 'three';import {registerHooks} from 'node:module';
    globalThis.__roomTestScene=new THREE.Scene();globalThis.__roomTestPlayer=new THREE.Object3D();
    const stubs={
      'core/engine.js':'export const scene=globalThis.__roomTestScene;',
      'actors/player.js':'export const player=globalThis.__roomTestPlayer;export const shadowBlob=player.clone();',
      'systems/audio.js':'export const AU={sfx(){}};',
      'core/dom.js':'export const $=()=>({hidden:true,querySelector:()=>({})});',
      'actors/pangolin.js':'export const bubble={};',
      'systems/stories.js':'export const crystals=[];',
      'ui/dialog.js':'export const dlg={hidden:true};export const openDialog=()=>{};export const toast=()=>{};',
      'content/index.js':'export const DIALOGS={};export const fill=()=>{};export const pickDialog=()=>{};'
    };
    registerHooks({resolve(s,c,next){const full=s.startsWith('.')?new URL(s,c.parentURL).href:s;for(const [suffix,src] of Object.entries(stubs))if(full.endsWith(suffix))return {url:'data:text/javascript,'+encodeURIComponent(src),shortCircuit:true};return next(s,c);}});
    const {registerRoom,current}=await import('./src/core/rooms.js');
    const {ANJIU}=await import('./src/world/buildings/uphill-campus/anjiu-interior.js');
    registerRoom({id:'uphill-campus',name:'山上',spawn:{x:0,z:0},heightAt:()=>15,entrance:{x:32.2,z:-88.5},exit:{x:0,z:0},returnTo:{x:31,z:-88.5}});
    registerRoom({...ANJIU});
    const {state}=await import('./src/core/state.js');const {late}=await import('./src/core/late.js');
    late.iris=(closed,ms,done)=>done();globalThis.setTimeout=fn=>{fn();return 0;};
    const game=await import('./src/core/gameplay.js');
    assert.equal(game.spotById('uphill-campus-enter').room,null);
    assert.equal(game.spotById('anjiu-enter').room,'uphill-campus');
    game.enterRoom('uphill-campus');assert.equal(state.room,'uphill-campus');assert.equal(game.pos.y,15);
    game.spotById('anjiu-enter').fn();assert.equal(state.room,'anjiu');assert.equal(game.pos.y,0);
    game.exitRoom();assert.equal(state.room,'uphill-campus');assert.deepEqual([game.pos.x,game.pos.y,game.pos.z],[35.6,15,-28.6]);
    assert.equal(globalThis.__roomTestPlayer.parent, (await import('./src/core/rooms.js')).rooms['uphill-campus'].scene);
    game.exitRoom();assert.equal(state.room,null);assert.deepEqual([game.pos.x,game.pos.z],[31,-88.5]);
  `],{cwd:process.cwd(),stdio:'pipe',timeout:20000});
});
