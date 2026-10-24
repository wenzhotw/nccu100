/** 僅由明確 opt-in 的既有啟動點動態呼叫，依賴注入避免提前初始化 gameplay。 */
import {createCharacterCardActor} from '../../actors/character-card-actor.js';
import {createCardPreviewStore} from './store.js';
import {createCardPreviewController} from './controller.js';
import {mountCardPreviewPanel} from './panel.js';
import './panel.css';
export function mountCardGamePreview({NPCS,storage,state,ownership,canOpen,resetInput}){
 const store=createCardPreviewStore(storage);
 const controller=createCardPreviewController({store,resolveActor:id=>NPCS.find(n=>n.id===id),createAdapter:createCharacterCardActor,ownership});
 // v1 restore 已先完成，衝突時維持 v1，不會自動拆掉現有配裝。
 const errors=controller.restore();let panel;
 try{panel=mountCardPreviewPanel({controller,store,state,ownership,canOpen,resetInput,initialMessage:errors.join('\n')});}
 catch(error){controller.dispose();throw error;}
 const dispose=()=>{panel.dispose();controller.dispose();};
 window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
 return {dispose};
}
