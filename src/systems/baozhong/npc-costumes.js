// 包種活動專用外觀。既有 NPC、互動點、動畫骨架及場景生命週期維持原樣。
import { createCostumeKit } from './npc-costume-kit.js';
import { costumeProfile } from './npc-costume-profiles.js';
import { buildLanguageCostume } from './npc-costumes-languages.js';
import { buildSocialCostume } from './npc-costumes-social.js';
import { buildExtendedCostume } from './npc-costumes-extended.js';
import { buildPoliticalCostume, SOAPBOX_HEIGHT } from './npc-costumes-political.js';
import { buildProfessionCostume } from './npc-costumes-professions.js';
export function mountNpcCostume(n, deps) {
  const profile = costumeProfile(n.id);
  if (!profile || n.g.userData.bz26Costume) return null;
  const ctx = createCostumeKit(n, deps);
  const id = n.id.slice(5);
  if (profile.kind === 'language') buildLanguageCostume(id, ctx);
  else if (profile.kind === 'profession') buildProfessionCostume(id, ctx);
  else if (profile.kind === 'social') buildSocialCostume(id, ctx);
  else if (profile.kind === 'extended' || profile.kind === 'suit') buildExtendedCostume(id, ctx);
  else if (profile.kind === 'political') {
    const stage = buildPoliticalCostume(ctx), after = n.after;
    const anchor = n.g.position.clone();
    anchor.y = deps.groundH?.(anchor.x, anchor.z, n.room || null) ?? anchor.y;
    const anchorYaw = n.g.rotation.y;
    const scaleY = n.g.scale.y;
    // Ground-level props stay at the booth anchor, while the person may turn or panic.
    const updateStage = npc => {
      npc.g.updateWorldMatrix(true, false);
      stage.position.copy(npc.g.worldToLocal(anchor.clone()));
      stage.rotation.y = anchorYaw - npc.g.rotation.y;
      const onPlatform = Math.hypot(npc.g.position.x-anchor.x,npc.g.position.z-anchor.z)<.12;
      if (onPlatform) npc.rig.position.y += SOAPBOX_HEIGHT;
      npc.g.userData.bz26PlatformLift = onPlatform ? SOAPBOX_HEIGHT * scaleY : 0;
    };
    n.after = (npc, dt) => { if(after) after(npc,dt); updateStage(npc); };
    updateStage(n);
    if(n.tag) n.tag.position.y += SOAPBOX_HEIGHT;
    if(n.sp) n.sp.position.y += SOAPBOX_HEIGHT;
  }
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
