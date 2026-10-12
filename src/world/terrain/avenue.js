/**
 * 大道上的校旗燈桿、短柱與校園導覽圖。
 */
import * as THREE from 'three';
import { basic, block, canvasTex, mk, plane, toon } from '../../render/kit.js';
import { boxC } from '../../core/collision.js';
import { bdZ, swZ } from '../layout.js';
import { bannerPole, bollard } from '../props.js';
import { FZ } from './fountain.js';

const LAMP=new THREE.CylinderGeometry(0.07,0.09,3.6,6);
const lampHead=toon('#fff3cf',{emissive:'#ffe3a0',emissiveIntensity:0.7});
[-4,-20,-44,-56].forEach(z=>[-6.8,6.8].forEach(x=>bannerPole(x,z,0)));
[-6.5,6.5].forEach(x=>bannerPole(x,-73.5,0));
[-6.6,6.6].forEach(x=>{ for(let z=-1;z>-60;z-=3.5){ if(Math.abs(z-bdZ(x))<3.2||Math.abs(z-FZ)<11||Math.abs(z-swZ(x))<5.6) continue; if([-4,-20,-44,-56].some(q=>Math.abs(q-z)<1)) continue; bollard(x,z); } });
{ const mt=canvasTex(256,160,(g,w,h)=>{ g.fillStyle='#2f3a3a'; g.fillRect(0,0,w,h); g.fillStyle='#dfe6e2'; g.font='700 22px "Noto Sans TC",sans-serif'; g.fillText('校園導覽圖',14,30); g.strokeStyle='#9fb5ad'; g.lineWidth=3; g.strokeRect(14,44,w-28,h-58); g.fillStyle='#6f8f86'; g.fillRect(40,70,60,40); g.fillRect(130,60,80,30); g.fillRect(130,100,40,30); });
  const x=-9.6, z=-21.5; [-0.9,0.9].forEach(dz=>mk(new THREE.CylinderGeometry(0.07,0.07,1.8,6),toon('#2f3a3a'),x,0.9,z+dz,{out:0.015}));
  block(x,1.45,z,0.12,1.2,2.2,'#2f3a3a',0.02); plane(2.0,1.1,basic({map:mt}),x+0.07,1.45,z,0,Math.PI/2); boxC(x-0.2,x+0.2,z-1.1,z+1.1); }
