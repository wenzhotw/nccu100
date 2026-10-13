# 蓋亞造界．政大百年慶版

政大山下校園的 3D 冒險小遊戲。從校門走到四維堂，跟校長、學長姊和穿山甲小穿聊天，收集三個校園故事，找出政大的百年寶藏。

**線上玩：** https://wenzhotw.github.io/nccu100/

用瀏覽器就能玩，手機也可以。技術上是 [three.js](https://threejs.org/)（3D 繪圖）加 [Vite](https://vitejs.dev/)（開發伺服器與打包）。

## 快速開始

需要先安裝 [Node.js](https://nodejs.org/)（20 版以上）。

```bash
git clone https://github.com/wenzhotw/nccu100.git
cd nccu100
npm install
npm run dev
```

打開終端機顯示的網址（通常是 http://localhost:5173 ），改程式存檔後畫面會自動更新。

## 常用指令

| 指令 | 做什麼 |
| --- | --- |
| `npm run dev` | 開發模式，邊改邊看 |
| `npm run build` | 打包成正式版到 `dist/` |
| `npm run check` | 檢查資料夾結構與內容檔格式（送 PR 前跑一次） |
| `npm run smoke` | 打開遊戲確認沒有錯誤（要先 `npm run build`） |
| `npm run new-building -- <資料夾名稱> <中文名稱>` | 建立一棟新建築的資料夾 |
| `npm run new-interior -- <資料夾名稱>` | 幫建築加一個室內房間（見 `docs/interiors.md`） |

## 專案結構

```
src/
├── main.js                 進入點：依序載入所有模組
├── core/                   引擎、遊戲迴圈、輸入、碰撞、共用狀態
├── render/                 材質工具、卡通光影、後製（泛光、調色）
├── world/
│   ├── registry.js         世界登記處：高度、區域名稱、地圖圖示、室內空間
│   ├── building-kit.js     建築共用小工具（窗戶、屋頂、方塊樓層）
│   ├── buildings/          ★ 每棟建築一個資料夾，自動載入
│   │   ├── main-gate/          正門
│   │   ├── siwei-hall/         四維堂（外觀、廊道、室內）
│   │   ├── library/            中正圖書館
│   │   └── …
│   ├── terrain/            地面、道路、噴水池、醉夢溪
│   ├── environment/        天空、遠山、草、粒子
│   └── zones.js            道路與廣場的區域名稱
├── actors/                 玩家、NPC、穿山甲、警車、校園公車
├── systems/                音樂音效、道具、校園故事、開警車、抓穿山甲
├── content/                ★ 台詞與劇情（JSON，不會寫程式也能改）
│   ├── npcs.json               NPC 名單與台詞
│   ├── dialogs.json            小穿、警察等其他對話
│   └── stories.json            校園故事
└── ui/                     對話框、提示、樣式
```

兩個打星號的資料夾是大家最常改的地方。詳細說明在 [docs/architecture.md](docs/architecture.md)。

## 想參與？

請看 [CONTRIBUTING.md](CONTRIBUTING.md)。最簡單的入門方式：

- **改台詞**：直接編輯 `src/content/npcs.json`
- **認領一棟建築**：到 Issues 找「新建築」標籤，留言認領，然後 `npm run new-building`
- **回報問題**：開一個 Issue，附上截圖

## 除錯

網址加上 `?debug`（開發模式自動開啟），就能在瀏覽器主控台使用 `__game`：

```js
__game.teleport(0, -70)        // 瞬間移動到四維堂前
__game.zoneOf(__game.pos)      // 目前區域
__game.world.buildings         // 已載入的建築
__game.state                   // 遊戲狀態（收集數、道具…）
```

## 授權與致謝

- 這是學生自製的非官方同人作品，與國立政治大學校方無關

- 3D 引擎：three.js（MIT）
- 音樂與音效：程式即時合成，沒有使用外部音檔
- 建築參考：政大校園實景照片
- `legacy/single-file-v1.html` 是重構前的單檔版本，保留作為對照
