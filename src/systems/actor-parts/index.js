/** 正式入口只加明確操作面板；沒有保存資料時不建立任何替換零件。 */
import MANIFEST from '../../actors/character-manifest.json';
import {characterRegistry} from '../../actors/character-registry.js';
import {createActorPartsAdapter} from '../../actors/actor-parts-adapter.js';
import {appearanceOwnership} from '../../actors/appearance-ownership.js';
import {createActorPartsStore} from './store.js';
import {createActorPartsController} from './controller.js';
import {mountActorPartsPanel} from './panel.js';
import {state} from '../../core/state.js';
import {late} from '../../core/late.js';
import {resetHeldInput} from '../../core/input.js';
import {vel} from '../../core/gameplay.js';
import {dlg} from '../../ui/dialog.js';
import './panel.css';
const storage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),removeItem:k=>localStorage.removeItem(k)};
const store=createActorPartsStore(storage),controller=createActorPartsController({registry:characterRegistry,store,ownership:appearanceOwnership,createAdapter:createActorPartsAdapter});
// 未生成角色仍在清冊顯示等待；不用虛構 Object3D 或假登記。
const registry={get:id=>characterRegistry.get(id),subscribe:fn=>characterRegistry.subscribe(fn),list:()=>MANIFEST.map(m=>characterRegistry.get(m.id)||{...m,ready:false,slots:{},unsupportedSlots:['尚未生成']})};
let initialError='';try{initialError=controller.restore().join('\n');}catch(error){initialError=error.message;}
const panel=mountActorPartsPanel({registry,controller,store,state,ownership:appearanceOwnership,
 canOpen:()=>state.started&&!state.busy&&!state.bzBoothBrowsing&&dlg.hidden&&document.getElementById('mapw').hidden,
 resetInput(){resetHeldInput();vel.set(0,0,0);},initialMessage:initialError});
late.actorPartsRefresh=()=>controller.refresh();
addEventListener('pagehide',event=>{if(event.persisted)return;panel.dispose();controller.dispose();delete late.actorPartsRefresh;});
