# 四角色相容試做，階段 A

固定來源：a40a04e03e618be0515e98fa51bbd41df9bd0784，v1.84。
試做 PR106 疊在 T015 PR105 上，目前依賴 commit c6ffdd66286b7270a45a7d4024ea204827a712bf，tree ba230ad3ba45ea486d6b8e9a1caa9f697fa3a22e，包含 PR104 的測試流程。既有角色與姿勢基準來源仍為上列 a40a04e。
版本沿用 T015 的 v1.86，這不是新版本發布；未來合併時再決定版號。
PR106：https://github.com/wenzhotw/nccu100/pull/106。維持草稿，尚未合併或部署。使用者已撤回 11/7 日期限制，改以必要測試、獨立程式審查與 Grok 實機驗收作為後續合併條件，不因日期自動延後或放行。

## 交付範圍

僅 chiang（CH-003）、player（CH-030）、bz26-D12（CH-042）、bz26-D23（CH-053）。
這是穩定引用與 profile 相容層，不是完成的新骨架、角色工廠、全角色遷移或可換裝零件庫。

- 新增 `optInFourCharacterRig({ id, root, body, joints, headCenter })`。必須明確呼叫，正式遊戲沒有匯入或自動啟用。
- `joints` 直接接收原 NPC 的 P 或主角 H，不複製、不改綁，因此既有 callback 繼續使用原物件。
- `refs`、`get(name)` 提供角色內限定的名稱別名，不改原有 Object3D.name。完整 T013 零件名稱表仍待後續實作，不能把這份結果當成全部零件已命名。
- NPC 的 head.pivot 與 head.center 同指舊 .99 中心。主角仍是 .72 頸部 pivot 加 .27 center，H.head 保持指向 pivot。legacy.head 表示舊掛載中心，legacy.joints.head 保持原動畫對象。
- 主角袖、前臂、腿、鞋、鞋底與頭髮改保存建構時引用，不再使用 children 索引換裝。所有舊 export 仍保留，另加 headCenter、limbParts。
- 每個角色只在原有四肢子節點尾端附加四個空 Group：reserved.forearm.L/R、reserved.lowerLeg.L/R。active:false、offsetsUnspecified:true、bendEnabled:false，matrixAutoUpdate:false。
- 這四個物件只是保留標記，不是解剖手肘、膝蓋、手掌或腳。沒有 mesh 子節點，沒有彎曲 API，不能作為已確定的裝備掛點。
- 沒有移動、重新掛載、隱藏、改色、替換原幾何，也沒有改服裝 callback 或 baozhong 內容。

## 位置待決

現有 npc.js 證據：肩位置 ±.21/.65，袖中心 -.06，前臂中心 -.16，手中心 -.25；髖 ±.085/.33，腿中心 -.1，鞋中心 -.24。
現有 player.js 證據：肩 ±.19/.63，袖中心 -.05，前臂中心 -.14；髖 ±.085/.32，腿中心 -.1，鞋中心 -.235。
這些是既有 mesh 的中心，不是可直接採用的解剖旋轉點。規格 v0.2 與 v0.3 草案沒有精確肘膝手腳 offset，因此本輪不猜測。待協調者與 Grok 審查定位提案後，才能新增實際關節與搬移零件。

## 索引依賴稽核

- player.js 原 SLEEVES、becomeEagle 的肩／髖 children[0～2] 全改建構引用。
- 原頭髮 children[0] 幾何辨識改為建立 SPIKE 與 BANG 時保存引用，集合與順序不變。
- old-principal/index.js 的 sh.children[2] 白手套依賴仍保留，老校長不在這次允許範圍。本模組不改 makePerson，也拒絕 old-principal。未來擴大遷移前必須先處理。
- npc.js 與活動服裝沒有發現其他 children[index] 身體部件依賴。本輪只在尾端加標記，原節點次序與路徑逐一測試不變。

## 驗證方法與交接

本試做測試依賴 T015 的 tests/characters/poses.mjs 及 snapshots/poses/。直接使用其 a40a04e 生成的 24 份基準，不重建、不改寫。

執行：

    npm run test:characters
    npm run test:rig-trial
    npm run check
    npm run build
    npm test

T015 的 test:characters 使用 *.test.mjs，npm test 因而會自動執行 rig-trial.test.mjs，不重複串接第二次。另保留 test:rig-trial 供單獨執行。套用本 patch 前必須先整合 T015；若缺少其模組或姿勢基準會失敗，不能省略測試。

試做測試以既有 build.mjs 暫存副本插入同步觀察點，不改正式建構器。沿用相同 import 順序與固定亂數，避免 eager player 先載入造成雄鷹隨機羽毛基準漂移。暫存檔在 finally 移除。

驗證全部 112 個中立世界清單，包含主角一般、泳裝、雄鷹。四個目標另驗證啟用前後各六姿勢完全相同，且逐份比對既定 24 個姿勢基準。原有結構逐列不變；四角色各增加四個明列空標記，共 16 個。主角後續泳裝與雄鷹共用同一組標記。

沒有執行 UPDATE_SNAPSHOTS，世界與原結構基準都未修改。試做結構差異在測試中明列，不藉重新產生 world baseline 掩蓋差異。

停損：單角色／服裝超過四小時或兩次真正模型快照差異無法排除，即停止相容遷移，保留原 custom 並交回決策。此次曾修正測試檔名映射與 import 順序，沒有改基準或反覆調整模型迎合結果。

## 尚未驗收

未做 Grok 實機／瀏覽器視覺審查，不宣稱 hash 證明完整畫面等價。作者不能是唯一審查者。

美術第十三節：材質、顏色、描邊、造型、貼圖、燈光、尺度皆未修改；原世界清單相等。空 Group 不新增可見 mesh。實機效能與兩張截圖尚未核，應由獨立審查補上。完整測試結果見交付紀錄，不能把局部通過當成全套通過。
