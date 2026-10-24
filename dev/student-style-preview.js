/** 隔離雙視窗造型預覽，不載入 main，不讀寫 storage。 */
const $=id=>document.getElementById(id);
async function start(){
 try{
  const response=await fetch('../index.html');if(!response.ok)throw Error(`介面載入失敗 ${response.status}`);
  const doc=new DOMParser().parseFromString(await response.text(),'text/html');doc.querySelectorAll('script,style,link,iframe').forEach(n=>n.remove());
  const scaffold=document.createElement('div');scaffold.hidden=true;while(doc.body.firstChild)scaffold.appendChild(doc.body.firstChild);document.body.appendChild(scaffold);
  const THREE=await import('three');const {renderer}=await import('../src/core/engine.js');
  const {createStudentStylePair,studentStyleMetrics}=await import('./student-style-fixture.js');
  const {createActorPartsAdapter}=await import('../src/actors/actor-parts-adapter.js');
  const pair=createStudentStylePair();
  const scenes=pair.map(({actor})=>{
   const scene=new THREE.Scene();scene.background=new THREE.Color('#eef5f3');
   scene.add(new THREE.HemisphereLight('#bfe0ff','#a89a7a',.74));
   const sun=new THREE.DirectionalLight('#fff1d4',1.7);sun.position.set(.72,.6,.34);scene.add(sun);
   actor.g.position.set(0,0,0);actor.g.rotation.set(0,0,0);scene.add(actor.g);return scene;
  });
  const handles=pair.map(({entry})=>createActorPartsAdapter(entry));
  const camera=new THREE.PerspectiveCamera(35,1,.01,50);let viewName='front',time=0,paused=false,last=0,destroyed=false;
  const views={front:[0,1.05,3.6],side:[3.6,1.05,0],left:[-3.6,1.05,0],back:[0,1.05,-3.6],game:[4.5,5.5,7.5]};
  const setCamera=name=>{viewName=name;camera.position.set(...views[name]);camera.lookAt(0,.78,0);};setCamera('front');
  $('view').appendChild(renderer.domElement);
  function update(){
   $('status').textContent=pair.map(({variant,actor})=>`${variant}: ${JSON.stringify(studentStyleMetrics(actor.g))}`).join('\n');
  }
  function setParts(){for(const handle of handles){const card=handle.exportCard();for(const slot of Object.keys(card.parts))card.parts[slot]=$('parts').value;handle.loadCard(card);}update();}
  function reset(){handles.forEach(h=>h.reset());$('pose').value='idle';$('face').value='open';$('parts').value='default';time=0;paused=false;$('pause').textContent='暫停';setCamera('front');update();}
  document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>setCamera(b.dataset.camera));$('parts').onchange=setParts;$('reset').onclick=reset;
  $('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'播放':'暫停';};
  const resize=()=>{const r=$('view').getBoundingClientRect();renderer.setSize(Math.floor(r.width),Math.floor(r.height));camera.aspect=(r.width/2)/r.height;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe($('view'));resize();
  function frame(now){
   if(destroyed)return;const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(!paused)time+=dt;
   const phase=time*5.56,walk=$('pose').value==='walk',a=walk?1.3/3:0,s=Math.sin(phase);
   for(let i=0;i<pair.length;i++){
    const {actor:n}=pair[i],P=n.P;
    P.hipL.rotation.x=-s*.8*a;P.hipR.rotation.x=s*.8*a;
    P.shL.rotation.set(s*.9*a,0,-.12);P.shR.rotation.set(-s*.9*a,0,.12);
    if($('pose').value==='wave')P.shR.rotation.set(-.3,0,2.3+Math.sin(time*7)*.35);
    n.rig.position.y=walk?Math.abs(Math.cos(phase))*.06*a:0;
    P.fm.map=$('face').value==='panic'?P.fC:$('face').value==='closed'?P.fB:P.fA;
    handles[i].refresh();
   }
   const size=renderer.getSize(new THREE.Vector2()),half=Math.floor(size.x/2);renderer.setScissorTest(true);
   for(let i=0;i<2;i++){const width=i?size.x-half:half;renderer.setViewport(i*half,0,width,size.y);renderer.setScissor(i*half,0,width,size.y);renderer.render(scenes[i],camera);}
   renderer.setScissorTest(false);
  }
  window.__studentStyleTrial={pair,handles,reset,setCamera,renderEvidence:()=>{
   frame(performance.now());const gl=renderer.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight,pixels=new Uint8Array(width*height*4);
   gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const visiblePixels=[0,0];
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>18)visiblePixels[x<width/2?0:1]++;}
   return {contextLost:gl.isContextLost(),version:gl.getParameter(gl.VERSION),width,height,visiblePixels,lastViewportCalls:renderer.info.render.calls,lastViewportTriangles:renderer.info.render.triangles};
  },freeze:(seconds=0)=>{if(!Number.isFinite(seconds)||seconds<0)throw Error('無效時間');time=seconds;paused=true;$('pause').textContent='播放';},metrics:()=>pair.map(({actor})=>studentStyleMetrics(actor.g)),snapshot:()=>({view:viewName,pose:$('pose').value,face:$('face').value,parts:$('parts').value,time})};
  renderer.setAnimationLoop(frame);update();document.documentElement.dataset.studentStyleReady='true';
  window.addEventListener('pagehide',e=>{renderer.setAnimationLoop(null);if(!e.persisted){destroyed=true;observer.disconnect();handles.forEach(h=>h.dispose());}});
  window.addEventListener('pageshow',e=>{if(e.persisted&&!destroyed){last=0;resize();renderer.setAnimationLoop(frame);}});
 }catch(error){$('status').textContent=`預覽未啟動：${error.message}`;document.documentElement.dataset.studentStyleReady='error';console.error(error);}
}
start();
