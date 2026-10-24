/** 集中多持有者遮藏。只追蹤可觀測的外部不同值，不猜測重複寫入 false 的意圖。 */
export function createVisibilityRules(){
 let leases=new Map();
 function sync(claims){
  const desired=new Map();
  for(const [owner,nodes] of claims){for(const node of nodes){if(!node?.isObject3D)throw new TypeError('Invalid visibility target');if(!desired.has(node))desired.set(node,new Set());desired.get(node).add(owner);}}
  for(const [node,lease] of leases){
   if(node.visible!==false)lease.before=node.visible;
   if(!desired.has(node)){if(node.visible===false)node.visible=lease.before;leases.delete(node);}
  }
  for(const [node,owners] of desired){if(!leases.has(node))leases.set(node,{before:node.visible,owners});else leases.get(node).owners=owners;node.visible=false;}
 }
 return Object.freeze({sync,clear:()=>sync(new Map()),
  baseline:node=>node.visible!==false?node.visible:(leases.get(node)?.before??node.visible),
  snapshot:()=>new Map([...leases].map(([node,l])=>[node,{before:l.before,owners:new Set(l.owners),visible:node.visible}])),
  restore(snapshot){
   for(const [node,l] of leases)if(!snapshot.has(node))node.visible=l.before;
   leases=new Map([...snapshot].map(([node,l])=>{node.visible=l.visible;return [node,{before:l.before,owners:new Set(l.owners)}];}));
  },
 });
}
