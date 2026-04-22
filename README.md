# Todo Reminder

> 一個常駐桌面、會在正確時間戳你的個人任務助理。

基於 **Tauri v2 + React + SQLite** 構建的輕量級 Windows 桌面應用。
定位是**自用開發效率工具**，不是通用產品。

---

## 特性

- 🗂️ **看板視圖**：今天 / 本週 / 待辦 / 完成，四列一覽
- ⏰ **Windows 原生通知**：到點彈出系統通知，支援「完成 / 稍後 / 打開」動作按鈕
- 🏷️ **標籤 + 優先級**：多標籤、四級優先度，快速篩選
- ✅ **子任務**：一層子任務，拆分大工作
- 🖥️ **系統托盤常駐**：關閉不退出，永遠陪伴
- 🚀 **開機自啟**：系統登入自動啟動並最小化
- 💾 **純本地儲存**：SQLite 單檔資料庫，零雲端依賴，可隨意備份
- ⚡ **輕量**：打包 ~10MB，記憶體佔用 < 100MB

---

## 技術棧

| 層 | 技術 |
|---|---|
| 桌面框架 | Tauri v2 |
| 前端 | React 18 + TypeScript + Vite |
| 樣式 | Tailwind CSS + shadcn/ui |
| 狀態 | Zustand |
| 後端 | Rust |
| 資料庫 | SQLite（經 `tauri-plugin-sql`）|

完整技術決策見 [`plan.md`](./plan.md)。

---

## 環境要求

| 工具 | 最低版本 | 備註 |
|---|---|---|
| Windows | 10 (Build 1809+) | WebView2 需要 |
| WebView2 Runtime | 最新 | Windows 11 / 最新版 Windows 10 已預裝 |
| Node.js | 18+ | 推薦 20 LTS |
| pnpm | 8+ | 用 npm/yarn 也行，但 lockfile 用 pnpm |
| Rust | 1.77+ | `rustup default stable` |
| Visual Studio 生成工具 | 2019+ | 含 C++ 工具鏈（`Desktop development with C++`）|

---

## 快速開始

### 1. 取得代碼

```powershell
cd D:\projects\todo-reminder
```

### 2. 安裝依賴

```powershell
# 前端
pnpm install

# Rust 依賴在首次編譯時自動下載
```

### 3. 開發模式

```powershell
pnpm tauri dev
```

第一次啟動 Rust 會編譯 Tauri + 所有依賴，通常需要 **3–8 分鐘**。後續增量編譯只需幾秒。

### 4. 打包 Release

```powershell
pnpm tauri build
```

產物位置：
```
src-tauri/target/release/todo-reminder.exe        # 單檔可執行
src-tauri/target/release/bundle/msi/*.msi         # MSI 安裝包
src-tauri/target/release/bundle/nsis/*.exe        # NSIS 安裝包
```

---

## 目錄結構

```
todo-reminder/
├── plan.md            # 產品與實施計劃
├── AGENT.md           # AI 助理背景資料
├── README.md          # ← 本文件
├── src/               # React 前端
│   ├── views/         # 頁面（看板、設定、詳情）
│   ├── components/    # 共用組件
│   ├── stores/        # Zustand store
│   └── api/           # Tauri invoke() 封裝層
├── src-tauri/         # Rust 後端
│   ├── src/
│   │   ├── commands/  # IPC command handlers
│   │   ├── services/  # 業務邏輯
│   │   ├── db/        # SQLite
│   │   ├── scheduler.rs
│   │   └── tray.rs
│   └── migrations/    # SQL migrations
└── docs/              # 補充設計文檔
```

---

## 常用命令

```powershell
# 開發
pnpm tauri dev              # 啟動開發模式（熱更新前端 + 熱重載後端）

# 構建
pnpm tauri build            # 完整構建 + 打包
pnpm build                  # 只構建前端（不打包桌面）

# Rust
cd src-tauri
cargo check                 # 快速語法檢查
cargo clippy                # lint
cargo fmt                   # 格式化
cargo test                  # 跑測試

# 前端
pnpm lint                   # ESLint
pnpm typecheck              # tsc 無輸出檢查
pnpm format                 # Prettier
```

---

## 資料與備份

資料庫路徑（Windows）：

```
%APPDATA%\com.lenvovo.todo-reminder\todo.db
```

完整路徑示例：
```
C:\Users\<用戶名>\AppData\Roaming\com.lenvovo.todo-reminder\todo.db
```

備份 = 複製這個 `.db` 檔案。還原 = 貼回去。

---

## 鍵盤快捷鍵（Planned）

| 快捷鍵 | 動作 |
|---|---|
| `Ctrl+N` | 新增任務 |
| `Ctrl+F` | 搜尋 |
| `Ctrl+,` | 開啟設定 |
| `Ctrl+Shift+T` | 全局呼出快速新增（後台都生效） |
| `Esc` | 關閉當前彈窗 |
| `Enter` | 編輯中的任務 → 保存 |

---

## 路線圖

- **v0.1** — MVP：CRUD / 看板 / 提醒 / 托盤 / 自啟
- **v0.2** — 全局快捷鍵、自然語言時間解析、週期任務
- **v0.3** — 可選雲同步（WebDAV / S3）
- **v0.4+** — Pomodoro、移動端、AI 任務拆解

詳細的範圍與風險點見 [`plan.md`](./plan.md)。

---

## License

個人項目，暫無授權。作者：Lenvovo。

---

## 常見問題

**Q: 為什麼不用 Electron？**
A: Electron 打包動輒 100MB+，吃 400MB 記憶體。Tauri 打包 10MB，記憶體 < 100MB。單用戶工具沒必要拖這麼大。

**Q: 為什麼是 SQLite 不是 JSON？**
A: 任務量起來後（幾千條以上）JSON 全量讀寫很慢；SQLite 天然支援索引和結構化查詢，一步到位。

**Q: 能跨平台嗎？**
A: 代碼層面 Tauri v2 本來就跨平台，但目前只在 Windows 驗證，macOS/Linux 理論可行、未測試。

**Q: 資料會上傳嗎？**
A: 不會，完全本地儲存。MVP 不含任何網路請求。
