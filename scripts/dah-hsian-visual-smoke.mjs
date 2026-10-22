import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.NCCU_BASE_URL||'http://127.0.0.1:5187/';
const browser=await chromium.launch({args:process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[];
 page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if((m.type()==='error'||/INVALID_OPERATION|program not valid/.test(m.text()))&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
 await page.goto(base+'?debug&area=dah-hsian',{timeout:120000});await page.waitForFunction(()=>window.__game,null,{timeout:120000});await page.locator('#go').click();
 await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:120000});
 const chip=page.locator('#dah-time');assert.ok(await chip.isVisible());
 const phase=()=>page.evaluate(()=>__game.rooms[__game.state.room].scene.children.find(x=>x.name==='dah-gradient-sky').material.uniforms.topColor.value.toArray());
 await chip.click();assert.match(await chip.textContent(),/午後/);const day=await phase();
 await chip.click();assert.match(await chip.textContent(),/黃昏/);await chip.click();assert.match(await chip.textContent(),/夜晚/);
 await page.waitForTimeout(1000);const night=await phase();assert.notDeepEqual(day,night);
 assert.ok(await page.evaluate(()=>{const s=__game.rooms[__game.state.room].scene;return s.children.filter(x=>x.isDirectionalLight&&x.castShadow).length===1&&s.children.some(x=>x.isPointLight&&x.intensity>.5&&!x.castShadow);}));
 await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy,null,{timeout:120000});
 assert.match(await chip.textContent(),/夜晚/);assert.deepEqual(await phase(),night,'進館維持相同天空時段');
 await chip.focus();const before=await page.evaluate(()=>({y:__game.pos.y,room:__game.state.room}));await page.keyboard.press('Space');assert.match(await chip.textContent(),/自動/);assert.equal(await page.evaluate(()=>__game.state.vy),0,'Space只操作按鈕');
 const sunDirection=()=>page.evaluate(()=>{const sun=__game.rooms[__game.state.room].scene.children.find(o=>o.isDirectionalLight&&o.castShadow);return sun.position.clone().sub(sun.target.position).normalize().toArray();});
 const movingSun=await sunDirection(),autoStart=await page.evaluate(()=>__game.state.time);await page.waitForFunction(t=>__game.state.time>t+1,autoStart,{timeout:60000});const movedSun=await sunDirection();assert.ok(Math.hypot(...movedSun.map((v,i)=>v-movingSun[i]))>.001,'自動模式太陽方向隨真實步進持續變化（深夜天空色可持平）');
 const modeChangedAt=await page.evaluate(()=>__game.state.time);await page.keyboard.press('Enter');assert.match(await chip.textContent(),/午後/);assert.equal(await page.evaluate(()=>__game.state.room),before.room);await page.waitForFunction(t=>__game.state.time>t+.1,modeChangedAt,{timeout:60000});const fixedSky=await phase(),fixedStart=await page.evaluate(()=>__game.state.time);await page.waitForFunction(t=>__game.state.time>t+1,fixedStart,{timeout:60000});assert.deepEqual(await phase(),fixedSky,'固定午後不隨遊戲時間改變');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>__game.enterRoom('dah-hsian'));await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:120000});
 const ducks=()=>page.evaluate(()=>__game.rooms['dah-hsian'].scene.getObjectByName('景觀池鴨群').children.map(d=>d.position.toArray()));const a=await ducks();const waterTime=()=>page.evaluate(()=>__game.rooms['dah-hsian'].scene.getObjectByName('池面慢速光紋').material.uniforms.time.value);const frozen=await waterTime();await page.waitForTimeout(1000);assert.deepEqual(await ducks(),a);assert.equal(await waterTime(),frozen,'減少動態保留固定水面');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(600);assert.notDeepEqual(await ducks(),a,'取消減少動態恢復鴨群');assert.ok(await waterTime()>frozen,'水光紋恢復');
 await page.setViewportSize({width:375,height:812});assert.ok(await chip.isVisible());await chip.click();assert.match(await chip.textContent(),/黃昏/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.evaluate(()=>__game.enterRoom('gym'));await page.waitForFunction(()=>__game.state.room==='gym'&&!__game.state.busy,null,{timeout:120000});assert.equal(await chip.isVisible(),false);
 await page.close();
 const mobile=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:1});mobile.setDefaultTimeout(120000);
 mobile.on('pageerror',e=>errors.push(String(e)));mobile.on('console',m=>{if((m.type()==='error'||/INVALID_OPERATION/.test(m.text()))&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
 await mobile.goto(base+'?debug&area=dah-hsian',{waitUntil:'domcontentloaded',timeout:120000});await mobile.tap('#go');await mobile.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:120000});await mobile.tap('#dah-time');assert.match(await mobile.locator('#dah-time').textContent(),/午後/);
 await mobile.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await mobile.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy,null,{timeout:120000});
 const stick=await mobile.locator('#stick').boundingBox();assert.ok(stick);
 const touchWalk=async(target,condition)=>{
  await mobile.locator('#stick').dispatchEvent('pointerdown',{pointerId:71,pointerType:'touch',clientX:stick.x+stick.width/2,clientY:stick.y+10});
  try{await mobile.waitForFunction(condition,target,{timeout:60000});}finally{await mobile.locator('#stick').dispatchEvent('pointerup',{pointerId:71,pointerType:'touch'});}
  // 渲染器可能很慢；牆鐘400ms不保證重力已走過足夠步進。
  const settleStart=await mobile.evaluate(()=>__game.state.time);await mobile.waitForFunction(t=>__game.state.time>=t+.5,settleStart,{timeout:60000});
 };
 await mobile.evaluate(()=>{__game.pos.set(-19,0,17.1);__game.state.vy=0;__game.state.yaw=Math.PI;});
 await touchWalk(null,()=>__game.pos.y>4.4&&__game.pos.z>22.9);assert.ok(await mobile.evaluate(()=>Math.abs(__game.pos.y-4.5)<.05));
 await mobile.evaluate(()=>{__game.state.yaw=0;});await touchWalk(null,()=>__game.pos.z<17.2&&__game.pos.y<.05);
 await mobile.evaluate(()=>{__game.pos.set(10,23.1,15.6);__game.state.vy=0;__game.state.yaw=Math.atan2(1.5,6.2);});
 await touchWalk(null,()=>__game.pos.z<9.55);assert.ok(await mobile.evaluate(()=>Math.abs(__game.pos.y-20)<.15),'手機下樓落穩6F '+JSON.stringify(await mobile.evaluate(()=>({p:__game.pos.toArray(),vy:__game.state.vy,time:__game.state.time}))));
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.close();
 assert.deepEqual(errors,[]);console.log('PASS 達賢視覺：三時段/真燈/單投影光/跨房間/按鈕鍵盤不跳躍/減少動態/觸控2F上下3F與7F下6F/離區隱藏/無shader錯誤');
}finally{await browser.close();}
