# 給 AI 助手的專案說明

政大校園 3D 小遊戲。three.js r149 + Vite 5，純前端，部署在 GitHub Pages（https://wenzhotw.github.io/nccu100/）。

## 指令

- `npm run dev`：開發
- `npm run build`：打包到 dist/
- `npm run check`：結構與內容檢查（必跑）
- `npm run smoke`：無頭瀏覽器冒煙測試（先 build）
- `npm run new-building -- <id> <中文名>`：建立建築資料夾

## 架構重點

- 建築：`src/world/buildings/<id>/index.js` 預設匯出 `defineBuilding({ id, name, build, heightAt?, zones?, map?, interior? })`，由 `src/world/buildings/index.js` 用 `import.meta.glob` 自動載入。**建築之間不可互相 import**；共用工具放 `src/world/building-kit.js`。
- 遊戲邏輯只透過 `src/world/registry.js`（`heightAt`、`zoneAt`、`world.mapShapes`、`world.interiors`）取得建築資訊。
- 區域名稱 priority 對照表在 `src/world/zones.js` 開頭。
- 共用可變狀態放 `state`（`src/core/state.js`）；`late`（`src/core/late.js`）是讓先載入模組呼叫後載入模組的過渡機制。
- 台詞與劇情在 `src/content/*.json`，由 `src/content/index.js` 解讀（`when` 條件、`{found}` 變數、`then` 動作）。格式說明：`docs/content.md`。
- 材質用 `toon()`、`basic()`，幾何用 `block()`、`mk()`、`flat()`、`plane()`（`src/render/kit.js`）；碰撞用 `boxC`、`circC`、`obbC`（`src/core/collision.js`）。
- 座標：單位公尺；從校門面向四維堂，x 越大越右，z 越小越裡面。四維堂室內在 x = IX = 300。

## 風格

- 中文註解與文件用繁體中文、全形標點，不使用破折號。
- 畫面目標：任天堂／原神式明亮卡通風；手機也要流暢。
- 改動以行為不變為原則；改到共用檔案時說明原因。
