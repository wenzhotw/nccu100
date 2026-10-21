/** 達賢戶外獨立區域。暫無正式交通入口，指定 area=dah-hsian 可直接預覽。 */
import { defineBuilding } from '../../registry.js';
import { BOUNDS, SPAWN, walkHeight, keepOnLand, zoneName } from './layout.js';
import { late } from '../../../core/late.js';
import { buildMap, mapLight } from './map.js';
import './preview.css';

export default defineBuilding({
  id: 'dah-hsian',
  name: '達賢圖書館',
  build() {},
  interior: {
    build:buildMap,light:mapLight,heightAt:(x,z)=>walkHeight(x,z,late.pos?.y??0),zone:zoneName,clamp:keepOnLand,
    bounds:BOUNDS,spawn:{...SPAWN,pitch:0.06},miniSub:'草坡・湖濱步道',
    onEnter(){document.body.classList.add('dah-hsian-mode');},
    onExit(){document.body.classList.remove('dah-hsian-mode');},
    camera:{x0:BOUNDS.x0-25,x1:BOUNDS.x1+25,z0:BOUNDS.z0-25,z1:BOUNDS.z1+25,ceil:80,maxDist:14},
    // 僅讓既有除錯工具與自動測試能安全回到原校園；不增加正式入口或出口。
    returnTo:{x:-2,z:21,yaw:0,pitch:0.3,face:Math.PI},
  },
});

if(new URLSearchParams(location.search).get('area')==='dah-hsian'){
  document.querySelector('#intro .ribbon').textContent='達賢圖書館・戶外預覽';
  document.getElementById('go').addEventListener('click',async()=>{
    // 等既有遊戲模組初始化後再呼叫，避免建築載入階段的循環相依。
    const {enterRoom}=await import('../../../core/gameplay.js');enterRoom('dah-hsian');
  },{once:true});
}
