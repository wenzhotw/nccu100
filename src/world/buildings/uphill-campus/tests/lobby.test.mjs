/** 8c：以正式碰撞與幾何驗收大廳，不啟動 WebGL。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {resolve,setActiveColliders,setRoomClamp} from '../../../../core/collision.js';
import {greyboxColliders} from '../greybox.js';

export function walk(points, boxes) {
  setActiveColliders(boxes);setRoomClamp(()=>{});
  let p={x:points[0][0],z:points[0][1],y:15},push=0;
  try {
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.1);
      for(let j=1;j<=n;j++) {
        p.x+=(b[0]-a[0])/n;p.z+=(b[1]-a[1])/n;
        const x=p.x,z=p.z;resolve(p);push+=Math.hypot(p.x-x,p.z-z);
      }
    }
    return {p,push};
  } finally {setActiveColliders([]);setRoomClamp(null);}
}

test('8c 從中庭穿過兩個門洞繞開口北側到十舍',()=>{
  const points=[[20,-27.8],[26.5,-27.8],[26.5,-33.8],[35.8,-33.8],[35.8,-27.8],[56,-30]];
  const {p,push}=walk(points,greyboxColliders());
  assert.ok(push<0.5,`路線被推開 ${push}`);
  assert.ok(Math.hypot(p.x-56,p.z+30)<0.5);
});

test('8c 開口七個方向有護牆，東端可到樓梯口但不能掉入洞中',async()=>{
  const {lobbyColliders}=await import('../lobby.js');const boxes=lobbyColliders();
  for(let i=1;i<8;i++) {
    const a=i*Math.PI/4,dx=Math.cos(a),dz=Math.sin(a);
    const {p,push}=walk([[31.2+dx*5,-28.6+dz*4],[31.2,-28.6]],boxes);
    assert.ok(push>0.5,`方向 ${i} 漏擋`);
    assert.ok(Math.hypot(p.x-31.2,p.z+28.6)>1.2);
  }
  assert.ok(walk([[35.6,-28.6],[34.6,-28.6]],boxes).push<1e-6);
  const {p,push}=walk([[34.6,-28.6],[31.2,-28.6]],boxes);
  assert.ok(push>1 && p.x>33.5);
});

test('8c 屋頂與欄杆在鏡頭上方隱藏，離開恢復；地板開口能看見下層',async()=>{
  const {createGreybox}=await import('../greybox.js');const {installLobbyRoof}=await import('../lobby.js');
  const s=new THREE.Scene();s.add(createGreybox());installLobbyRoof(s);
  const roof=s.getObjectByName('九舍大廳屋頂');assert.ok(roof);
  assert.ok(Math.abs(new THREE.Box3().setFromObject(roof.getObjectByName('薄荷綠天花板')).min.y-20.5)<0.05);
  const camera=new THREE.PerspectiveCamera();
  for(const [x,z,visible] of [[31,-30,false],[10,-28,true],[25.1,-27.8,true],[37.2,-27.8,true]]) {
    camera.position.set(x,20,z);camera.updateMatrixWorld();s.onBeforeRender(null,s,camera);
    for(const n of ['九舍大廳屋頂','九舍大廳欄杆','九舍大廳欄杆描邊'])assert.equal(s.getObjectByName(n).visible,visible,n);
  }
  s.updateMatrixWorld(true);
  const hit=new THREE.Raycaster(new THREE.Vector3(31.2,16,-28.6),new THREE.Vector3(0,-1,0)).intersectObject(s,true)[0];
  assert.ok(hit&&hit.point.y<14,`開口被地表蓋住 ${hit?.point.y}`);
});

test('8c 照片室內陳設完整，八根圓柱、兩段向下踏階與通用招牌可辨識',async()=>{
  const {createLobby,lobbyColliders}=await import('../lobby.js');const g=createLobby();
  for(const n of ['服務台','紅色圓沙發','白色矮櫃','木長凳','木邊桌','飲料機','咖啡機','販賣機','桌椅','玻璃格子天窗','旋轉樓梯','玻璃隔間','公佈欄','交誼沙發'])assert.ok(g.getObjectByName(n),n);
  assert.ok(g.getObjectByName('灰色格紋邊帶'));
  const columns=[];const steps=[];const texts=[];
  g.traverse(o=>{if(o.name==='圓柱')columns.push(o);if(o.name==='弧形踏階')steps.push(o);if(o.userData.sign)texts.push(o.userData.sign.text);});
  assert.equal(columns.length,8);assert.equal(steps.length,20);
  g.updateMatrixWorld(true);
  assert.ok(Math.min(...steps.map(o=>o.position.y))<12.3);
  assert.ok(Math.max(...steps.map(o=>o.position.y))>14.7);
  for(const t of ['服務台','WELCOME to FRONT DESK','飲料','咖啡','販賣機','DORM 9','往安九'])assert.ok(texts.includes(t),t);
  assert.ok(texts.every(t=>!/Coca|TOUCH|CAFE|可口可樂/i.test(t)));
  const route=[[20,-27.8],[26.5,-27.8],[26.5,-33.8],[35.8,-33.8],[35.8,-27.8],[56,-30]];
  assert.ok(walk(route,lobbyColliders()).push<0.5);
});

test('8c 每個新增碰撞都能擋住橫穿並能沿外側通行',async()=>{
  const {lobbyColliders}=await import('../lobby.js');
  const {anjiuColliders}=await import('../anjiu-interior.js');
  for(const c of [...lobbyColliders(),...anjiuColliders()]) {
    const nx=c.sn,nz=c.cs;
    const crossed=walk([[c.cx+nx*(c.hz+1),c.cz+nz*(c.hz+1)],[c.cx-nx*(c.hz+1),c.cz-nz*(c.hz+1)]],[c]);
    assert.ok((crossed.p.x-c.cx)*nx+(crossed.p.z-c.cz)*nz>c.hz,c.name);
    const clear=c.hz+0.6;
    const a=[c.cx-c.cs*(c.hx+0.6)+nx*clear,c.cz+c.sn*(c.hx+0.6)+nz*clear];
    const b=[c.cx+c.cs*(c.hx+0.6)+nx*clear,c.cz-c.sn*(c.hx+0.6)+nz*clear];
    assert.ok(walk([a,b],[c]).push<1e-6,c.name);
  }
});

test('8c 完整歡迎橫幅位於牆框前方且字高至少三十公分',async()=>{
  const {createGreybox}=await import('../greybox.js');const g=createGreybox();
  const banner=g.getObjectByName('九舍大廳橫幅');
  assert.ok(banner.position.x<24.99,'牌面不可埋入外牆描邊或門框');
  assert.equal(banner.userData.sign?.text,'政大學生宿舍歡迎您');
  assert.ok(banner.geometry.parameters.height*52/80>=0.3);
});
