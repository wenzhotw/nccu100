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
| `room` |  | 在哪個室內房間（房間 id，見 [interiors.md](interiors.md)） |
| `indoor` |  | `true` 表示在四維堂室內（等於 `"room": "siwei-hall"`） |
| `path` |  | 來回走的路線，`[[x, z], [x, z], …]` |
| `speed` |  | 走路速度，預設 1.3 |
| `face` |  | 站著時面向的角度，可寫數字或 `"PI"`、`"-PI/2"` |
| `wave` |  | `true` 會一直揮手 |
| `look` |  | 外觀：`top` 上衣、`pants` 褲子、`hair` 頭髮顏色，`suit` 西裝、`tie` 領帶顏色、`glasses` 眼鏡顏色、`hairStyle`（`side`、`bowl`、`short`）、`cap` 帽子、`hood` 帽T、`flyer` 拿傳單… |
| `shout` |  | 玩家靠近時頭上輪流冒出的話 |
| `bubble` |  | 一直掛在頭上的對話泡泡（40 公尺內都看得到，對話時收起來） |
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

## old-principal.json：老校長（騎馬、歷史問答）

騎馬穿軍裝的老人，在田徑場跑道和八德道上騎馬：快跑一陣子，偶爾停下來或慢慢走。主角離很遠的時候，他偶爾會換到另一個地方騎。追上去按「抓住老校長」就會觸發對話。程式在 `src/systems/old-principal/`。

- `look`、`horse`：人和馬的顏色（格式同 NPC 的 `look`）
- `speed`：`gallop` 快跑、`walk` 慢走的速度
- `routes`：騎馬路線。`loop: true` 繞圈，`false` 來回
- `shout`：騎馬時頭上冒出的話
- `caught`：被抓住時說的話，說完問「是不是政大學生」（`askStudent`）
- `notStudent`、`alreadyDone`、`cooldown`、`invite`、`decline`：各種情況的回應
- `quiz`：題目。`q` 題目、`options` 選項、`answer` 正確答案是第幾個（從 0 開始數）。`shuffle: true` 時每次出題會打亂選項順序
- `pass`、`fail`：全對、沒全對時說的話。`fail` 裡的 `{score}` 會換成答對題數
- `retrySeconds`：沒全對之後要等幾秒才能再挑戰
- `letter`：全對拿到的「精神堡壘任務信函」，`lines` 是點開信函看到的內容

全對時遊戲狀態 `state.haveLetter` 會變成 `true`，之後要做精神堡壘任務可以用這個判斷。

## weather.json：天氣（石獅子、下雨、偷傘、淋雨體力、噴水磁磚）

程式在 `src/systems/weather/`。流程：走到中正圖書館前（`lion.trigger` 範圍內）→ 離主角比較近的那隻石獅子跳下台座講話 → 不管選哪個都會下雨。

- `lion`：石獅子的台詞、兩個選項（`choices`）和各自的回應（`replies`，順序對應選項）、`cooldownSeconds` 雨停之後多久才會再觸發
- `rain`：下雨秒數、`drainPerSecond` 淋雨時每秒扣多少體力（滿分 100）、`soaked` 體力扣光時的結局
- `umbrella`：下雨後眼前出現一把雨傘，撐起來就不會淋濕；`copDelaySeconds` 秒後駐校警察衝過來
- `cop`：警察的台詞、兩個選項。選「跟他走」是結局 `arrested`；選「拒絕」進入戰鬥，`win`、`lose`、`run` 是戰鬥結束後的提示
- `tile`：下雨時在四維道上走路，每秒有 `chancePerSecond` 的機率踩到噴水磁磚，結局 `ending`
- `battle`：跟警察的戰鬥，格式同 missionaries.json 的 `battle`。新招式欄位 `skip: true` 表示什麼都不做（例如睡覺）。新特效 `donut`（吃甜甜圈）、`ticket`（紅單）、`sleep`（睡覺）

室內（四維堂）不會淋雨，雨停後沒撐傘也不會再扣體力。

## swimming.json：游泳館（換泳衣、救生員、下水）

房間在 `src/world/buildings/swimming-hall/interior.js`，規則在 `src/systems/swimming/`。

- 游泳館裡的 NPC（櫃檯阿姨、英文系溫同學、救生員）在 `npcs.json`，用 `"room": "swimming-hall"`
- `lifeguard`：沒穿泳衣靠近池邊時救生員的台詞、三個選項（換泳衣、跟救生員戰鬥、算了）、戰鬥結束後的回應、`cooldownSeconds` 擋人之後多久才會再擋
- `locker`：更衣室置物櫃前的按鈕文字和提示
- `battle`：跟救生員的戰鬥，格式同 missionaries.json。新特效 `whistle`（吹哨子）、`buoy`（丟救生圈）

穿泳衣（`state.outfit === 'swim'`）或打贏救生員之後才能下水。離開游泳館時自動換回衣服。
- `race`：跟英文系溫同學比游泳。要先換泳衣；一直按「划水！」（或空白鍵、E）加速。`maxSpeed` 前半段最快速度、`wenSpeed` 溫同學的速度、`tiredAt` 游到多少比例開始沒力、`tiredSpeed` 沒力後最快速度。照預設數值溫同學一定贏，輸了他說 `lose`

## wenz.json：遊戲製作人 Wenz

站在四維堂旁的廊道，頭上掛著「這個遊戲好玩嗎？」。程式在 `src/systems/wenz/`。

- `ask`、`choices`：開場和兩個選項（爛透了、超好玩）
- 選「爛透了」：`angry` 之後進入戰鬥，Wenz 只會一招 `破壞死光`（特效 `deathray`，傷害 999），戰鬥後說 `after`
- 選「超好玩」：說 `happy`（提示去操場、游泳池）
- 兩條路最後都有 `contact` 選項，第一個會開 `instagram` 網址

