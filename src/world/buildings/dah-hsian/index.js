/** 達賢戶外獨立區域。暫無正式交通入口，指定 area=dah-hsian 可直接預覽。 */
import { defineBuilding } from '../../registry.js';
import { BOUNDS, SPAWN, walkHeight, keepOnLand, zoneName, isSwimming } from './layout.js';
import { state } from '../../../core/state.js';
import { late } from '../../../core/late.js';
import { buildMap, mapLight, updateMap } from './map.js';
import './preview.css';
import {atriumHeight,clampAtrium,ATRIUM_LEVELS,canUseDahExit} from './atrium-layout.js';
import {dahClock} from './visual-clock.js';
import {bindDahTimeControl} from './time-control.js';
let timeButton,visualStarted=false;
function enterVisual(){
 if(!visualStarted){dahClock.setMode('afternoon',state.time);dahClock.setMode('auto',state.time);visualStarted=true;}
 document.body.classList.add('dah-hsian-mode');
 if(!timeButton){timeButton=document.createElement('button');timeButton.id='dah-time';timeButton.className='chip dah-time';timeButton.type='button';document.getElementById('snd').after(timeButton);bindDahTimeControl(timeButton,dahClock,()=>state.time);}
 timeButton.hidden=false;
}
function exitVisual(){document.body.classList.remove('dah-hsian-mode');if(timeButton)timeButton.hidden=true;}

import {buildInterior,interiorLight,updateInterior} from './interior-map.js';
import {ROOM_ID,INTERIOR_BOUNDS,OUTDOOR_DOOR,INTERIOR_SPAWN,INTERIOR_EXIT,OUTDOOR_RETURN,interiorZone} from './interior-layout.js';

export default defineBuilding({
  id: 'dah-hsian',
  name: '達賢圖書館',
  build() {},
  interior: [{
    build:buildMap,light:mapLight,heightAt:(x,z)=>walkHeight(x,z,late.pos?.y??0),zone:zoneName,clamp:keepOnLand,
    bounds:BOUNDS,spawn:{...SPAWN,pitch:0.06},miniSub:'草坡・湖濱步道',
    onEnter(){state.swimming=false;enterVisual();updateMap(state.time,late.pos);},
    update(){state.swimming=isSwimming(late.pos);updateMap(state.time,late.pos);},
    onExit(){state.swimming=false;exitVisual();},
    camera:{x0:BOUNDS.x0-25,x1:BOUNDS.x1+25,z0:BOUNDS.z0-25,z1:BOUNDS.z1+25,ceil:80,maxDist:14},
    // 僅讓既有除錯工具與自動測試能安全回到原校園；不增加正式入口或出口。
    returnTo:{x:-2,z:21,yaw:0,pitch:0.3,face:Math.PI},
  },{
    id:ROOM_ID,name:'達賢圖書館',build:buildInterior,light:interiorLight,
    heightAt:(x,z)=>atriumHeight(x,z,late.pos?.y??0),clamp:clampAtrium,
    entrance:OUTDOOR_DOOR,spawn:INTERIOR_SPAWN,exit:INTERIOR_EXIT,
    returnRoom:'dah-hsian',returnTo:OUTDOOR_RETURN,bounds:INTERIOR_BOUNDS,zone:p=>p.y>3.9?'達賢'+ATRIUM_LEVELS.reduce((a,b)=>Math.abs(a.y-p.y)<Math.abs(b.y-p.y)?a:b).label+'・層退書牆':interiorZone(p),
    miniSub:'大廳・挑空展示・閱覽',
    onEnter(){enterVisual();updateInterior(state.time,late.pos);import('../../../core/gameplay.js').then(({spots})=>{const exit=spots.find(s=>s.id===ROOM_ID+'-exit');if(exit)exit.ok=()=>canUseDahExit(late.pos?.y);});},onExit:exitVisual,
    update(){updateInterior(state.time,late.pos);},
    camera:{...INTERIOR_BOUNDS,ceil:34,maxDist:6,lookUpHeight:6.5,eyeFloor:1.4,upper:{fromY:3.9,maxDist:3.2,eyeOffset:1.65,aimOffset:.5,lookUpHeight:1.8}},
  }],
});

if(new URLSearchParams(location.search).get('area')==='dah-hsian'){
  document.querySelector('#intro .ribbon').textContent='達賢圖書館・戶外與層退中庭';
  document.getElementById('go').addEventListener('click',async()=>{
    // 等既有遊戲模組初始化後再呼叫，避免建築載入階段的循環相依。
    const {enterRoom}=await import('../../../core/gameplay.js');enterRoom('dah-hsian');
  },{once:true});
}
