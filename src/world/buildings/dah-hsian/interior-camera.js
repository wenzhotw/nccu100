/** 達賢專用取景設定，讀取共用鏡頭完成碰撞退讓後的位置。
 * 不修改全遊戲的取景函式；上層切換也留在同一個設定物件，避免複製時提早讀取補正。
 */
import {INTERIOR_CAMERA} from './interior-layout.js';
const clamp01=value=>Math.max(0,Math.min(1,value));
export function createDahInteriorCamera({state,camera,getFeetY,getTargetY},base=INTERIOR_CAMERA){
 const config={...base};delete config.upper;
 const upper=()=>getFeetY()>=(base.upper?.fromY??Infinity);
 const setting=key=>upper()&&base.upper[key]!==undefined?base.upper[key]:base[key];
 Object.defineProperties(config,{
  maxDist:{enumerable:true,get:()=>setting('maxDist')},
  eyeFloor:{enumerable:true,get:()=>upper()?getFeetY()+base.upper.eyeOffset:base.eyeFloor},
  lookUpHeight:{enumerable:true,get:()=>setting('lookUpHeight')},
  aimOffset:{enumerable:true,get:()=>{
   const pitch=state.pitch??.12,offset=setting('aimOffset')||0;
   const aim=getTargetY()+setting('lookUpHeight')*clamp01((.18-pitch)/.23)+offset;
   return offset-Math.max(0,aim-Math.max(.5,camera.position.y))*clamp01((pitch+.05)/.15);
  }},
 });
 return config;
}
