# 工具箱（預製物件）

重複出現的東西（樹、路燈、花台、灌木、校旗燈桿、短柱）不要一個一個加進場景，改用工具箱：
程式照常用 `mk()`、`block()` 拼，外面包一層 `asPrefab()`。全部建築蓋完後，同形狀、同材質、同一區塊（48 公尺）的東西會合成一個 `InstancedMesh`，一次畫完。外觀、黑邊、影子都不變。

程式在 `src/world/prefabs/`，`flush.js` 由 `main.js` 在所有建築、地形之後載入。

## 用法

```js
import { asPrefab } from '../prefabs/index.js';   // 路徑依檔案位置調整

const POLE = new THREE.CylinderGeometry(0.07, 0.09, 5.6, 7);   // 形狀放在函式外面共用
function lamp(x, z) {
  asPrefab(() => {
    mk(POLE, toon('#a3a8ae'), x, 2.8, z, { out: 0.015 });
  });
  circC(x, z, 0.14);   // 碰撞照常登記
}
```

## 一定要遵守

1. **形狀要共用**：`new THREE.CylinderGeometry(...)` 放在函式外面。每次呼叫都 new 的話，每個都是不同形狀，沒辦法合批。`BOX`、`SPH`（`render/kit.js`）本來就是共用的。
2. **材質要共用**：`toon('#顏色')` 會自動共用；有貼圖的 `basic({ map })` 要放在函式外面只建一次。
3. **只放不會動的東西**：包起來之後就拿不到網格了。旗子、NPC、會被程式改位置或顏色的東西不要包。
4. **碰撞在外面登記**：`boxC()`、`circC()` 不受影響，照常寫。
5. 室內房間（`interior`）裡的東西目前不用包，房間是第一次進去才建立的。

## 進階

- **擋視線時淡掉（樹冠）**：`const pf = asPrefab(fn, { fade: () => [要淡掉的網格] })`，之後 `pf.setFade(0～1)`。淡出用「網點」方式（遠看像半透明），不用排序。`world/vegetation.js` 的 `tree()`、`palm()`、`banyan()` 已經接好 `systems/foliage-fade.js`。
- **會搖晃（椰子樹葉）**：`asPrefab(fn, { sway: () => 樹冠群組 })`，之後改那個群組的角度，`core/loop.js` 每一幀會呼叫 `updatePrefabs()` 更新。

## 目前在工具箱裡的

| 物件 | 在哪裡 |
| --- | --- |
| 樹、椰子樹、榕樹 | `world/vegetation.js`：`tree()`、`palm()`、`banyan()` |
| 灰色三角頭路燈 | `world/terrain/back-road.js`：`lamp()`（八德道也用） |
| 水泥花台加灌木 | `back-road.js`、`bade-road.js`：`planter()` |
| 樹穴 | `bade-road.js` |
| 灌木、樹籬 | 側門廣場、四維堂廊道 |
| 白色圓頭路燈 | 中正圖書館前 |
| 校旗燈桿、短柱 | `world/props.js`：`bannerPole()`、`bollard()` |

## 量測

用 `?perf` 看 `renderCalls`（見 `docs/performance.md`）。`window.__game` 底下沒有工具箱統計；在主控台可以 `import('/src/world/prefabs/index.js').then(m => m.prefabStats())`（開發模式）。
