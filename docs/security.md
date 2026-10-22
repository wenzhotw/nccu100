# 網站安全說明

NCCU100 是放在 GitHub Pages 的純前端遊戲：沒有後端、沒有登入、不收玩家輸入的文字，存檔只在玩家自己的瀏覽器。主要風險不是被入侵資料庫，而是「網頁被塞進別人的程式」與「壞掉的版本被部署上線」。

## 已經做的防護

| 項目 | 做法 | 位置 |
| --- | --- | --- |
| 內容安全政策（CSP） | 只准載入本站程式、GoatCounter 統計（gc.zgo.at）與 Google 字型；禁止外掛物件、改 base、送出表單 | `index.html` 開頭的 `<meta http-equiv="Content-Security-Policy">` |
| 外部連結 | 只開放 nccu.edu.tw、cac.edu.tw、collego.edu.tw 的 https 連結，一律 `noopener noreferrer` | `src/systems/baozhong/booth-browser-ui.js` |
| 文字顯示 | 護照、攤位等會顯示資料的地方用 `textContent` 或 `esc()` 跳脫；`innerHTML` 只放程式內建的固定內容 | 各 UI 檔 |
| 存檔 | 讀檔時檢查格式：座標要是有限數字且在地圖範圍內，旗標與故事只收短字串，排除 `__proto__` 等保留字 | `src/systems/save.js` 的 `sanitize()` |
| 網址參數 | `?debug`、`?perf` 等只當開關用，不把參數內容顯示到畫面 | 各系統 |
| CI 權限 | 測試工作流程只給讀取權限；部署只給 Pages 需要的權限 | `.github/workflows/` |
| 統計 | GoatCounter 不用 Cookie、不記個人資料；本機與自動測試不送出 | `src/systems/analytics.js` |

## 新增功能時的規則

1. **新的外部網域**（字型、統計、圖片、API）要同時加進 CSP，否則瀏覽器會擋下，冒煙測試會因主控台錯誤而失敗。
2. **不要把資料放進 `innerHTML`**。要顯示的文字用 `textContent`；一定要組 HTML 時，資料一律先用 `esc()` 跳脫。
3. **不要加 `<input>` 讓玩家輸入文字後再顯示給其他人看**；目前沒有多人功能，若之後要做，先另外設計審核與跳脫。
4. **不要把金鑰、密碼、個人資料寫進程式或文件**。這個 repo 是公開的，commit 進去就等於公開。
5. **參考照片**只放有權使用的圖片；網路上找到的圖、Google Earth 截圖、別人的照片，留在自己電腦的 `.references/`（已在 `.gitignore`），不要 commit。

## 需要在 GitHub 網站上設定的事（程式改不到）

- **main 分支保護**：Settings → Branches → Add rule（或 Rulesets），勾選「合併前必須通過檢查」，選「檢查 / check」。這樣紅燈的 PR 就不能合併，壞掉的版本也不會被部署。
- **工作流程預設權限**：Settings → Actions → General → Workflow permissions 選「Read repository contents」。
- **Dependabot 與祕密掃描**：Settings → Code security 開啟 Dependabot alerts 與 Secret scanning。
- **協作者權限**：定期看 Settings → Collaborators，只留需要的人，離開專案的人移除。
