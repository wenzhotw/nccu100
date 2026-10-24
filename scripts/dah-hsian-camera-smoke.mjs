/** 達賢局部近身取景及碰撞恢復，使用正式打包與原遊戲鏡頭。 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ATRIUM_LEVELS,atriumFurniture} from '../src/world/buildings/dah-hsian/atrium-layout.js';
const base=process.env.NCCU_BASE_URL||'http://127.0.0.1:5187/';
const browser=await chromium.launch({args:process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:1}),errors=[];page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
 await page.goto(base+'?area=dah-hsian&debug',{waitUntil:'domcontentloaded',timeout:120000});await page.locator('#go').tap();await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy);
 await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy);
 // rooms.carry只帶一個主角Group；先校準，不能把空集合當成「角色已隱藏」。
 const actorCount=await page.evaluate(()=>__game.rooms[__game.state.room].scene.children.filter(o=>o.isGroup&&o.userData.noOcc).length);assert.equal(actorCount,1);
 await page.waitForFunction(()=>Math.abs(__game.camera.zoom-.74)<.001);
 assert.ok(await page.evaluate(()=>__game.camera.getEffectiveFOV()>65),'直式視野確實放寬');
 for(const [id,x,z]of [['3F',-1.048,2.516],['4F',2.131,-2.108],['5F',6.14,-6.414],['7F',9.67,-9.916]]){
  const l=ATRIUM_LEVELS.find(l=>l.label===id);
  await page.evaluate(({x,y,z})=>{__game.pos.set(x,y,z);__game.state.vy=0;__game.state.yaw=-Math.PI/2;__game.state.pitch=.12;},{x,y:l.y,z});
  await page.waitForFunction(()=>__game.state.camD<1.8&&!__game.rooms[__game.state.room].scene.children.find(o=>o.isGroup&&o.userData.noOcc).visible);
  const p=await page.evaluate(()=>({x:__game.pos.x,y:__game.pos.y,z:__game.pos.z}));assert.ok(Math.abs(p.y-l.y)<.03);
  for(const b of atriumFurniture(l))assert.ok(Math.hypot(p.x-Math.max(b.x0,Math.min(p.x,b.x1)),p.z-Math.max(b.z0,Math.min(p.z,b.z1)))>=.4-1e-5,'實際更新後仍在家具內 '+id);
  await page.evaluate(y=>{__game.pos.set(3.5,y,18);__game.state.vy=0;__game.state.yaw=Math.PI;__game.state.pitch=.12;},l.y);
  await page.waitForFunction(()=>__game.state.camD>2.25&&__game.rooms[__game.state.room].scene.children.find(o=>o.isGroup&&o.userData.noOcc).visible);
  console.log('PASS '+id+' 家具內恢復／貼牆暫隱／退到通道恢復');
 }
 await page.evaluate(()=>{__game.pos.set(6.14,16.9,-6.414);__game.state.vy=0;__game.state.yaw=-Math.PI/2;});
 await page.waitForFunction(()=>!__game.rooms[__game.state.room].scene.children.find(o=>o.isGroup&&o.userData.noOcc).visible);
 await page.evaluate(()=>__game.enterRoom('gym'));await page.waitForFunction(()=>__game.state.room==='gym'&&!__game.state.busy);
 assert.equal(await page.evaluate(()=>__game.rooms.gym.scene.children.find(o=>o.isGroup&&o.userData.noOcc).visible),true,'離開達賢後原角色恢復');
 assert.equal(await page.evaluate(()=>__game.camera.zoom),1,'離館恢復其他房間原視野');
 assert.deepEqual(errors,[]);console.log('PASS 原生手機尺寸房間生命週期，無page/console錯誤；非真iPhone效能量測');
}finally{await browser.close();}
