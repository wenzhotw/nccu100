/**
 * 天氣系統：中正圖書館前的石獅子跳下台座說「天黑黑，欲落雨」，不管回什麼都會下雨。
 *
 * 下雨時：
 *   - 眼前出現一把不知道是誰的雨傘。撐起來就不會淋濕，但幾秒後駐校警察會衝過來說你偷傘：
 *       跟他走 → 結局「偷傘被抓」；拒絕 → 寶可夢式戰鬥（吃甜甜圈、開你闖馬路紅單、睡覺）
 *   - 沒撐傘：畫面上方出現體力條，在室外淋雨會一直扣，扣到 0 就結局「全身濕透了」，重新開始
 *   - 在四維道上走路，隨時可能踩到會噴水的磁磚，鞋子濕掉被迫回家，遊戲結束
 *
 * 台詞、數值、戰鬥招式都在 src/content/weather.json。
 * 石獅子是中正圖書館模型裡名為「石獅-左／右」的群組，這裡用名稱找，不直接 import 建築。
 */
import * as THREE from 'three';
import { state } from '../../core/state.js';
import { scene } from '../../core/engine.js';
import { AU } from '../audio.js';
import { SPH, mk, toon } from '../../render/kit.js';
import { NPCS, cop } from '../../actors/npc.js';
import { rig } from '../../actors/player.js';
import { groundH, indoor, lerpA, pos, spots, vel, zoneOf } from '../../core/gameplay.js';
import { dlg, openDialog, toast } from '../../ui/dialog.js';
import { openChoice } from '../../ui/choice.js';
import { showEnding } from '../../ui/ending.js';
import { closeBattle, startBattle } from '../battle/index.js';
import { hemi, sky, sun, clouds } from '../../world/environment/sky.js';
import { copSVG } from './cop-svg.js';
import W from '../../content/weather.json';
import { createStoryClock, festivalStoriesPaused } from '../festival-story-pause.js';
const storyClock = createStoryClock(state);
// 會場同步移除原 NPC 前也不能讓追傘警察抵達並消耗 onCatch。
if (cop) cop.pauseWhen = () => festivalStoriesPaused(state);

const $el = (tag, css, parent = document.body) => { const e = document.createElement(tag); e.style.cssText = css; parent.appendChild(e); return e; };

/* ---------- 雨：跟著主角的一大片雨絲 ---------- */
const N = 1800, BOX = 44, TOP = 26;
const rainGeo = new THREE.BufferGeometry(), rp = new Float32Array(N * 6);
for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * BOX, y = Math.random() * TOP, z = (Math.random() - 0.5) * BOX; rp.set([x, y, z, x + 0.06, y - 0.7, z + 0.03], i * 6); }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#dfeaf5', transparent: true, opacity: 0, depthWrite: false }));
rain.frustumCulled = false; rain.visible = false; rain.userData.noOcc = true; scene.add(rain);

// 天色變暗：天空球的 shader 加一個 gloom 參數（不用改 sky.js）
sky.material.uniforms.gloom = { value: 0 };
sky.material.fragmentShader = sky.material.fragmentShader
  .replace('uniform vec3 sunDir;', 'uniform vec3 sunDir;uniform float gloom;')
  .replace('gl_FragColor=vec4(c,1.0);', 'c=mix(c,vec3(0.47,0.52,0.58)*(0.75+0.25*d.y),gloom);gl_FragColor=vec4(c,1.0);');
sky.material.needsUpdate = true;
const base = { hemi: hemi.intensity, sun: sun.intensity, fog: scene.fog.color.clone(), near: scene.fog.near, far: scene.fog.far };
const cloudMats = [...new Set(clouds.flatMap(g => g.children.map(m => m.material)))].map(m => ({ m, c: m.color.clone(), e: m.emissive.clone() }));
const GLOOM_FOG = new THREE.Color('#8f9aa5'), GREY = new THREE.Color('#7d8792');
let gloom = 0;
function applyGloom(k) {
  sky.material.uniforms.gloom.value = k;
  hemi.intensity = base.hemi * (1 - 0.35 * k); sun.intensity = base.sun * (1 - 0.7 * k);
  scene.fog.color.copy(base.fog).lerp(GLOOM_FOG, k); scene.fog.near = base.near * (1 - 0.6 * k); scene.fog.far = base.far * (1 - 0.5 * k);
  cloudMats.forEach(o => { o.m.color.copy(o.c).lerp(GREY, k); o.m.emissive.copy(o.e).lerp(GREY, k * 0.6); });
}

/* ---------- 畫面上方的體力條、閃電 ---------- */
const hpBox = $el('div', 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);z-index:40;display:none;align-items:center;gap:10px;padding:8px 14px;background:rgba(255,250,240,.94);border:3px solid #3e2c1a;border-radius:999px;font:900 15px "Noto Sans TC",sans-serif;color:#3e2c1a;box-shadow:0 4px 0 rgba(62,44,26,.3);pointer-events:none');
const hpLabel = $el('span', '', hpBox); hpLabel.textContent = W.rain.hpLabel;
const hpBar = $el('div', 'width:min(220px,46vw);height:14px;border-radius:999px;background:#e5dccb;border:2px solid #3e2c1a;overflow:hidden', hpBox);
const hpFill = $el('i', 'display:block;height:100%;width:100%;background:linear-gradient(#7fd17a,#3f9a4f);transition:width .25s', hpBar);
const hpNum = $el('span', 'min-width:3.2em;text-align:right', hpBox);
// 陰天的色調：蓋在 3D 畫面上、HUD 底下的一層半透明藍灰
const tint = $el('div', 'position:absolute;inset:0;pointer-events:none;background:#24344a;opacity:0', document.getElementById('stage'));
const flash = $el('div', 'position:fixed;inset:0;z-index:35;background:#fff;opacity:0;pointer-events:none;transition:opacity .5s');

/* ---------- 雨傘：地上那一把、撐起來那一把 ---------- */
function makeUmbrella(color = '#5b8ed6') {
  const g = new THREE.Group();
  const can = mk(new THREE.ConeGeometry(0.78, 0.36, 8, 1, true), toon(color, { side: THREE.DoubleSide }), 0, 0, 0, { parent: g, out: 0.02 });
  for (let i = 0; i < 8; i += 2) { const s = mk(new THREE.ConeGeometry(0.79, 0.37, 8, 1, true, i * Math.PI / 4, Math.PI / 4), toon('#f4f4ee', { side: THREE.DoubleSide }), 0, 0, 0, { parent: g }); s.castShadow = false; }
  mk(SPH, toon('#3a3d45'), 0, 0.2, 0, { parent: g }).scale.setScalar(0.04);
  mk(new THREE.CylinderGeometry(0.018, 0.018, 1.0, 6), toon('#3a3d45'), 0, -0.5, 0, { parent: g });
  const hook = mk(new THREE.TorusGeometry(0.06, 0.02, 6, 12, Math.PI), toon('#8a5a2e'), 0.06, -1.0, 0, { parent: g }); hook.rotation.z = Math.PI;
  can.castShadow = true;
  return g;
}
const held = makeUmbrella(); held.position.set(0.31, 1.72, 0.03); held.rotation.z = 0.12; held.visible = false; rig.add(held);
const ground = makeUmbrella(); ground.visible = false; scene.add(ground);
const umbrellaSpot = { x: 0, z: 0, r: 2.2, label: W.umbrella.label, ok: () => !festivalStoriesPaused(state) && ground.visible && !state.driving && !state.holdPang, fn: takeUmbrella };
spots.push(umbrellaSpot);

/* ---------- 下雨時路上的人都撐傘（騎馬的老校長和室內的人除外） ---------- */
const NPC_COLORS = ['#e8463c', '#f0c94a', '#5b8ed6', '#9fd6c2', '#f39ac0', '#2f7a4f', '#8a6ad0'];
let npcUmbrellas = [];
function giveNpcUmbrellas() {
  NPCS.forEach((n, i) => {
    if (n.umbrella || n.id === 'old-principal' || n.indoorNPC) return;
    const u = makeUmbrella(NPC_COLORS[i % NPC_COLORS.length]); u.position.set(0.34, 1.74, 0.03); u.rotation.z = 0.12; u.visible = false; n.rig.add(u); n.umbrella = u;
    npcUmbrellas.push(u);
  });
}

/* ---------- 狀態 ---------- */
let raining = false, rainT = 0, hp = 100, holding = false, over = false, lionNext = 0, rainTick = 0, tileT = 0;

function setHP(v) {
  hp = Math.max(0, Math.min(100, v));
  hpFill.style.width = hp + '%'; hpNum.textContent = Math.ceil(hp);
  hpFill.style.background = hp > 50 ? 'linear-gradient(#7fd17a,#3f9a4f)' : hp > 20 ? 'linear-gradient(#f6d465,#e0a92e)' : 'linear-gradient(#f28b7d,#d8433f)';
}
function startRain() {
  if (festivalStoriesPaused(state)) return;
  raining = true; rainT = W.rain.seconds; setHP(100); hpBox.style.display = 'flex'; rain.visible = true;
  AU.sfx('thunder'); flash.style.transition = 'none'; flash.style.opacity = 0.85;
  requestAnimationFrame(() => { flash.style.transition = 'opacity .9s'; flash.style.opacity = 0; });
  toast(W.rain.start);
  // 眼前出現一把雨傘
  storyClock.after(() => {
    if (!raining || holding) return;
    const a = state.yaw;
    const fx = -Math.sin(state.yaw), fz = -Math.cos(state.yaw);
    const x = pos.x + fx * 3, z = pos.z + fz * 3;
    ground.position.set(x, groundH(x, z) + 0.35, z); ground.rotation.set(0.5, a, 0.3); ground.visible = true;
    umbrellaSpot.x = x; umbrellaSpot.z = z; AU.sfx('chime'); toast(W.umbrella.appear);
  }, 1800);
}
function stopRain() {
  raining = false; hpBox.style.display = 'none'; ground.visible = false;
  if (holding) { holding = false; held.visible = false; toast(W.umbrella.returned); } else toast(W.rain.stop);
  lionNext = storyClock.now() + W.lion.cooldownSeconds * 1000;
}
function gameOver(e) { if (over) return; over = true; closeBattle(); showEnding({ title: e.title, sub: e.sub, tone: 'dark' }); }

/* ---------- 撿傘 → 警察 ---------- */
function takeUmbrella() {
  if (festivalStoriesPaused(state)) return;
  ground.visible = false; holding = true; held.visible = true; AU.sfx('grab'); toast(W.umbrella.taken);
  storyClock.after(sendCop, W.umbrella.copDelaySeconds * 1000);
}
function sendCop() {
  if (festivalStoriesPaused(state)) return;
  if (!holding || over || !cop) return;
  // 從主角背後不遠的地方衝過來
  const bx = Math.sin(state.yaw), bz = Math.cos(state.yaw);
  const p = cop.g.position; p.x = pos.x + bx * 14; p.z = pos.z + bz * 14;
  cop.state = 'chase'; cop.chaseT = 0; AU.sfx('whistle'); cop.sp.say(W.cop.shout); cop.sayT = 2.5;
  cop.onCatch = copTalk;
}
function copDone() { cop.state = 'return'; cop.onCatch = null; }
function loseUmbrella(msg) { holding = false; held.visible = false; toast(msg); }
function copTalk() {
  if (festivalStoriesPaused(state)) return;
  openDialog(W.cop.title, W.cop.lines, () => openChoice(W.cop.choices, async i => {
    if (i === 0) { AU.sfx('over'); gameOver(W.cop.arrested); return; }
    const result = await startBattle({ ...W.battle, enemySVG: copSVG, enemyAI: copAI });
    if (result === 'win') toast(W.cop.win);
    else if (result === 'lose') { pos.set(0, 0, 14); state.yaw = 0; state.pitch = 0.3; loseUmbrella(W.cop.lose); }
    else loseUmbrella(W.cop.run);
    copDone();
  }));
}
/** 警察的出招：大多開紅單，血少時吃甜甜圈，偶爾睡覺 */
function copAI(s, moves) {
  const idx = id => moves.findIndex(m => m.id === id), r = Math.random();
  if (s.enemyHP / s.enemyMax < 0.45 && s.heals < 2 && r < 0.55) { s.heals++; return idx('donut'); }
  return r < 0.28 ? idx('sleep') : idx('ticket');
}

/* ---------- 石獅子 ---------- */
const lions = ['石獅-左', '石獅-右'].map(n => scene.getObjectByName(n)).filter(Boolean);
let lion = null, lionT = 0, lionMode = null, from = new THREE.Vector3(), to = new THREE.Vector3();
const eyes = lions.map(l => {
  // 活過來時凸眼裡出現黑眼珠（加在石獅頭上，頭部群組由 library 模型提供）
  const g = new THREE.Group(); g.visible = false; (l.userData.head || l).add(g);
  [-1, 1].forEach(s => { mk(SPH, toon('#2a1f2b'), s * 0.11, 0.045, 0.285, { parent: g }).scale.set(0.04, 0.05, 0.02); mk(SPH, toon('#ffffff'), s * 0.11 + 0.015, 0.065, 0.302, { parent: g }).scale.setScalar(0.013); });
  return g;
});
lions.forEach(l => { l.userData.home = { p: l.position.clone(), r: l.rotation.y }; });

function wakeLion() {
  if (festivalStoriesPaused(state)) return;
  lion = lions.reduce((a, b) => (a.position.distanceTo(pos) < b.position.distanceTo(pos) ? a : b));
  eyes[lions.indexOf(lion)].visible = true; state.busy = true;
  AU.sfx('encounter');
  // 跳到主角前面兩公尺
  const dx = lion.position.x - pos.x, dz = lion.position.z - pos.z, d = Math.hypot(dx, dz) || 1;
  from.copy(lion.position); to.set(pos.x + dx / d * 2.2, 0, pos.z + dz / d * 2.2); to.y = groundH(to.x, to.z);
  lionMode = 'shake'; lionT = 0;
}
function lionTalk() {
  openDialog(W.lion.title, W.lion.lines, () => openChoice(W.lion.choices, i => {
    openDialog(W.lion.title, W.lion.replies[i], () => {
      startRain();
      from.copy(lion.position); to.copy(lion.userData.home.p); lionMode = 'back'; lionT = 0;
    });
  }));
}
function updateLion(dt) {
  if (!lionMode) return;
  lionT += dt;
  if (lionMode === 'shake') {
    lion.rotation.z = Math.sin(lionT * 40) * 0.06;
    if (lionT > 0.7) { lion.rotation.z = 0; lionMode = 'jump'; lionT = 0; AU.sfx('jump'); }
  } else if (lionMode === 'jump' || lionMode === 'back') {
    const k = Math.min(1, lionT / 0.9);
    lion.position.lerpVectors(from, to, k); lion.position.y += Math.sin(k * Math.PI) * 2.2;
    const tx = lionMode === 'jump' ? pos.x : to.x, tz = lionMode === 'jump' ? pos.z : to.z;
    lion.rotation.y = lerpA(lion.rotation.y, lionMode === 'back' && k > 0.8 ? lion.userData.home.r : Math.atan2(tx - lion.position.x, tz - lion.position.z), 1 - Math.exp(-dt * 8));
    if (k >= 1) {
      AU.sfx('land');
      if (lionMode === 'jump') { lionMode = 'talk'; lionT = 0; state.busy = false; lionTalk(); }
      else { lion.rotation.y = lion.userData.home.r; if (lion.userData.head) lion.userData.head.rotation.z = 0; eyes[lions.indexOf(lion)].visible = false; lionMode = null; toast(W.lion.back); lion = null; }
    }
  } else if (lionMode === 'talk') {
    lion.position.y = to.y + Math.abs(Math.sin(lionT * 3)) * 0.05;
    if (lion.userData.head) lion.userData.head.rotation.z = Math.sin(lionT * 2.2) * 0.12;
    lion.rotation.y = lerpA(lion.rotation.y, Math.atan2(pos.x - lion.position.x, pos.z - lion.position.z), 1 - Math.exp(-dt * 6));
  }
}

/* ---------- 四維道會噴水的磁磚 ---------- */
const drops = [];
function splash() {
  if (festivalStoriesPaused(state)) return;
  AU.sfx('splash');
  for (let i = 0; i < 40; i++) {
    const m = mk(SPH, toon('#bfe3f5', { transparent: true, opacity: 0.85 }), pos.x, pos.y + 0.05, pos.z); m.scale.setScalar(0.05 + Math.random() * 0.05);
    const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 1.6;
    drops.push({ m, v: new THREE.Vector3(Math.cos(a) * s, 5 + Math.random() * 4, Math.sin(a) * s) });
  }
  openDialog('四維道', W.tile.lines, () => gameOver(W.tile.ending));
}

/* ---------- 每一幀 ---------- */
let last = performance.now(), storyLast = storyClock.now();
function tick() {
  requestAnimationFrame(tick);
  const now = performance.now(), storyNow = storyClock.now();
  const storyDt = Math.min(0.1, (storyNow - storyLast) / 1000); storyLast = storyNow;
  const paused = festivalStoriesPaused(state);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!state.started) return;
  if (!paused) storyClock.flush();
  state.holdUmbrella = holding && held.visible && !indoor();
  if (!npcUmbrellas.length) giveNpcUmbrellas();
  const open = gloom > 0.35; npcUmbrellas.forEach(u => { u.visible = open; });
  if (!paused) updateLion(storyDt);
  // 雨滴噴濺
  for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.v.y -= 18 * dt; d.m.position.addScaledVector(d.v, dt); if (d.m.position.y < 0) { scene.remove(d.m); drops.splice(i, 1); } }
  // 天色漸變
  gloom += ((raining ? 1 : 0) - gloom) * (1 - Math.exp(-dt * 0.8));
  // 四維堂室內有自己的燈光，室內時不動燈光和色調
  if (!indoor()) applyGloom(gloom); else sky.material.uniforms.gloom.value = gloom;
  tint.style.opacity = indoor() ? 0 : (0.3 * gloom).toFixed(3);
  rain.material.opacity = 0.75 * gloom; rain.visible = gloom > 0.02 && !indoor();
  if (rain.visible) {
    rain.position.set(pos.x, 0, pos.z);
    const a = rainGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const j = i * 6; let y = a[j + 1] - 24 * dt;
      if (y < 0) { y += TOP; a[j] = (Math.random() - 0.5) * BOX; a[j + 2] = (Math.random() - 0.5) * BOX; a[j + 3] = a[j] + 0.06; a[j + 5] = a[j + 2] + 0.03; }
      a[j + 1] = y; a[j + 4] = y - 0.7;
    }
    rainGeo.attributes.position.needsUpdate = true;
  }
  // 地上那把傘輕輕晃
  if (ground.visible) ground.position.y = groundH(ground.position.x, ground.position.z) + 0.35 + Math.sin(now / 300) * 0.05;
  if (over || paused) return;

  // 石獅子：走到圖書館前觸發
  if (!raining && !lionMode && lions.length && storyNow > lionNext && dlg.hidden && !state.busy && !state.driving && !indoor()) {
    const T = W.lion.trigger;
    if (Math.hypot(pos.x - T.x, pos.z - T.z) < T.r) wakeLion();
  }
  if (!raining) return;
  rainT -= storyDt; if (rainT <= 0) { stopRain(); return; }
  rainTick -= storyDt; if (rainTick <= 0) { rainTick = 0.38; if (!indoor()) AU.sfx('rain'); }
  const free = dlg.hidden && !state.busy && !state.driving;
  // 淋雨扣體力
  if (free && !holding && !indoor()) { setHP(hp - W.rain.drainPerSecond * storyDt); if (hp <= 0) gameOver(W.rain.soaked); }
  // 四維道踩到噴水磁磚
  tileT -= storyDt;
  if (free && tileT <= 0) {
    tileT = 1;
    if (Math.hypot(vel.x, vel.z) > 1 && zoneOf(pos) === '四維道' && Math.random() < W.tile.chancePerSecond) splash();
  }
}
requestAnimationFrame(tick);

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__weather = { setGloom: k => { gloom = k; }, setHP, wakeLion, startRain, stopRain, takeUmbrella, sendCop, splash, get hp() { return hp; }, get raining() { return raining; } };
}
