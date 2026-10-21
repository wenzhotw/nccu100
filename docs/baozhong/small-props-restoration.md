# 原小道具與遮擋帳篷恢復

依原始 src/content/baozhong.json 的 37 個 booths[].prop 文字規格，建立真正的靜態模型。不是直接還原後版 decor/Dxx.js，避免把大型佈景重新載回。

- D01–D12：small-props-01-12.js。
- D13–D24：small-props-13-24.js。
- D25–D37：small-props-25-37.js。
- small-props.js 用正式 decor ctx 建構，保留原規格比例，等比縮至桌面最大寬1.35、高0.72、深0.50公尺，底部y0.78。模型與描邊都在櫃檯碰撞範圍內，不新增路面障礙。
- 正式入口 restoreSmallProps:true，略過37個舊學系decor。服務攤位F01–F03原有decor不改。
- 所有40帳篷沿用原既存三面布幕、四片頂棚加垂邊、四柱、桌巾及招牌。日文系在同樣有布幕的帳篷前保留既有曲線鳥居，僅一座；小物另為假名積木與暖簾。
- 除日文鳥居外，所有大型代表物不再在活動場景建立。舊原型模組留作歷史與單元測試，沒有掛到正式活動。
- 入口2026看板、地圖、NPC、招生活動內容、遊戲規則、其他校園景物不改。

驗證：npm run check、npm run build、45項相關場景測試、80項portable測試通過。只讀獨立驗收40帳篷與舊版幾何一致、37小物、零大型代表物根節點、日文2根鳥居柱；碰撞322項為舊320加鳥居2，全部NPC錨點clearance至少0.35。小物含描邊合計652 meshes、11664三角形。個別metrics見small-props-metrics.json。

初版基底a1ad9a9完整npm test已通過。PR建立後main更新為93a3739，已安全同步保留八棟新建築；同步版重新check/build及專測，完整CI仍待終局。CI沿用真遊戲截圖流程，更新為驗證布幕恢復與小物；未取得本版截圖前，文字可讀性與最終外觀未驗收。手機為瀏覽器模擬而非實機。沒有執行merge或部署。

當前scenery hash鎖更新本次合法index/tents/adapter接線；歷史baseline及v2鎖完全保留。版本號v1.58。
