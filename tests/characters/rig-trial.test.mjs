/** 四角色隔離試做。使用既有建構器與序列化器，不更新任何基準。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { optInFourCharacterRig, TRIAL_IDS } from '../../src/actors/four-character-rig.js';
import { capturePoseSnapshots } from './poses.mjs';
let NPCS;

const readWorld=(name, poses=false)=>fs.readFileSync(new URL(`./snapshots/${poses?'poses/':'world/'}${name.replace(/#/g,'--').replace(/[^\w.-]/g,'_')}.jsonl`,import.meta.url),'utf8').trimEnd().split('\n');
const results=[];
const hook=Symbol.for('nccu100.isolated-rig-trial');
globalThis[hook]=(id,root,serialize,worldList,context)=>{
  const {H,rig,headCenter}=context; NPCS=context.NPCS;
  const before=serialize(root), neutral=worldList(root);
  assert.deepEqual(neutral,readWorld(id),`${id} 舊世界空間基準`);
  if (!TRIAL_IDS.includes(id)) {
    if (!id.startsWith('player#')) assert.ok(!before.some(n=>n.name?.startsWith('reserved.')));
    return;
  }
  const n=id==='player'?null:NPCS.find(n=>n.id===id&&n.g===root);
  const joints=id==='player'?H:n.P;
  const input={id,root,body:id==='player'?rig:n.rig,joints,headCenter:id==='player'?headCenter:joints.head};
  const oldChildren=new Map(); root.traverse(o=>oldChildren.set(o,[...o.children]));
  const posesBefore=capturePoseSnapshots(id,root,joints,worldList);
  const refs=optInFourCharacterRig(input);
  assert.equal(optInFourCharacterRig(input),refs,'重複啟用不得增加節點');
  assert.equal(refs.get('head.pivot'),joints.head);
  assert.equal(refs.legacy.joints,joints);
  assert.equal(refs.get('head.center'),input.headCenter);
  assert.equal(refs.profileId,id==='player'?'player':'npc');
  assert.deepEqual(worldList(root),neutral);
  const after=serialize(root);
  const originalPaths=new Set(before.map(p=>p.path));
  assert.deepEqual(after.filter(p=>originalPaths.has(p.path)),before,'原有節點結構完全不變');
  const added=after.filter(p=>!originalPaths.has(p.path));
  assert.deepEqual(added.map(p=>p.name).sort(),['reserved.forearm.L','reserved.forearm.R','reserved.lowerLeg.L','reserved.lowerLeg.R']);
  for(const [node,children] of oldChildren) assert.deepEqual(node.children.slice(0,children.length),children,'僅可在子節點尾端追加');
  for(const marker of Object.values(refs.reserved)) {
    assert.equal(marker.children.length,0); assert.equal(marker.matrixAutoUpdate,false);
    assert.deepEqual(marker.userData,{active:false,offsetsUnspecified:true,bendEnabled:false});
  }
  const posesAfter=capturePoseSnapshots(id,root,joints,worldList);
  assert.deepEqual(posesAfter,posesBefore);
  for(const pose of posesAfter) assert.deepEqual(pose.world,readWorld(`${id}--${pose.pose}`,true));
  assert.deepEqual(worldList(root),neutral);
  results.push({id,poses:posesAfter.length,added:added.length});
};
// 暫存副本只插入同步試做觀察點，正式 build.mjs 與遊戲入口不變。
const build=new URL('./build.mjs',import.meta.url), tmp=new URL(`./.rig-build-${process.pid}.mjs`,import.meta.url);
const original=fs.readFileSync(build,'utf8').replace(/import \{([^}]+)\} from '\.\.\/\.\.\/src\/actors\/player\.js';/, (_, names)=>{
  const imports=names.split(',').map(n=>n.trim());
  for(const name of ['H','rig','headCenter']) if(!imports.includes(name)) imports.push(name);
  return `import { ${imports.join(', ')} } from '../../src/actors/player.js';`;
});
const token='const add = (id, root) => {';
assert.equal(original.split(token).length,2);
try {
  fs.writeFileSync(tmp,original.replace(token,`${token}\n  globalThis[Symbol.for('nccu100.isolated-rig-trial') ](id,root,serialize,worldList,{H,rig,headCenter,NPCS});`));
  await import(tmp.href);
} finally { fs.rmSync(tmp,{force:true}); delete globalThis[hook]; }

test('四角色、二十四姿勢與全角色中立世界基準一致，結構僅新增明列的保留定位點',()=>{
  assert.deepEqual(results.map(r=>r.id).sort(),[...TRIAL_IDS].sort());
  assert.equal(results.reduce((n,r)=>n+r.poses,0),24);
  assert.equal(results.reduce((n,r)=>n+r.added,0),16);
});
test('範圍外角色拒絕啟用且不修改節點',()=>{
  const n=NPCS.find(n=>n.id==='old-principal'); const children=[...n.g.children];
  assert.throws(()=>optInFourCharacterRig({id:n.id,root:n.g,body:n.rig,joints:n.P,headCenter:n.P.head}),/Unsupported/);
  assert.deepEqual(n.g.children,children);
});

test('重複啟用仍驗證舊引用，缺少、重複與移走的關節都拒絕且不追加標記',()=>{
  const n=NPCS.find(n=>n.id==='chiang'), saved=n.P.shL;
  const input={id:n.id,root:n.g,body:n.rig,joints:n.P,headCenter:n.P.head};
  const count=()=>{ let c=0; n.g.traverse(()=>c++); return c; };
  const before=count();
  try {
    n.P.shL=n.P.shR;
    assert.throws(()=>optInFourCharacterRig(input),/Overlapping|Conflicting/);
    assert.equal(count(),before);
    delete n.P.shL;
    assert.throws(()=>optInFourCharacterRig(input),/Invalid joint/);
    assert.equal(count(),before);
    n.P.shL=saved;
    const parent=saved.parent, index=parent.children.indexOf(saved);
    try {
      n.g.add(saved);
      assert.throws(()=>optInFourCharacterRig(input),/Unexpected legacy hierarchy/);
      assert.equal(count(),before);
    } finally {
      parent.add(saved);
      parent.children.splice(parent.children.indexOf(saved),1);
      parent.children.splice(index,0,saved);
    }
  } finally { n.P.shL=saved; }
  assert.equal(optInFourCharacterRig(input).shoulders.L,saved);
  assert.equal(count(),before);
});
