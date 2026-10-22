# 包種茶節小遊戲資料格式（v1.67 起）

資料檔：`src/content/baozhong-minigames.json` 的 `games` 陣列，一攤一筆。共用欄位：

- `booth`：攤位 id（D01 到 D37）。
- `type`：`matching`、`classify`、`situation`、`sort`、`spot`、`build` 之一。
- `title`：遊戲標題，含學系名稱。
- `intro`：1 到 2 句開場，每句 `{ "text", "trace" }`，`text` 必須和 `trace.quote` 一字不差，而且要出自 `baozhong.json`。開場不能直接洩漏答案。
- `pool.prompt`：遊戲題目轉成關主、大會考選擇題時的題幹樣板。
- `advanced`：可省略。進階獎勵（茶罐）用途待 Wenzel 決定，新攤位不要填 `reward`。
- `pending`：可省略，寫還沒查證或需要人看過的事。

## 依據（每一個答案都要有）

每張卡、每一步都要有下列其中一種依據，可以同時有多種：

- `trace`：`{ "path": "D03.features.0", "quote": "…" }`，`quote` 必須逐字出現在 `baozhong.json` 該欄位。可以是陣列。系所事實（課程、活動、單位、數字）只能用這種。
- `invented`：一句話說明這是假想教學例子，例如「假想迷因，用來練習找出隱藏預設，不是系上教材」。假想情境的題目或標題要讓玩家看得出是假想。
- `general`：一句話說明這是一般知識（例如韓文字母怎麼拼、二進位怎麼算），不是系所事實；寫上需要誰複核。

不可以寫出 `baozhong.json` 沒有的系所事實（課名、活動、合作單位、招生數字等）。

## 新模板

### sort（排序）
把 3 到 5 張卡排成正確順序。玩家一次點一張放進下一格；第一次就放對的格子才計分，放錯會說明並讓玩家再選。

```json
{ "booth": "D22", "type": "sort", "title": "…", "intro": [ … ],
  "cards": [ { "id": "y1", "text": "大一大二修必修", "explain": "…", "trace": { … } }, … ],
  "pool": { "prompt": "傳院不分系的四年路線：「{prev}」之後是哪一步？" } }
```
`cards` 照正確順序排列。`explain` 是放對這張時顯示的一句說明。

### spot（找錯）
每一步給一段短文，切成 3 到 4 段（`segments`），玩家點出有問題的那一段。

```json
{ "booth": "D14", "type": "spot", "title": "…（假想調查）", "intro": [ … ],
  "steps": [ { "id": "s1", "prompt": "哪一段讓這份調查結果會偏？",
    "segments": ["想知道全校最愛哪種茶", "只問了排隊買茶的人", "共問了 50 人"],
    "answer": 1, "explain": "…",
    "feedback": ["點到這段時的說明", "…", "…"], "invented": "…" } ],
  "pool": { "prompt": "{prompt}" } }
```
每段不超過 30 字。`feedback` 數量要和 `segments` 相同。每攤 2 到 3 步。

### build（組合）
每一步給 4 到 6 個零件（`parts`），玩家依序點零件拼出答案，點「送出」檢查；第一次送出就對才計分。

```json
{ "booth": "D27", "type": "build", "title": "…", "intro": [ … ],
  "steps": [ { "id": "ga", "prompt": "用子音和母音拼出「가」",
    "parts": ["ㄱ", "ㄴ", "ㅏ", "ㅗ"], "target": [0, 2],
    "answerText": "ㄱ＋ㅏ", "distractors": ["ㄴ＋ㅏ", "ㄱ＋ㅗ"],
    "explain": "…", "general": "韓文基本拼法，請韓文系複核" } ],
  "pool": { "prompt": "{prompt}" } }
```
`target` 是零件索引的正確順序（可以重複使用同一個零件）。`answerText` 與 2 個 `distractors` 用在關主、大會考的選擇題，三者要互不相同。每攤 2 到 3 步。

## 寫作規則
- 繁體中文、全形標點，不使用破折號。
- 面向高中生，手機上一眼讀得完：卡片與段落盡量 20 字內。
- 政治、法律、民族等題材保持中立，不指涉真實人物、案件、族群或政黨。
- 每攤 30 到 60 秒玩完。
