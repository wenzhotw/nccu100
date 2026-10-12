# 參與指南

謝謝你想一起蓋政大！這份指南寫給第一次參與開源專案、第一次做遊戲的人。

## 一、基本流程

1. **先開 Issue 或在 Issue 留言認領**，說你要做什麼，避免兩個人做同一件事。
2. **開一個新分支**，名稱用你要做的事，例如 `building/student-center`、`content/new-npc`、`fix/stairs-height`。
3. 改完後跑：
   ```bash
   npm run check
   npm run build
   ```
4. **送 Pull Request（PR）**，在說明裡附一張遊戲截圖。
5. 至少一位夥伴看過、自動檢查通過，就可以合併。合併到 `main` 之後網站會自動更新。

不要直接推到 `main`。

## 二、新增一棟建築

每棟建築是 `src/world/buildings/` 底下的一個資料夾，彼此完全獨立。

```bash
npm run new-building -- student-center 學生活動中心
npm run dev
```

會產生：

```
src/world/buildings/student-center/
├── index.js     建模程式（先是一個佔位方塊）
├── README.md    負責人、狀態、筆記
└── photos/      參考照片（請壓縮到 500KB 以下）
```

接著：

1. 在 `index.js` 把 `X`、`Z` 改成實際位置。座標單位是公尺；從校門面向四維堂時，x 越大越右邊，z 越小越裡面。參考點：校門約 `(0, 10)`，噴水池約 `(0, -32)`，四維堂約 `(0, -87)`。
   可以在遊戲裡走到那個位置，主控台打 `__game.pos` 看座標。
2. 在 `build()` 裡用 `block()`、`mk()` 等工具把建築雕出來，用 `boxC()` 加碰撞。
3. 如果有可以走上去的階梯或平台，寫 `heightAt(x, z)`：在範圍內回傳高度，其他地方回傳 `null`。
4. 寫 `zones`（走進去時畫面顯示的區域名稱）和 `map`（地圖上的圖示）。
5. 如果這個位置原本有「預定地」告示牌，到 `src/world/lots.js` 把那一筆刪掉。

### 建築的三條規則

- **不可以 import 別棟建築的檔案。** 需要共用的東西（例如窗戶材質）放到 `src/world/building-kit.js`，並在 PR 說明。
- **資料夾名稱等於 id。** 小寫英文加連字號。
- **只改自己的資料夾。** 需要改共用檔案（`core/`、`render/`、`registry.js`）時，先開 Issue 討論。

`npm run check` 會自動檢查前兩條。

## 三、修改台詞與劇情

台詞都在 `src/content/`，是 JSON 格式，不用懂程式也能改。說明在 [docs/content.md](docs/content.md)。

常見錯誤：JSON 最後一項後面不能有逗號、字串要用半形雙引號 `"`。跑一次 `npm run check` 就會告訴你哪裡錯。

## 四、寫程式的習慣

- 註解與文件用繁體中文，標點符號用全形。
- 新檔案開頭寫一段註解，說明這個檔案做什麼。
- 效能：手機也要能玩。大量重複的物件（樹、草）用 `InstancedMesh`，貼圖用小尺寸 canvas。
- 改到共用狀態時用 `state.xxx`（`src/core/state.js`），不要新增全域變數。

## 五、誰負責什麼

`.github/CODEOWNERS` 記錄每個資料夾的負責人。改到別人負責的資料夾時，GitHub 會自動請他審查。認領建築後，請把自己加進 CODEOWNERS 和那棟建築的 README.md。

## 六、卡住了？

開一個 Issue 問，或在 PR 裡留言。沒有笨問題。
