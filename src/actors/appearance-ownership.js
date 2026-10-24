/** 外觀寫入互斥。不同裝配器不得同時修改同一個角色，租約只由建立者釋放。 */
export function createAppearanceOwnership(){
 const leases=new Map(),owners=new Set(['wardrobe-v1','cards-preview','actor-parts']);
 return Object.freeze({
  ownerOf(id){return leases.get(id)?.owner??null;},
  acquire(id,owner){
   if(typeof id!=='string'||!id||!owners.has(owner))throw new TypeError('Invalid appearance owner');
   if(leases.has(id))throw new Error(`${id} 已由 ${leases.get(id).owner} 管理，請先在原面板還原該角色。`);
   const token=Object.freeze({owner});leases.set(id,token);let released=false;
   return Object.freeze({release(){if(released)return;released=true;if(leases.get(id)===token)leases.delete(id);}});
  },
 });
}
export const appearanceOwnership=createAppearanceOwnership();
/** 只有成功持有租約才呼叫 factory；失敗與 dispose 都釋放，其他 API 維持原引用。 */
export function ownAppearanceAdapter(ownership,id,owner,create){
 const lease=ownership.acquire(id,owner);let adapter;
 try{adapter=create();}catch(error){lease.release();throw error;}
 let disposed=false;
 return Object.freeze({...adapter,dispose(){if(disposed)return;adapter.dispose();disposed=true;lease.release();}});
}
