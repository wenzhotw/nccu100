/** 四角色共同裝配入口，保留舊建模工廠及 custom 服裝。資料只接受白名單零件。 */
import {Group,Mesh,BoxGeometry,SphereGeometry,CylinderGeometry} from 'three';
import {state} from '../core/state.js';
import {toon,OUT} from '../render/kit.js';
import {getActorRigIdentity,TRIAL_IDS} from './actor-rig-identity.js';
const active=new WeakMap();
const options=values=>Object.freeze(values.map(([id,label])=>Object.freeze({id,label})));
export const WARDROBE_CATALOG=Object.freeze({
  headwear:options([['default','原本頭部'],['beret','藍綠貝雷帽'],['cap','金色學士帽']]),
  outerwear:options([['default','原本服裝'],['teal-vest','藍綠背心'],['gold-vest','暖金背心']]),
  leftHand:options([['default','原本道具'],['none','卸下手持物'],['book','藍綠書本'],['tablet','暖金平板']]),
});
const slots=Object.keys(WARDROBE_CATALOG),defaults=()=>Object.fromEntries(slots.map(s=>[s,'default']));
let shapes;
function geometry(){return shapes??=( {box:new BoxGeometry(1,1,1),sphere:new SphereGeometry(1,16,10),cylinder:new CylinderGeometry(1,1,1,20)} );}
function part(parent,name,shape,color,position,scale){
  const mesh=new Mesh(geometry()[shape],toon(color));mesh.name=name;mesh.userData.noOcc=true;
  mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);
  const edge=new Mesh(mesh.geometry,OUT);edge.name=`${name}.outline`;edge.scale.set(1.025,1.025,1.025);mesh.add(edge);
  return mesh;
}
function build(slot,id){
  if(id==='default'||id==='none')return null;
  const g=new Group();g.name=`wardrobe.${slot}.${id}`;g.userData.noOcc=true;
  if(slot==='headwear'){
    if(id==='beret'){
      part(g,'wardrobe.beret.crown','sphere','#62a8a0',[0,.235,0],[.31,.10,.29]);
      part(g,'wardrobe.beret.band','cylinder','#4d8889',[0,.20,0],[.28,.045,.26]);
      part(g,'wardrobe.beret.stem','cylinder','#e8bc59',[0,.34,0],[.018,.04,.018]);
    }else{
      part(g,'wardrobe.cap.band','cylinder','#e8bc59',[0,.24,0],[.28,.10,.26]);
      part(g,'wardrobe.cap.board','box','#f0cf72',[0,.30,0],[.66,.04,.57]);
      part(g,'wardrobe.cap.tassel','box','#6db8cc',[.24,.20,.12],[.018,.22,.018]);
    }
  }else if(slot==='outerwear'){
    const color=id==='teal-vest'?'#6db8cc':'#e8bc59';
    for(const sign of [-1,1])part(g,`wardrobe.vest.panel.${sign}`,'box',color,[sign*.115,.54,.18],[.15,.30,.035]);
    part(g,'wardrobe.vest.back','box',color,[0,.54,-.17],[.35,.30,.035]);
    for(const sign of [-1,1])part(g,`wardrobe.vest.side.${sign}`,'box',color,[sign*.19,.54,.005],[.035,.30,.36]);
  }else{
    // 書與平板向左手外側延伸，避免覆蓋身體中央；姿勢由手部掛點控制。
    const color=id==='book'?'#62a8a0':'#e8bc59';
    part(g,'wardrobe.prop.cover','box',color,[-.11,0,.02],[.22,.27,.035]);
    part(g,'wardrobe.prop.face','box','#f4f4ee',[-.11,.005,.042],[.185,.23,.012]);
    for(let i=0;i<3;i++)part(g,`wardrobe.prop.line.${i}`,'box','#6db8cc',[-.11,.06-i*.05,.053],[.13,.012,.008]);
  }
  return g;
}
function parseConfig(value,id){
  if(typeof value==='string'){if(value.length>4096)throw new RangeError('Wardrobe JSON too large');value=JSON.parse(value);}
  const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
  if(!plain(value)||Object.keys(value).sort().join(',')!=='actorId,schemaVersion,slots'||value.schemaVersion!==1||value.actorId!==id||!plain(value.slots)||Object.keys(value.slots).sort().join(',')!==[...slots].sort().join(','))throw new Error('Invalid wardrobe config or actor');
  for(const slot of slots)if(!WARDROBE_CATALOG[slot].some(x=>x.id===value.slots[slot]))throw new Error(`Invalid wardrobe item: ${slot}`);
  return {schemaVersion:1,actorId:id,slots:{...value.slots}};
}
export function refreshWardrobeForm(root){active.get(root)?.refreshForm();}
export function deactivateWardrobe(root){active.get(root)?.dispose();}
export function createWardrobeActor({id,root,body,joints,headCenter}){
  const identity=getActorRigIdentity(root);
  if(!TRIAL_IDS.includes(id)||!identity||identity.id!==id||identity.body!==body||identity.joints!==joints||identity.headCenter!==headCenter)throw new Error('Wardrobe actor provenance mismatch');
  if(active.has(root)){active.get(root).validate();return active.get(root);}
  let disposed=false,selection=defaults(),nodes={};
  const suppressed=new Map(),visibilityLeases=new Map();
  // 第一次實際遮蔽時才借用可見狀態，不用 controller 建立時的過期快照。
  function hideOriginal(node){
    if(!visibilityLeases.has(node))visibilityLeases.set(node,{before:node.visible,written:false});
    else if(node.visible!==visibilityLeases.get(node).written)visibilityLeases.get(node).before=node.visible;
    node.visible=false;
  }
  function releaseOriginal(node,restore=true){
    const lease=visibilityLeases.get(node);if(!lease)return;
    if(restore&&node.visible===lease.written)node.visible=lease.before;
    visibilityLeases.delete(node);
  }
  const originalTablet=id==='bz26-D12'?root.getObjectByName('bz26-costume-finance-market-tablet'):null;
  if(id==='bz26-D12'&&!originalTablet)throw new Error('D12 custom tablet must be mounted first');
  const headParent=identity.profileId==='player'?joints.head:body;
  function refreshForm(){
    if(disposed)throw new Error('Wardrobe disposed');
    const swim=id==='player'&&state.outfit==='swim';
    for(const node of Object.values(nodes)){
      if(!node)continue;
      if(swim){if(!suppressed.has(node))suppressed.set(node,node.visible);node.visible=false;}
      else if(suppressed.has(node)){node.visible=suppressed.get(node);suppressed.delete(node);}
    }
    for(const [slot,originals] of [['headwear',identity.appearance.hairTop],['outerwear',identity.appearance.backpack]]){
      for(const node of originals){
        // setOutfit 已套用泳裝本身的隱藏規則，不把舊一般服裝狀態寫回。
        if(swim)releaseOriginal(node,false);
        else if(selection[slot]!=='default')hideOriginal(node);
        else releaseOriginal(node);
      }
    }
  }
  const anchors={headwear:headCenter,outerwear:body,leftHand:joints.shL};
  const elbow=identity.arms.L.forearm.parent;
  const hand=elbow?.name==='trial.elbow.L'&&elbow.parent===joints.shL?elbow.children.find(n=>n.name==='trial.hand.L'):null;
  if(elbow!==joints.shL&&!hand)throw new Error('Unexpected wardrobe forearm hierarchy');
  if(hand)anchors.leftHand=hand;
  function validate(){
    if(disposed)throw new Error('Wardrobe disposed');
    if(!identity.formSupported())throw new Error('Unsupported wardrobe form');
    if(headCenter.parent!==headParent||body.parent!==root||Object.entries(identity.jointRefs).some(([key,node])=>joints[key]!==node||node.parent!==body))throw new Error('Wardrobe hierarchy changed');
    if(hand&&(hand.parent!==elbow||elbow.parent!==joints.shL))throw new Error('Wardrobe hand anchor changed');
    for(const slot of slots)if(nodes[slot]&&nodes[slot].parent!==anchors[slot])throw new Error('Wardrobe item externally reparented');
  }
  validate();
  // 回呼拋錯時的結構回復只處理本控制器持有的節點，不再次觸發失敗的事件。
  function detachOwned(node){if(!node?.parent)return;const parent=node.parent,index=parent.children.indexOf(node);if(index>=0)parent.children.splice(index,1);node.parent=null;}
  function apply(config){
    validate();const next=parseConfig(config,id),staged={};
    const changed=slots.filter(slot=>next.slots[slot]!==selection[slot]);
    if(!changed.length)return result.exportConfig();
    const old=changed.map(slot=>({node:nodes[slot],parent:nodes[slot]?.parent,index:nodes[slot]?.parent?.children.indexOf(nodes[slot])}));
    try{
      for(const slot of changed){
        const node=build(slot,next.slots[slot]);staged[slot]=node;
        if(node){
          if(slot==='leftHand'&&!hand)node.position.y=identity.profileId==='player'?-.21:-.25;
          anchors[slot].add(node);
        }
      }
      for(const slot of changed)nodes[slot]?.removeFromParent();
    }catch(error){
      for(const node of Object.values(staged))detachOwned(node);
      for(const saved of old.sort((a,b)=>(a.index??0)-(b.index??0))){
        if(!saved.node)continue;detachOwned(saved.node);saved.node.parent=saved.parent;saved.parent.children.splice(saved.index,0,saved.node);
      }
      root.updateWorldMatrix(true,true);throw error;
    }
    nodes={...nodes,...staged};selection=next.slots;
    if(originalTablet&&changed.includes('leftHand')){if(selection.leftHand==='default')releaseOriginal(originalTablet);else hideOriginal(originalTablet);}
    for(const saved of old)suppressed.delete(saved.node);refreshForm();
    root.updateWorldMatrix(true,true);
    return result.exportConfig();
  }
  const result=Object.freeze({id,
    validate,refreshForm,
    equip(slot,itemId){if(!slots.includes(slot))throw new Error('Unknown wardrobe slot');return apply({schemaVersion:1,actorId:id,slots:{...selection,[slot]:itemId}});},
    exportConfig(){validate();return {schemaVersion:1,actorId:id,slots:{...selection}};},
    loadConfig(value){return apply(parseConfig(value,id));},
    reset(){return apply({schemaVersion:1,actorId:id,slots:defaults()});},
    dispose(){if(disposed)return;disposed=true;for(const node of Object.values(nodes)){try{node?.removeFromParent();}catch{detachOwned(node);}}for(const node of [...visibilityLeases.keys()])releaseOriginal(node);nodes={};suppressed.clear();active.delete(root);root.updateWorldMatrix(true,true);},
  });
  active.set(root,result);return result;
}
