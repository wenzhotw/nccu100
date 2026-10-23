/**
 * 四角色相容試做。僅由測試或明確的預覽入口呼叫，正式遊戲不自動啟用。
 * 保留舊物件與掛載層級，不建立新的可彎曲骨架。
 */
import { Group } from 'three';
import { TRIAL_IDS, getActorRigIdentity } from './actor-rig-identity.js';
export { TRIAL_IDS } from './actor-rig-identity.js';

/** @typedef {import('three').Object3D} Node */
/** @typedef {{shL: Node, shR: Node, hipL: Node, hipR: Node, head: Node}} LegacyJoints */
/** @typedef {{id: string, root: Node, body: Node, joints: LegacyJoints, headCenter: Node}} RigInput */

export const RIG_PROFILES = Object.freeze({
  npc: Object.freeze({ headPivotY: 0.99, headCenterOffsetY: 0, shoulderX: 0.21, shoulderY: 0.65, hipX: 0.085, hipY: 0.33 }),
  player: Object.freeze({ headPivotY: 0.72, headCenterOffsetY: 0.27, shoulderX: 0.19, shoulderY: 0.63, hipX: 0.085, hipY: 0.32 }),
});
const installed = new WeakMap();

/** @param {Node} node @param {Node} root */
function belongs(node, root) {
  for (let n=node; n; n=n.parent) if (n===root) return true;
  return false;
}

/**
 * 僅接收建構時取得的引用，不由 children 索引推測骨架。
 * NPC 的 head.pivot 與 head.center 是同一個舊節點的兩個名稱別名。
 * 主角的舊 H.head 仍是頸部 pivot，不能改綁 center。
 * @param {RigInput} input
 */
export function optInFourCharacterRig({id, root, body, joints, headCenter}) {
  if (!TRIAL_IDS.includes(id)) throw new RangeError(`Unsupported trial character: ${id}`);
  if (!root?.isObject3D) throw new TypeError('Invalid root');
  const identity=getActorRigIdentity(root);
  if (!identity || identity.id!==id || identity.root!==root || identity.body!==body ||
      identity.joints!==joints || identity.headCenter!==headCenter ||
      Object.entries(identity.jointRefs).some(([key,node])=>joints?.[key]!==node)) throw new Error('Actor provenance mismatch');
  const existing=installed.get(root);
  const profileId=identity.profileId;
  const names={root, body, 'head.pivot':joints?.head, 'head.center':headCenter,
    'shoulder.L':joints?.shL, 'shoulder.R':joints?.shR, 'hip.L':joints?.hipL, 'hip.R':joints?.hipR};
  for (const [name,node] of Object.entries(names)) {
    if (!node?.isObject3D || !belongs(node,root)) throw new TypeError(`Invalid joint: ${name}`);
  }
  if (body.parent!==root || joints.head.parent!==body ||
      [joints.shL,joints.shR,joints.hipL,joints.hipR].some(n=>n.parent!==body)) throw new Error('Unexpected legacy hierarchy');
  if (new Set([root,body,joints.head,joints.shL,joints.shR,joints.hipL,joints.hipR]).size!==7) throw new Error('Overlapping legacy joints');
  if (profileId==='npc' ? headCenter!==joints.head : headCenter.parent!==joints.head) throw new Error('Wrong head profile');
  if (existing) {
    if (existing.id!==id || existing.legacy.joints!==joints ||
        Object.entries(names).some(([name,node])=>existing.refs[name]!==node)) throw new Error('Conflicting rig registration');
    return existing;
  }

  // 待決定位點只是保留位置，不代表手肘、膝蓋、手掌或腳的解剖座標。
  const reservations=[['forearm.L',joints.shL],['forearm.R',joints.shR],['lowerLeg.L',joints.hipL],['lowerLeg.R',joints.hipR]];
  for (const [key] of reservations) if (root.getObjectByName(`reserved.${key}`)) throw new Error(`Reserved name collision: ${key}`);
  const reserved={};
  for (const [key,parent] of reservations) {
    const marker=new Group(); marker.name=`reserved.${key}`;
    marker.userData={active:false, offsetsUnspecified:true, bendEnabled:false};
    marker.matrixAutoUpdate=false;
    parent.add(marker); reserved[key]=marker;
  }
  // 名稱表是非破壞別名，既有 costume 名稱與原物件名稱完全不變。
  const refs=Object.freeze(names);
  const result=Object.freeze({id, root, body, profileId, profile:RIG_PROFILES[profileId], refs,
    head:Object.freeze({pivot:joints.head, center:headCenter}),
    shoulders:Object.freeze({L:joints.shL,R:joints.shR}), hips:Object.freeze({L:joints.hipL,R:joints.hipR}),
    legacy:Object.freeze({joints, rig:body, head:headCenter, left:joints.shL, right:joints.shR, hipLeft:joints.hipL, hipRight:joints.hipR}),
    reserved:Object.freeze(reserved), get:name=>refs[name], bendEnabled:false});
  installed.set(root,result);
  return result;
}
