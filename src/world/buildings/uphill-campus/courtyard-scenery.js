/** 共用樹與道路路燈先在無預定地的座標建立，再搬至中庭並依材質合併。 */
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene } from '../../../core/engine.js';
import { colliders } from '../../../core/collision.js';
import { tree, FOLIAGE } from '../../vegetation.js';
import { lamp } from '../../terrain/back-road.js';
import { COURTYARD_TREES, COURTYARD_LAMPS } from './courtyard.js';
import { heightAt } from './terrain.js';

export function buildCourtyardScenery() {
  const root=new THREE.Group();root.name='九舍中庭植栽';
  const batches=new Map();
  const collect=(p,build)=>{
    const n=scene.children.length,c=colliders.length,f=FOLIAGE.length;
    build();
    const added=scene.children.slice(n);
    for(const o of added) {
      o.position.x+=p.x-1000;o.position.z+=p.z-1000;o.position.y+=heightAt(p.x,p.z);
      o.updateMatrixWorld(true);
      o.traverse(m=>{
        if(!m.isMesh)return;
        const g=m.geometry.clone().applyMatrix4(m.matrixWorld);
        const list=batches.get(m.material)??[];list.push(g);batches.set(m.material,list);
      });
      scene.remove(o);
    }
    // 落地碰撞統一由 courtyardColliders 提供，避免重複登記。
    colliders.splice(c);FOLIAGE.splice(f);
  };
  COURTYARD_TREES.forEach(p=>collect(p,()=>tree(1000,1000,p.scale)));
  COURTYARD_LAMPS.forEach(p=>collect(p,()=>lamp(1000,1000,p.z<-28?1:-1)));
  for(const [material,parts] of batches) {
    const geometry=mergeBufferGeometries(parts.map(g=>g.index?g.toNonIndexed():g));
    const mesh=new THREE.Mesh(geometry,material);root.add(mesh);parts.forEach(g=>g.dispose());
  }
  root.userData.trees=COURTYARD_TREES.length;root.userData.lamps=COURTYARD_LAMPS.length;
  scene.add(root);return root;
}

/** 共用材質的靜態網格合併，保留原具名物件供後續階段查找。 */
export function batchCourtyardScene(group, scenery) {
  const batches=new Map(), sources=[];
  for(const root of [group,scenery]) {
    root.updateMatrixWorld(true);
    root.traverse(o=>{
      if(!o.isMesh || o.isInstancedMesh || Array.isArray(o.material))return;
      const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
      // 純模型可能沒有 UV；合併時補齊，不改動有貼圖的正式座標。
      if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
      const parts=batches.get(o.material)??[];parts.push(geometry);batches.set(o.material,parts);sources.push(o);
    });
  }
  sources.forEach(o=>{o.visible=false;});
  for(const [material,parts] of batches) {
    const geometry=mergeBufferGeometries(parts.map(g=>g.index?g.toNonIndexed():g));
    const mesh=new THREE.Mesh(geometry,material);mesh.name='中庭與地形靜態合批';group.add(mesh);
    parts.forEach(g=>g.dispose());
  }
}
