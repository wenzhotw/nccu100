import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {frameRoomCamera,roomCameraAtHeight,roomOrbitDirection} from '../src/systems/room-view.js';

test('達賢自己的鏡頭設定在牆前退讓後保持平視，不改其他房間的共用程式',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js').catch(()=>({}));
 assert.equal(typeof createDahInteriorCamera,'function','達賢鏡頭補正須由本區設定承擔');
 const state={pitch:.12},target=new THREE.Vector3(0,.9,0),camera=new THREE.PerspectiveCamera(),config=createDahInteriorCamera({state,camera,getFeetY:()=>0,getTargetY:()=>target.y});
 assert.equal(roomCameraAtHeight(config,0),config);
 for(const distance of [.9,1.5,3,6]){
  const direction=roomOrbitDirection(new THREE.Vector3(),.3,state.pitch,target,6,config);camera.position.copy(target).addScaledVector(direction,distance);
  frameRoomCamera(camera,target,state.pitch,config);const gaze=camera.getWorldDirection(new THREE.Vector3());
  assert.ok(Math.abs(gaze.y)<.001,'正常視角不能因貼牆而仰看天花 '+distance+' '+gaze.y);
 }
 const oldRoom={maxDist:8},oldCamera=new THREE.PerspectiveCamera();oldCamera.position.set(0,2,6);frameRoomCamera(oldCamera,target,.12,oldRoom);assert.ok(oldCamera.getWorldDirection(new THREE.Vector3()).y<0,'未設定達賢補正的房間保留原朝向');
});

test('達賢貼牆近身鏡頭暫隱角色、保留回復緩衝並在離館恢復，不覆蓋外部隱藏',async()=>{
 const {createDahAvatarVisibility}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 assert.equal(typeof createDahAvatarVisibility,'function');
 const avatar=new THREE.Group(),camera=new THREE.PerspectiveCamera(),feet=new THREE.Vector3(0,4.5,0),state={room:'dah-hsian-2f'},getPosition=()=>feet;
 const view=createDahAvatarVisibility({avatar,camera,state,getPosition});camera.position.set(0,5.9,.9);view.update();assert.equal(avatar.visible,false,'鏡頭過近時角色不遮滿畫面');
 camera.position.z=1.9;view.update();assert.equal(avatar.visible,false,'邊界輕微移動不可來回閃爍');
 camera.position.z=2.3;view.update();assert.equal(avatar.visible,true,'退到足夠距離恢復');
 avatar.visible=false;camera.position.z=.9;view.update();view.dispose();assert.equal(avatar.visible,false,'不能擅自顯示其他系統已隱藏的角色');
 avatar.visible=true;const second=createDahAvatarVisibility({avatar,camera,state,getPosition});second.update();assert.equal(avatar.visible,false);state.room='gym';second.update();assert.equal(avatar.visible,true,'離館恢復本區隱藏');
 state.room='dah-hsian-2f';second.update();second.dispose();assert.equal(avatar.visible,true,'銷毀必須清除本區顯示狀態');
});

test('近身角色顯示判斷接在本區鏡頭碰撞退讓後，使用真實房間取景入口',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 let seen=null;const camera=new THREE.PerspectiveCamera(),target=new THREE.Vector3(0,.9,0),state={pitch:.12};
 const config=createDahInteriorCamera({state,camera,getFeetY:()=>0,getTargetY:()=>target.y,onFrame:()=>{seen=camera.position.z;}});
 camera.position.set(0,1.4,.9);frameRoomCamera(camera,target,state.pitch,config);assert.equal(seen,.9,'回呼必須看見退讓後的位置');
});

test('達賢鏡頭適度放寬視野、直式再放寬，穩定畫面不重建投影，離館還原原鏡頭',async()=>{
 const {createDahInteriorLens}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 assert.equal(typeof createDahInteriorLens,'function');
 const camera=new THREE.PerspectiveCamera(55,1280/800,.25,1200),state={room:'dah-hsian-2f'};let updates=0;
 const originalUpdate=camera.updateProjectionMatrix.bind(camera);camera.updateProjectionMatrix=()=>{updates++;originalUpdate();};
 const normal=camera.getEffectiveFOV(),lens=createDahInteriorLens({camera,state});lens.update();const wide=camera.getEffectiveFOV();
 assert.ok(wide>normal+10&&wide<75,'可多看空間，避免超廣角誇張變形');assert.equal(camera.fov,55,'保留跑步時共用FOV控制');
 const afterFirst=updates;lens.update();assert.equal(updates,afterFirst,'同設定不可每幀重建投影');
 camera.aspect=375/812;lens.update();assert.ok(camera.getEffectiveFOV()>wide&&camera.getEffectiveFOV()<75,'直式略放寬但有界');
 state.room='gym';lens.update();assert.equal(camera.zoom,1,'其他房間回原設定');
 state.room='dah-hsian-2f';lens.update();lens.dispose();assert.equal(camera.zoom,1,'離館生命週期還原');
 lens.update();assert.equal(camera.zoom,1,'銷毀後不可再修改鏡頭');
});

test('上層通道在沒有牆面阻擋時可退到四公尺以上，貼牆仍交由既有射線退讓',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 const config=createDahInteriorCamera({state:{pitch:.12},camera:new THREE.PerspectiveCamera(),getFeetY:()=>10.7,getTargetY:()=>11.6});
 assert.ok(config.maxDist>=4&&config.maxDist<=5,'上層不應固定鎖在3.2近身距離');
});
