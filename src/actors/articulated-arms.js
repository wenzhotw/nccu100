/** 四角色真手肘與手部掛點試做。正式遊戲不自動啟用，停止時完整還原。 */
import { Group } from 'three';
import { getActorRigIdentity, TRIAL_IDS } from './actor-rig-identity.js';
const active=new WeakMap();
export const ARM_POSES=Object.freeze(['neutral','walk','raise-hand','wave','sit','panic']);
const snapshot=n=>({node:n,parent:n.parent,index:n.parent.children.indexOf(n),position:n.position.clone(),quaternion:n.quaternion.clone(),scale:n.scale.clone(),matrix:n.matrix.clone(),matrixAutoUpdate:n.matrixAutoUpdate});
function restore(s) {
  s.parent.add(s.node);
  const a=s.parent.children; a.splice(a.indexOf(s.node),1); a.splice(Math.min(s.index,a.length),0,s.node);
  s.node.position.copy(s.position); s.node.quaternion.copy(s.quaternion); s.node.scale.copy(s.scale);
  s.node.matrix.copy(s.matrix); s.node.matrixAutoUpdate=s.matrixAutoUpdate;
}
function named(root,name) {
  const found=[];root.traverse(n=>{if(n.name===name) found.push(n);});
  if(found.length!==1) throw new Error(`Expected unique accessory: ${name}`);
  return found[0];
}
export function deactivateArticulatedArms(root) { active.get(root)?.dispose(); }
export function activateArticulatedArms({id,root,body,joints,headCenter}) {
  const identity=getActorRigIdentity(root);
  if(!TRIAL_IDS.includes(id)||!identity||identity.id!==id||identity.body!==body||identity.joints!==joints||identity.headCenter!==headCenter||Object.entries(identity.jointRefs).some(([k,n])=>joints[k]!==n)) throw new Error('Actor provenance mismatch');
  if(!identity.formSupported()) throw new Error('Unsupported player form');
  if(body.parent!==root || Object.values(identity.jointRefs).some(n=>n.parent!==body)) throw new Error('Unexpected legacy hierarchy');
  if(active.has(root)) {const current=active.get(root);current.validate();return current;}
  // 雄鷹轉換會先停止人類手肘，再改外觀。
  const moves=[], elbows={}, hands={}, jointState=['shL','shR'].map(k=>snapshot(joints[k]));
  const plan=[];
  for(const side of ['L','R']) {
    const shoulder=joints[`sh${side}`], parts=identity.arms?.[side];
    if(!parts?.forearm || parts.forearm.parent!==shoulder) throw new Error('Missing factory forearm');
    if(root.getObjectByName(`trial.elbow.${side}`)||root.getObjectByName(`trial.hand.${side}`)) throw new Error('Trial name collision');
    const lower=[parts.forearm], grip=[];
    if(parts.hand) { if(parts.hand.parent!==shoulder) throw new Error('Missing factory hand'); grip.push(parts.hand); }
    if(id==='bz26-D23') {
      const s=side==='L'?-1:1;
      for(const key of ['sleeve','cuff']) {
        const n=named(root,`bz26-costume-doublet-${key}-${s}`);
        if(n.parent?.parent!==shoulder) throw new Error('Unexpected costume hierarchy');
        lower.push(n);
      }
    }
    if(id==='bz26-D12' && side==='L') {
      const n=named(root,'bz26-costume-finance-market-tablet');
      if(n.parent?.parent!==shoulder) throw new Error('Unexpected tablet hierarchy'); grip.push(n);
    }
    plan.push({side,shoulder,lower,grip});
  }
  // 左右兩側都檢查完才修改，零角度保留既有世界空間變換。
  const elbowY=identity.profileId==='player'?-.09:-.10;
  const handY=identity.profileId==='player'?-.21:-.25;
  const originals=new Map(plan.flatMap(p=>[...p.lower,...p.grip]).map(n=>[n,snapshot(n)]));
  function move(node,target) {
    const saved=originals.get(node); moves.push(saved);
    target.attach(node);
  }
  try {
    root.updateWorldMatrix(true,true);
    for(const {side,shoulder,lower,grip} of plan) {
      const elbow=new Group(); elbow.name=`trial.elbow.${side}`; elbow.position.y=elbowY;shoulder.add(elbow);elbows[side]=elbow;
      const hand=new Group();hand.name=`trial.hand.${side}`;hand.position.y=handY-elbowY;elbow.add(hand);hands[side]=hand;
      elbow.updateWorldMatrix(true,true);
      for(const node of lower) move(node,elbow);
      for(const node of grip) move(node,hand);
    }
  } catch(error) {
    for(const s of [...moves].sort((a,b)=>a.index-b.index)) restore(s);
    for(const node of [...Object.values(hands),...Object.values(elbows)]) node.removeFromParent();
    root.updateWorldMatrix(true,true);
    throw error;
  }
  let disposed=false;
  function validate() {
    if(disposed) throw new Error('Trial has been disposed');
    if(!identity.formSupported()) throw new Error('Unsupported player form');
    if(body.parent!==root || Object.entries(identity.jointRefs).some(([k,n])=>joints[k]!==n||n.parent!==body)) throw new Error('Actor hierarchy changed');
    for(const {side,shoulder,lower,grip} of plan) {
      if(elbows[side].parent!==shoulder||hands[side].parent!==elbows[side]||lower.some(n=>n.parent!==elbows[side])||grip.some(n=>n.parent!==hands[side])) throw new Error('Articulated hierarchy changed');
    }
  }
  let pose='neutral';
  const readingStart=joints.shL.rotation.clone();
  // D12 持板左手採低位閱讀姿勢，肩外展與手腕反向補償保留真實 0–90 度。
  // 0 度不改中立基準；前 15 度漸進轉換，既有中立接觸另列驗收限制。
  function applyBend(left,right) {
    const requested=left;
    if(id==='bz26-D12') {joints.shL.quaternion.copy(jointState[0].quaternion);hands.L.rotation.set(0,0,0);}
    if(id==='bz26-D12' && left>0) {
      const t=Math.min(left/15,1);
      joints.shL.rotation.set(readingStart.x*(1-t),readingStart.y*(1-t),readingStart.z*(1-t)-.35*t);
      hands.L.rotation.set(left*Math.PI/180,0,0);
    }
    elbows.L.rotation.x=-left*Math.PI/180;elbows.R.rotation.x=-right*Math.PI/180;
    root.updateWorldMatrix(true,true);
    return Object.freeze({requestedDegrees:requested,leftDegrees:left,rightDegrees:right,limited:left!==requested});
  }
  const result=Object.freeze({id,validate,elbows:Object.freeze(elbows),hands:Object.freeze(hands),
    setPose(name) {
      validate();
      if(!ARM_POSES.includes(name)) throw new RangeError(`Unknown arm pose: ${name}`);
      for(const s of jointState) {s.node.quaternion.copy(s.quaternion);s.node.updateMatrix();}
      pose=name;
      for(const hand of Object.values(hands)) hand.rotation.set(0,0,0);
      for(const elbow of Object.values(elbows)) elbow.rotation.set(0,0,0);
      if(name==='walk') {joints.shL.rotation.x=.45;joints.shR.rotation.x=-.45;elbows.L.rotation.x=-.35;elbows.R.rotation.x=-.55;}
      if(name==='raise-hand'||name==='wave') {joints.shR.rotation.z=2.2;elbows.R.rotation.x=-.9;}
      if(name==='wave') elbows.R.rotation.z=.3;
      if(name==='sit') {elbows.L.rotation.x=-1.1;elbows.R.rotation.x=-1.1;}
      if(name==='panic') {joints.shL.rotation.z=-2.2;joints.shR.rotation.z=2.2;elbows.L.rotation.x=-.8;elbows.R.rotation.x=-.8;}
      return applyBend(-elbows.L.rotation.x*180/Math.PI,-elbows.R.rotation.x*180/Math.PI);
    },
    setBendDegrees(degrees) {
      validate();
      if(!Number.isFinite(degrees)||degrees<0||degrees>90) throw new RangeError('Bend degrees must be finite and between 0 and 90');
      result.setPose(pose);
      return applyBend(degrees,degrees);
    },
    dispose() {
      if(disposed)return;disposed=true;
      // 依修改前的索引還原同層順序，不能用搬移的反向順序。
      for(const s of [...moves].sort((a,b)=>a.index-b.index)) restore(s);
      for(const s of jointState) restore(s);
      for(const node of [...Object.values(hands),...Object.values(elbows)]) node.removeFromParent();
      active.delete(root);root.updateWorldMatrix(true,true);
    }});
  active.set(root,result);return result;
}
