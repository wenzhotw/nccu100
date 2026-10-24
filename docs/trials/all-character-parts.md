# 全角色原生零件設定

## 範圍

此批基於 PR118，不重畫、不重構動畫或真肘膝。115 個靜態身份為 110 NPC（109 人形與水豚 biz-tsai）、主角、左右石獅、穿山甲、老校長的馬。舊快照清冊 109 NPC 漏了實際建立的 bz26-EXAM，本批將其列入。六位匿名學生使用獨立 appearanceId，不修改劇情用的 n.id。

`src/actors/character-manifest.json` 是保存允許名單及未生成角色列表，不是假實例。遊戲面板顯示實際 ready 數及 pending ID。電台 4、學程／友校 8、圍觀 8 共 20 位由事件晚建，必須在真遊戲觸發後才能宣稱全場景 census 完成。裝飾拱門動物、車輛與泡泡不算角色。

## 實際提供的能力

- 共用 constructor 記錄原生語意 refs；metadata 產生全角色選單、可用部件、禁用原因。
- 每個支援槽可選原樣或原生裝配；安全的獨立頭髮／頭飾／配件可卸下。
- 原生裝配是 clone 本角色既有零件並暫藏原件，共用不可變 geometry/material；不是把另一人的衣服穿上，也不是完整建模 JSON。
- 身體、上衣、下身與鞋是必要部件，不允 none。未分離的衣身不能卸下，避免浮空手腳。
- 和服／法官袍的 native 選件可遮上衣與下身，多 owner 同時遮藏後逐一釋放。身體槽中的前臂、手、頭不隨衣服消失。這比舊三角色 adapter 把前臂放在 top 更保守。
- 主角 normal 可編輯；泳裝與雄鷹先暫停新配裝並保留保存資料，不強制變回人類。返回支援形態後重新裝配。
- 非人形使用真掛件能力，不提供虛構人類手臂或服裝。未有可拆掛件者只有必要原生身體設定，不假稱能任意脫衣。
- 保持既有角色外觀、原件引用、動作 callback、故事、互動與遊戲進度。零件尚未分離不等於全角色都已完成藝術重設計。

## API 與生命週期

`character-registry.js`：createCharacterRegistry、characterRegistry；register/get/list/ready/unregister/subscribe，及 beginForm/form。descriptor 帶 id、label、kind、root、slots、anchors、rules、form/supported。原件引用與 metadata 分離，不序列化 Object3D。

addNPC 登記 pending，明確建構完成點或保護過 generation 的 microtask 才 ready，確保 custom 服裝已建立。舊 generation 不可移除新 root。remove 釋放 active adapter，保存資料可等待下一次 ready。變身前同步卸下，卸下失敗阻止本次變身；完成後才恢復可用設定。

`actor-parts-config.js`：defaultActorPartsCard、validateActorPartsCard、parseActorPartsCard，及明確 migrateLegacyCharacterCard。新 kind 是 nccu100.actor-parts、schemaVersion 1，parts 值僅 default/native/none，原字串上限 16 KiB。

`actor-parts-adapter.js`：createActorPartsAdapter(entry)，exportCard/loadCard/reset/validate/refresh/dispose。掛載、移除及同步保存同筆交易，失敗還原原件／已選件引用、parent/index、visible。相同選件不重建。共享資源不 dispose。refresh 在原動畫完成後同步原件 transform/material 到 native 替件，不更改原角色動作。

`systems/actor-parts/controller.js`：apply/reset/clear/restore/exportCard/status/refresh/dispose。訂閱 late ready 恢復已保存設定，缺席角色保留 pending。必須成功裝配才提交保存。保存錯誤不當成已完成。

## 保存與其他系統

獨立 key：nccu100.actor-parts.game.v1；整份保存上限 256 KiB。角色 ID 受 manifest 白名單限制，未知或惡意欄位拒絕。原正式 save、wardrobe v1、三角色預覽 key 不變。

同角色只能由 wardrobe-v1、cards-preview 或 actor-parts 其中一個 owner 操作。原 v1 先恢復，新系統遇衝突顯示來源，必須先在原面板還原。新面板不能默默解除他人的 lease。

舊三角色卡只有明確按「轉換」才產生新 JSON，不套用、不保存、不清除舊資料；再按套用才變更。新 body 槽保持前臂可見。原 wardrobe v1 不是相同槽位語意，不做靜默遷移。

## 未解決／驗收界線

- 外部重複寫相同 visible=false 無法辨識新意圖；已知主角形態以事件仲裁，其餘任意外部 writer 不宣稱完全可追蹤。
- 共用 geometry 不代表 FPS 提升。替件新增 Object3D，原件隱藏但仍保留；需要真機量測，不能把 Node 測試當畫面通過。
- clone source 的 child 動態 transform/material 在 refresh 同步；未實作 IK、物理、三色調色、體型或跨角色衣庫。
- 既有 snapshots/goldens 不改。新增 NPC EXAM 與非人形來源驗證不能偽稱舊 112 樣式已涵蓋所有 production 路徑。
- Build byte equality 比較同候選的單入口與三階段隔離建置，不是與舊 main bundle 相同。
- 真場景需檢查 20 位 late 事件、包種進出、主角泳裝／雄鷹、獅子天氣、穿山甲抱取、老校長騎馬及各特殊 after。UI census 用於驗證，不以靜態清冊數代替實際 ready 數。
