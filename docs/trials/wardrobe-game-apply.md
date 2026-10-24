# 四角色設定接回正式遊戲，階段 D 小批

基於 PR111 精確候選 0757bcec8e7023e9e0a3ed8751679ca2e42da431，另建分支；不修改仍在驗收的 PR111。此輪不自行合併／部署，版本待整合安排。

## 使用方式與範圍

工作台增加「套用此角色到遊戲（下次載入）」按鈕。只有明確點擊才寫入遊戲換裝專用儲存區，單純預覽、匯出、工作台自己的自動保存不改遊戲。已開啟的其他遊戲分頁不會被 storage event 自動變更；請返回或重新載入遊戲。

正式遊戲右上「角色換裝」開啟原生 modal，可選四角色、貼上 JSON、套用並保存、還原單角色或清除所有換裝設定。modal 使用原有閱讀暫停鎖及 resetHeldInput，不重寫全域輸入；鍵盤事件在 modal 內停止冒泡，原生 Tab 焦點限制／Escape 關閉，關閉後回到開啟按鈕。原生 modal 不支援時會回報錯誤並釋放鎖，不留下遊戲卡住。

僅 player、chiang、bz26-D12、bz26-D23，沿 PR111 的 headwear、outerwear、leftHand 有限白名單。不是完整人體工廠、105 角色或膝／腳／三色／體型完成。

## 與正式遊戲的邊界

- 專用鍵 `nccu100.wardrobe.game.v1`，不同於工作台 preview key，也不同於既有遊戲進度。沒有改 save schema 或重設遊戲進度。
- store schemaVersion 1、actors 白名單 map；單角色設定仍採 PR111 schema。單設定最多 UTF-8 4 KiB、完整 store 最多16 KiB，拒絕未知欄位、getter、Symbol、prototype、任意網址與錯版本。
- 正式模組在既有 save 還原與四角色 custom 服裝建立後初始化，無設定不建立 adapter、不改原外觀。損壞儲存不覆寫，提示使用者明確清除。
- 先完成白名單驗證、實際裝配與 validate 才保存。同步儲存回呼加入 adapter 既有 staged transaction，在 visibility 與 selection 提交前執行；儲存失敗回滾原節點、引用、hidden 與 lease，或卸除本次新建 adapter；UI 回報未完成，不假稱已保存。重設先完成專用儲存移除才卸裝，因此儲存失敗時現場外觀不變。
- 所有 default 不建立新零件，還原時使用既有可逆 visibility 規則，不強制把原本 hidden 的配件亮起。
- 不啟用 articulated trial，不呼叫 setPose 搶正式 loop 動作。配件掛在原骨架相容掛點，既有 animateHero/npcUpdate/服裝 after 保有控制權。
- 主角泳裝暫藏新增件，正常服裝恢復；雄鷹不重建人形。已變身的主角配置會跳過並提示，其餘NPC仍可載入；可清除保留設定，不改雄鷹進度。

## 驗證

新增純資料／儲存層22測、控制器4測、modal行為3測。角色組增加真實四角色 restore/reset、儲存重載、原骨架 animateHero/npcUpdate 下一幀及 swim/normal 測試。既有 goldens 不變，275角色測通過。另有正式單入口 build byte-equality/初始化順序與 root/子路徑HTTP檢查。

這些是 Node、結構、資料交易與編譯證據，不等於已完成瀏覽器畫面、觸控、原生 dialog 兼容性或各姿勢無穿模實測。正式上線前仍需精確候選的 CI smoke、Grok可見與手機驗收。未重試已被拒絕的本地瀏覽器，也未產生偽造截圖。
