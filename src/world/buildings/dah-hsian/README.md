# 達賢圖書館戶外獨立區域

- 分工：本輪由奧樂遊戲使用者接手，GitHub 帳號 Hunter20041004。主維護者仍依既有 CODEOWNERS，不自行改共同分工。
- 範圍：本館外觀、前草坡與石板路、入口門廊、湖濱步道、景觀池、小屋外觀及空橋。
- 獨立場景，第一次進入才建立。沒有正式交通入口；v1.54本館2樓公開空間可由主入口進入，小屋及其他樓層未開放。
- v1.53依地面環景重建門廊、二樓露台、小屋入口與立面，戶外外梯及空橋可行走；橋下仍是一樓，玻璃門後不開放。
- 本機預覽：http://127.0.0.1:5187/?area=dah-hsian
- 正式站預覽（需本輪部署後）：https://wenzhotw.github.io/nccu100/?area=dah-hsian

## 還原與來源

詳見根目錄 docs/reference/dah-hsian/README.md。逐圖來源、用途與 SHA256 見同目錄 manifest.json；本機研究影像在根目錄 .references/dah-hsian/。

site-data.js 保存三個 OSM 地標輪廓，© OpenStreetMap contributors，ODbL。地圖正面對 +z，採統一 0.8 倍遊戲比例，官方建築高度 31.7m 作比例參考。草坡高差、窗格間距、遮陽板角度與細部位置仍為照片估計，不宣稱測繪精度。

## 檔案

- layout.js：高度、碰撞、水岸限制與區域名稱。
- model.js：可在 Node 建立的靜態模型與地形。
- map.js：接既有材質、文字、燈光及碰撞清單。
- index.js：獨立場景登記與指定查詢參數的預覽入口。

## 驗證

```sh
node --test scripts/dah-hsian.test.mjs
node --test scripts/dah-hsian-rebuild.test.mjs
node scripts/dah-hsian-smoke.mjs
npm test
npm run check
npm run build
npm run smoke
```

地面高度／碰撞有實際行為測試；視覺還原仍需依多方向遊戲畫面與實景對照。不能以 Node 測試或單一截圖代替手機實機效能測量。

`groundHeight`查自然地面；`walkHeight(x,z,footY)`按目前腳高選可支撐的樓板或階梯。`index.js`限本區以`late.pos.y`接回既有高度查詢，不改共用角色／場景引擎。橋、欄杆、階梯與長椅配置共用，外觀／碰撞不可另填一組尺寸。

## v1.54 2樓公開空間

`interior-layout.js`提供公開動線／共用尺寸與碰撞，`interior-model.js`可在Node驗幾何，`interior-map.js`注入既有toon／canvas文字。門前互動只在`dah-hsian`有效；2F出口`returnRoom`回戶外門前`y:4`，不回原校園。兩個場景各自第一次才建立。薄天花／細柱採明確cameraOccluder，其他地圖原規則不變。

研究／驗收：docs/reference/dah-hsian/interior-qa.md及interior-stations.json。`node --test scripts/dah-hsian-interior.test.mjs scripts/room-navigation.test.mjs`、固定preview5187後`node scripts/dah-hsian-interior-smoke.mjs`；可用NCCU_BASE_URL指向既有正式網址驗收。CI保留本館真實進出與手機測試。
