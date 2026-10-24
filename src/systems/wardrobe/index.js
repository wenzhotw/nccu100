/** Loaded after all real actors/custom costumes and the legacy save restoration. */
import {NPCS} from '../../actors/npc.js';
import {player,rig,H,headCenter} from '../../actors/player.js';
import {createWardrobeActor} from '../../actors/wardrobe-factory.js';
import {appearanceOwnership,ownAppearanceAdapter} from '../../actors/appearance-ownership.js';
import {createGameWardrobeStore} from '../../actors/wardrobe-config.js';
import {createGameWardrobeController} from './controller.js';
import {mountGameWardrobePanel} from './panel.js';
import {state} from '../../core/state.js';
import {resetHeldInput} from '../../core/input.js';
import {vel} from '../../core/gameplay.js';
import {dlg} from '../../ui/dialog.js';
import './panel.css';
import {isCardGamePreviewEnabled} from '../character-cards/gate.js';
// Delayed property access preserves normal game startup when storage is disabled.
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)};
const store=createGameWardrobeStore(storage);
const controller=createGameWardrobeController({store,createAdapter:input=>ownAppearanceAdapter(appearanceOwnership,input.id,'wardrobe-v1',()=>createWardrobeActor(input)),isEagle:()=>state.isEagle,
 resolveActor(id){if(id==='player')return {id,root:player,body:rig,joints:H,headCenter};const n=NPCS.find(n=>n.id===id);return n&&{id,root:n.g,body:n.rig,joints:n.P,headCenter:n.P.head};},
});
const errors=controller.restore();
mountGameWardrobePanel({controller,store,state,canOpen:()=>state.started&&!state.busy&&!state.bzBoothBrowsing&&dlg.hidden&&document.getElementById('mapw').hidden,
 resetInput(){resetHeldInput();vel.set(0,0,0);},initialMessage:errors.join('\n')});

// 明確 query 才載入實際遊戲內的三套設定卡預覽，一般玩家不載入新面板。
if(isCardGamePreviewEnabled(location.search)){
 import('../character-cards/index.js').then(({mountCardGamePreview})=>mountCardGamePreview({NPCS,storage,state,ownership:appearanceOwnership,
  canOpen:()=>state.started&&!state.busy&&!state.bzBoothBrowsing&&dlg.hidden&&document.getElementById('mapw').hidden,
  resetInput(){resetHeldInput();vel.set(0,0,0);},
 })).catch(error=>{console.error('[character cards preview]',error);const notice=document.createElement('p');notice.setAttribute('role','alert');notice.textContent=`設定卡預覽未啟動：${error.message}`;document.getElementById('hud')?.append(notice);});
}
