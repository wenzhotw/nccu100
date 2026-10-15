# 給 AI 助手的專案說明

政大校園 3D 小遊戲。three.js r149 + Vite 5，純前端，部署在 GitHub Pages（https://wenzhotw.github.io/nccu100/）。

## 指令

- `npm run dev`：開發
- `npm run build`：打包到 dist/
- `npm run check`：結構與內容檢查（必跑）
- `npm run smoke`：無頭瀏覽器冒煙測試（先 build）
- `npm run new-building -- <id> <中文名>`：建立建築資料夾
- `npm run new-interior -- <id>`：幫建築建立室內房間模板

## 架構重點

- 建築：`src/world/buildings/<id>/index.js` 預設匯出 `defineBuilding({ id, name, build, heightAt?, zones?, map?, interior? })`，由 `src/world/buildings/index.js` 用 `import.meta.glob` 自動載入。**建築之間不可互相 import**；共用工具放 `src/world/building-kit.js`。
- 遊戲邏輯只透過 `src/world/registry.js`（`heightAt`、`zoneAt`、`world.mapShapes`、`world.interiors`）取得建築資訊。
- 區域名稱 priority 對照表在 `src/world/zones.js` 開頭。
- 共用可變狀態放 `state`（`src/core/state.js`）；`late`（`src/core/late.js`）是讓先載入模組呼叫後載入模組的過渡機制。
- 台詞與劇情在 `src/content/*.json`，由 `src/content/index.js` 解讀（`when` 條件、`{found}` 變數、`then` 動作）。格式說明：`docs/content.md`。
- 重複出現的東西（樹、路燈、花台……）用工具箱 `asPrefab()`（`src/world/prefabs/`，說明：`docs/prefabs.md`），形狀和材質要共用，只放不會動的東西。
- 室外場景蓋完之後會自動跑一次靜態烘焙（`src/world/bake/`，說明：`docs/bake.md`），把沒有名字的純色小方塊合併成少數幾個大網格；不用改建築程式，但新加的東西如果之後要用名字找到、會動、會變色，記得設 `name` 或 `userData.noOcc`。
- 材質用 `toon()`、`basic()`，幾何用 `block()`、`mk()`、`flat()`、`plane()`（`src/render/kit.js`）；碰撞用 `boxC`、`circC`、`obbC`（`src/core/collision.js`）。
- 座標：單位公尺；從校門面向四維堂，x 越大越右，z 越小越裡面。
- 山上校區：另一張獨立地圖（`src/world/buildings/uphill-campus/`），在行政大樓乘車處搭公車上下山。**做山上校區相關工作前，先讀該資料夾的 README.md**，裡面有風格、分工與避免衝突的規範。
- 室內：每個室內是獨立場景（`src/core/rooms.js`），建築用 `interior` 欄位登記，進門換場景。用 `indoor()`、`state.room` 判斷；互動點加 `room`。說明：`docs/interiors.md`。四維堂室內的座標沿用 x = IX = 300。

## 風格

- 中文註解與文件用繁體中文、全形標點，不使用破折號。
- 畫面目標：任天堂／原神式明亮卡通風；手機也要流暢。
- 改動以行為不變為原則；改到共用檔案時說明原因。

## 版本號

- 開始畫面卡片最下面顯示版本號（`index.html` 的 `.ver`，同時改 `package.json` 的 `version`）。
- 每次更新（每個合併的 PR）版本號加 0.01，例如 v1.24 → v1.25。
