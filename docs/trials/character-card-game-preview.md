# 實際遊戲內的設定卡預覽

這是 PR118 的後續接線原型。只在 `?characterCardsPreview=1` 明確啟用，仍不是一般玩家預設功能。角色限定 `bz26-D26`、`bz26-D31`、`bz26-D12`，使用真正 NPC、既有 `npcUpdate` 與 `n.after`，不新增骨架或角色劇情。

## 操作

1. `/cards/` 可點「進入實際校園預覽」，也可手動在遊戲網址加入上述 query。
2. 進入包種茶節，打開「設定卡預覽」。選件後按「套用選件並保存預覽」，或貼上工作台匯出的設定卡 JSON 再按載入。
3. 關閉面板，到三個攤位看人物與原動畫。面板開啟時用既有閱讀鎖暫停角色輸入，原生 dialog 處理焦點與 Escape。
4. 「還原此角色」只還原選中的預覽角色。「清除全部預覽設定」只清三角色預覽，不清遊戲進度或原四角色換裝。
5. 離開預覽連結回到沒有 query 的一般遊戲。一般遊戲不讀取／恢復這份設定；重新以 query 進入才恢復。

## 配裝寫入互斥

`appearance-ownership.js` 管理每個 actor ID 的單一持有者，owner 只有 `wardrobe-v1` 或 `cards-preview`。取得租約成功才建立 adapter，建立失敗釋放。dispose 成功才釋放，失敗時保留租約，不讓另一個寫入者接手半清理角色。

既有 wardrobe v1 先恢復，因此 D12 已有非 default 的正式換裝時，設定卡預覽會拒絕並要求先到原面板還原。設定卡先佔用後，原面板新增配裝也會拒絕。不能暗中拆掉對方的 Object3D，不能以資料「最後寫入優先」取代實際模型所有權。

全部 default 與 reset 會釋放自己實際持有的租約。沒有自己的 adapter 時，reset 只刪自己的保存項，不清除別人的租約或服裝。三個預覽角色並非主角，這批不改泳裝或雄鷹流程。

## 保存與交易

遊戲預覽使用 `nccu100.character-card.game-preview.v1`，不共用工作台的 `nccu100.character-card.preview.v1.<id>`、正式 `nccu100.wardrobe.game.v1` 或遊戲進度。

儲存 wrapper 限 16 KiB，各設定卡沿用原 schema 白名單與 4 KiB 上限。套用以既有 card adapter 的同步 commit 寫入保存，quota 等失敗回復原件引用／可見狀態／順序及租約。舊根節點被另一系統重建時拒絕套用，必須先還原清理，不能把舊 adapter 冒套新角色。

preview controller 的 `restore()` 逐角色回報錯誤，不掩蓋 v1 衝突。資料損壞提供明確清除預覽設定入口，不猜測修補舊進度。普通 query-off 啟動不載入新 runtime／CSS，也不接觸預覽保存。

## 生命週期與限制

活動退出僅隱藏原 NPC root，不移除角色或改其可見旗標；重新進場仍使用同一份配裝。正常 pagehide 清理預覽 adapter；bfcache 保留時不拆卸，以便返回時保留原狀。預覽面板與原換裝面板共用閱讀鎖，因此不可同時開啟。

外部任意改動幾何／拓撲、並發相同 visible=false 寫入仍非通用支援情境。保留 PR118 的能力界線：無通用網格資料庫、跨角色混穿、三色調色、體型、真肘膝、VRM 匯入或新物理。

## 驗證要求

- 真三角色 quota/default/reset/clear、D12 與 v1 雙向互斥、重新載入、下一次 npcUpdate、原件 identity 與共享資源不 dispose。
- query 嚴格只接受單一值 1，其他值及重複參數關閉。
- JSON 原字串驗證、dialog lock/focus/快捷鍵隔離、390px 尺寸契約。
- 三入口 build、初始化順序、HTTP、全套測試及精確 head 的 Grok 實際遊戲驗收。

Node 與靜態測試不能取代真機畫面；合併與部署仍由協調者確認，不能因本文件存在就視為已上線。
