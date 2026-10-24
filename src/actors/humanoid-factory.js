import * as THREE from 'three';
/**
 * 共用幾何組裝器，不依賴角色名單、遊戲狀態或舊建構器。
 * 注入既有渲染工具，保留材質／描邊與配置的建構順序。
 * head.center=null 表示中心與旋轉點共用同一節點，並非補造新頸關節。
 */
const factories={capsule:THREE.CapsuleGeometry,cylinder:THREE.CylinderGeometry,sphere:THREE.SphereGeometry};
// 有界的不可變幾何池，保留每次 constructor 的亂數消耗與建構順序。
// 命中後丟棄尚未交給 renderer 的臨時幾何，僅降低常駐資源，不聲稱降低建構 CPU。
const geometryPool=new Map(),POOL_LIMIT=64;
let geometryRequests=0,geometryReuses=0;
export function getHumanoidGeometryStats(){return Object.freeze({requests:geometryRequests,reuses:geometryReuses,entries:geometryPool.size,limit:POOL_LIMIT});}
function pooledGeometry(kind,args){
 const fresh=new factories[kind](...args),key=JSON.stringify([kind,...args]);geometryRequests++;
 if(geometryPool.has(key)){geometryReuses++;return geometryPool.get(key);}
 if(geometryPool.size<POOL_LIMIT)geometryPool.set(key,fresh);
 return fresh;
}
const assemblies=new WeakMap();
export function getHumanoidAssembly(root){return assemblies.get(root);}
function plainCopy(value){
 if(value===null||value===undefined||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw new TypeError('Non-finite profile value');return value;}
 if(typeof value!=='object'||(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype))throw new TypeError('Profile must contain plain data');
 const out=Array.isArray(value)?[]:{};
 for(const key of Reflect.ownKeys(value)){
  if(Array.isArray(value)&&key==='length')continue;
  const d=Object.getOwnPropertyDescriptor(value,key);
  if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value')||['__proto__','constructor','prototype'].includes(key))throw new TypeError('Invalid profile field');
  out[key]=plainCopy(d.value);
 }
 return out;
}
function validateProfile(input){
 const p=plainCopy(input),positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
 function vector(v,scale=false){if(!Array.isArray(v)||v.length!==3||![...v].every(n=>typeof n==='number'&&Number.isFinite(n)&&(!scale||n>0)))throw new TypeError('Invalid profile vector');}
 function spec(m){
  if(!m||!Array.isArray(m.geometry))throw new TypeError('Invalid profile mesh');
  const [kind,...args]=m.geometry,counts={capsule:4,cylinder:4,sphere:3,'box-unit':0,'sphere-unit':0};
  if(!Object.hasOwn(counts,kind)||args.length!==counts[kind]||!args.every(positive))throw new TypeError('Invalid profile geometry');
  const segments=kind==='capsule'?args.slice(2):kind==='cylinder'?args.slice(3):kind==='sphere'?args.slice(1):[];
  if(segments.some(n=>!Number.isInteger(n)||n<3||n>64))throw new TypeError('Invalid profile segments');
  if(typeof m.color!=='string'||!/^#[0-9a-f]{6}$/i.test(m.color))throw new TypeError('Invalid profile color');
  vector(m.position);if(m.scale!=null)vector(m.scale,true);
  if(m.out!=null&&(!Number.isFinite(m.out)||m.out<0))throw new TypeError('Invalid outline');
  if(m.outlineScale!=null&&!positive(m.outlineScale))throw new TypeError('Invalid outline scale');
 }
 if(!p||!positive(p.scale)||typeof p.noOcc!=='boolean')throw new TypeError('Invalid profile root');
 spec(p.torso);spec(p.bottom);
 for(const name of ['arm','leg']){if(!p[name])throw new TypeError('Missing profile limb');vector(p[name].pivot);spec(p[name].upper);}
 spec(p.arm.forearm);if(p.arm.hand!=null)spec(p.arm.hand);
 spec(p.leg.shoe);if(p.leg.sole!=null)spec(p.leg.sole);
 if(!p.head)throw new TypeError('Missing profile head');vector(p.head.pivot);if(p.head.center!==null)vector(p.head.center);spec(p.head.skull);
 return p;
}
export function createHumanoid(profile,{parent,part,outlineU,BOX,SPH,afterTorso,afterBottom,afterArms}={}){
 if(!profile||typeof part!=='function'||typeof outlineU!=='function'||!BOX||!SPH)throw new TypeError('Humanoid profile and render tools required');
 profile=validateProfile(profile);
 for(const hook of [afterTorso,afterBottom,afterArms])if(hook!==undefined&&typeof hook!=='function')throw new TypeError('Invalid decoration hook');
 if(parent!==undefined&&!parent?.isObject3D)throw new TypeError('Invalid model parent');
 const root=new THREE.Group(),body=new THREE.Group(),joints={},limbParts={},parts={};root.add(body);
 const context={root,body,joints,limbParts,parts,headCenter:null,kind:'humanoid'};
 function mesh(spec,where){
  const [kind,...args]=spec.geometry;
  const geometry=kind==='box-unit'?BOX:kind==='sphere-unit'?SPH:pooledGeometry(kind,args);
  const node=part(geometry,spec.color,...spec.position,where,spec.out??undefined);
  if(spec.scale)node.scale.set(...spec.scale);
  if(spec.outlineScale)outlineU(node,spec.outlineScale);
  return node;
 }
 function pivot(position,side=1){const node=new THREE.Group();node.position.set(position[0]*side,position[1],position[2]);body.add(node);return node;}
 try{
  if(profile.noOcc)root.userData.noOcc=true;
  parts.torso=mesh(profile.torso,body);afterTorso?.(context);
  parts.bottom=mesh(profile.bottom,body);afterBottom?.(context);
  for(const [side,key] of [[-1,'L'],[1,'R']]){
   const shoulder=pivot(profile.arm.pivot,side);joints[`sh${key}`]=shoulder;
   const sleeve=mesh(profile.arm.upper,shoulder),forearm=mesh(profile.arm.forearm,shoulder);
   const arm={sleeve,forearm};if(profile.arm.hand)arm.hand=mesh(profile.arm.hand,shoulder);limbParts[`arm${key}`]=arm;
  }
  afterArms?.(context);
  for(const [side,key] of [[-1,'L'],[1,'R']]){
   const hip=pivot(profile.leg.pivot,side);joints[`hip${key}`]=hip;
   const leg=mesh(profile.leg.upper,hip),shoe=mesh(profile.leg.shoe,hip);
   const refs={leg,shoe};if(profile.leg.sole)refs.sole=mesh(profile.leg.sole,hip);limbParts[`leg${key}`]=refs;
  }
  joints.head=pivot(profile.head.pivot);
  context.headCenter=joints.head;
  if(profile.head.center){const center=new THREE.Group();center.position.set(...profile.head.center);joints.head.add(center);context.headCenter=center;}
  parts.skull=mesh(profile.head.skull,context.headCenter);
  root.scale.setScalar(profile.scale);parent?.add(root);
  assemblies.set(root,Object.freeze({profile,body,joints,headCenter:context.headCenter,parts,limbParts}));
  return context;
 }catch(error){root.removeFromParent();throw error;}
}
