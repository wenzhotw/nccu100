import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('設定卡為獨立第三次建置，不改遊戲與原工作台入口',()=>{
 const config=read('vite.config.js'),pkg=JSON.parse(read('package.json'));
 assert.match(config,/mode === 'cards'/);assert.match(config,/\.\/cards\/index\.html/);assert.match(config,/'cards\/assets'/);
 assert.match(pkg.scripts.build,/vite build && vite build --mode wardrobe && vite build --mode cards && node scripts\/wardrobe-build-order-check.mjs/);
 const html=read('cards/index.html');assert.match(html,/href="\.\.\/index\.html"/);assert.match(html,/尚未套用正式遊戲/);assert.match(html,/box-sizing:border-box/);
});
test('設定卡預覽保存 namespace 獨立，原字串驗證與儲存屬同筆裝配交易',()=>{
 const ui=read('dev/character-cards-preview.js');
 assert.doesNotMatch(ui,/nccu100-save|GAME_WARDROBE_KEY|wardrobe\.game|activateArticulatedArms|import[^\n]*(main\.js|core\/loop)/);
 assert.match(ui,/apply\(validateCharacterCard\(\$\('json'\)\.value,actor.id\)\)/);
 assert.match(ui,/loadCard\(card,\{commit:\(\)=>localStorage.setItem/);
 assert.match(ui,/reset\(\{commit:\(\)=>localStorage.removeItem/);
 assert.match(ui,/event.persisted/);assert.match(ui,/cardReady='true'/);
 assert.doesNotMatch(read('src/main.js'),/character-card/);
});
