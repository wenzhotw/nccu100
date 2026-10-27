// src/systems/baozhong/deps.js（P06，Grok，T065）：遊戲相依的換檔點。整合層只從這裡拿遊戲的東西，測試時可整檔換掉。
export { state } from '../../core/state.js';
export { pos, groundH, spots } from '../../core/gameplay.js';
export { addNPC, NPCS } from '../../actors/npc.js';
export { colliders } from '../../core/collision.js';
export { openDialog, toast } from '../../ui/dialog.js';
export { openChoice } from '../../ui/choice.js';
export { openQuiz } from '../old-principal/quiz.js';
export { setFlag } from '../../content/index.js';
export { showAchievement } from '../../ui/achievement.js';
export { AU } from '../audio.js';
export { mountPassport } from './passport-ui.js';
export { createTents } from './tents-adapter.js';
export { mountDecor, updateDecor, unmountAllDecor } from './decor-loader.js';

export { player, shadowBlob } from '../../actors/player.js';

export { FOLIAGE } from '../../world/vegetation.js';
export { UMBRELLAS } from '../../world/terrain/campus-roads.js';
