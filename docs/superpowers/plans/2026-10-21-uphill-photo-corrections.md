# 山上校區照片修正（外部斜坡與九舍）實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: 本專案預設實作方式為半自動協作（Codex 施工、Claude 審查），依 `semi-auto-collab` 執行。Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依使用者 2026-10-20 實地照片（IMG_9009～9035），修正空拍編號 11、12 一帶的外部斜坡地形，把九舍中庭與中間的一層樓大廳做進場景，並做出大廳室內與旋轉樓梯。

**Architecture:** 只改 `src/world/buildings/uphill-campus/`。地形仍由 `layout.js` 的 `RAMPS`、`STAIRS` 與 `terrain.js` 的 `heightAt` 決定；外觀與碰撞在 `greybox.js`；指路牌在 `landmarks.js`。新增的樓層數與大廳設定集中在 `layout.js`，`greybox.js` 讀取，不在繪製程式裡寫死建築編號。

**Tech Stack:** three.js r149、Vite 5、`node:test`（`npm test` 約 4 分鐘）、`npm run check`、`npm run build`。

**Spec:** 本計畫的依據是照片與下方「照片判讀」，加上既有 `docs/superpowers/specs/2026-10-18-uphill-campus-design.md`。

## Global Constraints

- 只改 `src/world/buildings/uphill-campus/`（唯一例外：階段 8c 旋轉樓梯轉場要改的 `src/core/gameplay.js`，須先開 Issue）；版本號（`index.html` 的 `.ver`、`package.json`、`package-lock.json`）每個合併的 PR 加 0.01。
- 中文註解與文件用繁體中文、全形標點，不使用破折號。
- 畫面目標：任天堂／原神式明亮卡通風；手機也要流暢。
- `STOP`、`SPAWN`、`BOARD`、`exit`、`entrance`、`returnTo` 不動。
- 坡道高度維持連續線性（使用者 Task 7 要求「平滑、不要階梯狀」）。
- 照片含車牌與路人，**照片不進版控**；計畫只引用檔名。

## 照片判讀

照片內的 GPS 已用 OSM 建物輪廓校正換算成遊戲座標（校正誤差 0.07 公尺；手機 GPS 本身約 ±3 公尺）。方向是拍攝時的羅盤角度（0 北、90 東）。

| 照片 | 遊戲座標（約） | 面向 | 看到什麼 |
| --- | --- | --- | --- |
| 9034、9035 | (-11.5, -14) | 北北東 | 斜坡東側有一座**直的磚砌樓梯**往北北東爬，樓梯口立「往自強九・十舍」藍色指標；柏油路在樓梯左手邊往北上坡 |
| 9033 | 轉角 (-12, -20.3) | 東北 | 柏油路過轉角後**繼續上坡**；右側是磚面人行道加不鏽鋼欄杆，後面是長草的土坡，坡頂是樓梯的磁磚側牆 |
| 9031、9032 | 轉角西側 | 東南 | 九舍 ABC 西翼坐在**草坡**上，比路面高；坡頂有圍籬；路邊有紅色禁停線 |
| 9030 | (-14, -22.5) | 北北西 | 轉角西側有混凝土矮牆夾著的樓梯往下（好漢坡東支線上端），路緣有紐澤西護欄 |
| 9027、9028、9029 | (-4.9, -35) | 東北／西南 | 往回看，路從這裡一路下坡到轉角，**坡頂大約在 (-1, -34)**；再往東北是平路，西側整排紐澤西護欄與排水溝，東側草地後是九舍 D 區西端的圓弧樓梯間 |
| 9025、9026 | (8, -31.7) | 西南西／西北 | 九舍北側廣場鋪紅磚；往西南西的磚道盡頭有兩個磁磚花台夾住入口、擺三角錐，就是樓梯頂；西北邊隔草地是柏油路與機車架 |
| 9024 | (7, -32) | 南南西 | ABC 西翼北面，從廣場看是 4 層樓 |
| 9019、9021、9023 | 中庭 (11, -28) | 東 | ABC 與 D 區之間的中庭：中間紅磚車道，兩側草地、樹與路燈；盡頭是**一層樓的大廳**，屋頂有鏤空欄杆，玻璃門上掛「政大學生宿舍歡迎您」，門邊直式牌「自強第九宿舍」；兩側宿舍各 4 層 |

### 大廳室內（IMG_9009～9018，GPS 落在 x 31～38、z -24～-35，即建物 510739855 北段）

| 照片 | 看到什麼 |
| --- | --- |
| 9009、9011、9012、9013 | 一層樓大廳：淡薄荷綠牆面與天花板、外露橫樑、一圈圓柱；米白方磚地板，邊緣有灰色格紋帶。正中央是一個 S 形（兩個圓弧相接）的開口，四周白色矮牆加木頭扶手 |
| 9010、9016、9017 | 開口裡是**往下一層的旋轉樓梯**：兩段弧形樓梯沿 S 形往下，踏階有黃色止滑條；樓下是方磚地、木雕擺飾、藍色椅子 |
| 9018 | 開口正上方是玻璃格子天窗 |
| 9014 | 角落有「服務台 WELCOME to FRONT DESK」窗口、紅色圓形沙發、白色矮櫃、木長凳、木邊桌；窗外看得到中庭草地 |
| 9015 | 販賣區：紅色飲料機、黑色咖啡機、粉紅色販賣機、一張桌子四張椅子 |
| 9009、9012 | 四周有玻璃隔間：公佈欄、「DORM 9」門牌、擺沙發的交誼空間；玻璃門通到中庭 |

照片拍到路人，不進版控。遊戲裡的販賣機不放真實品牌標誌，用「飲料」「咖啡」等通用字樣。

## 和現在遊戲的差異

1. **坡道頂太早結束**：現在坡道在 (-7, -26.7) 就升到 15 公尺；照片顯示一路爬到 (-0.6, -34.9) 附近。
2. **少一座樓梯**：斜坡東側通往九舍廣場的步行樓梯不存在。
3. **坡道顏色與兩側**：現在是沙色路面加兩側直立高牆；實際是柏油路，東側是人行道、欄杆加草坡，西側是紐澤西護欄。
4. **指路牌位置**：「自強九舍・十舍」指標在 T 字路口；實際在樓梯口，箭頭指樓梯。
5. **九舍高度**：九舍目前一律 6 層（14.4 公尺）；照片從中庭看是 4 層。
6. **中間的一層樓大廳**：OSM 建物 510739855（ABC 與 D 區之間）現在是 2 層高、地面取 12 公尺的灰盒；實際是一層樓大廳，坐在中庭高度（15 公尺），有屋頂欄杆與玻璃入口。
7. **中庭與廣場鋪面**：現在是一片草地；實際有紅磚車道、紅磚廣場、草地。

## 需要使用者確認（未確認前依「預設」施工）

| 編號 | 問題 | 預設 |
| --- | --- | --- |
| Q1 | 建物 510739855 從 ABC 凹口（z -10）一路接到 D 區（z -35.6），照片只拍到中庭那一面。整棟都是一層樓嗎？ | **由室內照片推定：** 北段（z -23.7 到 -35.6）是大廳，一層、地面 15 公尺；南段（z -10 到 -23.7，三面被 ABC 包住）是旋轉樓梯通往的下層，一層、地面 12 公尺，屋頂與大廳地面齊平 |
| Q5 | 旋轉樓梯往下通到的那層，是安九那層（和安九正門同一層）嗎？ | **已答（2026-10-21）：是。** 和旋轉樓梯互動才轉場到安九 |
| Q6 | 大廳室內要用哪種做法？（見 階段 8c） | **已答（2026-10-21）：直接走進去。** 大廳要能穿過、繼續往十舍走；天花板高度與鏡頭處理由 Claude 決定；只有旋轉樓梯用轉場 |
| Q2 | 旋轉樓梯在這棟裡面。它是從大廳屋頂露出來，還是藏在室內？ | **已答（2026-10-21）：藏在室內。** 屋頂不露出圓筒，屋外看不到旋轉樓梯；現有藍色屋頂帶與旋轉樓梯外觀留到室內階段再處理 |
| Q3 | 樓層數：D 區 4 層、ABC 含山居學習中心共 5 層，對嗎？ | **已答：對** |
| Q4 | 坡道延長後，好漢坡東支線接坡道的高度會從 13.8 降到約 13.2，階數 25 變 23。可以接受嗎？ | **已答：可以**（改測試的既定數值，屬使用者核可的契約變更） |

## Review Focus

1. 新樓梯和坡道、ABC 輪廓重疊時，`heightAt` 取錯高度，玩家在樓梯口掉一階：階段 8a 測樓梯兩端外延半公尺的高度連續。
2. 坡道延長後，東支線上端與坡道高差超過一階，玩家卡住：階段 8a 沿東支線末端每 10 公分量高度差。
3. 欄杆碰撞擋住樓梯口或人行道，走不上樓梯：階段 8a 用 `resolve` 走一趟樓梯中線不被推開。
4. 大廳地面改 15 公尺後，ABC 凹口南段（z -10 到 -13.6）原本在 12 公尺的地面，牆底浮空：階段 8b 斷言大廳底部每個頂點的地面高度不高於 base。
5. 手機效能：新增的欄杆、護欄、花台都要合併網格或用 `asPrefab()`，各階段截圖時記錄 draw calls 不比改動前多 20 以上。

---

## Task 8 總覽（2026-10-21 使用者決定三項合成一個 Task）

- **負責人：** Codex（半自動協作），Claude 審查；共用檔 `src/core/gameplay.js` 只有在 Issue 同意後才列入範圍。
- **分支：** 從最新 main 開 `task-8-jiu-lobby`，三個階段都在同一分支依序施工：8a → 8b → 8c。每階段審查通過後由 Claude 提交一次，最後整個 Task 開一個 PR 到 main。
- **檔案範圍：** `src/world/buildings/uphill-campus/` 全部（含 `tests/`）、版本號三個檔案；`src/core/gameplay.js` 待 Issue。
- **版本號：** main 目前 v1.52，本 Task 合併時改 v1.53。
- **8c 的轉場部分：** Issue 沒同意前，旋轉樓梯先顯示「安九整修中」，其餘照做；同意後再補轉場，不另開 Task。

### 階段 8a：外部斜坡與九舍步行樓梯

**Files:**
- Modify: `src/world/buildings/uphill-campus/layout.js`（`RAMPS`、`STAIRS`、`ANCHORS['外部斜坡上']`，刪除 `rampRun`、`rampExtension`、`rampEnd`）
- Modify: `src/world/buildings/uphill-campus/greybox.js`（坡道材質、東側人行道與欄杆、草坡、西側紐澤西護欄）
- Modify: `src/world/buildings/uphill-campus/landmarks.js`（指路牌）
- Test: `tests/ramp.test.mjs`、`tests/stairs.test.mjs`、`tests/landmarks.test.mjs`、`tests/greybox.test.mjs`、`tests/walls.test.mjs`、`tests/zones.test.mjs`（整個 `tests/` 都在範圍內）

**Interfaces:**
- Produces：`RAMPS[0].path = [[-11.8,-8.1],[-12,-20.3],[-0.6,-34.9]]`，`width: 6`，`from: 12`，`to: 15`。
- Produces：`STAIRS` 新增 `{ id: 'jiu-plaza', width: 2.4, from: 12, to: 15, path: [[-7.6,-14],[-2.6,-22]] }`（10 階、無休息平台；位置依 GPS 推估後退讓開坡道）。
- Produces：`ANCHORS['外部斜坡上'] = { x: -0.6, z: -34.9, level: 'L3' }`；新增 `ANCHORS['九舍樓梯下'] = { x: -7.6, z: -14, level: 'L2' }`。

- [ ] **Step 1：寫失敗測試**
  - `ramp.test`：「坡道沿三點折線升到十五公尺，終點在 (-0.6,-34.9)」：`heightAt(-0.6,-34.9) === 15`；`heightAt(-12,-20.3)` 約等於 `12 + 3 * 12.2 / L`（L 為折線總長，約 30.72），誤差 0.01。
  - `ramp.test`：把「東支線終點高度 13.8」改成「東支線終點與坡道高差最多 0.15」，沿末端外延四公尺每 10 公分高度差仍最多一階。
  - `stairs.test`：「九舍樓梯十階接上廣場」：`stairHeight(jiu, 0) === 12`、`stairHeight(jiu, length) === 15`；兩端外延半公尺 `heightAt` 跳動不超過 0.3；樓梯中線每點離坡道中線大於 `3 + 1.2`，且不在任何建物輪廓內。
  - `stairs.test`：東支線階數改為 `Math.round((坡道接點高 - 主線接點高) / 0.3)`，不寫死 25。
  - `landmarks.test`：「九舍指標立在樓梯口西側、箭頭指向樓梯頂」：指標離 `ANCHORS['九舍樓梯下']` 2.5 公尺內，`toward` 等於樓梯 `path.at(-1)`。
  - `greybox.test`：坡道網格材質顏色等於一般柏油路；東側欄杆碰撞存在；沿樓梯中線用 `resolve` 走一趟，位移小於 1e-6。
- [ ] **Step 2：跑 `node --test tests/ramp.test.mjs tests/stairs.test.mjs tests/landmarks.test.mjs tests/greybox.test.mjs`，確認新測試失敗。**
- [ ] **Step 3：改 `layout.js`**：照 Interfaces 設定 `RAMPS`、`STAIRS`、`ANCHORS`；註解寫明依 2026-10-20 照片修正。
- [ ] **Step 4：改 `greybox.js`**：
  - 坡道斜面改用道路的柏油色。
  - 東側（第二段靠 ABC 那側、第一段靠樓梯那側）：寬 1.2 公尺紅磚人行道，外緣不鏽鋼欄杆（高 1.0，`obbC` 碰撞），欄杆在樓梯口留缺口；欄杆外到第三層地面改成綠色斜面草坡，取代原本直立擋土牆。
  - 西側：每 2 公尺一塊紐澤西護欄（0.6×0.8×1.2），外側保留原擋土牆但改成混凝土色。
  - 樓梯兩側磁磚矮牆，頂端兩個磁磚花台（1.2×0.6×2.0）夾住入口，放兩個三角錐。
  - 東支線上端兩側混凝土矮牆。
- [ ] **Step 5：改 `landmarks.js`**：`外部斜坡下` 指標改成 `九舍樓梯下`，立在樓梯口西側，文字「自強九舍・十舍」，`toward` 為樓梯頂；藍底白字（照片上是藍色牌）。
- [ ] **Step 6：跑 Step 2 的測試，全部通過。**
- [ ] **Step 7：截圖自檢**：桌機 1280×800 與手機 375×812 各兩輪，機位取照片 9033、9034、9028 的座標與方向，和照片並排比對。
- [ ] **Step 8：`npm test`、`npm run check`、`npm run build` 全過後由 Claude 提交。**

### 階段 8b：九舍中庭與一層樓大廳外觀

**Files:**
- Modify: `src/world/buildings/uphill-campus/layout.js`（新增 `BUILDING_FLOORS`、`LOBBY`）
- Modify: `src/world/buildings/uphill-campus/greybox.js`（`buildings()` 讀樓層表、大廳外觀、中庭鋪面）
- Modify: `src/world/buildings/uphill-campus/zone-names.js`（中庭區名）
- Modify: `src/world/buildings/uphill-campus/README.md`（進度紀錄）
- Test: `tests/greybox.test.mjs`、`tests/zones.test.mjs`

**Interfaces:**
- Consumes：階段 8a 的 `ANCHORS`（不改）。
- Produces：`BUILDING_FLOORS = { 510739853: 5, 510739854: 4, 510739855: 1 }`；不在表內的建物沿用現行依名稱判斷。
- Produces：`LOBBY = { osm: 510739855, name: '自強九舍大廳', base: 15, door: { x: 25.2, z: -27.8, face: 'west' }, parapet: 0.9 }`。
- Produces：`zoneName({ x: 20, z: -27.8 }) === '自強九舍中庭'`。

- [ ] **Step 1：寫失敗測試**
  - `greybox.test`：「九舍樓層依照片」：ABC 高 `5 * FLOOR_H`，D 區高 `4 * FLOOR_H`，大廳高 `1 * FLOOR_H`、base 15。
  - `greybox.test`：「大廳屋頂有欄杆、西面有入口」：場景有名為 `九舍大廳欄杆` 與 `九舍大廳入口` 的物件；入口中心離 `LOBBY.door` 0.5 公尺內。
  - `greybox.test`：大廳輪廓每個頂點的 `heightAt` 不高於 15，且牆底下方用填充塊補到地面，不浮空。
  - `greybox.test`：中庭紅磚車道 `九舍中庭車道` 從大廳入口往西延伸到 x = 8，寬 3.6。
  - `zones.test`：中庭點回傳「自強九舍中庭」，廣場點 (8,-31.7) 仍回傳原本名稱。
- [ ] **Step 2：跑 `node --test tests/greybox.test.mjs tests/zones.test.mjs`，確認失敗。**
- [ ] **Step 3：`layout.js` 加 `BUILDING_FLOORS`、`LOBBY`；`greybox.js` 的 `buildings()` 先查表、`LOBBY.base` 覆寫 base。**
- [ ] **Step 4：`greybox.js` 畫大廳**：屋頂四周 0.9 公尺鏤空欄杆（用 `asPrefab()` 或合併網格）；西面玻璃門（淺綠玻璃色）、門楣橫幅、門邊直式牌「自強第九宿舍」；北段 z -10 到 -13.6 的地面在 12 公尺，牆底往下補。旋轉樓梯藏在室內（Q2），`landmarks.js` 的旋轉樓梯藍色屋頂帶移除，`landmarks.test.mjs` 相關斷言一併改成「場景沒有旋轉樓梯屋頂帶」。
- [ ] **Step 5：中庭鋪面**：紅磚車道（中庭中央）、北側廣場紅磚（x 0 到 15、z -24 到 -35）、其餘草地；兩側各放 3 棵樹與 3 盞路燈（沿用現有 prefab）；廣場西北緣沿柏油路放機車架與紐澤西護欄。
- [ ] **Step 6：`zone-names.js` 加中庭範圍；README 進度紀錄補一行。**
- [ ] **Step 7：跑 Step 2 的測試，全部通過。**
- [ ] **Step 8：截圖自檢**：桌機與手機各兩輪，機位取照片 9019、9022、9024、9026，和照片並排比對。
- [ ] **Step 9：`npm test`、`npm run check`、`npm run build` 全過後由 Claude 提交。**

### 階段 8c：九舍大廳直接走進去，旋轉樓梯轉場到安九

**使用者決定（Q6）：** 大廳在山上地圖裡直接走進去，從西側玻璃門（中庭）進、東側門出，繼續往十舍走，不換場景。只有走到旋轉樓梯按「走下旋轉樓梯」才轉場到安九。

**技術做法與理由：**
- **天花板拉高到 5.5 公尺**（外觀仍是一層樓加屋頂欄杆，卡通比例可接受）。鏡頭在戶外約離地 3 到 4 公尺，5.5 公尺內不會頂到天花板。
- **鏡頭進到大廳上方時隱藏屋頂**：用山上場景自己的 `scene.onBeforeRender`，每次畫面繪製前檢查鏡頭水平位置是否在大廳輪廓內，是的話把屋頂、屋頂欄杆設成不顯示，出來再顯示。只改 uphill-campus 資料夾，不動共用的鏡頭程式。
- **地面高度不用改**：大廳範圍與往東到十舍的路線（實測 (31,-30)、(42,-28)、(50,-28)、(56,-30)）都已是 15 公尺。旋轉樓梯的開口只是畫面，四周矮牆擋住，玩家不會掉下去。
- **轉場到安九要改共用檔**：現在「進門換場景」的入口只能放在山下校園，出來也只能回山下（`src/core/gameplay.js`）。要讓入口設在山上地圖、出來回到山上，必須改這個共用檔，依規定**先開 Issue** 取得同意。備援：Issue 沒過之前，旋轉樓梯先顯示「安九整修中」提示，不轉場。

**Files:**
- Modify: `src/world/buildings/uphill-campus/layout.js`（`LOBBY` 加 `doors`、`ceiling`、`well`、`stairTop`）
- Create: `src/world/buildings/uphill-campus/lobby.js`（大廳外殼、室內陳設、碰撞、屋頂隱藏）
- Modify: `src/world/buildings/uphill-campus/greybox.js`（510739855 北段改由 `lobby.js` 畫，不再畫實心方塊）
- Create: `src/world/buildings/uphill-campus/anjiu-interior.js`（安九房間：旋轉樓梯下端、木雕、藍椅；安九其他內容留下一階段）
- Modify: `src/world/buildings/uphill-campus/index.js`（登記安九房間）
- Modify（共用，Issue 同意後）：`src/core/gameplay.js`（入口與返回點可指定所在房間）
- Test: `tests/lobby.test.mjs`、`tests/anjiu-interior.test.mjs`（新增並登記到 `tests/index.mjs`）

**Interfaces:**
- Consumes：階段 8b 的 `LOBBY`。
- Produces：`LOBBY.doors = [{ x: 25.2, z: -27.8, width: 3 }, { x: 37.1, z: -27.8, width: 3 }]`，`LOBBY.ceiling = 5.5`，`LOBBY.well = { cx: 31.2, cz: -28.6, rx: 3.2, rz: 2.2 }`（S 形以兩個相接的橢圓近似），`LOBBY.stairTop = { x: 34.6, z: -28.6 }`（開口東端，矮牆在這裡留 1.2 公尺缺口給樓梯口）。
- Produces：`lobbyColliders()` 回傳牆（兩個門洞）、柱子、開口矮牆、家具的碰撞；`isInsideLobby(x, z)`。
- Produces：安九房間 `{ id: 'anjiu', name: '安九', entrance: { x: 34.6, z: -28.6, r: 1.6, room: 'uphill-campus', label: '走下旋轉樓梯' }, returnTo: { x: 35.6, z: -28.6, face: -Math.PI / 2, room: 'uphill-campus' } }`。

- [ ] **Step 1：開 Issue**：說明 `gameplay.js` 的入口只支援戶外，提議 `entrance.room` 與 `returnTo.room`；不填時行為完全不變。同意後才做 Step 6。
- [ ] **Step 2：寫失敗測試**（`lobby.test.mjs`）
  - 「從中庭穿過大廳走到十舍不被擋」：用 `resolve` 沿 (20,-27.8) → (26.5,-27.8) → (26.5,-33.8) → (35.8,-33.8) → (35.8,-27.8) → (56,-30) 每 0.2 公尺走一步（繞過開口北側），累計被推開的距離小於 0.5。
  - 「旋轉樓梯開口四周擋住」：從開口外 2 公尺朝開口中心走，除了東端樓梯口以外的 7 個方向都停在矮牆外；樓梯口方向走到 `stairTop` 後也不會掉進開口（樓梯口內側另有矮牆）。
  - 「天花板 5.5 公尺，屋頂只在鏡頭不在大廳上方時顯示」：呼叫場景的 `onBeforeRender`，鏡頭在 (31,20,-30) 時屋頂 `visible === false`，在 (10,20,-28) 時 `visible === true`。
  - 「室內陳設齊全」：依名稱找得到服務台、紅色圓沙發、飲料機、咖啡機、販賣機、桌椅、天窗、旋轉樓梯。
  - 「招牌文字不含真實品牌」：所有招牌文字不含照片上出現的品牌名稱。
- [ ] **Step 3：寫失敗測試**（`anjiu-interior.test.mjs`）：旋轉樓梯入口在山上地圖、標籤「走下旋轉樓梯」；返回點在大廳內、不在碰撞裡；`gameplay` 不填 `room` 的入口仍只在山下出現。
- [ ] **Step 4：跑 `node --test tests/lobby.test.mjs tests/anjiu-interior.test.mjs`，確認失敗。**
- [ ] **Step 5：建模 `lobby.js`**：外殼牆厚 0.3、西東兩個門洞與玻璃門框；淡薄荷綠牆面與天花板、外露橫樑；米白方磚地板加灰色格紋邊帶；8 根圓柱圍住開口；開口白色矮牆（高 1.0）加木扶手；天窗；旋轉樓梯畫兩段弧形踏階往下延伸到開口下方 3 公尺（黃色止滑條），樓梯口立一個小牌「往安九」。服務台、沙發、販賣區、玻璃隔間依「大廳室內」表配置；家具碰撞不擋住東西門之間的通道。
- [ ] **Step 6：`gameplay.js`（Issue 同意後）與 `index.js`、`anjiu-interior.js`**：安九房間先做樓梯下端與一小段走廊；出口是「走上旋轉樓梯」，回到大廳樓梯口。
- [ ] **Step 7：跑 Step 4 的測試，全部通過。**
- [ ] **Step 8：截圖自檢**：桌機與手機各兩輪，機位對照照片 9009、9010、9014、9015、9018，加一張從東門往十舍看的截圖；檢查鏡頭在室內不穿出屋頂。
- [ ] **Step 9：`npm test`、`npm run check`、`npm run build` 全過後由 Claude 提交。**

安九的完整室內（往安九正門的通道、安九食堂）不在本計畫，留到下一階段。

## 開工前提

- PR #59、#60 已於 2026-10-19 合併到 main（已確認）；從最新 main 開 Task 8 分支。
- Q1～Q6 有答案或使用者同意用預設。
- 階段 8c 的旋轉樓梯轉場要先開 Issue，取得共用檔 `gameplay.js` 的修改同意。
