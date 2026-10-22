// src/systems/baozhong/festival-arch.js（T075，Grok）：四維堂前氣球拱門的整合層。
// 不改 index.js（GPT-038 版本鎖 tests/baozhong-scenery-lock.json 鎖住它）：main.js 在 baozhong/index.js 之後 import 本檔，
// 用同一個會場旗標 bz26_active 判斷（index.js 的 sync() 也只看這個旗標），掛在邀請人既有的 host.after 每幀鉤子後面，
// 室內時另以 0.5 秒計時補同步（同 index.js 的做法）。
import { scene } from '../../core/engine.js';
import { state } from '../../core/state.js';
import { spots } from '../../core/gameplay.js';
import { colliders } from '../../core/collision.js';
import { NPCS } from '../../actors/npc.js';
import { toon, OUT, canvasTex } from '../../render/kit.js';
import { CAMPUS_GUIDE } from '../../world/campus-guide-layout.js';
import { swZ } from '../../world/layout.js';
import SIWEI_HALL from '../../world/buildings/siwei-hall/index.js';
import LAYOUT from './layout.json';
import { archPlacement, createArchPresence, placementConflicts } from './festival-arch-logic.js';
import { buildBalloonArch, countTriangles } from './balloon-arch.js';

const placement = archPlacement({ hallFront: CAMPUS_GUIDE.hallFront, avenue: CAMPUS_GUIDE.avenue, swZ, entrance: SIWEI_HALL.interior.entrance });
let lastBuilt = null;
const arch = createArchPresence({ scene, colliders, placement,
  build: () => (lastBuilt = buildBalloonArch({ toon, OUT, canvasTex, placement })) });
let conflicts = null;

// 沿用活動同步鉤子，不改邀請人的泡泡或材質。
const host = NPCS.find(n => n.id === 'bz26-host');

function sync() {
  const flags = state.flags || new Set(), on = flags.has('bz26_active');
  if (on !== arch.active) {
    arch.setActive(on);
    if (on) {
      // 會場的帳篷、看板碰撞與 venue-focus 收樹都已在 index.js 的 sync() 套用，這時檢查才準。
      conflicts = placementConflicts(placement, { colliders, spots: spots.filter(s => !s.room), tents: LAYOUT.tents });
      if (conflicts.length) console.warn('[bz26 arch] 拱門位置與既有物件重疊', conflicts);
    }
  }
}
if (host) { const prev = host.after; host.after = (n, dt) => { prev?.(n, dt); sync(); }; }
sync();
setInterval(sync, 500);

if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  window.__bz26arch = { placement, arch, host, sync, get conflicts() { return conflicts; }, get model() { return lastBuilt; },
    triangles: () => (arch.group ? countTriangles(arch.group) : 0) };
}
