import test from 'node:test';import assert from 'node:assert/strict';
test('二樓D梯可連續走上第一層閱覽平台，再原路下樓而不瞬移',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 assert.ok(nav.ATRIUM_LEVELS.length>=7,'包括官方有記錄的夾層與高層迴廊');
 const stair=nav.ATRIUM_STAIRS[0];let y=0;
 for(let i=0;i<=100;i++){const t=i/100,x=stair.a.x+(stair.b.x-stair.a.x)*t,z=stair.a.z+(stair.b.z-stair.a.z)*t;y=nav.atriumHeight(x,z,y);assert.ok(Math.abs(y-t*stair.b.y)<.03,`${t}:${y}`);}
 for(let i=100;i>=0;i--){const t=i/100;y=nav.atriumHeight(stair.a.x+(stair.b.x-stair.a.x)*t,stair.a.z+(stair.b.z-stair.a.z)*t,y);assert.ok(Math.abs(y-t*stair.b.y)<.03);}
});
test('每段斜梯能雙向行走；樓下跳躍不會被上層樓板吸上去',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 for(const s of nav.ATRIUM_STAIRS.slice(1)){
  let y=s.a.y;for(let i=0;i<=100;i++){const t=i/100;y=nav.atriumHeight(s.a.x+(s.b.x-s.a.x)*t,s.a.z+(s.b.z-s.a.z)*t,y);assert.ok(Math.abs(y-(s.a.y+(s.b.y-s.a.y)*t))<.03);}
  for(let i=100;i>=0;i--){const t=i/100;y=nav.atriumHeight(s.a.x+(s.b.x-s.a.x)*t,s.a.z+(s.b.z-s.a.z)*t,y);assert.ok(Math.abs(y-(s.a.y+(s.b.y-s.a.y)*t))<.03);}
 }
 assert.equal(nav.atriumHeight(-9,8,.8),0);assert.equal(nav.atriumHeight(1,12,0),0);
});
test('上層實體平台與斜梯共用配置，欄杆不讓玩家踏入挑空或穿書牆',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');assert.equal(typeof nav.clampAtrium,'function');
 for(const l of nav.ATRIUM_LEVELS){
  const p={x:l.east- .1,y:l.y,z:5};nav.clampAtrium(p);assert.ok(p.x>=l.east+.4,'挑空側有欄杆');
  const wall={x:l.east+4.7,y:l.y,z:5};nav.clampAtrium(wall);assert.ok(wall.x<l.east+4.2,'書牆阻擋');
 }
 const lower={x:-9,y:0,z:8};nav.clampAtrium(lower);assert.deepEqual(lower,{x:-9,y:0,z:8});
 assert.ok(nav.atriumPlatforms(nav.ATRIUM_LEVELS[0]).length>=3);
});
test('腳底高度與實際上層平台、斜梯幾何吻合，採光屋頂高於最高迴廊',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');const THREE=await import('three');const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const model=createInteriorModel();model.updateMatrixWorld(true);
 for(const l of nav.ATRIUM_LEVELS){
  const ray=new THREE.Raycaster(new THREE.Vector3(-14,l.y+1,21.5),new THREE.Vector3(0,-1,0),0,2);
  const hit=ray.intersectObject(model,true).find(h=>h.object.material.side!==THREE.BackSide);assert.ok(hit&&Math.abs(hit.point.y-l.y)<.03,l.label+'平台實體');
 }
 const roof=new THREE.Box3().setFromObject(model.getObjectByName('天窗鋼桁架上弦'));assert.ok(roof.min.y>nav.ATRIUM_LEVELS.at(-1).y+2.2);
});
test('上層桌椅會阻擋角色，後方書牆走道可通行，斜梯不能從側邊跨入挑空',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),l=nav.ATRIUM_LEVELS[0];
 const furniture=nav.atriumFurniture(l);assert.ok(furniture.length>0);const table=furniture[0],p={x:(table.x0+table.x1)/2,y:l.y,z:(table.z0+table.z1)/2};const before={...p};nav.clampAtrium(p);assert.ok(Math.hypot(p.x-before.x,p.z-before.z)>.2);
 const path={x:l.east+3,y:l.y,z:5};nav.clampAtrium(path);assert.deepEqual(path,{x:l.east+3,y:l.y,z:5});
 const first=nav.ATRIUM_STAIRS[0],edge={x:first.a.x+first.width/2+.1,y:2.25,z:20.3};nav.clampAtrium(edge);assert.ok(Math.abs(edge.x-first.a.x)<first.width/2);
});
test('樓下遠離樓梯的跳躍不會橫向瞬移，上層共邊平台能連續跨過',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');const far={x:-5,y:.4,z:18};nav.clampAtrium(far);assert.deepEqual(far,{x:-5,y:.4,z:18});
 const beside={x:-16,y:.4,z:18};nav.clampAtrium(beside);assert.deepEqual(beside,{x:-16,y:.4,z:18});
 const l=nav.ATRIUM_LEVELS[0],p={x:l.east+3,y:l.y,z:18};
 for(let i=0;i<180;i++){p.z-=.05;const wanted={...p};nav.clampAtrium(p);assert.ok(Math.hypot(p.x-wanted.x,p.z-wanted.z)<.001,`接縫 ${JSON.stringify(wanted)} → ${JSON.stringify(p)}`);}
});
test('高處俯視中庭的南側支柱維持柱形，不得延伸成七米深隔牆擋住全景',async()=>{
 const THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel(),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();let count=0;
 m.traverse(o=>{if(!o.isInstancedMesh||o.name!=='中庭批次：concrete')return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(p,q,s);if(p.z===20&&Math.abs(s.y-3.1)<.001){count++;assert.ok(s.z<1,'柱深不能成為橫擋視線的牆');}}});assert.ok(count>0);
});
test('戶外出口只在二樓門口有效，高層同平面位置不能直接離館',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');assert.equal(nav.canUseDahExit(0),true);assert.equal(nav.canUseDahExit(1),true);assert.equal(nav.canUseDahExit(4.5),false);assert.equal(nav.canUseDahExit(26.2),false);
});
test('走到梯口時角色半徑可跨過平台邊，不會在第一階前卡住',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');for(const s of nav.ATRIUM_STAIRS.slice(1)){
  const p={x:s.a.x,y:s.a.y,z:s.a.z-.6};for(let i=0;i<22;i++){p.z+=.05;nav.clampAtrium(p);p.y=nav.atriumHeight(p.x,p.z,p.y);}
  assert.ok(p.z>s.a.z+.3&&p.y>s.a.y+.1,'需實際跨入斜梯 '+JSON.stringify(p));
 }
});
test('快跑下樓沿用真實重力步進，不能因下降滯後而彈回上一層',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),s=nav.ATRIUM_STAIRS[0],p={x:s.b.x,y:s.b.y,z:s.b.z};let vy=0;
 for(let i=0;i<55;i++){
  p.z-=8.2/60;nav.clampAtrium(p);vy-=18/60;p.y+=vy/60;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}
 }
 assert.ok(p.z<17.2&&p.y<.1,JSON.stringify(p));
});
test('閱讀桌島留出間隔且同側按書牆成列，模型與家具阻擋共用桌島尺度',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');assert.equal(typeof nav.atriumDesks,'function');
 const a=nav.atriumDesks(nav.ATRIUM_LEVELS[0]),b=nav.atriumDesks(nav.ATRIUM_LEVELS[1]);
 const north=a.filter(d=>d.side==='north');assert.ok(north.length>=4);assert.ok(north[1].u-north[0].u-north[0].width>1.2);assert.equal(north[0].u,b.find(d=>d.side==='north').u);
 for(const d of a){assert.ok(d.depth>d.width);assert.ok(nav.atriumFurniture(nav.ATRIUM_LEVELS[0]).some(r=>Math.abs((r.x0+r.x1)/2-d.x)<.01&&Math.abs((r.z0+r.z1)/2-d.z)<.01));}
});

test('中央隔板垂直欄杆、兩側座椅相對，東北兩翼一起轉向且不侵入書牆走道',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const model=createInteriorModel(),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),parts=[];
 model.traverse(o=>{if(!o.isInstancedMesh||!['中庭批次：white','中庭批次：wood','中庭批次：litWood'].includes(o.name))return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(p,q,scale);parts.push({name:o.name,p:p.clone(),s:scale.clone()});}});
 const l=nav.ATRIUM_LEVELS[0];for(const d of nav.atriumDesks(l)){
  const divider=parts.find(v=>v.name==='中庭批次：white'&&Math.abs(v.p.x-d.x)<.01&&Math.abs(v.p.z-d.z)<.01&&Math.abs(v.p.y-l.y-1.15)<.01);assert.ok(divider,'白色隔板應在桌島中央而非後擋板');
  if(d.side==='north')assert.ok(divider.s.z>1.8&&divider.s.x<.1);else assert.ok(divider.s.x>1.8&&divider.s.z<.1);
  for(const offset of [-1.3,1.3])for(const v of [.8,1.9]){const cx=d.side==='east'?l.east+v:d.x+offset,cz=d.side==='east'?d.z+offset:l.north-v;assert.ok(parts.some(v=>Math.abs(v.p.x-cx)<.01&&Math.abs(v.p.z-cz)<.01&&Math.abs(v.p.y-l.y-.46)<.01),'兩側座椅必須相對');}
  assert.ok(nav.atriumFurniture(l).length>=nav.atriumDesks(l).length*3);const path={x:d.side==='east'?l.east+3.4:d.u,y:l.y,z:d.side==='east'?d.u:l.north-3.4};const before={...path};nav.clampAtrium(path);assert.deepEqual(path,before,'書牆前通道');
 }
});
test('南側實體柱不讓角色穿過，柱間通道仍可走',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');for(const l of nav.ATRIUM_LEVELS){for(const x of [-22,-15,-8,-1,6]){
  const p={x,y:l.y,z:20};nav.clampAtrium(p);assert.ok(Math.abs(p.x-x)>=.7-1e-8||Math.abs(p.z-20)>=.7-1e-8,'角色不能留在柱內 '+l.label);
 }
 const clear={x:-14,y:l.y,z:21.5};nav.clampAtrium(clear);assert.deepEqual(clear,{x:-14,y:l.y,z:21.5});}
});

test('斜梯中途向兩側移動不能越過扶手或跳到另一樓層',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');for(const s of nav.ATRIUM_STAIRS.slice(1))for(const side of [-1,1]){
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),t=.52,p={x:s.a.x+dx*t,y:s.a.y+(s.b.y-s.a.y)*t,z:s.a.z+dz*t};let vy=0;
  for(let i=0;i<45;i++){p.x+=side*dz/len*.05;p.z-=side*dx/len*.05;nav.clampAtrium(p);vy-=18/60;p.y+=vy/60;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}
  const lateral=Math.abs((p.x-s.a.x)*dz-(p.z-s.a.z)*dx)/len;assert.ok(lateral<=s.width/2-.4+1e-6,'身體不可越欄 '+lateral);assert.ok(Math.abs(p.y-(s.a.y+(s.b.y-s.a.y)*t))<.04,'不能瞬移上層');
 }
});
test('樓梯上端可橫走到書牆側通道，桌椅不得封住落腳平台',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');for(let i=0;i<nav.ATRIUM_STAIRS.length-1;i++){
  const s=nav.ATRIUM_STAIRS[i+1],l=nav.ATRIUM_LEVELS[i+1];for(let n=0;n<=50;n++){
   const p={x:s.b.x+(l.east+3.1-s.b.x)*n/50,y:l.y,z:16.15},wanted={...p};nav.clampAtrium(p);assert.ok(Math.hypot(p.x-wanted.x,p.z-wanted.z)<1e-6,'梯口橫向通道 '+l.label+JSON.stringify(p));
  }
 }
});
test('南側柱旁不擺封住繞行路線的末端桌島',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');for(const l of nav.ATRIUM_LEVELS){
  const outer=l.east+3.1,post=nav.ATRIUM_COLUMNS.find(c=>Math.abs(c.x-outer)<.85);if(!post)continue;
  const route=[[outer,16.15],[outer,18.5],[outer-1.2,18.5],[outer-1.2,21.3],[outer,22.6]];
  for(let i=1;i<route.length;i++)for(let n=0;n<=100;n++){const t=n/100,a=route[i-1],b=route[i],p={x:a[0]+(b[0]-a[0])*t,y:l.y,z:a[1]+(b[1]-a[1])*t},wanted={...p};nav.clampAtrium(p);assert.ok(Math.hypot(p.x-wanted.x,p.z-wanted.z)<1e-6,'柱旁須有連續繞行路線 '+l.label+JSON.stringify(wanted));}
 }
});
test('兩翼玻璃欄杆只沿挑空邊緣，不能交叉伸入轉角通道',async()=>{
 const THREE=await import('three'),nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const railHit=(l,x)=>new THREE.Raycaster(new THREE.Vector3(x,l.y+.7,l.north+1),new THREE.Vector3(0,0,-1),0,2).intersectObject(m,true).some(h=>h.object.name==='通透玻璃欄杆');
 for(const l of nav.ATRIUM_LEVELS){assert.equal(railHit(l,l.east-.5),true,'先用真正挑空側欄杆校準');assert.equal(railHit(l,l.east+3.3),false,'平台內轉角不得多一片欄杆');}
});
test('主樓層轉角出口可穿過書牆到後方公共走廊，夾層不憑空複製完整後區',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');assert.equal(typeof nav.atriumRearExit,'function');
 const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const l of nav.ATRIUM_LEVELS){const exit=nav.atriumRearExit(l);if(l.label.includes('MF')||l.label==='6F'){assert.equal(exit,null,'未有獨立平面的中間層不複製後區');continue;}assert.ok(exit,'主樓層需有後方公共通道');
  const x=exit.x;for(let i=0;i<=100;i++){const z=l.north-2-i*.055,p={x,y:l.y,z};nav.clampAtrium(p);assert.ok(Math.hypot(p.x-x,p.z-z)<1e-6,'出口全段可走 '+l.label+JSON.stringify(p));
   const down=new THREE.Raycaster(new THREE.Vector3(x,l.y+.3,z),new THREE.Vector3(0,-1,0),0,.5).intersectObject(m,true).find(h=>h.object.material.side!==THREE.BackSide);assert.ok(down&&Math.abs(down.point.y-l.y)<.03,'開口後方需有實體地板');
  }
  const ray=new THREE.Raycaster(new THREE.Vector3(x,l.y+1.6,l.north-2),new THREE.Vector3(0,0,-1),0,5.4);const blocked=ray.intersectObject(m,true).find(h=>h.object.material.side!==THREE.BackSide&&!h.object.material.transparent);assert.equal(blocked,undefined,'人眼高開口不能仍被書背或玻璃殼封住');
 }
});
test('後方通道與原平台地板只接合，不能重疊共面閃爍',async()=>{
 const THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel(),floors=[];m.updateMatrixWorld(true);
 m.traverse(o=>{if(['可行走層退平台','東側閱讀平台','後方公共走廊地毯'].includes(o.name))floors.push(new THREE.Box3().setFromObject(o));});assert.ok(floors.length>20);
 for(let i=0;i<floors.length;i++)for(let j=i+1;j<floors.length;j++){const a=floors[i],b=floors[j];if(Math.abs(a.max.y-b.max.y)>.001)continue;const overlapX=Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x),overlapZ=Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z);assert.ok(overlapX<.001||overlapZ<.001,'同高度樓板不能互蓋');}
});
test('轉角出口細門框也阻擋角色身體，中央路線保持暢通',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');for(const l of nav.ATRIUM_LEVELS){const exit=nav.atriumRearExit(l);if(!exit)continue;
  for(const side of [-1,1]){const x=exit.x+side*1.12,p={x:x-side*.1,y:l.y,z:exit.z};nav.clampAtrium(p);assert.ok(Math.abs(p.x-x)>=.45-1e-8||Math.abs(p.z-exit.z)>=.48-1e-8,'細門框不可穿入');}
  const center={x:exit.x,y:l.y,z:exit.z};nav.clampAtrium(center);assert.deepEqual(center,{x:exit.x,y:l.y,z:exit.z});
 }
});
