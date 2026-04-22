# Todo Reminder — 實施計劃（Plan）

> 本文件是本項目的**實施路線圖**，負責從「想法」到「可以動工」之間的全部設計決策。
> 編寫時間：2026-04-21 | 狀態：Draft v1 | 文件作者：Lenvovo + Claude

---

## 0. 文件目的

在寫任何代碼之前，把「要做什麼、為什麼這樣做、按什麼順序做、哪裡容易踩坑」寫清楚。
目的有二：
1. **對齊預期**：避免邊做邊改方向，浪費時間。
2. **AI 友好**：搭配 `AGENT.md` 提供給 AI 助理（Claude Code / Cursor 等）做背景知識。

---

## 1. 產品定位（Vision）

**一句話：** 一個**常駐桌面**、能**在正確時間戳我**的個人任務助理，不是一個複雜的項目管理工具。

**目標用戶：** 作者自用。重度開發者 / 技術背景。
**使用場景：**
- 「今天 15:30 要開會」→ 桌面彈窗提醒
- 「明天提醒我回覆某個郵件」→ 第二天的某個時點通知
- 「這週要完成 SQL 重構」→ 在看板上一眼看到，不會忘
- 「今天做了哪些事」→ 歷史記錄可回看

**非目標：**
- ❌ 不做團隊協作（單機、單人）
- ❌ 不做雲同步 MVP（後續迭代可加）
- ❌ 不做統計圖表（統計圖表類功能偏雞肋，要做可操作的工具 — 已確認的用戶偏好）
- ❌ 不做 Gantt/甘特圖、依賴關係
- ❌ 不做移動端

---

## 2. 技術棧（Tech Stack）

### 2.1 框架選型

| 層 | 選擇 | 理由 |
|---|---|---|
| 桌面框架 | **Tauri v2** | 體積小（~10MB），原生性能，Rust 後端 + Web 前端，跨平台（先 Windows） |
| 前端框架 | **React 18 + TypeScript** | 生態廣、組件庫多、類型安全 |
| 構建工具 | **Vite** | Tauri 官方模板預設 |
| 樣式方案 | **Tailwind CSS** | 快速寫 UI、一致性好 |
| UI 組件庫 | **shadcn/ui**（按需引入） | 無運行時依賴、可完全自定義 |
| 狀態管理 | **Zustand** | 輕量、API 直觀，替代 Redux |
| 表單 | **React Hook Form + Zod** | 表單校驗一體化 |
| 日期處理 | **date-fns** | 輕量、tree-shaking 友好，替代 moment |
| 圖標 | **lucide-react** | 輕量 SVG 圖標庫 |
| 本地資料庫 | **SQLite**（經 `tauri-plugin-sql`） | 桌面標配、零運維、支援結構化查詢 |
| 遷移工具 | `tauri-plugin-sql` 自帶 migrations | 免自己寫遷移框架 |

### 2.2 Tauri 插件清單

| 插件 | 用途 |
|---|---|
| `tauri-plugin-sql` | SQLite 訪問 |
| `tauri-plugin-notification` | Windows 系統原生通知 |
| `tauri-plugin-autostart` | 開機自啟 |
| `tauri-plugin-window-state` | 記住視窗大小/位置 |
| `tauri-plugin-dialog` | 文件對話框（匯入匯出用） |
| `tauri-plugin-single-instance` | 防止開啟多個實例 |
| `tauri-plugin-log` | 前後端日誌統一 |

系統托盤用 Tauri v2 內建 `TrayIconBuilder`，不需額外插件。

### 2.3 為什麼**不**選

- **Electron**：體積大、吃記憶體。放棄。
- **Vue**：作者對 React 熟。放棄，但架構上不排斥後續重寫。
- **直接 rusqlite**：少一層封裝但多一堆邊界處理，暫用官方插件減少心智負擔。

---

## 3. 核心功能（MVP）

### 3.1 MVP 必做（v0.1）

**1. 任務 CRUD**
- 新增 / 編輯 / 刪除 / 完成
- 欄位：標題、描述、截止時間、優先級（低/中/高/緊急）、標籤（多對多）、狀態（待辦/進行中/完成/已取消）
- 子任務（最多一層，不做嵌套巢狀 — 避免複雜度爆炸）

**2. 提醒引擎**
- 任務可綁定一或多個提醒（提前 N 分鐘、當下、絕對時間點）
- 到點觸發 **Windows 原生通知**（帶動作：完成 / 稍後提醒 / 打開）
- 後台輪詢：每 30 秒掃一次即將到期的任務

**3. 看板視圖**（主視圖）
- 四列：**今天**（due_date 是今天）、**本週**（接下來 7 天）、**待辦**（無日期或未來）、**完成**（近 7 天）
- 拖拽排序、快速切換狀態
- 頂部搜尋框 + 標籤篩選

**4. 系統托盤常駐**
- 最小化關閉按鈕 → 進入托盤，不退出進程
- 托盤右鍵選單：打開主窗 / 新增任務 / 今日任務數 / 退出
- 左鍵托盤圖標：喚醒主窗

**5. 開機自啟**
- 設定頁可切換開關
- 第一次啟動彈提示讓用戶確認

**6. 主題**
- 亮色 + 暗色主題都實作（MVP 範圍）
- 設定頁手動切換，「跟隨系統」放 v0.2
- 用 Tailwind 的 `dark:` class + CSS variables，不引 theme library

**7. 自然語言時間解析**
- 任務標題/備註中輸入「明天下午 3 點」「next Friday」等，自動抽出為 due_at
- 引 `chrono-node`（JS 庫，支援中英文，但中文覆蓋有限）
- 解析失敗不報錯，回退到傳統日期選擇器

### 3.2 v0.2（MVP 之後）

- **快速新增**：全局快捷鍵（如 `Ctrl+Shift+T`）呼出迷你輸入框，自然語言解析（「明天下午 3 點開會」）
- **週期任務**：每天/每週/每月重複
- **任務模板**：常用任務一鍵生成
- **匯入匯出**：JSON / Markdown 格式

### 3.3 v0.3+（未來）

- 端到端加密雲同步（可選，WebDAV / S3）
- Pomodoro 番茄鐘與任務關聯
- 打標籤快速過濾 UI
- 移動端伴侶 App（Tauri 2.0 支援 iOS/Android，共用前端代碼）

---

## 4. 資料模型（Data Model）

### 4.1 ER 設計

```
tasks ─┬─< subtasks
       ├─< reminders
       └─< task_tags >─── tags

settings (單行 K-V)
activity_log (操作歷史)
```

### 4.2 表結構（SQLite DDL 草稿）

```sql
-- 主任務
CREATE TABLE tasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    description     TEXT,
    status          TEXT    NOT NULL DEFAULT 'todo',    -- todo / doing / done / cancelled
    priority        INTEGER NOT NULL DEFAULT 1,          -- 0=low 1=med 2=high 3=urgent
    due_at          INTEGER,                             -- Unix timestamp (秒)
    completed_at    INTEGER,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);
CREATE INDEX idx_tasks_due    ON tasks(due_at);
CREATE INDEX idx_tasks_status ON tasks(status);

-- 子任務（一層巢狀）
CREATE TABLE subtasks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    done            INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL
);

-- 標籤
CREATE TABLE tags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    color           TEXT    NOT NULL DEFAULT '#6B7280'
);
CREATE TABLE task_tags (
    task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id          INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- 提醒
CREATE TABLE reminders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    remind_at       INTEGER NOT NULL,           -- Unix timestamp
    offset_minutes  INTEGER,                    -- 相對 due_at 的偏移（NULL = 絕對時間）
    fired           INTEGER NOT NULL DEFAULT 0  -- 是否已觸發
);
CREATE INDEX idx_reminders_pending ON reminders(remind_at) WHERE fired = 0;

-- 操作歷史（活動日誌）
CREATE TABLE activity_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         INTEGER,
    action          TEXT    NOT NULL,           -- created / updated / completed / deleted ...
    payload         TEXT,                       -- JSON 快照
    created_at      INTEGER NOT NULL
);

-- 設定（K-V 鍵值儲存）
CREATE TABLE settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL
);
```

### 4.3 時間處理約定

- **資料庫統一存 Unix 秒**（INTEGER），便於比較、索引、排序
- **UI 顯示前轉本地時區**，用 `date-fns` + `Intl.DateTimeFormat`
- **絕不在 DB 存本地時區字串**（時區變更即崩）

---

## 5. 架構（Architecture）

### 5.1 三層劃分

```
┌────────────────────────────────────────────┐
│  前端 (React + TS)                          │
│  - Views: 看板 / 任務詳情 / 設定             │
│  - Store: Zustand                          │
│  - API Layer: 封裝 invoke() / plugin call  │
├────────────────────────────────────────────┤
│  Tauri 橋 (IPC commands)                   │
│  - task_create / task_update / ...         │
│  - reminder_schedule / reminder_cancel     │
│  - tray_menu_click                         │
├────────────────────────────────────────────┤
│  Rust 後端 (src-tauri/src/)                │
│  - commands/   (處理前端請求)                │
│  - services/   (業務邏輯：任務、提醒、通知)    │
│  - db/         (SQLite 存取, migrations)    │
│  - scheduler/  (提醒輪詢 tokio::interval)    │
│  - tray/       (系統托盤)                    │
└────────────────────────────────────────────┘
```

### 5.2 提醒調度（Reminder Scheduler）

- 程序啟動時，跑一次 Tokio `interval(30s)` 背景任務
- 每次 tick：
  1. 查 `reminders WHERE fired=0 AND remind_at <= now()`
  2. 對每條觸發 Windows 通知
  3. 更新 `fired=1`
- 優點：簡單可靠；缺點：最差 30 秒延遲（足夠）
- **不用** OS-level scheduler（Task Scheduler 太複雜、需要處理睡眠喚醒等邊界）

### 5.3 關閉到托盤 vs 真正退出

- 視窗關閉 `onCloseRequested` → `event.preventDefault()` → `window.hide()`
- 托盤選單「退出」→ 呼叫 `app.exit(0)`
- 開機自啟時用 `--minimized` 參數，啟動不顯示主窗

---

## 6. 目錄結構（Planned）

```
D:\projects\todo-reminder\
├── plan.md              <-- 本文件
├── README.md            <-- 用戶向文檔
├── AGENT.md             <-- AI 助理背景資料
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
│
├── src/                 <-- 前端 (React)
│   ├── main.tsx
│   ├── App.tsx
│   ├── views/
│   │   ├── KanbanView.tsx
│   │   ├── TaskDetailView.tsx
│   │   └── SettingsView.tsx
│   ├── components/
│   │   ├── TaskCard.tsx
│   │   ├── TaskForm.tsx
│   │   ├── TagPicker.tsx
│   │   └── ...
│   ├── stores/
│   │   ├── taskStore.ts
│   │   └── settingsStore.ts
│   ├── api/
│   │   └── tauri.ts      <-- 封裝所有 invoke() 呼叫
│   ├── lib/
│   │   ├── datetime.ts
│   │   └── utils.ts
│   └── styles/
│       └── globals.css
│
├── src-tauri/           <-- 後端 (Rust)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── icons/
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   └── ...
│   └── src/
│       ├── main.rs
│       ├── commands/
│       ├── services/
│       ├── db/
│       ├── scheduler.rs
│       └── tray.rs
│
└── docs/                <-- 設計文檔補充
    └── screenshots/
```

---

## 7. 里程碑（Milestones）

| 階段 | 範圍 | 預計天數（業餘時間） |
|---|---|---|
| **M0 — 文檔** | plan.md / README.md / AGENT.md | 0.5 |
| **M1 — 骨架** | Tauri 專案初始化、CI/Lint、SQLite 跑通、Hello world 打包 | 1 |
| **M2 — CRUD** | 任務、子任務、標籤的完整 CRUD + 看板四列 | 2 |
| **M3 — 提醒** | 提醒綁定、Scheduler、Windows 通知 | 1 |
| **M4 — 托盤 + 自啟** | Tray、窗口管理、開機自啟 | 1 |
| **M5 — 拋光** | 鍵盤快捷鍵、搜尋、空態、錯誤處理、打包安裝包 | 1.5 |
| **v0.1 釋出** | 自用 | — |
| **M6+** | v0.2 / v0.3 按需要排 | — |

---

## 8. 風險與決策點（Risks & Open Questions）

### 8.1 已知風險

1. **睡眠/休眠後 scheduler 漏觸發**
   - Tokio interval 在系統睡眠時不 tick
   - 解法：啟動時 + 喚醒事件時，補掃一次所有 `remind_at <= now()` 的未 fire 提醒
   - Tauri 有 `app.on_window_event` 但沒有直接的 power resume hook，需要註冊 Windows Power Notification（後續 M3 研究）

2. **通知點擊動作的 deep-link**
   - 通知上的「完成」按鈕要回到 app 內部處理
   - `tauri-plugin-notification` v2 支援 action buttons，需要綁好 handler
   - 萬一 app 沒開，要能喚醒它並執行動作

3. **單實例 + 自啟參數衝突**
   - 自啟時 `--minimized` 只在第一次實例生效
   - `single-instance` 插件要把後續的參數 forward 到第一個實例
   - 測試路徑：自啟啟動 → 手動雙擊 icon → 應該喚醒，而不是開新窗

### 8.2 待決策（做的時候再拍）

- [x] **優先級採 0-3**（2026-04-21 拍板）：0=low / 1=med / 2=high / 3=urgent
- [x] **自然語言時間解析納入 MVP**（2026-04-21 拍板）：用 `chrono-node` 解析「明天下午 3 點」「next Friday」等；中文支援有限時退化為傳統日期選擇器
- [x] **主題：亮暗都做**（2026-04-21 拍板），跟隨系統可後期加
- [ ] 是否要在通知上顯示任務標籤顏色？（Windows 通知支援有限）

---

## 9. 開發規範（Dev Conventions）

### 9.1 代碼風格
- TS: ESLint + Prettier，Prettier 默認值
- Rust: `cargo fmt` + `cargo clippy -- -D warnings`
- 中英文混合寫代碼：**命名用英文**，業務層的註釋可以用中文

### 9.2 提交規範
- Conventional Commits：`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`
- 暫不接 commitlint hook，自覺遵守

### 9.3 測試
- MVP 階段**不寫單元測試**（速度優先）
- M5 收尾時補關鍵路徑：scheduler、時區處理、SQL migration

### 9.4 不做的事
- 不做錯誤上報（單用戶，出事就開日誌看）
- 不做埋點分析
- 不做多語言 i18n（作者中文英文通用，寫死即可）

---

## 10. 下一步

1. 寫完 `README.md` 和 `AGENT.md` — **當前**
2. 執行 M1：`pnpm create tauri-app` 起骨架，跑通 hello world
3. 寫 `migrations/001_init.sql`，跑 migration
4. 從最簡單的任務列表開始，每次 commit 推進一小步
