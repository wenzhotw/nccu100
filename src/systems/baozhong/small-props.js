// 原始 booths[].prop 的靜態小道具。僅桌面展示，不還原後版大型 decor。
import * as THREE from 'three';
import { createDecorCtx, drawSign } from './decor-ctx.js';
import { BUILDERS as A } from './small-props-01-12.js';
import { BUILDERS as B } from './small-props-13-24.js';
import { BUILDERS as C } from './small-props-25-37.js';
export const SMALL_PROP_BUILDERS = Object.freeze({ ...A, ...B, ...C });
export const SMALL_PROP_IDS = Object.freeze(Object.keys(SMALL_PROP_BUILDERS).sort());
export const SMALL_PROP_ENVELOPE = Object.freeze({ width: 1.35, height: .72, depth: .50, y: .78, z: 1.0 });
export function buildSmallProp(parent, id, { toon, OUT, canvasTex }, source) {
  const build=SMALL_PROP_BUILDERS[id];if(!build)return null;
  const root=new THREE.Group();root.name=`bz26-small-prop-${id}`;root.userData.noOcc=true;root.userData.bz26SmallProp=id;root.userData.bz26PropSource=source||'';
  const ctx=createDecorCtx({THREE,toon,outlineMat:OUT,relocateMainSign:false,makeSignTexture:(text,w,h,bg,fg)=>canvasTex?canvasTex(512,Math.max(64,Math.round(512*h/w)),(g,cw,ch)=>drawSign(g,cw,ch,text,bg,fg)):null},root,'#1f3c8f');
  build(ctx);root.updateMatrixWorld(true);
  const raw=new THREE.Box3().setFromObject(root),size=raw.getSize(new THREE.Vector3()),center=raw.getCenter(new THREE.Vector3()),E=SMALL_PROP_ENVELOPE;
  if(raw.isEmpty()||!size.toArray().every(Number.isFinite))throw new Error(`${id} 小道具幾何無效`);
  const scale=Math.min(1,E.width/Math.max(size.x,.001),E.height/Math.max(size.y,.001),E.depth/Math.max(size.z,.001));
  root.scale.set(scale,scale,scale);root.position.set(-center.x*scale,E.y-raw.min.y*scale,E.z-center.z*scale);
  root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root);parent.add(root);
  return {root,bounds,scale,source,parts:[...root.children]};
}
