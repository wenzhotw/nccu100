/**
 * 雄鷹吉祥物：三個校園故事都交給校長之後，校長問你要不要自由，
 * 答應的話會有一個特效畫面，之後永久變成政大雄鷹吉祥物（不會變回人類），
 * 到戶外按住空白鍵（手機按跳躍鍵）就能持續飛高，放開緩緩下降，可以飛到空中俯視校園。
 *
 * 飛到行政大樓屋頂，會看到遊戲製作人 Wenz（他已經搬去那裡躲起來了，原本在四維堂旁的
 * 那個 Wenz 就消失了）。靠近他會躲著跑，追到才能跟他對話。
 *
 * 台詞在 src/content/eagle.json。
 */
import { state } from '../../core/state.js';
import { STORIES, NPC_LIST } from '../../content/index.js';
import { NPCS, addNPC } from '../../actors/npc.js';
import { becomeEagle } from '../../actors/player.js';
import { transition, pos } from '../../core/gameplay.js';
import { openDialog, toast } from '../../ui/dialog.js';
import { openChoice } from '../../ui/choice.js';
import E from '../../content/eagle.json';

const principal = NPCS.find(n => n.id === 'principal');
const wenzGround = NPCS.find(n => n.id === 'wenz');

/* ---------- 校長：問你要不要變成雄鷹 ---------- */
function offerFreedom() {
  openDialog(E.offerTitle, E.ask, () => openChoice(E.choices, i => {
    if (i === 0) {
      openDialog(E.offerTitle, E.grant, () => {
        transition(() => {
          becomeEagle();
          if (wenzGround) { wenzGround.g.visible = false; wenzGround.spot.ok = () => false; }
        });
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

/* ---------- 行政大樓屋頂：躲著跑的 Wenz ---------- */
// 屋頂上一塊沒有突出結構擋著的平台，世界座標（見 world/buildings/admin-building）
const ROOF = { x0: 46, x1: 60, z0: -96, z1: -85, y: 30.2 };
const wenzLook = (NPC_LIST.find(n => n.id === 'wenz') || {}).look;
let caught = false;
const roofWenz = addNPC({
  id: 'wenz-roof', title: E.roof.title, tag: E.roof.tag, tagCol: '#f2c84b',
  home: { x: (ROOF.x0 + ROOF.x1) / 2, z: (ROOF.z0 + ROOF.z1) / 2 },
  look: wenzLook, shout: E.roof.shout, dialog: [{ lines: E.roof.caught }],
});
roofWenz.g.visible = false;
roofWenz.spot.label = E.roof.catchLabel;
roofWenz.spot.r = 2.2;
roofWenz.spot.ok = () => state.isEagle && !caught && pos.y > 24;
roofWenz.spot.fn = () => { caught = true; openDialog(E.roof.title, E.roof.caught); };
roofWenz.after = (n, dt) => {
  n.g.visible = state.isEagle;
  if (!state.isEagle) return;
  const p = n.g.position; p.y = ROOF.y;
  if (!caught && pos.y > 24) {
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
