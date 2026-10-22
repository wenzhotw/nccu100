# 達賢本輪 QA與發布紀錄（2026-10-22）

本輪範圍為達賢戶外與2F公開空間。AI以玩家、熟悉現場訪客、場景維護者三個角度核對；不是現場測繪或真人專家認證。使用者的實景反證高於先前測試與ship。沒有新增登入、帳戶、交易、個資或外部資料輸入，這輪採局部使用者／領域QA，不對第三方做主動資安測試。

## 產品理解檢查點（全測前已交付對話）

| 欄位 | 本輪意義 |
|---|---|
| 產品能力 | 同獨立達賢區域含戶外、2F大廳；正確門前平台、一樓湖邊店面、公共廁所、下水與鴨群 |
| 使用體驗 | 原鍵盤／手機搖桿、原拖曳；出館落在同一道門外2F，岸→水→岸不用額外按鈕 |
| 技術結構 | 本區layout配置、模型／文字材質、room高度與泳態接線，沿用共用Three.js與角色泳姿 |
| 資料流程 | 官方圖與站立視角照片→估算配置→看得到的幾何及相同位置的阻擋／支撐→遊戲操作 |
| 設計理由 | 門、平台、廁所／店前通道與碰撞一起改，避免看得見但走不到或穿過實體 |
| 替代方案 | 保留既有toon與程式幾何；完整實景掃描需現場多角度拍攝／處理，目前公開照片不能替代完整掃描 |
| 安全與成本 | 無新付費／服務／套件；第三方照片研究用、不打包，模型與裝飾自行繪製 |
| 測試證據 | 每個新增行為先紅後綠，site-fidelity16項；2F真鍵盤／滑鼠／觸控PASS；戶外初版岸湖往返PASS，最終修改仍待複驗 |
| 剩餘限制 | 圖面照片估算非測繪；A1十月fitout無有效照片；2020公共環景不能證明2026全部陳設 |

## 已證實缺陷與修復（程式／幾何）

| 缺陷 | 重現與影響 | 修法／證據 |
|---|---|---|
| 戶外門落在館名牆另一側 | 原z18.6不符portico-mid | 共用MAIN_ENTRANCE改z7.6；ray證實返回4m平台，門前／真進出測試 |
| 2F06工具間誤作無障礙廁所 | 官方2F原圖放大辨識 | 突出工具間東向側門、男女廁在後；site-fidelity與interior27 |
| 1F WC前廊被2F碰撞先推開 | 真resolve把低處-25推到-27.1；局部keepOnLand測試不足 | coreColliders過濾離地bottom箱，本區clamp處理高度；原reviewerresolved |
| 咖啡長凳、WC側牆無碰撞 | 真resolve與可見幾何重疊 | 共用配置；門前保留通行；原reviewerresolved |
| 1F WC初版本體鏡射 | native plan放大+戶外照片反證 | 通道改店面側x-21.3，白滑門在湖側，男女入口後置；前廊連續resolve通過 |
| WC凹間缺端牆 | 從(-21.3,1.6,-16)斜看男入口，50m無命中，透到草地 | 校準同ray後補共用端牆；真模型命中；原reviewerresolved |
| WC入口轉折牆無碰撞 | 男／女(-23,0,z)肩部重疊 | 共用TURN_WALLS，resolve推到-22.81；原reviewerresolved |
| 咖啡雙門移到錯誤側面 | Tina06/07同一轉角前／回望 | 改湖面長立面緊鄰轉角，窗下長凳避開門；回歸通過 |
| 小尚品變成通用白矮牆店面 | Fooday10/11玻璃低到地面、上方通風窗 | 改低窗/小窗/玻璃門/黑摺椅與菜單架；不虛構大招牌 |
| 前趴時頭沉水 | 原-.86基準，角色頭部高度與1.25rad前趴計算 | 改同既有泳池水下25cm=-.47；動態W划水畫面頭露水面，非只idle |

## 兩輪八項自評

截圖路徑為`.screenshots/dah-reality-r1-*`及`dah-reality-r2-*`，桌機1280×800、觸控375×812；第三方圖片只作研究。各站圖補近眼高構圖；站位為估算，非精確攝影配準。

| 項目 | r1 | r2／限制 |
|---|---|---|
| 層次 | 正常鏡頭yaw錯向、畫面未以店面為主；banner未退場 | 修取景朝咖啡、等banner退場；戶外店面與角色可辨，室內門／感恩牆可見 |
| 留白 | 咖啡窗後過空、岸線裸石圈 | 已補來源支持家具、梁燈、植栽；場景密度仍交獨立照片審查 |
| 字體 | 原HUD沿用，店面標示需查現況 | A1不虛構招牌，A2照菜單架；室內文字可讀但非原書法 |
| 配色 | 咖啡單色塊、水偏藍 | 程式木紋、褐色斑羽、水改照片綠；原toon保留，不替換全遊戲美術 |
| 對齊 | 門向/WC側向需修正 | 對照平面與照片修門窗、碰撞共用；尺寸仍估算 |
| 響應式 | 375無橫向捲動，HUD不溢出，touch搖桿可見 | r2同375×812；手機真進出／泳岸仍最終複驗 |
| 狀態 | 原載入／提示／進出流程沿用 | 無新增表單；房間重入不重建、進度不變，泳態進出清理 |
| 動效 | 新鴨慢速游動、既有泳姿；初版浮高太低 | 浮高已修；reduced-motion鴨固定姿態且隱尾流；專項程式審查如下 |

## 動效程式審查（review-animations）

| Before | After | Why |
|---|---|---|
| 無池中動物及尾流 | 純Three物件position/rotation慢速有界移動，使用絕對時間 | 回應使用者要水中鴨；不做UI轉場、不影響操作反應、不累積漂出岸線 |
| 減少動態時不應仍來回漂移 | media query即時讀matches，停在固定自然位置且隱尾流 | 用偏好降低環境移動；測試0/100秒位置一致 |
| 既有泳姿基準不匹配本區水面 | 只校正本區heightAt，沿用既有划水pose | 不另加鍵盤動畫延遲；離水／離房清理泳態 |

判定：鴨動畫程式範圍 **Approve**。只改3D物件變換，低幀率不積分漂移，reduced-motion有處理；非UI的環境游動不套UI300ms轉場上限。沒有變更全遊戲既有動效，不能據此宣稱全遊戲motion已審查。實機手機效能未量測，軟體WebGL不代表真手機FPS。

## 檢查紀錄／待完成

- `node --test scripts/dah-hsian-site-fidelity.test.mjs` 16/16，2026-10-22，同工作樹新增端牆／轉折牆後。
- `node scripts/dah-hsian-interior-smoke.mjs` PASS三行，log `/tmp/nccu100-reality-interior-flow.log`，室內路線/滑鼠仰視/手機/重入/原房間。
- `node scripts/dah-hsian-smoke.mjs` 初版完整PASS，log `/tmp/nccu100-reality-outdoor-flow.log`；此後1F WC位置與泳高已改，最終受影響流程須再跑。
- `npm run check`本輪通過；`npm test`本輪執行中，不能以局部結果代替全套。
- manualdetect新戶外六檔僅advisory尾流色，改共用COLORS.waterHighlight；無新增ignore，依技能不重跑。此前室內三檔[]。
- fresh獨立視覺審查與最終fix/recapture進行中。WC1圖仍端牆修前，不作最終畫面通過證據。
- 待驗證風險：A1最新裝修/完整門牌、照片無法證實的房內設備、估算尺寸與植栽細節。保留未驗證，不用通用道具假稱還原。


## 獨立視覺審查修正批次（待同檔複核）

fresh reviewer `impeccable_finish_reality` 的 disposition 為 fix，限定七項：門外2F門廊、咖啡圓角窗/細腳凳、曲線抬高廊坪/踏階、野餐桌細黑開架、停車層直柵、中庭灰折板/狹長採光、WC補牆後重取。均已以程式幾何實作；新增行為逐項先紅後綠。site-fidelity21項、interior29項通過。獨立程式複核新批次無新P2；另外指出緩坡法線依賴雙面材質，已補向上法線回歸先紅後修。最終圖與操作複驗仍進行中，不能填ship或正式發布。

抬高廊坪修改時，既有游泳測試抓到無廊坪處的預設0被錯當支撐，已改只疊加有效廊坪高度，泳態回歸通過；這不是用測試成功掩蓋畫面差異。小尚品低窗斷言量窗底相對地坪的距離，抬高整區後仍維持原低處透明契約。


### 修正批次補驗

- 重取WC同角度時仍見入口底部草地，確認是凹間地板沒有接到內封牆。另加向下射線回歸先紅、補連續地板與同高度支撐後綠；site-fidelity增至22項。這是原第7項的未完整修復，不增新美術範圍。
- 全套首次執行有兩個舊「所有1F高度必為0」斷言失敗，原因是照片支持的廊坪現為.3、外踏階.15。保持「不可吸上2F」契約，橋口按共享廊坪高度核對，指定店前點明確期待.3；廊坪之外仍嚴格0／小屋.4。rebuild21/21重新通過。
- CI沿既有preview加入真戶外游泳／廁所路線，和原2F實際進出共同驗證；未新增服務。
- documenter限定複核建議同步DESIGN水面亮紋為COLORS.waterHighlight #bdc7a7，PRODUCT補已核可1F公共外觀／游泳／鴨群，已更新；原toon/HUD與字體不變。


## 限定審查最終結論

- 原視覺reviewer Verdict Pass：**disposition: ship**；原七項均resolved，最新同檔WC圖的草地缺口已消失。僅七項視覺判定，不構成全區實景認證或操作通過。
- 原程式reviewer末次限定複核：ramp單面向上可命中、WC地板3個點與支撐同為.3、舊rebuild契約仍嚴格；site22+rebuild21共43/43，自行實跑，未新增P2。
- documenter最後確認No changes：DESIGN與PRODUCT已同步；WC補地板沿用既有shopFloor與LAKESIDE_Y，不新增系統。既有缺.impeccable/design.json保留，不冒稱已具備。
- 此前全套npm test為261通過+1 opt-in browser略過、baozhong80/80、npc9/9；最後WC補地板後正在重跑exact全套，不能混用舊結果為最新全部通過。


### 最後模型全測與戶外真流程

Node24.15、Three0.149、工作差異含最後WC連續地板：`npm test` exec15114 exit0，`/tmp/nccu100-reality-tests-final-exact.log`為263項中262通過、1項opt-in browser略過；其後baozhong80/80、npc9/9。原始結果保留真退出碼，未用tail狀態當測試結果。最後戶外`node scripts/dah-hsian-smoke.mjs`實際鍵盤／觸控泳岸往返、正確WC前廊、橋上橋下、重入、進度、正常網址及手機畫面PASS；`/tmp/nccu100-reality-outdoor-final.log`。2F最終流程與整合main測試仍進行中。


### 整合既有main後

達賢f4c48c0無衝突整合origin/main dccf640，保留其他作者四維牌樓與包種小遊戲；版本暫沿1.66避免與open PR84的1.67衝號。`npm test` exec60899 exit0：node271通過/1略過、baozhong80、npc9、stage2 24通過/1略過（新增遠端既有script）；原始log `/tmp/nccu100-reality-integrated-tests.log`。check pass，build成功outDir `/tmp/nccu100-reality-integrated-dist`，避免覆換正在驗真的5187產物。最後2F真鍵盤路線及原拖曳仰視已PASS，觸控後段仍執行中；之後只有文件變動。這些是整合分支證據，不冒稱main合併或正式部署已完成。


## 主線與正式站證據（版本標示收尾）

- PR85全場CI39716370486 **success**：含原全場冒煙與新增達賢戶外真流程/2F鍵盤手機。
- main968ba5d含PR84+PR85，本機metadata v1.68：npm test271通過/1略過、baozhong80、npc9、stage2 29通過/1略過；check/build通過。三個版本檔之外產品程式沒有後續修改。
- 正式v1.67核心verify-release exec75377 exit0：鍵盤/觸控E入館出館平台、前廊、泳岸、鴨群、進度/寬度、console/pageerror PASS；log /tmp/nccu100-dah-live-v167.log。程式資產index-Cdlq7Eea.js與本機v1.68 build逐byte相同，SHA256 0374d03a318f705abdbc3b7faf0f978f8405f5918028c33cf7553ec0b2386668。驗收方法先以已知v1.64正例及v0.00錯版本負例校準（各exit0/1），TLS使用既有curl，未繞過憑證。
- v1.68 metadata正式部署後仍需核對Pages exactSHA、標示與核心流程；main968ba5d CI尚在執行，不能以PR CI代稱最新main CI。


## 正式v1.68核心驗收

Pages39717983946 success且headSha=09cbc86640d7715f1c898a1b582d6c349ae45deb，遠端main含此提交，原網址HTML v1.68。`verify-release.mjs` exec72955 exit0，/tmp/nccu100-dah-live-v168.log：鍵盤/觸控E入館→出館同門4m平台、1F前廊、泳岸往返、鴨群、進度/寬度、console/pageerror皆PASS。1280×800與375×812正式截圖已讀圖確認，.screenshots/dah-release-desktop/mobile.png。程式資產逐byte比對如上；最後只文件紀錄，產品產物不變。

PR85完整全場CI通過；整合main968ba5d CI39716505402及metadata09cbc86 CI39717983852於本紀錄時仍進行，並未填通過。這不擴大獨立視覺七項的判定範圍，也不消除A1／測繪限制。後續檢查狀態由原PR/GitHub run連結查詢。
