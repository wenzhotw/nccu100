# 達賢視覺與層退中庭驗收紀錄

## 最新正式站證據（2026-10-22 23:33；以下為過程紀錄）

- 已發布v1.75：Pages39803805924 success exact79aba372c8bcb09423e6a55c7d32a0ed83124838。PR95由wenzhotw合併，另保留PR96；非代理CLI自行合併。原網址 https://wenzhotw.github.io/nccu100/?area=dah-hsian 。
- 線上真鍵盤2F→8F→2F、7F書牆開口與後方公共走廊往返PASS（/tmp/nccu100-visual-live-atrium.log）。線上三時段/自動日夜/跨房/鍵盤按鈕/減少動態恢復/手機上下梯PASS（/tmp/nccu100-visual-live-clock.log）。
- 線上v1.75桌機及真手機context：E入出2F同門平台、1F前廊（鍵盤）、泳岸、鴨群、進度、寬度與console/pageerror PASS（/tmp/nccu100-visual-live-release.log）。1280×800/375×812正式截圖已實讀；過場banner圖僅當流程證據，視覺評分沿用兩輪已核可清晰圖。
- 主程式index-D-v9UGny.js與79aba本機build SHA256一致：070ab60d942b9da1fddbd4c9b3eb29690c5fe5cefe6fd47c6fbf2ca6b1f6c4dc；check/build成功。15c1 main全套Node332/skip1、portable80、npc9、stage2 45/skip1通過；79aba main全套同樣Node332/skip1、portable80、npc9、stage2 45/skip1成功，/tmp/nccu100-visual-main-79aba-tests.log；計數取各runner結尾摘要，無失敗。
- 最新遠端main CI39803805588/feature39803596921/booth39803596922仍進行，不宣稱全綠。舊a2bb CI39803766651的手機頁30秒goto逾時，79aba已含另一作者120秒修正；不是達賢通道斷言失敗。來源與空間限制維持下文，不宣稱測繪或完整周邊房間。


範圍：原戶外/2F視覺升級，後追加使用者提供中庭高處照片與其他樓層；公開層退平台/斜梯，高處站位，不聲稱周邊教室與研究室已完整還原。主方案為本區獨立卡通材料、單主投影光+有限非投影局部燈、共享慢速時間；不新增依賴，不改主校園雨劇情或存檔。

## 來源與限制
來源索引 visual-atmosphere-sources.json；official101–103灰色仿木紋清水模、官方競賽01/02內部燈帶、07/11冷天光暖夜燈、official floor plans3/4/5/7/8、official floor-space01–06研究室/共享/視聽。15張競賽照片+6張官方空間照片都已讀contact sheet，夜07/11及內02放大讀圖。使用者994×1492原照僅本機研究。3MF有2026館方公告；4MF有校方課程影音館藏定位；6F無單獨平面，層高/退縮數值為照片估算，不是測繪。未擅稱所有樓層房間現況皆完全符合。

## 已證實與修復
- 獨立程式審查2P1：共邊平台各自內縮造成不通；樓下跳躍誤被D梯X校正。先紅→修復→綠，原reviewer限項全resolved。驗證見.git/sdd/visual-code-review.md（本機）。後續擴充仍需最後整合審查。
- 真瀏覽器發現世界座標紋理GLSL前處理沒有換行，compile失敗。新增回歸失敗，補newline通過；待同新build真瀏覽器確認不可把Node測試當編譯成功。
- 真鍵盤發現第一階前卡住，新增角色半徑跨平台進斜梯回歸，修梯口容許範圍。真流程需重跑。
- 上層夜燈由實際Mesh/InstancedMesh變換取得，有限點光照附近桌面；不能只有emissive亮窗。daylight5cases通過。
- 南側柱原被設7.4深牆片擋俯視，Node真幾何回歸先紅，改柱深.6後綠。

## 測試證據（暫非完成）
各檔：daylight5、materials5、atmosphere3、timecontrol2、interior29；navigation最新9個需查原log。全套尚未跑。check/build多次通過但不能代表真流程；目前preview5195。
軟體GPU模式曾timeout；Metal模式成功入館與取圖，無真機效能保證。第一次smoke被使用者中斷；第二次server拒連；第三次softwareGPUtimeout。均不記PASS。真鍵盤route持續驗收中。

## 待交付關卡
- 最終shader compile/時段切換/跨房間/手機touch/減少動態真流程；鍵盤與手機上下樓、出口2F與原游泳回歸。
- 兩輪1280×800/375×812＋八項自評；來源站位/三時段額外對照；fresh獨立視覺review、修復與限項複核、documenter。
- 動效審查與一次手動機械detector所有回報分類。
- 九欄產品理解交付、全套test/check/build、final code review、main全套、既有Pages exactSHA及正式核心驗收。

## QA角度
玩家：真鍵盤/手機可用時段、上下樓與原出入口/游泳；建築視角：灰色遮陽板、層退/玻璃/書牆/柱梯與同站位角度；無障礙：focus、原生按鈕鍵盤不觸發跳躍、375寬與live reduced motion。AI多角度審查，非真人專家認證。此變更無登入/付費/個資/對外輸入，未加攻擊模擬；不宣稱全案資安通過。

## 第一輪自評（已讀1280×800/375×812）
| 項目 | 結果與處理 |
|---|---|
| 層次 | 不合格：桌機區域banner尚在，截圖不能清楚評主要中庭。修capture先等更新再等淡出。 |
| 留白 | 場景深度可辨，但近側樓板佔畫面多，站位靠欄杆0.6m重取，同源姿態仍在可走區。 |
| 字體 | 沿用既有Noto Sans TC與圓體，沒有新增字體系統。 |
| 配色 | 不合格：夜晚桌面與書牆太冷暗，只有燈帶亮。增加低成本桌面暖光與近距真燈，降低玻璃白霧感。 |
| 對齊 | HUD沿既有左/右兩欄，時段chip左邊對齊。 |
| 響應式 | 寬度無橫溢，但第一輪只改viewport、仍顯示鍵盤提示，不能當觸控驗收；第二輪用hasTouch/isMobile真正context。 |
| 狀態 | 新按鈕使用原生focus/active及細指標hover，Node鍵盤隔離2pass；真鍵盤/觸控待最終smoke。 |
| 動效 | 水/葉/尾流absolute time且Node減少動態通過，第一輪靜態圖不能證明實際時間節奏；另做真環境模式。 |

- 第一輪實景對照補圖：platform-afternoon/cafe-afternoon/lake-afternoon/dusk/night、atrium-night、upper-dusk/night/gameplay。灰色遮陽板/源頭空間關係保留；夜暖光不足已列同一修復批次。
- 第一輪後真鍵盤上樓已成功到最上層，log /tmp/nccu100-visual-upper-route.log，逐層assert高度；尚未全程下樓/手機。後續顏色/光斑不改導航尺寸。

## 第二輪自評（最終自檢輪，之後交獨立審查）
| 項目 | 結果 |
|---|---|
| 層次 | 桌機banner淡出，中庭層退與挑空為主；近側實體樓板仍佔部分視野，符合站位但交獨立照片對照判斷。 |
| 留白 | 場景以真實空間/步道寬度為準；HUD周圍留空不壓主視野。 |
| 字體 | 沿既有圓體/繁體中文，未改品牌。 |
| 配色 | 混凝土灰/木暖褐/玻璃藍綠分工；夜晚遠桌暖光已可見，整體偏冷是否足夠震撼交獨立審查；湖水與草地相近，列待核。 |
| 對齊 | HUD與時段chip左右邊緣一致，原mini位置保留。 |
| 響應式 | 真isMobile/hasTouch context375×812，stick:block，scrollWidth<=innerWidth。 |
| 狀態 | focus/active/hover按既有tokens；鍵盤、觸控時段及上下樓真smoke進行中，未記pass。 |
| 動效 | 有水光紋/葉擺/尾流，live減少動態Node確認；真瀏覽器與動效review仍需最終結果。 |

第二輪 .screenshots/dah-visual-r2-desktop.png /mobile.png實讀，額外照片站位platform/cafe/lake-afternoon/dusk/night、atrium-night/upper-dusk/night/gameplay；contact sheet也讀。後續只處理fresh reviewer列的修復/重取，無第三輪自行找新瑕疵。水面配色辨識與上層夜暖光列原觀察，不自證全pass。

## 獨立審查修復批次與新增使用者桌島指正
- fresh視覺review原11張有效，disposition fix六項。書架木框加深/樓板帶減厚/桌島留間隔；局部暖木與桌面光、暗背板不發光；中性夜填光/有限真暖燈；水底冷深藍綠+掠射天空反光；午後欄影方向改落平台內、降低填光；高層近身站立鏡頭；PRODUCT/DESIGN同步。仍待同reviewer限項複核，不自證ship。
- 使用者指出方向與排列仍錯。照片+官方5F/7F確認：白隔板朝書牆、垂直欄杆，兩側座位相對。原錯後擋板與隔層任意錯開已移除，桌島/椅子/燈/碰撞同步轉向，東北角不重疊。navigation12/interior30focused PASS；實際連續行走仍需最終smoke。
- 真手機下樓曾因重力高度滯後被拉回，實際物理步進紅→綠後visual-smoke完整PASS（/tmp/nccu100-visual-smoke-final.log）；本次後續幾何變更重跑而非沿用舊pass。
- 程式GLSL已在前次Metal真smoke無compile/pageerror證明修復。不是只Node。focused目前daylight7/materials7/atmosphere4/timecontrol2/navigation12/interior30；全套未跑。
- manualdetector只執行一次，2項#ffd28e/#313c46是核可閱讀暖光/接觸暗部，已集中DAH_LIGHT_COLORS、DESIGN記用途，未新增ignore。fresh documenter fallback完成兩文件，原astra失敗不記pass；sidecar既有缺漏未擅修。

## 最新使用者轉角修正與獨立結果
- 使用者18:37截圖指出轉角交叉欄杆與後區出口。補讀May近距DSC01325/01292/01391/01375/01378與館方書房近照，來源/日期限制/SHA在sourceledger.corner_correction；不是只參照同一張遠照。
- 欄杆誤延伸入另一翼平台，已真ray正例校準並紅→綠；主3/4/5/7/8F端部出口、後區公共走廊實體地板與細門框，MF/6F不複製後區。原導航聯集保持通行，可見樓板分割避免共面重疊。四人桌島與角落通路同源阻擋。
- 真鍵盤2F連續上8F再下2F、7F閱讀區穿書牆開口進出後廊PASS（/tmp/nccu100-visual-atrium-corner-final.log）。此前失敗是新桌椅梯口與柱子阻擋，均記錄並修復/重新跑成功，沒把timeout當pass。
- freshcode所有2P2+P3resolved；最新navigation20pass，interior30/daylight8。原visual六項resolved，R1局部夜泛黃修成下層range11/intensity1.55上層不變；原reviewer重讀同路徑與新corner-exit圖disposition ship，限項非測繪保證。documenter已同步最新公共後廊與桌位，missing sidecar未擅修。
- 動效源碼review表格與Approve記錄在ignored motion-review.md；最終瀏覽器live減少動態/恢復正重跑。不聲稱真機FPS。
- 首次全suite PASS node308/skip1、portable80、npc9、stage2 29/skip1；後追加轉角與門框，最後全suite另跑不可混用。正式發布尚未。

## 最終本機實際證據
- exact產品源碼全套 npm test（/tmp/nccu100-visual-exact-full-tests.log）成功：Node313pass/1skip，portable80、npc9、stage2 29pass/1skip；後續只調整smoke測試前置條件與觀測，未改產品。check成功，標準build成功（/tmp/nccu100-visual-exact-build.log）。
- 戶外真鍵盤與手機泳岸/空橋/廁所前廊/重入/進度PASS，/tmp/nccu100-visual-outdoor-final.log。舊smoke直接在上岸側移後pos.set，保留vel慣性造成x偏.284；實際z已穿過廊坪並無隱形牆。兩次重現失敗有位置訊息，先等待.7simulation自然停止再設下一獨立站位，原斷言未放寬，重跑PASS。
- 2F真鍵盤公開路線、原滑鼠仰視、手機進出/重入/進度/舊館回校園PASS，/tmp/nccu100-visual-interior-final.log。
- visual-smoke原跨房/按鈕/減少動態/觸控上下樓PASS，新增時間連續檢查時獨立review先校準：夜間天空色可持平，改測normalized(sun-target)方向；平移目標不會誤判時鐘。固定預設先等下一個遊戲步進讓渲染更新，再取基準，不把按鈕文字立即更新當作材質已更新。最新增強smoke正重跑。
- 不新增高風險外部入口，安全範圍為本區狀態/輸入隔離、離館還原、進度不改。這是既有網站的區域視覺擴充，非首次發布/登入/付費/個資改動，未主動測第三方或宣稱全案資安認證。

## 遠端慢速渲染同步修正
PR95首次完整CI39772792191：npmtest/build/全站冒煙/戶外/2F均成功，但visual手機7F下6F在400牆鐘ms後高度未落穩失敗。保持20±.15原要求，釋放搖桿後改等.5simulation，新增不同dt重力回歸nav21通過；獨立真vel/resolve/gravity校準三步長均落至20，本機增強visualsmoke重跑PASS（/tmp/nccu100-visual-mobile-settle.log）。不改產品物理、不把遠端fail當pass；新CI仍待。booth桌機首次30min被workflow取消，手機success，需另記與重跑。
