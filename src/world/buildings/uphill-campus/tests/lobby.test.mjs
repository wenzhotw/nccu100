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
  const {lobbyColliders,wellPoint}=await import('../lobby.js');const boxes=lobbyColliders();
  const {pointInPoly}=await import('../terrain.js');
  const opening=Array.from({length:64},(_,i)=>wellPoint(i*Math.PI/32));
  for(let i=1;i<8;i++) {
    const a=i*Math.PI/4,dx=Math.cos(a),dz=Math.sin(a);
    const {p,push}=walk([[31.2+dx*5,-28.6+dz*4],[31.2,-28.6]],boxes);
    assert.ok(push>0.5,`方向 ${i} 漏擋`);
    assert.ok(!pointInPoly(p.x,p.z,opening),'護牆必須把玩家留在實際 S 形開口外');
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
  for(const [x,y,z,visible] of [[31,17.5,-30,true],[31,20.5,-30,true],[31,25,-30,false],[10,25,-28,true],[25.1,25,-27.8,true],[37.2,25,-27.8,true]]) {
    camera.position.set(x,y,z);camera.updateMatrixWorld();s.onBeforeRender(null,s,camera);
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

test('D3 屋頂每幀重用查找結果與鏡頭向量，保留原 callback',async()=>{
  const {installLobbyRoof}=await import('../lobby.js');
  const scene=new THREE.Scene();const names=['九舍大廳屋頂','九舍大廳欄杆','九舍大廳欄杆描邊'];
  for(const name of names){const o=new THREE.Group();o.name=name;scene.add(o);}
  const counts=new Map();const get=scene.getObjectByName.bind(scene);
  scene.getObjectByName=name=>{counts.set(name,(counts.get(name)??0)+1);return get(name);};
  let previous=0;scene.onBeforeRender=()=>previous++;
  const targets=[];const camera={getWorldPosition(target){targets.push(target);return target.set(31,25,-30);}};
  installLobbyRoof(scene);
  scene.onBeforeRender(null,scene,camera);scene.onBeforeRender(null,scene,camera);
  for(const name of names)assert.equal(counts.get(name),1,name);
  assert.equal(targets[0],targets[1]);assert.equal(previous,2);
});

test('D4 S 形開口的兩段反向弧梯連續下降完整一層',async()=>{
  const {createLobby,wellPoint}=await import('../lobby.js');const g=createLobby();
  const steps=[],strips=[];g.traverse(o=>{if(o.name==='弧形踏階')steps.push(o);if(o.name==='黃色止滑條')strips.push(o);});
  const top=steps[0].position.y+steps[0].scale.y/2,bottom=steps.at(-1).position.y-steps.at(-1).scale.y/2;
  assert.ok(Math.abs(top-bottom-3)<1e-6,'踏階包絡需下降三公尺');
  for(let i=1;i<steps.length;i++) {
    const a=steps[i-1].position,b=steps[i].position;
    assert.ok(Math.hypot(b.x-a.x,b.z-a.z)<=0.45,`第 ${i} 階水平斷開`);
    assert.ok(steps[i].scale.z>=Math.hypot(b.x-a.x,b.z-a.z),'踏階進深需覆蓋相鄰中心距離');
    assert.ok(Math.abs(a.y-b.y-0.15)<1e-6,'每階連續下降');
  }
  assert.equal(strips.length,steps.length);
  for(let i=0;i<steps.length;i++)assert.ok(Math.abs(strips[i].position.y-(steps[i].position.y+0.085))<1e-6);
  let positive=0,negative=0;
  for(let i=0;i<120;i++) {
    const a=wellPoint(i*Math.PI/60),b=wellPoint((i+1)*Math.PI/60),c=wellPoint((i+2)*Math.PI/60);
    const cross=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
    if(cross>1e-5)positive++;if(cross< -1e-5)negative++;
  }
  assert.ok(positive>4&&negative>4,'開口需有兩個反向圓弧，不能是凸橢圓');
  assert.ok(Math.abs(g.getObjectByName('開口下層方磚地板').position.y-12.02)<1e-6);
});

test('D5 標示圖集格子與牌面同比例，服務台文字在窗口上方',async()=>{
  const {createLobby,signTextLayout}=await import('../lobby.js');
  const measure=(text,size)=>[...text].reduce((sum,c)=>sum+(/[　-鿿]/.test(c)?size:size*0.6),0);const g=createLobby();const atlas=g.getObjectByName('室內標示圖集');
  g.traverse(o=>{
    if(!o.userData.sign)return;
    const {width:w,height:h}=o.geometry.parameters;const cell=o.userData.sign.atlas??{w:512,h:64};
    assert.ok(Math.abs((w/h)/(cell.w/cell.h)-1)<0.05,o.name);
    if(/服務台|FRONT DESK/.test(o.userData.sign.text)) assert.ok(o.position.y-h/2>18.3,'文字需在窗口頂端上方');
    // 字高依 D9 的置中縮放計算；中文主牌 0.3 到 0.4 公尺，英文副標可較小但不小於 0.2 公尺。
    if(o.userData.sign.text==='服務台'||o.userData.sign.text==='WELCOME to FRONT DESK') {
      const glyphHeight=h*signTextLayout(o.userData.sign.text,cell,measure).size/cell.h;
      if(o.userData.sign.text==='服務台')assert.ok(glyphHeight>=0.3&&glyphHeight<=0.4,'服務台字高');
      else assert.ok(glyphHeight>=0.2,'英文副標字高');
    }
  });
  assert.ok(atlas.userData.signAtlas.every(s=>s.atlas),'圖集接線需提供每格尺寸');
});

test('D8 大廳判斷、地板與牆體共用 layout 邊界',async()=>{
  const {LOBBY}=await import('../layout.js');const {isInsideLobby,createLobby,lobbyColliders}=await import('../lobby.js');
  assert.ok(LOBBY.bounds,'大廳邊界必須集中提供');
  const original={...LOBBY.bounds};
  try {
    Object.assign(LOBBY.bounds,{x0:24.8,x1:37.5,z0:-36,z1:-23.3});
    const {x0,x1,z0,z1}=LOBBY.bounds;
    for(const [x,z,inside] of [[x0,z0,true],[x1,z1,true],[x0-0.01,z0,false],[x1+0.01,z1,false],[x0,z0-0.01,false],[x1,z1+0.01,false]])assert.equal(isInsideLobby(x,z),inside);
    const g=createLobby();g.updateMatrixWorld(true);const floor=new THREE.Box3().setFromObject(g.getObjectByName('米白方磚地板'));
    for(const [actual,expected] of [[floor.min.x,x0],[floor.max.x,x1],[floor.min.z,z0],[floor.max.z,z1]])assert.ok(Math.abs(actual-expected)<1e-5);
    const north=g.getObjectByName('北牆'),south=g.getObjectByName('南牆');
    assert.equal(north.position.z,z0);assert.equal(south.position.z,z1);assert.equal(north.scale.x,x1-x0);
    assert.equal(lobbyColliders().find(c=>c.name==='北牆').cz,z0);
    const sideWalls=[];g.traverse(o=>{if(o.name==='門側牆')sideWalls.push(o);});
    assert.ok(sideWalls.every(o=>o.position.x===x0||o.position.x===x1));
  } finally {Object.assign(LOBBY.bounds,original);}
});

test('D9 室內標示整串置中繪製並縮到格子內，兩字牌不會左右顛倒或重疊',async()=>{
  const {createLobby,signTextLayout}=await import('../lobby.js');const g=createLobby();
  // 量字替身：中文一字一個字級寬，英數約 0.6 個字級寬。
  const measure=(text,size)=>[...text].reduce((sum,c)=>sum+(/[　-鿿]/.test(c)?size:size*0.6),0);
  const signs=g.getObjectByName('室內標示圖集').userData.signAtlas;
  assert.ok(signs.some(s=>s.text==='飲料'));
  for(const {text,atlas:cell} of signs) {
    const layout=signTextLayout(text,cell,measure);
    assert.equal(layout.text,text,'整串一次繪製，保持原字序');
    assert.ok(measure(text,layout.size)<=cell.w*0.9+1e-9,`${text} 超出格子`);
    assert.ok(layout.size<=cell.h*0.72,`${text} 字太高`);
    assert.equal(layout.x,cell.x+cell.w/2);assert.equal(layout.y,cell.y+cell.h/2);
  }
});
