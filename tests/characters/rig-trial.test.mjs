/** 四角色隔離試做。使用既有建構器與序列化器，不更新任何基準。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getActorRigIdentity } from '../../src/actors/actor-rig-identity.js';
import { optInFourCharacterRig, TRIAL_IDS } from '../../src/actors/four-character-rig.js';
import { capturePoseSnapshots } from './poses.mjs';
let NPCS;
let serializers;

const readWorld=(name, poses=false)=>fs.readFileSync(new URL(`./snapshots/${poses?'poses/':'world/'}${name.replace(/#/g,'--').replace(/[^\w.-]/g,'_')}.jsonl`,import.meta.url),'utf8').trimEnd().split('\n');
const results=[];
const hook=Symbol.for('nccu100.isolated-rig-trial');
globalThis[hook]=(id,root,serialize,worldList,context)=>{
  const {H,rig,headCenter}=context; NPCS=context.NPCS; serializers={serialize,worldList};
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
const build=new URL('./build.mjs',import.meta.url);
const original=fs.readFileSync(build,'utf8').replace(/import \{([^}]+)\} from '\.\.\/\.\.\/src\/actors\/player\.js';/, (_, names)=>{
  const imports=names.split(',').map(n=>n.trim());
  for(const name of ['H','rig','headCenter']) if(!imports.includes(name)) imports.push(name);
  return `import { ${imports.join(', ')} } from '../../src/actors/player.js';`;
});
const token='const add = (id, root) => {';
assert.equal(original.split(token).length,2);
const tmpDir=fs.mkdtempSync(path.join(os.tmpdir(),'nccu100-rig-'));
const tmp=pathToFileURL(path.join(tmpDir,'build.mjs'));
try {
  const instrumented=original.replace(token,`${token}\n  globalThis[Symbol.for('nccu100.isolated-rig-trial') ](id,root,serialize,worldList,{H,rig,headCenter,NPCS});`);
  // 保留原 import 順序與模組身分，只將解析基準改回正式 build 所在位置。
  const relocated=instrumented.replace(/((?:from\s+|import\s+)['"])([^'"]+)(['"])/g, (_,prefix,specifier,suffix)=>
    prefix+(specifier.startsWith('.')?new URL(specifier,build).href:import.meta.resolve(specifier))+suffix);
  fs.writeFileSync(tmp,relocated);
  await import(tmp.href);
} finally { fs.rmSync(tmpDir,{recursive:true,force:true}); delete globalThis[hook]; }

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
    assert.throws(()=>optInFourCharacterRig(input),/Actor provenance mismatch/);
    assert.equal(count(),before);
    delete n.P.shL;
    assert.throws(()=>optInFourCharacterRig(input),/Actor provenance mismatch/);
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


test('來源紀錄只登記真四角色，個別關節引用不可由可變 P 偷換',()=>{
  for(const n of NPCS) {
    const identity=getActorRigIdentity(n.g);
    if(['chiang','bz26-D12','bz26-D23'].includes(n.id)) {
      assert.equal(identity.id,n.id); assert.equal(identity.profileId,'npc');
      assert.ok(Object.isFrozen(identity)); assert.ok(Object.isFrozen(identity.jointRefs));
      for(const key of ['shL','shR','hipL','hipR','head']) assert.equal(identity.jointRefs[key],n.P[key]);
    } else assert.equal(identity,undefined);
  }
});

test('老校長冒稱蔣學長、學務長冒稱主角、錯配 root 或 P 均在修改前拒絕',()=>{
  const old=NPCS.find(n=>n.id==='old-principal'), dean=NPCS.find(n=>n.id==='dean');
  const chiang=NPCS.find(n=>n.id==='chiang'), other=NPCS.find(n=>n.id==='bz26-D12');
  assert.ok(old&&dean&&chiang&&other);
  const input=n=>({id:n.id,root:n.g,body:n.rig,joints:n.P,headCenter:n.P.head});
  const cases=[
    {...input(old),id:'chiang'},
    {...input(dean),id:'player'},
    {...input(chiang),root:other.g},
    {...input(chiang),joints:other.P},
    {...input(chiang),joints:{...chiang.P}},
    {...input(other),id:'chiang'},
  ];
  const actors=[old,dean,chiang,other];
  for(const candidate of cases) {
    const before=actors.map(n=>({parts:serializers.serialize(n.g),world:serializers.worldList(n.g)}));
    assert.throws(()=>optInFourCharacterRig(candidate),/Actor provenance mismatch/);
    assert.deepEqual(actors.map(n=>({parts:serializers.serialize(n.g),world:serializers.worldList(n.g)})),before);
  }
});

test('試做暫存模組位於系統暫存區且完成後移除，不在角色測試目錄留檔',()=>{
  assert.equal(path.dirname(tmpDir),os.tmpdir());
  assert.equal(fs.existsSync(tmpDir),false);
  assert.ok(!fs.readdirSync(new URL('.',import.meta.url)).some(name=>name.startsWith('.rig-build-')));
});
