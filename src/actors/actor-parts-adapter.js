import {defaultActorPartsCard,validateActorPartsCard} from './actor-parts-config.js';
import {createVisibilityRules} from './visibility-rules.js';
const active=new WeakMap();
function detach(node){if(!node?.parent)return;const p=node.parent,i=p.children.indexOf(node);if(i>=0)p.children.splice(i,1);node.parent=null;}
/** 原生零件 adapter，不改幾何、材質或原角色動畫。 */
export function createActorPartsAdapter(entry){
 if(!entry?.root?.isObject3D||!entry.ready)throw new Error('角色尚未準備好');
 if(active.has(entry.root))throw new Error('Actor parts adapter already active');
 const refs=Object.fromEntries(Object.entries(entry.slots).map(([s,d])=>[s,d.sources.map(node=>({node,parent:node.parent}))]));
 const all=Object.values(refs).flat().map(x=>x.node),seen=new Set();
 for(const n of all){if(!n?.isObject3D||!n.parent||seen.has(n))throw new Error('Invalid/duplicate actor source');seen.add(n);for(let p=n.parent;p;p=p.parent)if(all.includes(p))throw new Error('Overlapping actor source');}
 const anchorParents=new Map(Object.values(entry.anchors||{}).map(n=>[n,n.parent]));
 let card=defaultActorPartsCard(entry),nodes={},disposed=false;const visibility=createVisibilityRules();
 function validate(){for(const [n,p]of anchorParents)if(n.parent!==p)throw new Error('Actor anchor reparented');if(disposed)throw new Error('Actor adapter disposed');if(entry.supported&&!entry.supported())throw new Error('此形態暫停零件編輯');for(const list of [...Object.values(refs),...Object.values(nodes)])for(const {node,parent} of list){if(node.parent!==parent)throw new Error('Actor source reparented');let p=parent;while(p&&p!==entry.root)p=p.parent;if(p!==entry.root)throw new Error('Actor anchor detached');}}
 function claims(){const result=new Map(Object.entries(card.parts).filter(([,v])=>v!=='default').map(([s])=>[s,refs[s].map(x=>x.node)]));
  for(const [owner,targets]of Object.entries(entry.rules||{}))if(card.parts[owner]==='native')result.set(`${owner}.cover`,targets.flatMap(s=>[...(refs[s]||[]),...(nodes[s]||[])].map(x=>x.node)));
  return result;
 }
 function loadCard(value,{commit}={}){
  validate();const next=validateActorPartsCard(value,entry);if(commit!==undefined&&(typeof commit!=='function'||commit.constructor.name==='AsyncFunction'))throw new TypeError('Commit must be synchronous');
  const changed=Object.keys(next.parts).filter(s=>next.parts[s]!==card.parts[s]);const oldNodes=nodes,oldCard=card,staged={},old=changed.flatMap(s=>(nodes[s]||[]).map(x=>({...x,index:x.parent.children.indexOf(x.node)}))),snapshot=visibility.snapshot();
  const visible=new Map([...Object.values(refs),...Object.values(nodes)].flat().map(x=>[x.node,x.node.visible]));
  try{
   for(const slot of changed){staged[slot]=[];if(next.parts[slot]==='native')for(const source of refs[slot]){const node=source.node.clone(true);node.name=`actor-parts.${slot}.${source.node.name}`;node.visible=visibility.baseline(source.node);const sourceTree=[],cloneTree=[];source.node.traverse(n=>sourceTree.push(n));node.traverse(n=>cloneTree.push(n));staged[slot].push({node,parent:source.parent,source:source.node,pairs:sourceTree.map((n,i)=>[n,cloneTree[i]])});source.parent.add(node);}for(const {node} of nodes[slot]||[])node.removeFromParent();}
   nodes={...nodes,...staged};card=next;visibility.sync(claims());const result=commit?.();if(result&&typeof result.then==='function')throw new TypeError('Commit returned Promise');
  }catch(error){for(const list of Object.values(staged))for(const {node} of list)detach(node);for(const x of old.sort((a,b)=>a.index-b.index)){detach(x.node);x.node.parent=x.parent;x.parent.children.splice(x.index,0,x.node);}visibility.restore(snapshot);for(const [n,v]of visible)n.visible=v;nodes=oldNodes;card=oldCard;throw error;}
  return exportCard();
 }
 function exportCard(){validate();return validateActorPartsCard(card,entry);}
 const result=Object.freeze({entry,validate,loadCard,exportCard,refresh(){validate();for(const list of Object.values(nodes))for(const item of list)for(const [source,node]of item.pairs){if(node===item.node&&source.visible!==false)node.visible=source.visible;node.position.copy(source.position);node.quaternion.copy(source.quaternion);node.scale.copy(source.scale);node.matrixAutoUpdate=source.matrixAutoUpdate;if(!source.matrixAutoUpdate)node.matrix.copy(source.matrix);if(source.material)node.material=source.material;if(node!==item.node)node.visible=source.visible;}visibility.sync(claims());},reset(options){return loadCard(defaultActorPartsCard(entry),options);},dispose(){if(disposed)return;visibility.clear();for(const list of Object.values(nodes))for(const {node}of list)detach(node);disposed=true;active.delete(entry.root);}});active.set(entry.root,result);return result;
}
