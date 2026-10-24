/** 獨立造型截圖驗收。真實 Chromium WebGL，只輸出 artifact，不部署。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'test-results','student-style');fs.mkdirSync(out,{recursive:true});
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const evidence={checkout:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),eventSha:process.env.GITHUB_SHA||null,version:JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version,source:'Real Chromium screenshots of the isolated Vite development preview',limits:['Software WebGL is not device FPS evidence.','Narrow desktop viewport is not a real mobile device.','Preview uses synchronized pose formulas, not game movement or postprocessing.'],profiles:[]};
const save=()=>fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(evidence,null,2));
let server,browser;
try{
 server=await createServer({root,server:{host:'127.0.0.1',port:0,strictPort:false},logLevel:'warn'});await server.listen();
 const url=`http://127.0.0.1:${server.httpServer.address().port}/dev/student-style-preview.html`;
 browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 for(const [name,viewport]of [['desktop',{width:1280,height:900}],['narrow',{width:390,height:844}]]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1}),page=await context.newPage();
  const result={name,viewport,errors:[],resourceFailures:[],captures:[],checks:[]};evidence.profiles.push(result);save();
  page.setDefaultTimeout(60000);page.on('pageerror',e=>result.errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
  page.on('requestfailed',r=>result.resourceFailures.push({url:r.url(),error:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=400)result.resourceFailures.push({url:r.url(),status:r.status()});});
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.documentElement.dataset.studentStyleReady==='true',null,{timeout:120000});
   await page.evaluate(()=>document.fonts.ready);
   const storage=()=>page.evaluate(()=>({...localStorage}));const beforeStorage=await storage();
   // 保留來源與完整子節點順序，稍後實測 native/reset，不只檢查選單文字。
   await page.evaluate(()=>{window.__styleOriginal=window.__studentStyleTrial.pair.map(({actor,entry})=>{const nodes=[];actor.g.traverse(n=>nodes.push({node:n,parent:n.parent,children:[...n.children],visible:n.visible,geometry:n.geometry,material:n.material}));return {nodes,sources:Object.values(entry.slots).flatMap(s=>s.sources)};});});
   const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('nav button,nav select')].map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right};})}));
   assert.ok(layout.scroll<=layout.width+1,'no horizontal overflow');for(const r of layout.controls)assert.ok(r.left>=0&&r.right<=layout.width+1,'controls fit viewport');result.checks.push('viewport and controls fit');
   async function capture(camera,pose='idle',face='open',parts='default',stage='comparison'){
    await page.selectOption('#pose',pose);await page.selectOption('#face',face);await page.selectOption('#parts',parts);
    const sample=await page.evaluate(camera=>{const api=window.__studentStyleTrial;api.setCamera(camera);api.freeze(.75);return {state:api.snapshot(),metrics:api.metrics(),webgl:api.renderEvidence()};},camera);
    assert.deepEqual(sample.state,{view:camera,pose,face,parts,time:.75},'exact requested capture state');
    assert.equal(sample.webgl.contextLost,false);assert.ok(sample.webgl.lastViewportCalls>0);assert.ok(sample.webgl.lastViewportTriangles>0);
    assert.ok(sample.webgl.visiblePixels.every(n=>n>64),'both viewports contain rendered non-background pixels');
    const filename=`${name}-${camera}-${pose}-${face}-${parts}-${stage}.png`;
    const png=await page.screenshot({path:path.join(out,filename),fullPage:true});
    result.captures.push({filename,sha256:createHash('sha256').update(png).digest('hex'),...sample});save();
   }
   for(const camera of ['front','side','back','left','game'])for(const pose of ['idle','walk','wave'])await capture(camera,pose);
   for(const face of ['closed','panic'])await capture('front','idle',face);
   await capture('front','wave','open','native');
   assert.equal(await page.evaluate(()=>window.__styleOriginal.every(({sources})=>sources.every(n=>!n.visible&&n.parent.children.some(c=>c!==n&&c.name.startsWith('actor-parts.')&&c.geometry===n.geometry)))),true,'native clones replace source meshes');
   await page.click('#reset');
   assert.equal(await page.evaluate(()=>window.__styleOriginal.every(({nodes})=>nodes.every(x=>x.node.parent===x.parent&&x.node.visible===x.visible&&x.node.geometry===x.geometry&&x.node.material===x.material&&x.node.children.length===x.children.length&&x.children.every((n,i)=>x.node.children[i]===n)))),true,'reset restores actual references and child order');
   await capture('front','idle','open','default','after-reset');assert.deepEqual(await storage(),beforeStorage,'preview does not write localStorage');result.checks.push('native replaces real sources; reset restores original refs/parents/order/visibility; storage unchanged');
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.studentStyleReady==='true');
   assert.equal(await page.locator('#parts').inputValue(),'default');assert.deepEqual(await storage(),beforeStorage);result.checks.push('reload starts default without storage changes');
   assert.deepEqual(result.errors,[],'no browser errors');assert.deepEqual(result.resourceFailures,[],'no failed resources');result.pass=true;
  }catch(error){result.pass=false;result.failure=error.stack;await page.screenshot({path:path.join(out,`${name}-failure.png`),fullPage:true}).catch(()=>{});throw error;}
  finally{save();await context.close();}
 }
 console.log('PASS real student comparison screenshots, WebGL pixels, native/reset and desktop/narrow layout');
}catch(error){evidence.failure=error.stack;throw error;}
finally{save();await browser?.close();await server?.close();}
