/** 共用角色幾何契約。保留正式建構與全部既有快照，不更新基準。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {createHumanoid,getHumanoidAssembly} from '../../src/actors/humanoid-factory.js';
import {playerHumanoidProfile,npcHumanoidProfile} from '../../src/actors/humanoid-profiles.js';
import {getActorRigIdentity,TRIAL_IDS} from '../../src/actors/actor-rig-identity.js';

// 先以原本的亂數順序建完真實角色，再執行純工廠測試，避免測試零件改變既有外觀基準。
const seen=[],humanoids=[],nonHumanoids=[],forms=[];
const hook=Symbol.for('nccu100.humanoid-factory-test');
globalThis[hook]=(id,root)=>{
 const assembly=getHumanoidAssembly(root);
 if(id.startsWith('player#')){assert.ok(assembly);forms.push(id);return;}
 if(id==='biz-tsai'){assert.equal(assembly,undefined,'水豚不可硬套人形');nonHumanoids.push(id);return;}
 assert.ok(assembly,`${id} 必須走共用人形工廠`);humanoids.push(id);
 if(!TRIAL_IDS.includes(id))return;
 assert.ok(assembly,`${id} 必須由共用組裝器實際建立`);
 const identity=getActorRigIdentity(root);
 assert.ok(identity);assert.ok(Object.isFrozen(assembly));
 assert.equal(assembly.body,identity.body);assert.equal(assembly.body.parent,root);
 assert.equal(assembly.joints,identity.joints);assert.equal(assembly.headCenter,identity.headCenter);
 assert.equal(assembly.parts.torso.parent,assembly.body);assert.equal(assembly.parts.bottom.parent,assembly.body);
 assert.equal(assembly.parts.skull.parent,assembly.headCenter);
 for(const side of ['L','R']){
  const shoulder=assembly.joints[`sh${side}`],hip=assembly.joints[`hip${side}`];
  assert.equal(shoulder,identity.jointRefs[`sh${side}`]);assert.equal(hip,identity.jointRefs[`hip${side}`]);
  assert.equal(shoulder.parent,assembly.body);assert.equal(hip.parent,assembly.body);
  for(const key of ['sleeve','forearm'])assert.equal(assembly.limbParts[`arm${side}`][key].parent,shoulder);
  assert.equal(assembly.limbParts[`arm${side}`].forearm,identity.arms[side].forearm);
  for(const key of ['leg','shoe'])assert.equal(assembly.limbParts[`leg${side}`][key].parent,hip);
 }
 if(id==='player'){
  assert.equal(assembly.profile.kind,'player');assert.equal(identity.profileId,'player');
  assert.equal(assembly.joints.torso,assembly.parts.torso);
  assert.notEqual(assembly.headCenter,assembly.joints.head);
  assert.equal(assembly.headCenter.parent,assembly.joints.head);
  assert.deepEqual(assembly.joints.head.position.toArray(),[0,.72,0]);
  assert.deepEqual(assembly.headCenter.position.toArray(),[0,.27,0]);
  assert.equal(assembly.limbParts.armL.hand,undefined);assert.ok(assembly.limbParts.legL.sole);
 }else{
  assert.equal(assembly.profile.kind,'npc');assert.equal(identity.profileId,'npc');
  assert.equal(assembly.headCenter,assembly.joints.head);
  assert.deepEqual(assembly.headCenter.position.toArray(),[0,.99,0]);
  assert.equal(assembly.limbParts.armL.hand,identity.arms.L.hand);
  assert.equal(assembly.limbParts.legL.sole,undefined);
 }
 seen.push(id);
};
const build=new URL('./build.mjs',import.meta.url),original=fs.readFileSync(build,'utf8');
const token='const add = (id, root) => {';assert.equal(original.split(token).length,2);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nccu100-humanoid-factory-'));
try{
 const instrumented=original.replace(token,`${token}\n globalThis[Symbol.for('nccu100.humanoid-factory-test')](id,root);`);
 const relocated=instrumented.replace(/((?:from\s+|import\s+)['"])([^'"]+)(['"])/g,(_,a,b,c)=>a+(b.startsWith('.')?new URL(b,build).href:import.meta.resolve(b))+c);
 fs.writeFileSync(path.join(dir,'build.mjs'),relocated);await import(pathToFileURL(path.join(dir,'build.mjs')).href);
}finally{fs.rmSync(dir,{recursive:true,force:true});delete globalThis[hook];}

test('全人形角色走共用幾何，四代表頭部語意與既有引用不變，水豚保留專用形體',()=>{
 assert.deepEqual(seen.sort(),[...TRIAL_IDS].sort());
 assert.deepEqual(forms,['player#swim','player#eagle']);
 assert.equal(humanoids.length,109);assert.deepEqual(nonHumanoids,['biz-tsai']);
 for(const id of ['old-principal','dean','students-0','bz26-D11','bz26-D24'])assert.ok(humanoids.includes(id));
 assert.equal(fs.existsSync(dir),false);
});

const colors={shirt:'#5aa7e0',shorts:'#2f3e66',skin:'#ffe1cc',shoe:'#f6f5f1',sole:'#d9534a'};
function freezeData(value){if(value&&typeof value==='object'){Object.values(value).forEach(freezeData);Object.freeze(value);}return value;}
function nodes(root){const result=[];root.traverse(node=>result.push(node));return result;}
function renderTools(){
 const BOX=new THREE.BoxGeometry(1,1,1),SPH=new THREE.SphereGeometry(1,12,8);
 const calls=[],outlines=[],outlineMaterial=new THREE.MeshBasicMaterial({color:'#241f2b'});
 function part(geometry,color,x,y,z,parent,out){
  const node=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color}));
  node.position.set(x,y,z);parent.add(node);calls.push({node,parent,out});return node;
 }
 function outlineU(node,scale){const outline=new THREE.Mesh(node.geometry,outlineMaterial);outline.scale.setScalar(scale);node.add(outline);outlines.push(outline);return outline;}
 return {BOX,SPH,part,outlineU,calls,outlines};
}

test('任意第五個純資料體型直接改變共用幾何與定位，不需要複製角色建構器',()=>{
 const source=fs.readFileSync(new URL('../../src/actors/humanoid-factory.js',import.meta.url),'utf8');
 assert.deepEqual([...source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(match=>match[1]),['three'],'組裝器不依賴舊角色建構器');
 const base=playerHumanoidProfile(colors),profile=structuredClone(base);
 profile.kind='fifth-profile-only';profile.scale=1.37;profile.noOcc=true;
 profile.torso.geometry=['capsule',.23,.21,5,18];profile.torso.position=[.02,.61,-.04];profile.torso.color='#123456';
 profile.bottom.geometry=['cylinder',.21,.24,.17,20];
 profile.arm.pivot=[.29,.77,.03];profile.arm.forearm.geometry=['capsule',.05,.19,5,12];
 profile.arm.forearm.position=[0,-.23,.02];
 profile.leg.pivot=[.12,.42,-.02];profile.leg.upper.geometry=['capsule',.075,.15,5,12];
 profile.head.pivot=[.01,.89,.02];profile.head.center=[0,.31,-.01];
 profile.head.skull.geometry=['sphere',.34,24,18];profile.head.skull.scale=[1.2,.9,1.1];
 const before=structuredClone(profile);freezeData(profile);
 const tools=renderTools(),model=createHumanoid(profile,tools);
 assert.equal(getHumanoidAssembly(model.root).profile.kind,'fifth-profile-only');
 assert.deepEqual(profile,before);assert.deepEqual(base,playerHumanoidProfile(colors));
 assert.deepEqual(model.root.scale.toArray(),[1.37,1.37,1.37]);assert.equal(model.root.userData.noOcc,true);
 assert.equal(model.parts.torso.geometry.type,'CapsuleGeometry');
 assert.equal(model.parts.torso.geometry.parameters.radius,.23);assert.equal(model.parts.torso.geometry.parameters.height,.21);
 assert.deepEqual(model.parts.torso.position.toArray(),[.02,.61,-.04]);assert.equal(model.parts.torso.material.color.getHexString(),'123456');
 assert.equal(model.parts.bottom.geometry.parameters.radiusTop,.21);assert.equal(model.parts.bottom.geometry.parameters.radiusBottom,.24);
 for(const [side,sign] of [['L',-1],['R',1]]){
  assert.deepEqual(model.joints[`sh${side}`].position.toArray(),[sign*.29,.77,.03]);
  assert.deepEqual(model.joints[`hip${side}`].position.toArray(),[sign*.12,.42,-.02]);
  assert.equal(model.limbParts[`arm${side}`].forearm.geometry.parameters.height,.19);
  assert.deepEqual(model.limbParts[`arm${side}`].forearm.position.toArray(),[0,-.23,.02]);
  assert.equal(model.limbParts[`leg${side}`].leg.geometry.parameters.radius,.075);
  assert.equal(model.limbParts[`leg${side}`].leg.geometry.parameters.height,.15);
  assert.equal(model.limbParts[`leg${side}`].shoe.geometry,tools.SPH);
  assert.equal(model.limbParts[`leg${side}`].sole.geometry,tools.BOX);
 }
 assert.deepEqual(model.joints.head.position.toArray(),[.01,.89,.02]);assert.deepEqual(model.headCenter.position.toArray(),[0,.31,-.01]);
 assert.equal(model.parts.skull.geometry.parameters.radius,.34);assert.deepEqual(model.parts.skull.scale.toArray(),[1.2,.9,1.1]);
 model.root.updateWorldMatrix(true,true);for(const node of nodes(model.root))assert.ok(node.matrixWorld.elements.every(Number.isFinite));
});

test('體型產生器及組裝結果都是獨立資料與節點，輸入唯讀且不被後續變動污染',()=>{
 const look=freezeData({top:'#6699cc',pants:'#223344',skin:'#ffeedd',shoe:'#112233',scale:1.18,shortSleeve:true});
 for(const make of [()=>playerHumanoidProfile(colors),()=>npcHumanoidProfile(look)]){
  const profile=make(),other=make(),before=structuredClone(profile);
  assert.deepEqual(profile,other);assert.notEqual(profile,other);
  assert.notEqual(profile.arm,other.arm);assert.notEqual(profile.head.skull.geometry,other.head.skull.geometry);
  freezeData(profile);
  const tools=renderTools(),first=createHumanoid(profile,tools),second=createHumanoid(profile,tools);
  assert.deepEqual(profile,before);
  for(const key of ['root','body','joints','parts','limbParts','headCenter'])assert.notEqual(first[key],second[key]);
  const firstNodes=new Set(nodes(first.root));for(const node of nodes(second.root))assert.equal(firstNodes.has(node),false);
  for(const key of ['armL','armR','legL','legR'])assert.notEqual(first.limbParts[key],second.limbParts[key]);
  assert.notEqual(getHumanoidAssembly(first.root).profile,profile);
  assert.notEqual(getHumanoidAssembly(first.root).profile,getHumanoidAssembly(second.root).profile);
  first.joints.shL.position.x=99;first.parts.torso.visible=false;
  assert.notEqual(second.joints.shL.position.x,99);assert.equal(second.parts.torso.visible,true);
  assert.deepEqual(other,before);assert.deepEqual(profile,before);
  other.arm.pivot[0]=123;other.torso.geometry[1]=456;
  assert.deepEqual(getHumanoidAssembly(second.root).profile,before);
 }
});

test('裝飾掛點按順序執行一次，保留部件順序及頭中心兩種語意',()=>{
 for(const profile of [playerHumanoidProfile(colors),npcHumanoidProfile()]){
  const tools=renderTools(),events=[],marks={};
  function mark(name,context){
   assert.equal(context.root.parent,null);assert.equal(getHumanoidAssembly(context.root),undefined);
   events.push(name);const node=new THREE.Group();node.name=name;context.body.add(node);marks[name]=node;
   if(name==='afterTorso'){assert.equal(context.parts.bottom,undefined);assert.deepEqual(Object.keys(context.joints),[]);}
   if(name==='afterBottom'){assert.ok(context.parts.bottom);assert.deepEqual(Object.keys(context.joints),[]);}
   if(name==='afterArms'){assert.ok(context.joints.shL);assert.ok(context.joints.shR);assert.equal(context.joints.hipL,undefined);}
  }
  const model=createHumanoid(profile,{...tools,afterTorso:context=>mark('afterTorso',context),afterBottom:context=>mark('afterBottom',context),afterArms:context=>mark('afterArms',context)});
  assert.deepEqual(events,['afterTorso','afterBottom','afterArms']);
  assert.deepEqual(model.body.children,[model.parts.torso,marks.afterTorso,model.parts.bottom,marks.afterBottom,model.joints.shL,model.joints.shR,marks.afterArms,model.joints.hipL,model.joints.hipR,model.joints.head]);
  assert.equal(model.parts.skull.parent,model.headCenter);
  if(profile.head.center===null)assert.equal(model.headCenter,model.joints.head);
  else{assert.notEqual(model.headCenter,model.joints.head);assert.equal(model.headCenter.parent,model.joints.head);}
  assert.equal(tools.calls[0].out,.014);assert.equal(tools.calls[1].out,.012);
  assert.equal(tools.outlines.length,3);assert.equal(model.parts.skull.children[0].scale.x,1.045);
 }
});

test('錯誤體型與掛點在建構前拒絕，不呼叫渲染工具、不執行掛點、不掛入場景',()=>{
 const edits=[
  ['缺少軀幹',p=>delete p.torso],['缺少前臂',p=>delete p.arm.forearm],['缺少頭',p=>delete p.head],
  ['根比例為零',p=>p.scale=0],['非數值根比例',p=>p.scale='1'],['非布林遮擋旗標',p=>p.noOcc=1],
  ['無限定位',p=>p.arm.pivot[1]=Infinity],['非數值定位',p=>p.leg.pivot[2]='0'],['短向量',p=>p.head.pivot=[0,1]],
  ['稀疏向量',p=>p.arm.pivot=[.2,,0]],['NaN 尺寸',p=>p.torso.geometry[1]=NaN],['負尺寸',p=>p.bottom.geometry[2]=-.2],
  ['錯誤幾何',p=>p.torso.geometry[0]='constructor'],['多餘幾何參數',p=>p.torso.geometry.push(1)],
  ['非整數分段',p=>p.torso.geometry[3]=4.5],['過少分段',p=>p.head.skull.geometry[2]=2],['過多分段',p=>p.head.skull.geometry[3]=65],
  ['非法顏色',p=>p.torso.color='url(https://invalid.example)'],['零縮放',p=>p.torso.scale=[1,0,1]],
  ['非向量縮放',p=>p.torso.scale=false],['非網格手掌',p=>p.arm.hand=false],['非網格鞋底',p=>p.leg.sole=0],
  ['負描邊',p=>p.torso.out=-.1],['零描邊倍率',p=>p.head.skull.outlineScale=0],
  ['非純資料',p=>p.extra=new THREE.Vector3()],['函式欄位',p=>p.extra=()=>{}],
  ['原型欄位',p=>Object.defineProperty(p,'__proto__',{value:{},enumerable:true})],
  ['存取器欄位',p=>Object.defineProperty(p.torso,'color',{enumerable:true,get(){throw Error('不可執行 getter');}})],
 ];
 const parent=new THREE.Group(),sentinel=new THREE.Group();parent.add(sentinel);
 const children=[...parent.children];
 for(const [label,edit] of edits){
  const profile=playerHumanoidProfile(colors);edit(profile);
  const tools=renderTools();let hooks=0;
  assert.throws(()=>createHumanoid(profile,{...tools,parent,afterTorso:()=>hooks++}),TypeError,label);
  assert.equal(hooks,0,label);assert.equal(tools.calls.length,0,label);assert.deepEqual(parent.children,children,label);
 }
 for(const hookName of ['afterTorso','afterBottom','afterArms']){
  const tools=renderTools();assert.throws(()=>createHumanoid(playerHumanoidProfile(colors),{...tools,parent,[hookName]:true}),/Invalid decoration hook/);
  assert.equal(tools.calls.length,0);assert.deepEqual(parent.children,children);
 }
 const tools=renderTools();assert.throws(()=>createHumanoid(playerHumanoidProfile(colors),{...tools,parent:{}}),/Invalid model parent/);assert.equal(tools.calls.length,0);
});

test('後段掛點失敗時維持原場景順序且不登記半成品，之後仍能正常建構',()=>{
 const parent=new THREE.Group(),before=[new THREE.Group(),new THREE.Group()];parent.add(...before);
 const tools=renderTools();let failed,disposed=0;
 tools.BOX.addEventListener('dispose',()=>disposed++);tools.SPH.addEventListener('dispose',()=>disposed++);
 assert.throws(()=>createHumanoid(playerHumanoidProfile(colors),{...tools,parent,afterArms:context=>{
  failed=context;assert.ok(context.limbParts.armR.forearm);throw Error('injected late decoration failure');
 }}),/injected late decoration failure/);
 assert.equal(failed.root.parent,null);assert.equal(getHumanoidAssembly(failed.root),undefined);
 assert.deepEqual(parent.children,before);assert.equal(disposed,0,'失敗不可銷毀共用幾何');
 const model=createHumanoid(playerHumanoidProfile(colors),{...tools,parent});
 assert.deepEqual(parent.children,[...before,model.root]);assert.ok(getHumanoidAssembly(model.root));
});

test('場景掛載已發生才拋錯也會移除半成品，保留既有物件及可重試性',()=>{
 const parent=new THREE.Group(),before=[new THREE.Group(),new THREE.Group()];parent.add(...before);
 const add=parent.add;let failed;
 try{
  parent.add=function(node){failed=node;add.call(this,node);throw Error('injected parent attach failure');};
  assert.throws(()=>createHumanoid(npcHumanoidProfile(),{...renderTools(),parent}),/injected parent attach failure/);
 }finally{parent.add=add;}
 assert.equal(failed.parent,null);assert.equal(getHumanoidAssembly(failed),undefined);assert.deepEqual(parent.children,before);
 const model=createHumanoid(npcHumanoidProfile(),{...renderTools(),parent});
 assert.deepEqual(parent.children,[...before,model.root]);assert.ok(getHumanoidAssembly(model.root));
});
