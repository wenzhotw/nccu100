/**
 * 山上校區。
 *
 * 山上校區是另一張地圖：在行政大樓旁的校園公車乘車處「搭公車上山」，
 * 畫面轉場（公車行駛中）之後換到山上校區的場景；在山上公車站「搭公車下山」回到行政大樓旁。
 * 做法跟室內一樣是「換場景」（core/rooms.js），所以山上和山下不會同時運算，
 * 山上的東西也要第一次上山才會建立。
 *
 * 山下這一側不用另外蓋東西：乘車處、站牌、公車停靠區都已經在行政大樓（admin-building）裡。
 */
import { defineBuilding } from '../../registry.js';
import { R, SPAWN, STOP } from './layout.js';
import { buildMap, buildAnjiu, mapHeight, mapLight, mapZone, updateMap, skyClock, fireworks } from './map.js';
import { MODE_LABELS } from './day-night.js';
import { SIGN } from './fireworks.js';
import { state } from '../../../core/state.js';
import {ANJIU} from './anjiu-interior.js';

/** 山下乘車處：行政大樓左側騎樓的候車長椅與時刻表旁（校園座標） */
const BOARD = { x: 32.2, z: -88.5 };

/**
 * 天色按鈕：只在山上校區顯示，依序切換自動日夜、白天、黃昏、夜晚（跟達賢的光線按鈕同一種樣式）。
 * 告示牌互動點：夜晚施放 101 跨年煙火；白天按下只提示要等天黑。互動點與按鈕都在第一次上山時建立。
 */
let timeButton = null, spotsReady = false;
function enterUphill() {
  if (!timeButton) {
    timeButton = document.createElement('button');
    timeButton.id = 'uphill-time'; timeButton.className = 'chip'; timeButton.type = 'button';
    const refresh = () => { timeButton.textContent = MODE_LABELS[skyClock.mode]; timeButton.ariaLabel = timeButton.textContent + '，按下切換下一個時段'; };
    timeButton.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); });
    timeButton.addEventListener('click', () => { skyClock.next(state.time); refresh(); });
    document.getElementById('snd').after(timeButton); refresh();
  }
  timeButton.hidden = false;
  if (spotsReady) return;
  spotsReady = true;
  Promise.all([import('../../../core/gameplay.js'), import('../../../ui/dialog.js')]).then(([{ spots }, { toast }]) => {
    const at = { x: SIGN.x, z: SIGN.z, r: SIGN.reach, room: 'uphill-campus' };
    spots.push({ ...at, id: 'uphill-fireworks', label: '施放跨年煙火',
      ok: () => skyClock.isNight(state.time) && !fireworks.playing(state.time),
      fn: () => { fireworks.start(state.time); toast('101 跨年煙火施放中，往北邊看！'); } });
    spots.push({ ...at, id: 'uphill-fireworks-day', label: '看告示牌',
      ok: () => !skyClock.isNight(state.time),
      fn: () => toast('天黑以後再來，就能看 101 施放跨年煙火（右上角可以切換天色）') });
  });
}

export default defineBuilding({
  id: 'uphill-campus',
  name: '山上校區',
  // 山下校園裡沒有要蓋的東西（乘車處在行政大樓）
  build() {},
  interior: [{
    build: buildMap,
    light: mapLight,
    heightAt: mapHeight,
    zone: mapZone,
    // 日夜時鐘與跨年煙火每一幀更新；天色按鈕只在山上顯示。
    update() { updateMap(state.time); },
    onEnter() { enterUphill(); updateMap(state.time); },
    onExit() { if (timeButton) timeButton.hidden = true; },
    // 搭公車的轉場畫面與小地圖文字（見 core/gameplay.js、systems/feel.js）
    ride: { up: '搭乘校園公車「一路」前往山上校區', down: '搭乘校園公車「一路」返回山下校區' },
    miniSub: '公車站在南邊',
    entrance: { x: BOARD.x, z: BOARD.z, r: 3, label: '搭公車上山' },
    spawn: { ...SPAWN, pitch: 0.28 },
    exit: { x: STOP.x, z: STOP.z - 0.8, r: 3, label: '搭公車下山' },
    returnTo: { x: BOARD.x - 1.2, z: BOARD.z, yaw: Math.PI / 2, pitch: 0.3, face: -Math.PI / 2 },
    bounds: { x0: R.x0 + 0.6, x1: R.x1 - 0.6, z0: R.z0 + 0.6, z1: R.z1 - 0.6 },
    // 戶外：鏡頭不限天花板，距離跟山下一樣
    camera: { x0: R.x0 - 40, x1: R.x1 + 40, z0: R.z0 - 40, z1: R.z1 + 40, ceil: 120, maxDist: 99 },
  },{...ANJIU,build:buildAnjiu}],
});
