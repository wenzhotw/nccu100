# 四代表共用人形建模工廠

## 範圍

本批將 player、chiang、bz26-D12、bz26-D23 的實際軀幹、下身、肩髖、四肢及頭骨建構移至同一個 `createHumanoid`。不是只在舊建構器外包函式。其他人形與非人形 NPC 仍走原路徑，沒有宣稱全角色遷移完成。

`humanoid-profiles.js` 只產生純資料，包括幾何型態與參數、顏色、位置、比例及描邊。工廠不依賴四個角色 ID，也不呼叫 player 或 NPC 舊建構器；新的體型可由資料衍生，不需要複製另一套身體建構程式。這是基礎人形建模層，不是完整部件目錄與所有裝飾資料化完成。

## 介面與相容

- `createHumanoid(profile, tools)` 接收注入的 part、outlineU、BOX、SPH 與選用 parent。
- 回傳 root、body、joints、headCenter、parts、limbParts；既有 H/P 掛點、SLEEVES、PACK、HAIR 與來源登記引用保留。
- player 頭部保留 y=0.72 的旋轉點及局部 y=0.27 的中心。NPC 頭部保留 y=0.99，旋轉點與中心是同一節點的兩個語意，不新增 wrapper。
- afterTorso、afterBottom、afterArms 是受信任的程式裝飾掛鉤，並非可由匯入 JSON 執行的腳本。執行順序保留原本的領帶、背包、手錶、傳單與身體子節點順序。
- 臉部繪圖、頭髮、特殊服裝、自訂 after、泳裝、雄鷹仍由既有程式處理。本批不增加關節、不改動畫、不啟用試驗肘膝、不改存檔與正式換裝 schema。
- profile 在建立模型前複製與驗證；拒絕 getter、非純資料、非有限數、錯誤向量、尺寸及分段。尚未完成的模型不加入目標場景，掛鉤失敗不保留半套角色。

## 資源與風險

沿用原 toon/outline 工具與既有 BOX/SPH 共用幾何。其餘幾何配置保持舊建立順序與數量，避免重構同時改動 seeded random 與後續角色的外觀。這批不是幾何快取或效能優化；不聲稱降低 draw calls、記憶體或提升 FPS。各角色 Object3D 與可變材質指派、visible 狀態不可互相污染。

主要回歸風險是 profile 的尺寸抄錄、裝飾插入順序、head pivot 語意與 legacy limbParts 引用。驗收必須維持原世界與結構快照，不用重寫 goldens 掩蓋差異，並檢查姿勢、正式下一幀動畫、換裝裝卸及泳裝／雄鷹流程。

## 未完成項目

完整格子遮藏規則、三色編輯、體型 UI、全角色遷移、表情分層、IK、完整新肘膝與腳關節仍未完成。Node 模型與打包測試不能替代真實瀏覽器的啟動、互動和畫面驗收。
