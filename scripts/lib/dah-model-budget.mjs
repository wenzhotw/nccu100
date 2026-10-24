/** 純模型快速預警；這不是完整幀統計或手機幀率判定。 */
export function assertDahModelBudget(root){
 let meshes=0,triangles=0;
 root.traverseVisible(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3*(o.isInstancedMesh?o.count:1);}});
 if(triangles>300000)throw new Error('達賢模型三角形預算超標：'+triangles+' > 300000');
 if(meshes>500)throw new Error('達賢模型可見物件預算超標：'+meshes+' > 500');
 return{meshes,triangles};
}
