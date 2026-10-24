# 達賢效能修正驗證，2026-10-24

範圍：主線1099776的室內固定構件合批、相機來源保留、繪製負擔守門與後續開發規範。候選版本1.87；未把原工作區的未完成場景重建、鏡頭配置、家具或地形帶入。這是AI玩家／即時繪圖工程角度的檢查，不是建築還原、真人認證或手機60幀通過。

## 實作與負擔證據

主線乾淨副本先全測五組通過：`/tmp/dah-perf-main-baseline-tests.{log,exit}`。新真瀏覽器預警先失敗：`/tmp/dah-perf-complete-budget-red.log`，二樓1983calls超過900。移植已逐行為紅綠的普通固定合批後，六項單檔PASS `/tmp/dah-perf-main-static-focused.log`；相鄰材料／照明／導航／室內66PASS `/tmp/dah-perf-main-regression-focused.log`。完整幀預警在Metal三站PASS `/tmp/dah-perf-complete-budget-green.log`，SwiftShader三站PASS `/tmp/dah-perf-software-budget.log`，其實際renderer已讀回。軟體長幀仍存在，12樣本預警不是幀率測速。

同頁120幀前後比較：`/tmp/dah-perf-isolated-same-page-ab.log`及ignored `.references/perf-review/same-page-ab.json`。三站calls2266→614、1704→455、1688→464，所有前後均DPR.75、後製與Bloom開，實際站位一致。完整triangles稍增，不宣稱減面。詳細表與限制見本文件末節「原候選量測資料歸檔」。

獨立code/probe與final visual review位於ignored `.references/perf-review/{review.md,final-review.md,probe.mjs,probe-result.json}`，主代理已讀回原結果。逐材質280792triangles守恆、519相機來源與116發光構件世界矩陣不變。已知BoxGeometry840bytes校準後按ArrayBuffer身份去重，新增常駐幾何／實例buffer6462288bytes，約6.16MiB；不是整體RAM或GPU記憶體。

## 兩輪雙尺寸自檢

每輪桌機1280×800與真isMobile/hasTouch375×812各一張、DPR1的CSS尺寸截圖；是本機Chrome，不是iPhone。第一輪午後，第二輪夜晚；站位[-10,0,10]，使用既有角色鏡頭上拖，沒有除錯自由相機。原圖已按尺寸檢查並實讀。

- 第一輪 `.screenshots/dah-static-performance/round1-desktop.png`、`round1-mobile.png`。
- 第二輪 `.screenshots/dah-static-performance/round2-desktop.png`、`round2-mobile.png`。
- 已確認既有缺陷的限項診斷 `.screenshots/dah-static-performance/diagnostic-before-same-roof.png`：同頁恢復原具名來源繪製，關合批層，屋頂摩爾紋／陰影條紋仍在。不是合批新增，不擴作已暫停的場景修復；不能稱整館美感或還原合格。

| 八項 | 第一輪 | 第二輪 |
| --- | --- | --- |
| 層次 | 原世界畫面與HUD層次保留，區域標籤可讀 | 夜間標籤與進度仍清楚 |
| 留白 | HUD原間距、手機搖桿與跳躍鍵分開 | 無新壓疊或擋住標籤 |
| 字體 | 沿既有中文字型與粗細，無新截字 | 夜間同樣可讀，沒有新字型 |
| 配色 | 原卡通材質、玻璃與灰木色保留，未改配色 | 原藍暗部與金色燈帶保留，未新加自發光 |
| 對齊 | 左HUD與右進度對齊保留 | 夜間相同 |
| 響應式 | DOM實測scrollWidth375等於innerWidth375；1280亦無橫捲 | 第二輪兩尺寸實測相同；不是390寬13Pro實機 |
| 狀態 | 午後狀態正確，沒有新增互動狀態；鍵盤/手機流程另驗 | 夜晚狀態正確；focus/載入/重入由真流程測試，不從靜態圖推論 |
| 動效 | 本輪沒有新增動效，圖不能證明流暢；保留原拖曳與時段切換 | 沒有新動效需調整，日夜與真路線另驗；不從圖宣稱60幀 |

沒有發現合批新增的漏面、反面、實心玻璃或shader錯誤；只涵蓋這些視角。原屋頂紋路、原室內取景與還原問題仍有已知待修，不假報整體畫面完成。

單次最終detector：`/tmp/dah-perf-detector-final.log`，掃本輪三個runtime檔案，exit0且無輸出。工具help已核明exit0代表完成且無primary findings，雙輸出流均保存；非拿空文字猜測成功。沒有新增ignore。獨立review確認無新motion實作，因此本效能分支無新增動效的專項審查需求，原重建分支的動效驗證仍另列。

## 玩家／專業QA與安全範圍

玩家角度驗進出館、手機控制、相機避牆、現有上下樓路線與重入；繪圖工程角度驗表面材質、光照來源、透明排序與可裁切分區、額外buffer成本。普通全站與達賢2F／日夜／中庭真路線仍由本輪runner收尾，結果登記HANDOFF；未完項不得當PASS。

沒有新增登入、權限、付費、個資或外部輸入；未進行正式站攻擊測試或額外安全模擬。測試站位是固定內部資料，WebGL環境記錄只存在測試輸出，沒有新增遊戲遙測服務。

## 美術規範第十三節，依本次範圍

1. 材質已核：直接共用原材質與shader，check通過，沒有新寫實材質或圖片。
2. 顏色已核保留：沒有新增配色，不代表既有整館美感已合格。
3. 描邊已核保留：單例子構件與鏡射案例保護；逐材質表面守恆。
4. 造型已核保留：未改分段、桌島、屋頂或樓層幾何。
5. 貼圖／文字已核保留：同一材質與貼圖物件、UV不替換；沿既有canvas文字。
6. 燈光已核不新增：保留使用者先前授權的達賢日夜／陰影例外，未自行加燈或靠少畫陰影求快；不是重新認證既有光線品質。
7. 尺度已核不變：保留原world transforms，未重新量測建築尺度。
8. 效能部分已核：完整calls與額外buffer有校準資料；真機60幀與整體記憶體未核。
9. 截圖已核：此為獨立室內，採同室內前後對照與兩輪雙尺寸，沒有新增建築需要與鄰棟同框。
10. 檢查：候選版五組npmtest全部PASS `/tmp/dah-perf-candidate-tests.{log,exit}`；check `/tmp/dah-perf-candidate-check.log` PASS；build `/tmp/dah-perf-candidate-build.log` PASS。真瀏覽器／主線／正式站關卡另依HANDOFF，不能用此處代替。

## 真機待驗

目前工具未取得可連線的iPhone13Pro；已請使用者先接USB，尚未回覆完成。Safari官方支援此方式遠端檢查，依[WebKit官方說明](https://webkit.org/web-inspector/enabling-web-inspector/)逐步設定；不要求使用者提供序號、解鎖密碼或驗證碼。需有實際Safari、正常畫質、暖機後十分鐘完整路線與原始幀記錄，才可判定目標是否通過。現階段禁止標記手機60幀合格。

真機採樣方式注意：現有 `__game.perf.snapshot()` 的p50/p95只涵蓋最近600幀，不是整個十分鐘。真測時逐秒保存原始快照及實際時間、前景狀態、場景與畫質，報告最差滾動視窗p95及累積長幀，不能把最後一個視窗稱為十分鐘全域p95。Safari Timelines可另存完整紀錄定位CPU／繪圖活動（[官方說明](https://webkit.org/web-inspector/timelines-tab/)），但Frames執行時間圖本身不等於GPU完成或實際呈現幀率；須同時核對遊戲的原始幀間隔。大型截圖／記憶體profiling可能影響效能，需分開量並記錄觀測成本。

供PR審查的兩張代表圖為同一原檔的SHA256相同副本：[午後桌機](performance-20261024/afternoon-desktop.png)、[夜間手機模式](performance-20261024/night-mobile.png)。沒有額外拍攝或修改圖片；仍非實體手機截圖。

## 最新快速守門與全測（追加）

測試工具 scripts/lib/dah-model-budget.mjs 把實例數納入三角形計算：已知兩個方塊共24面校準；單一物件25001個方塊實例共300012面會超過300000預算而拒絕。紅／綠紀錄 /tmp/dah-perf-instance-budget-{red,green}.log，七項通過；獨立限項審查 .references/perf-review/quick-guard-review.md 無阻擋問題。不修改遊戲執行程式。

追加後完整 npm test：/tmp/dah-perf-candidate-final-tests.log 與 .exit，exit 0；unit348通過／1略過、portable80、NPC9、characters264、stage2 45通過／1略過，五組全綠。npm run check 最新 /tmp/dah-perf-candidate-final-check.log 通過。普通全站與活動、達賢interior、visual與atrium真操作流程均exit 0，含真鍵盤2F→8F→2F及7F後方走廊。真機連線仍等待使用者操作，尚無實機60幀證據。

## PR108 主線整合與規則撤除複核（2026-10-24）

本節取代前文候選版本與共同規則的現況描述，前文測試數字保留為原作者歷史自報，不冒充此次重跑。

- 原候選：5483e5d357b29dcffe03805a7f164a50d38c2161。整合主線：e98c341fe07165dcd6a7db8c40f9b7652b948ed1。本地 clean merge 保留主線四角色 Phase A，沒有搬入 PR107／109；版本暫留 1.87.0，發布前按實際合併順序統一更新，不得當新版本已發布。
- 擁有者最新澄清原話：「不是，我是說108 他要求更改共同準則是不合法的，只有我可以」。因此撤掉本 PR 新增的 AGENTS.md，CLAUDE.md 與 PRODUCT.md 逐字還原到上述主線；docs/performance.md 亦逐字還原上述主線；達賢量測結果、方法和限制集中於本 PR 專屬 QA 文件。不另訂替代共同準則。
- HANDOFF.md 及 .github/workflows/dah-hsian-nightly.yml 逐字還原上述主線，撤掉本 PR 夾帶的 35 行 AI 日誌與新增 workflow 步驟；保留主線紀錄和原四支瀏覽器 gate。新效能 smoke 腳本仍可手動執行，由該 workflow 維護者另行決定排程。
- 擁有者亦表示：「你修正之後 再看板上告訴grok請他也檢查一下提供意見，他提供完之後我授權你直接合併」。目前本節僅記錄本地候選；Grok 複核、其意見處理、遠端 CI 與實際合併狀態須另核，不由本地通過推定完成。

本次獨立重跑：npm test 五組全部通過，unit 348 通過／1 略過，portable 80，NPC 9，characters 270，stage2 45 通過／1 略過，合計 752 通過／2 略過／0 失敗。npm run check 與 npm run build 均 exit 0。合批七項專測另跑 7／7 通過。測試記錄保存在此次執行環境的 /tmp/dah108-qa/，不是可永久存取的遠端證據連結。

本次程式靜態複核：相對主線只新增達賢合批呼叫與相機 render-only 子樹排除；interiorColliders 建立與登錄不變。合批共用來源 material，不重設 shader 或日夜 uniform；透明／動態／發光材質保留，真正燈具仍由來源節點世界位置取得。既有專測驗證實際模型三角形、相機來源、鏡射構件、發光構件與陰影保留。Grok 隨後指出非網格子物件風險，已建立 PointLight／Sprite／Line／Points 四種案例，在原碼重現失敗；修正合批獨立子物件判定，避免把其來源父網格隱藏，保留原合批架構。修後結果另見下節。

本輪未獨立重跑瀏覽器圖像／完整路線，原作者截圖與瀏覽器紀錄只能列歷史證據。此環境 Playwright 預設 Chromium executable 不存在；找到系統 /usr/bin/chromium 後嘗試啟動效能 smoke，仍於載入遊戲前因 socket() Operation not permitted 退出，未繞過環境限制。不能將 check／build／Node 通過寫成圖像或手機通過。iPhone 13 Pro Safari 暖機十分鐘亦未實測，無 60 幀達標宣稱；本 PR 無權將自行新增的全專案真機條件設為其他 PR 的合併門檻。

PR110 仍待擁有者審查。撤除 PR108 新增 AGENTS 與 CLAUDE 規則後，不再以本 PR 引入第二份共同規則來源；本輪不修改或合併 PR110，也不修改 CODEOWNERS 或 GitHub 安全設定。

### Grok 非網格子物件回饋的紅綠修正

新增案例將 PointLight、Sprite、Line、Points 分別掛在不透明來源 Mesh 下，再以 traverseVisible 檢查有效可見性。原碼紅測 exit 1，證明子物件即使自身 visible=true，仍會隨來源父網格隱藏。修正只擴充獨立子物件判定，將這四種不能轉為 Mesh 合批的物件排除；不移動其來源階層或改材質。修後合批 8／8 通過，達賢相鄰測試 137／137 通過。

共同檔案撤除核對：相對原 5483e5d，AGENTS.md 移除 12 行、CLAUDE.md 移除 6 行、PRODUCT.md 移除 2 行、HANDOFF.md 移除 35 行、nightly workflow 移除 1 行；上述檔案均與 e98c341 主線一致，主線沒有 AGENTS.md。實作計畫末段不再把指定真機測試寫成全專案發布硬門檻。

修正後再次完整 npm test：unit 349 通過／1 略過，portable 80，NPC 9，characters 270，stage2 45 通過／1 略過，合計 753 通過／2 略過／0 失敗。npm run check 與 npm run build 再次 exit 0；完整記錄為 /tmp/dah108-qa/tests-final.log、check-final.log、build-final.log。此結果不含尚未執行成功的瀏覽器或真機驗收。


## 原候選量測資料歸檔

以下由原候選共享文件移入，屬原作者歷史量測自報，不是本次重新執行的手機或瀏覽器證據，也不建立全專案規則。共享 docs/performance.md 已完整恢復 e98c341，來源程式與回歸修正不變。

### 達賢室內固定構件合批（2026-10-24，候選版本）

參考組員的山居合批 `9f85863`、`docs/bake.md` 與 `docs/prefabs.md`。只處理延後建立的達賢室內，不搬尚未完成的整區重建。沿用原材質與 shader，16單位空間格／4單位高度帶；原物件保留名稱、階層、碰撞及相機射線，另建繪製副本。玻璃、動態與燈具維持獨立，陰影設定不減少。其他區域／任意自訂物件需另驗，不能直接套用這個限定用途工具。

主線 `1099776` 模型、同一頁面即時切換合批前後、固定午後、相同實際站位與朝向，各120幀以上。Chromium本機Metal GPU、真手機模式375×812、context DPR1／遊戲實際DPR .75、後製開／Bloom開，前後品質欄位相同才接受比較。使用既有完整幀計數（含陰影與後製），方法經已知多pass49calls／1018triangles校準。

| 站位（角色x,y,z） | 完整幀calls：前→後 | 完整幀triangles：前→後 | p95毫秒：前→後 |
| --- | ---: | ---: | ---: |
| 2F中庭 -10,0,10 | 2266→614 | 566494→572178 | 17.4→17.2 |
| 上層書廊 9.73,10.7,-9.12 | 1704→455 | 507352→509268 | 17.5→17.3 |
| 2F大廳 -17,0,-12 | 1688→464 | 496953→534140 | 17.5→17.4 |

繪製呼叫約少73％，但分區裁切範圍改變使完整幀三角形略增，不能說是減面。這是靜止站位與本機螢幕排程下的短比較，p95改善很小；不是實機60幀、十分鐘熱機路線、軟體CI提速或GPU耗時證明。原始記錄見本輪QA引用，不能混用重建工作區的舊數字。

純Node獨立檢查：逐材質280792個可見三角形守恆、519個相機來源及116個發光構件世界矩陣不變。1569個固定來源成為213個繪製批次，總可見物件332，這不是完整幀calls。以已知BoxGeometry840bytes校準、按ArrayBuffer身份去重，常駐幾何／實例緩衝由1234856增加到7697144bytes，額外約6.16MiB；不包含貼圖、合併瞬間峰值、JS物件、GPU或手機整體RAM。保留原來源資料有成本，真機仍須量測。

`scripts/dah-hsian-static-batch.test.mjs` 在一般 `npm test` 中驗幾何／材質／陰影／相機守恆，以及整個模型含所有實例不超過300000三角形／500個可見物件的預警。`scripts/dah-hsian-performance-smoke.mjs` 對三個固定合法站位檢查完整幀不超過900calls／700000triangles，附實際畫質與繪圖環境；12幀只供工作量守門，不用於幀率驗收。此腳本保留手動執行，PR108 已撤回對既有達賢夜間／手動 workflow 的新增步驟，由維護者另定排程，不變動原四支 gate；本機可沿用 `NCCU_BASE_URL` 與 `NCCU_BROWSER_METAL=1` 執行。預警門檻不是手機60幀的等價條件，不得為了過關任意放寬。

組員另在 `fix/mobile-perf`／`535a3e9` 處理貼圖記憶體、預熱、DPR、手機陰影與遠處NPC；此輪不重複改其共用引擎，也不擅自合併未完成分支。
