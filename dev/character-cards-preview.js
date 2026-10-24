/** 隔離設定卡工作台，不載 main、不變更正式 save 或 wardrobe storage。 */
const $=id=>document.getElementById(id),status=$('status');
async function start(){
 try{
  const response=await fetch('../index.html');if(!response.ok)throw Error(`介面載入失敗 ${response.status}`);
  const doc=new DOMParser().parseFromString(await response.text(),'text/html');doc.querySelectorAll('script,style,link,iframe').forEach(n=>n.remove());
  const scaffold=document.createElement('div');scaffold.hidden=true;while(doc.body.firstChild)scaffold.appendChild(doc.body.firstChild);document.body.appendChild(scaffold);
  const THREE=await import('three'),{OrbitControls}=await import('three/examples/jsm/controls/OrbitControls.js');
  const {renderer}=await import('../src/core/engine.js'),{addNPC}=await import('../src/actors/npc.js');
  const {toon,OUT,canvasTex}=await import('../src/render/kit.js');
  const {costumeLook}=await import('../src/systems/baozhong/npc-costume-profiles.js'),{mountNpcCostume}=await import('../src/systems/baozhong/npc-costumes.js');
  const {CHARACTER_CARD_CATALOG,CHARACTER_CARD_PREVIEW_KEY,validateCharacterCard}=await import('../src/actors/character-card-config.js');
  const {createCharacterCardActor}=await import('../src/actors/character-card-actor.js'),{default:bz}=await import('../src/content/baozhong.json');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#eef5f3');scene.add(new THREE.HemisphereLight('#fff7e8','#a7c9ba',1.3));
  const light=new THREE.DirectionalLight('#fff4df',1.8);light.position.set(-3,5,4);scene.add(light);
  const camera=new THREE.PerspectiveCamera(35,1,.01,30);camera.position.set(2.4,1.5,3.6);
  const view=$('view');view.appendChild(renderer.domElement);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.8,0);controls.enablePan=false;controls.minDistance=1.3;controls.maxDistance=7;controls.maxPolarAngle=Math.PI*.49;controls.update();
  const actors=new Map();let actor,handle,destroyed=false,suspended=false;
  const labels={top:'上衣',bottom:'褲裝',dress:'長袍／和服',headwear:'髮飾／假髮',custom:'腰帶／領巾','hand.L':'左手道具'};
  for(const [id,def] of Object.entries(CHARACTER_CARD_CATALOG)){
   const o=document.createElement('option');o.value=id;o.textContent=def.label;$('actor').appendChild(o);
   const booth=bz.booths.find(b=>`bz26-${b.id}`===id);
   const n=addNPC({id,home:{x:0,z:0},look:costumeLook(id,booth.npc.look),dialog:[{lines:['人物設定卡預覽']}]});mountNpcCostume(n,{toon,OUT,canvasTex,groundH:()=>0});n.g.removeFromParent();actors.set(id,n);
  }
  function update(message){
   const card=handle.exportCard();for(const select of $('parts').querySelectorAll('select'))select.value=card.parts[select.dataset.slot];
   document.documentElement.dataset.characterCard=JSON.stringify(card);delete document.documentElement.dataset.cardError;status.textContent=message;
  }
  function guard(fn){return()=>{try{fn();}catch(error){status.textContent=`未完成：${error.message}`;document.documentElement.dataset.cardError=error.message;try{const card=handle?.exportCard();if(card)for(const select of $('parts').querySelectorAll('select'))select.value=card.parts[select.dataset.slot];}catch{document.querySelectorAll('aside button,aside select').forEach(n=>n.disabled=true);}console.error(error);}};}
  const key=()=>`${CHARACTER_CARD_PREVIEW_KEY}.${actor.id}`;
  function apply(card){handle.loadCard(card,{commit:()=>localStorage.setItem(key(),JSON.stringify(card))});update('設定卡已裝配並保存於本機。');}
  function pose(){
   const name=$('pose').value;for(const k of ['shL','shR','hipL','hipR'])actor.P[k].rotation.set(0,0,0);
   actor.state=name==='walk'?'walk':'idle';
   if(name==='walk'){actor.P.shL.rotation.x=.5;actor.P.shR.rotation.x=-.5;actor.P.hipL.rotation.x=-.45;actor.P.hipR.rotation.x=.45;}
   if(name==='wave'){actor.P.shR.rotation.z=-2.3;actor.P.shR.rotation.x=-.2;}
   actor.after?.(actor,0);handle.refresh();document.documentElement.dataset.cardPose=name;
  }
  function selectActor(){
   handle?.dispose();handle=null;if(actor)scene.remove(actor.g);actor=actors.get($('actor').value);actor.g.position.set(0,0,0);actor.g.rotation.set(0,0,0);scene.add(actor.g);
   handle=createCharacterCardActor(actor);$('parts').replaceChildren();
   for(const [slot,id] of Object.entries(CHARACTER_CARD_CATALOG[actor.id].parts)){
    const label=document.createElement('label');label.textContent=labels[slot];const select=document.createElement('select');select.dataset.slot=slot;label.appendChild(select);
    for(const [value,text] of [['default','原樣'],['none','卸下'],[id,`裝配：${id}`]]){const o=document.createElement('option');o.value=value;o.textContent=text;select.appendChild(o);}
    select.addEventListener('change',guard(()=>{const card=handle.exportCard();card.parts[slot]=select.value;apply(card);}));$('parts').appendChild(label);
   }
   let message='原始外觀，未新增零件。';try{const saved=localStorage.getItem(key());if(saved){handle.loadCard(saved);message='已載回本機設定卡。';}}catch(error){message=`保存內容未載入：${error.message}`;}
   $('pose').value='neutral';pose();update(message);
  }
  $('actor').addEventListener('change',guard(selectActor));$('pose').addEventListener('change',guard(pose));
  $('reset').addEventListener('click',guard(()=>{handle.reset({commit:()=>localStorage.removeItem(key())});$('pose').value='neutral';pose();update('已還原原始外觀，刪除本機設定卡。');}));
  $('import').addEventListener('click',guard(()=>apply(validateCharacterCard($('json').value,actor.id))));
  $('export').addEventListener('click',guard(()=>{const text=JSON.stringify(handle.exportCard(),null,2);$('json').value=text;const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${actor.id}-character-card.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
  for(const [name,pos] of Object.entries({front:[0,1.15,4],side:[4,1.15,0],back:[0,1.15,-4]}))$(name).addEventListener('click',()=>{camera.position.set(...pos);controls.update();});
  selectActor();document.querySelectorAll('aside button,aside select').forEach(n=>n.disabled=false);
  const resize=()=>{const {width,height}=view.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(view);resize();
  const frame=()=>{if(destroyed)return;controls.update();renderer.render(scene,camera);};renderer.setAnimationLoop(frame);
  window.addEventListener('pagehide',event=>{renderer.setAnimationLoop(null);if(event.persisted){suspended=true;return;}destroyed=true;handle?.dispose();controls.dispose();observer.disconnect();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&suspended&&!destroyed){suspended=false;resize();renderer.setAnimationLoop(frame);}});
  document.documentElement.dataset.cardReady='true';
 }catch(error){status.textContent=`預覽未啟動：${error.message}。請重整並確認網路與 WebGL。`;document.documentElement.dataset.cardReady='error';console.error(error);}
}
start();
