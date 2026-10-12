/**
 * 除錯工具：網址加上 ?debug（例如 http://localhost:5173/?debug）或在 npm run dev 時，
 * 可以在瀏覽器主控台用 window.__game 查看遊戲狀態，例如：
 *   __game.pos                 玩家位置
 *   __game.teleport(0, -70)    瞬間移動
 *   __game.world.buildings     已載入的建築
 *   __game.zoneOf(__game.pos)  目前區域名稱
 *   __game.view(-60, 30, -60, -114, 10, -100)  從 (x,y,z) 看向 (x,y,z)，檢查建築外觀；__game.view() 回到一般視角
 */
import { state } from './state.js';
import { world, heightAt } from '../world/registry.js';
import { pos, spots, zoneOf } from './gameplay.js';

const on = import.meta.env.DEV || new URLSearchParams(location.search).has('debug');
if (on) {
  window.__game = {
    state, world, pos, spots, heightAt, zoneOf,
    teleport(x, z) { pos.set(x, heightAt(x, z), z); },
    view(...v) { state.viewCam = v.length === 6 ? v : null; },
  };
  console.info('[debug] window.__game 已啟用，建築：', world.buildings.map(b => b.id).join(', '));
}
