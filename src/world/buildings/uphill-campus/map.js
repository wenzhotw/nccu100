/**
 * 山上校區地圖內容。
 *
 * 灰盒地形、道路、建築與擋土牆由純模型產生，這裡負責場景與碰撞接線。
 *
 * 跟室內一樣：build 期間用 block()、mk()、flat()、boxC() 加的東西，
 * 會自動搬進山上校區自己的場景與碰撞清單（core/rooms.js），不會出現在山下。
 * 第一次搭公車上山才會建立，遊戲一開始不會載入這裡的任何東西。
 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { BOX, GRAD, basic, block, canvasTex, flat, mk, plane, toon, vText, hText } from '../../../render/kit.js';
import { boxC, obbC } from '../../../core/collision.js';
import { BUS_SHELTER, R, SIZE, STOP } from './layout.js';
import { heightAt } from './terrain.js';
import { createGreybox, greyboxColliders, fenceRails } from './greybox.js';
import { zoneName } from './zone-names.js';
import { createLandmarks, landmarkColliders, landmarkSigns } from './landmarks.js';

import { buildCourtyardScenery, batchCourtyardScene } from './courtyard-scenery.js';
import {installLobbyRoof,signTextLayout} from './lobby.js';
import {createAnjiu,anjiuColliders} from './anjiu-interior.js';
import { buildZq10 } from './zq10.js';
import { buildShanju } from './shanju.js';
import { buildDorms } from './dorms.js';
import { createTaipeiView, VIEW, valleyDrop } from './taipei-view.js';
import { createSkyClock } from './day-night.js';
import { SIGN, createFireworks } from './fireworks.js';

/** 安九食堂：純模型加上招牌圖集、城市壁畫與方磚地板三張畫布貼圖。 */
export function buildAnjiu() {
  const group=createAnjiu();
  const font=size=>`900 ${size}px "Noto Sans TC",sans-serif`;
  group.traverse(o=>{
    if(!o.isMesh)return;
    if(o.material.isMeshToonMaterial)o.material.gradientMap=GRAD;
    if(o.name==='安九方磚地板') {
      // 米白方磚加淡淡的粉色雜磚（照片 9052）；貼圖座標依世界座標，每格 0.6 公尺。
      const tile=canvasTex(256,256,(g,w,h)=>{
        g.fillStyle='#ece7dc';g.fillRect(0,0,w,h);
        for(let i=0;i<4;i++)for(let j=0;j<4;j++){if((i*3+j)%7===2){g.fillStyle='#e8d5cf';g.fillRect(i*64,j*64,64,64);}}
        g.strokeStyle='#c9c3b6';g.lineWidth=3;for(let k=0;k<=4;k++){g.beginPath();g.moveTo(k*64,0);g.lineTo(k*64,h);g.moveTo(0,k*64);g.lineTo(w,k*64);g.stroke();}
      });
      tile.wrapS=tile.wrapT=THREE.RepeatWrapping;o.material=toon('#ffffff',{map:tile});
      const p=o.geometry.attributes.position,uv=o.geometry.attributes.uv;
      for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/2.4,p.getZ(i)/2.4);uv.needsUpdate=true;
    }
    if(o.userData.anjiuAtlas) {
      const tex=canvasTex(2048,1024,g=>o.userData.anjiuAtlas.forEach(({text,bg,fg,atlas,vertical})=>{
        g.fillStyle=bg;g.fillRect(atlas.x,atlas.y,atlas.w,atlas.h);
        g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=6;g.strokeRect(atlas.x+3,atlas.y+3,atlas.w-6,atlas.h-6);
        if(vertical) {
          // 直式招牌：一字一格由上往下排。
          const cell=atlas.h/text.length,size=Math.min(atlas.w*0.75,cell*0.8);
          g.font=font(size);g.textAlign='center';g.textBaseline='middle';g.fillStyle=fg;
          [...text].forEach((ch,i)=>g.fillText(ch,atlas.x+atlas.w/2,atlas.y+cell*(i+0.5)));return;
        }
        const layout=signTextLayout(text,atlas,(t,size)=>{g.font=font(size);return g.measureText(t).width;});
        g.font=font(layout.size);g.textAlign='center';g.textBaseline='middle';g.fillStyle=fg;g.fillText(layout.text,layout.x,layout.y);
      }));
      o.material=basic({map:tex});
    }
    if(o.userData.anjiuMural) {
      // 灰階城市天際線壁畫加水面倒影（照片 9064）。
      const tex=canvasTex(2048,320,(g,w,h)=>{
        g.fillStyle='#eef0ef';g.fillRect(0,0,w,h);let x=0,k=0;
        while(x<w){const bw=30+(k*37)%60,bh=60+(k*53)%150;g.fillStyle=['#9aa2a6','#7f878c','#b3b9bc','#6d757a'][k%4];
          g.fillRect(x,200-bh,bw,bh);g.globalAlpha=0.25;g.fillRect(x,200,bw,bh*0.5);g.globalAlpha=1;
          g.fillStyle='#e6ebec';for(let wy=210-bh;wy<190;wy+=14)for(let wx=x+5;wx<x+bw-6;wx+=10)g.fillRect(wx,wy,4,6);x+=bw+4;k++;}
      });
      o.material=basic({map:tex});
    }
  });
  scene.add(group);for(const c of anjiuColliders())obbC(c.cx,c.cz,c.hx,c.hz,c.th);
}

const SKY = '#bfe4f6';

/* ---------- 外圍山坡，校區地面由灰盒建立 ---------- */
function ground() {
  // 外圍（看得到但走不到）：比校區暗一點的山坡綠。
  // 北邊圖外是往台北市區下降的山谷（照片 9088、9100），地面一路往下掉，市景才會在腳下展開。
  const g = new THREE.PlaneGeometry(SIZE.w + 600, SIZE.d + 600, 48, 48).rotateX(-Math.PI / 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, -0.05 - valleyDrop(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, toon('#6fae5c')); m.receiveShadow = true; m.name = '圖外山坡'; scene.add(m);
}

/* ---------- 四周圍籬：木樁加兩條橫木（木樁用 InstancedMesh，手機也順） ---------- */
function fence() {
  const wood = toon('#a57a4f'), H = 1.1, gap = 2.5;
  const posts = [];
  for (let x = R.x0; x <= R.x1 + 0.01; x += gap) posts.push([x, R.z0], [x, R.z1]);
  for (let z = R.z0 + gap; z < R.z1 - 0.01; z += gap) posts.push([R.x0, z], [R.x1, z]);
  const inst = new THREE.InstancedMesh(BOX, wood, posts.length), o = new THREE.Object3D();
  posts.forEach(([x, z], i) => { o.position.set(x, heightAt(x, z) + H / 2, z); o.scale.set(0.18, H, 0.18); o.updateMatrix(); inst.setMatrixAt(i, o.matrix); });
  inst.name = '圍籬木樁'; inst.userData.noOcc = true; scene.add(inst);
  const rails = fenceRails();
  const bars = new THREE.InstancedMesh(BOX, wood, rails.length);
  rails.forEach(({ a, b, y }, i) => {
    o.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
    o.scale.set(Math.abs(b[0] - a[0]) || 0.08, 0.09, Math.abs(b[1] - a[1]) || 0.08);
    o.updateMatrix(); bars.setMatrixAt(i, o.matrix);
  });
  bars.name = '圍籬橫木'; bars.userData.noOcc = true; scene.add(bars);
}

/* ---------- 遠山：圍一圈綠色山丘，北邊高（往更高的山上），南邊低（看得到山下） ---------- */
function hills() {
  const geo = new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const cols = ['#4f9152', '#6aa85e', '#3f7d45', '#7fb36c'];
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, north = -Math.cos(a);           // a = 0 在南邊，往北越來越高
    const dist = Math.max(SIZE.w, SIZE.d) / 2 + 110 + (i % 3) * 20;
    // 觀景步道往北看是往台北市區下降的山谷與樹林（taipei-view.js），這個方向不放遠山，不擋住市景。
    const bearing = Math.atan2(Math.sin(a), -Math.cos(a)), city = Math.abs(bearing - VIEW.tower.bearing) < 80 * Math.PI / 180;
    if (city) continue;
    const h = 18 + Math.max(0, north) * 34 + (i % 2) * 8;
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: cols[i % cols.length], gradientMap: GRAD }));
    m.position.set(Math.sin(a) * dist, -1, Math.cos(a) * dist);
    m.scale.set(48 + (i % 4) * 10, h, 40 + (i % 3) * 8);
    m.userData.noOcc = true; scene.add(m);
  }
}

/* ---------- 山上公車站：候車亭、長椅、站牌 ---------- */
function busStop() {
  const start = scene.children.length, base = heightAt(STOP.x, STOP.z);
  const { x, z } = STOP, steel = '#7d8a96', roof = '#2f6f4f';
  // 候車亭：在站牌東邊建築退縮處，背對校區、面向車道（位置見 layout.js 的 BUS_SHELTER）
  const sx = BUS_SHELTER.x, sz = BUS_SHELTER.z;
  [-1.8, 1.8].forEach(dx => block(sx + dx, 1.25, sz - 0.9, 0.12, 2.5, 0.12, steel));
  block(sx, 2.55, sz - 0.3, 4.4, 0.14, 2.0, roof, 0.03);
  block(sx, 1.4, sz - 1.0, 3.8, 1.6, 0.05, toon('#cfe6ef', { transparent: true, opacity: 0.55 }));
  block(sx, 0.45, sz - 0.7, 3.2, 0.08, 0.5, '#8a6a42', 0.02);
  [-1.3, 1.3].forEach(dx => block(sx + dx, 0.22, sz - 0.7, 0.08, 0.44, 0.42, '#6b7178'));
  boxC(sx - 2, sx + 2, sz - 1.1, sz - 0.4, base + 2.5);
  // 站牌：和山下行政大樓乘車處同樣的綠底白字
  mk(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), toon('#9aa3ab'), x, 1.3, z, { out: 0.02 });
  const t = canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#2f6f4f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '900 40px "Noto Sans TC",sans-serif'; g.fillText('校園公車', w / 2, 56);
    g.font = '700 28px "Noto Sans TC",sans-serif'; g.fillText('山上校區站', w / 2, 96);
    g.fillStyle = '#f4f4ee'; g.fillRect(20, 116, w - 40, 184);
    g.fillStyle = '#2c3138'; g.font = '500 22px "Noto Sans TC",sans-serif'; g.textAlign = 'left';
    ['一路　往山下校區', '　行政大樓前下車', '　每 15 分一班', '　末班 22:00'].forEach((l, i) => g.fillText(l, 30, 152 + i * 38));
  });
  const board = block(x, 2.2, z, 0.9, 1.1, 0.06, '#2f6f4f', 0.02);
  [1, -1].forEach(s => { const p = plane(0.84, 1.04, basic({ map: t }), x, 2.2, z + s * 0.035, 0, s > 0 ? 0 : Math.PI); p.renderOrder = 1; });
  board.name = 'uphill-bus-sign';
  // 車道上的公車停靠區（黃線框）
  const c = '#f2c94c', bz = STOP.z + 3.2, bx0 = x - 6, bx1 = x + 6;
  flat(bx1 - bx0, 0.15, c, x, 0.04, bz - 0.8); flat(bx1 - bx0, 0.15, c, x, 0.04, bz + 0.8);
  flat(0.15, 1.6, c, bx0, 0.04, bz); flat(0.15, 1.6, c, bx1, 0.04, bz);
  scene.children.slice(start).forEach(object => { object.position.y += base; });
}

/** 場景與碰撞的登記入口，純模型留在 greybox.js 供離線驗收。 */
export function buildGreybox() {
  const group = createGreybox();
  // 純幾何模組不載入 WebGL 引擎，進場時接上工具箱共用的卡通光階與畫布磚紋。
  const brick = canvasTex(256, 256, (g,w,h) => {
    g.fillStyle='#fff4e5';g.fillRect(0,0,w,h);
    g.strokeStyle='#b9a99b';g.lineWidth=3;
    for(let row=0;row<4;row++) for(let col=-1;col<4;col++) g.strokeRect(col*128+(row%2)*64,row*64,128,64);
  }, [1,1]);
  group.traverse(o => {
    if(o.isMesh && o.material.isMeshToonMaterial) o.material.gradientMap=GRAD;
    if(o.userData.brick || ['東側人行道','九舍磚砌踏面'].includes(o.name)) {
      o.material.map=brick;
      const p=o.geometry.attributes.position;
      const uv=new THREE.Float32BufferAttribute(new Float32Array(p.count*2),2);
      o.geometry.setAttribute('uv',uv);
      for(let i=0;i<p.count;i++) uv.setXY(i,p.getX(i),p.getZ(i));
      uv.needsUpdate=true;
    }
  });
  const tile=canvasTex(256,256,(g,w,h)=>{
    g.fillStyle='#f4eee0';g.fillRect(0,0,w,h);g.strokeStyle='#a6aaa4';g.lineWidth=2;
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){if((i+j)%2===0){g.fillStyle='#e2ddd2';g.fillRect(i*64,j*64,64,64);}g.strokeRect(i*64,j*64,64,64);}
  });
  group.traverse(o=>{
    // 只有大廳主地板貼方磚紋；開口下層已用頂點色烘好天窗光斑。
    if(o.isMesh&&o.name==='米白方磚地板') {
      o.material=toon('#ffffff',{map:tile});
      const p=o.geometry.attributes.position,uv=new THREE.Float32BufferAttribute(new Float32Array(p.count*2),2);
      for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/2,p.getY(i)/2);o.geometry.setAttribute('uv',uv);
    }
    if(o.userData.signAtlas) {
      // hText 會把字平均拉滿整格，兩字的窄牌會左右交疊，這裡整串置中繪製。
      const font=size=>`700 ${size}px "Noto Sans TC",sans-serif`;
      const tex=canvasTex(2048,512,(g)=>o.userData.signAtlas.forEach(({text,atlas})=>{
        const layout=signTextLayout(text,atlas,(t,size)=>{g.font=font(size);return g.measureText(t).width;});
        g.font=font(layout.size);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#385846';
        g.shadowColor='rgba(0,0,0,.3)';g.shadowOffsetY=3;g.fillText(layout.text,layout.x,layout.y);
      }));o.material=basic({map:tex,transparent:true});
    }
  });
  for(const [name,text,vertical] of [['九舍大廳橫幅','政大學生宿舍歡迎您',false],['九舍大廳直式牌','自強第九宿舍',true]]) {
    const sign=group.getObjectByName(name);
    const tex=vertical?vText(text,'#385846','700 54px "Noto Sans TC",sans-serif',96,64)
      :hText(text,'#385846','700 52px "Noto Sans TC",sans-serif',1024,80,64);
    sign.material=basic({map:tex,transparent:true});
  }
  scene.add(group);
  for (const c of greyboxColliders()) obbC(c.cx, c.cz, c.hx, c.hz, c.th);
}

/** 純模型與碰撞接入場景，只有此處需要瀏覽器的文字畫布。 */
export function buildLandmarks() {
  const group = createLandmarks(); scene.add(group);
  for (const c of landmarkColliders()) obbC(c.cx, c.cz, c.hx, c.hz, c.th);
  for (const sign of landmarkSigns()) {
    const board = group.getObjectByName(`指路牌：${sign.anchor}`);
    for (const { side, text } of sign.faces) {
      const texture = sign.anchor==='九舍樓梯下'
        ? vText(text.replace(/[ ・]/g,''),'#fff8df','900 68px "Noto Sans TC",sans-serif',128,68)
        : canvasTex(512, 128, (g, w, h) => {
        g.fillStyle = sign.color; g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff8df'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '700 36px "Noto Sans TC",sans-serif';
        g.fillText(text, w / 2, h / 2, w - 32);
      });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(sign.width - 0.08, sign.height - 0.08), basic({ map: texture }));
      face.name = `指路文字：${sign.anchor}`;
      face.position.set(0, 2.05, side * 0.076); face.rotation.y = side > 0 ? 0 : Math.PI;
      board.add(face);
    }
  }
}

/** 台北市景：純模型接上卡通光階，大樓貼一張窗格貼圖（每棟各自拉伸，遠看就是一排排窗）。 */
function taipei() {
  const group = createTaipeiView();
  const windows = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9d2d8';
    for (let y = 6; y < h - 4; y += 12) for (let x = 5; x < w - 4; x += 14) g.fillRect(x, y, 9, 6);
  });
  // 夜裡亮燈的窗：黑底上大約一半的窗格是暖黃色，當自發光貼圖，天黑時調亮。
  const lit = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#000000'; g.fillRect(0, 0, w, h);
    let k = 0;
    for (let y = 6; y < h - 4; y += 12) for (let x = 5; x < w - 4; x += 14) {
      if ((k++ * 7) % 11 < 6) { g.fillStyle = k % 3 ? '#ffd98a' : '#fff1c8'; g.fillRect(x, y, 9, 6); }
    }
  });
  group.traverse(o => {
    if (!o.isMesh) return;
    o.material.gradientMap = GRAD;
    if (o.userData.cityWindows) {
      o.material.map = windows; o.material.emissive = new THREE.Color('#ffffff'); o.material.emissiveMap = lit;
      o.material.emissiveIntensity = 0; night.city = o.material;
    }
    if (o.name === '台北101') { o.material.emissive = new THREE.Color('#4fd1c5'); o.material.emissiveIntensity = 0; night.tower = o.material; }
  });
  scene.add(group);
}

/* ---------- 日夜與跨年煙火 ---------- */
/** 山上校區的天色時鐘（index.js 的天色按鈕也用這一個）。 */
export const skyClock = createSkyClock();
/** 夜裡要調亮的材質與場景燈光，建好場景後才填入。 */
const night = { city: null, tower: null, scene: null, hemi: null, sun: null };
export const fireworks = createFireworks();

/** 觀景步道告示牌：兩根木柱夾一塊深綠板，雙面寫煙火說明，立在路的上坡側。 */
function fireworksSign() {
  const g = new THREE.Group(); g.name = '跨年煙火告示牌';
  g.position.set(SIGN.x, heightAt(SIGN.x, SIGN.z), SIGN.z); g.rotation.y = SIGN.yaw; scene.add(g);
  // 木柱夾在板子左右兩側，不擋到雙面的字。
  for (const dx of [-0.97, 0.97]) block(dx, 1.0, 0, 0.12, 2.0, 0.12, '#8a6a42', 0.015, g);
  block(0, 1.45, 0, 1.8, 1.05, 0.08, '#24563e', 0.02, g);
  const tex = canvasTex(512, 300, (c, w, h) => {
    c.fillStyle = '#24563e'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#f2c94c'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#ffe9a8'; c.font = '900 56px "Noto Sans TC",sans-serif'; c.fillText('台北 101 跨年煙火', w / 2, 82, w - 60);
    c.fillStyle = '#fff8df'; c.font = '700 34px "Noto Sans TC",sans-serif';
    c.fillText('天黑以後在這裡按互動', w / 2, 170, w - 60); c.fillText('就能看 101 施放煙火', w / 2, 222, w - 60);
  });
  for (const side of [1, -1]) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.96), basic({ map: tex }));
    face.position.set(0, 1.45, side * 0.045); face.rotation.y = side > 0 ? 0 : Math.PI; g.add(face);
  }
  obbC(SIGN.x, SIGN.z, 1.05, 0.12, SIGN.yaw);
}

/** 煙火亮點畫成中心亮、外圈淡的圓點。 */
function fireworksShow() {
  fireworks.points.material.map = canvasTex(64, 64, (c, w, h) => {
    const r = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.7)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = r; c.fillRect(0, 0, w, h);
  });
  scene.add(fireworks.points);
}

/** 每一幀依遊戲時間更新天色、台北夜景亮度與煙火（index.js 的 update 呼叫）。 */
export function updateMap(time) {
  const k = skyClock.sample(time);
  if (night.scene) {
    night.scene.background.set(k.sky); night.scene.fog.color.set(k.fog);
    night.hemi.color.set(k.hemiSky); night.hemi.groundColor.set(k.hemiGround); night.hemi.intensity = k.hemi;
    night.sun.color.set(k.sunColor); night.sun.intensity = k.sun;
  }
  if (night.city) night.city.emissiveIntensity = k.night * 0.95;
  if (night.tower) night.tower.emissiveIntensity = k.night * 0.45;
  fireworks.update(time);
}

/** 建立山上校區（第一次搭公車上山時呼叫一次） */
export function buildMap() {
  ground();
  fence();
  hills();
  busStop();
  buildGreybox();
  buildLandmarks();
  buildZq10();
  buildShanju();
  buildDorms();
  taipei();
  fireworksSign();
  fireworksShow();
  const scenery=buildCourtyardScenery();
  batchCourtyardScene(scene.getObjectByName('山上校區灰盒'),scenery);
}

/** 燈光與天空：跟山下差不多的明亮白天，加一點霧讓遠山變淡 */
export function mapLight(s) {
  installLobbyRoof(s);
  s.background = new THREE.Color(SKY);
  s.fog = new THREE.Fog(SKY, 90, 320);
  const hemi = new THREE.HemisphereLight('#eaf6ff', '#7aa060', 0.95);
  s.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e2', 0.85);
  sun.position.set(40, 80, 30); s.add(sun);
  // 日夜時鐘每一幀改這兩盞既有的燈與天空、霧的顏色，不另外加燈（updateMap）。
  Object.assign(night, { scene: s, hemi, sun });
}

/** 角色腳底與灰盒使用同一份地形高度。 */
export function mapHeight(x, z) {
  return heightAt(x, z);
}

/** 地標、通路、建築與平台共用同一份區域名稱判斷。 */
export function mapZone(p) {
  return zoneName(p);
}
