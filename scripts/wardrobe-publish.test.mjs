import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('換裝發布頁沿用驗收工作台，保留根頁與子路徑相對位置',()=>{
 const dev=read('dev/wardrobe-preview.html'),published=read('wardrobe/index.html');
 assert.equal(published,dev.replace('src="./wardrobe-preview.js"','src="../dev/wardrobe-preview.js"'));
 assert.match(published,/href="\.\.\/index\.html"/);
 const vite=read('vite.config.js');
 assert.match(vite,/new URL\('\.\/index\.html', import\.meta\.url\)/);
 assert.match(vite,/new URL\('\.\/wardrobe\/index\.html', import\.meta\.url\)/);
 assert.match(vite,/base: '\.\/'/);
 assert.match(vite,/emptyOutDir: mode !== 'wardrobe'/);
 assert.match(vite,/copyPublicDir: mode !== 'wardrobe'/);
 assert.match(vite,/assetsDir: mode === 'wardrobe' \? 'wardrobe\/assets' : 'assets'/);
 assert.equal(JSON.parse(read('package.json')).scripts.build,'vite build && vite build --mode wardrobe && node scripts/wardrobe-build-order-check.mjs');
});
test('工作台不匯入正式啟動或存檔，保存鍵不共用正式遊戲',()=>{
 const ui=read('dev/wardrobe-preview.js');
 assert.doesNotMatch(ui,/(?:import|from)[^\n]*(?:main\.js|core\/loop|systems\/save|dah-hsian)/);
 assert.match(ui,/nccu100\.wardrobe\.preview\.v1\./);
 assert.doesNotMatch(ui,/['"]nccu100-save['"]/);
 assert.match(ui,/source\.querySelectorAll\('script,style,link,iframe'\)\.forEach\(n=>n\.remove\(\)\)/);
 assert.match(ui,/fetch\('\.\.\/index\.html'\)/);
 assert.doesNotMatch(read('src/main.js'),/wardrobe-preview|createWardrobeActor/);
});
