/**
 * 鏡頭防穿模。
 */
import * as THREE from 'three';
import { state } from '../core/state.js';
import { scene } from '../core/engine.js';
import { OUT } from '../render/kit.js';
import { sky } from '../world/environment/sky.js';

/* ---------- 鏡頭防穿模 ---------- */
state.OCC=[];
const camRay=new THREE.Raycaster(), camDir=new THREE.Vector3();
state.camD=6;
/** 找出某個場景裡會擋鏡頭的牆（預設是校園），回傳清單 */
function buildOccluders(root=scene){ const bb=new THREE.Box3(), sz=new THREE.Vector3(), list=[];
  const walk=o=>{ if(o.userData&&o.userData.noOcc) return;
    if(o.isMesh&&o.material!==OUT&&!o.isInstancedMesh&&o!==sky){ const t=o.geometry.type; let ok=t==='BoxGeometry'||t==='ExtrudeGeometry'||(t==='CylinderGeometry'&&o.geometry.parameters.radiusTop>0.6);
      if(ok){ bb.setFromObject(o); bb.getSize(sz); if(Math.max(sz.x,sz.z)>1.4&&sz.y>0.25) list.push(o); } }
    o.children.forEach(walk); };
  root.children.forEach(walk); return list; }

export { buildOccluders, camDir, camRay };
