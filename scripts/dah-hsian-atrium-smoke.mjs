import {chromium} from 'playwright';
async function verifyUpper(page,base){
 await page.goto(base+'?debug&area=dah-hsian',{timeout:120000});await page.locator('#go').click({timeout:120000});await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:120000});
 await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy,null,{timeout:120000});
 await page.locator('#dah-time').click();await page.evaluate(()=>{__game.pos.set(-19,0,17.1);__game.state.vy=0;__game.state.pitch=.2;});
 const walk=async(x,z)=>{try{
  await page.keyboard.down('w');
  try{await page.waitForFunction(({x,z})=>{const dx=x-__game.pos.x,dz=z-__game.pos.z;__game.state.yaw=Math.atan2(-dx,-dz);return Math.hypot(dx,dz)<.22;},{x,z},{timeout:120000});}
  finally{await page.keyboard.up('w');}
  const start=await page.evaluate(()=>__game.state.time);
  await page.waitForFunction(t=>__game.state.time>=t+.5,start,{timeout:120000});
 }catch(e){throw Error('goal '+x+','+z+' actual '+JSON.stringify(await page.evaluate(()=>__game.pos.toArray()))+' '+e.message);}};
 await walk(-19,23.5);await walk(-16,23.5);await walk(-16,22.6);console.log('3F first stair',await page.evaluate(()=>__game.pos.toArray()));
 const levels=['3F','3MF','4F','4MF','5F','6F','7F','8F'];
 for(let i=0;i<7;i++){
  const east=.15+i*1.5;
  if(i===0)await walk(east+3.1,22.6);await walk(east+3.1,8.8);await walk(east+.85,8.8);await walk(east+.85,9.4);await walk(east+2.35,15.6);await walk(east+2.35,16.15);await walk(east+4.6,16.15);
  const result=await page.evaluate(()=>({p:__game.pos.toArray(),zone:document.querySelector('#loc')?.textContent}));console.log(levels[i+1],result);
  const expected=4.5+(i+1)*3.1;if(Math.abs(result.p[1]-expected)>.2)throw Error('wrong floor '+JSON.stringify(result));
 }
 await walk(.15+7*1.5+3.1,22.6);await walk(-18,22.6);await walk(-18,17.4);
 await walk(-18,22.6);
 for(let i=6;i>=0;i--){
  const east=.15+i*1.5,upper=east+1.5;
  if(i===6)await walk(upper+3.1,22.6);await walk(upper+3.1,16.3);await walk(upper+.85,16.3);await walk(upper+.85,15.6);await walk(east+.85,9.4);await walk(east+.85,8.8);await walk(east+3.1,8.8);if(i===0)await walk(east+3.1,22.6);
  if(i===6){await walk(east+3.1,-10.3);await walk(east+3.35,-10.3);await walk(east+3.35,-15.7);await walk(east+1,-15.2);await walk(east+3.35,-15.2);await walk(east+3.35,-10.3);await walk(east+3.1,8.8);console.log('PASS 7F轉角由閱讀平台穿過書牆開口進出後方公共走廊');}
  const y=await page.evaluate(()=>__game.pos.y);if(Math.abs(y-(4.5+i*3.1))>.2)throw Error('downstairs height '+y);
 }
 // 由洞口上端繞入，不能沿舊直線穿過新側護欄。
 await walk(-16,22.6);await walk(-16,23.5);await walk(-19,23.5);await walk(-19,17.1);
 const y=await page.evaluate(()=>__game.pos.y);if(Math.abs(y)>.02)throw Error('not returned to2F '+y);
 console.log('PASS 真鍵盤由2F連續走到8F中庭迴廊，逐層原路下降回2F');
 return await page.evaluate(()=>({position:__game.pos.toArray(),room:__game.state.room}));
}

const browser=await chromium.launch({args:process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if((m.type()==='error'||/INVALID_OPERATION/.test(m.text()))&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});await verifyUpper(page,process.env.NCCU_BASE_URL||'http://127.0.0.1:5187/');if(errors.length)throw Error(errors.join('\n'));}finally{await browser.close();}
