import fs from 'node:fs';import * as THREE from 'three';
import {buildTents} from '../src/systems/baozhong/tents.js';
import {resolve,setActiveColliders,setRoomClamp} from '../src/core/collision.js';
const ROOT=new URL('../src/',import.meta.url).pathname,read=p=>fs.readFileSync(ROOT+p,'utf8');
const layout=JSON.parse(fs.readFileSync(new URL('../src/systems/baozhong/layout.json',import.meta.url)));
const colliders=[],api=buildTents(layout,[],{colliders});api.setActive(true);api.group.updateMatrixWorld(true);setActiveColliders(colliders);setRoomClamp(null);const t=api.tents.get('D26');
const loop=read('core/loop.js'),start=loop.indexOf('  if(!(state.isEagle&&!state.grounded)) resolve(pos);'),end=loop.indexOf('  player.position.copy(pos);',start);const vertical=new Function('state','pos','dt','keys','dlg','groundH','AU','resolve',loop.slice(start,end));
const save=read('systems/save.js'),a=save.indexOf('function rememberSpot()'),b=save.indexOf('function saveGame()',a);const makeRemember=new Function('state','pos','groundH','indoor',`let lastSpot=null;${save.slice(a,b)};return ()=>{rememberSpot();return lastSpot;}`);
const boxes=[[-.8,.8,.7,1.3],[1.45,1.46,-1.45,1.45],[-1.45,1.45,-1.46,-1.45],[-1.46,-1.45,-1.45,1.45],...[-1.1,1.1].flatMap(x=>[-1.1,1.1].map(z=>[x-.035,x+.035,z-.035,z+.035]))];
const clearance=p=>{const q=t.group.worldToLocal(p.clone());return Math.min(...boxes.map(([x0,x1,z0,z1])=>Math.hypot(q.x-Math.max(x0,Math.min(q.x,x1)),q.z-Math.max(z0,Math.min(q.z,z1)))));};
const results=[];
for(const [x,z] of [[1.1,1.1],[.8,1],[1,1],[0,1],[0,0]]){
 const pos=new THREE.Vector3(0,3,2.5).applyMatrix4(t.group.matrixWorld),state={isEagle:true,grounded:false,started:true,busy:false,vy:0,room:null},groundH=()=>0;const remember=makeRemember(state,pos,groundH,()=>false);
 // Fly from outside to target continuously, while staying safely above the common canopy.
 for(let i=1;i<=100;i++){const p=new THREE.Vector3(x*i/100,3,2.5+(z-2.5)*i/100).applyMatrix4(t.group.matrixWorld);pos.copy(p);if(!(state.isEagle&&!state.grounded))resolve(pos);}
 const trace=[];for(let frame=0;frame<300;frame++){vertical(state,pos,1/60,{}, {hidden:true},groundH,{sfx(){}},resolve);api.update(pos,state,groundH);if(state.grounded){trace.push({frame,local:t.group.worldToLocal(pos.clone()).toArray(),penetration:Math.max(0,.4-clearance(pos))});if(trace.length===121)break;}}
 const saved=remember(),restored=new THREE.Vector3(saved.x,0,saved.z);resolve(restored);api.update(restored,{grounded:true},groundH);results.push({target:[x,z],land:trace[0],nextFrame:trace[1],after120Frames:trace.at(-1),saved,afterRestoreResolve:{local:t.group.worldToLocal(restored.clone()).toArray(),penetration:Math.max(0,.4-clearance(restored))}});
}
const recovery=[];
for(let dir=0;dir<8;dir++){const pos=new THREE.Vector3(1.2,0,1.1).applyMatrix4(t.group.matrixWorld),angle=dir*Math.PI/4,delta=new THREE.Vector3(.05*Math.cos(angle),0,.05*Math.sin(angle)).transformDirection(t.group.matrixWorld).multiplyScalar(.05);let firstClear=null;
for(let f=0;f<120;f++){pos.add(delta);resolve(pos);if(clearance(pos)>=.4-1e-6&&firstClear===null)firstClear=f+1;}recovery.push({localDirection:[Math.cos(angle),Math.sin(angle)],firstClear,finalLocal:t.group.worldToLocal(pos.clone()).toArray()});}
const flyPos=new THREE.Vector3(1.2,0,1.1).applyMatrix4(t.group.matrixWorld),flyState={isEagle:true,grounded:true,started:true,busy:false,vy:0};
for(let frame=0;frame<60;frame++)vertical(flyState,flyPos,1/60,{Space:true},{hidden:true},()=>0,{sfx(){}},resolve);
console.log(JSON.stringify({scope:'Actual extracted loop collision/vertical and rememberSpot source; actual candidate colliders and core resolver; relative flat-ground0, no browser/all-campus height import. Continuous airborne path explicitly permitted by core; xz movement interpolated, not keyboard control loop.',results,recovery,flightRecovery:{local:t.group.worldToLocal(flyPos.clone()).toArray(),grounded:flyState.grounded}},null,2));
