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
