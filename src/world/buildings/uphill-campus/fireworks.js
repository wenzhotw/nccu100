/**
 * 台北 101 跨年煙火（純模型，不碰引擎，可在 Node 測試）。
 *
 * 夜晚在觀景步道告示牌互動後施放約 30 秒：
 * - 塔身：從第三節以上的竹節四個角往外噴出小型煙火，由下往上輪流；
 * - 塔頂：上空每隔一陣子炸開一顆大煙火；
 * - 最後四秒：塔身與上空一起連發。
 * 每顆煙火的時間、位置、顏色事先排好（固定亂數種子），每一幀只依時間算出每個亮點的位置，
 * 亮點用一個 Points 一次繪製；加法混色，越暗越透明，不另外加燈。
 */
import * as THREE from 'three';
import { VIEW, TOWER_AT, TOWER_PARTS } from './taipei-view.js';

/** 觀景步道告示牌：立在路的上坡側，牌面朝路；reach 是互動範圍半徑。 */
export const SIGN = { x: -70.9, z: 1.9, yaw: -2.42, reach: 3.6 };
export const SHOW_SECONDS = 30;
// 101 離觀景步道約 720 公尺：亮點 20 公尺、大煙火張開約 50 公尺，手機畫面上才看得清楚。
const LIFE = 2.8, DRAG = 1.1, GRAVITY = 9;
const COLORS = ['#ffd45a', '#ff5a5a', '#5affb4', '#62a8ff', '#ff7ae0', '#ffffff', '#ffa040', '#b48cff'];

let seed = 1;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** 施放表：[{ t 秒, x, y, z 炸開位置, color, count 亮點數, speed 初速 }]。 */
export function fireworksSchedule() {
  seed = 20270101;
  const list = [], top = VIEW.ground + Math.max(...TOWER_PARTS.map(p => p.y0 + p.h));
  const sections = TOWER_PARTS.filter(p => /^第\d節$/.test(p.name) && VIEW.ground + p.y0 > 40);
  const corner = (part, k) => {
    // 竹節四個角往外，轉角跟模型一致（四角柱轉 45 度後牆面對齊座標軸）。
    const a = k * Math.PI / 2 + Math.PI / 4, r = part.r1 * Math.SQRT2 + 4;
    return [TOWER_AT[0] + Math.cos(a) * r, VIEW.ground + part.y0 + part.h * 0.8, TOWER_AT[1] + Math.sin(a) * r];
  };
  for (let t = 0.3, i = 0; t < SHOW_SECONDS - 4; t += 0.45, i++) {
    const part = sections[i % sections.length], [x, y, z] = corner(part, i % 4);
    list.push({ t, x, y, z, color: COLORS[i % COLORS.length], count: 60, speed: 26 + rnd() * 8 });
  }
  for (let t = 1.5; t < SHOW_SECONDS - 4; t += 1.6 + rnd() * 0.8) {
    list.push({ t, x: TOWER_AT[0] + (rnd() - 0.5) * 90, y: top + 15 + rnd() * 60, z: TOWER_AT[1] + (rnd() - 0.5) * 50,
      color: COLORS[Math.floor(rnd() * COLORS.length)], count: 140, speed: 50 + rnd() * 16 });
  }
  for (let t = SHOW_SECONDS - 4; t < SHOW_SECONDS - 0.6; t += 0.22) {
    const big = rnd() < 0.5;
    if (big) list.push({ t, x: TOWER_AT[0] + (rnd() - 0.5) * 110, y: top + 10 + rnd() * 70, z: TOWER_AT[1] + (rnd() - 0.5) * 60,
      color: COLORS[Math.floor(rnd() * COLORS.length)], count: 150, speed: 56 + rnd() * 16 });
    else {
      const part = sections[Math.floor(rnd() * sections.length)], [x, y, z] = corner(part, Math.floor(rnd() * 4));
      list.push({ t, x, y, z, color: COLORS[Math.floor(rnd() * COLORS.length)], count: 70, speed: 30 + rnd() * 8 });
    }
  }
  return list.sort((a, b) => a.t - b.t);
}

/**
 * 建立煙火：points 加進場景；start(time) 開始施放（施放中再按不會重來）；
 * update(time) 每一幀呼叫，算出亮著的點；playing(time) 是否還在施放。
 */
export function createFireworks() {
  const bursts = fireworksSchedule(), total = bursts.reduce((s, b) => s + b.count, 0);
  // 每個亮點的炸開方向（單位球面上均勻分布）與速度倍率。
  const dirs = new Float32Array(total * 4);
  seed = 31;
  for (let i = 0; i < total; i++) {
    const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    dirs.set([Math.cos(a) * s, u, Math.sin(a) * s, 0.75 + rnd() * 0.3], i * 4);
  }
  const position = new THREE.BufferAttribute(new Float32Array(total * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const color = new THREE.BufferAttribute(new Float32Array(total * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', position); geometry.setAttribute('color', color); geometry.setDrawRange(0, 0);
  const material = new THREE.PointsMaterial({ size: 20, vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false });
  const points = new THREE.Points(geometry, material);
  points.name = '101跨年煙火'; points.frustumCulled = false; points.userData.noOcc = true;
  const rgb = bursts.map(b => new THREE.Color(b.color));
  let started = -Infinity;
  const playing = time => time >= started && time < started + SHOW_SECONDS + LIFE;
  return {
    points,
    playing,
    start(time) { if (!playing(time)) started = time; },
    update(time) {
      let n = 0, offset = 0;
      if (playing(time)) {
        const t = time - started;
        bursts.forEach((b, k) => {
          const age = t - b.t;
          if (age >= 0 && age < LIFE) {
            // 空氣阻力讓煙火很快張開後停住，再慢慢往下掉、變暗。
            const spread = (1 - Math.exp(-DRAG * age)) / DRAG, fall = GRAVITY * age * age / 2;
            const fade = (1 - age / LIFE) ** 1.5, c = rgb[k];
            for (let i = 0; i < b.count; i++) {
              const d = (offset + i) * 4, v = b.speed * dirs[d + 3] * spread;
              position.setXYZ(n, b.x + dirs[d] * v, b.y + dirs[d + 1] * v - fall, b.z + dirs[d + 2] * v);
              // 一閃一閃：每個亮點依編號錯開明暗。
              const twinkle = 0.75 + 0.25 * Math.sin(age * 22 + i);
              color.setXYZ(n, c.r * fade * twinkle, c.g * fade * twinkle, c.b * fade * twinkle);
              n++;
            }
          }
          offset += b.count;
        });
      }
      geometry.setDrawRange(0, n);
      position.needsUpdate = color.needsUpdate = n > 0;
    },
  };
}
