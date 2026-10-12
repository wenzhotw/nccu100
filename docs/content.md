# 內容檔說明（台詞、NPC、校園故事）

所有內容都在 `src/content/`，改完存檔，`npm run dev` 的畫面就會更新。

## npcs.json：NPC 名單

```json
{
  "id": "dean",
  "tag": "學務長　蔡炎龍",
  "title": "學務長．蔡炎龍",
  "home": { "x": -27, "z": -56 },
  "path": [[-27, -56], [-35, -57.5]],
  "speed": 0.9,
  "look": { "top": "#1f2a44", "pants": "#2e2e36", "hair": "#3a2a22", "glasses": "#4f545b" },
  "shout": ["遠遠看到你時頭上冒出的話"],
  "dialog": [
    { "lines": ["你好，我是學務長蔡炎龍。", "第二句。"] }
  ]
}
```

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `id` | ✓ | 英文代號，不能重複。`cop` 是駐校警察，劇情會用到，不要刪 |
| `title` | ✓ | 對話框上的名字 |
| `tag` |  | 頭上的名牌；不填就沒有名牌 |
| `home` | ✓ | 站的位置。四維堂室內的 x 寫 `"IX"` |
| `indoor` |  | `true` 表示在四維堂室內 |
| `path` |  | 來回走的路線，`[[x, z], [x, z], …]` |
| `speed` |  | 走路速度，預設 1.3 |
| `face` |  | 站著時面向的角度，可寫數字或 `"PI"`、`"-PI/2"` |
| `wave` |  | `true` 會一直揮手 |
| `look` |  | 外觀：`top` 上衣、`pants` 褲子、`hair` 頭髮顏色，`suit` 西裝、`tie` 領帶顏色、`glasses` 眼鏡顏色、`hairStyle`（`side`、`bowl`、`short`）、`cap` 帽子、`hood` 帽T、`flyer` 拿傳單… |
| `shout` |  | 玩家靠近時頭上輪流冒出的話 |
| `dialog` | ✓ | 對話，見下方 |

`students` 是路上的同學：`lines` 台詞、`colors` 衣服顏色、`paths` 走路路線（`colors` 和 `paths` 數量要一樣）。

`panic` 是警車暴衝時路人喊的話。

## dialog：會依劇情改變的對話

`dialog` 是好幾段台詞，遊戲從第一段開始找，**第一段符合 `when` 條件的**就會被說出來。最後一段不寫 `when`，當作預設。

```json
"dialog": [
  { "when": { "haveMap": false }, "lines": ["第一次見面說的話"], "then": "giveMap" },
  { "when": { "found": { "lt": "total" } }, "lines": ["目前收集到 {found} 個，還差 {left} 個。"] },
  { "lines": ["全部收集完之後說的話"] }
]
```

### when 可以用的條件

| 寫法 | 意思 |
| --- | --- |
| `{ "haveMap": true }` | 已經拿到百年秘寶地圖 |
| `{ "haveBadge": false }` | 還沒拿到親愛精誠徽章 |
| `{ "dogTalked": true }` | 跟小穿講過話 |
| `{ "found": 2 }` | 剛好收集到 2 個故事 |
| `{ "found": "total" }` | 全部收集完 |
| `{ "found": { "lt": 3 } }` | 少於 3 個（`gt` 大於、`eq` 等於） |

寫好幾個條件時要全部符合。

### lines 可以用的變數

`{found}` 已收集數、`{left}` 還差幾個、`{total}` 總數。

### then 可以用的動作

| 動作 | 效果 |
| --- | --- |
| `giveMap` | 給百年秘寶地圖 |
| `giveBadge` | 給親愛精誠徽章 |

要新增動作，請在程式裡用 `registerAction('名稱', 函式)` 登記（見 `src/systems/items.js`）。

## dialogs.json：其他對話

- `pangolin`：穿山甲小穿（格式同 `dialog`）
- `copStopsGrab`：抓穿山甲被警察制止
- `copStopsCar`：開警車被警察抓到
- `toasts`：畫面下方的小提示

## stories.json：校園故事

```json
{ "id": "name-stone", "x": -15.6, "y": 1.4, "z": 17.4, "title": "校園故事．校名碑", "lines": ["…"] }
```

`inside: true` 表示放在四維堂室內（x 是相對室內中心），`mapAt` 是它在地圖上要標示的位置。

新增故事後，總數 `{total}` 會自動變多；台詞裡寫死的「三個」記得一起改。

## missionaries.json：學生傳教士與寶可夢式戰鬥

- `pair`：兩位傳教士的位置、巡邏路線、外觀（格式同 NPC）
- `greeting`、`choices`、`replies`：搭話、三個選項、選完之後的回應
- `saved`：選「願意接受」之後的結局畫面
- `battle`：戰鬥設定
  - `enemy`、`player`：名字、等級、HP
  - `playerMoves`、`enemyMoves`：招式。`power` 傷害範圍、`accuracy` 命中率（0～1）、`heal` 回復量、`run: true` 逃跑、`gameOver: true` 直接結束遊戲、`fx` 特效（rain 水柱、sand 沙塵暴、holy 聖光、sword 寶劍、heal 回血光點、flee 逃跑、politics 畫面變灰）
  - `messages`：沒打中、會心一擊、勝利、倒下、結局的文字

戰鬥引擎在 `src/systems/battle/`，可以給其他 NPC 重複使用：準備一份同樣格式的 `battle` 設定，呼叫 `startBattle(設定)` 就好。
