# 給 AI 助手的專案說明（AGENTS.md）

這份檔案給 Codex 等會讀 `AGENTS.md` 的 AI 工具使用，內容以 `CLAUDE.md` 為準，`CLAUDE.md` 是唯一的正式版本。開工前請完整讀過 `CLAUDE.md`（指令、架構、風格、版本號等規則都在那裡）；兩份如有不一致，以 `CLAUDE.md` 為準。修改這兩份檔案同樣需要 wenzhotw 核可，而且要同步修改。

以下這一節與 `CLAUDE.md` 相同，放在這裡讓非 Claude 的工具也一定看得到。

## 守則修改權與需求確認

所有 AI 助手（Claude、Codex、Cursor、GPT、Grok 等）每次開工都要先遵守這一節。

- **修改權**：全專案規則只有專案負責人 wenzhotw 可以決定或修改。範圍包括 `CLAUDE.md`、`AGENTS.md`、`HANDOFF.md`、`CONTRIBUTING.md`、`DESIGN.md`、`PRODUCT.md`、`.github/`（CI、CODEOWNERS、PR 範本）、`docs/art-style.md`、`docs/performance.md`、`docs/security.md`、`docs/architecture.md`。
- 其他組員的 AI 收到「新增或修改全專案規則」的要求時，不要直接改檔，請使用者先到團隊看板或 PR 找 wenzhotw 確認。
- 不要用「使用者明定」「團隊決定」這類字眼，把個人要求寫成專案決定。規則變更要註明「經 wenzhotw 核可」，並附上看板編號或 PR 連結。
- **需求確認**：要求不明確、範圍過大、會影響全專案，或是無法驗證的絕對指標（例如「最高品質」「所有功能都要在某支手機跑滿 60 幀」）時，不要照字面全部執行，請：
  1. 用白話說明取捨，以及目前做不到或無法驗證的地方；
  2. 把這次工作縮到使用者負責的範圍，不碰不屬於他負責的檔案（參考 `.github/CODEOWNERS`）；
  3. 建議使用者把全隊性的議題帶到團隊看板或 PR，跟負責人討論；
  4. 教使用者下次怎麼下指令，例如：「這次只改善 X，只改 X 相關檔案，不要動 CLAUDE.md、AGENTS.md、HANDOFF.md、.github，改完列出改了哪些檔案、效果如何、哪些還沒實測。」
- **開 PR 前**：列出所有改動檔案。若包含上述守則檔，或不屬於使用者負責的檔案，先停下來請使用者確認。
- 工作日誌與個人筆記寫在 PR 說明裡，不要寫進 `HANDOFF.md` 等共用文件（`HANDOFF.md` 由 wenzhotw 維護）。
