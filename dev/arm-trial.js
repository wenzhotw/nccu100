/** 四角色上肢隔離開發頁。重用真實建構器，不載入正式遊戲動畫或存檔流程。 */
const $ = id => document.getElementById(id);
const status = $('trial-status');
async function startPreview() {
try {
  // 沿用遊戲依賴的 DOM 契約，但不執行 index 的 script、樣式或主入口。
  const response = await fetch('../index.html');
  if (!response.ok) throw new Error(`無法讀取遊戲介面：${response.status}`);
  const source = new DOMParser().parseFromString(await response.text(), 'text/html');
  source.querySelectorAll('script,style,link,iframe').forEach(n => n.remove());
  const scaffold = document.createElement('div'); scaffold.hidden = true;
  scaffold.id = 'trial-game-scaffold';
  while (source.body.firstChild) scaffold.appendChild(source.body.firstChild);
  document.body.appendChild(scaffold);
  const THREE = await import('three');
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
  const { renderer } = await import('../src/core/engine.js');
  const { NPCS, addNPC } = await import('../src/actors/npc.js');
  const { player, rig, H, headCenter } = await import('../src/actors/player.js');
  const { toon, OUT, canvasTex } = await import('../src/render/kit.js');
  const { costumeLook } = await import('../src/systems/baozhong/npc-costume-profiles.js');
  const { mountNpcCostume } = await import('../src/systems/baozhong/npc-costumes.js');
  const { activateArticulatedArms } = await import('../src/actors/articulated-arms.js');
  const { default: bz } = await import('../src/content/baozhong.json');
  const inputs = new Map();
  const addInput = n => inputs.set(n.id, {id:n.id,root:n.g,body:n.rig,joints:n.P,headCenter:n.P.head});
  addInput(NPCS.find(n => n.id === 'chiang'));
  inputs.set('player', {id:'player',root:player,body:rig,joints:H,headCenter});
  for (const id of ['D12','D23']) {
    const b = bz.booths.find(b => b.id === id);
    const n = addNPC({id:`bz26-${id}`,home:{x:0,z:0},look:costumeLook(`bz26-${id}`,b.npc.look),dialog:[{lines:['上肢試點預覽']}]});
    mountNpcCostume(n, {toon,OUT,canvasTex,groundH:()=>0}); addInput(n);
  }
  const view = $('trial-viewport'); view.prepend(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#eef5f3');
  scene.add(new THREE.HemisphereLight('#fff7e8','#a7c9ba',1.3));
  const sun = new THREE.DirectionalLight('#fff4df',1.8); sun.position.set(-3,5,4); scene.add(sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.65,64),toon('#d5e6dd'));
  floor.rotation.x=-Math.PI/2; floor.position.y=-0.015; scene.add(floor);
  const camera = new THREE.PerspectiveCamera(35,1,0.01,30);
  camera.position.set(2.4,1.5,3.6);
  const controls = new OrbitControls(camera,renderer.domElement); controls.target.set(0,0.8,0);
  controls.minDistance=1.3;controls.maxDistance=7;controls.maxPolarAngle=Math.PI*0.49;controls.enablePan=false;controls.enableDamping=true;
  let activeInput, handle, enabled=true, moving=false, destroyed=false, suspended=false;
  const updateStatus = () => {
    document.documentElement.dataset.armTrialCharacter=activeInput.id;
    document.documentElement.dataset.armTrialMode=enabled?'articulated':'legacy';
    document.documentElement.dataset.armTrialPose=enabled?$('trial-pose').value:'neutral';
    status.textContent=`${activeInput.id}\n${enabled?'上肢試點啟用':'原版中立對照'} · ${enabled?$('trial-pose').selectedOptions[0].textContent:'中立'}\n手肘可彎曲；手部掛點跟隨前臂。`;
    $('trial-toggle').textContent=enabled?'切換原版中立對照':'啟用上肢試點';
    $('trial-pose').disabled=!enabled; $('trial-bend').disabled=!enabled; $('trial-motion').disabled=!enabled;
    $('trial-motion').textContent=moving?'停止連續彎曲':'播放連續手肘彎曲';
  };
  const setPose = () => {
    moving=false;
    if (handle) handle.setPose($('trial-pose').value);
    $('trial-bend').value='0'; $('trial-angle').textContent='依姿勢設定'; updateStatus();
  };
  const selectCharacter = () => {
    moving=false; handle?.dispose(); handle=null;
    if (activeInput) scene.remove(activeInput.root);
    activeInput=inputs.get($('trial-character').value);
    activeInput.root.position.set(0,0,0);activeInput.root.rotation.set(0,0,0);
    scene.add(activeInput.root);
    if(enabled) handle=activateArticulatedArms(activeInput);
    setPose();
  };
  const guard = fn => () => {try {fn();} catch(error) {moving=false;status.textContent=`驗收中止：${error.message}`;console.error(error);} };
  $('trial-character').addEventListener('change',guard(selectCharacter));
  $('trial-pose').addEventListener('change',guard(setPose));
  $('trial-toggle').addEventListener('click',guard(()=>{enabled=!enabled;selectCharacter();}));
  $('trial-motion').addEventListener('click',guard(()=>{moving=!moving;updateStatus();}));
  $('trial-bend').addEventListener('input',guard(()=>{
    moving=false;const angle=Number($('trial-bend').value);handle.elbows.L.rotation.x=handle.elbows.R.rotation.x=-angle*Math.PI/180;
    $('trial-angle').textContent=`${angle}°`;updateStatus();
  }));
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
    const positions={front:[0,1.15,4],side:[4,1.15,0],back:[0,1.15,-4]};camera.position.set(...positions[button.dataset.view]);controls.update();
  }));
  $('trial-reset').addEventListener('click',guard(()=>{
    $('trial-pose').value='neutral';enabled=true;selectCharacter();camera.position.set(2.4,1.5,3.6);controls.target.set(0,0.8,0);controls.update();
  }));
  document.querySelectorAll('aside button, aside select, aside input').forEach(n=>n.disabled=false);
  selectCharacter();
  const resize = () => {const {width,height}=view.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(view);resize();
  const renderFrame = time=>{
    if(destroyed)return;
    if(moving&&handle){const angle=(Math.sin(time/500)+1)*Math.PI/4;handle.elbows.L.rotation.x=handle.elbows.R.rotation.x=-angle;$('trial-angle').textContent=`${Math.round(angle*180/Math.PI)}°`;}
    controls.update();renderer.render(scene,camera);
  };
  renderer.setAnimationLoop(renderFrame);
  // bfcache 會保留整頁。暫停而非拆掉控制器，返回時恢復同一個迴圈與角色狀態。
  window.addEventListener('pagehide',event=>{
    renderer.setAnimationLoop(null);
    if(event.persisted){suspended=true;return;}
    destroyed=true;handle?.dispose();controls.dispose();observer.disconnect();
  });
  window.addEventListener('pageshow',event=>{
    if(!event.persisted||!suspended||destroyed)return;
    suspended=false;resize();controls.update();renderer.setAnimationLoop(renderFrame);
  });
  document.documentElement.dataset.armTrialReady='true';
} catch(error) {
  status.textContent=`預覽未啟動：${error.message}\n請使用 npm run dev 開啟此頁，並確認瀏覽器支援 WebGL。`;
  document.documentElement.dataset.armTrialReady='error'; console.error(error);
}

}
startPreview();
