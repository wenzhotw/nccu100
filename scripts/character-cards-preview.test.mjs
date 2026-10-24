import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('設定卡為獨立第三次建置，不改遊戲與原工作台入口',()=>{
 const config=read('vite.config.js'),pkg=JSON.parse(read('package.json'));
 assert.match(config,/mode === 'cards'/);assert.match(config,/\.\/cards\/index\.html/);assert.match(config,/'cards\/assets'/);
 assert.match(pkg.scripts.build,/vite build && vite build --mode wardrobe && vite build --mode cards && node scripts\/wardrobe-build-order-check.mjs/);
 const html=read('cards/index.html');assert.match(html,/href="\.\.\/index\.html"/);assert.match(html,/工作台不自動套用/);assert.match(html,/index\.html\?characterCardsPreview=1/);assert.match(html,/box-sizing:border-box/);
});
test('設定卡預覽保存 namespace 獨立，原字串驗證與儲存屬同筆裝配交易',()=>{
 const ui=read('dev/character-cards-preview.js');
 assert.doesNotMatch(ui,/nccu100-save|GAME_WARDROBE_KEY|wardrobe\.game|activateArticulatedArms|import[^\n]*(main\.js|core\/loop)/);
 assert.match(ui,/card=validateCharacterCard\(\$\('json'\)\.value,actor.id\)/);
 assert.match(ui,/guard\(\(\)=>apply\(card\)\)\(\)/);
 assert.match(ui,/loadCard\(card,\{commit:\(\)=>localStorage.setItem/);
 assert.match(ui,/reset\(\{commit:\(\)=>localStorage.removeItem/);
 assert.match(ui,/event.persisted/);assert.match(ui,/cardReady='true'/);
 assert.doesNotMatch(read('src/main.js'),/character-card/);
});
test('預期 JSON 驗證錯只顯示 UI；有效卡裝配故障仍交給記錄錯誤的 guard',async()=>{
 const {runInNewContext}=await import('node:vm');
 const {validateCharacterCard,defaultCharacterCard}=await import('../src/actors/character-card-config.js');
 const source=read('dev/character-cards-preview.js'),start=source.indexOf("$('import').addEventListener('click',()=>{"),end=source.indexOf("$('export').addEventListener",start);
 assert.ok(start>=0&&end>start);let handler,guardCalls=0,logged=0;
 const input={value:'invalid'},status={},document={documentElement:{dataset:{}}};
 const $=id=>id==='json'?input:{addEventListener(type,fn){handler=fn;}};
 runInNewContext(source.slice(start,end),{$,status,document,actor:{id:'bz26-D26'},validateCharacterCard,guard:fn=>()=>{guardCalls++;try{fn();}catch{logged++;}},apply(){throw Error('real mount failure');}});
 handler();assert.equal(guardCalls,0);assert.equal(logged,0);assert.match(status.textContent,/設定卡未載入/);
 input.value=JSON.stringify(defaultCharacterCard('bz26-D26'));handler();assert.equal(guardCalls,1);assert.equal(logged,1);
});
