# 三套服裝設定卡預覽

基於 PR117 的共用 NPC 底層，這一批提供原有零件的 catalog adapter、設定卡、穩定掛點、集中遮藏與獨立工作台。不重畫人物，不加入真正肘膝、IK 或全角色換裝，不搬用其他引擎程式碼。

## 範圍與入口

- `bz26-D26`：日本語文學系，和服身裙／雙袖、腰帶背結、髮飾。
- `bz26-D31`：法律學系，法官袍／雙袖、領巾、假髮。
- `bz26-D12`：金融學系，原西裝上衣／袖子／襟片領帶、褲裝、金融平板。
- `/cards/index.html` 是隔離預覽入口，有角色、逐件選項、三種關鍵姿勢、相機、重設、JSON 匯出與重載。
- 原 `/wardrobe/` 與正式遊戲配裝不變。此預覽不套用正式遊戲，不等於三套衣服已開放跨人物混穿。

## 資料契約

`character-card-config.js` 匯出 `CHARACTER_CARD_CATALOG`、`defaultCharacterCard(actorId)`、`validateCharacterCard(value, expectedId)`。

設定卡形狀：

```json
{"kind":"nccu100.character-card","schemaVersion":1,"actorId":"bz26-D12","parts":{"top":"business-suit","bottom":"default","hand.L":"finance-tablet"}}
```

- `default`：原樣，無新增節點、無遮藏。
- `none`：暫藏該類原件，不增加替代件。
- 該角色 catalog 指定 ID：以原件 adapter 建立新 Object3D，重用不可變 geometry/material，掛在原掛點，集中遮住原件。
- 非該角色 catalog 的 ID、額外或缺少欄位、getter／Symbol／非純物件、未知 schema 均拒絕。原始 JSON 的 UTF-8 上限是 4096 bytes。
- 此 schema 的 `kind` 與正式 wardrobe v1 不同，兩邊驗證器互相拒絕。沒有靜默轉換、覆寫或清除原 v1 資料。
- 預覽保存鍵是 `nccu100.character-card.preview.v1.<actorId>`。原遊戲 save 與 `nccu100.wardrobe.game.v1` 完全不讀寫。

## 裝配 API 與來源

`createCharacterCardActor(n)` 必須接真正 `addNPC` 並已 `mountNpcCostume` 的白名單 NPC，核對共用工廠來源、角色 ID、custom 服裝 ID 與層級。

回傳：
- `anchors`：body、head、shoulder.L/R、hip.L/R，以及六個原 costume 掛點的固定引用。未新增虛構手肘或手腕。
- `catalog`：每類部件的 catalog ID、來源鍵、原節點名稱與 anchor ID。
- `exportCard()`、`loadCard(value, {commit})`、`reset({commit})`。
- `validate()`、`refresh()`、`dispose()`。

原 geometry 的完整建模仍在既有 costume builders 與 humanoid profile。這一批不是通用網格 JSON 格式，也不是將所有歷史 custom 重寫成基本形狀配方。資料控制選件與遮藏，adapter 保存複雜 custom 的材質、描邊、幾何與局部矩陣。新增 source key 的順序來自明確保存的 refs，不依賴 `children[n]` 尋找衣物。

D12 西裝主體本來就在 `npc.js` 的 torso、雙袖與襟片／領帶，不把金融平板誤算成西裝。`npc.js` 只增存已建立裝飾的引用，沒有改節點名稱、建構順序或外觀。

## 遮藏與復原

catalog 中的 `rules` 描述長袍遮 `top` 與 `bottom`。原件與已裝配的替代上衣／褲裝都受規則管理。原生長袍重裝後隱藏內層是有意的行為，`default` 不改原本內層。

`visibility-rules.js` 對每個目標維護 owner 集合。長袍與上衣同時持有原上衣的遮藏權時，移除其中一方不會提前復顯。最後一個 owner 離開才恢復第一次實際遮藏時的 baseline。

外部把 `visible` 寫成不同於控制器的值時，`refresh()` 可觀測並更新 baseline。外部再次寫入相同的 `false` 無法辨識新意圖，不宣稱能處理任意多寫者競爭。本批限三 NPC 隔離預覽，未接主角泳裝／雄鷹或正式遊戲動態服裝系統。

## 交易與資源

裝配先驗資料／層級，保存所有舊 parent/index，再 stage 新件、移除舊件、更新遮藏，最後執行同步 `commit`。建構／掛載／移除 callback／儲存失敗會還原原 Object3D 引用、parent、children 順序、可見狀態及設定卡。

`commit` 只接受同步函式，async 函式或回傳 Promise 拒絕。呼叫方不可在 callback 裡啟動非同步外部副作用；控制器不能撤銷已送出的網路請求。工作台只使用同步 localStorage 寫入／刪除，因此 quota 拒絕可回復裝配狀態。

相同選項不重建無關 slot，保留其外部 hidden 狀態。`dispose` 只清除自己持有的替代件及遮藏權，不 dispose 共用 geometry/material，不修改 `n.after`、P 或正式存檔。

## 發布與驗證

沿用兩階段隔離打包，再增加第三次 `--mode cards`，資產獨立在 `cards/assets`。不使用跨 main／工作台共享 MPA chunk，避免重現房間註冊之前提前執行 gameplay 的錯誤。既有單入口 byte-equality/order guard 保留。

- 原有 112 樣式／姿勢 goldens 不改。
- `tests/characters/character-cards.test.mjs`：真三角色、各 slot 六姿勢、default 精確回復、重複操作、quota、事件 throw、部分掛載 throw、anchor 外改、v1 隔離、多 owner、共享資源不 dispose。
- `scripts/character-cards-preview.test.mjs`：入口／保存／原字串驗證靜態契約。
- `scripts/cards-built-check.mjs`：根目錄及 `/nccu100/` 的 HTML／JS graph／scaffold／真 404，不以 SPA fallback 冒充頁面。
- 關鍵姿勢預覽使用既有肩／髖旋轉與原 `n.after`，不是完整遊戲循環或新骨架動畫。

Node、編譯與 HTTP 通過不等於 WebGL 外觀已驗收。Grok 必須依精確候選版本檢查和服腰帶、法官假髮／領巾、西裝平板，在三姿勢與前側後視角的遮藏／復原，再檢查手機寬度、JSON 重載、重新整理與返回遊戲。上線由協調者另行確認。

## Grok GRK047 的安全限制修訂

上衣／褲裝的原幾何與身體共用，沒有獨立裸身可在卸衣後接替。三角色的 top、bottom 暫只接受 default 或原生 catalog ID；none 在 UI 不提供，JSON／store／adapter 也拒絕，避免前臂、身軀或腿消失留下懸空手腳。舊預覽若存有此無效選項會顯示讀取錯誤，需清除或改為 default，不靜默覆寫。其他可拆獨立配件仍可 none；長袍裝配時的內層遮藏不變。

D12 固定 walk 預覽沿用肩膀擺動與既有平板掛點，有平板擺到背後的姿態，並非新手腕閱讀姿勢；未重構動畫。無效 JSON 載入只在介面提示，真實裝配或啟動錯誤仍保留 console 記錄。

Build byte equality 的比較對象是同一候選 source 的單入口 build 與分階段隔離 build，不是候選與舊 main 的產物必須一樣。
