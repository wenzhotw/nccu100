/** 固定第一位路人同學的外觀資料，對照與候選使用相同輸入。 */
import { STUDENTS } from '../src/content/index.js';
import { addNPC, readyNpcCharacter } from '../src/actors/npc.js';
import { characterRegistry } from '../src/actors/character-registry.js';
export function createStudentStylePair(){
 const c=STUDENTS.colors[0];
 return ['baseline','candidate'].map(variant=>{
  const id=`student-style-${variant}`;
  const actor=addNPC({id,title:'普通學生造型對照',home:{x:0,z:0},
   look:{top:c[0],pants:c[1],hair:c[2],bag:c[3],hairStyle:'side',scale:1.1},
   studentStyleTrial:variant==='candidate'?'soft-v1':undefined,dialog:[{lines:['隔離造型預覽']}]
  });
  readyNpcCharacter(actor);actor.g.removeFromParent();actor.sp.visible=false;
  return {variant,actor,entry:characterRegistry.get(id)};
 });
}
export function studentStyleMetrics(root){
 const geometry=new Set(),material=new Set();let objects=0,meshes=0,triangles=0;
 root.traverse(n=>{objects++;if(n.isMesh){meshes++;geometry.add(n.geometry);triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;for(const m of Array.isArray(n.material)?n.material:[n.material])material.add(m);}});
 return {objects,meshes,triangles,geometries:geometry.size,materials:material.size};
}
