# Changelog

本專案所有重要變更會記錄在此檔案。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### Planned
- M5：打包 MSI / NSIS 安裝器，驗證 release 版本 AUMID 能否由安裝器自動綁定
- v0.2：子任務 UI、標籤 UI、多提醒、通知 action buttons、全域快捷鍵

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
