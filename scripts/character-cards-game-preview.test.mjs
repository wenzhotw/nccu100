import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('遊戲設定卡預覽延後載入且依賴注入，不另啟動場景或遊戲存檔',()=>{
 const boot=read('src/systems/wardrobe/index.js'),runtime=read('src/systems/character-cards/index.js');
 assert.match(boot,/if\(isCardGamePreviewEnabled\(location.search\)\)/);
 assert.ok(boot.indexOf('controller.restore()')<boot.indexOf("import('../character-cards/index.js')"));
 assert.match(boot,/ownAppearanceAdapter\(appearanceOwnership,input.id,'wardrobe-v1'/);
 assert.doesNotMatch(runtime,/from[^\n]*(actors\/npc|core\/gameplay|core\/loop|systems\/save|main\.js)/);
 assert.match(runtime,/if\(!event.persisted\)dispose\(\)/);
});
test('遊戲內預覽保留 modal lock、原字串驗證與明確衝突提示',()=>{
 const ui=read('src/systems/character-cards/panel.js'),css=read('src/systems/character-cards/panel.css');
 assert.match(ui,/dialog.showModal\(\)/);assert.match(ui,/state.bzBoothBrowsing=true/);assert.match(ui,/state.bzBoothBrowsing=false/);
 assert.match(ui,/\['keydown','keyup'\]/);assert.match(ui,/event.stopPropagation\(\)/);assert.match(ui,/button.focus\(\)/);
 assert.match(ui,/validateCharacterCard\(json.value,select.value\)/);assert.match(ui,/原面板還原此角色/);
 assert.match(css,/box-sizing:border-box/);assert.match(css,/max-width:calc\(100vw - 28px\)/);
 assert.doesNotMatch(ui,/nccu100-save|GAME_WARDROBE_KEY/);
});
