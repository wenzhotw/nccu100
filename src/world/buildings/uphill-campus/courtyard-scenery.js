/** 共用樹與道路路燈先在無預定地的座標建立，再搬至中庭並依材質合併。 */
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene } from '../../../core/engine.js';
import { colliders } from '../../../core/collision.js';
import { tree, FOLIAGE } from '../../vegetation.js';
import { toon } from '../../../render/kit.js';
import { COURTYARD_TREES, COURTYARD_LAMPS, LAMP_ARM } from './courtyard.js';

const POLE = new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8), HEAD = new THREE.BoxGeometry(0.5, 0.12, 0.3), BULB = new THREE.BoxGeometry(0.36, 0.04, 0.2);
/** 短燈桿：桿高 3.6 公尺，燈頭朝車道伸出 LAMP_ARM。 */
function courtyardLamp(dir) {
  const g = new THREE.Group(); g.position.set(1000, 0, 1000); scene.add(g);
  const pole = new THREE.Mesh(POLE, toon('#9aa3a6')); pole.position.set(0, 1.8, 0); g.add(pole);
  const head = new THREE.Mesh(HEAD, toon('#c9cfd1')); head.position.set(0, 3.62, dir * LAMP_ARM); g.add(head);
  const bulb = new THREE.Mesh(BULB, toon('#fff6dc', { emissive: '#ffe6a8', emissiveIntensity: 0.6 })); bulb.position.set(0, 3.54, dir * LAMP_ARM); g.add(bulb);
}
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
  // 燈頭朝中央車道：北排往南、南排往北。
  COURTYARD_LAMPS.forEach(p=>collect(p,()=>courtyardLamp(p.z<-28?1:-1)));
  for(const [material,parts] of batches) {
    const geometry=mergeBufferGeometries(parts.map(g=>g.index?g.toNonIndexed():g));
    const mesh=new THREE.Mesh(geometry,material);root.add(mesh);parts.forEach(g=>g.dispose());
  }
  root.userData.trees=COURTYARD_TREES.length;root.userData.lamps=COURTYARD_LAMPS.length;
  scene.add(root);return root;
}

/** 共用材質的靜態網格合併，保留原具名物件供後續階段查找。 */
export function batchCourtyardScene(group, scenery) {
  const batches=new Map(), sources=[],palettes=new Map();
  for(const root of [group,scenery]) {
    root.updateMatrixWorld(true);
    root.traverseVisible(o=>{
      if(!o.isMesh || o.isInstancedMesh || o.userData.noOcc || Array.isArray(o.material))return;
      const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
      let material=o.material;
      if(!material.map&&!material.transparent&&(material.isMeshToonMaterial||material.isMeshBasicMaterial)) {
        const key=material.type+'/'+material.side;
        if(!palettes.has(key)){const p=material.clone();p.color.set('#ffffff');p.vertexColors=true;palettes.set(key,p);}
        if(!geometry.attributes.color){const a=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<a.length;i+=3)material.color.toArray(a,i);geometry.setAttribute('color',new THREE.Float32BufferAttribute(a,3));}
        material=palettes.get(key);
      }
      // 純模型可能沒有 UV；合併時補齊，不改動有貼圖的正式座標。
      if(!geometry.attributes.uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*2),2));
      const parts=batches.get(material)??[];parts.push(geometry);batches.set(material,parts);sources.push(o);
    });
  }
  sources.forEach(o=>{o.visible=false;});
  for(const [material,parts] of batches) {
    const geometry=mergeBufferGeometries(parts.map(g=>g.index?g.toNonIndexed():g));
    const mesh=new THREE.Mesh(geometry,material);mesh.name='中庭與地形靜態合批';group.add(mesh);
    parts.forEach(g=>g.dispose());
  }
}
