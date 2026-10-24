/** 四角色換裝工作台。重用真實角色建構器，僅本機保存，不載入正式遊戲循環。 */
const $=id=>document.getElementById(id);
const status=$('wardrobe-status');
async function startWardrobe(){
try{
  const response=await fetch('../index.html');
  if(!response.ok)throw new Error(`無法載入遊戲介面：${response.status}`);
  const source=new DOMParser().parseFromString(await response.text(),'text/html');
  source.querySelectorAll('script,style,link,iframe').forEach(n=>n.remove());
  const scaffold=document.createElement('div');scaffold.hidden=true;scaffold.id='wardrobe-game-scaffold';
  while(source.body.firstChild)scaffold.appendChild(source.body.firstChild);
  document.body.appendChild(scaffold);
  const THREE=await import('three');
  const {OrbitControls}=await import('three/examples/jsm/controls/OrbitControls.js');
  const {renderer}=await import('../src/core/engine.js');
  const {NPCS,addNPC}=await import('../src/actors/npc.js');
  const {player,rig,H,headCenter}=await import('../src/actors/player.js');
  const {toon,OUT,canvasTex}=await import('../src/render/kit.js');
  const {costumeLook}=await import('../src/systems/baozhong/npc-costume-profiles.js');
  const {mountNpcCostume}=await import('../src/systems/baozhong/npc-costumes.js');
  const {activateArticulatedArms}=await import('../src/actors/articulated-arms.js');
  const {WARDROBE_CATALOG,createWardrobeActor}=await import('../src/actors/wardrobe-factory.js');
  const {default:bz}=await import('../src/content/baozhong.json');
  const inputs=new Map();
  const addInput=n=>inputs.set(n.id,{id:n.id,root:n.g,body:n.rig,joints:n.P,headCenter:n.P.head});
  addInput(NPCS.find(n=>n.id==='chiang'));
  inputs.set('player',{id:'player',root:player,body:rig,joints:H,headCenter});
  for(const id of ['D12','D23']){
    const b=bz.booths.find(b=>b.id===id);
    const n=addNPC({id:`bz26-${id}`,home:{x:0,z:0},look:costumeLook(`bz26-${id}`,b.npc.look),dialog:[{lines:['四角色換裝工作台']}]});
    mountNpcCostume(n,{toon,OUT,canvasTex,groundH:()=>0});addInput(n);
  }
  for(const slot of ['headwear','outerwear','leftHand']){
    const select=$(`wardrobe-${slot}`);
    for(const item of WARDROBE_CATALOG[slot]){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;select.appendChild(option);}
  }
  const view=$('wardrobe-viewport');view.prepend(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#eef5f3');
  scene.add(new THREE.HemisphereLight('#fff7e8','#a7c9ba',1.3));
  const sun=new THREE.DirectionalLight('#fff4df',1.8);sun.position.set(-3,5,4);scene.add(sun);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(1.65,64),toon('#d5e6dd'));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);
  const camera=new THREE.PerspectiveCamera(35,1,.01,30);camera.position.set(2.4,1.5,3.6);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.8,0);controls.minDistance=1.3;controls.maxDistance=7;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=false;controls.enableDamping=true;
  let current,arms,wardrobe,destroyed=false,suspended=false,storageWarning='';
  const storageKey=id=>`nccu100.wardrobe.preview.v1.${id}`;
  const save=()=>{
    if(!wardrobe)return;
    try{localStorage.setItem(storageKey(current.id),JSON.stringify(wardrobe.exportConfig()));storageWarning='';}
    catch{storageWarning='此瀏覽器無法保存本機設定，請匯出 JSON 備份。';}
  };
  const update=(message='換裝已更新。')=>{
    const config=wardrobe.exportConfig();
    delete document.documentElement.dataset.wardrobeLastError;
    for(const slot of ['headwear','outerwear','leftHand'])$(`wardrobe-${slot}`).value=config.slots[slot];
    const data=document.documentElement.dataset;
    data.wardrobeActor=current.id;data.wardrobeConfig=JSON.stringify(config);data.wardrobePose=$('wardrobe-pose').value;
    status.textContent=`${current.id}\n${message}${storageWarning?'\n'+storageWarning:''}`;
  };
  const selectActor=()=>{
    save();wardrobe?.dispose();wardrobe=null;arms?.dispose();arms=null;
    if(current)scene.remove(current.root);
    current=inputs.get($('wardrobe-actor').value);current.root.position.set(0,0,0);current.root.rotation.set(0,0,0);scene.add(current.root);
    arms=activateArticulatedArms(current);wardrobe=createWardrobeActor(current);
    let message='已載入原始服裝。';
    try{const saved=localStorage.getItem(storageKey(current.id));if(saved){wardrobe.loadConfig(saved);message='已載回本機換裝設定。';}}
    catch(error){message=`本機設定未載入：${error.message}`;}
    $('wardrobe-pose').value='neutral';arms.setPose('neutral');wardrobe.validate();update(message);
  };
  const guard=fn=>async()=>{try{await fn();}catch(error){let message=`操作未完成：${error.message}`;console.error(error);try{if(!wardrobe)throw new Error('No active wardrobe');if(wardrobe){const config=wardrobe.exportConfig();for(const slot of ['headwear','outerwear','leftHand'])$(`wardrobe-${slot}`).value=config.slots[slot];document.documentElement.dataset.wardrobeConfig=JSON.stringify(config);}}catch(syncError){console.error(syncError);document.querySelectorAll('aside button,aside select,aside input').forEach(n=>n.disabled=true);message+='\n角色狀態無法讀取，請重新整理重新建立工作台。';}status.textContent=message;document.documentElement.dataset.wardrobeLastError=message;}};
  const loadText=text=>{
    if(new TextEncoder().encode(text).length>4096)throw new Error('設定檔超過 4 KiB。');
    const config=JSON.parse(text);
    if(!config||config.actorId!==current.id)throw new Error('角色不符，請先切換至設定檔所屬角色。');
    wardrobe.loadConfig(config);wardrobe.validate();save();update('JSON 已載入並保存於本機。');
  };
  let importSerial=0;
  $('wardrobe-actor').addEventListener('change',guard(()=>{importSerial++;selectActor();}));
  document.querySelectorAll('[data-slot]').forEach(select=>select.addEventListener('change',guard(()=>{
    importSerial++;wardrobe.equip(select.dataset.slot,select.value);wardrobe.validate();save();update();
  })));
  $('wardrobe-pose').addEventListener('change',guard(()=>{arms.setPose($('wardrobe-pose').value);wardrobe.validate();update('已切換關鍵姿勢。');}));
  $('wardrobe-reset').addEventListener('click',guard(()=>{
    importSerial++;wardrobe.reset();$('wardrobe-pose').value='neutral';arms.setPose('neutral');wardrobe.validate();save();update('已還原原始服裝與姿勢。');
  }));
  $('wardrobe-import').addEventListener('click',guard(()=>{importSerial++;loadText($('wardrobe-json').value);}));
  $('wardrobe-file').addEventListener('change',guard(async()=>{
    const serial=++importSerial,file=$('wardrobe-file').files[0];$('wardrobe-file').value='';if(!file)return;
    if(file.size>4096)throw new Error('設定檔超過 4 KiB。');
    const actorId=current.id,text=await file.text();
    if(serial!==importSerial||current.id!==actorId)return;
    loadText(text);$('wardrobe-json').value=JSON.stringify(wardrobe.exportConfig(),null,2);$('wardrobe-file').value='';
  }));
  $('wardrobe-export').addEventListener('click',guard(()=>{
    wardrobe.validate();const text=JSON.stringify(wardrobe.exportConfig(),null,2);$('wardrobe-json').value=text;
    const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=`${current.id}-wardrobe.json`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);update('已產生 JSON 下載，也已填入文字欄位。');
  }));
  document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>{
    const positions={front:[0,1.15,4],side:[4,1.15,0],back:[0,1.15,-4]};camera.position.set(...positions[button.dataset.camera]);controls.update();
  }));
  selectActor();
  document.querySelectorAll('aside button,aside select,aside input').forEach(n=>n.disabled=false);
  const resize=()=>{const {width,height}=view.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(view);resize();
  const renderFrame=()=>{if(destroyed)return;controls.update();renderer.render(scene,camera);};renderer.setAnimationLoop(renderFrame);
  window.addEventListener('pagehide',event=>{
    importSerial++;save();renderer.setAnimationLoop(null);if(event.persisted){suspended=true;return;}
    destroyed=true;wardrobe?.dispose();arms?.dispose();controls.dispose();observer.disconnect();
  });
  window.addEventListener('pageshow',event=>{
    if(!event.persisted||!suspended||destroyed)return;suspended=false;resize();controls.update();renderer.setAnimationLoop(renderFrame);
  });
  document.documentElement.dataset.wardrobeReady='true';
}catch(error){
  status.textContent=`工作台未啟動：${error.message}\n請使用開發伺服器並確認瀏覽器支援 WebGL。`;
  document.documentElement.dataset.wardrobeReady='error';console.error(error);
}
}
startWardrobe();
