/**
 * 雄鷹吉祥物：三個校園故事都交給校長之後，校長問你要不要自由，
 * 答應的話會有一個特效畫面，之後永久變成政大雄鷹吉祥物（不會變回人類），
 * 到戶外按住空白鍵（手機按跳躍鍵）就能持續飛高，放開緩緩下降，可以飛到空中俯視校園。
 *
 * 全遊戲只有一個遊戲製作人 Wenz：變身的瞬間（畫面轉場變黑時）直接把他原本站在四維堂
 * 旁的那個人搬去四維堂正面屋頂（唯一平的那一塊，見 world/buildings/siwei-hall/
 * exterior.js 的門廳box），不是另外生一個分身。飛到那裡、靠近他會躲著跑，追到才能
 * 跟他對話；屋頂本身設了 heightAt（world/buildings/siwei-hall/index.js）跟碰撞 top
 * 高度豁免（exterior.js 的 boxC），真的可以站上去、不會破圖掉下去。
 *
 * 第一次追到他、看完「真的被你追到屋頂了」那段話之後，接原本地面上「這個遊戲好玩嗎？」
 * 那組問答（systems/wenz，talk()，可以連到 Instagram），之後他不會再躲、可以一直找他
 * 重新問一次、重新開一次 Instagram。
 *
 * 台詞在 src/content/eagle.json。
 */
import { state } from '../../core/state.js';
import { STORIES } from '../../content/index.js';
import { NPCS } from '../../actors/npc.js';
import { becomeEagle } from '../../actors/player.js';
import { transition, pos } from '../../core/gameplay.js';
import { openDialog, toast } from '../../ui/dialog.js';
import { openChoice } from '../../ui/choice.js';
import { talk } from '../wenz/index.js';
import E from '../../content/eagle.json';
export { moveWenzToRoof };

const principal = NPCS.find(n => n.id === 'principal');
const wenz = NPCS.find(n => n.id === 'wenz');   // 全遊戲唯一的遊戲製作人，變雄鷹後直接搬家

/* ---------- 校長：問你要不要變成雄鷹 ---------- */
function offerFreedom() {
  openDialog(E.offerTitle, E.ask, () => openChoice(E.choices, i => {
    if (i === 0) {
      openDialog(E.offerTitle, E.grant, () => {
        transition(() => { becomeEagle(); if (wenz) moveWenzToRoof(); });
        setTimeout(() => toast(E.afterToast), 900);
      });
    } else {
      openDialog(E.offerTitle, E.decline);
    }
  }));
}
if (principal) {
  const defaultFn = principal.spot.fn;
  principal.spot.fn = () => { if (state.found >= STORIES.length && !state.isEagle) offerFreedom(); else defaultFn(); };
}

/* ---------- 四維堂頂樓：Wenz 搬過去躲著跑 ---------- */
// 範圍要跟 world/buildings/siwei-hall/index.js 的 heightAt、exterior.js 的 boxC top
// 高度一致（兩邊都不能互相 import，只能各自維護同一塊矩形）。
// y=12.15 比屋頂實際頂面（12）高一點點，純粹避免 Wenz 的模型陷進屋頂；minY=7 只是
// 「確定你是飛上來的，不是地上走到的」的門檻，跟真正的屋頂高度留一點緩衝。
const ROOF = { x0: -6.3, x1: 6.3, z0: -78.6, z1: -76.4, y: 12.15, minY: 7 };
let caught = false;
/** 存檔用：讀取與恢復「已經在屋頂追到 Wenz」 */
export const wenzCaught = () => caught;
export function restoreWenzCaught() { if (!wenz) return; caught = true; wenz.spot.label = '交談'; }
function moveWenzToRoof() {
  wenz.home = { x: (ROOF.x0 + ROOF.x1) / 2, z: (ROOF.z0 + ROOF.z1) / 2 };
  wenz.g.position.set(wenz.home.x, ROOF.y, wenz.home.z);
  wenz.bubble = null;   // 地面那句「這個遊戲好玩嗎？」是一直掛著的泡泡，蓋過 shout，不清掉的話屋頂上永遠喊不出新台詞
  wenz.shout = E.roof.shout;
  wenz.spot.r = 2.2;
  wenz.spot.ok = () => state.isEagle && pos.y > ROOF.minY;
  wenz.spot.label = E.roof.catchLabel;
  wenz.spot.fn = () => {
    if (caught) { talk(); return; }   // 已經追到過一次了：不用再演一次「被你追到了」，直接問好不好玩
    caught = true;
    wenz.spot.label = '交談';   // 之後他不會再跑，跟地面上一般 NPC 一樣用「交談」
    openDialog(E.roof.title, E.roof.caught, talk);
  };
  wenz.after = (n, dt) => {
    const p = n.g.position; p.y = ROOF.y;
    if (!caught && pos.y > ROOF.minY) {
      const dx = p.x - pos.x, dz = p.z - pos.z, d = Math.hypot(dx, dz);
      if (d < 12) {
        const ex = d > 0.05 ? dx / d : Math.sin(state.time), ez = d > 0.05 ? dz / d : Math.cos(state.time);
        const st = 6.5 * dt;
        p.x = Math.min(ROOF.x1, Math.max(ROOF.x0, p.x + ex * st));
        p.z = Math.min(ROOF.z1, Math.max(ROOF.z0, p.z + ez * st));
        n.g.rotation.y = Math.atan2(-ex, -ez);
      }
    }
    n.spot.x = p.x; n.spot.z = p.z;
  };
}

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__eagle = { offerFreedom, moveWenzToRoof };
}
