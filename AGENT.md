# AGENT.md — AI 助理的項目背景手冊

> 本文件是給 AI 編程助理（Claude Code / Cursor / Copilot / 其他）讀的。
> 目的是讓 AI 一進來就知道「這個項目是什麼、約定是什麼、不要做什麼」。
> **人類維護者偶爾也會看，但主受眾是 AI。**

---

## 1. 這是什麼項目

一個**單用戶、桌面、離線**的任務提醒工具。Windows 優先。
作者：Lenvovo（Java/後端背景為主，前端現學現用）。

**核心價值**：到點彈通知、不用開瀏覽器、關閉後仍常駐後台。

**核心反設計**：不做協作、不做圖表統計、不做雲同步（MVP）、不做移動端（MVP）。

---

## 2. 技術棧速查

| 層 | 選擇 | 版本約束 |
|---|---|---|
| 桌面 | Tauri | v2.x（**不用 v1**） |
| 前端 | React | 18 |
| 前端語言 | TypeScript | 5.x，strict mode |
| 構建 | Vite | 5+ |
| 樣式 | Tailwind | 3.x |
| UI 元件 | shadcn/ui | 按需複製進 `src/components/ui` |
| 狀態 | Zustand | 4.x |
| 後端 | Rust | stable 1.77+ |
| DB | SQLite | 經 `tauri-plugin-sql` v2 |
| 包管理 | pnpm | 8+ |

**寫 Tauri 前務必確認用的是 v2 API，不是 v1**。兩者 API 差異很大，v1 文檔會誤導 AI。

---

## 3. 專案結構地圖（AI 常需要找東西）

```
src/                        # 前端
├── main.tsx                # React 入口
├── App.tsx                 # 路由根
├── views/                  # 頁面級組件
├── components/             # 共用組件
│   └── ui/                 # shadcn 複製進來的底層組件
├── stores/                 # Zustand store（taskStore, settingsStore）
├── api/tauri.ts            # ★ 所有 invoke() 呼叫集中於此，不散落
├── lib/                    # 純函數工具（datetime、格式化等）
└── styles/globals.css      # Tailwind 入口

src-tauri/                  # Rust 後端
├── Cargo.toml
├── tauri.conf.json         # Tauri 配置（插件白名單在此）
├── migrations/             # SQL migrations（按 001_xxx, 002_xxx 編號）
└── src/
    ├── main.rs             # 入口，註冊 plugins + commands
    ├── commands/           # IPC 命令（task, tag, reminder, settings）
    ├── services/           # 業務邏輯層
    ├── db/                 # 連線池、封裝查詢
    ├── scheduler.rs        # 提醒輪詢 tokio task
    └── tray.rs             # 系統托盤
```

---

## 4. 關鍵約定（必讀）

### 4.1 IPC 邊界

- **前端對後端的呼叫全部集中在 `src/api/`** 目錄，不允許在 views/components 直接 import `@tauri-apps/api` 或 `@tauri-apps/plugin-*`
- **資料存取走 `tauri-plugin-sql`**（JS 端直連 SQLite，不經 Rust 自訂 command）。MVP 階段為了速度，任務/標籤/子任務等純 CRUD 都從 JS 跑 SQL。
- **Rust 自訂 command 只用於「需要 Rust 運行時的場景」**：提醒 scheduler、系統托盤、通知分發、全局快捷鍵、開機自啟管理。
- 這個簡化違反 plan.md 5.1 最初的「全 command-based」設計，是 M2 開工時的務實折衷。當 SQL 邏輯複雜到需要 transaction 封裝時再把對應模組搬進 Rust。
- 每個 command 要有對應的 TS 類型，後端用 `serde` 導出，前端手寫 interface 匹配（目前不引 typeshare，後續 M5 再加）

### 4.2 資料庫

- 用 **Unix 秒（INTEGER）** 存時間戳，UI 層才轉本地時區
- Schema 變更**必須**走 migrations 文件，**禁止**直接改 init.sql
- 查詢寫原生 SQL，不上 ORM（Diesel / sea-orm 太重）

### 4.3 時間處理

- Rust 側：`chrono` 的 `DateTime<Utc>` + `Utc::now().timestamp()`
- TS 側：`date-fns` + `new Date(unixSeconds * 1000)`
- **絕對不要**在 DB 存本地時區字串或 ISO 8601 字串

### 4.4 樣式

- 色彩、間距全走 Tailwind class，**不寫自訂 CSS**（除非真的無可避免）
- 深色主題優先，亮色主題後期再加
- 引 shadcn 組件時，複製進 `src/components/ui/`，不要裝 npm 包

### 4.5 錯誤處理

- Rust 返回 `Result<T, String>`，錯誤訊息中文（用戶向）
- 前端 catch 後用 toast 顯示，不要 `alert()`
- 日誌用 `tauri-plugin-log`，前後端統一寫到檔案，別用 `println!` / `console.log`

### 4.6 命名

- TS: `camelCase` 變數、`PascalCase` 類型/組件、`SCREAMING_SNAKE` 常量
- Rust: `snake_case` 變數/函數、`PascalCase` 類型
- IPC command：`动词_名词`，如 `task_create`、`reminder_schedule`（Rust 側 snake_case、TS 側直接用字串 match）

---

## 5. 不要做的事（AI 經常誤做的地方）

❌ **不要**用 Tauri v1 API。別 import `@tauri-apps/api/tauri`，v2 是 `@tauri-apps/api/core`。
❌ **不要**加單元測試到 MVP 階段的任務清單裡。測試放到 M5 收尾再統一補。
❌ **不要**引入新依賴卻不更新 `plan.md` 的技術棧章節。
❌ **不要**自作主張改 `plan.md` 的核心決策（技術棧、資料模型）。有疑問先問用戶。
❌ **不要**加 i18n、埋點、錯誤上報這類 MVP 外功能。
❌ **不要**重構「可以工作的」代碼，除非是當前任務的必要步驟。
❌ **不要**在 Rust 裡用 `unwrap()`，用 `?` + 明確的 error type。
❌ **不要**直接 `println!` 調試，用 `log::info!` / `log::error!`。
❌ **不要**寫多段 docstring 或多行註釋。一行說明就夠。
❌ **不要**創建新的 `.md` 說明文檔，除非用戶明確要求。

---

## 6. 對話中要做的事

✅ 每次修改**多個文件**時，先列 plan 給人確認
✅ 遇到 `plan.md` 沒覆蓋的決策（資料格式、新 UI 流程等），**先問、再寫**
✅ 寫代碼前先說一句話：「我要做 X，會改 A/B/C 文件」
✅ 寫完後一句話總結：改了什麼、下一步是什麼
✅ 遇到無法驗證的 UI 改動，**明確告知**「沒測過，請人工確認」

---

## 7. 常用命令速查

```powershell
# 啟動開發
pnpm tauri dev

# 快速 Rust 檢查（不編譯）
cd src-tauri && cargo check

# 前端類型檢查
pnpm typecheck

# 格式化
pnpm format
cd src-tauri && cargo fmt

# Lint
pnpm lint
cd src-tauri && cargo clippy -- -D warnings

# 打包
pnpm tauri build
```

---

## 8. 常見坑位

### 8.1 Windows 通知需要 App User Model ID（dev 模式會踩坑）

發通知前要設定 AppUserModelID，否則 Windows 11 通知可能無法點擊或打包後失效。
`tauri.conf.json` 的 `bundle.windows.wix.upgradeCode` + `identifier` 要一致。

**踩過的雷（2026-04-22）**：`tauri-plugin-notification` 在 dev 模式（exe 跑在 `target/debug` 或 `target/release`）**故意不呼叫 `notification.app_id()`**，只在 installed app 才設。結果 toast 左上角會顯示「Windows PowerShell」而不是我們的 app 名字。

該 plugin 的 Cargo.toml metadata 自己都明寫：
> "Only works for installed apps. Shows powershell name & icon in development."

**治本方法**：不要透過 `tauri-plugin-notification` 發通知，直接用底層的 `notify-rust` 並手動呼叫 `.app_id(APP_AUMID)`。見 `src-tauri/src/scheduler.rs` 的 `fire_due()` 實作。Release 版這樣寫也沒副作用。

AUMID 登錄檔項目（`HKCU:\SOFTWARE\Classes\AppUserModelId\...`）與開始選單 .lnk 上的 `System.AppUserModel.ID` 屬性**不是必要條件** —— Windows 只看 process 發通知時傳的 app_id，能對應到已知 AUMID（比如登錄檔或已安裝 app 的 .lnk）就會顯示正確 app 名稱。我們 dev 階段有註冊登錄檔就夠了。

備用腳本：`scripts/register-aumid.ps1`（萬一要把 app 釘到開始選單時用，平時不需跑）。

### 8.2 開機自啟 + 單實例 + 參數轉發

三者要一起設計。`tauri-plugin-autostart` + `tauri-plugin-single-instance` 一定要同時啟用，否則雙擊托盤 icon 會開新實例。

### 8.3 SQLite 在 Windows 上的 `file://` 路徑

`tauri-plugin-sql` 的連線字串要用 `sqlite:path/to/db`，不是 `sqlite:///...`。相對路徑會相對到 app data dir。

### 8.4 Scheduler 在系統休眠後不會補 tick

Tokio `interval` 睡醒不會補齊錯過的 tick。解法：每次 tick 都查「所有 `remind_at <= now() AND fired=0`」，不依賴 tick 頻率。

### 8.5 WebView2 在某些企業機可能缺失

發佈時要在 installer 裡 bundle WebView2 Bootstrapper，不然用戶安裝可能遇到白屏。
`tauri.conf.json` → `bundle.windows.webviewInstallMode: "embedBootstrapper"`。

---

## 9. 維護者（AI 請讀此節）

- 用戶是 Java / 後端背景，**前端術語可以直接用英文**（component、state、hook 等）
- 用戶喜歡**詳盡完整的文檔**，不要簡陋（這是明確記錄的偏好）
- 用戶明確說過：**統計圖表類功能偏雞肋，要做可操作的工具**
- 用戶對 SQL 很熟，討論資料層時可以直接上 DDL / 查詢，不用解釋語法

---

## 10. 本文件的變更

- **2026-04-21**：初版創建，配合 plan.md v1
- **2026-04-22**：新增 §8.1 的 dev 模式 AUMID 踩坑記錄；新增 §11 版本管理規範
- 後續約定：每次 `plan.md` 有關鍵決策變動時，本文件同步更新第 2-5 節；AI 發現文檔過時**有責任**在回應中提出。

---

## 11. 版本管理規範

### 11.1 版本號單一來源要同步

專案版本號出現在**三個地方**，任何一個漏改都會造成安裝器／app 內顯示／cargo 三者版本號分岔：

1. `package.json` → `"version"`
2. `src-tauri/Cargo.toml` → `[package] version`
3. `src-tauri/tauri.conf.json` → `"version"`

**絕對不要手動改這三處**。一律走腳本：

```powershell
./scripts/bump-version.ps1 0.2.0
./scripts/bump-version.ps1 0.2.0-beta.1
```

腳本會同步三個檔案並印出下一步指示。

### 11.2 SemVer 政策

- `MAJOR.MINOR.PATCH[-PRE]`，遵循 [Semantic Versioning 2.0](https://semver.org/)
- `MAJOR`：資料庫 schema 破壞性變更、DB 檔案不相容、或核心 UX 徹底重寫時 +1
- `MINOR`：新功能、新 view、新 plugin 接入時 +1
- `PATCH`：純 bug fix / 樣式微調 / 文案修正時 +1
- 預發佈階段用 `-alpha` / `-beta.N` / `-rc.N`，穩定版不加後綴

### 11.3 Conventional Commits

commit message 必須以類型前綴開頭，方便日後自動產生 changelog：

| 前綴 | 用途 |
|---|---|
| `feat:` | 新功能 |
| `fix:` | bug 修復 |
| `refactor:` | 不改行為的重構 |
| `docs:` | 只改文檔 |
| `chore:` | 依賴升級、設定檔、版本 bump、雜事 |
| `build:` | 打包 / Cargo features / Vite config |
| `style:` | 純樣式調整（不影響邏輯） |
| `test:` | 測試相關 |
| `perf:` | 效能改善 |

**規則**：
- 標題一行 ≤ 72 字元，句末不加句號
- 破壞性變更在類型後加 `!`，例：`feat(db)!: migrate tasks schema`
- 一個 commit 只做一件事，不要把 feat + fix 混一起
- 中英文都可以，但一個 commit 內保持一致

### 11.4 發版流程（release flow）

```
1. 所有改動 commit 完、本地測試通過
2. ./scripts/bump-version.ps1 <新版本>
3. 編輯 CHANGELOG.md：加新版本區塊，寫 Added / Changed / Fixed
4. git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md
5. git commit -m "chore(release): v<新版本>"
6. git tag v<新版本>
7. （可選）pnpm tauri build 驗證打包能過
8. （未來接遠端）git push && git push --tags
```

### 11.5 CHANGELOG.md 維護規則

- 每個版本一個區塊，章節只列**有內容的**（Added / Changed / Deprecated / Removed / Fixed / Security）
- 未發佈的改動先寫在頂部的 `[Unreleased]` 區塊
- 發新版時把 `[Unreleased]` 內容移到新版本標題下，`[Unreleased]` 重置
- 技術決策 / 踩坑紀錄可以額外寫 `### Technical decisions` 或 `### Known issues` 區塊

### 11.6 發佈產物保留政策（AI 絕對不要刪）

每一版打包產物**永久保留**，不要主動提議刪除或清理。位置：

```
src-tauri/target/release/bundle/msi/Todo Reminder_<VERSION>_x64_en-US.msi
src-tauri/target/release/bundle/nsis/Todo Reminder_<VERSION>_x64-setup.exe
```

- 下一版打包完成後，AI 可能會看到「舊版 installer 還在」，**不要**建議清掉，也不要執行 `cargo clean` 或刪除 `target/release/bundle/` 下面的舊檔
- 這些檔案是**每一版的不可變發佈證據**（重裝舊版 / 比對 bug / 回滾皆需要），跟 git tag 一起構成版本歷史的完整記錄
- `target/` 本身被 `.gitignore`，不受版控保護 ── `cargo clean` 會全部清光，AI 絕對不要主動執行。如果用戶要清，他會自己決定
- 未來如果要騰磁碟空間，是用戶層級的決策，由用戶自己清，AI 不介入
