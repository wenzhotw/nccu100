# 全 NPC 共用建模與常駐幾何重用

## 範圍與基準

基準為 main `080213a52418f9152f13d24511ac8047256a2970`，tree `f0916cf5b11ed307f6858a57d84a91639613f780`，v1.96。本批統一 NPC 的建模底層，不開放全部角色的換裝介面，也不變更存檔 schema、新肘膝、動畫頻率、LOD、劇情或部署流程。

現有固定語料共有 112 個外觀樣式：109 個 NPC（108 人形、1 個水豚）加主角一般、泳裝及雄鷹三形態。主角三形態共用同一根節點，因此唯一實例是 110 個。這不是原協作表 105 清冊的完成率分母。

## 路由與統一介面

所有 `addNPC` 人形現在實際由 `createHumanoid` 建立，不再保留重複的舊人形身體建模分支。臉、髮、服裝與裝飾仍保持原建構時機和掛點。既有 `g`、`rig`、`P`、台詞、互動點與動畫回呼不變。

每個 `addNPC` 回傳物件增加 `assembly`，共同提供 `root`、`body`、`joints`、`headCenter`、`parts`、`limbParts` 與 `kind`。這是程式引用，不寫入既有遊戲存檔。

- 人形 `kind='humanoid'`：沿用 profile、肩髖頭與穩定部件引用。主角保留原工廠入口。
- 水豚 `biz-tsai` 的 `kind='capybara'`：由獨立 `createCapybara(look, {parent, part, BOX, SPH})` 建立，`getCapybaraAssembly(root)` 可讀來源。`parts` 包含 torso/skull/nose，`limbParts` 為 frontL/frontR/backL/backR；保留既有 P.hip/P.sh 動畫映射，不把四足假裝成人類手掌或人形換裝槽。
- 匿名路人同樣經 `addNPC`，不依賴角色 ID 才能遷移。
- 老校長的人形身體經同一工廠，馬、馬靴與其他 custom 裝飾不改；原白手套的 children[2] 仍維持相同部位。

`addNPC` 的建立來源包括 npc.js（常駐及匿名同學）、missionaries、fountain-swim、baozhong/index、baozhong/entry-radio、baozhong/programs-partners、old-principal。

非 NPC 登記表中的穿山甲 actor、圖書館石獅、老校長附屬馬及活動拱門動物圖案仍是原專用路徑。它們不是已遷移的人形，也沒有因此停用或改動。主角雄鷹仍是原主角形態轉換，不重建人形。

## 幾何重用契約與效能證據

`humanoid-factory.js` 的模組級幾何池用完整幾何種類及參數作 key，最多留 64 組；滿後新參數不入池。已有 BOX/SPH 仍用原共用資源。不 dispose 池中或仍被角色持有的幾何。角色 Object3D、關節、visible 與每個 Mesh 的材質指派保持獨立，既有 toon 材質快取不變。

幾何與其頂點視為唯讀。未來若要直接改頂點，必須先 clone 並同時處理該部位的描邊，不能修改共用 geometry 或直接改共用材質 color。體型調整應優先修改 profile／節點 transform，再重建該角色。

為保留舊版 Three.js UUID 所消耗的 Math.random 序列，每次仍建構對應的臨時 geometry，再於命中時使用池中的既有 geometry；未掛到 renderer 的臨時物件交由 GC 回收。此方法降低常駐幾何與 buffer，**不聲稱減少建構配置量、建構 CPU、尖峰記憶體、draw calls 或提升 FPS**。`getHumanoidGeometryStats()` 回傳唯讀的 requests/reuses/entries/limit 計數，沒有全域 reset 或強制 dispose API。

在相同 110 唯一角色 root 的測試語料量測：

| 指標 | v1.96 基準 | 本批 |
|---|---:|---:|
| 節點 | 5,929 | 5,929 |
| Mesh | 4,737 | 4,737 |
| 不同 geometry 引用 | 1,522 | 552 |
| 不同 material 引用 | 613 | 613 |
| mapped texture 引用 | 246 | 246 |
| 持有頂點／索引 typed-array bytes | 19,774,624 | 9,355,824 |

geometry 引用減少約 63.7%，頂點／索引資料減少約 52.7%（10,418,800 bytes）。此為 Node 真模型常駐引用量測，不是瀏覽器整頁 heap、GPU 配額或實機 FPS。量測計入語料中的服裝和附屬件，但不代表整座校園的資源總量。

## 測試與發布門檻

`tests/characters/all-npc-factory.test.mjs` 驗證全部人形路由、水豚專用來源、匿名學生、老校長手套、常駐資源差異與池上限／存活資源不被 dispose。原 `humanoid-factory.test.mjs` 的四 ID 限定路由改為本批全人形授權契約，原 profile、失敗回復、引用與掛鉤測試保留。所有舊 world/structure/24 姿勢 goldens 不變。

必跑 `npm run check`、`npm test`、`npm run build`、`node scripts/wardrobe-built-check.mjs`。正式單入口 build 與工作台保持兩次獨立打包，不回到曾破壞初始化順序的共用 MPA chunk。

Grok 對精確候選應分三組驗收：一般／匿名／室內人形；活動與特殊服裝（含 D12/D23、傳教士、老校長）；水豚與主角 normal/swim/eagle。檢查走路、互動、換裝原四角色、手機，以及同條件 `?perf`。編譯和快照不能冒充實機結果；不以更新 goldens 掩蓋外觀差異。

## 保留邊界與回退

原四角色換裝白名單、schema、服裝遮藏與 UI 不擴大。全 NPC 已可透過共同人形建模與 assembly 引用供下一批重設計，不等於每個角色的全部 custom 配件都已資料化。

回歸時針對本批 npc.js、humanoid-factory.js 與新增水豚工廠作回退修正，保留其他 PR 的校園與已核可功能；不得整包撤回包含別人內容的整合 merge。版本號由整合者統一，不改共同守則、工作流程或基準圖檔。
