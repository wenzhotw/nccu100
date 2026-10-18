# 山上校區灰盒（第一階段）實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**執行方式（本專案預設）：** ① 半自動協作。每個 Task 由 Codex 實作，Claude 審查。Codex 只改檔案、不提交；提交、推送、開 PR 都由 Claude 負責。使用者說「半自動執行 Task N」才開始。

**Goal：** 核心物件的相對位置照實際空拍，尺寸以好走、好擴充為準，把山上宿舍區做成可以走的三層灰盒地圖：好漢坡、外部斜坡、擋土牆、灰色建築方塊、地標和區域名稱。

**Architecture：**
- 地形高度和配置全部放在純資料或純函式模組（`layout.js`、`terrain.js`、`data/`），這些模組不 import three，可以用 Node 直接測。
- `map.js` 只負責把這些資料蓋成 3D 方塊和碰撞。
- 地形只用平台做高低差。階梯每階 0.3 公尺；坡道用每階 0.05 公尺的細台階，上面鋪一片斜面。

**Tech Stack：** three.js r149、Vite 5、`node --test`、Playwright（既有 `npm run smoke`）

**Spec：** `docs/superpowers/specs/2026-10-18-uphill-campus-design.md`；配置資料 `docs/superpowers/specs/2026-10-18-uphill-campus-layout.json`

## Global Constraints

- 只改 `src/world/buildings/uphill-campus/`。唯一例外是新增 `scripts/uphill-campus.test.mjs`（一行匯入，讓 `npm test` 跑得到；PR 要說明原因）。版本號照專案規則，在合併前才改。
- 座標：單位公尺，x 向東，z 向南。原點是山居下車點 `STOP = { x: 0, z: 0 }`。水平距離約為實際 × 0.6，高度約為實際 × 0.75；相對位置不可改變，尺寸可以為了好走而微調。
- 三層高度：`L1 = 0`、`L2 = 12`、`L3 = 15`。樓高每層 2.4 公尺，門高 2.2 公尺。
- 道路寬 6 公尺，人行段 3 公尺。
- 階梯每階高 0.3、深 0.8；每 12 階一個深 1.6 的休息平台。坡道每階高 0.05。
- 地圖範圍：x −120 到 +120，z −95 到 +100（z +65 以南先只鋪草地，保留給環山二道）。
- 燈光最多 3 盞，不開陰影；重複物件用 `InstancedMesh`；貼圖不超過 512 像素。
- 中文註解用繁體中文、全形標點，不用破折號。每個新檔案開頭用一段註解說明用途。
- 建築之間不可互相 import（`npm run check` 會擋）。
- OpenStreetMap 衍生資料要在資料檔和 README 標示「© OpenStreetMap 貢獻者（ODbL）」。

## Review Focus

1. **擋土牆邊不能掉下去或卡住**：走到第一、二層交界的非階梯處，要被碰撞擋住，不能直接掉到下面一層，也不能卡在牆裡。測試放 Task 5。
2. **階梯和坡道的接縫**：從平台走進階梯或坡道的第一階，以及最後一階走回平台時，高度差都不超過一階。測試放 Task 3、Task 4。
3. **好漢坡東支線（台階 9）的起點**：要接在主線上某一階的實際高度，不能憑空跳上去或跳下來。測試放 Task 3。
4. **下車點**：玩家下車的位置不能在任何建築碰撞盒裡，面向也要正確。測試放 Task 7。
5. **地圖範圍內不能有懸空的點**：`heightAt` 在範圍內每個點都要回傳有限數字；範圍外交給 `bounds` 擋住。測試放 Task 2。

---

### Task 0：送出 Issue（Claude）

**Files：** 無（草稿在 `.superpowers/issue-draft.md`，本機）

- [ ] **Step 1：** 使用者確認草稿內容後，用 `gh issue create` 送出，標題和內文照草稿。
- [ ] **Step 2：** 把 Issue 網址記進 `HANDOFF.md`。Task 7 的 PR 要等 wenzhotw 同意調整 `STOP` 才能合併；Task 1 到 6 可以先做。

---

### Task 1：配置資料與新的範圍、公車站位置

**Files：**
- Create: `src/world/buildings/uphill-campus/data/layout.json`（從規格配置資料複製，加上授權說明欄位 `_license`）
- Modify: `src/world/buildings/uphill-campus/layout.js`
- Create: `src/world/buildings/uphill-campus/tests/layout.test.mjs`
- Create: `scripts/uphill-campus.test.mjs`

**Interfaces：**
- Produces（`layout.js`）：
  - `SCALE = 0.6`、`LEVELS = { L1: 0, L2: 12, L3: 15 }`、`FLOOR_H = 2.4`
  - `R = { x0: -120, x1: 120, z0: -95, z1: 100 }`、`SIZE = { w: 240, d: 195 }`
  - `ANCHORS`：`{ [名稱: string]: { x: number, z: number, level: 'L1' | 'L2' | 'L3' } }`。至少包含 `LAYOUT.landmarks` 的每個地標（福利社(Google) 除外），以及「五舍入口」「六舍入口」「七八舍入口」「九舍D區入口」「安九正門」「十舍入口」「好漢坡下」「好漢坡上」「好漢坡東支線上」「外部斜坡下」「外部斜坡上」「觀景步道」。之後加 NPC、故事、互動點時用名字取座標。
  - `STOP = { x: 0, z: 0 }`
  - `LAYOUT`：讀進來的 `data/layout.json`
  - `REGIONS`：`[{ level: 'L1' | 'L2' | 'L3', poly: [[x, z], ...] }]`，數值見 Step 3
  - `PLATFORMS` 保留並匯出空陣列（舊介面相容）

- [ ] **Step 1：寫失敗測試** `tests/layout.test.mjs`

> 下面三個測試是最後的樣子。施工時照 TDD 一次只加一個：加一個測試、看它紅、寫最少實作讓它綠，再加下一個。
> 第二、三層的交界沿著九舍 ABC 區（整塊不能走的建築體）中間走，所以山居下車點、安九正門在第二層，旋轉樓梯銜接建築、九舍 D 區、十舍在第三層。外部斜坡頂端 (−12, −20.3) 落在第三層內 1.5 公尺，走出斜坡頂不會掉到第二層。

```js
import test from 'node:test'; import assert from 'node:assert/strict';
import { STOP, R, LEVELS, REGIONS, LAYOUT, ANCHORS } from '../layout.js';
test('公車站在原點，地圖範圍包含所有地標', () => {
  assert.deepEqual(STOP, { x: 0, z: 0 });
  for (const [name, [x, z]] of Object.entries(LAYOUT.landmarks))
    assert.ok(x > R.x0 && x < R.x1 && z > R.z0 && z < R.z1, name);
});
test('三層高度與分區', () => {
  assert.deepEqual(LEVELS, { L1: 0, L2: 12, L3: 15 });
  assert.deepEqual(REGIONS.map(r => r.level).sort(), ['L1', 'L2', 'L3']);
});
test('錨點都在範圍內，而且標了層別', () => {
  for (const name of ['五舍入口', '安九正門', '好漢坡下', '好漢坡上', '外部斜坡上', '觀景步道']) {
    const a = ANCHORS[name]; assert.ok(a, name);
    assert.ok(a.x > R.x0 && a.x < R.x1 && a.z > R.z0 && a.z < R.z1, name);
    assert.ok(['L1', 'L2', 'L3'].includes(a.level), name);
  }
});
```

`scripts/uphill-campus.test.mjs` 是一段用途註解加一行匯入：`import '../src/world/buildings/uphill-campus/tests/index.mjs';`。`tests/index.mjs` 匯入資料夾內所有 `*.test.mjs`，之後的 Task 新增測試檔時要加進這份清單。

- [ ] **Step 2：** 執行 `node --test src/world/buildings/uphill-campus/tests/layout.test.mjs`，預期 FAIL（找不到 `LEVELS` 等匯出）。
- [ ] **Step 3：實作 `layout.js`。** `REGIONS` 用下面的數值，超出 `R` 的點夾回邊界：
  - L1：`[[-188,-23.4],[-142.6,-39.5],[-71.1,-49.2],[-41.9,-57.2],[3.6,-78.2],[23.1,-87.9],[36.1,-78.2],[10.1,-62.1],[-28.9,-45.9],[-41.9,-42.7],[-71.1,-33],[-84.1,-21.8],[-92.2,-10.5],[-116.6,-4],[-184.8,-4]]`
  - L2：`[[-84.1,-21.8],[-71.1,-33],[-41.9,-42.7],[-12.7,-33],[-16,-18.5],[-0.7,-17.2],[52,-10.9],[55.5,-6],[55.5,14],[-12,14],[-15.9,21.8],[-28.9,45],[-54.9,48.2],[-77.6,62.1],[-96.5,41.1],[-94.5,8.9],[-92.2,-10.5]]`
  - L3：`[[-12,-52.4],[3.6,-57.2],[55.5,-60.5],[110.8,-78.2],[114,-2.4],[55.5,-6],[52,-10.9],[-0.7,-17.2],[-16,-18.5],[-12.7,-33]]`
  - JSON 用 `import ... with { type: 'json' }` 讀入；Vite 5 和 Node 22 都支援。
- [ ] **Step 3b：** 加測試：關鍵錨點的 `level` 要和它所在的 `REGIONS` 一致（山居下車點、安九正門、觀景步道在 L2；旋轉樓梯銜接建築、服務中心、自強十舍在 L3；蔣公銅像、好漢坡站在 L1），三個多邊形的點都在 `R` 內。JSON 檔不能寫註解，用途和授權寫在 `_說明`、`_license` 欄位。
- [ ] **Step 4：** 再跑一次，預期 PASS。再跑 `npm test`，確認既有測試仍然全綠。
- [ ] **Step 5：** 交給 Claude 審查。審查通過後由 Claude 提交：`feat(uphill): 山上校區配置資料與新範圍`。

---

### Task 2：三層平台高度 `heightAt`

**Files：**
- Create: `src/world/buildings/uphill-campus/terrain.js`
- Create: `src/world/buildings/uphill-campus/tests/terrain.test.mjs`

**Interfaces：**
- Consumes：Task 1 的 `REGIONS`、`LEVELS`、`R`。
- Produces：
  - `heightAt(x: number, z: number): number`：之後 Task 3、4 會在這裡加上階梯和坡道。
  - `regionAt(x, z): 'L1' | 'L2' | 'L3' | null`
  - `pointInPoly(x, z, poly): boolean`

- [ ] **Step 1：寫失敗測試**：三個地標落在正確的層。

```js
assert.equal(heightAt(-90.6, -31.4), 0);    // 蔣公銅像
assert.equal(heightAt(-40, 0), 12);         // 五六舍之間
assert.equal(heightAt(73, -36), 15);        // 服務中心
```

- [ ] **Step 2：** 執行，預期 FAIL。
- [ ] **Step 3：** 實作 `pointInPoly`（射線法）、`regionAt`、`heightAt`。不在任何分區內的點，高度用最近分區的層高。
- [ ] **Step 4：** 執行，預期 PASS。
- [ ] **Step 5：寫失敗測試（Review Focus 5）**：在 `R` 範圍內每 2 公尺取樣，`heightAt` 都要回傳 0、12 或 15 其中之一。
- [ ] **Step 6：** 執行，預期 FAIL 或 PASS。如果一開始就 PASS，要在測試註解寫明原因（Step 3 的「用最近分區層高」已經處理了這個情況）。
- [ ] **Step 7：** 修到通過。整份測試檔全綠後交給 Claude 審查，再提交 `feat(uphill): 三層平台高度`。

---

### Task 3：好漢坡階梯（主線與東支線）

**Files：**
- Modify: `src/world/buildings/uphill-campus/terrain.js`
- Modify: `src/world/buildings/uphill-campus/layout.js`（新增 `STAIRS`）
- Create: `src/world/buildings/uphill-campus/tests/stairs.test.mjs`

**Interfaces：**
- Produces（`layout.js`）：
  - `STAIRS = [{ id: 'haohanpo', path, width: 3.2, from: 0, to: 12 }, { id: 'haohanpo-east', path, width: 2.4, joinStair: 'haohanpo', to: 15 }]`
  - 主線 `path` 從 `[-38.2,-43.4]` 開始，依序經過 `[-40.3,-39.3]`、`[-46.5,-32.1]`、`[-46.6,-28.4]`、`[-56.5,-19.5]`，到 `[-60.5,-8.1]` 結束；最前面再接上 `[-43.1,-43.1]` 這段，讓階梯從環山一道起步。
  - 東支線 `path`：`[[-46.6,-28.4],[-29.1,-25.2],[-19.6,-22.6],[-12,-20.3]]`
- Produces（`terrain.js`）：
  - `stairHeight(stair, s: number): number`：`s` 是沿著路徑走的距離（公尺）。
  - `heightAt` 的優先順序改成：階梯範圍內，用階梯高度；不在階梯上，用平台高度。

- [ ] **Step 1：寫失敗測試**：沿主線每 0.1 公尺取樣，起點高度 0、終點 12；共 40 階；高度只增不減；任兩個相鄰樣本的高度差不超過 0.3 + 1e-9；每段 0.3 公尺的升高對應的水平距離不小於 0.8。
- [ ] **Step 2：** 執行，預期 FAIL。
- [ ] **Step 3：** 實作 `stairHeight`：每 12 階加一個 1.6 公尺的休息平台；路徑比需要的長時，多出來的長度平均分給各個休息平台。在 `heightAt` 加上「離路徑中線的距離不超過 `width / 2` 就用階梯高度」。
- [ ] **Step 4：** 執行，預期 PASS。
- [ ] **Step 5：寫失敗測試（Review Focus 2、3）**：
  - 主線起點往外 0.5 公尺，平台高度和第一階的差不超過 0.3；終點也一樣。
  - 東支線起點的高度，等於主線在 `[-46.6,-28.4]` 這一點的階梯高度。
  - 東支線終點高度是 15，沿線高度只增不減，相鄰樣本差不超過 0.3。
- [ ] **Step 6：** 執行，預期 FAIL。實作 `joinStair`：起點高度取主線在接點的 `stairHeight`。再執行，預期 PASS。
- [ ] **Step 7：** 交給 Claude 審查，再提交 `feat(uphill): 好漢坡階梯`。

---

### Task 4：外部斜坡（Z 接 P 南段）

**Files：**
- Modify: `layout.js`（新增 `RAMPS`）、`terrain.js`
- Create: `tests/ramp.test.mjs`

**Interfaces：**
- Produces：
  - `RAMPS = [{ id: 'z-p', path: [[-4.9,10.3],[-7.2,-3],[-11.8,-8.1],[-12,-20.3]], width: 7, from: 12, to: 15, step: 0.05 }]`
  - `rampHeight(ramp, s): number`
  - `heightAt` 的優先順序：階梯 > 坡道 > 平台。

- [ ] **Step 1：寫失敗測試**：
  - 起點 12、終點 15。
  - 每 0.05 公尺取樣，高度只增不減，相鄰差不超過 0.05 + 1e-9。
  - 終點以北的 P 平路段，例如 `[-0.6,-34.9]`，高度是 15。
- [ ] **Step 2：** 執行，預期 FAIL。
- [ ] **Step 3：** 實作 `rampHeight`：高度依沿路徑的距離線性增加，再以 `step` 為單位往下取整。
- [ ] **Step 4：** 執行，預期 PASS。
- [ ] **Step 5：寫失敗測試（Review Focus 2）**：坡道兩端往外 0.5 公尺，和平台的高度差不超過 0.05。執行，預期 FAIL 或 PASS；如果失敗就修到通過。
- [ ] **Step 6：** 交給 Claude 審查，再提交 `feat(uphill): 外部斜坡`。

---

### Task 5：灰盒建模與擋土牆碰撞

**Files：**
- Modify: `src/world/buildings/uphill-campus/map.js`（改寫：拿掉「規劃中」看板和全寬車道）
- Create: `src/world/buildings/uphill-campus/greybox.js`（地面、道路、建築方塊、擋土牆的蓋法）
- Modify: `terrain.js`（新增 `wallSegments`）
- Create: `tests/walls.test.mjs`

**Interfaces：**
- Consumes：`REGIONS`、`STAIRS`、`RAMPS`、`LAYOUT`、`heightAt`。
- Produces：
  - `wallSegments(): Array<{ a: [x, z], b: [x, z], low: number, high: number }>`：兩層交界，扣掉階梯和坡道開口。
  - `buildGreybox(): void`（在 `greybox.js`，由 `buildMap()` 呼叫）
- 建模規則：
  - 每層平台用 `block` 蓋到該層高度。
  - 道路用 `flat` 沿著 `LAYOUT.roads` 的折線鋪，寬 6。
  - 建築用 `LAYOUT.buildings` 的輪廓，以 `THREE.ExtrudeGeometry` 長成灰色方塊。每層樓 `FLOOR_H`；五六七八舍 5 層、九舍 6 層、十舍 9 層。
  - 碰撞用簡化方塊：每棟建築最多 4 個 `boxC` 或 `obbC`，不照每個凹凸做，避免卡牆角。擋土牆每段一個。
  - 效能：同材質的地面、道路、建築、牆，各自合併成一個 `BufferGeometry`（`BufferGeometryUtils.mergeGeometries`）；階梯用 `InstancedMesh`。

- [ ] **Step 1：寫失敗測試**：`wallSegments()` 不是空的；每段的中點兩側往外 1 公尺，`heightAt` 的差至少 3.4；好漢坡和坡道的中線，不和任何牆段相交。
- [ ] **Step 2：** 執行，預期 FAIL。
- [ ] **Step 3：** 實作 `wallSegments`：沿著各分區的邊，每 1 公尺取樣，兩側高度差超過 0.5 的地方算牆；落在階梯或坡道寬度範圍內的部分剔除。
- [ ] **Step 4：** 執行，預期 PASS。
- [ ] **Step 5：寫失敗測試（Review Focus 1）**：仿照 `swimming-hall/check-model.mjs` 的 `path()` 輔助函式，用 `core/collision.js` 的 `resolve`。從 `[-60,-30]`（第二層）直線走向 `[-60,-40]`（第一層），最後的 z 不能小於牆線。
- [ ] **Step 6：** 執行，預期 FAIL。實作 `greybox.js`，把牆段加上碰撞。再執行，預期 PASS。
- [ ] **Step 7：寫失敗測試（效能上限）**：仿照 `swimming-hall/check-model.mjs` 的作法，在 Node 裡呼叫 `buildGreybox()`（替 `document` 做最小假物件），走訪產生的物件。斷言：可繪製的 Mesh 總數不超過 40，三角形總數不超過 60000。先執行看到 FAIL（或還沒合併時超標），合併後 PASS。
- [ ] **Step 8：** 執行 `npm run build`，再用 `npm run dev` 加 `__game.enterRoom('uphill-campus')` 實際走一圈。截桌機 1280×800 和手機 375×812 的畫面，和 `previews/00-全區空拍規劃.png` 對照道路和建築位置；截圖附在交給 Claude 審查的回報裡。
- [ ] **Step 9：** 交給 Claude 審查，再提交 `feat(uphill): 灰盒地形、建築與擋土牆`。

---

### Task 6：地標與區域名稱

**Files：**
- Create: `src/world/buildings/uphill-campus/landmarks.js`
- Modify: `map.js`（呼叫 `buildLandmarks()`；`mapZone` 改用分區與地標）
- Create: `tests/zones.test.mjs`

**Interfaces：**
- Produces：
  - `buildLandmarks(): void`：蓋出蔣公銅像圓環、好漢坡站三座候車亭、山居站牌、遮雨棚（`LAYOUT.landmarks` 的遮雨棚西端、東端，頂高 15 + 3）、旋轉樓梯銜接建築（一層樓，在 `[32.8,-25]`），觀景路段西北方的遠景（台北市區方塊群加 101 剪影，放在地圖範圍外西北約 300 公尺），以及主要路口的指路牌（至少在好漢坡上下、外部斜坡上下、山居下車點各一面，寫往哪些建築）。
  - `zoneName(p: { x, z }): string`

- [ ] **Step 1：寫失敗測試** `zoneName`：

```js
assert.equal(zoneName({ x: -90.6, z: -31.4 }), '蔣公銅像');
assert.equal(zoneName({ x: -42.7, z: -50 }), '好漢坡站');
assert.equal(zoneName({ x: -50, z: -25 }), '好漢坡');
assert.equal(zoneName({ x: 0, z: 0 }), '山居學習中心');
assert.equal(zoneName({ x: -73.7, z: -1.3 }), '觀景步道');
assert.equal(zoneName({ x: 72.6, z: -36.3 }), '服務中心');
assert.equal(zoneName({ x: 69.6, z: -15.5 }), '自強十舍');
```

- [ ] **Step 2：** 執行，預期 FAIL。
- [ ] **Step 3：** 實作 `zoneName`：地標半徑 8 公尺內，用地標名稱，但要拿掉括號裡的說明（例如「山居下車點」顯示為「山居學習中心」，「福利社(Google)」不列入）；在階梯上，叫「好漢坡」；在觀景路段 4 公尺內，叫「觀景步道」；在建築輪廓內或旁邊，用建築名稱；其餘依層叫「環山一道」「自強宿舍區」「自強九舍・十舍」。
- [ ] **Step 4：** 執行，預期 PASS。
- [ ] **Step 5：** 實作 `buildLandmarks()`，`npm run dev` 走到每個地標截圖。觀景路段要截一張朝西北看得到 101 剪影的畫面。
- [ ] **Step 6：** 交給 Claude 審查，再提交 `feat(uphill): 地標與區域名稱`。

---

### Task 7：上下車、整合驗收與交件（需要 Issue 同意）

**Files：**
- Modify: `src/world/buildings/uphill-campus/index.js`（只改 `spawn` 的 `x`、`z`、`face`、`yaw`；`entrance`、`returnTo` 不動）
- Modify: `src/world/buildings/uphill-campus/README.md`（填寫負責人、規劃、進度紀錄、OSM 授權）
- Create: `tests/spawn.test.mjs`
- Modify（合併前，Claude 負責）：`index.html` 的 `.ver`、`package.json`、`package-lock.json` 版本號 +0.01

**Interfaces：**
- Consumes：`STOP`、`heightAt`、`LAYOUT.buildings`。
- Produces：匯出 `SPAWN = { x, z, face, yaw }`（放在 `layout.js`），`index.js` 改成讀這個常數。

- [ ] **Step 1：寫失敗測試（Review Focus 4）**：
  - `SPAWN` 到每個建築輪廓的距離至少 1.5 公尺。
  - `heightAt(SPAWN.x, SPAWN.z)` 是 12。
  - `face` 讓玩家面向北邊（z 變小的方向）。
- [ ] **Step 2：** 執行，預期 FAIL。
- [ ] **Step 3：** 實作 `SPAWN`，改 `index.js` 讀它。
- [ ] **Step 4：** 執行，預期 PASS。
- [ ] **Step 5：全套驗證**：`npm run check`、`npm test`、`npm run build`、`npm run smoke` 全部通過。開 `?perf` 走完規格第十節的路線，記下 p95 幀時間和 render calls；手機寬度也走一次。
- [ ] **Step 6：** 更新 README 和 `HANDOFF.md` 的驗證證據。交給 Claude 審查。
- [ ] **Step 7（Claude）：** Issue 同意後提交，推送分支、開 PR，附截圖。合併 `main` 要等使用者明說。

---

## 之後的計畫（不在這一份裡）

- **第二階段**：安九室內與旋轉樓梯。要等 Issue 結果，另寫計畫。
- **第三階段**：各建築的正式造型，一棟一份計畫。
- **第四階段**：環山二道（縮短版）和「召喚雨神」水上溜滑梯。要先另開一輪設計討論。
