# 包種活動 NPC 服裝

## 範圍與隔離

以 PR #73 的 8a534246 快照起始，保留活動看板／地圖生命週期修正，現已同步至 PR #73 合併後的 main 849a9537a335d5ff0dd3a3458a9fa66a5653fa5e，包含最新一般 smoke 斷言。NPC 批次版本為 v1.59。服裝僅改活動 23 位 NPC 外觀，不改角色碰撞、校園 NPC 造型、對話與問答資料、帳篷及小物。整合版另含活動期間暫停獅子／傳教士劇情的修正：共用 `src/actors/npc.js` 僅新增可選 `pauseWhen` 守門，由傳教士與追傘警察使用，不含服裝邏輯。正式掛載只在 `venueNPC()` 中；活動反覆開關不重新建立服裝。

- 商院 D11–D18 與 C03：沿用既有西裝選項，共九位。
- 法院 D31 與 C06：深色法官袍與英式捲髮假髮，共兩位。這是指定英式造型，不代表臺灣法官制服。
- 中文 D01：長袍馬褂。新聞 D19：記者背心與左手麥克風。廣電 D21：攝影工作者與背負器材。資科 D37：左手筆電。
- 外語 D23–D30：八套下列明確文化服裝。C05 外語關主維持原貌，避免任意選一文化代表整院。

服裝以既有 rig、head、肩膀為掛點，不刪除原四肢或臉部。手持姿勢僅用 NPC 個別 after，串接原 callback，移動、恐慌及追逐保留原動畫；右手不覆寫，保留雨傘。

## 外語文化選擇

多語系單一 NPC 只能選一套明確代表，並非宣稱同一地區只有該服飾；不混搭不同國家配件。

- D23 英文：英格蘭伊麗莎白時代戲劇服，doublet、皺領及長襪，呼應既有莎士比亞與畢業公演內容。參考：[Shakespeare’s Globe](https://www.shakespearesglobe.com/whats-on/elizabethan-costume-demonstration/)。
- D24 阿文：巴勒斯坦 thob 刺繡長裙。參考：[UNESCO](https://ich.unesco.org/en/RL/art-of-embroidery-in-palestine-practices-skills-knowledge-and-rituals-01722)。圖樣僅卡通化幾何裝飾，不宣稱特定村落或婚姻身分。
- D25 斯拉夫：俄羅斯 sarafan 搭襯衫，依本攤俄語主線選擇。參考：[Met](https://www.metmuseum.org/art/collection/search/159157)。
- D26 日文：女生和服，左襟覆右襟、obi、背結及盤髮。參考：[V&A](https://www.vam.ac.uk/articles/kimono)。
- D27 韓文：jeogori 短上衣、chima 長裙與衣帶。參考：[韓國觀光公社](https://english.visitkorea.or.kr/svc/contents/contentsView.do?menuSn=219&page=1&sContsTtl=&sort=regDt&vcontsId=231314)。
- D28 土文：土耳其鄂圖曼 entari 前開袍與 şalvar 寬褲。參考：[Met](https://www.metmuseum.org/art/collection/search/451160)。
- D29 歐語：西班牙安達魯西亞 flamenco 節慶裙，選西文組代表，不混德法服飾。參考：[西班牙觀光局](https://www.spain.info/en/calendar/april-fair/)。
- D30 東南亞：越南 áo dài 搭長褲，選越文組代表，不混泰國或印尼配件。參考：[越南觀光局](https://vietnam.travel/node/1216)。

## 驗證方式

`npm run test:npc-costumes` 驗證精確 23 個 ID、九套原生西裝、未指定 NPC 零變更、原骨架與互動物件引用不變、唯一掛載、有限幾何、面數與範圍、手持姿勢不覆寫恐慌／移動／雨傘，以及原 callback 串接。這些是合成同尺寸 rig 的 Node 幾何驗證，不代替實際遊戲動畫與截圖檢查。

可用 `NPC_COSTUME_METRICS=docs/baozhong/npc-costume-metrics.json npm run test:npc-costumes` 產生包含描邊的新增模型統計。西裝原有 look 選項建模的面數不在新增 overlay 統計中。

本機 Chromium 啟動被執行環境阻擋，因此不宣稱遊戲近景、手機、穿模、雨天或實景視覺驗收已通過。瀏覽器就緒後用 `npm run dev -- --host 127.0.0.1` 開啟 `?debug`，從原遊戲參加活動；需核對近景、側背面及一般遊戲視角。目前準備提交草稿 PR，沿用既有 CI 擷取真遊戲畫面；未合併或部署。

## 本地驗證結果

- `npm run check`、`npm test`（181 個一般測試、80 個包種測試、6 個服裝測試，共 267 項）、`npm run build` 通過。
- 看板生命週期、活動地圖、場景接線、原小物與服裝共 15 個相關專測通過。原看板／地圖初始關閉、入場啟用與離場關閉接線保留。
- 新增 overlay 合計 474 個 meshes、21,440 個三角形，均含描邊；不含原生西裝及原始 NPC。未量測實際 render calls 或手機 FPS。
- 建置仍有既有主 bundle 超過 1,500 kB 的提醒，沒有建置失敗。

## 美術規範第十三節

1. 材質：已核。只使用注入的 toon、共用 OUT；沒有外部圖片。
2. 顏色：已核色碼。用專案相近卡通色，最深色非純黑；實景明暗未核。
3. 描邊：已核。共用 OUT，依最小尺寸限制厚度。
4. 造型：已核結構與分段。以寬袖、腰帶、裙型、假髮、器材輪廓區分；最終辨識度未核。
5. 貼圖與文字：已核。本批不新增貼圖或文字材質。
6. 燈光：已核。沒有新增光源。
7. 尺度：已核 Node 範圍、原掛點與有限座標；實際動畫穿模未核。
8. 效能：已核共享幾何／材質與新增面數；實際 render calls、FPS 未核。
9. 截圖：未核。瀏覽器環境阻擋，沒有生成或偽造遊戲截圖。
10. 檢查指令：已核。check、test、build 通過；smoke 需要瀏覽器，本環境無法完成。

## 整合：活動期間暫停校園劇情

同一 v1.59 候選包含獅子／傳教士暫停修正。以正式 `state.flags.has('bz26_active')` 判斷，包含載入活動中的存檔；不永久改掉劇情觸發條件。傳教士 timer 不在活動期間提前消耗首次遭遇旗標；已開始的追逐、onCatch、冷卻及雨傘／警察延遲保留，離場繼續。

一般雨滴、天色及既有環境視覺持續更新；獅子動作、雨傷害、雨剩餘時間及後續校園劇情工作在活動期間暫停。`pauseWhen` 只交給傳教士與原追傘警察，活動 NPC 不使用它。`scripts/festival-story-pause.test.mjs` 以 7 個 Node 回歸測試覆蓋時鐘、存檔旗標、真傳教士 timer、真天氣 frame、追逐 callback 與獅子動作恢復。
