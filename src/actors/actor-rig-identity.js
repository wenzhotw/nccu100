/**
 * 四角色試做的建構來源紀錄。只由現有角色建構器登記，不改場景或幾何。
 * 防止誤傳角色與關節，不是防止惡意程式碼的安全邊界。
 */
export const TRIAL_IDS = Object.freeze(['chiang', 'player', 'bz26-D12', 'bz26-D23']);
const identities=new WeakMap();

function record(id, profileId, root, body, joints, headCenter, limbParts, formSupported=()=>true, appearance={}) {
  if (identities.has(root)) throw new Error('Actor identity already registered');
  identities.set(root,Object.freeze({id,profileId,root,body,headCenter,joints,formSupported,
    appearance:Object.freeze({hairTop:Object.freeze([...(appearance.hairTop||[])]),backpack:Object.freeze([...(appearance.backpack||[])])}),
    arms:limbParts ? Object.freeze(Object.fromEntries(['L','R'].map(side=>[side,Object.freeze({...limbParts[`arm${side}`]})]))) : null,
    jointRefs:Object.freeze({shL:joints.shL,shR:joints.shR,hipL:joints.hipL,hipR:joints.hipR,head:joints.head})}));
}

/** 僅由 addNPC 在真正的 n 與其模型建好後呼叫。範圍外不登記。 */
export function registerTrialNpc(n, limbParts, appearance) {
  if (n.id!=='player' && TRIAL_IDS.includes(n.id)) record(n.id,'npc',n.g,n.rig,n.P,n.P.head,limbParts,()=>true,appearance);
}

/** 僅由 player.js 建好主角 H 與 hc 後呼叫。 */
export function registerTrialPlayer(root, body, joints, headCenter, limbParts, formSupported=()=>true, appearance={}) {
  record('player','player',root,body,joints,headCenter,limbParts,formSupported,appearance);
}

/** 只讀來源紀錄，包含不可變的個別關節引用副本。 */
export function getActorRigIdentity(root) { return identities.get(root); }
