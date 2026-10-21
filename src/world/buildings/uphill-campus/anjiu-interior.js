/** IMG_9010、9016、9017：安九旋轉樓梯下端與短走廊，不延伸至食堂。 */
import * as THREE from 'three';
import {lobbyBox,lobbyColors,lobbyOBB} from './lobby.js';

export const ANJIU={id:'anjiu',name:'安九',
  entrance:{x:34.6,z:-28.6,r:1.6,room:'uphill-campus',label:'走下旋轉樓梯'},
  returnTo:{x:35.6,z:-28.6,face:-Math.PI/2,room:'uphill-campus'},
  spawn:{x:0,z:1.8,yaw:Math.PI,face:0,pitch:0.22},
  exit:{x:0,z:0,r:1.5,label:'走上旋轉樓梯'},
  bounds:{x0:-3.5,x1:3.5,z0:-1,z1:7},
  heightAt:()=>0,background:'#d5e3d4',
  camera:{x0:-8,x1:8,z0:-8,z1:12,ceil:5.2,maxDist:7},miniSub:'旋轉樓梯通往九舍大廳'};

const props=[['木雕擺飾',-2.3,4,0.6,0.6],['藍色椅子',2.5,3.6,0.7,0.7],['藍色椅子',2.5,4.6,0.7,0.7]];
export function anjiuColliders() {
  return props.map(([n,x,z,w,d])=>lobbyOBB(n,x,z,w,d));
}
export function createAnjiu() {
  const g=new THREE.Group();g.name='安九樓梯下端';
  lobbyBox(g,'安九方磚走廊',0,-0.03,3,8,0.06,9,lobbyColors.ivory,0);
  for(const x of [-4,4])lobbyBox(g,'安九薄荷綠牆',x,2.75,3,0.3,5.5,9,lobbyColors.mint,0.04);
  for(const z of [-1.5,7.5])lobbyBox(g,'安九走廊端牆',0,2.75,z,8,5.5,0.3,lobbyColors.mint,0.04);
  const stair=new THREE.Group();stair.name='旋轉樓梯下端';g.add(stair);
  for(let i=0;i<10;i++) {
    const t=Math.PI+i*Math.PI/18,x=Math.sin(t)*1.6,z=0.9+Math.cos(t)*1.6;
    const step=lobbyBox(stair,'弧形踏階',x,0.15+i*0.3,z,1.2,0.3,0.35,lobbyColors.ivory,0.01);step.rotation.y=t;
    const strip=lobbyBox(stair,'黃色止滑條',x,0.305+i*0.3,z+0.13,1.15,0.02,0.05,lobbyColors.yellow,0);strip.rotation.y=t;
  }
  for(const [n,x,z] of props) {
    if(n==='木雕擺飾') {
      lobbyBox(g,'木雕基座',x,0.2,z,0.8,0.4,0.8,lobbyColors.wood,0.02);
      const sculpture=lobbyBox(g,n,x,0.95,z,0.35,1.1,0.35,lobbyColors.wood,0.02);sculpture.rotation.y=Math.PI/4;
    } else {
      lobbyBox(g,n,x,0.46,z,0.7,0.12,0.7,lobbyColors.blue,0.02);
      lobbyBox(g,'藍椅靠背',x+0.3,0.8,z,0.1,0.6,0.7,lobbyColors.blue,0.02);
      for(const dx of [-0.25,0.25])lobbyBox(g,'藍椅椅腳',x+dx,0.22,z,0.06,0.44,0.6,lobbyColors.grey,0.015);
    }
  }
  return g;
}
