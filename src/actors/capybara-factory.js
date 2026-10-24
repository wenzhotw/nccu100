/** 非人形專用工廠。保留舊水豚幾何、關節與順序，不冒充人形槽位。 */
import * as THREE from 'three';
const assemblies=new WeakMap();
export function getCapybaraAssembly(root){return assemblies.get(root);}
export function createCapybara(o={}, {parent,part,BOX,SPH}={}){
  if(!parent?.isObject3D||typeof part!=='function'||!BOX||!SPH)throw new TypeError('Capybara render tools and parent required');
  const g=new THREE.Group(), rig=new THREE.Group(); g.add(rig); g.userData.noOcc=true;
  try{
  const headwear=[];
  const fur=o.fur||'#9a6a43', dark=o.dark||'#6e4a2f', P={};
  const body=part(new THREE.CapsuleGeometry(0.3,0.42,8,16),fur,0,0.42,-0.05,rig,0.014); body.rotation.x=Math.PI/2; body.scale.set(1,1,0.92);
  const hc=new THREE.Group(); hc.position.set(0,0.62,0.36); rig.add(hc); P.head=hc;
  const hd=part(BOX,fur,0,0,0.06,hc,0.014); hd.scale.set(0.34,0.3,0.42);
  const nose=part(BOX,dark,0,-0.02,0.28,hc); nose.scale.set(0.3,0.22,0.06);
  [-0.07,0.07].forEach(x=>part(SPH,'#2a1f1a',x,0.02,0.312,hc).scale.set(0.022,0.015,0.01));
  [-1,1].forEach(s=>{ part(SPH,'#1e1714',s*0.172,0.07,0.12,hc).scale.setScalar(0.03); part(SPH,dark,s*0.13,0.16,-0.08,hc).scale.set(0.05,0.06,0.03); });
  if(o.yuzu!==false){ const fruit=part(SPH,'#f2b134',0,0.2,0.04,hc,0.01); fruit.scale.setScalar(0.085); const leaf=part(BOX,'#4f9a48',0.03,0.29,0.04,hc); leaf.scale.set(0.06,0.015,0.035); headwear.push(fruit,leaf); }
  const legMeshes=new Map();
  const leg=(x,z)=>{ const hp=new THREE.Group(); hp.position.set(x,0.24,z); rig.add(hp); const mesh=part(new THREE.CapsuleGeometry(0.065,0.1,4,8),dark,0,-0.1,0,hp,0.01);legMeshes.set(hp,mesh); return hp; };
  P.hipL=leg(-0.17,0.2); P.hipR=leg(0.17,0.2); P.shL=leg(-0.17,-0.28); P.shR=leg(0.17,-0.28);
  P.fA=P.fB=P.fC=null; P.fm={map:null};   // 沒有畫上去的臉，眨眼動畫不用做事
  g.scale.setScalar(o.scale||1.25);
  parent.add(g);
  const model={root:g,body:rig,joints:P,headCenter:hc,kind:'capybara',parts:{torso:body,skull:hd,nose,headwear},limbParts:{frontL:{leg:legMeshes.get(P.hipL)},frontR:{leg:legMeshes.get(P.hipR)},backL:{leg:legMeshes.get(P.shL)},backR:{leg:legMeshes.get(P.shR)}}};
  assemblies.set(g,Object.freeze(model));
  return model;
  }catch(error){g.removeFromParent();throw error;}
}
