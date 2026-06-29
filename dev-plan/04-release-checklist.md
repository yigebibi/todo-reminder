# 04 — 对外发布检查清单

> 每个 **minor 版本**走「技术发布清单」；**v1.0** 额外走「产品发布清单」。  
> 复制本页到 Issue 或 Release 说明中逐项勾选。

---

## A. 每次版本发布（技术清单）

### A.1 代码与质量

- [ ] 所有计划内功能已合并到 `main`
- [ ] `pnpm lint` / `pnpm typecheck` 通过
- [ ] `cargo clippy` 无新增 warning（Release 配置）
- [ ] 关键路径测试通过（若有新增测试）
- [ ] `CHANGELOG.md` 已更新（`[Unreleased]` → 版本区块）
- [ ] 版本号已 bump：`package.json`、`Cargo.toml`、`tauri.conf.json`
- [ ] Commit：`chore(release): vX.Y.Z`
- [ ] Git tag：`vX.Y.Z`

### A.2 构建与产物

- [ ] `pnpm tauri build` 本地通过
- [ ] Windows：MSI + NSIS 安装包可安装、可卸载
- [ ] （若本版含 macOS）DMG 可安装、通知/托盘验证
- [ ] 安装包文件名含版本号
- [ ] Release Notes 从 CHANGELOG 摘录用户可读摘要

### A.3 冒烟测试（Windows 最低集）

- [ ] 冷启动 < 5s（二次启动）
- [ ] 创建任务 + 设提醒 + 收到系统通知
- [ ] 托盘：最小化、右键菜单、退出
- [ ] 开机自启开关（若测环境允许）
- [ ] 亮/暗主题切换
- [ ] 看板 ↔ 月历切换
- [ ] 备份文件生成（若本版含备份功能）

### A.4 发布动作

- [ ] `git push origin main`
- [ ] `git push origin vX.Y.Z`
- [ ] GitHub Release 创建并上传安装包
- [ ] README 版本号/截图更新（若有 UI 大改）

---

## B. v1.0 产品发布清单（在 A 之上）

### B.1 产品定位

- [ ] README 首段改为通用产品表述（非「自用工具」）
- [ ] 官网或 GitHub Pages 上线（下载 + 截图 + 特性）
- [ ] 产品名称、图标、Bundle ID 最终确认
- [ ] 若 Bundle ID 变更：提供数据迁移说明或一键迁移

### B.2 法律与合规

- [ ] `LICENSE` 文件（MIT / 其他已定案许可）
- [ ] `PRIVACY.md` 或 `docs/privacy.md`：
  - [ ] 数据存储位置（本地 SQLite 路径）
  - [ ] 网络请求披露（天气 IP 定位、更新检查、可选 Sentry）
  - [ ] 无出售用户数据声明
- [ ] 设置页「隐私政策」「开源许可」链接
- [ ] 第三方依赖与服务列表（Open-Meteo、ipapi 等）

### B.3 用户文档

- [ ] 安装指南（Windows + macOS）
- [ ] 快速开始（3 分钟）
- [ ] 备份与还原
- [ ] 导入导出
- [ ] 快捷键列表
- [ ] FAQ（至少 10 条常见问题）
- [ ] 已知限制（时区行为、中文 NL 解析局限等）

### B.4 国际化

- [ ] 简中 / 繁中 / 英文界面完整
- [ ] 默认语言跟随系统（可选手动覆盖）
- [ ] CHANGELOG 至少有英文摘要

### B.5 平台与签名

- [ ] Windows 10 21H2+ 测试通过
- [ ] Windows 11 测试通过
- [ ] macOS 最近两个 major 测试通过
- [ ] Windows 代码签名（或文档说明未签名风险）
- [ ] macOS 公证（或文档说明 Gatekeeper 绕过步骤）

### B.6 工程基线

- [ ] GitHub Actions：PR 检查 + tag 自动构建
- [ ] Dependabot 启用
- [ ] Issue 模板：Bug Report / Feature Request
- [ ] 安全漏洞报告方式（SECURITY.md 或 README 段落）

### B.7 支持与反馈

- [ ] GitHub Issues 开启并分类标签
- [ ] 用户反馈渠道说明（Issue / Discussion / 邮件）
- [ ] 可选：Discussions 区「问答」

### B.8 营销素材（最低限度）

- [ ] 3–5 张产品截图（亮/暗、看板、月历）
- [ ] 30 秒 GIF 或短视频（创建任务 → 提醒）
- [ ] 一句话 Slogan + 三条核心卖点

---

## C. 发版后 48 小时

- [ ] 监控 GitHub Issues 有无安装失败报告
- [ ] 检查 Release 下载次数（若有 analytics）
- [ ] 修复 blocker 时发 `vX.Y.Z+1` patch，不拖延
- [ ] 将用户反馈记入 backlog（`dev-plan/03-roadmap.md` Backlog）

---

## D. 不建议在 v1.0 做的事

以下可写进「未来版本」而非阻塞 v1.0：

- Microsoft Store / Mac App Store 正式上架
- 完整 WebDAV 双向同步
- 团队协作
- 移动端
- 付费墙（除非商业模式已提前 2 个版本预埋）

---

## E. 参考命令

```powershell
# 版本 bump
./scripts/bump-version.ps1 1.0.0

# 本地完整构建
pnpm tauri build

# 发版提交
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore(release): v1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

Git 分支与合并规范见 [`docs/GIT.md`](../docs/GIT.md)。
