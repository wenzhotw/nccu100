// Run only in a browser-capable authorized environment; never generates substitute screenshots.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
const root = process.cwd(), output = path.join(root, 'test-results/booth-browser');
const digest = b => createHash('sha256').update(b).digest('hex');
const stages = []; let stageStart = Date.now();
const stage = label => { const now=Date.now(); stages.push({label,elapsedMs:now-stageStart,at:new Date(now).toISOString()}); console.log(`[booth-preview] ${label} ${now-stageStart}ms`); stageStart=now; };
const manifest = { stages, status: 'running', commit: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  startedAt: new Date().toISOString(), captures: [], profiles: [],
  dataSHA256: digest(fs.readFileSync('src/systems/baozhong/booth-browser-data.json')),
  limitations: ['Debug teleport stages player position, not a walk-through route test.', 'Mobile is Chromium touch/viewport emulation, not a physical phone.'] };
fs.mkdirSync(output,{recursive:true});
const save = () => fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2));
let browser;
const server = createServer((req,res) => {
  let file;
  try { file=path.resolve(root,'dist',`.${decodeURIComponent(new URL(req.url,'http://localhost').pathname)}`); } catch { res.writeHead(400).end(); return; }
  const dist=path.join(root,'dist');
  if(!file.startsWith(dist+path.sep)&&file!==dist){res.writeHead(403).end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
try {
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  manifest.browser=browser.version();
  const profiles = [{name:'desktop',viewport:{width:1440,height:900}}, {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}];
  const requested=process.env.BOOTH_PREVIEW_PROFILE; if(requested&&!profiles.some(p=>p.name===requested))throw new Error('Unknown preview profile');
  for(const profile of profiles.filter(p=>!requested||p.name===requested)){
    stage(`${profile.name}:start`); save();
    const {name,...options}=profile, context=await browser.newContext(options), page=await context.newPage();
    page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/?debug=1`);
    await page.waitForFunction(()=>window.__bz26?.boothBrowsing&&window.__game);
    await page.locator('#go').click();await page.evaluate(()=>__bz26.accept());
    await page.waitForFunction(()=>__bz26.venue.on&&__bz26.boothBrowsing.entries.length===37);
    const approach=async id=>{await page.evaluate(id=>{const e=__bz26.boothBrowsing.entries.find(e=>e.id===`bz26-browse-${id}`);__game.teleport(e.x,e.z);},id);await page.waitForFunction(id=>__bz26.boothBrowsing.nearbyId===id,id);};
    const shot=async subject=>{await page.evaluate(()=>document.fonts.ready);const file=`${name}-${subject}.png`;await page.screenshot({path:path.join(output,file)});manifest.captures.push({file,sha256:digest(fs.readFileSync(path.join(output,file))),subject,profile:name});save();};
    for(const id of ['D01','D26','D37','D22']){
      await approach(id);await shot(`${id}-entry`);stage(`${name}:${id}:entry`);save();await page.locator('#bz-booth-browse-button').click();
      await page.waitForFunction(id=>__bz26.boothBrowsing.panel.currentId===id,id);
      const before=await page.evaluate(()=>__game.pos.toArray());await page.keyboard.down('w');await page.waitForTimeout(150);await page.keyboard.up('w');
      assert.deepEqual(await page.evaluate(()=>__game.pos.toArray()),before,'reading must not move the player');
      await shot(`${id}-overview`);
      for(const tab of [1,2,3]){await page.locator(`[data-booth-tab="${tab}"]`).click();if(tab===3){const s=page.locator('[data-booth-group]');if(await s.inputValue()==='')await s.selectOption({index:1});}await shot(`${id}-tab${tab}`);}
      const size=await page.locator('.bz-browser__dialog').boundingBox();assert.ok(size.x>=0&&size.x+size.width<=profile.viewport.width+1,'no horizontal overflow');
      await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>__game.state.bzBoothBrowsing),false);
      assert.equal(await page.locator('#bz-booth-browse-button').evaluate(e=>document.activeElement===e),true);
    }
    stage(`${name}:four-department-panels`);save();
    // Every registered counter opens its own data, including NPC-adjacent entries.
    for(let i=1;i<=37;i++){const id=`D${String(i).padStart(2,'0')}`;await approach(id);await page.locator('#bz-booth-browse-button').click();assert.equal(await page.locator('[data-booth-panel]').getAttribute('data-booth-id'),id);await page.keyboard.press('Escape');}
    stage(`${name}:all37-entries`);save();
    for(const id of ['D01','D26','D37']){await approach(id);await page.locator('#bz-booth-browse-button').click();await page.locator('[data-favorite-reason="courses"]').click();await page.locator(`[data-compare-toggle="${id}"]`).click();await page.keyboard.press('Escape');}
    await page.locator('#bz-exploration-button').click(); await shot('exploration-list');
    await page.locator('[data-exploration-compare]').click();assert.equal(await page.locator('[data-compare-department]').count(),3);await shot('three-department-comparison');
    if(name==='mobile'){await page.locator('.bz-browser__comparison-tabs button').last().click();await shot('comparison-preparation');}
    await page.keyboard.press('Escape');await page.locator('#bz-activity-button').click();assert.equal(await page.locator('[data-favorite-id]').count(),3);await shot('favorite-map');await page.keyboard.press('Escape');
    stage(`${name}:exploration-and-map`);save();
    await approach('D26');await page.keyboard.press('b');await page.locator('[data-booth-talk]').click();
    assert.equal(await page.evaluate(()=>__bz26.boothBrowsing.panel.isOpen),false);assert.equal(await page.locator('#dlg').isVisible(),true);
    // Start a clean actual game session after proving the close-before-talk handoff.
    await page.reload(); await page.waitForFunction(()=>window.__bz26?.boothBrowsing&&window.__game);
    await page.locator('#go').click(); await page.evaluate(()=>__bz26.accept()); await approach('D26');
    await page.locator('#bz-booth-browse-button').click();
    await page.evaluate(()=>__bz26.leave());
    assert.equal(await page.locator('.bz-browser').isVisible(),false);assert.equal(await page.evaluate(()=>__game.spots.filter(s=>s.id?.startsWith('bz26-browse-')).length),0);
    assert.equal(await page.evaluate(()=>__game.state.bzBoothBrowsing),false);
    await page.evaluate(()=>__bz26.accept());
    assert.equal(await page.evaluate(()=>__game.spots.filter(s=>s.id?.startsWith('bz26-browse-')).length),37);
    await approach('D26'); await page.locator('#bz-booth-browse-button').click();
    assert.equal(await page.evaluate(()=>__bz26.boothBrowsing.panel.currentId),'D26'); await page.keyboard.press('Escape');
    stage(`${name}:exit-and-reentry`);save();
    manifest.profiles.push({name,errors,all37Entries:true,exitAndReentry:true});assert.deepEqual(errors,[]);await context.close();
  }
  manifest.status='passed';save();
}catch(error){manifest.status='failed';manifest.error=String(error.stack||error);save();throw error;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
