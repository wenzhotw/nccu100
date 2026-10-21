# 架構說明

## 一句話

`main.js` 依序載入各模組；建築資料夾由 `world/buildings/index.js` 自動找到並登記到 `world/registry.js`；遊戲邏輯只讀登記處，不認識任何一棟建築。

## 載入順序

```
core/dom, core/engine        建立畫面、相機、場景
systems/audio                合成音樂與音效
render/*                     材質、卡通光影、後製
world/layout, props, sky     道路中心線、共用小物件、天空與太陽
world/terrain/*              地面、四維道、噴水池、道路、醉夢溪
world/environment/mountains  遠山
world/buildings/index.js     ★ 自動載入每一棟建築
world/zones.js               道路與廣場的區域名稱
world/environment/grass…     草地（要在建築之後，才會避開建築）
actors/*                     玩家、穿山甲、NPC、警車、公車
systems/*                    道具、故事、開警車、抓穿山甲、鏡頭
core/loop.js                 每一幀的更新與繪製
```

## 世界登記處（world/registry.js）

建築與地形把這些東西登記進來：

| 登記項目 | 用途 | 誰在讀 |
| --- | --- | --- |
| `heights` | 可以走上去的高度（階梯、平台、橋） | 玩家、NPC 移動，`heightAt(x, z)` |
| `zones` | 區域名稱（依 priority 由小到大判斷） | 畫面上方的地區橫幅，`zoneAt(p)` |
| `mapShapes` | 地圖圖示（矩形或自訂畫法） | 百年秘寶地圖、小地圖 |
| `interiors` | 室內房間（獨立場景、門、範圍），見 [interiors.md](interiors.md) | `core/rooms.js`、`core/gameplay.js` 的門 |

建築用 `defineBuilding({...})` 一次宣告全部；地形用 `registerHeight()`、`registerZone()`。

### 為什麼這樣設計

原本所有程式寫在一個檔案，遊戲邏輯直接引用每棟建築的變數（例如圖書館的階梯位置）。多人一起改時，改一棟建築就可能弄壞別人的東西。現在：

- 新增建築不用改任何共用檔案
- 一棟建築建模失敗，其他建築照常顯示（錯誤會印在主控台）
- 每個人負責自己的資料夾，PR 衝突少

## 共用狀態（core/state.js 與 core/late.js）

- `state`：好幾個模組都會讀寫的遊戲狀態（收集數、是否在開車、鏡頭角度…）。
- `late`：讓早載入的模組呼叫晚載入模組的函式（例如輸入模組要呼叫互動）。這是從單檔拆分時留下的過渡做法，之後可以逐步改成事件。

## 內容（content/）

台詞、NPC 名單、校園故事都是 JSON。`content/index.js` 負責依遊戲狀態挑台詞、代換 `{found}` 這類變數、執行台詞結束後的動作，並在啟動時檢查格式。詳見 [content.md](content.md)。

## 畫面風格

- 材質一律用 `toon()`（MeshToonMaterial + 柔邊明暗 + 邊緣光），顏色飽和、明亮
- 外框用 `outline()`（反面放大的深色殼）
- 後製：MSAA、泛光、調色、暗角，會依幀率自動降畫質
- 完整規範（調色盤、描邊粗細、貼圖畫法、不同技術的轉換規則、檢查表）：[art-style.md](art-style.md)

## 之後可以做的事

- 把 `late` 改成事件系統（`emit('item:got', ...)`）
- 存檔（localStorage）
- 建築模型改用 Blender 做、輸出 glTF，放在建築資料夾裡載入
- 換成 TypeScript，讓編輯器提示更完整
