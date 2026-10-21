# 本輪狀態：達賢戶外

## 目標與已確認範圍

使用者負責 NCCU 100 達賢建置，確認獨立區域、先做戶外，暫不處理交通。要求圖片參考多、盡量還原。計畫見 docs/superpowers/plans/2026-10-21-dah-hsian-outdoors.md；產品與視覺沿用 PRODUCT.md、DESIGN.md、docs/art-style.md。

## 工作區與版本

- /Users/cengweiting/Developer/創業計畫/NCCU100，從既有遠端全新 clone，未覆寫其他工作；唯一 worktree。
- 分支 building/dah-hsian-outdoors，原始來源 482194eec5f02834d5da15132ac10bba26c4ccf1。
- 製作中遠端合併 PR #61，已快轉同步至 6f0dc8e81afbd7564543b6588afd61734b6688a4，保留夥伴新增美術規範與 Ubuntu 24.04 CI 修正。達賢版本 v1.52。
- 起始沒有 HANDOFF、STATUS、PRODUCT 或 DESIGN；新增必要產品、視覺與本輪紀錄，沒有另一套專案骨架。
- Node v24.15.0；npm ci 沿用 package-lock.json，沒有新相依。遠端 CI 使用 Node 22。

## 修改

- src/world/buildings/dah-hsian/：獨立場景、OSM 輪廓資料、連續地形、主樓／小屋外觀、池岸／草坡／步道／空橋、碰撞與預覽。
- 普通網址不建立達賢完整模型；area=dah-hsian 在按開始後進達賢。未加入校園交通入口或正式出口。
- 沿用既有角色、操作、rooms、存檔；未修改 core、render 或其他建築。入口文字與行動 HUD 調整限達賢作用域。
- 新增 Node 行為測試、達賢瀏覽器驗收、產品／設計／來源／QA 文件；版本、ignore 與檢查例外只含本輪必要差異。
- 36 個不同 SHA256 的研究影像索引見 docs/reference/dah-hsian/；本機研究原圖 .references/dah-hsian/，不作遊戲貼圖、不重新發布第三方原照片。來源與本輪截圖保留，不當垃圾刪除。

## 驗證證據

- 原基線：npm test 92 通過、check/build 通過。smoke 首次在最後手機 page.goto 30 秒逾時，關閉另一個 3D 頁面後原腳本重測通過；資源競爭是推論，沒有測量因果。
- 本輪：node --test scripts/dah-hsian.test.mjs 6 通過；逐項紅綠。
- npm test 98 通過，記錄 /tmp/nccu100-dah-full-test.log。
- npm run check、npm run build 通過；build 的 gameplay 混合匯入提示已記 QA，不是獨立 chunk。
- node scripts/dah-hsian-smoke.mjs 通過：預覽、延後建立、鍵盤、建築／池岸阻擋、重入不重建、故事與道具保留、正常網址、375×812 觸控、無溢出、樹冠淡出。後續版本已縮窄資源錯誤排除，只排除既有 favicon.ico。
- 既有全場 npm run smoke 通過，記錄 /tmp/nccu100-dah-full-smoke.log。
- 獨立代理唯讀審查，已修館名牆／露台／外梯碰撞、樹冠淡出與石碑描邊。檢查範圍、缺陷與修正、八項自評、動效審查見 docs/reference/dah-hsian/QA.md。
- 已做兩輪雙尺寸並修正，再依最新規範完成最終桌機1280×800與手機375×812：.screenshots/dah-final-desktop.png、.screenshots/dah-final-mobile.png。公開遊戲截圖與完整八項自評在 docs/reference/dah-hsian/，沒有發布原始研究照片。
- Impeccable 最新 detect 為 []。實際 computed style 已證實 ● 是紙色而非黑字。單檔單值誤判例外見 .impeccable/config.json；不關閉整條規則。

## 本輪局部決定、風險與限制

- 沿用既有 rooms 獨立場景，不新增引擎、服務、權限、付費或外部依賴。
- 環境以 OSM 輪廓與官方高度交叉核對，統一 0.8 倍。微地形、窗格、遮陽角度、園景與外梯細部為照片估計，非現場測繪。
- Reflector 試作已完整移除以符合新美術規範；卡通池面亮紋。樹使用現有 tree，晚建一般網格走原材質淡出。
- 不含室內、NPC、任務、交通或登橋入室；空橋與外梯僅外觀。
- 簡短玩家／領域 QA 已執行；未觸發完整資安模擬。沒有真人校方／專業認證，沒有真機 FPS 保證。

## 下一個具體動作

開發與本機驗收完成。按已授權流程完成 PR／main 整合、main 全測、遠端與既有 GitHub Pages 部署及正式流程驗收。發布結果以本輪 PR 與對應 merge commit 的 GitHub Actions 記錄為準；本交接在送審時封存，不預先宣稱上線。
