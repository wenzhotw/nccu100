/**
 * 校園故事（可收集的發光水晶）。
 */
import * as THREE from 'three';
import { state } from '../core/state.js';
import { scene } from '../core/engine.js';
import { mk, toon } from '../render/kit.js';
import { IX } from '../world/layout.js';
import { STORIES } from '../content/index.js';
import { glowTex } from '../world/environment/particles.js';
import { HC } from '../actors/player.js';

/* ---------- 校園故事 ---------- */
const crystals=[];
const CRY=new THREE.OctahedronGeometry(0.34,0);
function crystal(x,y,z,name,lines){
  const g=new THREE.Group(); g.position.set(x,y,z); scene.add(g);
  const m=mk(CRY,toon('#93eedf',{emissive:'#36b8a8',emissiveIntensity:0.55}),0,0,0,{parent:g,out:0.03}); m.scale.y=1.45;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:'#9ff5e6',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})); s.scale.set(2.4,2.4,1); g.add(s);
  const ring=mk(new THREE.TorusGeometry(0.55,0.025,6,32),toon(HC.gold,{emissive:'#a8812f',emissiveIntensity:0.5}),0,0,0,{parent:g,cast:false}); ring.rotation.x=Math.PI/2;
  const c={g,m,ring,base:y,name,lines,got:false}; crystals.push(c); return c;
}
// 故事內容在 src/content/stories.json
STORIES.forEach(st=>{ const c=crystal(st.x+(st.inside?IX:0),st.y,st.z,st.title,st.lines); c.id=st.id; c.mapAt=st.mapAt||{x:st.x,z:st.z}; });
state.found=0; state.dogTalked=false;

export { crystals };
