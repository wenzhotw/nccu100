# 包種茶節：跨域學程帳篷與友校交流（v1.70）

依 Wenzel 2026-10-22 指示新增。會場開啟（`bz26_active`）約 0.6 秒後出現，離場就收起。

## 檔案

| 檔案 | 內容 |
| --- | --- |
| `src/content/baozhong-programs.json` | 4 個學程與 4 所友校的台詞、小遊戲、進階題、學系清單與來源。`baozhong.json` 有鎖檔保護，所以另開本檔。 |
| `src/systems/baozhong/programs-logic.js` | 純邏輯：帳篷位置、旗標、結算、護照兩頁、來源檢查。可在 Node 測。 |
| `src/systems/baozhong/programs-tent-model.js` | 帳篷模型（4 格、頂上橫幅、每格櫃台招牌與代表物）。 |
| `src/systems/baozhong/programs-partners.js` | 整合層：建帳篷、碰撞、8 位 NPC，改接 F03 引路人。 |
| `tests/bz26-programs.test.mjs` | 單元測試。真瀏覽器流程在 `scripts/baozhong-smoke.mjs`。 |

## 規則

- 學程代表每次對話第一句都是 `notice`：「校內雙主修，不是正式科系，不能考進來；進政大以後才能申請。」
- 學程章、友校章不算學院勳章、不進大會考、不加茶葉點數；護照另有「跨域學程」「友校交流」兩頁。
- 旗標：學程章 `bz26_pg_<P0x>`、全對 `bz26_pgpf_<P0x>`、進階 `bz26_pgadv_<P0x>`；友校配對 `bz26_pt_F03`、全對 `bz26_ptpf_F03`。
- 每一句事實都要在 `sources` 有官方網址與學年度；示意用的錯誤選項標 `invented`。`sourceErrors()` 會檢查。查不到的寫「待確認」或不寫，不要猜。
- 友校學系清單每年會變：更新時改 `list.items`、`list.year` 與對應來源，學年度要一致（測試會檢查）。

## 位置

- 帳篷：大道西側，噴水池旁活動看板與友校交流帳篷（F03）之間，約 7.2 × 3.2 公尺，正面朝大道。第 1 格（校學士）最靠噴水池。
- 4 位交流大使：F03 正面一排（清華、陽明交大、中央、北藝大），避開 F03 引路人。
- 活動地圖與看板多兩個標記：`FM`（政大之聲電台）、`X`（跨域學程帳篷），座標由各自的純邏輯算出，不另存一份。
