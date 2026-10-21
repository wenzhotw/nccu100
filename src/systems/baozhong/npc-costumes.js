// 包種活動專用外觀。既有 NPC、互動點、動畫骨架及場景生命週期維持原樣。
import { createCostumeKit } from './npc-costume-kit.js';
import { costumeProfile } from './npc-costume-profiles.js';
import { buildLanguageCostume } from './npc-costumes-languages.js';
import { buildProfessionCostume } from './npc-costumes-professions.js';
export function mountNpcCostume(n, deps) {
  const profile = costumeProfile(n.id);
  if (!profile || n.g.userData.bz26Costume) return null;
  const ctx = createCostumeKit(n, deps);
  const id = n.id.slice(5);
  if (profile.kind === 'language') buildLanguageCostume(id, ctx);
  else if (profile.kind === 'profession') buildProfessionCostume(id, ctx);
  n.g.userData.bz26Costume = { id, culture: profile.culture, kind: profile.kind };
  if (profile.pose) {
    const after = n.after;
    let lastX = n.g.position.x, lastZ = n.g.position.z;
    n.after = (npc, dt) => {
      if (after) after(npc, dt);
      const moved = Math.hypot(npc.g.position.x - lastX, npc.g.position.z - lastZ) > .0001;
      lastX = npc.g.position.x; lastZ = npc.g.position.z;
      // 行走、驚嚇及追逐保留原動作，道具隨左手走。右手留給既有雨傘。
      if (!moved && npc.fear <= 0 && (npc.state === 'idle' || npc.state === 'talk')) {
        npc.P.shL.rotation.set(profile.pose === 'laptop' ? -1.15 : -1.05, 0, -.08);
      }
    };
  }
  return ctx;
}
