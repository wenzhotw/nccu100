/** 8c 與 2026-10-22 審查：以正式碰撞與幾何驗收大廳，不啟動 WebGL。數值一律從 LOBBY 取得。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {resolve,setActiveColliders,setRoomClamp} from '../../../../core/collision.js';
import {greyboxColliders} from '../greybox.js';
import {LOBBY} from '../layout.js';

const {cx:WX,cz:WZ,r:WR}=LOBBY.well,B=LOBBY.bounds,CEIL=LOBBY.base+LOBBY.ceiling;
const [west,east]=LOBBY.doors;
/** 從中庭進西門、沿開口北側繞過、出東門再往十舍。 */
const ROUTE=[[20,west.z],[west.x+1,west.z],[west.x+1,B.z0+2.4],[east.x-1,B.z0+2.4],[east.x-1,east.z],[56,-30]];

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

test('大廳以門洞軸線對稱擴大、旋轉樓梯在正中央，仍在建物輪廓內',async()=>{
  const {LAYOUT}=await import('../layout.js');const {pointInPoly}=await import('../terrain.js');
  const outline=LAYOUT.buildings.find(b=>b.osm===LOBBY.osm).pts;
  assert.ok(B.z1-B.z0>=15 && B.x1-B.x0>=11,'大廳要比原本的 11.9×11.9 公尺大');
  // 旋轉樓梯開口在大廳正中央，東西兩門在開口的軸線上。
  assert.ok(Math.abs(WX-(B.x0+B.x1)/2)<0.05&&Math.abs(WZ-(B.z0+B.z1)/2)<0.05,`開口不在大廳正中央：${WX},${WZ}`);
  for(const d of LOBBY.doors)assert.ok(Math.abs(d.z-WZ)<0.05,'門洞不在開口軸線上');
  for(const [x,z] of [[B.x0+0.2,B.z0+0.2],[B.x1-0.2,B.z0+0.2],[B.x1-0.2,B.z1-0.2],[B.x0+0.2,B.z1-0.2]])
    assert.ok(pointInPoly(x,z,outline),`大廳角落超出建物輪廓：${x},${z}`);
  assert.equal(LOBBY.door.x,west.x);assert.equal(LOBBY.door.z,west.z);
  assert.ok(LOBBY.ceiling>=3.6&&LOBBY.ceiling<=4.5,'天花板接近一層樓的實景比例');
});

test('從中庭穿過兩個門洞、繞開口北側到十舍不被擋',()=>{
  const {p,push}=walk(ROUTE,greyboxColliders());
  assert.ok(push<0.5,`路線被推開 ${push}`);
  assert.ok(Math.hypot(p.x-56,p.z+30)<0.5);
});

test('開口是圓形：一圈矮牆都在同一半徑上，東側留樓梯口缺口',async()=>{
  const {lobbyColliders,wellPoint}=await import('../lobby.js');
  const ring=lobbyColliders().filter(c=>c.name==='開口矮牆');
  assert.ok(ring.length>=40,'矮牆分段太少，看起來不圓');
  for(const c of ring) assert.ok(Math.abs(Math.hypot(c.cx-WX,c.cz-WZ)-WR)<0.05,`矮牆不在圓上：${c.cx},${c.cz}`);
  for(let i=0;i<32;i++) {const [x,z]=wellPoint(i*Math.PI/16);assert.ok(Math.abs(Math.hypot(x-WX,z-WZ)-WR)<1e-9);}
  // 東側（角度 0）沒有矮牆，其他方向都有。
  const angles=ring.map(c=>Math.atan2(c.cz-WZ,c.cx-WX));
  assert.ok(!angles.some(a=>Math.abs(a)<0.2),'樓梯口被矮牆擋住');
  assert.ok(angles.some(a=>Math.abs(a-Math.PI/2)<0.15)&&angles.some(a=>Math.abs(Math.abs(a)-Math.PI)<0.15));
});

test('開口七個方向擋住，東側樓梯口走得到但不會掉進開口',async()=>{
  const {lobbyColliders}=await import('../lobby.js');const boxes=lobbyColliders();
  for(let i=1;i<8;i++) {
    const a=i*Math.PI/4,dx=Math.cos(a),dz=Math.sin(a);
    const {p,push}=walk([[WX+dx*(WR+0.9),WZ+dz*(WR+0.9)],[WX,WZ]],boxes);
    assert.ok(push>0.5,`方向 ${i} 漏擋`);
    assert.ok(Math.hypot(p.x-WX,p.z-WZ)>WR,'護牆要把玩家留在圓形開口外');
  }
  assert.ok(walk([[LOBBY.stairTop.x+1.2,LOBBY.stairTop.z],[LOBBY.stairTop.x,LOBBY.stairTop.z]],boxes).push<1e-6,'走不到樓梯口');
  const {p}=walk([[LOBBY.stairTop.x,LOBBY.stairTop.z],[WX,WZ]],boxes);
  assert.ok(Math.hypot(p.x-WX,p.z-WZ)>WR-0.5,'從樓梯口直接掉進開口');
});

test('旋轉樓梯在圓形開口內繞中柱往下一整層，每階連續下降且不超出開口',async()=>{
  const {createLobby,spiralSteps}=await import('../lobby.js');const g=createLobby();
  const steps=spiralSteps();
  assert.equal(steps.length,20);
  assert.ok(Math.abs(steps[0].top-(LOBBY.base-0.15))<1e-9&&Math.abs(steps.at(-1).top-12)<1e-9,'從大廳樓梯口下到 12 公尺');
  let turned=0;
  for(let i=1;i<steps.length;i++) {
    assert.ok(Math.abs(steps[i-1].top-steps[i].top-0.15)<1e-9,'每階下降 0.15 公尺');
    turned+=Math.abs(steps[i].a-steps[i-1].a);
  }
  assert.ok(turned>=Math.PI*2,'樓梯要繞中柱至少一整圈，平面看起來是螺旋');
  for(const s of steps) {
    // 踏階外緣不超出開口半徑，內緣接中柱。
    const r=Math.hypot(s.x-WX,s.z-WZ);
    assert.ok(r+s.length/2<=WR+1e-9&&r-s.length/2>=0.3,`第 ${s.k} 階超出開口或懸空`);
  }
  assert.ok(g.getObjectByName('旋轉樓梯中柱'));
  const lower=g.getObjectByName('開口下層方磚地板');assert.ok(Math.abs(lower.position.y-12.02)<1e-6);
  assert.ok(Math.hypot(lower.position.x-WX,lower.position.z-WZ)<1e-9);
});

test('屋頂與欄杆只在鏡頭高於天花板且在大廳上方時隱藏；開口看得到下層',async()=>{
  const {createGreybox}=await import('../greybox.js');const {installLobbyRoof}=await import('../lobby.js');
  const s=new THREE.Scene();s.add(createGreybox());installLobbyRoof(s);
  const roof=s.getObjectByName('九舍大廳屋頂');assert.ok(roof);
  assert.ok(Math.abs(new THREE.Box3().setFromObject(roof.getObjectByName('薄荷綠天花板')).min.y-CEIL)<0.05);
  const camera=new THREE.PerspectiveCamera();
  for(const [x,y,z,visible] of [[WX,LOBBY.base+2.5,B.z0+3,true],[WX,CEIL-0.1,B.z0+3,true],[WX,CEIL+6,B.z0+3,false],[10,25,-28,true],[B.x0-0.1,25,west.z,true],[B.x1+0.1,25,east.z,true]]) {
    camera.position.set(x,y,z);camera.updateMatrixWorld();s.onBeforeRender(null,s,camera);
    for(const n of ['九舍大廳屋頂','九舍大廳欄杆','九舍大廳欄杆描邊'])assert.equal(s.getObjectByName(n).visible,visible,`${n} ${x},${y},${z}`);
  }
  s.updateMatrixWorld(true);
  const hit=new THREE.Raycaster(new THREE.Vector3(WX+1.5,16,WZ+0.6),new THREE.Vector3(0,-1,0)).intersectObject(s,true)[0];
  assert.ok(hit&&hit.point.y<15,`開口被地表蓋住 ${hit?.point.y}`);
});

test('照片室內陳設齊全、比例合理，通用招牌不含真實品牌',async()=>{
  const {createLobby,lobbyColliders}=await import('../lobby.js');const g=createLobby();
  for(const n of ['服務台','紅色圓沙發','白色矮櫃','木長凳','木邊桌','飲料機','咖啡機','販賣機','桌椅','玻璃格子天窗','旋轉樓梯','玻璃隔間','公佈欄','交誼沙發'])assert.ok(g.getObjectByName(n),n);
  assert.ok(g.getObjectByName('灰色格紋邊帶'));
  const columns=[],texts=[];
  g.traverse(o=>{if(o.name==='圓柱')columns.push(o);if(o.userData.sign)texts.push(o.userData.sign.text);});
  assert.equal(columns.length,8);
  for(const c of columns) assert.ok(Math.hypot(c.position.x-WX,c.position.z-WZ)>WR+0.5,'圓柱離開口太近');
  // 以角色身高 1.5 公尺檢查：販賣機約 1.85、服務台 1.1、沙發坐高 0.45，門高 2.5。
  for(const [n,lo,hi] of [['飲料機',1.6,2.0],['服務台',0.9,1.2],['紅色圓沙發',0.35,0.6]]) {
    const b=new THREE.Box3().setFromObject(g.getObjectByName(n)),h=b.max.y-b.min.y;
    assert.ok(h>=lo&&h<=hi+0.1,`${n} 高 ${h.toFixed(2)} 不合比例`);
  }
  for(const t of ['服務台','WELCOME to FRONT DESK','飲料','咖啡','販賣機','DORM 9','往安九'])assert.ok(texts.includes(t),t);
  assert.ok(texts.every(t=>!/Coca|TOUCH|CAFE|可口可樂/i.test(t)));
  // 陳設都在大廳內，且不壓在開口與門洞通道上。
  for(const c of lobbyColliders().filter(c=>!/牆|矮牆|護欄/.test(c.name))) {
    assert.ok(c.cx>B.x0&&c.cx<B.x1&&c.cz>B.z0&&c.cz<B.z1,`${c.name} 在大廳外`);
    assert.ok(Math.hypot(c.cx-WX,c.cz-WZ)>WR+0.3,`${c.name} 壓在開口上`);
  }
  assert.ok(walk(ROUTE,lobbyColliders()).push<0.5);
});

test('每個大廳與安九碰撞都能擋住橫穿並能沿外側通行',async()=>{
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

test('完整歡迎橫幅位於門洞上方、屋頂下方，字高至少三十公分',async()=>{
  const {createGreybox}=await import('../greybox.js');const g=createGreybox();
  const banner=g.getObjectByName('九舍大廳橫幅');
  assert.ok(banner.position.x<LOBBY.door.x-0.2,'牌面不可埋入外牆或門框');
  assert.ok(banner.position.y>LOBBY.base+2.5&&banner.position.y<CEIL,'橫幅要在門洞上方、屋頂下方');
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
  const targets=[];const camera={getWorldPosition(target){targets.push(target);return target.set(WX,CEIL+6,WZ);}};
  installLobbyRoof(scene);
  scene.onBeforeRender(null,scene,camera);scene.onBeforeRender(null,scene,camera);
  for(const name of names)assert.equal(counts.get(name),1,name);
  assert.equal(targets[0],targets[1]);assert.equal(previous,2);
});

test('D5 標示圖集格子與牌面同比例，服務台文字在窗口上方',async()=>{
  const {createLobby,signTextLayout}=await import('../lobby.js');
  const measure=(text,size)=>[...text].reduce((sum,c)=>sum+(/[　-鿿]/.test(c)?size:size*0.6),0);const g=createLobby();const atlas=g.getObjectByName('室內標示圖集');
  g.traverse(o=>{
    if(!o.userData.sign)return;
    const {width:w,height:h}=o.geometry.parameters;const cell=o.userData.sign.atlas??{w:512,h:64};
    assert.ok(Math.abs((w/h)/(cell.w/cell.h)-1)<0.05,o.name);
    if(/服務台|FRONT DESK/.test(o.userData.sign.text)) assert.ok(o.position.y-h/2>LOBBY.base+2.3&&o.position.y+h/2<CEIL,'文字在服務台窗口上方、天花板下方');
    if(o.userData.sign.text==='服務台'||o.userData.sign.text==='WELCOME to FRONT DESK') {
      const glyphHeight=h*signTextLayout(o.userData.sign.text,cell,measure).size/cell.h;
      if(o.userData.sign.text==='服務台')assert.ok(glyphHeight>=0.25&&glyphHeight<=0.4,'服務台字高');
      else assert.ok(glyphHeight>=0.15,'英文副標字高');
    }
  });
  assert.ok(atlas.userData.signAtlas.every(s=>s.atlas),'圖集接線需提供每格尺寸');
});

test('D8 大廳判斷、地板與牆體共用 layout 邊界',async()=>{
  const {isInsideLobby,createLobby,lobbyColliders}=await import('../lobby.js');
  const {x0,x1,z0,z1}=LOBBY.bounds;
  for(const [x,z,inside] of [[x0,z0,true],[x1,z1,true],[x0-0.01,z0,false],[x1+0.01,z1,false],[x0,z0-0.01,false],[x1,z1+0.01,false]])assert.equal(isInsideLobby(x,z),inside);
  const g=createLobby();g.updateMatrixWorld(true);const floor=new THREE.Box3().setFromObject(g.getObjectByName('米白方磚地板'));
  for(const [actual,expected] of [[floor.min.x,x0],[floor.max.x,x1],[floor.min.z,z0],[floor.max.z,z1]])assert.ok(Math.abs(actual-expected)<1e-5);
  const north=g.getObjectByName('北牆'),south=g.getObjectByName('南牆');
  assert.equal(north.position.z,z0);assert.equal(south.position.z,z1);assert.equal(north.scale.x,x1-x0);
  assert.equal(lobbyColliders().find(c=>c.name==='北牆').cz,z0);
  const sideWalls=[];g.traverse(o=>{if(o.name==='門側牆')sideWalls.push(o);});
  assert.ok(sideWalls.every(o=>o.position.x===x0||o.position.x===x1));
});

test('D9 室內標示整串置中繪製並縮到格子內，兩字牌不會左右顛倒或重疊',async()=>{
  const {createLobby,signTextLayout}=await import('../lobby.js');const g=createLobby();
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

test('旋轉樓梯光影：天窗光由上往下變暗，踏面比踢面亮，下層地板有天窗光斑與光柱',async()=>{
  const {createLobby,stairShade}=await import('../lobby.js');const g=createLobby();
  const lum=c=>0.2126*c.r+0.7152*c.g+0.0722*c.b;
  // 由上往下每階的踏面亮度遞減，踢面（側邊）一律比同階踏面暗。
  let previous=Infinity;
  for(let k=0;k<20;k++) {
    const {tread,riser}=stairShade(k);
    assert.ok(lum(tread)<previous+1e-9,`第 ${k} 階踏面沒有比上一階暗`);
    assert.ok(lum(riser)<lum(tread),`第 ${k} 階踢面不比踏面暗`);
    previous=lum(tread);
  }
  assert.ok(lum(stairShade(0).tread)-lum(stairShade(19).tread)>0.15,'上下亮度差太小，看不出光影');
  // 開口內壁頂部亮、底部暗（頂點色）。
  const shaft=g.getObjectByName('開口內壁');assert.ok(shaft.geometry.attributes.color&&shaft.material.vertexColors);
  const p=shaft.geometry.attributes.position,c=shaft.geometry.attributes.color;let top=0,bottom=1;
  for(let i=0;i<p.count;i++){const l=0.2126*c.getX(i)+0.7152*c.getY(i)+0.0722*c.getZ(i);if(p.getY(i)>0)top=Math.max(top,l);else bottom=Math.min(bottom,l);}
  assert.ok(top-bottom>0.2,'內壁沒有上亮下暗');
  const beam=g.getObjectByName('天窗光柱');assert.ok(beam&&beam.material.transparent&&beam.material.opacity<=0.2,'缺少半透明天窗光柱');
  const pool=g.getObjectByName('開口下層方磚地板');assert.ok(pool.geometry.attributes.color,'下層地板缺少天窗光斑');
});
