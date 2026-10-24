/** 達賢專用取景設定，讀取共用鏡頭完成碰撞退讓後的位置。
 * 不修改全遊戲的取景函式；上層切換也留在同一個設定物件，避免複製時提早讀取補正。
 */
import {INTERIOR_CAMERA} from './interior-layout.js';
const clamp01=value=>Math.max(0,Math.min(1,value));
export function createDahInteriorCamera({state,camera,getFeetY,getTargetY,onFrame},base=INTERIOR_CAMERA){
 const config={...base};delete config.upper;
 const upper=()=>getFeetY()>=(base.upper?.fromY??Infinity);
 const setting=key=>upper()&&base.upper[key]!==undefined?base.upper[key]:base[key];
 Object.defineProperties(config,{
  maxDist:{enumerable:true,get:()=>setting('maxDist')},
  eyeFloor:{enumerable:true,get:()=>upper()?getFeetY()+base.upper.eyeOffset:base.eyeFloor},
  lookUpHeight:{enumerable:true,get:()=>setting('lookUpHeight')},
  aimOffset:{enumerable:true,get:()=>{
   // 共用取景入口於碰撞退讓後讀取；本區回呼不修改共用鏡頭或材質。
   onFrame?.();
   const pitch=state.pitch??.12,offset=setting('aimOffset')||0;
   const aim=getTargetY()+setting('lookUpHeight')*clamp01((.18-pitch)/.23)+offset;
   return offset-Math.max(0,aim-Math.max(.5,camera.position.y))*clamp01((pitch+.05)/.15);
  }},
 });
 return config;
}

/** 本區只持有自己造成的隱藏，離區／銷毀不可改寫其他系統的顯示狀態。 */
export function createDahAvatarVisibility({avatar,camera,state,getPosition}){
 let owned=false,disposed=false;
 const restore=()=>{if(owned){avatar.visible=true;owned=false;}};
 return{
  update(){
   if(disposed)return;
   if(state.room!=='dah-hsian-2f'||state.viewCam){restore();return;}
   const p=getPosition();if(!p){restore();return;}
   // 水平距離對應頭部在畫面中的放大；不同樓層不沿用上一層判定。
   const distance=Math.hypot(camera.position.x-p.x,camera.position.z-p.z);
   const near=Math.abs(camera.position.y-(p.y+1.2))<1.8;
   if(!owned&&avatar.visible&&near&&distance<1.8){avatar.visible=false;owned=true;}
   else if(owned&&(!near||distance>2.2))restore();
  },
  dispose(){if(disposed)return;restore();disposed=true;},
 };
}

/** 使用zoom放寬本區視野；共用跑步FOV照常運作，不在每幀互相覆寫。 */
export function createDahInteriorLens({camera,state}){
 const originalZoom=camera.zoom;let applied=null,disposed=false;
 const set=zoom=>{if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}};
 const restore=()=>{if(applied!==null&&camera.zoom===applied)set(originalZoom);applied=null;};
 return{
  update(){
   if(disposed)return;
   if(state.room!=='dah-hsian-2f'||state.viewCam){restore();return;}
   // 55度原視野分別約68／70度；直式略放寬，避免極端魚眼。
   const next=originalZoom*(camera.aspect<.8?.74:.78);
   if(camera.zoom!==next)set(next);applied=next;
  },
  dispose(){if(disposed)return;restore();disposed=true;},
 };
}
