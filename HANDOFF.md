# 本輪狀態：達賢2F最終驗收與發布準備

- 使用者已選2F並核可「照此建置」：docs/superpowers/specs/2026-10-21-dah-hsian-2f-design.md；計畫docs/superpowers/plans/2026-10-21-dah-hsian-2f.md。只公開空間，無其他樓層／小屋內部／NPC／任務／真刷證借書。
- 來源main82f2f36，工作區 `/Users/cengweiting/Developer/創業計畫/NCCU100`，building/dah-hsian-2f；所有未提交均本輪，未覆寫他人修改。
- 完成大廳感恩牆、弧形櫃台、閘門、設備、玻璃預約區、挑空藍毯與可見上層迴廊、公開閱覽；未開樓梯用可見欄門阻擋。
- core/gameplay最小加entrance.room／returnRoom、明確spawn.y、正確onExit/onEnter；其他建築預設null維持。相機collector抽純Three模組，2F天花／細柱opt-in，舊規則經原審查者案例比較一致。
- 官方平面＋6站24方向環景實際看圖，2020-02©NinaKu，索引docs/reference/dah-hsian/interior-stations.json。官方近照與研究原圖僅ignored本機.references/dah-hsian/interior，不發布照片素材。
- navigation2／interior8針對測試與全套129/129通過，/tmp/nccu100-2f-tests.log；check/build通過，最終產物index-C2_IDBXU.js。Node24.15／Three0.149／無新增相依。其後只更新文件、CI新瀏覽器步驟與測試mobile console監聽，不改產品程式。
- 真E往返已通過，後續完整鍵盤入口→大廳→閘門→挑空→窗邊閱覽、鏡頭／重入／舊房間檢查已走通。完整手機搖桿回出口已通過（exec70561 exit 0），/tmp/nccu100-2f-full-flow.log。第一版手機測試傳送受殘餘慣性滑出提示，改實際搖桿走回出口，不改遊戲手感掩蓋。
- 兩輪CLI 1280x800／375x812及3站照片對照完成。獨立視覺fix兩項（透明殼遮住玻璃、共面地毯條紋）各先紅後綠，覆寫同r2／photo檔再複核，兩項resolved、限清單ship。原程式鏡頭P2也複核通過。
- 最終圖 `.screenshots/dah-2f-r2-desktop.png`／`dah-2f-r2-mobile.png`；照片比較 `dah-2f-photo-lobby.png`／counter／atrium。最後CLI已關。preview5187 exec33195仍供固定dist流程。
- Impeccable documenter確認普通延伸保留DESIGN；既有缺design.json不擅補。detect僅一次，暖白世界招牌#eee9df單檔單值例外，舊例外不動。詳QA docs/reference/dah-hsian/interior-qa.md（含兩輪八項與九項理解檢查點、美術十項）。
- .github/workflows/ci.yml在既有全場smoke後新增本館真瀏覽器鍵盤／手機往返，preview程序有trap收尾。全場smoke將由本分支CI與main CI執行，不把Node測試當全場瀏覽器通過。

- 分支CI 39603305028全場smoke失敗於舊「所有房間離開皆null」假設；2F應回dah-hsian，本機完整流程已證實。現將smoke明確列2F返回dah-hsian，其餘仍null，保留逾時斷言並加安全診斷；重跑CI後才合併。

## 下一步

本機完整鍵盤／手機流程已通過。[PR #64](https://github.com/wenzhotw/nccu100/pull/64) 已建立並附本聊天；發布結果在PR驗證欄追蹤。確認分支完整CI（含全場smoke與新2F步驟）成功，再依既有授權合併main、main重跑全測/check/build、push沿Pages原網址、驗收正式SHA/v1.54／真進出。若失敗修復，不帶失敗發布。發布結果以PR驗證欄追蹤，這裡保留提交前快照。

## 前輪發布與驗收快照

# 本輪狀態：達賢 v1.53 本機驗收完成，發布追蹤 PR #63

- 使用者核可依角色站位照片重建戶外並要求繼續；工作區 `/Users/cengweiting/Developer/創業計畫/NCCU100`，分支 `fix/dah-hsian-detail-and-collision`，來源51a8cb18；沒有他人未提交修改。
- 已重建各側立面、深門廊、二樓露台、館名牆、小屋不對稱入口、空橋／外梯、半圓老樹廣場、坡面石板。戶外外梯／空橋可走，室內與交通不變。
- 本區layout共用高度／接點／階梯／欄杆，模型與碰撞同步；walkHeight依目前腳高分層，小屋低層腳底.4與可見地板一致。未改全遊戲core／render或存檔。
- 原研究14站56方向＋25張地面照片保留，來源與限制見 `docs/reference/dah-hsian/ground-view-reconstruction.md`；沒有發布第三方照片。近地面遊戲對照完成門廊／橋端／池對岸估算構圖，不冒稱14站精確配準或2026完整現況。
- 修復各項重現穿模；21項新針對測試逐行為紅綠通過，原6項按實景位置／新行走範圍校正。最新 `npm test` 119/119，`/tmp/nccu100-dah-rebuild-tests.log`；Node24.15.0／Three0.149／無新增相依。
- 最新check/build通過，打包最終hash見build日誌，build記錄 `/tmp/nccu100-dah-rebuild-build.log`。既有gameplay混合匯入提示保留。
- 獨立程式審查連續875次更新完成一樓→外梯→二樓→橋→小屋，腳底與樓板射線吻合、橋底鏡頭射線通過；`.references/dah-hsian/round2/review-route.mjs`及log。
- 最終程式審查補出擋土牆／小屋端框柱缺碰撞，已按實體尺寸修正並留通路；窄縫殘留重疊改選所有碰撞物件都安全的最近候選，兩行為各先紅後綠，原審查者複核27/27通過。
- 兩輪桌機1280×800／手機375×812自評已做，依審查清單修低欄杆碰撞／補池對岸圖，原審查者兩項resolved、清單範圍ship。文件交接確認沿用既有系統，DESIGN.md不改，既有缺少design.json揭露不擅補。
- 最終`index-D2S8Arep.js`達賢瀏覽器專項通過，`/tmp/nccu100-dah-rebuild-flow.log`。原全場smoke曾在尚未建立達賢前地圖關閉逾時，原因未確認；保留原失敗log，僅加診斷的同斷言完整重跑通過，`/tmp/nccu100-dah-rebuild-smoke-diagnostic.log`。同版原腳本GitHub CI 39582493824成功，未改共用地圖或放寬測試。
- 程式審查及視覺清單均已複核；來源提交0f2004b，草稿 [PR #63](https://github.com/wenzhotw/nccu100/pull/63) 已附本聊天。發布階段以PR驗證欄／main Actions結果追蹤，這裡保留合併前快照。
- 固定preview5187供本機驗收，無新常駐服務；研究圖／截圖／診斷腳本留ignored本機目錄，原始研究來源不清理。
- QA、兩輪八項自評、照片對照／效能量測限制及九項產品理解檢查點依據：`docs/reference/dah-hsian/rebuild-qa.md`。僅一般地圖改動，局部QA，未對第三方做資安模擬。

## 下一步

按既有授權整合main、重跑全套／check／build，原全場smoke已由同版CI與本機完整診斷重跑覆蓋；push後追蹤main CI及Pages，驗收原 `https://wenzhotw.github.io/nccu100/?area=dah-hsian`。若測試或權限失敗保留工作回報證據，不硬推。

## 前階段紀錄

# 本輪狀態：達賢全方向照片查核與穿模追查（進行中）

## 使用者本輪修正

- 使用者明確指出：整體四面八方的細節都不夠像，且有穿模，不是只修單一入口或正面。
- 要從「角色能站的位置」找近站立高度的實景，記錄站位、方向及視野，以相同位置的遊戲畫面反推重建；不能以增加空拍、遠景數量代替。
- 獨立戶外區域、先不接交通、沿用既有美術方向。尚未新增室內、任務、NPC 或改動共用引擎。

## 工作區與已上線版本

- /Users/cengweiting/Developer/創業計畫/NCCU100；分支 fix/dah-hsian-detail-and-collision。
- 本輪來源／正式站仍為 51a8cb18e2641ac754cc68c2bcb20ab9f1df4666，v1.52。PR #62 已由 wenzhotw 合併，既有 GitHub Pages 已上線。
- 前一輪發布後驗收通過的是原有流程，不代表目前照片還原或穿模問題已解決。
- 本輪目前只有研究、唯讀審查和交接文件；沒有修改遊戲原始碼，沒有本輪新部署。

## 新研究與立即下一步

- 找到館方公開的 WalkInto／Google 360 環景，實際載入並沿戶外站點走訪；可從館名牆沿門廊、露台、背側走道走到空橋。
- 來源 https://www.lib.nccu.edu.tw/p/404-1000-567.php?Lang=zh-tw；環景 https://walkinto.in/tour/WktjYS6ipb-ketjKSTo6Z。
- 本機研究資料 .references/dah-hsian/round2/：capture-tour.py、vr-menu-public.json、各站 vr-<station>.json 與四方向截圖、contact sheets、vr-dates.json、vr-game-positions.json；不重新發布第三方照片、不作遊戲貼圖。
- 日期由公開 StreetViewService 的 imageDate 查得，不是猜測。已查點為 2020-08，© Nina Ku；永久建築可核對，現況植栽／設施須再與較新發布的實拍交叉確認。
- 同時補找潤泰工程、Commons 原始攝影、AJ、萍子與大海愛上藍天實拍。ground-downloads.json 共72筆成功下載，含室內、菜單、合成圖；不得把72稱為戶外有效照片數。contact sheets 已逐頁看過，詳細適用角度待存取景站位文件。
- 原 OSM→遊戲轉換用三個已配對角點重現，再以其餘角點校準；僅驗證轉換可重現，不代表公開環景 GPS 是現地測量。照片與遊戲精確對位仍未做，不能宣稱完成同視角還原。
- 優先用環景確認館名牆的真實退縮、連續開放門廊、南側露台與池側走道、空橋接點、小屋二樓端牆；再整理四向覆蓋與缺圖處。
- 新研究紀錄 docs/reference/dah-hsian/ground-view-reconstruction.md；ground-view-stations.json 記14個實際站位／每站四方向共56個檢視畫面（不是56個拍攝位置），已逐站看contact sheet。ground-photo-supplement.json 另選25張適用實拍來源，沒有把室內與菜單算入。
- JSON與本機PNG／SHA256對照已核對；遊戲相同站位比對目前0組，遊戲原始碼未變，不把研究校驗說成遊戲測試或修復。下一步從入口平台及深門廊開始做實景對位與逐行為紅綠。

## 已重現缺陷，尚未修復

獨立唯讀審查使用真實 createDahHsianModel／resolve，先以已知平面與盒內外點校準。原測試仍6/6，不能視為下列缺陷不存在。

1. 背面 edge 實例34–38柱體伸到 z=-28.85，碰撞後緣只有-28.4；(-1,-28.8)的角色中心仍在柱內。也需一起核對玻璃外凸範圍。
2. 入口樓板實例0頂4.19，但(0,28.2)腳底高度查詢為4，且合法可達，約19cm埋腳。
3. (26,12.7)腳高2.94483、身體尚低於玻璃底4.7，向前無可見實體卻被推到z12.9。根因是全場單一z斜坡、浮高玻璃、碰撞箱不同步；須按實景校正平台與退縮。
4. 從(14.3,4,28)一步到(14.59,4,27.71)，resolve後距主樓只有.367658，小於半徑.4；館名牆後處理把角色推回先前主樓箱。
5. (-21.2,0,-35)，yaw0/pitch1.15/dist6，相機射線碰橋板距離3.1662；鏡頭遮擋清單排除 InstancedMesh 且要求厚度>.25，橋板.22漏掉。不能用落地整箱封掉橋下解法。
6. 空橋到小屋露台水平缺口約1.56123公尺；高度近似但平面接點錯開。後續共用接點資料生成外觀與行走面。
7. 較低優先：坡面石板高出地面約10cm、座椅／燈柱可穿過。

- 未重現普通跳躍撞橋底，不能把假說寫成缺陷。
- 前輪空橋／外梯僅外觀。使用者要求角色站位照片不自動等於授權新增所有可登階區；先查明照片位置與本輪必要可走範圍，再記錄產品取捨。
- 後續每個修復先補一個可重現失敗測試，再最小實作／重測；要查resolve後不重疊任何實體，不能只查有被推動。照片還原另外以實際同站位／同方向／接近同視野比較，不以程式測試代替。

## 既有紀錄（前一輪封存）

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
