# 2026-10-23 F01 D梯結構修復（最新，尚未發布）

- 使用者「好」，沿已核可查核順序修現有2F→3F D梯，不再批准同範圍。原NCCU100 checkout，branch fix/dah-d-stair-opening，base80f17b2，開工乾淨。無同檔並行修改／新相依；未碰另一專案5090。
- 模型／通行共用梯段、洞口與三側護欄；3F樓板與2F窗邊天花分割，D梯踏面、連續踢面、扶手與立柱修正。獨立review找到上半段側穿越，先紅後修，原reviewer複查40條雙向側路＋快速上下往返通過，無剩餘阻擋項。報告.git/sdd/d-stair-f01-review.md。
- 新entry-stair8項，navigation21合跑29PASS，真實resolve／房間邊界／重力兩步長。紅綠logs /tmp/dah-d-stair-{red,green}-*.log；最終真邊界 /tmp/dah-d-stair-real-boundary.log。
- 兩輪各桌機1280×800、真手機375×812，鍵盤／觸控2F→3F鄰平台→2F皆PASS、errors空。普通鏡頭，r1手機遮擋多，r2改站位朝向；已實讀4圖。最終圖 .screenshots/d-stair-f01-20261023/round2-desktop.png、round2-mobile.png；/tmp/dah-d-stair-qa-round{1,2}.log；QA八項逐項記docs/reference/dah-hsian/d-stair-f01-qa-2026-10-23.md。單次detector=[]無ignore，無動效程式變更。
- 九欄產品教學與共用幾何→模型／導航→檢查架構已交付。只修F01交疊／穿越，D梯現況轉折與尺寸仍待照片校準；F02–F06未修，整館仍不通過還原驗收。不是實景完全還原／法規認證。
- version1.77；遠端PR97手機橫向已用1.76，未合併，不覆蓋其工作。check與標準build PASS；branch exact完整npmtest /tmp/dah-d-stair-branch-exact-tests.log exit0（Node340pass/1skip、portable80、npc9、stage2 45pass/1skip），直接讀各runner摘要；其後只有文件修改。upper Metal真鍵盤2F→8F→7F後廊→2F /tmp/dah-d-stair-upper-final.log PASS，舊直線穿側護欄的失敗原始結果保留，driver已改走上端入口，原斷言未放寬。
- 查到來源80f遠端CI39815578473既有upper長路段30秒逾時；尚不能斷言只有速度。driver保留原到達斷言，timeout120s與.5simulation settle經獨立限項複查通過。真software完整流程 /tmp/dah-d-stair-upper-software.log 正進行，已上3F，不拿未完成結果當PASS。未merge／push／deploy，不能宣稱上線。
- 下一步完成全套與真流程、版本標準build、main合併全測、push沿既有Pages並驗exactSHA與原網址真流程。原URL目前轉http://play.gaiacraft.tw，本輪未改網域。任何失敗先診斷不硬發布。

# 2026-10-23 室內品質否決後重新查核（最新，未修復）

- 使用者對整個新版室內品質不滿，核可先停止擴建／美化並重新核對。**撤回還原驗收合格／limited ship作為還原依據**；舊功能通過只保留其範圍，不能當實景正確。
- 本輪只做研究與查核文件，遊戲source/玩法/版本無變；workspace main aa7b1b6，開工乾淨，origin/main同SHA。報告 docs/reference/dah-hsian/fidelity-audit-2026-10-23.md，來源ledger同名-sources.json；已區分6項確定缺陷／驗收缺口與待驗證事項，列各主樓層站位與TDD修正順序。
- 最重要F01：2F→3F D梯被連續3F樓板蓋住，導航中點y2.25，上方真模型ray擊中y4.5樓板；單位box命中/外部不命中先校準。raw/script .references/dah-hsian/fidelity-audit-20261023/{stair-slab-evidence.json,check-stair.mjs}。F02任意T短後廊不等同5/7F長廊，F03缺斜向公共交通區，F04上層椅無腳，F05展示地毯斜界/圖形缺漏，F06站位索引gamePoseMatched:false及既有高度測試未驗洞口。
- 六張館方2/3/4/5/7/8F平面重新取得並實讀，SHA均同前存原檔；取回日期不等於圖面修訂日。2018年報是歷史規劃，不能拿搜尋收錄時間當新現況。館方環景實際操作達賢→2樓→大廳並看見照片；初始black不算。感恩牆精確位置、層高／MF對應、8F平台、玻璃門／各層廁所仍待校準，不再憑印象說對／錯。
- 正式觀察從原GitHubURL轉至 http://play.gaiacraft.tw/?debug&area=dah-hsian，v1.75／index-D-v9UGny.js。本輪未改網域。新七個1280×800檢查鏡頭 .screenshots/dah-fidelity-20261023/，已實讀；capture.js明列估計站位，**沒有冒稱實景對位**。首張3f-stairs朝地板無效；後重取d-stair-lower。標題淡出以computed opacity=0確認。僅favicon404，未進行安全攻擊。
- 已交付教學：來源→校準→幾何/可走範圍→分類；推薦逐層重建骨架，備案只補家具不足；無新依賴/付費/資料變更。未做場景修復，所以沒有新UI兩輪或產品全測／新上線成果，不能說完成還原。現有src/scripts/package/config與前全測79aba相同，純查核文件不拿舊綠燈掩蓋本次F01。
- 下一步依報告先固定柱網／層與夾層關係，對D梯洞口做單一紅→最小修復→綠，再逐層動線；不得直接在模板樓層上繼續美化。原使用者已授權實景重建，不需要再次批准已核可範圍。此輪無同檔並行修改。

# 2026-10-22 23:33 正式站驗收（本輪最新；以下舊段為歷史）

- PR95由wenzhotw於15:19:35 UTC合併為a2bb594，隨後PR96合併為79aba372c8bcb09423e6a55c7d32a0ed83124838；不是本輪CLI執行merge。工作區已乾淨fast-forward至該main，保留他人安全防護修改。正式Pages39803805924成功且headSha一致，原網址 https://wenzhotw.github.io/nccu100/?area=dah-hsian 為v1.75。
- 正式index-D-v9UGny.js與本機79aba標準build逐byte SHA256相同（070ab60d942b9da1fddbd4c9b3eb29690c5fe5cefe6fd47c6fbf2ca6b1f6c4dc）；先前已知輸入校準有效，不只看HTTP或部署狀態。
- 正式真鍵盤2F→8F→2F與7F轉角後廊往返PASS：/tmp/nccu100-visual-live-atrium.log。正式三時段/自動連續/跨房/減少動態恢復/真touch上下梯PASS：/tmp/nccu100-visual-live-clock.log。正式v1.75桌機與手機E進出回同2F平台、泳岸、鴨群、進度及寬度/console/pageerror PASS：/tmp/nccu100-visual-live-release.log；1280×800與375×812截圖已實讀。舊戶外/2F全流程本機證據仍有效。
- 15c1本機main全npm test成功：Node332pass/1skip、portable80、npc9、stage2 45pass/1skip（/tmp/nccu100-visual-main-final-tests.log）。79aba main全套亦成功 /tmp/nccu100-visual-main-79aba-tests.log：Node332pass/1skip、portable80、npc9、stage2 45pass/1skip；check/build成功。計數直接讀各runner結尾摘要。
- 遠端合併a2bb的39803766651失敗於整站smoke手機goto預設30秒，未到達賢專用步驟；現79aba已含PR96將該goto設120秒的修正。最新main CI39803805588、feature CI39803596921、booth39803596922仍進行；不宣稱all green。前feature774全站smoke通過但當時visual手機settle失敗，修法/新回歸見下文，未忽略。
- 本輪限制：尺寸/層高為照片估算；只完成公開中庭平台與可查證主樓層後廊，MF/6F後區無獨立平面，周邊房間未完整建置。未宣稱全區完全實景或真機FPS。視覺/程式/文件獨立審查已限項通過，兩輪自評與動效驗收已完成，九欄教學已交付。
- 下一步：本機全套已通過；追蹤遠端最新結果。此次只提交驗收文件更新，推送沿既有Pages追蹤新SHA/同產物，不新增站、不重複手動部署。若遠端失敗，先診斷不硬稱完成。現無未解產品缺陷；不擴作周邊房間。

# CI容量設定補充（最新）
- boothdesktop舊run不是業務斷言失敗：log確認11:51開始browserpreview，12:12已驗完37攤，12:14被workflow總30min取消；其餘重載/篩選仍未跑完。保留全部驗收，僅既有workflow上限30→45min，不加新服務/依賴、不弱化斷言。Mobile舊run成功。此設定與手機simulation同步修復一起新CI驗證。
# 2026-10-22 遠端CI失敗修正（最新，未發布）
- PR95仍OPEN，正式未部署。branch/main都曾在7744037，本機main全套PASS（Node331/skip1、portable80、npc9、stage2 45/skip1）、check/buildpass。遠端check39772792191在全test/build/全站冒煙/戶外/2F均success後，visual手機7F下6F高度assertfail。沒有忽略或合併。
- 原touchWalk釋放後等400牆鐘ms，慢速softwareGPU不能保證重力落地。改等.5simulation，同高度20±.15不變，新增實際dt1/60與.05回歸，nav21pass；獨立review用真vel/resolve/gravity校準三步長通過，無product修改。最新本機visualsmoke PASS /tmp/nccu100-visual-mobile-settle.log，preview5195已重啟exec78066（原server因會話中斷消失，第一次重跑拒連不當PASS）。
- 現branch feat/dah-hsian-visual-atmosphere，僅navtest與visualsmoke待提交；下一步commit/push觸發新CI、保留原完整全站已過證據但新CI仍需pass。boothdesktop39772792135因30分鐘workflow取消，mobilepass，非達賢product缺陷；需重跑/查準原因，不說allgreen。
- 上線政策仍自動main全套/push/既有Pages exactSHA+原網址真流程。不得問再次批准/不帶failure發布。

# 主線整合與發布準備（最新）
- 本輪產品commit0f28d8c，已無衝突merge origin/main528f422，保留奶蛙/包種/山上校區等他人成果。最新visualclock真瀏覽器PASS /tmp/nccu100-visual-clock-runtime-final.log，含自動方向連續/固定午後穩定/live減少動態恢復、手機上下梯。
- branch全套exact PASS，戶外泳岸/2F/upper後區PASS，所有review已closed。現在整合全套/check/build，再升既有3版本標示為v1.75（最後remotev1.74/openPR空）；metadata不改玩法。尚未push/部署，不能把本機完成當正式上線。
# 最終發布前證據（最新）
- 產品source exact全npmtest PASS /tmp/nccu100-visual-exact-full-tests.log：Node313+skip1/portable80/npc9/stage2 29+skip1。check/buildpass，之後只smoke驗證碼小修。戶外真鍵盤+touch泳岸/前廊/空橋PASS /tmp/nccu100-visual-outdoor-final.log；2F路線/滑鼠仰視/手機進出PASS /tmp/nccu100-visual-interior-final.log；完整upper與7FrearPASS。
- 戶外smoke前次fail根因是設WC站位前保留上岸側移vel，兩次實際位置x偏.284但z通過；新增.7simulation idle在pos.set前，原斷言不放寬，Metal/CI預設software可選。visualsmoke增強時鐘真連續以sun-target方向校準，不看深夜平坦色；固定午後基準等下一幀。最新visualclockruntime exec20970尚待結果。
- 獨立code全部P2/P3/testfindingresolved、visualship僅指定項、doc同步；正式收尾仍未做。originmain528f422/v1.74，其他作者成果不得覆蓋。下一步完成visualsmoke→commit本輪→mergeoriginmain→main全套與既有CI/Pages部署/正式原址真流程，不需再批准。

# 2026-10-22 轉角出口修復驗收（最新，未發布）

- 使用者最新「繼續」，保留所有既有範圍。新增18:37截圖指正轉角交叉阻擋與後區出口；已正式列入plan/PRODUCT/sourceledger，原照保留ignoreduser-corner-obstruction.png。補讀May5張近距照片+館方書房近照、5/7官方平面，均<=1280實讀。
- 兩翼欄杆原誤延伸4.8m插入平台，已按挑空邊收口；主3/4/5/7/8F書牆端部開口與可走後廊、門框。MF/6F無獨立後區平面，不虛構整層房間。桌島改垂直欄杆中央隔板、兩側各兩席、成列；模型與阻擋一致。導航聯集/可見地板分割避免共面閃爍。
- focused最新navigation20、interior30、daylight8、materials7、atmosphere4、timecontrol2pass。freshwholebranchP2支柱/斜梯側跳全部resolved，後補P3細門框也resolved；原reviewer獨立真resolve+gravity。報告.git/sdd/visual-code-final-review.md。
- 真鍵盤完整2F→8F→2F及7F轉角後方公共走廊進出PASS，/tmp/nccu100-visual-atrium-corner-final.log exec35126。其後只細門框阻擋共享座標，中央routeNodepass；最終正式仍需相同核心真驗證。
- 獨立visual六項與R1夜泛黃/最新轉角全部resolved，disposition ship（僅限項，非完全實景），.references/dah-hsian/visual-atmosphere-20261022/visual-review-verdict-r1-corner.md。freshdocumenter兩次PRODUCT/DESIGN完成，sidecar既有缺漏未擅修。原圖same11r2已覆寫，新增corner-exit，root實讀主圖與夜/正常/開口；全尺寸有效，真mobile375×812。
- 九欄產品教學/3區塊架構已交付；動效review源碼Approve，live減少動態恢復正在最新visualsmoke驗證。第一次全套npmtest PASS：node308+1skip/baozhong80/npc9/stage2 29+1skip，/tmp/nccu100-visual-full-tests.log；其後轉角新功能與門框變更，最終全套exec55785尚進行，不能沿用前次當exactpass。check最新PASS；exactbuild成功，preview5195。visualsmokeexec12273/log /tmp/nccu100-visual-smoke-exact.log進行中。
- 下一步只缺最新visual/舊戶外泳岸/2Fsmokes、最終全套、提交與整合遠端/主線全測/既有CI+Pages exactSHA原網址實際流程。originmain最後26d49a6/v1.73（又fetch中），最後openPR空；版本發布前再核對。所有本輪未commit/push，不得說上線。共享3D一次只開一個自己的瀏覽器；未動他人session。

# 2026-10-22 視覺升級與上層中庭：本輪狀態（最新，未發布）

- 工作區 NCCU100，branch feat/dah-hsian-visual-atmosphere，base4ea23ac；所有本輪內容未提交。origin/main最後b74a41e/v1.71、openPR91使用v1.72，收尾重新fetch避免覆蓋他人或版本衝號。
- 使用者新增糾正「桌島方向跟排列不對」：已讀原994×1492照、官方contest02及5F/7F平面。先紅→綠，中央白隔板改垂直欄杆、座椅相對，桌島按同側書牆成列，移除無依據的隔層錯開；東北角保留走道。模型與阻擋共用atriumDesks；導航12/12、interior30/30當前通過。
- 獨立視覺review disposition fix，六項：建築層次/暖光/水面/午後投影/普通鏡頭/文件。已批次修，但尚待原reviewer限六項複核，不能宣稱完成。桌面轉向為最新使用者要求，併入item1驗收。
- materials7、daylight7、atmosphere4、timecontrol2已focused通過；上一次真visualsmoke PASS包含鍵盤按鈕不跳、共享時間、reducedmotion、手機D梯上下/7F下6F、無shader錯誤。其後模型/燈/鏡頭變更需重跑。新tracked atrium-smoke完整上8F再下2F尚未跑。
- 最新build成功；preview5195既有exec90478。own CLI dah-visual-metal於aboutblank或取圖；只關本session。capture exec32864進行（同11個r2檔覆寫，latest桌島方向），log /tmp/nccu100-visual-review-fixes-capture.log；完後讀圖/交原dah_visual_finish_review。
- 兩輪桌機1280×800/手機375×812自評已完成，之後只處理獨立六項與使用者桌島指正，不開第三輪自行找瑕疵。最終圖.screenshots/dah-visual-r2-{desktop,mobile,upper-night,upper-dusk,upper-gameplay,platform-afternoon,cafe-afternoon,lake-afternoon,lake-dusk,lake-night,atrium-night}.png。
- fresh documenter astra遇servicequota未做；fallback fresh gpt6.1-sol已完成PRODUCT/DESIGN，保留原系統/記錄公共3–8F/材料與燈色，missing sidecar屬既有漂移未擅修。六項reviewer可用，等ready。仍需最後wholebranch code+motionreview。
- 一次manualdetector只2項deskGlow/contact色提示，已集中DAH_LIGHT_COLORS並由DESIGN記實際用途；無ignore/無重跑。技術/視覺均不可把未跑當pass。
- 仍需：最新實際smokes（舊戶外泳岸/2F/新visual/完整upper）、九欄產品教學、全套test/check/build、commit/整合最新main保留他人、main全套、PR與既有CI/Pages exactSHA/原網址正式核心驗收。未上線，本輪不因服務quota省略必需關卡。

# 2026-10-22 新增中庭上層範圍（最新）

- 使用者附994×1492實景照，要求達賢層退中庭漂亮震撼，明確允許開始其他樓層。保留進行中光影/材質/日夜/環境動態，不取消前範圍。
- 官方關於本館確認3–8F層退；官方plan3/4/5/7/8已下載ignored visual-atmosphere-20261022，3/5/8已實際讀圖。注意夾層，不能簡單把6F當完整平面層；原上層僅五層重複裝飾，需重新核對層退/階梯/高處俯視。
- 本輪局部已實作未全驗：daylight.js四項單檔通過（代理因額度失敗，root接手修陰影lightspace texelsnap）；materials.js四項、timecontrol兩項通過；atmosphere.js三項（最後尾流opacity紅→綠已修ducks.js）。map/interiormap/index接線與HUD chip、共享clock。第一版check/build通過，之後材質contact/wakes/CSS尚未重build。未commit/push/deploy，正式仍v1.68。
- visual-smoke最初被使用者打斷，原server/process停止，重跑因5195拒連失敗屬環境；已重啟preview5195 exec90478，最新smoke exec59356進行（需取結果）。不能當pass。前before照片front被相機位置角色擋住無效；after取圖需角色位置與固定view分開，不要複製錯誤。atriumbefore有banner也非正式對照。
- fresh代理dah_daylight_impl額度錯誤無report，SDD gate尚未通過；其餘任務root接手，後續獨立review若可用再嘗試，否則揭露實際限制。新兩輪視覺QA/獨立審查/全測/收尾皆未做。

# 2026-10-22 達賢視覺升級（最新核可，進行中）

- 使用者「這邊都要做」核可午後投影/接地暗部、卡通材料細分、午後/黃昏/夜晚與連續日夜、水波/鴨尾流/樹葉/遠景，全做戶外與2F。舊段「未核可」僅歷史，已被此次取代。
- branch feat/dah-hsian-visual-atmosphere，base4ea23ac9e61037c76bb92f038ffbab9e0fc940be，原工作區乾淨；沿現有checkout，不碰薪火專案。計畫docs/superpowers/plans/2026-10-22-dah-hsian-visual-atmosphere.md。
- 正式v1.68先前已驗收；最後文件Pages39718611243 success exact4ea23ac，產品產物同09cbc86。新視覺尚未實作，不得宣稱上線。
- 新官方101–103已讀圖確認正面灰色仿木紋清水模，現有brown louver需校正；官方夜圖繼續分類，原照片ignored不當貼圖。
- 根代理統籌接線/UI/瀏覽器/全測/發布；SDD獨立任務逐項含審查，檔案分工見計畫。新功能不可沿用舊視覺ship。

# 2026-10-22 達賢v1.68正式核心驗收（最新）

- 原網址 https://wenzhotw.github.io/nccu100/?area=dah-hsian 已v1.68；main09cbc86640d7715f1c898a1b582d6c349ae45deb已push且ls-remote確認。Pages39717983946 success，headSha完全相符。正式HTML引index-Cdlq7Eea.js，和本機最後main build逐byte相同。
- 最終正式核心verify-release exec72955 exit0，/tmp/nccu100-dah-live-v168.log：v1.68鍵盤/手機E進出同門2F平台、1F廁所前廊、泳岸往返、鴨群、進度/寬度，console/pageerror皆PASS。正式1280x800/375x812圖.screenshots/dah-release-desktop/mobile.png已實際讀圖確認，非只檢查部署狀態。
- 最後main全測/check/build通過（詳下節）；PR85完整CI39716370486 success。整合main968ba5d的CI39716505402與版本metadata commit09cbc86的CI39717983852仍跑；不能宣稱這兩次已通過，沒有已知失敗。最後產品程式自f4c48c0後未改，versionmetadata不改JS；獨立視覺7項resolved/limited ship，documenterNo changes。A1缺新裝修照、尺寸非測繪保留，未宣稱全區完全實景。
- 本輪最後僅補此交接/QA紀錄（不改產品產物）。推送此文件後追蹤其既有Pages，不另建或手動重觸發；產物與已驗1.68相同，可沿用核心真流程證據，仍核對新Pages SHA與原網址版本。
- 使用者新問場景質感：目前只研究與建議，未實作光影/日夜。已讀engine/kit/post/Dah mapLight/interiorLight與主校園environment/sky、weather。主校園已有漸層天空/移雲/跟隨角色的太陽投影；Dah固定光未castShadow，建議先午後陰影/接觸暗部/柔和色票與紋理/邊角，再午後-黃昏-夜晚三預設，後續共用世界時間。天氣視覺要與劇情雨/扣體力分層，不能擅自改遊戲規則。此建議尚未核可實作。

# 2026-10-22 達賢已上線、版本標示收尾（最新）

- PR85已合併968ba5d且完整CI39716370486 SUCCESS（含全場冒煙、達賢戶外泳岸、2F真鍵盤/手機）；不是只check/build。遠端main968ba5d的CI39716505402仍進行，暫勿說latest main CI已過。
- main968ba5d+本地v1.68 metadata全套 exec61696 exit0：node271pass/1skip、baozhong80、npc9、stage2 29pass/1skip，/tmp/nccu100-reality-main-tests.log；check與標準build均PASS，/tmp/nccu100-reality-main-{check,build}.log。沒有產品程式變更。
- 正式v1.67已跑ignored verify-release.mjs，exec75377 exit0，/tmp/nccu100-dah-live-v167.log：真鍵盤/手機E入館、出館同門2F平台、1F前廊、泳岸往返、鴨群、進度、寬度，無關鍵console/pageerror。與main v1.68 build程式檔 index-Cdlq7Eea.js逐byte一致（curl已下載JS至/tmp/nccu100-dah-live-index.js；SHA256以已知空輸入校準後兩檔相等0374d03a318f705abdbc3b7faf0f978f8405f5918028c33cf7553ec0b2386668）。版本差異只index/package metadata。
- 驗收helper正例v1.64 exit0，錯版本v0.00確實exit1(actualv1.64)，不會把舊頁認成新版本。Python urllib憑證失敗，改既有curl驗證，不關TLS/不安裝設定。正式圖.screenshots/dah-release-desktop/mobile已1280x800/375x812，尚需在最終1.68部署後重取/讀圖。
- 此次準備提交v1.68與QA/HANDOFF，不另建正式站；push前查遠端變動，追蹤新Pages exactSHA/HTML v1.68與same asset，再以helper跑最終1.68核心。原網址https://wenzhotw.github.io/nccu100/?area=dah-hsian。
- 使用者新問「陽光、日夜與不改畫風的材質配色」：已讀既有engine/kit/post/Dah lights與官方Three docs，只給建議，未核可/未實作新日夜系統。發現Dah DirectionalLight未castShadow，模型接影尚未普遍接線；主方案先午後投影/接地暗部/材料色，再午後/黃昏/夜晚預設，後續才連續世界時間；備案固定午後。不得擅改全遊戲光線或引新依賴。

# 2026-10-22 遠端已合併，主線驗收與版本辨識（最新）

- PR85 https://github.com/wenzhotw/nccu100/pull/85 已附聊天；遠端顯示wenzhotw於03:22:49 UTC合併為968ba5d（非本輪CLI執行合併），包括PR84 b335a7b之v1.67。Pages run39716505405已成功，遠端主線check39716505402仍進行；PR85 check39716370486亦仍進行全場冒煙。本輪不得把舊版本號判為不含達賢：正式HTML已v1.67/asset index-Cdlq7Eea.js，需用SHA/資產內容確認。
- 本機已clean switch main並ff到origin/main968ba5d，保留所有其他內容。因舊1.67同號發布，精確改3版本metadata為1.68（目前未commit/push）。main全套npm test exec61696在跑，log /tmp/nccu100-reality-main-tests.log；main check已PASS /tmp/nccu100-reality-main-check.log。無新產品程式修改，最終達賢模型等同f4c48c0及全套最終版。
- 最終2F fullflow exec19514 exit0，/tmp/nccu100-reality-interior-final.log三行PASS：真鍵盤公開路線、原拖曳仰視、手機進出/重入/進度/舊gym回校園。戶外最終同樣PASS。分支整合main dccf640全測/check/build也pass（見下節），但main現再含PR84需用此次全套。
- 為正式站核心驗收準備ignored helper .references/dah-hsian/survey-20261022/verify-release.mjs（讀package版本、真E入出2F、1F前廊、鍵盤/觸控泳岸、鴨群、進度/寬度/console、1280與375截圖）。正以既有5187 dist v1.64作已知正例校準，exec68240 /tmp/nccu100-dah-release-calibration.log；之後用錯版本驗證會失敗。此helper不發布。第一次試跑因return THREE object改boolean已終止7629，重跑才有效，不能把被終止結果當pass。
- 5187仍舊dist供校準，不可中途替換。校準完可標準build main v1.68；查遠端open PR版本再確認未衝號（上次[]），main全測/check/build pass後commit/push3版本metadata與最終QA/HANDOFF，追蹤該次Pages exactSHA/HTMLversion/asset。正式原網址要用helper真鍵盤/手機E與泳岸驗收、無關鍵console，並讀有效截圖。原PR/fullmain全場CI仍需追蹤不能宣稱已過。
- fresh視覺review限定七項resolved/disposition ship；documenter最後No changes；code最後43/43無新P2。source/audit/QA檔有A1無新照、非測繪等限制，不得宣稱全區完全現實。

# 2026-10-22 已整合分支、準備遠端CI（最新）

- 達賢實作commit f4c48c0，已無衝突merge origin/main dccf640（保留四維牌樓與包種新內容），目前版本暫沿1.66，不占別人open PR84的1.67；最終main發布前才升未用版本，避免3個版本檔衝突。
- 整合後 `npm test` exec60899 exit0，/tmp/nccu100-reality-integrated-tests.log：node271pass/1skip、baozhong80、npc9、stage2 24pass/1skip。`npm run check` pass，build exec30222 exit0，以--outDir /tmp/nccu100-reality-integrated-dist避免取代正跑真流程的5187舊dist。最後模型未變，達賢源碼等同全套最終版；之後只文件改動。
- 最終戶外真鍵盤/手機PASS；2F最終真鍵盤公開動線和原拖曳仰視也PASS，手機後段exec19514仍進行，/tmp/nccu100-reality-interior-final.log。
- fresh視覺七項全部resolved，limited ship；fresh doc No changes，code最後43/43無新P2；詳見reality-qa/audit。尚未正式發布。準備push本分支/PR附聊天，待既有CI全場與最終2Fflow，之後最新main整合、main全測、既有Pages exactSHA/正式核心流程。

# 2026-10-22 發布前驗收（最新）

- fresh視覺review七項fix已全部resolved，disposition ship，僅指定七項而非全實景認證。最後WC地板缺口補齊並同檔r2取圖，草地消失。fresh documenter最後No changes，DESIGN水亮紋/PRODUCT核可範圍已同步；不修既有missing sidecar。
- 最後模型版本全套npm test exec15114 exit0，/tmp/nccu100-reality-tests-final-exact.log：node262通過+1 opt-in略過、baozhong80、npc9。site22/rebuild21/interior29都含在全套。Node24.15，Three0.149，無新套件。check pass；build /tmp/nccu100-reality-build.log成功。之後僅文件/版本metadata處理，合併遠端後仍需全測。
- 最終戶外真鍵盤+觸控包括泳岸往返/WC正確前廊/上下橋/重入/進度/正常網址 PASS /tmp/nccu100-reality-outdoor-final.log。2F最終smoke exec19514後段正在進行 /tmp/nccu100-reality-interior-final.log。
- 遠端main dccf640 v1.66，open PR84已使用v1.67。為避免版本3檔merge衝突，本輪本機暫存1.64先精確還原base1.63，只提交達賢內容後整合main；最終升下一未用號（預期1.68，發布前再查）。不要覆蓋別人的包種內容。尚未commit/push/PR。
- 下一步2Fflow結果→提交達賢、整合origin/main→分支全測/check/build、push/PR attach+既有CI全場；最新main整合避免version衝突→main全測→push existingPages exactSHA與正式真核心流程。使用者已授權無需再問。

# 2026-10-22 續作差異快照（本節最新，尚未發布）

- 最新使用者「繼續」；沿原已授權實景重建，不重問批准。仍branch fix/dah-hsian-entrance-layout、base f232d8f，未commit/push；遠端main最後dccf640 v1.66，需保留他人內容整合再升版。
- fresh impeccable_finish_reality已成功回覆disposition fix，限7項：①室內望門外應2F鋪磚門廊/柱列/欄杆非草坪②咖啡大圓角窗與細腳凳③曲線抬高廊坪/踏階且高度一致④野餐桌細黑開架⑤停車通風直柵⑥中庭灰色折板主屋面/狹長採光⑦WC端牆/轉折牆修後同檔重取。以上均已實作，正取同檔r2後交原reviewer限7項複核，不能自行再開第三輪瑕疵狩獵。
- 各行為逐一紅綠：interior29/29，site-fidelity21/21。LAKESIDE_Y=.3，共用曲線deck及.15外踏階；店/WC/凳/候位椅/菜單/招牌/碰撞同步高度；walkHeight只對有效廊坪max，避免Math.max(pond,0)讓湖水變平地（被既有泳測試抓到並修）。A2低窗斷言改量距地坪高度，不放寬窗下不透明牆契約。
- 原程式reviewer限定新batch複核49/49（其時site20+interior29）無新P2，前4P2resolved。指出ramp法線朝下依共用DoubleSide才可見，已另加回歸先紅、翻頂點後綠（site21）。末端1cm級舊地坪偏差非P2；仍需真流程/畫面。
- 最新build成功index-BCn3weoH.js（其後僅ramp頂點再次build，同hash是否變需讀buildlog）。check pass /tmp/nccu100-reality-check-final.log；全測exec39987進行中 /tmp/nccu100-reality-tests-final.log（uphill測試耗時），之後ramp變更需最終重跑相關，不能當已全部完成。
- own CLI dah-reality曾goto卡30s，close/reopen後正常；目前http://localhost:5187/?debug&area=dah-hsian，exec55138正在同檔23站r2捕捉。capture-reality-r2.js已改正atrium(-10,1.6,12)->(-2,8,-1)與swim-.47；完成後需從新頁起跑capture-final-motion.js補移動游泳/室內桌機手機。preview5187維持，其他cli sessions是別人的不可關。
- 補全測前九欄教學差異已對話交付；無新增套件費用，來源非測繪/A1新裝修缺照仍限制。QA draft reality-qa.md需記7fix和最終證據；audit仍待更新最終逐區狀態，不可把獨立review當全現實認證。
- 下一步：55138結果→同檔final-motion捕捉→確認新圖有效→原finish reviewer限7項verdict；fresh documenter（按impeccable技能要求可spawn）唯讀；真outdoor/interior smoke最終版、全測/check/build；分支整合origin/main版本避衝、verified收尾到原Pages+exactSHA真流程。

# 2026-10-22 目前續作快照（以本節為準，尚未發布）

- 使用者最後明確擴大：廁所位置／架構不對，出館必為2F平台，1F湖邊店家／細節，角色下水游泳、鴨群，地毯式角色站位實景核對；不能以測試綠／大致相似當完成。
- repo /Users/cengweiting/Developer/創業計畫/NCCU100，branch fix/dah-hsian-entrance-layout，HEAD/base f232d8f。所有未提交皆本輪自身修改，不能reset覆蓋。遠端剛fetch已main dccf640（v1.66），本機暫存v1.64已衝號，發布前整合新main並改下一未用版本。尚無commit／PR／push。準備整合要保留其他作者新包種小遊戲、四維牌樓。
- 新執行計畫docs/superpowers/plans/2026-10-22-dah-hsian-reality-audit.md；逐區查核docs/reference/dah-hsian/reality-audit.md；來源reality-sources.json（117張舊批原下載，78有場景用途/39排除，另Fooday12張選10/11，wawa廁所1；不是有效站數）。原像素ignored研究不發布。
- 重大新查證：官方A1招租2026-06-29投標須知p7有1F完整圖；2026-09-02校方A1改PUFFIN籌備中，不再RUKO，缺新裝修照故模型不虛構PUFFIN招牌。A2小尚品，A3廢墟。
- 2F入口戶外門與return改共享MAIN_ENTRANCE.z7.6（原18.6在館名牆錯側）；實際出館4m平台。2F06放大確認工具間非無障礙，已改突出的小間與側門，男女廁在後。其餘感恩牆／櫃台／預約／兩道風除門差異保留先前本輪修正，interior27項通過，真鍵盤/原拖曳仰視/手機往返皆PASS。
- 新lakeside-model.js：1F三店共享配置；咖啡湖側近轉角雙門、兩大圓角窗／小格窗、L細框側窗、拼木柱、木紋、窗下凳、窗後吧台桌椅木梁吊燈；小尚品依Fooday10/11低窗/通風小窗/門/黑摺椅/菜單架，校方年報p13白卡座。1F側廊鋪面、停車通風帶、湖邊野餐桌與低植栽。
- 1F WC初版曾鏡射！再放大native圖＋2020戶外-only遊記wawa-wc白色無障礙滑門實拍反證：WC本體x-24，通道在店面(+X)側x-21.3，湖邊先無障礙z-23.3，再男-20.6女-16.5。開口+X，前廊末端設備雙門；1F照片樓層由戶外-only+plan推定非GPS證實。不可引用初版x-24.5行走PASS當最新位置通過。
- 游泳：keepOnLand不再拒水；walkHeight在POND低處採SWIM_FOOT_Y=WATER_Y-.25=-.47，和既有泳池基準同距，先前-.86前趴沉頭已修且回歸紅綠。state.swimming僅達賢room.update設定，onEnter/onExit清理；橋面/平台不游泳，水中可游回岸。ducks.js純Three4褐1綠頭是遊戲取樣，絕對時間慢橢圓路徑、有減少動態固定姿態。尾流色改共用COLORS.waterHighlight。
- 真戶外桌機/手機岸→水→岸完整PASS /tmp/nccu100-reality-outdoor-flow.log，但WC仍初版位置+泳高-.86，最終版本需重跑。2F全部真流程PASS /tmp/nccu100-reality-interior-flow.log（本輪室內最終幾何一致）。60Dah針對曾PASS，後增加site-fidelity目前16/16，仍未全套npm test/check。九欄教學已在對話交付（能力/體驗/結構/資料流/理由/備案/安全成本/證據/限制），全測前若再改需補差異。
- review_dah_reality_code唯讀full +delta指出4P2：core不認bottom→map改coreColliders過濾離地箱由局部clamp處理；凳/側牆碰撞共用，前兩resolved。最新WC凹間缺端牆斜看穿室外、轉折牆缺碰撞，兩者各紅綠修成LOWER_WC_END_WALLS/TURN_WALLS，16/16，已請原reviewer限兩項複核。
- 兩輪外觀 .screenshots/dah-reality-r1-* 與r2-*，1280x800/375x812。r1發現/修一批；r2已讀完外部/室內大部，新增interior-desktop/mobile與moving swim。r2圖唯一WC1仍最新端牆修前，必fix batch後同檔recapture。moving swim在-.47版本已重取、已讀，頭露出水面。r2-atrium初次柱擋，正在31488重取清晰站位(-10,1.6,12)look(-2,8,-1)；完成需讀一次有效性。
- 下一個立即動作：取31488結果+讀新atrium，然後依impeccable/new-work §7 spawn fresh NO HISTORY finish reviewer。完整packet .references/dah-hsian/survey-20261022/reality-review-packet.md（含23個required圖、原話、source paths、限制與已知觀察）。不得自己第三輪瑕疵狩獵；只做reviewer material fix batch。已知未修視覺：野餐桌鋼架看成灰色大片而非Tina20薄黑架；室內望入口外仍是平地草坪而非2F平台。獨立審查需照實確認，不用舊ship背書。
- Manualdetect本次新戶外6檔僅1 advisory尾流色#b6c6af，已機械改用共用COLORS.waterHighlight；不重跑。此前室內3檔detect[]。未新增ignore例外。PRODUCT/DESIGN沿用，既有missing.impeccable/design.json勿擅修。
- Preview5187 exec25085仍開，dist最近build在WC端牆/轉折牆修正前（/tmp/nccu100-reality-build.log），其他A2/WC新朝向/-.47泳高/尾流已包括。CLI dah-reality目前2F，123? activecapture31488；dah-survey-reference仍公開tour不3D遊戲。不要同時兩個3D軟體GPU browser。dev5193已停。
- 技能已讀/套用：product-owner-teaching/systematic-debugging/TDD/impeccable/emil-design-eng/playwright-cli/requesting-code-review/verification-before-completion/finishing-a-development-branch/writing-plans/pdf/review-animations。政策frontend/testing/product-security已讀。review-animations因鴨JS動畫須最終表格/approve，未交付完整審查。Skill freshness可沿用勿全重讀。
- 真正收尾仍欠：fresh視覺review/fix/recapture/原reviewer限項複核 +documenter；source逐區表最終狀態/八項自評/QA；最終真泳/WC與全測/check/build；保留新remote main版本整合，分支與main必要全測，existingPages exactSHA/版本/assets/真E平台/1F游泳手機驗收。不可現在宣稱全區符合現實或上線。動作已授權不用再問。

# 最新目標（使用者2026-10-22擴大與否定近似還原）

- 使用者再次指出廁所位置／架構不符實際；要求門口出來必為2F平台、補1F湖邊店家／細節、角色可下水游泳、水中有鴨；要求大量角色站立視角參考與逐區地毯式現實核對。
- **停止目前v1.64發布**；以下入口配置修正仍未提交／未上線，僅幾何檢查通過，不代表實景正確。既有production仍其他作者main版本，不要說使用者已看本機新廁所。
- 工作區／branch保持fix/dah-hsian-entrance-layout，base f232d8f，無他人未提交修改。暫定版本1.64（最後發布前須fetch檢查遠端版本衝突）。現有所有未提交需保留，不能reset。
- 新執行計畫：docs/superpowers/plans/2026-10-22-dah-hsian-reality-audit.md。**已找一樓完整圖**：2026-06-29 A1招租公告5231投標須知PDF第7頁，原始embedded image 1349×1873，已轉向對齊2F，見survey-20261022/plan-1f-aligned-view.jpg。1F廁所與店面可由此定位。**2026-09-02最新校方商家5272**：A1已換PUFFIN烘焙蔬食早午餐（籌備中），不能用2024 RUKO當現況；A2小尚品／A3廢墟仍列營業。
- 當前新增參考研究 .references/dah-hsian/survey-20261022/collect-pages.py（正在下載Tina2026-10-01、Angela、校方RUKO2024、Morris、Jamie實拍，照片≠有效站數）；來源必逐張看圖與分類。已查校方1F A1入口漢堡／A2小尚品／A3廢墟咖啡，不能只做兩店。官方1F平面仍待找。
- 現有room update/heightAt與state.swimming有游泳館範例，可沿用本區水面浮高／動作；達賢keepOnLand現強制拒水，需TDD改岸水切換並防空橋／2F平台誤判下水及跨房間殘留。
- CLI dah-survey-reference正在開公開360，1280×800；上一CLI dah-layout-final已關。preview5187 exec25085仍開，dev5193已停。下載exec81730未完成。最後build exec49921需取狀態。舊r2圖固定dist在廁所西端窄窗修正前，不作最終驗收。
- 獨立code reviewer /root/review_dah_layout_20261022發現廁所前廊西端漏玻璃→新增回歸先紅後綠，27/27通過；原審查者限此問題resolved。仍未做新範圍視覺獨立審查／全測／提交／部署。
- 下一步：完整站位／來源／缺陷清單及執行計畫；補查廁所真實前廊開口、2F平台與1F商家排列／外梯、岸線鴨子。按一個行為紅綠進行，完成後全區同角度比較、兩輪桌機手機、獨立視覺與程式複核、教學／全測，才既定main Pages發布。

## 先前執行快照（非新範圍完成）

# 本輪狀態：達賢入口層配置／廁所／玻璃門校正（進行中）

- 使用者指出2F配置、感恩牆、入口層廁所與玻璃門細節錯誤；沿已核可2F公開空間修正，正式1F停車／餐飲與其他樓層未納入。
- 原工作區乾淨；fetch後保留origin/main新內容並ff至f232d8fe75e67bcd231a9b6944fb5609ebe73aab（v1.63），分支fix/dah-hsian-entrance-layout。本輪未提交均自身修改，無新增相依。
- 官方2F平面重新下載，補沿公開環景走到大廳北側、廁所前、回望閘門／雙門；索引docs/reference/dah-hsian/interior-layout-sources.json。原像素仍ignored，不發布。
- 校正感恩牆為東側沿南北的木牆、取書區移到櫃台旁；補廁所隱私牆／前廊／關閉男女及無障礙門、B梯還書室及電梯核心；兩道退開玻璃門含上亮窗、框、把手／防撞標記。北側採光及窗邊凳恢復；櫃台螢幕移出木柱。模型與碰撞共用新增配置。
- 原18項針對基線通過；新8項逐一先紅後綠，現26項通過。原主路線因B梯量體補全改繞東側，真鍵盤腳本也改走廁所前廊／感恩牆前。完整瀏覽器驗收未完成，不能說已上線。
- r1檢出館名過小／螢幕埋柱、已修；r2固定dist截圖進行中，preview5187本輪啟動，dev5193已停。版本暫定v1.64，build index-H7rwwIlj.js。獨立程式審查進行中。下一步讀r2桌機／觸控及照片站位圖、獨立視覺審查、局部QA／九項教學／全測、既定main與Pages驗收。
- 限制：圖面與照片估算而非測繪；廁所內隔間無室內照片，只還原公共前廊和關閉入口；不把2020環景或未確認年月新站說成2026全現況。

## 前輪快照

# 本輪狀態：達賢2F照片站位重建 v1.56（驗收中）

- 使用者否定v1.54室內相似度，要求更多照片、以角色站位與朝向修正漂亮中庭；沿已核可2F公開範圍，其他樓層只可見不探索。
- 工作區 `/Users/cengweiting/Developer/創業計畫/NCCU100`；分支fix/dah-hsian-interior-views，base main380d79e。原工作區乾淨；本輪全部未提交均自身修改，無新套件／服務。
- 完成北／東層退藏書牆、平台桌位、透明欄杆；南／西採光迴廊、落地窗與露台綠景、特藏展示、藍毯與中央留白、側邊體驗桌／西南D梯。只2F可選仰視鏡頭，原拖曳即可抬頭，其他房間數學比對一致。
- 新增參考24張（含上層/外景/會議室，不當全為2F），另既有兩站新增仰視/回望角度；來源SHA與用途見docs/reference/dah-hsian/interior-refine-sources.json，完整QA見interior-refine-qa.md。照片2020/2022、估算構圖非測繪；原像素ignored不打包。
- 各行為逐一紅綠。獨立code review發現西南D梯與最西桌椅交疊、事後抬鏡頭進梯底；實際Box3/射線回歸先紅後修、原審查者兩項resolved。共享鏡頭未啟用144組比對僅浮點差。
- 兩輪CLI1280×800/375×812完成；normal r2最高仰角與三站眼高比較提供獨立視覺審查。其disposition fix：天頂灰板/細桿不像實景、缺上層斜梯；已按清單補深鋼桁架/短跨透光格與斜梯，同檔recapture五圖完成，原視覺審查兩項resolved、限清單ship，不再自行開新瑕疵清單。
- 最終139/139全測、check/build通過；針對18項通過，涵蓋最終視覺兩項與上層梯槽清空。產物index-f3eLdqCg.js。原審查者上層桌梯穿模也限項複核resolved。log /tmp/nccu100-2f-refine-*。手動detect僅一次[]，不重跑，原例外不擴。
- 真鍵盤路線與原滑鼠拖曳仰視已走通，完整流程含手機已通過exec72744及最終模型exec96998 exit0，/tmp/nccu100-2f-refine-flow.log；該次build在天頂/上層梯修正前。preview5187 exec96834供固定dist驗收；CLI已關閉，待該流程完再開一個3D瀏覽器複核。

- 遠端main於本輪期間新增PR65安九與PR66包種茶節，已合併origin/main98b80d7保留其內容；版本改1.56避免和安九已用1.55混淆，整合後test174+80項、check/build通過，/tmp/nccu100-2f-refine-integrated-tests-final.log、integrated-check.log、integrated-build.log；全場smoke待CI。原main安九返回測試過時與portable中文路徑問題已窄修、獨立複核正確，不改兩區產品。PR67已附本聊天，發布結果在PR驗證欄追蹤。

## 下一步

取完整手機結果；依視覺fix清單以同檔重取r2與after三張、原審查者複核；documenter已唯讀核對最後五圖／材質／PRODUCT/DESIGN，No changes保留既有系統，預先缺sidecar不修。全測/check/build已通過，提交PR/附本聊天。完整CI全場smoke+2F流程通過後合併main、main全測/check/build、push既有Pages，驗證原網址v1.55/確切SHA/真拖曳與鍵盤手機往返。未完成不得宣稱上線。

## 前輪快照

# 本輪狀態：達賢2F最終驗收與發布準備

- 使用者已選2F並核可「照此建置」：docs/superpowers/specs/2026-10-21-dah-hsian-2f-design.md；計畫docs/superpowers/plans/2026-10-21-dah-hsian-2f.md。只公開空間，無其他樓層／小屋內部／NPC／任務／真刷證借書。
- 來源main82f2f36，工作區 `/Users/cengweiting/Developer/創業計畫/NCCU100`，building/dah-hsian-2f；所有未提交均本輪，未覆寫他人修改。
- 完成大廳感恩牆、弧形櫃台、閘門、設備、玻璃預約區、挑空藍毯與可見上層迴廊、公開閱覽；未開樓梯用可見欄門阻擋。
- core/gameplay最小加entrance.room／returnRoom、明確spawn.y、正確onExit/onEnter；其他建築預設null維持。相機collector抽純Three模組，2F天花／細柱opt-in，舊規則經原審查者案例比較一致。
- 官方平面＋6站24方向環景實際看圖，2020-02©NinaKu，索引docs/reference/dah-hsian/interior-stations.json。官方近照與研究原圖僅ignored本機.references/dah-hsian/interior，不發布照片素材。
- navigation2／interior8針對測試與全套129/129通過，/tmp/nccu100-2f-tests.log；check/build通過，最終產物index-C2_IDBXU.js。Node24.15／Three0.149／無新增相依。其後只更新文件、CI新瀏覽器步驟與測試mobile console監聽，不改產品程式。
- 真E往返已通過，後續完整鍵盤入口→大廳→閘門→挑空→窗邊閱覽、鏡頭／重入／舊房間檢查已走通。完整手機搖桿回出口已通過（exec70561 exit 0），/tmp/nccu100-2f-full-flow.log。第一版手機測試傳送受殘餘慣性滑出提示，改實際搖桿走回出口，不改遊戲手感掩蓋。
- 兩輪CLI 1280x800／375x812及3站照片對照完成。獨立視覺fix兩項（透明殼遮住玻璃、共面地毯條紋）各先紅後綠，覆寫同r2／photo檔再複核，兩項resolved、限清單ship。原程式鏡頭P2也複核通過。
- 最終圖 `.screenshots/dah-2f-r2-desktop.png`／`dah-2f-r2-mobile.png`；照片比較 `dah-2f-photo-lobby.png`／counter／atrium。最後CLI已關。preview5187 exec33195仍供固定dist流程。
- Impeccable documenter確認普通延伸保留DESIGN；既有缺design.json不擅補。detect僅一次，暖白世界招牌#eee9df單檔單值例外，舊例外不動。詳QA docs/reference/dah-hsian/interior-qa.md（含兩輪八項與九項理解檢查點、美術十項）。
- .github/workflows/ci.yml在既有全場smoke後新增本館真瀏覽器鍵盤／手機往返，preview程序有trap收尾。全場smoke將由本分支CI與main CI執行，不把Node測試當全場瀏覽器通過。

- 分支CI 39603305028全場smoke失敗於舊「所有房間離開皆null」假設；2F應回dah-hsian，本機完整流程已證實。現將smoke明確列2F返回dah-hsian，其餘仍null，保留逾時斷言並加安全診斷；重跑CI後才合併。

## 下一步

本機完整鍵盤／手機流程已通過。[PR #64](https://github.com/wenzhotw/nccu100/pull/64) 已建立並附本聊天；發布結果在PR驗證欄追蹤。確認分支完整CI（含全場smoke與新2F步驟）成功，再依既有授權合併main、main重跑全測/check/build、push沿Pages原網址、驗收正式SHA/v1.54／真進出。若失敗修復，不帶失敗發布。發布結果以PR驗證欄追蹤，這裡保留提交前快照。

## 前輪發布與驗收快照

# 本輪狀態：達賢 v1.53 本機驗收完成，發布追蹤 PR #63

- 使用者核可依角色站位照片重建戶外並要求繼續；工作區 `/Users/cengweiting/Developer/創業計畫/NCCU100`，分支 `fix/dah-hsian-detail-and-collision`，來源51a8cb18；沒有他人未提交修改。
- 已重建各側立面、深門廊、二樓露台、館名牆、小屋不對稱入口、空橋／外梯、半圓老樹廣場、坡面石板。戶外外梯／空橋可走，室內與交通不變。
- 本區layout共用高度／接點／階梯／欄杆，模型與碰撞同步；walkHeight依目前腳高分層，小屋低層腳底.4與可見地板一致。未改全遊戲core／render或存檔。
- 原研究14站56方向＋25張地面照片保留，來源與限制見 `docs/reference/dah-hsian/ground-view-reconstruction.md`；沒有發布第三方照片。近地面遊戲對照完成門廊／橋端／池對岸估算構圖，不冒稱14站精確配準或2026完整現況。
- 修復各項重現穿模；21項新針對測試逐行為紅綠通過，原6項按實景位置／新行走範圍校正。最新 `npm test` 119/119，`/tmp/nccu100-dah-rebuild-tests.log`；Node24.15.0／Three0.149／無新增相依。
- 最新check/build通過，打包最終hash見build日誌，build記錄 `/tmp/nccu100-dah-rebuild-build.log`。既有gameplay混合匯入提示保留。
- 獨立程式審查連續875次更新完成一樓→外梯→二樓→橋→小屋，腳底與樓板射線吻合、橋底鏡頭射線通過；`.references/dah-hsian/round2/review-route.mjs`及log。
- 最終程式審查補出擋土牆／小屋端框柱缺碰撞，已按實體尺寸修正並留通路；窄縫殘留重疊改選所有碰撞物件都安全的最近候選，兩行為各先紅後綠，原審查者複核27/27通過。
- 兩輪桌機1280×800／手機375×812自評已做，依審查清單修低欄杆碰撞／補池對岸圖，原審查者兩項resolved、清單範圍ship。文件交接確認沿用既有系統，DESIGN.md不改，既有缺少design.json揭露不擅補。
- 最終`index-D2S8Arep.js`達賢瀏覽器專項通過，`/tmp/nccu100-dah-rebuild-flow.log`。原全場smoke曾在尚未建立達賢前地圖關閉逾時，原因未確認；保留原失敗log，僅加診斷的同斷言完整重跑通過，`/tmp/nccu100-dah-rebuild-smoke-diagnostic.log`。同版原腳本GitHub CI 39582493824成功，未改共用地圖或放寬測試。
- 程式審查及視覺清單均已複核；來源提交0f2004b，草稿 [PR #63](https://github.com/wenzhotw/nccu100/pull/63) 已附本聊天。發布階段以PR驗證欄／main Actions結果追蹤，這裡保留合併前快照。
- 固定preview5187供本機驗收，無新常駐服務；研究圖／截圖／診斷腳本留ignored本機目錄，原始研究來源不清理。
- QA、兩輪八項自評、照片對照／效能量測限制及九項產品理解檢查點依據：`docs/reference/dah-hsian/rebuild-qa.md`。僅一般地圖改動，局部QA，未對第三方做資安模擬。

## 下一步

按既有授權整合main、重跑全套／check／build，原全場smoke已由同版CI與本機完整診斷重跑覆蓋；push後追蹤main CI及Pages，驗收原 `https://wenzhotw.github.io/nccu100/?area=dah-hsian`。若測試或權限失敗保留工作回報證據，不硬推。

## 前階段紀錄

# 本輪狀態：達賢全方向照片查核與穿模追查（進行中）

## 使用者本輪修正

- 使用者明確指出：整體四面八方的細節都不夠像，且有穿模，不是只修單一入口或正面。
- 要從「角色能站的位置」找近站立高度的實景，記錄站位、方向及視野，以相同位置的遊戲畫面反推重建；不能以增加空拍、遠景數量代替。
- 獨立戶外區域、先不接交通、沿用既有美術方向。尚未新增室內、任務、NPC 或改動共用引擎。

## 工作區與已上線版本

- /Users/cengweiting/Developer/創業計畫/NCCU100；分支 fix/dah-hsian-detail-and-collision。
- 本輪來源／正式站仍為 51a8cb18e2641ac754cc68c2bcb20ab9f1df4666，v1.52。PR #62 已由 wenzhotw 合併，既有 GitHub Pages 已上線。
- 前一輪發布後驗收通過的是原有流程，不代表目前照片還原或穿模問題已解決。
- 本輪目前只有研究、唯讀審查和交接文件；沒有修改遊戲原始碼，沒有本輪新部署。

## 新研究與立即下一步

- 找到館方公開的 WalkInto／Google 360 環景，實際載入並沿戶外站點走訪；可從館名牆沿門廊、露台、背側走道走到空橋。
- 來源 https://www.lib.nccu.edu.tw/p/404-1000-567.php?Lang=zh-tw；環景 https://walkinto.in/tour/WktjYS6ipb-ketjKSTo6Z。
- 本機研究資料 .references/dah-hsian/round2/：capture-tour.py、vr-menu-public.json、各站 vr-<station>.json 與四方向截圖、contact sheets、vr-dates.json、vr-game-positions.json；不重新發布第三方照片、不作遊戲貼圖。
- 日期由公開 StreetViewService 的 imageDate 查得，不是猜測。已查點為 2020-08，© Nina Ku；永久建築可核對，現況植栽／設施須再與較新發布的實拍交叉確認。
- 同時補找潤泰工程、Commons 原始攝影、AJ、萍子與大海愛上藍天實拍。ground-downloads.json 共72筆成功下載，含室內、菜單、合成圖；不得把72稱為戶外有效照片數。contact sheets 已逐頁看過，詳細適用角度待存取景站位文件。
- 原 OSM→遊戲轉換用三個已配對角點重現，再以其餘角點校準；僅驗證轉換可重現，不代表公開環景 GPS 是現地測量。照片與遊戲精確對位仍未做，不能宣稱完成同視角還原。
- 優先用環景確認館名牆的真實退縮、連續開放門廊、南側露台與池側走道、空橋接點、小屋二樓端牆；再整理四向覆蓋與缺圖處。
- 新研究紀錄 docs/reference/dah-hsian/ground-view-reconstruction.md；ground-view-stations.json 記14個實際站位／每站四方向共56個檢視畫面（不是56個拍攝位置），已逐站看contact sheet。ground-photo-supplement.json 另選25張適用實拍來源，沒有把室內與菜單算入。
- JSON與本機PNG／SHA256對照已核對；遊戲相同站位比對目前0組，遊戲原始碼未變，不把研究校驗說成遊戲測試或修復。下一步從入口平台及深門廊開始做實景對位與逐行為紅綠。

## 已重現缺陷，尚未修復

獨立唯讀審查使用真實 createDahHsianModel／resolve，先以已知平面與盒內外點校準。原測試仍6/6，不能視為下列缺陷不存在。

1. 背面 edge 實例34–38柱體伸到 z=-28.85，碰撞後緣只有-28.4；(-1,-28.8)的角色中心仍在柱內。也需一起核對玻璃外凸範圍。
2. 入口樓板實例0頂4.19，但(0,28.2)腳底高度查詢為4，且合法可達，約19cm埋腳。
3. (26,12.7)腳高2.94483、身體尚低於玻璃底4.7，向前無可見實體卻被推到z12.9。根因是全場單一z斜坡、浮高玻璃、碰撞箱不同步；須按實景校正平台與退縮。
4. 從(14.3,4,28)一步到(14.59,4,27.71)，resolve後距主樓只有.367658，小於半徑.4；館名牆後處理把角色推回先前主樓箱。
5. (-21.2,0,-35)，yaw0/pitch1.15/dist6，相機射線碰橋板距離3.1662；鏡頭遮擋清單排除 InstancedMesh 且要求厚度>.25，橋板.22漏掉。不能用落地整箱封掉橋下解法。
6. 空橋到小屋露台水平缺口約1.56123公尺；高度近似但平面接點錯開。後續共用接點資料生成外觀與行走面。
7. 較低優先：坡面石板高出地面約10cm、座椅／燈柱可穿過。

- 未重現普通跳躍撞橋底，不能把假說寫成缺陷。
- 前輪空橋／外梯僅外觀。使用者要求角色站位照片不自動等於授權新增所有可登階區；先查明照片位置與本輪必要可走範圍，再記錄產品取捨。
- 後續每個修復先補一個可重現失敗測試，再最小實作／重測；要查resolve後不重疊任何實體，不能只查有被推動。照片還原另外以實際同站位／同方向／接近同視野比較，不以程式測試代替。

## 既有紀錄（前一輪封存）

# 本輪狀態：達賢戶外

## 目標與已確認範圍

使用者負責 NCCU 100 達賢建置，確認獨立區域、先做戶外，暫不處理交通。要求圖片參考多、盡量還原。計畫見 docs/superpowers/plans/2026-10-21-dah-hsian-outdoors.md；產品與視覺沿用 PRODUCT.md、DESIGN.md、docs/art-style.md。

## 工作區與版本

- /Users/cengweiting/Developer/創業計畫/NCCU100，從既有遠端全新 clone，未覆寫其他工作；唯一 worktree。
- 分支 building/dah-hsian-outdoors，原始來源 482194eec5f02834d5da15132ac10bba26c4ccf1。
- 製作中遠端合併 PR #61，已快轉同步至 6f0dc8e81afbd7564543b6588afd61734b6688a4，保留夥伴新增美術規範與 Ubuntu 24.04 CI 修正。達賢版本 v1.52。
- 起始沒有 HANDOFF、STATUS、PRODUCT 或 DESIGN；新增必要產品、視覺與本輪紀錄，沒有另一套專案骨架。
- Node v24.15.0；npm ci 沿用 package-lock.json，沒有新相依。遠端 CI 使用 Node 22。

## 修改

- src/world/buildings/dah-hsian/：獨立場景、OSM 輪廓資料、連續地形、主樓／小屋外觀、池岸／草坡／步道／空橋、碰撞與預覽。
- 普通網址不建立達賢完整模型；area=dah-hsian 在按開始後進達賢。未加入校園交通入口或正式出口。
- 沿用既有角色、操作、rooms、存檔；未修改 core、render 或其他建築。入口文字與行動 HUD 調整限達賢作用域。
- 新增 Node 行為測試、達賢瀏覽器驗收、產品／設計／來源／QA 文件；版本、ignore 與檢查例外只含本輪必要差異。
- 36 個不同 SHA256 的研究影像索引見 docs/reference/dah-hsian/；本機研究原圖 .references/dah-hsian/，不作遊戲貼圖、不重新發布第三方原照片。來源與本輪截圖保留，不當垃圾刪除。

## 驗證證據

- 原基線：npm test 92 通過、check/build 通過。smoke 首次在最後手機 page.goto 30 秒逾時，關閉另一個 3D 頁面後原腳本重測通過；資源競爭是推論，沒有測量因果。
- 本輪：node --test scripts/dah-hsian.test.mjs 6 通過；逐項紅綠。
- npm test 98 通過，記錄 /tmp/nccu100-dah-full-test.log。
- npm run check、npm run build 通過；build 的 gameplay 混合匯入提示已記 QA，不是獨立 chunk。
- node scripts/dah-hsian-smoke.mjs 通過：預覽、延後建立、鍵盤、建築／池岸阻擋、重入不重建、故事與道具保留、正常網址、375×812 觸控、無溢出、樹冠淡出。後續版本已縮窄資源錯誤排除，只排除既有 favicon.ico。
- 既有全場 npm run smoke 通過，記錄 /tmp/nccu100-dah-full-smoke.log。
- 獨立代理唯讀審查，已修館名牆／露台／外梯碰撞、樹冠淡出與石碑描邊。檢查範圍、缺陷與修正、八項自評、動效審查見 docs/reference/dah-hsian/QA.md。
- 已做兩輪雙尺寸並修正，再依最新規範完成最終桌機1280×800與手機375×812：.screenshots/dah-final-desktop.png、.screenshots/dah-final-mobile.png。公開遊戲截圖與完整八項自評在 docs/reference/dah-hsian/，沒有發布原始研究照片。
- Impeccable 最新 detect 為 []。實際 computed style 已證實 ● 是紙色而非黑字。單檔單值誤判例外見 .impeccable/config.json；不關閉整條規則。

## 本輪局部決定、風險與限制

- 沿用既有 rooms 獨立場景，不新增引擎、服務、權限、付費或外部依賴。
- 環境以 OSM 輪廓與官方高度交叉核對，統一 0.8 倍。微地形、窗格、遮陽角度、園景與外梯細部為照片估計，非現場測繪。
- Reflector 試作已完整移除以符合新美術規範；卡通池面亮紋。樹使用現有 tree，晚建一般網格走原材質淡出。
- 不含室內、NPC、任務、交通或登橋入室；空橋與外梯僅外觀。
- 簡短玩家／領域 QA 已執行；未觸發完整資安模擬。沒有真人校方／專業認證，沒有真機 FPS 保證。

## 下一個具體動作

開發與本機驗收完成。按已授權流程完成 PR／main 整合、main 全測、遠端與既有 GitHub Pages 部署及正式流程驗收。發布結果以本輪 PR 與對應 merge commit 的 GitHub Actions 記錄為準；本交接在送審時封存，不預先宣稱上線。
