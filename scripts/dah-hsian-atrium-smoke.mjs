import {chromium} from 'playwright';
import {ALL_PUBLIC_STAIRS,ATRIUM_FLOOR_LEVELS} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {observeNativeWalk} from './lib/dah-smoke-walk.mjs';
async function verifyUpper(page,base){
 await page.goto(base+'?debug&area=dah-hsian',{timeout:120000});await page.locator('#go').click({timeout:120000});await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:120000});
 await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy,null,{timeout:120000});
 await page.locator('#dah-time').click();await page.evaluate(()=>{__game.pos.set(-14,0,13.1);__game.state.vy=0;__game.state.pitch=.12;});
 // Preserve PR99's simulation-time progress guard when adapting the route to
 // the reconstructed floors. A slow software renderer must not look like a wall.
 const WALL_CLOCK_LIMIT=1800000;
 const walk=async(x,z)=>{try{
  await page.keyboard.down('w');
  let result;
  try{result=await(await page.waitForFunction(observeNativeWalk,{x,z},{timeout:WALL_CLOCK_LIMIT})).jsonValue();}
  finally{await page.keyboard.up('w');await page.evaluate(()=>{delete window.__dahSmokeWalk;});}
  if(result!=='arrived')throw Error('連續3遊戲秒沒有靠近目標');
  const start=await page.evaluate(()=>__game.state.time);await page.waitForFunction(t=>__game.state.time>=t+.5,start,{timeout:WALL_CLOCK_LIMIT});
 }catch(e){throw Error('goal '+x+','+z+' actual '+JSON.stringify(await page.evaluate(()=>__game.pos.toArray()))+' '+e.message);}};
 const levelAt=y=>ATRIUM_FLOOR_LEVELS.find(l=>l.y===y);
 const assertY=async y=>{const p=await page.evaluate(()=>__game.pos.toArray());if(Math.abs(p[1]-y)>.15)throw Error('wrong floor '+JSON.stringify({expected:y,p}));console.log('floor verified',y,p);};
 await walk(-14,18.5);await walk(-8.5,18.5);await assertY(4.5);
 const first=ATRIUM_FLOOR_LEVELS[0];await walk(-8.5,14.2);await walk(first.east+2.45,14.2);
 const stairs=ALL_PUBLIC_STAIRS.filter(s=>!s.entry);
 for(const s of stairs){
  const lower=levelAt(s.a.y),upper=levelAt(s.b.y),len=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z),ux=(s.b.x-s.a.x)/len,uz=(s.b.z-s.a.z)/len;
  await walk(lower.east+2.45,4);await walk(s.a.x-ux*.8,s.a.z-uz*.8);await walk(s.a.x,s.a.z);await walk(s.b.x,s.b.z);await walk(s.b.x+ux*.65,s.b.z+uz*.65);await assertY(upper.y);await walk(upper.east+2.45,11.9);
 }
 const top=ATRIUM_FLOOR_LEVELS.find(l=>l.label==='7F'),north=top.north-2.45;
 await walk(top.east+2.45,north);await walk(-13.8,north);await walk(-13.8,-15.7);await walk(-13.8,north);await walk(-14.1,north);await walk(-14.1,6.4);await walk(-18.25,6.4);await walk(-18.25,2.3);
 const lift=async(id,key)=>{await page.waitForFunction(()=>__game.state.near?.id?.startsWith('dah-elevator-'));await page.keyboard.press('e');await page.waitForSelector('.dah-elevator-menu[open]');const button=page.locator('[data-floor="'+id+'"]');await button.focus();await page.keyboard.press('Tab');if(!await page.locator('.dah-elevator-menu button:focus').count())throw Error('Tab left native floor picker');await button.focus();await page.keyboard.press(key);const y=id==='8F'?26.2:23.1;await page.waitForFunction(y=>!__game.state.busy&&Math.abs(__game.pos.y-y)<.03,y);};
 await lift('8F','Enter');
 const route=[[-18.25,6.36],[-16.8,6.36],[-14,9],[-10.5,12.5],[-8.9,15.6],[-6,15.85],[14,15.85],[14,-15.5],[0,-15.5]];
 for(const p of route)await walk(...p);for(const p of [...route].reverse())await walk(...p);await walk(-18.25,2.3);await assertY(26.2);await lift('7F','Space');
 await walk(-18.25,6.4);await walk(-14.1,6.4);await walk(-14.1,north);await walk(top.east+2.45,north);await walk(top.east+2.45,11.9);
 for(const s of [...stairs].reverse()){
  const lower=levelAt(s.a.y),upper=levelAt(s.b.y),len=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z),ux=(s.b.x-s.a.x)/len,uz=(s.b.z-s.a.z)/len;
  await walk(upper.east+2.45,11.9);await walk(s.b.x+ux*.65,s.b.z+uz*.65);await walk(s.b.x,s.b.z);await walk(s.a.x,s.a.z);await walk(s.a.x-ux*.8,s.a.z-uz*.8);await assertY(lower.y);await walk(lower.east+2.45,4);
 }
 await walk(first.east+2.45,14.2);await walk(-8.5,14.2);await walk(-8.5,18.5);await walk(-14,18.5);await walk(-14,13.1);await assertY(0);
 console.log('PASS real keyboard 2F L-stair ->7F terraces/rear ->native Enter lift8F complete public loop ->Space lift7F ->stairs2F');
 return await page.evaluate(()=>({position:__game.pos.toArray(),room:__game.state.room}));
}

const browser=await chromium.launch({args:process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if((m.type()==='error'||/INVALID_OPERATION/.test(m.text()))&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});await verifyUpper(page,process.env.NCCU_BASE_URL||'http://127.0.0.1:5187/');if(errors.length)throw Error(errors.join('\n'));}finally{await browser.close();}
