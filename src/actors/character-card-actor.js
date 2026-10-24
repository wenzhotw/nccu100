/** 三套原有服裝的資料驅動裝配 adapter。僅預覽使用，不更動正式動畫或存檔。 */
import {getHumanoidAssembly} from './humanoid-factory.js';
import {CHARACTER_CARD_CATALOG,defaultCharacterCard,validateCharacterCard} from './character-card-config.js';
import {createVisibilityRules} from './visibility-rules.js';
const active=new WeakMap();
function detach(node){if(!node?.parent)return;const parent=node.parent,i=parent.children.indexOf(node);if(i>=0)parent.children.splice(i,1);node.parent=null;}
export function createCharacterCardActor(n){
 const definition=CHARACTER_CARD_CATALOG[n?.id],assembly=getHumanoidAssembly(n?.g);
 if(!definition||!assembly||n.assembly?.root!==n.g||assembly.body!==n.rig||assembly.joints!==n.P||n.g.userData.bz26Costume?.id!==n.id.slice(5))throw new Error('Character card provenance mismatch');
 if(active.has(n.g))throw new Error('Character card actor already active');
 const anchors={body:n.rig,head:n.P.head,'shoulder.L':n.P.shL,'shoulder.R':n.P.shR,'hip.L':n.P.hipL,'hip.R':n.P.hipR};
 for(const [key,suffix] of [['body','body'],['head','head'],['left','left'],['right','right'],['hipLeft','hip-left'],['hipRight','hip-right']]){
  const node=n.g.getObjectByName(`bz26-costume-${n.id}-${suffix}`);if(!node)throw new Error('Missing costume anchor');anchors[`costume.${key}`]=node;
 }
 const anchorParents=new Map(Object.values(anchors).map(node=>[node,node.parent]));
 const jointRefs=Object.fromEntries(['head','shL','shR','hipL','hipR'].map(key=>[key,n.P[key]]));
 const p=n.assembly.parts,l=n.assembly.limbParts;
 const sources={top:[p.torso,...(p.torsoDecorations||[]),l.armL.sleeve,l.armR.sleeve,l.armL.forearm,l.armR.forearm],bottom:[p.bottom,l.legL.leg,l.legR.leg]};
 const body=[...anchors['costume.body'].children],arms=[...anchors['costume.left'].children,...anchors['costume.right'].children];
 if(n.id==='bz26-D26'){
  sources.custom=body.filter(x=>/kimono-(obi|obijime|back-bow)/.test(x.name));
  sources.dress=[...body.filter(x=>!sources.custom.includes(x)),...arms];sources.headwear=[...anchors['costume.head'].children];
 }else if(n.id==='bz26-D31'){
  sources.custom=body.filter(x=>/judge-(neck-tab|white-collar)/.test(x.name));
  sources.dress=[...body.filter(x=>!sources.custom.includes(x)),...arms];sources.headwear=[...anchors['costume.head'].children];
 }else sources['hand.L']=[n.g.getObjectByName('bz26-costume-finance-market-tablet')];
 const originals=Object.fromEntries(Object.keys(definition.parts).map(slot=>[slot,sources[slot].map(node=>{
  if(!node?.isObject3D)throw new Error(`Missing source part ${slot}`);
  const anchor=Object.keys(anchors).find(key=>anchors[key]===node.parent);if(!anchor)throw new Error(`Unmapped source anchor ${slot}`);
  return {node,parent:node.parent,anchor};
 })]));
 let disposed=false,card=defaultCharacterCard(n.id),nodes={};const visibility=createVisibilityRules();
 function validate(){
  if(disposed)throw new Error('Character card disposed');
  if(n.g!==n.assembly.root||n.rig.parent!==n.g||n.P!==assembly.joints)throw new Error('Character card hierarchy changed');
  for(const [node,parent] of anchorParents)if(node.parent!==parent)throw new Error('Character card anchor reparented');
  for(const [key,node] of Object.entries(jointRefs))if(n.P[key]!==node)throw new Error('Character card joint replaced');
  for(const list of Object.values(originals))for(const {node,parent} of list)if(node.parent!==parent)throw new Error('Original card part reparented');
  for(const list of Object.values(nodes))for(const {node,parent} of list)if(node.parent!==parent)throw new Error('Card part reparented');
 }
 function claims(next=card,items=nodes){
  const map=new Map();
  for(const [slot,value] of Object.entries(next.parts))if(value!=='default')map.set(slot,originals[slot].map(x=>x.node));
  // 長袍與上衣裝配可同時遮原上衣，卸下長袍後仍保留上衣的遮藏權。
  for(const [owner,targets] of Object.entries(definition.rules))if(!['default','none'].includes(next.parts[owner])){
   map.set(`${owner}.cover`,targets.flatMap(slot=>[...sources[slot],...(items[slot]||[]).map(x=>x.node)]));
  }
  return map;
 }
 function loadCard(value,{commit}={}){
  validate();const next=validateCharacterCard(value,n.id);
  if(commit!==undefined&&(typeof commit!=='function'||commit.constructor.name==='AsyncFunction'))throw new TypeError('Card commit must be synchronous');
  const changed=Object.keys(next.parts).filter(slot=>next.parts[slot]!==card.parts[slot]);
  const before=visibility.snapshot(),oldNodes=nodes,oldCard=card,staged={},old=changed.flatMap(slot=>(nodes[slot]||[]).map(item=>({...item,index:item.parent.children.indexOf(item.node)})));
  const beforeVisible=new Map();for(const list of Object.values(originals))for(const {node} of list)beforeVisible.set(node,node.visible);
  for(const list of Object.values(nodes))for(const {node} of list)beforeVisible.set(node,node.visible);
  try{
   for(const slot of changed){
    staged[slot]=[];
    if(!['default','none'].includes(next.parts[slot]))for(const source of originals[slot]){
     const node=source.node.clone(true);node.name=`character-card.${slot}.${source.node.name}`;node.visible=visibility.baseline(source.node);
     staged[slot].push({node,parent:source.parent});source.parent.add(node);
    }
    for(const item of nodes[slot]||[])item.node.removeFromParent();
   }
   nodes={...nodes,...staged};card=next;visibility.sync(claims());
   const result=commit?.();if(result&&typeof result.then==='function')throw new TypeError('Card commit returned a Promise');
  }catch(error){
   for(const list of Object.values(staged))for(const {node} of list)detach(node);
   for(const item of old.sort((a,b)=>a.index-b.index)){detach(item.node);item.node.parent=item.parent;item.parent.children.splice(item.index,0,item.node);}
   visibility.restore(before);for(const [node,visible] of beforeVisible)node.visible=visible;
   nodes=oldNodes;card=oldCard;throw error;
  }
  return exportCard();
 }
 function exportCard(){validate();return validateCharacterCard(card,n.id);}
 const result=Object.freeze({anchors:Object.freeze(anchors),
  catalog:Object.freeze(Object.fromEntries(Object.entries(originals).map(([slot,refs])=>[slot,Object.freeze({id:definition.parts[slot],sources:Object.freeze(refs.map((x,index)=>Object.freeze({source:`${slot}.${index}`,name:x.node.name,anchor:x.anchor})))})]))),
  exportCard,loadCard,validate,refresh(){validate();visibility.sync(claims());},
  reset(options){return loadCard(defaultCharacterCard(n.id),options);},
  dispose(){if(disposed)return;visibility.clear();for(const list of Object.values(nodes))for(const {node} of list)detach(node);disposed=true;active.delete(n.g);},
 });active.set(n.g,result);return result;
}
