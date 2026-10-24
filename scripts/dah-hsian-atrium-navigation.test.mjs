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
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 for(const l of nav.ATRIUM_LEVELS){
  const p={x:l.east-.1,y:l.y,z:3};nav.clampAtrium(p);assert.ok(p.x>=l.east+.4,'挑空側有欄杆');
  if(l.books){const wall={x:l.east+3.35,y:l.y,z:3};nav.clampAtrium(wall);assert.ok(wall.x<=l.east+2.51,'新書牆面加上角色半徑須擋人');}
 }
 const lower={x:-9,y:0,z:8};nav.clampAtrium(lower);assert.deepEqual(lower,{x:-9,y:0,z:8});
 assert.ok(nav.PUBLIC_NAV_FLOORS.every(f=>f.boundaries.length>0),'來源公共樓板共用邊界');
});

test('腳底高度與實際上層平台、斜梯幾何吻合，採光屋頂高於最高迴廊',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const model=createInteriorModel();model.updateMatrixWorld(true);
 for(const l of nav.ATRIUM_LEVELS){
  // Registered southern main floors reach z19.7; 8F is a narrow z15.087..16.696 corridor.
  const x=l.estimatedTerraceOnly?l.east+2.45:0,z=l.estimatedTerraceOnly?3:l.label==='8F'?15.8:18;
  const hit=new THREE.Raycaster(new THREE.Vector3(x,l.y+.2,z),new THREE.Vector3(0,-1,0),0,.5).intersectObject(model,true).find(h=>h.object.name==='來源校準公共樓板');
  assert.ok(hit&&Math.abs(hit.point.y-l.y)<.03,l.label+'平台實體');assert.equal(nav.atriumHeight(x,z,l.y),l.y);
 }
 const roof=new THREE.Box3().setFromObject(model.getObjectByName('天窗鋼桁架上弦'));assert.ok(roof.min.y>nav.ATRIUM_LEVELS.at(-1).y+2.2);
});

test('上層桌椅會阻擋角色，後方書牆走道可通行，斜梯不能從側邊跨入挑空',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),l=nav.ATRIUM_LEVELS[0];
 const furniture=nav.atriumFurniture(l);assert.ok(furniture.length>0);for(const table of furniture){const p={x:(table.x0+table.x1)/2,y:l.y,z:(table.z0+table.z1)/2},before={...p};nav.clampAtrium(p);assert.ok(Math.hypot(p.x-before.x,p.z-before.z)>.2,'桌椅均擋人');}
 const path={x:-13.8,y:l.y,z:-3.8},before={...path};nav.clampAtrium(path);assert.deepEqual(path,before,'柱網西端公共接點可通行');
 const first=nav.ATRIUM_STAIRS[0],t=.5,edge={x:first.a.x+first.width/2+.1,y:first.a.y+(first.b.y-first.a.y)*t,z:first.a.z+(first.b.z-first.a.z)*t};nav.clampAtrium(edge);assert.ok(Math.abs(edge.x-first.a.x)<=first.width/2-.4+1e-6);
});

test('樓下遠離樓梯的跳躍不會橫向瞬移，上層共邊平台能連續跨過',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 // (-16,11) now lies inside the plan-registered 2F11 diamond table: being
 // pushed out of real furniture is correct. Keep the empty-air jump assertion
 // at a nearby unobstructed point, with the same exact no-displacement check.
 for(const [x,z]of [[-5,11],[-16,9]]){const p={x,y:.4,z};nav.clampAtrium(p);assert.deepEqual(p,{x,y:.4,z});}
 const l=nav.ATRIUM_LEVELS[0];for(let i=0;i<=180;i++){const p={x:3.5,y:l.y,z:13.8+i*.03},wanted={...p};nav.clampAtrium(p);assert.deepEqual(p,wanted,'來源平台接南側閱讀區接縫，沿桌列東側通道');}
});

test('高處俯視中庭的南側支柱維持柱形，不得延伸成七米深隔牆擋住全景',async()=>{
 const THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel(),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();let count=0;
 m.traverse(o=>{if(!o.isInstancedMesh||o.name!=='中庭批次：concrete')return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(p,q,s);if(p.z===13&&Math.abs(s.y-3.1)<.001){count++;assert.ok(s.z<1,'柱深不能成為橫擋視線的牆');}}});assert.ok(count>0);
});
test('戶外出口只在二樓門口有效，高層同平面位置不能直接離館',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');assert.equal(nav.canUseDahExit(0),true);assert.equal(nav.canUseDahExit(1),true);assert.equal(nav.canUseDahExit(4.5),false);assert.equal(nav.canUseDahExit(26.2),false);
});
test('走到梯口時角色半徑可跨過平台邊，不會在第一階前卡住',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');for(const s of nav.ATRIUM_STAIRS){
  const len=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z),dx=(s.b.x-s.a.x)/len,dz=(s.b.z-s.a.z)/len;
  // Start on the flight, not beyond a different L-turn landing.
  const p={x:s.a.x+dx*.05,y:s.a.y,z:s.a.z+dz*.05};for(let i=0;i<22;i++){p.x+=dx*.05;p.z+=dz*.05;nav.clampAtrium(p);p.y=nav.atriumHeight(p.x,p.z,p.y);}
  assert.ok((p.x-s.a.x)*dx+(p.z-s.a.z)*dz>1&&p.y>s.a.y+.1,'需實際跨入斜梯 '+JSON.stringify(p));
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
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const a=nav.atriumDesks(nav.ATRIUM_LEVELS[0]),b=nav.atriumDesks(nav.ATRIUM_LEVELS[1]),north=a.filter(d=>d.side==='north');
 assert.ok(north.length>=2,'來源3F北翼較短，仍需多組有間隔桌島');for(let i=1;i<north.length;i++)assert.ok(north[i].u-north[i-1].u-north[i-1].width>1.2);
 assert.equal(north[0].u,b.find(d=>d.side==='north').u);
 for(const d of a){assert.ok(d.depth>=1.8&&d.width>=1.8);assert.ok(nav.atriumFurniture(nav.ATRIUM_LEVELS[0]).some(r=>Math.abs((r.x0+r.x1)/2-d.x)<.01&&Math.abs((r.z0+r.z1)/2-d.z)<.01));}
});

test('中央隔板垂直欄杆、兩側座椅相對，東北兩翼一起轉向且不侵入書牆走道',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const model=createInteriorModel(),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),parts=[];
 model.traverse(o=>{if(!o.isInstancedMesh||!['中庭批次：white','中庭批次：wood','中庭批次：litWood'].includes(o.name))return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(p,q,scale);parts.push({name:o.name,p:p.clone(),s:scale.clone()});}});
 const l=nav.ATRIUM_LEVELS[0];for(const d of nav.atriumDesks(l)){
  const divider=parts.find(v=>v.name==='中庭批次：white'&&Math.abs(v.p.x-d.x)<.01&&Math.abs(v.p.z-d.z)<.01&&Math.abs(v.p.y-l.y-1.15)<.01);assert.ok(divider,'白色隔板應在桌島中央而非後擋板');
  if(d.side==='north')assert.ok(Math.abs(divider.s.z-(d.depth-.08))<.001&&divider.s.x<.1);else assert.ok(Math.abs(divider.s.x-(d.depth-.08))<.001&&divider.s.z<.1);
  for(const offset of [-1.3,1.3])for(const v of d.chairDepths){const cx=d.side==='east'?l.east+v:d.x+offset,cz=d.side==='east'?d.z+offset:l.north-v;assert.ok(parts.some(v=>Math.abs(v.p.x-cx)<.01&&Math.abs(v.p.z-cz)<.01&&Math.abs(v.p.y-l.y-.46)<.01),'兩側座椅必須相對');}
  assert.ok(nav.atriumFurniture(l).length>=nav.atriumDesks(l).length*3);const path={x:d.side==='east'?l.east+2.45:d.u,y:l.y,z:d.side==='east'?d.u:l.north-2.45};const before={...path};nav.clampAtrium(path);assert.deepEqual(path,before,'書牆前通道');
 }
});
test('南側實體柱不讓角色穿過，柱間通道仍可走',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');let checked=0;
 for(const l of nav.ATRIUM_LEVELS){for(const c of nav.atriumColumns(l)){checked++;for(const sx of [-1,1])for(const sz of [-1,1])assert.ok(floorContains(publicFloor(l.label),c.x+sx*c.w/2,c.z+sz*c.d/2),'有效柱完整柱腳需由樓板支撐');
 const p={x:c.x,y:l.y,z:c.z};nav.clampAtrium(p);assert.ok(Math.abs(p.x-c.x)>=c.w/2+.4-1e-8||Math.abs(p.z-c.z)>=c.d/2+.4-1e-8,'角色不能留在柱內 '+l.label);}
 const clear={x:l.estimatedTerraceOnly?l.east+2.45:0,y:l.y,z:l.estimatedTerraceOnly?3:l.label==='8F'?15.8:l.label==='7F'?18.2:14.2},before={...clear};nav.clampAtrium(clear);assert.deepEqual(clear,before);assert.equal(nav.atriumHeight(clear.x,clear.z,l.y),l.y);}assert.ok(checked>0);
});

test('斜梯中途向兩側移動不能越過扶手或跳到另一樓層',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');for(const s of nav.ATRIUM_STAIRS.slice(1))for(const side of [-1,1]){
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),t=.52,p={x:s.a.x+dx*t,y:s.a.y+(s.b.y-s.a.y)*t,z:s.a.z+dz*t};let vy=0;
  for(let i=0;i<45;i++){p.x+=side*dz/len*.05;p.z-=side*dx/len*.05;nav.clampAtrium(p);vy-=18/60;p.y+=vy/60;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}
  const lateral=Math.abs((p.x-s.a.x)*dz-(p.z-s.a.z)*dx)/len;assert.ok(lateral<=s.width/2-.4+1e-6,'身體不可越欄 '+lateral);assert.ok(Math.abs(p.y-(s.a.y+(s.b.y-s.a.y)*t))<.04,'不能瞬移上層');
 }
});
test('樓梯上端可連續離梯到公共通道，桌椅不得封住落腳平台',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');for(const s of nav.ATRIUM_STAIRS.filter(s=>!s.entry)){
 const len=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z),dx=(s.b.x-s.a.x)/len,dz=(s.b.z-s.a.z)/len;
 for(let n=0;n<=25;n++){const p={x:s.b.x+dx*n*.04,y:s.b.y,z:s.b.z+dz*n*.04},wanted={...p};nav.clampAtrium(p);assert.ok(Math.hypot(p.x-wanted.x,p.z-wanted.z)<1e-6,'梯口落腳平台 '+JSON.stringify(wanted));}
 }
});

test('南側柱旁不擺封住繞行路線的末端桌島',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');for(const l of nav.ATRIUM_LEVELS){
 const z=l.estimatedTerraceOnly?l.north-2.45:l.label==='8F'?15.8:l.label==='7F'?18.2:14.2;
 for(let n=0;n<=100;n++){const p={x:(l.estimatedTerraceOnly?-8:-3)+n*.05,y:l.y,z},wanted={...p};nav.clampAtrium(p);assert.deepEqual(p,wanted,'來源迴廊柱後須有連續繞行路線 '+l.label);assert.equal(nav.atriumHeight(p.x,p.z,l.y),l.y,'路線不能位在無地板處');}
 }
});

test('兩翼玻璃欄杆只沿挑空邊緣，不能交叉伸入轉角通道',async()=>{
 const THREE=await import('three'),nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const l of nav.ATRIUM_LEVELS){
 const guard=new THREE.Raycaster(new THREE.Vector3(l.east+1,l.y+.7,3),new THREE.Vector3(-1,0,0),0,2).intersectObject(m,true).some(h=>h.object.name==='公共邊界玻璃護欄');assert.ok(guard,'真正挑空側欄杆校準');
 const z=l.label==='8F'?15.8:18,clear=new THREE.Raycaster(new THREE.Vector3(-1,l.y+.7,z),new THREE.Vector3(1,0,0),0,2).intersectObject(m,true).some(h=>h.object.name==='公共邊界玻璃護欄');assert.equal(clear,false,'公共平台內部不得多一片欄杆');
 }
});

test('主樓層轉角出口可穿過書牆到後方公共走廊，夾層不憑空複製完整後區',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const l of nav.ATRIUM_LEVELS){const f=nav.PUBLIC_NAV_FLOORS.find(f=>f.id===l.id);
 if(l.estimatedTerraceOnly){assert.equal(nav.atriumRearExit(l),null);continue;}
 // Official west-column doorway connects the terrace to long north circulation; 8F has no inner terrace.
 if(l.label==='8F')continue;const north=Math.min(...f.regions[0].map(p=>p[1]));
 for(let i=0;i<=35;i++){const p={x:-13.8,y:l.y,z:north+.9-i*.05},wanted={...p};nav.clampAtrium(p);assert.deepEqual(p,wanted,'來源西端出口全段可走 '+l.label);
 const down=new THREE.Raycaster(new THREE.Vector3(p.x,l.y+.2,p.z),new THREE.Vector3(0,-1,0),0,.5).intersectObject(m,true).find(h=>h.object.name==='來源校準公共樓板');assert.ok(down&&Math.abs(down.point.y-l.y)<.03,'開口後方實體地板');}
 const ray=new THREE.Raycaster(new THREE.Vector3(-13.8,l.y+1.6,north+.9),new THREE.Vector3(0,0,-1),0,1.75);assert.equal(ray.intersectObject(m,true).filter(h=>h.object.material.side!==THREE.BackSide&&!h.object.material.transparent).length,0,'人眼高開口不能被書牆封住');
 }
});

test('後方通道與原平台地板只接合，不能重疊共面閃爍',async()=>{
 const THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel(),floors=[];m.updateMatrixWorld(true);
 m.traverse(o=>{if(o.name==='來源校準公共樓板')floors.push(o);});assert.equal(floors.length,8);
 const {publicFloor,floorSurfacePolygons}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 // Combined slabs still contain every source union slice. Probe real triangles,
 // not the broad bounding-box centre, which may lie inside the atrium void.
 for(const floor of floors){
  const polygons=floorSurfacePolygons(publicFloor(floor.userData.floorId)),y=new THREE.Box3().setFromObject(floor).max.y;
  for(const poly of polygons){const x=poly.reduce((a,p)=>a+p[0],0)/poly.length,z=poly.reduce((a,p)=>a+p[1],0)/poly.length;
   const hits=new THREE.Raycaster(new THREE.Vector3(x,y+.02,z),new THREE.Vector3(0,-1,0),0,.04).intersectObjects(floors).filter(h=>Math.abs(h.point.y-y)<.001);
   assert.equal(new Set(hits.map(h=>h.object)).size,1,'每個樓板切片需恰有一面真實樓板，不能缺面或互蓋');
   assert.ok(hits.length<=2,'only the same triangulated surface may share the probe');
  }
 }

});

test('來源西端轉角出口保持暢通，相鄰挑空邊界仍阻擋角色身體',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 // New source doorway is an open floor joint rather than the removed generic T appendage/frame.
 // Its neighboring physical boundary still stops a body while its center stays open.
 for(const l of nav.ATRIUM_LEVELS.filter(l=>!l.estimatedTerraceOnly&&l.label!=='8F')){
 const f=nav.PUBLIC_NAV_FLOORS.find(f=>f.id===l.id),north=Math.min(...f.regions[0].map(p=>p[1]));
 const center={x:-13.8,y:l.y,z:north},wanted={...center};nav.clampAtrium(center);assert.deepEqual(center,wanted);
 const edge={x:l.east-.1,y:l.y,z:3};nav.clampAtrium(edge);assert.ok(edge.x>=l.east+.4,'相鄰真邊界不能穿入');
 }
});

test('手機快速下樓在不同遊戲步進落穩同一樓層，不以牆鐘毫秒假定已落地',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const s=nav.ATRIUM_STAIRS.find(s=>s.a.y===20&&s.b.y===23.1),dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
 for(const dt of [1/60,.05]){
  const p={x:s.b.x+ux*.65,y:s.b.y,z:s.b.z+uz*.65};let vy=0;
  const gravity=()=>{vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}};
  const distance=len+1.3;let walked=0;
  while(walked<distance){const move=Math.min(8.2*dt,distance-walked);p.x-=ux*move;p.z-=uz*move;nav.clampAtrium(p);gravity();walked+=move;}
  for(let i=0;i<Math.ceil(.8/dt);i++)gravity();assert.ok(Math.abs(p.y-s.a.y)<.15,JSON.stringify({dt,p,vy}));
  assert.ok(Math.hypot(p.x-(s.a.x-ux*.65),p.z-(s.a.z-uz*.65))<.08,'必須真正走過整段階梯');
 }
});

test('registered bookshelf aisles retain a continuous body-clear route beside every desk island',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 for(const l of nav.ATRIUM_LEVELS)for(const d of nav.atriumDesks(l))for(let n=0;n<=80;n++){
 const u=d.u-1.8+n*.045,p={x:d.side==='east'?l.east+2.45:u,y:l.y,z:d.side==='east'?u:l.north-2.45},wanted={...p};nav.clampAtrium(p);
 assert.ok(Math.hypot(p.x-wanted.x,p.z-wanted.z)<1e-6,'bookshelf aisle '+l.label+' '+JSON.stringify(wanted));
 }
});

test('estimated intermediate south galleries remain body-wide floor rather than a narrow unsupported strip',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 for(const l of nav.ATRIUM_LEVELS.filter(l=>l.estimatedTerraceOnly))for(let i=0;i<=60;i++){
  const x=-3+i*.05,z=14.5,f=publicFloor(l.label),p={x,y:l.y,z},wanted={...p};
  assert.equal(nav.atriumHeight(x,z,l.y),l.y,'estimated south gallery needs supported floor '+l.label);
  for(let k=0;k<16;k++){const a=k/16*Math.PI*2;assert.ok(floorContains(f,x+.4*Math.cos(a),z+.4*Math.sin(a)),'entire player radius fits '+l.label);}
  nav.clampAtrium(p);assert.ok(Math.hypot(p.x-wanted.x,p.z-wanted.z)<1e-6,'continuous south gallery '+l.label);
 }
});
