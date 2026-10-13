/**
 * 遊戲製作人 Wenz（四維堂旁的廊道）。問你「這個遊戲好玩嗎？」
 *   爛透了 → 戰鬥，他一招「破壞死光」把你轟掉 →「有意見的話，來直接找我吧。」→ 可以開他的 Instagram
 *   超好玩 → 告訴你去操場、游泳池看看 → 可以開他的 Instagram
 * 台詞與戰鬥設定在 src/content/wenz.json。
 *
 * talk() 有 export：變雄鷹把 Wenz 搬去四維堂頂樓後（systems/eagle），抓到他一樣要能
 * 問這個「好玩嗎」的問題、連到 Instagram，兩邊共用同一套問答，不要各寫一份。
 */
import { NPCS } from '../../actors/npc.js';
import { openDialog } from '../../ui/dialog.js';
import { openChoice } from '../../ui/choice.js';
import { startBattle } from '../battle/index.js';
import { wenzSVG } from './wenz-svg.js';
import W from '../../content/wenz.json';

const wenz = NPCS.find(n => n.id === 'wenz');
const say = (lines, then) => openDialog(W.title, lines, then);
const openIG = () => window.open(W.instagram, '_blank', 'noopener');
// 破壞死光：不管怎樣都是 Wenz 出這招
const ai = (s, moves) => moves.findIndex(m => m.id === 'deathray');

function contact(lines) {
  say(lines, () => openChoice(W.contact, i => { if (i === 0) openIG(); else say(W.bye); }));
}

async function angry() {
  await startBattle({ ...W.battle, enemySVG: wenzSVG, enemyAI: ai });
  contact(W.after);
}

function talk() {
  wenz.state = 'talk';
  say(W.ask, () => openChoice(W.choices, i => {
    if (i === 0) say(W.angry, angry);
    else contact(W.happy);
    wenz.state = 'idle';
  }));
}

if (wenz) wenz.spot.fn = talk;

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__wenz = { talk, angry };
}

export { talk };
