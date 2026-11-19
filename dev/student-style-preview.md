# 普通學生與 RPG 少年隔離對照

## 啟動與範圍

執行 `npm run dev`，開啟 `/dev/student-style-preview.html`。不加入正式遊戲發布入口、不改版本、不讀寫 localStorage。

左側依原本 `STUDENTS.colors[0]` 建立第一位普通學生；右側透過明確的 `studentStyleTrial: 'soft-v1'` 建構選項建立全新 `rpg-profile-v3` 視覺 profile。選項名稱保留開發介面相容性，不代表仍是最初的小幅圓角版。沒有網址參數自動改變正式角色。

兩版 root scale 均為 1.1，使用同一相機、光源與世界尺度。候選不是放大角色：以較小頭型與長腿形成約 4 頭身，總高度仍接近原版。候選採棕色分束瀏海、收頜臉型、日系大眼、青綠外衫、暖白內搭／袖口、深藍長褲、運動鞋鞋底及薄矩形背包。

## 技術隔離

- `student-rpg-trial.js` 使用專用人形 profile，肩髖與頭部掛點只影響該試點實例，保留既有 joints 介面，供原 NPC 動畫與零件卡 adapter 使用。
- 舊 default 建構流程、舊共享 BOX/SPH、舊角色、清冊與儲存 schema 不變。
- 新增頸部、袖口、鞋底與髮束等節點並登記對應來源；不再以零新增物件數限制造型。
- 幾何仍是共享基本球、膠囊、圓柱、圓環、貼合衣身的平面及其受控頂點形變，使用 toon/basic、既有描邊。人臉例外分段沿原方式，其餘球面不超過16×12。
- 收頜同時用在頭骨及貼臉球面，避免只縮頭而讓五官浮在舊曲面上。
- 大眼白、虹膜平塗層次、高光、閉眼及驚慌都畫在既有三張256×256 canvas，沒有外部圖片或增加每角臉貼圖數。
- 全部造型在來源登記與 native clone 之前建立，不熱換已登記角色，不改 shader／physics／全域動畫。

## 可重現預覽

支援前、右、背、左、遊玩距離；idle、walk、wave；open、closed、panic；default、native與reset。

自動驗收等待 `document.documentElement.dataset.studentStyleReady === 'true'`，呼叫 `window.__studentStyleTrial.freeze(.75)` 固定時間。`setCamera()` 切鏡位；`snapshot()` 回傳固定狀態；`metrics()` 回傳模型資源；`renderEvidence()` 立即真實渲染並讀取左右非背景畫素。截圖後保留 results.json 的 checkout SHA/tree 與 PNG hash。

專用 read-only CI `student-style-preview.yml` 透過 Vite 開發伺服器執行 `scripts/student-style-preview.mjs`。1280與390 CSS px各19張，驗證真WebGL、左右畫面、runtime/resource errors、native/reset、重整、storage與排版。既有build／smoke／全角色CI與部署流程不變。

## 限制

預覽使用同步動作公式，不執行正式尋路／碰撞或遊戲後製。遊玩距離是工作台遠鏡位，不冒充校園實景。軟體WebGL與窄視窗不是手機實測，模型資源不是完整renderer calls或FPS。新增geometry／mesh／材質的實際成本須隨候選重新量測，不沿用早期版本的數字。

真圖需人工確認比例、髮片穿插、貼臉、肩袖與衣襬、腳底及遠距辨識性。測試通過不等於美術完成，不使用生成圖片代替3D成果。

窄視窗近鏡位會將共用相機一起後退，避免兩欄揮手被裁切；不改任何一版的 root scale。CI 額外檢查兩版固定1.1世界縮放，並逐頂點投影驗證可見模型（含舉手及描邊）完整位於各自視窗內，results.json 記錄實際相機位置及投影界限。

## 參考細修

依使用者提供的兩張少年造型圖，採更修長但仍適合遊戲尺寸的約4頭身折衷，不宣稱完全複製參考。保留自有衣著；眼線上移、眼寬增加，鼻口有較明確間距，頭殼與臉片採同一平滑收頜函數。前臂手掌使用一體幾何避免腕部拼球；肩袖嵌接及褲腰下緣同步細修。最初baseline仍在左側，47a963已認可版本可由前次CI artifact對照。

## 臉部比例審查

新增臉正面、臉斜角、臉側面共用鏡頭近景；只取頭部可見mesh聯集作邊界檢查，全身原19張檢查完全保留。另有近景closed/panic，各viewport共24張。頭部scale與已認可體型不變，不以縮頭代替五官設計。

參考目標為每眼約臉寬20–23%，清楚上眼線／眼白／灰虹膜，眼鼻口逐層留白；實際投影比例仍以真圖審查。頭殼與臉片同標準化映射，前臉較平、頰頜柔卵形，鼻樑鼻尖為連續幾何隆起而非canvas三角點，未新增材質或貼圖。
