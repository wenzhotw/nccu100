/**
 * 學生傳教士：兩人一組在四維道上走來走去，主角靠近時會突然衝過來搭話。
 * 只會主動衝過來一次（記成劇情旗標 missionaryMet，跟著存檔）；之後要自己走過去按「交談」才會遇到。
 *
 * 流程：頭上冒「！」→ 衝向主角 → 打招呼 → 三個選項
 *   我沒有興趣耶       → 被說「那你就下地獄去吧！」，兩人走開
 *   我願意接受耶穌     → 結局：你已經得救了（離開遊戲）
 *   發出戰鬥邀請       → 寶可夢式回合制戰鬥（systems/battle）
 *
 * 台詞、選項、招式數值都在 src/content/missionaries.json。
 */
import { state } from '../../core/state.js';
import { AU } from '../audio.js';
import { addNPC } from '../../actors/npc.js';
import { indoor, pos } from '../../core/gameplay.js';
import { dlg, openDialog, toast } from '../../ui/dialog.js';
import { openChoice } from '../../ui/choice.js';
import { showEnding } from '../../ui/ending.js';
import { closeBattle, startBattle } from '../battle/index.js';
import { setFlag } from '../../content/index.js';
import M from '../../content/missionaries.json';

const SEE = 11;          // 多近會被發現（公尺）
const COOLDOWN = 45;     // 一次遭遇之後，多久才會再衝過來（秒）

const [lead, buddy] = M.pair.map(p => addNPC({
  ...p, title: M.title, speed: 1.1, chaseSpd: 7.5,
  dialog: [{ lines: M.greeting }],
}));
let nextTime = performance.now() + 15000, active = false;

function goHome() {
  [lead, buddy].forEach(n => { n.state = 'return'; n.onCatch = null; });
  nextTime = performance.now() + COOLDOWN * 1000;
  active = false;
}

async function onChoice(i) {
  const c = M.choices[i];
  if (c.id === 'no') {
    openDialog(M.title, M.replies.no, goHome);
  } else if (c.id === 'yes') {
    openDialog(M.title, M.replies.yes, () => { AU.sfx('holy'); showEnding({ title: M.saved.title, sub: M.saved.sub, tone: 'light' }); });
  } else {
    openDialog(M.title, M.replies.fight, async () => {
      const result = await startBattle(M.battle);
      if (result === 'gameOver') {
        closeBattle();
        const g = M.battle.messages.gameOver;
        showEnding({ title: g.title, sub: g.sub, tone: 'dark' });
        return;
      }
      if (result === 'lose') {
        pos.set(0, 0, 14); state.yaw = 0; state.pitch = 0.3;
        toast(M.battle.messages.wakeUp);
      }
      goHome();
    });
  }
}

/** 遭遇：打招呼之後跳出選項 */
function encounter() {
  active = true; setFlag('missionaryMet');
  [lead, buddy].forEach(n => { n.state = 'talk'; });
  openDialog(M.title, M.greeting, () => openChoice(M.choices.map(c => c.label), onChoice));
}

// 直接走過去按「交談」也會觸發同一個遭遇
lead.spot.fn = encounter;
buddy.spot.fn = encounter;

// 每 0.2 秒看一次主角有沒有走近
setInterval(() => {
  // 追到一半主角上車或進室內：放棄，走回去
  if (active && lead.state === 'chase' && (state.driving || indoor())) { goHome(); return; }
  if (active || !state.started || state.busy || state.driving || state.holdPang || !dlg.hidden || indoor()) return;
  if (state.missionaryMet || performance.now() < nextTime) return;   // 遇過一次就不再主動衝過來
  const p = lead.g.position;
  if (Math.hypot(pos.x - p.x, pos.z - p.z) > SEE) return;
  active = true; setFlag('missionaryMet');
  AU.sfx('encounter');
  [lead, buddy].forEach(n => { n.sp.say(M.spot); n.sayT = 1.6; n.state = 'chase'; n.chaseT = 0; });
  lead.onCatch = encounter;
  buddy.onCatch = null;
}, 200);

// 讓開發者在主控台測試：__missionaries.encounter()
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__missionaries = { encounter, lead, buddy };
}
