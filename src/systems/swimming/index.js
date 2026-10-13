/**
 * 游泳館的規則：沒穿泳衣靠近泳池，救生員會吹哨子擋下來。
 *   換泳衣         → 換上泳褲、泳帽、蛙鏡，可以下水
 *   跟救生員戰鬥   → 寶可夢式戰鬥（吹哨子、丟救生圈、做暖身操），打贏就可以穿著衣服下水
 *   算了           → 回去
 * 更衣室裡也可以自己換泳衣、換回衣服。離開游泳館時自動換回衣服。
 *
 * 房間本身（大廳、更衣室、泳池、游泳的人）在 world/buildings/swimming-hall/interior.js，
 * 台詞和戰鬥招式在 src/content/swimming.json。
 */
import { state } from '../../core/state.js';
import { AU } from '../audio.js';
import { NPCS } from '../../actors/npc.js';
import { setOutfit } from '../../actors/player.js';
import { groundH, pos, spots, transition } from '../../core/gameplay.js';
import { world } from '../../world/registry.js';
import { dlg, openDialog, toast } from '../../ui/dialog.js';
import { openChoice } from '../../ui/choice.js';
import { startBattle } from '../battle/index.js';
import { puff } from '../feel.js';
import { lifeguardSVG } from './lifeguard-svg.js';
import { startRace, wenSwimPose } from './race.js';
import S from '../../content/swimming.json';

const ROOM = 'swimming-hall';
const def = world.interiors[ROOM];
const guard = NPCS.find(n => n.id === 'lifeguard');
let beatGuard = false, nextStop = 0, wasSwimming = false, lastResult = null;

state.poolOk = false;
state.swimming = false;
const canSwim = () => state.outfit === 'swim' || beatGuard || state.racing;
/** 主角附近（1.2 公尺內）是不是泳池 */
const nearPool = () => [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2], [0, 0]].some(([dx, dz]) => groundH(pos.x + dx, pos.z + dz) < -0.4);

/* ---------- 換衣服 ---------- */
function change(swim) {
  transition(() => { setOutfit(swim ? 'swim' : 'normal'); });
  setTimeout(() => toast(swim ? S.locker.changedToast : S.locker.backToast), 900);
}
// 兩間更衣室的置物櫃前各一個互動點
[[-13, 2], [13, 2]].forEach(([x, z]) => spots.push({
  x, z, r: 2.2, room: ROOM, ok: () => true,
  get label() { return state.outfit === 'swim' ? S.locker.back : S.locker.change; },
  fn: () => change(state.outfit !== 'swim'),
}));

/* ---------- 救生員 ---------- */
function stopPlayer() {
  const L = S.lifeguard;
  nextStop = performance.now() + L.cooldownSeconds * 1000;
  if (guard) { guard.state = 'talk'; guard.sp.say(L.shout); guard.sayT = 2; }
  AU.sfx('whistle');
  openDialog(L.title, L.stop, () => openChoice(L.choices, async i => {
    if (i === 0) { openDialog(L.title, L.changed, () => change(true)); done(); return; }
    if (i === 2) { openDialog(L.title, L.giveUp, done); return; }
    const result = await startBattle({ ...S.battle, enemySVG: lifeguardSVG }); lastResult = result;
    if (result === 'win') { beatGuard = true; openDialog(L.title, L.win, done); return; }
    nextStop = performance.now() + 20000;   // 打輸或逃跑之後，救生員過一陣子才會再擋人
    if (result === 'lose') { pos.set(def.spawn.x, 0, def.spawn.z); state.yaw = 0; state.pitch = 0.25; toast(L.lose); }
    else toast(L.run);
    done();
  }));
}
function done() { if (guard) guard.state = 'idle'; }
/* ---------- 英文系溫同學：游泳 PK ---------- */
const wen = NPCS.find(n => n.id === 'wen');
if (wen) {
  const R = S.race;
  wen.after = wenSwimPose;
  wen.spot.fn = () => openDialog('英文系．溫同學', R.invite, () => openChoice(R.choices, async i => {
    if (i !== 0) { openDialog('英文系．溫同學', R.decline); return; }
    if (state.outfit !== 'swim') { openDialog('英文系．溫同學', R.needSuit); return; }
    await startRace(wen);
  }));
  wen.spot.label = R.challenge;
}
if (guard) guard.spot.fn = () => (canSwim() ? openDialog(S.lifeguard.title, S.lifeguard.talkOk) : stopPlayer());

/* ---------- 每一幀（只在游泳館裡跑） ---------- */
const roomUpdate = def.update;
def.update = dt => {
  roomUpdate && roomUpdate(dt);
  state.poolOk = canSwim();
  state.swimming = groundH(pos.x, pos.z) < -0.4 && pos.y < -0.3;
  if (state.swimming && !wasSwimming) { AU.sfx('splash'); puff(pos.x, -0.2, pos.z, 8, 2.2, 0.45); toast(S.splash); }
  if (!state.swimming && wasSwimming) puff(pos.x, 0, pos.z, 4, 1.2, 0.3);
  wasSwimming = state.swimming;
  // 游泳時偶爾冒一點水花
  if (state.swimming && Math.random() < dt * 3) puff(pos.x, -0.2, pos.z, 1, 0.8, 0.25);
  // 沒穿泳衣靠近池邊：救生員擋下來
  if (!state.poolOk && dlg.hidden && !state.busy && performance.now() > nextStop && nearPool()) stopPlayer();
  if (state.racing) state.swimming = true;
};
// 離開游泳館：換回衣服
const roomExit = def.onExit;
def.onExit = () => {
  roomExit && roomExit();
  if (state.outfit === 'swim') { setOutfit('normal'); setTimeout(() => toast(S.locker.exitToast), 900); }
  state.swimming = false; wasSwimming = false;
};

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__swim = { stopPlayer, change, race: () => startRace(wen), get beatGuard() { return beatGuard; }, get lastResult() { return lastResult; } };
}
