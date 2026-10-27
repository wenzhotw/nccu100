/** 安九食堂室內：依照片 9052 到 9067 與規劃負責人 2026-10-28 的平面圖修正。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';

/** 沿折線每 0.1 公尺走一步，回傳終點與累計被推開的距離。 */
async function walk(path,colliders) {
  const {resolve,setActiveColliders,setRoomClamp}=await import('../../../../core/collision.js');
  setActiveColliders(colliders);setRoomClamp(()=>{});
  try {
    const p={x:path[0][0],z:path[0][1],y:0};let push=0;
    for(let i=1;i<path.length;i++) {
      const [x,z]=path[i],n=Math.ceil(Math.hypot(x-p.x,z-p.z)/0.1),dx=(x-p.x)/n,dz=(z-p.z)/n;
      for(let k=0;k<n;k++){p.x+=dx;p.z+=dz;const bx=p.x,bz=p.z;resolve(p);push+=Math.hypot(p.x-bx,p.z-bz);}
    }
    return {p,push};
  } finally {setActiveColliders([]);setRoomClamp(null);}
}

test('8c 安九入口與返回點在大廳，出生與返回點不在碰撞裡',async()=>{
  const {ANJIU,anjiuColliders,createAnjiu}=await import('../anjiu-interior.js');
  const {greyboxColliders}=await import('../greybox.js');
  const {resolve,setActiveColliders,setRoomClamp}=await import('../../../../core/collision.js');
  assert.equal(ANJIU.id,'anjiu');assert.equal(ANJIU.entrance.room,'uphill-campus');
  assert.equal(ANJIU.entrance.label,'走下旋轉樓梯');assert.equal(ANJIU.exit.label,'走上旋轉樓梯');
  assert.equal(ANJIU.returnRoom,'uphill-campus');
  assert.ok(Math.hypot(ANJIU.returnTo.x-ANJIU.entrance.x,ANJIU.returnTo.z-ANJIU.entrance.z)>=ANJIU.entrance.r+0.5,'返回後應離開下樓互動範圍至少半公尺');
  assert.ok(Math.hypot(ANJIU.spawn.x-ANJIU.exit.x,ANJIU.spawn.z-ANJIU.exit.z)>=ANJIU.exit.r+0.3,'下樓後應離開上樓互動範圍');
  const {LOBBY}=await import('../layout.js');
  assert.deepEqual([ANJIU.entrance.x,ANJIU.entrance.z],[LOBBY.stairTop.x,LOBBY.stairTop.z]);
  const model=createAnjiu();
  for(const name of ['旋轉樓梯下端','福利社','玻璃隔間','分隔門','正門','城市壁畫','布幔','回收區'])assert.ok(model.getObjectByName(name),name);
  const {x0,x1,z0,z1}=ANJIU.bounds,stair=new THREE.Box3().setFromObject(model.getObjectByName('旋轉樓梯下端'));
  assert.ok(stair.min.x>=x0&&stair.max.x<=x1&&stair.min.z>=z0&&stair.max.z<=z1,'樓梯要在房間範圍內');
  for(const [s,boxes] of [[ANJIU.spawn,anjiuColliders()],[ANJIU.returnTo,greyboxColliders()]]) {
    const p={...s,y:15};setActiveColliders(boxes);setRoomClamp(()=>{});
    try{resolve(p);assert.ok(Math.hypot(p.x-s.x,p.z-s.z)<1e-6);}finally{setActiveColliders([]);setRoomClamp(null);}
  }
});

test('8c gameplay 跨房間入口與返回，舊入口未填 room 仍屬山下',()=>{
  execFileSync(process.execPath,['--input-type=module','-e',`
    import assert from 'node:assert/strict';import * as THREE from 'three';import {registerHooks} from 'node:module';
    globalThis.__roomTestScene=new THREE.Scene();globalThis.__roomTestPlayer=new THREE.Object3D();
    const stubs={
      'core/engine.js':'export const scene=globalThis.__roomTestScene;',
      'actors/player.js':'export const player=globalThis.__roomTestPlayer;export const shadowBlob=player.clone();',
      'systems/audio.js':'export const AU={sfx(){}};',
      'core/dom.js':'export const $=()=>({hidden:true,querySelector:()=>({})});',
      'actors/pangolin.js':'export const bubble={};',
      'systems/stories.js':'export const crystals=[];',
      'ui/dialog.js':'export const dlg={hidden:true};export const openDialog=()=>{};export const toast=()=>{};',
      'content/index.js':'export const DIALOGS={};export const fill=()=>{};export const pickDialog=()=>{};'
    };
    registerHooks({resolve(s,c,next){const full=s.startsWith('.')?new URL(s,c.parentURL).href:s;for(const [suffix,src] of Object.entries(stubs))if(full.endsWith(suffix))return {url:'data:text/javascript,'+encodeURIComponent(src),shortCircuit:true};return next(s,c);}});
    const {registerRoom,current}=await import('./src/core/rooms.js');
    const {ANJIU}=await import('./src/world/buildings/uphill-campus/anjiu-interior.js');
    registerRoom({id:'uphill-campus',name:'山上',spawn:{x:0,z:0},heightAt:()=>15,entrance:{x:32.2,z:-88.5},exit:{x:0,z:0},returnTo:{x:31,z:-88.5}});
    registerRoom({...ANJIU});
    const {state}=await import('./src/core/state.js');const {late}=await import('./src/core/late.js');
    late.iris=(closed,ms,done)=>done();globalThis.setTimeout=fn=>{fn();return 0;};
    const game=await import('./src/core/gameplay.js');
    assert.equal(game.spotById('uphill-campus-enter').room,null);
    assert.equal(game.spotById('anjiu-enter').room,'uphill-campus');
    game.enterRoom('uphill-campus');assert.equal(state.room,'uphill-campus');assert.equal(game.pos.y,15);
    game.spotById('anjiu-enter').fn();assert.equal(state.room,'anjiu');assert.equal(game.pos.y,0);
    game.exitRoom();assert.equal(state.room,'uphill-campus');assert.deepEqual([game.pos.x,game.pos.y,game.pos.z],[ANJIU.returnTo.x,15,ANJIU.returnTo.z]);
    assert.equal(globalThis.__roomTestPlayer.parent, (await import('./src/core/rooms.js')).rooms['uphill-campus'].scene);
    game.exitRoom();assert.equal(state.room,null);assert.deepEqual([game.pos.x,game.pos.z],[31,-88.5]);
  `],{cwd:process.cwd(),stdio:'pipe',timeout:20000});
});

test('平面：正門偏西，直走穿過分隔門，出門左手邊是福利社門，門面與店家平行',async()=>{
  const {PLAN,anjiuColliders}=await import('../anjiu-interior.js');
  const {hall,mainDoor,divider,shop,stalls}=PLAN;
  assert.ok(mainDoor.x<(hall.x0+hall.x1)/2-3,'正門要偏向西側');
  assert.ok(mainDoor.x>divider.x0+0.5&&mainDoor.x<divider.x1-0.5,'正門與分隔門在同一條直線上');
  assert.ok(shop.frontX<=divider.x0+0.01,'福利社在分隔門西側，走出去是左手邊');
  assert.ok(shop.door.z1<=0&&shop.door.z1>=-0.8&&shop.door.z0>=-3,'福利社門緊鄰分隔門');
  for(const s of stalls)assert.equal(typeof s.frontX,'number','店家門面是南北向直線，與福利社門面平行');
  const {push,p}=await walk([[mainDoor.x,hall.z1-1],[mainDoor.x,-1.5]],anjiuColliders());
  assert.ok(push<0.05,`從正門直走到分隔門外不能被擋，推開 ${push.toFixed(2)}`);
  assert.ok(p.z<-1.4);
});

test('平面：玻璃隔間除了分隔門都擋住，旋轉樓梯在隔間正北方並對齊座位區',async()=>{
  const {PLAN,anjiuColliders}=await import('../anjiu-interior.js');
  const {p}=await walk([[8,3],[8,-2]],anjiuColliders());
  assert.ok(p.z>-0.1,'玻璃隔間要擋住');
  assert.equal(PLAN.north.x1,PLAN.hall.x1,'北區東側直接是牆，不再往東延伸');
  assert.equal(PLAN.north.x0,PLAN.shop.frontX,'左上牆面與福利社門面在同一直線');
  assert.ok(PLAN.stair.cx>PLAN.dining.x0&&PLAN.stair.cx<PLAN.dining.x1,'樓梯與座位區對齊');
  assert.ok(PLAN.stair.cz+PLAN.stair.r>-2.5,'樓梯貼近玻璃隔間，隔著玻璃看得到');
  assert.ok(PLAN.dishReturn.z0>PLAN.hall.z0+5&&PLAN.dishReturn.z1<PLAN.hall.z1-10,'回收區在東牆中段');
});

test('桌子方向：綠椅長桌與用餐桌南北向，高腳桌北牆南北向、樓梯東側四張東西向',async()=>{
  const {createAnjiu,PLAN}=await import('../anjiu-interior.js');
  const by={};createAnjiu().traverse(o=>{if(['綠椅長桌','用餐桌','北牆高腳桌','東側高腳桌'].includes(o.name))(by[o.name]??=[]).push(o);});
  for(const n of ['綠椅長桌','用餐桌','北牆高腳桌'])for(const o of by[n]??[])assert.ok(o.scale.z>o.scale.x,n+'要南北向');
  assert.equal(by['東側高腳桌']?.length,4);
  for(const o of by['東側高腳桌'])assert.ok(o.scale.x>o.scale.z&&o.position.x>PLAN.stair.cx,'東側高腳桌東西向');
  assert.ok((by['綠椅長桌']?.length??0)>=4);assert.ok((by['北牆高腳桌']?.length??0)>=4);
});

test('用餐區桌椅至少三排乘六列',async()=>{
  const {createAnjiu}=await import('../anjiu-interior.js');
  const tables=[];createAnjiu().traverse(o=>{if(o.name==='用餐桌')tables.push(o.position);});
  assert.ok(tables.length>=18,`只有 ${tables.length} 張`);
  assert.ok(new Set(tables.map(p=>p.x.toFixed(1))).size>=3);
  assert.ok(new Set(tables.map(p=>p.z.toFixed(1))).size>=6);
});

test('T 字動線：從正門走過分隔門右轉沿玻璃到樓梯口，沿途不被擋',async()=>{
  const {ANJIU,PLAN,anjiuColliders}=await import('../anjiu-interior.js');
  const route=[[PLAN.mainDoor.x,PLAN.hall.z1-1],[PLAN.mainDoor.x,-1.2],[ANJIU.exit.x,-1.2],[ANJIU.exit.x,ANJIU.exit.z+0.3]];
  const {p,push}=await walk(route,anjiuColliders());
  assert.ok(push<0.05,`沿途被推開 ${push.toFixed(2)}`);
  assert.ok(Math.hypot(p.x-ANJIU.exit.x,p.z-ANJIU.exit.z)<ANJIU.exit.r);
});

test('D7 安九出生後朝樓梯中心走會被踏階擋住',async()=>{
  const {ANJIU,PLAN,anjiuColliders}=await import('../anjiu-interior.js');
  const {p}=await walk([[ANJIU.spawn.x,ANJIU.spawn.z],[PLAN.stair.cx,PLAN.stair.cz]],anjiuColliders());
  assert.ok(Math.hypot(p.x-PLAN.stair.cx,p.z-PLAN.stair.cz)>1.5,'不能穿過旋轉樓梯');
});

test('招牌只用通用店名，不含照片上的真實品牌',async()=>{
  const {createAnjiu}=await import('../anjiu-interior.js');
  const texts=[];createAnjiu().traverse(o=>{if(o.userData.anjiuSign)texts.push(o.userData.anjiuSign.text);});
  assert.ok(texts.length>=8,'店家招牌至少八塊');
  for(const t of texts)for(const brand of ['幸福手','渡可','金牌','胖子','CLOUD','彎月','允浩','光泉','雪柔','春風','正宗'])assert.ok(!t.includes(brand),t);
});

test('福利社：分隔門前是白牆沒有玻璃，可以從門口走進去到最裡面的冰櫃前',async()=>{
  const {PLAN,ANJIU,anjiuColliders,createAnjiu}=await import('../anjiu-interior.js');
  const g=createAnjiu();
  assert.ok(!g.getObjectByName('福利社櫥窗'),'分隔門前不能有玻璃櫥窗');
  assert.ok(g.getObjectByName('福利社白牆'));
  const {shop}=PLAN,doorZ=(shop.door.z0+shop.door.z1)/2;
  const {p,push}=await walk([[PLAN.mainDoor.x,doorZ],[shop.x0+1.4,doorZ],[shop.x0+1.4,1.0]],anjiuColliders());
  assert.ok(push<0.05,`走進福利社被推開 ${push.toFixed(2)}`);
  assert.ok(p.x<shop.x0+1.5&&p.z>0.9);
});

test('福利社內部：右邊櫃檯與門垂直，左邊平行於門的中島貨架圍出 U 型區，最裡面是冰淇淋冰櫃加數個直立冰櫃',async()=>{
  const {PLAN,createAnjiu}=await import('../anjiu-interior.js');
  const g=createAnjiu(),{shop}=PLAN,doorZ=(shop.door.z0+shop.door.z1)/2;
  const counter=g.getObjectByName('福利社櫃檯'),island=g.getObjectByName('中島貨架'),chest=g.getObjectByName('冰淇淋冰櫃');
  assert.ok(counter.scale.x>counter.scale.z&&counter.position.z<doorZ,'櫃檯東西向、在進門右手邊（北側）');
  assert.ok(island.scale.z>island.scale.x&&island.position.z>doorZ,'中島貨架南北向、在進門左手邊（南側）');
  const fridges=[];g.traverse(o=>{if(o.name==='直立冰櫃')fridges.push(o);});
  assert.ok(fridges.length>=3);
  for(const f of [chest,...fridges])assert.ok(f.position.x<shop.x0+1.2,'冰櫃靠最裡面的西牆');
  assert.ok(chest.position.z>Math.max(...fridges.map(f=>f.position.z)),'由左到右：冰淇淋冰櫃在最左（南），再來是直立冰櫃');
  assert.ok(chest.scale.y<1.2&&fridges.every(f=>f.scale.y>1.6),'冰淇淋冰櫃是臥式，其他是直立式');
});

test('旋轉樓梯扶牆與扶手是連續平滑曲面',async()=>{
  const {createAnjiu}=await import('../anjiu-interior.js');
  const g=createAnjiu();
  for(const n of ['旋轉樓梯外扶牆','旋轉樓梯內扶牆','旋轉樓梯木扶手','旋轉樓梯底板']) {
    const m=g.getObjectByName(n);assert.ok(m,n);assert.ok(m.geometry.attributes.position.count>200,n+'要細分成平滑曲面');
  }
});

test('照片比對：店家是連續開放櫃台、正門東側咖啡方桌、樓梯旁白色圓柱、福利社直式招牌',async()=>{
  const {createAnjiu,PLAN}=await import('../anjiu-interior.js');
  const g=createAnjiu(),count=n=>{let k=0;g.traverse(o=>{if(o.name===n)k++;});return k;};
  g.traverse(o=>{if(o.name==='店家隔牆')assert.ok(o.scale.y<=1.2,'店家之間只有矮隔板，櫃台連續開放（照片 9055、9057）');});
  assert.ok(count('咖啡方桌')>=2,'正門東側深色方桌配高背椅（照片 9054、9055）');
  assert.ok(count('樓梯白色圓柱')>=2,'樓梯旁白色圓柱（照片 9065、9066）');
  const v=g.getObjectByName('招牌：福利社直式');assert.ok(v&&v.userData.anjiuSign.h>v.userData.anjiuSign.w,'走廊白牆直式黑底店名（照片 9058）');
  assert.ok(g.getObjectByName('大廳開口扶牆'),'樓梯開口上方看得到九舍大廳的白色弧形扶牆');
});
