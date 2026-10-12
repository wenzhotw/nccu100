/**
 * 校園故事（可收集的發光水晶）。
 */
import * as THREE from 'three';
import { state } from '../core/state.js';
import { scene } from '../core/engine.js';
import { mk, toon } from '../render/kit.js';
import { IX } from '../world/layout.js';
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
crystal(-15.6,1.4,17.4,'校園故事．校名碑',['紅色花崗岩的校名碑，頂端是校徽，往下是「國立政治大學」六個金字。','門牌是指南路二段64號，很多人的政大生活從這裡開始。']);
crystal(-45,1.45,-158,'校園故事．醉夢溪（指南溪）',['早年景美溪一漲水，醉夢溪的水排不出去，就倒灌進校園。','1980年代河道截彎取直，淹水少了，溪也換了模樣。']);
crystal(IX,2.5,-20,'校園故事．四維堂',['舞台上方寫著「親愛精誠」，是政大的校訓。','老照片裡，這裡曾經整排坐滿了埋頭應考的考生。']);
state.found=0; state.dogTalked=false;

export { crystals };
