/**
 * 鏡頭防穿模。
 */
import * as THREE from 'three';
import { state } from '../core/state.js';
import { scene } from '../core/engine.js';
import { OUT } from '../render/kit.js';
import { sky } from '../world/environment/sky.js';
import { collectCameraOccluders } from './camera-occluders.js';

/* ---------- 鏡頭防穿模 ---------- */
state.OCC=[];
const camRay=new THREE.Raycaster(), camDir=new THREE.Vector3();
state.camD=6;
/** 找出某個場景裡會擋鏡頭的牆（預設是校園），回傳清單 */
function buildOccluders(root=scene){return collectCameraOccluders(root,{outline:OUT,sky});}

export { buildOccluders, camDir, camRay };
