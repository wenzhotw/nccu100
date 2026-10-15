/**
 * 進入點：依序載入各模組。順序很重要：先引擎與工具，再場景，再角色與系統，最後才啟動遊戲迴圈。
 */
import './ui/styles.css';
import './core/dom.js';
import './core/engine.js';
import './systems/audio.js';
import './render/post.js';
import './render/kit.js';
import './core/collision.js';
import './world/layout.js';
import './world/props.js';
import './world/environment/sky.js';
import './world/terrain/ground.js';
import './render/water.js';
import './world/vegetation.js';
import './actors/police-car.js';
import './world/terrain/fountain.js';
import './world/terrain/avenue.js';
import './world/terrain/zhinan-road.js';
import './world/terrain/campus-roads.js';
import './world/terrain/service-road.js';
import './actors/campus-bus.js';
import './world/lots.js';
import './world/terrain/outer-roads.js';
import './world/terrain/back-road.js';
import './world/terrain/shop-street.js'; // 側門對面：麥當勞與左手邊的商店街
import './world/terrain/bade-road.js';
import './world/terrain/river.js';
import './world/terrain/creek-road.js';
import './world/environment/mountains.js';
import './world/buildings/index.js'; // 自動載入 world/buildings/ 底下每一棟建築
import './world/zones.js';
import './world/environment/grass.js';
import './world/environment/particles.js';
import './world/prefabs/flush.js'; // 全部建好後，把工具箱的東西合成一批一批畫（要在所有建築、地形之後）
import './world/bake/flush.js'; // 再把剩下沒名字、純色的小方塊合併成幾個大網格（要在工具箱之後、鏡頭防穿模之前）
import './actors/player.js';
import './actors/pangolin.js';
import './systems/stories.js';
import './ui/dialog.js';
import './core/input.js';
import './core/gameplay.js';
import './actors/npc.js';
import './systems/items.js';
import './ui/achievement.js';   // 獲得成就的畫面（台詞 then 寫 achieve:成就代號）
import './systems/pangolin-grab.js';
import './systems/missionaries/index.js'; // 學生傳教士與寶可夢式戰鬥
import './systems/old-principal/index.js'; // 老校長：騎馬、歷史問答、精神堡壘任務信函
import './systems/weather/index.js'; // 天氣：石獅子、下雨、偷傘、淋雨體力、四維道噴水磁磚
import './systems/swimming/index.js'; // 游泳館：換泳衣、救生員、下水游泳
import './systems/wenz/index.js'; // 遊戲製作人 Wenz：好玩嗎？破壞死光、Instagram
import './systems/eagle/index.js'; // 雄鷹吉祥物：收集三個故事後校長的任務，永久變身、飛行、四維堂頂樓躲 Wenz
import './systems/save.js'; // 存檔：進度存在玩家瀏覽器，要在所有任務系統之後載入
import './systems/police-drive.js';
import './systems/camera-occlusion.js';
import './systems/feel.js';
import './core/loop.js';
import './core/debug.js';
