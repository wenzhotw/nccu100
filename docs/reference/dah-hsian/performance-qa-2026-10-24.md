# 達賢效能修正驗證，2026-10-24

範圍：主線1099776的室內固定構件合批、相機來源保留、繪製負擔守門與後續開發規範。候選版本1.87；未把原工作區的未完成場景重建、鏡頭配置、家具或地形帶入。這是AI玩家／即時繪圖工程角度的檢查，不是建築還原、真人認證或手機60幀通過。

## 實作與負擔證據

主線乾淨副本先全測五組通過：`/tmp/dah-perf-main-baseline-tests.{log,exit}`。新真瀏覽器預警先失敗：`/tmp/dah-perf-complete-budget-red.log`，二樓1983calls超過900。移植已逐行為紅綠的普通固定合批後，六項單檔PASS `/tmp/dah-perf-main-static-focused.log`；相鄰材料／照明／導航／室內66PASS `/tmp/dah-perf-main-regression-focused.log`。完整幀預警在Metal三站PASS `/tmp/dah-perf-complete-budget-green.log`，SwiftShader三站PASS `/tmp/dah-perf-software-budget.log`，其實際renderer已讀回。軟體長幀仍存在，12樣本預警不是幀率測速。

同頁120幀前後比較：`/tmp/dah-perf-isolated-same-page-ab.log`及ignored `.references/perf-review/same-page-ab.json`。三站calls2266→614、1704→455、1688→464，所有前後均DPR.75、後製與Bloom開，實際站位一致。完整triangles稍增，不宣稱減面。詳細表與限制見 `docs/performance.md`。

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
