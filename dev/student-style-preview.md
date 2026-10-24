# 普通學生造型對照

## 啟動

在此分支執行 `npm run dev`，開啟 `/dev/student-style-preview.html`。
此頁只在開發伺服器提供，不加入正式遊戲或既有工作台的發布入口。

固定以 `STUDENTS.colors[0]` 與第一位路人學生的側分髮、背包、1.1 倍比例建立左右兩版。正式學生、版本號、角色清冊、儲存格式均不變。左側是原版，右側透過明確的建構選項 `studentStyleTrial: 'soft-v1'` 選用候選。沒有網址參數自動改變正式遊戲。

## 候選範圍

- 保留頭骨、臉片曲率、軀幹、四肢與所有掛點的局部變換。
- 既有 256×256 臉部畫布的三個表情調整眼距、眉弧、嘴寬，沒有增加每角貼圖數。
- 手與側分髮束用 12×8 球，鞋楦用同分段球壓平下緣並降低鞋尖。鞋底與描邊最低界不變。
- 頂髮與後髮採不超過 16×12 的球面片；頂髮做微量側分不對稱。背包以相同尺寸的球面取代方盒，保留既有描邊。
- 不新增來源節點，不改全域 BOX/SPH、材質、shader、physics 或動畫。
- 幾何於試點首次建構時共用配置，在來源登記及 native clone 之前套用；不得把建構函式當成已完成角色的熱更新 API。

## 重現比較

前、側、背與遊玩距離切換共用同一部相機，左右各自渲染同樣的光源。動作選擇 idle、walk、wave；表情選擇 open、closed、panic。裝配可切 default/native，reset 還原原件、姿勢及鏡位。不讀寫 localStorage。

自動驗收可等待 `document.documentElement.dataset.studentStyleReady === 'true'`，使用 `window.__studentStyleTrial.freeze(0.75)` 固定時間。透過頁面選單設定姿勢、表情與裝配，透過 `setCamera('front')`、`'side'`、`'back'`、`'game'` 設鏡位；每次至少等一個渲染幀再擷取。`snapshot()` 回傳鏡位、動作、表情、裝配及時間，`metrics()` 回傳兩版模型計數。不要以產生式圖片代替遊戲截圖。

動作展示沿用既有肩髖擺動公式，但不執行正式 NPC 尋路、碰撞與遊戲循環。遊玩距離只是工作台遠鏡位，並非校園實景或正式遊戲相機。此頁無後製，最終色調及場景一致性須在正式遊戲環境另外驗收。

## 模型資源數據

初始 default：兩版皆 39 Object3D、31 mesh、8 種 mesh 材質。含描邊三角形從 12,108 到 12,016；獨立 mesh geometry 從 11 到 13；幾何 typed-array 總容量從 152,040 到 143,552 bytes。計數不含隱藏對話 Sprite 的材質，不代表 GPU 記憶體、完整 renderer calls 或 FPS。native 模式保留隱藏原件並建立 clone，因此 resident objects/triangles 會增加，不能當作畫面實際繪製量。

## 尚需視覺驗收

需真實瀏覽器截圖確認髮型輪廓、側臉貼合、衣物接縫、背包形狀、動作遮擋與校園同框。Node 幾何與姿勢驗證、打包成功不能代替以上驗收；沒有宣稱手機 FPS、載入後操作或截圖已通過。此候選不是完成的全角色美術升級。

## 隔離截圖 CI

專用 `student-style-preview.yml` 只對本試驗分支的 PR 執行，讀取權限不含部署。透過 Vite 開發伺服器載入上方入口，不改既有 build、smoke 或全角色驗收。`scripts/student-style-preview.mjs` 在 Chromium 真實 WebGL 產生 1280 與 390 CSS px 兩組 PNG，固定時間 0.75 秒，涵蓋前、右、背、左及遊玩距離的三動作、閉眼／驚慌、native 與 reset。

`results.json` 記錄實際 checkout SHA、tree、事件 SHA、各 PNG 的 SHA256、模型數據及左右視窗非背景畫素數，並驗證 WebGL 未遺失、資源及執行錯誤、native/reset 與重整。artifact 是實際軟體 WebGL 截圖，不是生成式圖片、實機效能量測或正式校園截圖。CI 成功只表示截圖及功能驗證完成，仍須人工審查造型。
