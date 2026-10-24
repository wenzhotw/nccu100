/** Loaded after all real actors/custom costumes and the legacy save restoration. */
import {NPCS} from '../../actors/npc.js';
import {player,rig,H,headCenter} from '../../actors/player.js';
import {createWardrobeActor} from '../../actors/wardrobe-factory.js';
import {createGameWardrobeStore} from '../../actors/wardrobe-config.js';
import {createGameWardrobeController} from './controller.js';
import {mountGameWardrobePanel} from './panel.js';
import {state} from '../../core/state.js';
import {resetHeldInput} from '../../core/input.js';
import {vel} from '../../core/gameplay.js';
import {dlg} from '../../ui/dialog.js';
import './panel.css';
// Delayed property access preserves normal game startup when storage is disabled.
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)};
const store=createGameWardrobeStore(storage);
const controller=createGameWardrobeController({store,createAdapter:createWardrobeActor,isEagle:()=>state.isEagle,
 resolveActor(id){if(id==='player')return {id,root:player,body:rig,joints:H,headCenter};const n=NPCS.find(n=>n.id===id);return n&&{id,root:n.g,body:n.rig,joints:n.P,headCenter:n.P.head};},
});
const errors=controller.restore();
mountGameWardrobePanel({controller,store,state,canOpen:()=>state.started&&!state.busy&&!state.bzBoothBrowsing&&dlg.hidden&&document.getElementById('mapw').hidden,
 resetInput(){resetHeldInput();vel.set(0,0,0);},initialMessage:errors.join('\n')});
