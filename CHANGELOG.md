# Changelog

本專案所有重要變更會記錄在此檔案。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### Added
- 子任務 UI：任務表單內可新增 / 編輯 / 刪除 / 排序子任務；看板卡片顯示完成進度（如 2/5）
- 子任務 API：`listSubtaskCounts`、`moveSubtask`（上移 / 下移）
- 標籤 UI：任務表單多選標籤、設定頁標籤管理（增刪改色）、看板卡片與月曆任務顯示彩色 chip / 色點
- 標籤 API：`updateTagColor`、`listTaskTagsMap`
- 多提醒：任務可設多條相對截止時間的提醒；修改截止時間後未觸發提醒自動重算
- 每日自動 DB 備份至 `backups/todo-YYYY-MM-DD.db`，保留 7 天
- 休眠喚醒後立即補發錯過的提醒（Windows power resume 監聽）

### Changed
- Release 建置日誌級別設為 INFO，避免 sqlx DEBUG 洪水

### Planned
- 通知 action buttons（「完成」「稍後提醒」直接從 toast 觸發）
- 全域系統快捷鍵（跨 app 喚起快速新增迷你視窗）

---

## [0.2.0] — 2026-04-23

M5 polish 收尾發佈。UI 手感、錯誤處理、可發現性都有顯著提升，日常使用比 0.1.0 明顯順手。

### Added
- Toast 通知系統（info / success / error 三類，右下角堆疊、自動消失、可手動關）
- React ErrorBoundary 兜底 UI 崩潰（friendly fallback + 重試 / 重載按鈕）
- 看板頂部搜尋框：即時過濾任務標題 / 備註，無結果時顯示空態
- 全域鍵盤快捷鍵：`Ctrl+N` 開進階新增、`Ctrl+F` 聚焦搜尋（typing-aware，不搶焦點）
- 零任務 onboarding：置中歡迎畫面取代 4 個空欄
- 任務 CRUD 失敗會透過 toast 浮現，不只打 console

### Changed
- 以 `CustomEvent` 解耦快捷鍵和 Dialog 狀態，避免為此多開一個全域 store

---

## [0.1.0] — 2026-04-22

第一個可用版本。MVP 功能雛形完成，能安裝到系統正常使用。

> 原計劃標為 `0.1.0-alpha`，但 MSI 打包不支援非數字 pre-release 標籤（Windows Installer 版本必須 `MAJOR.MINOR.BUILD.REVISION` 純數字），所以拉直到 `0.1.0`。下一個開發版走 `0.2.0-1` 或 `0.2.0-2` 數字 pre-release 即可保留 MSI 打包。

### Added
- Tauri v2 + React 18 + TypeScript 專案骨架
- 看板視圖：今天 / 本週 / 待辦 / 近 7 天完成 四欄
- 任務 CRUD（建立、編輯、完成、取消完成、刪除）
- 子任務、標籤的 DB schema 與 API 層（UI 待 v0.2）
- 自然語言時間解析（chrono-node），標題輸入「明天下午 3 點」會自動填截止時間
- 提醒引擎：Rust 側 tokio 30 秒輪詢，到期彈 Windows 原生通知（含聲音 + 應用圖示 + 任務欄閃爍）
- 系統托盤：左鍵顯示主視窗 / 右鍵選單（顯示 / 開機自啟 / 退出）
- 關閉視窗改為隱藏到托盤，真正退出要走托盤選單
- 設定 Dialog：主題（亮/暗）+ 開機自啟切換，設定會持久化
- 自訂無邊框 TitleBar，拖拉 / 最小化 / 最大化 / 關閉
- 亮暗雙主題 + HSL CSS 變數系統

### Technical decisions
- **資料存取直走 `tauri-plugin-sql`（JS 端）**，繞過 Rust command，加快 MVP 迭代
- **通知繞過 `tauri-plugin-notification`，直接呼叫 `notify-rust`**：因為 plugin 在 dev 模式故意不設 AUMID，導致 toast 顯示「Windows PowerShell」。直接呼叫可強制帶 AUMID，dev/release 行為一致
- 時間統一用 Unix 秒（INTEGER）存 DB，UI 層才轉本地時區

### Known issues
- Release 版本的 AUMID 綁定尚未驗證（MSI 安裝器應自動生成 Start Menu .lnk）
- 系統休眠後錯過的提醒會補發（tick 查 `remind_at <= now()`），但跨日跨大塊時間補發行為需再壓測

---

<!--
版本標題格式：
## [MAJOR.MINOR.PATCH[-PRERELEASE]] — YYYY-MM-DD

章節順序（只列有內容的）：
  Added / Changed / Deprecated / Removed / Fixed / Security
-->
