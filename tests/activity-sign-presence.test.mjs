import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {activitySignPresence}from '../src/systems/baozhong/activity-sign-presence.js';
test('看板初始關閉，進退場成對切換圖形／碰撞／互動點並清除near',()=>{
 const group={visible:true},marker={visible:true},spot={id:'sign'},box={},foreign={},colliders=[foreign],spots=[foreign],state={near:spot};
 const p=activitySignPresence({group,marker,spot,box,colliders,spots,state});assert.equal(group.visible,false);assert.equal(marker.visible,false);assert.equal(state.near,null);assert.deepEqual(colliders,[foreign]);assert.deepEqual(spots,[foreign]);
 for(let i=0;i<3;i++){p.setActive(true);p.setActive(true);assert.equal(group.visible,true);assert.deepEqual(colliders,[foreign,box]);assert.deepEqual(spots,[foreign,spot]);state.near=spot;marker.visible=true;p.setActive(false);p.setActive(false);assert.equal(group.visible,false);assert.equal(marker.visible,false);assert.equal(state.near,null);assert.deepEqual(colliders,[foreign]);assert.deepEqual(spots,[foreign]);}
});
test('正式入口將看板與地圖連接同一會場開關且初始同步',()=>{const s=fs.readFileSync(new URL('../src/systems/baozhong/index.js',import.meta.url),'utf8');assert.match(s,/tents.setActive\(on\);\s*activitySign\?\.setActive\(on\); activityMap\?\.setActive\(on\)/);assert.match(s,/activitySign\?\.setActive\(venue.on\); activityMap\?\.setActive\(venue.on\)/);assert.doesNotMatch(s,/先看地圖/);});
