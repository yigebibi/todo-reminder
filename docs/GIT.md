# Todo Reminder — Git 管理规范

> 适用对象：不熟悉 Git 的项目维护人员，以及协助操作的 AI 助手。  
> 最后更新：2026-06-29

---

## 一、基本概念（用白话说明）

| 名词 | 意思 |
|------|------|
| **工作区** | 你电脑上正在改动的文件 |
| **提交（commit）** | 把一组改动「存档」到本地 Git 历史，附一段说明 |
| **推送（push）** | 把本地已提交的改动，上传到远程仓库（GitHub） |
| **拉取（pull）** | 从远程仓库下载别人的最新改动，合并到本地 |
| **分支（branch）** | 用来隔离每次修改；平时在功能分支工作，`main` 只保存稳定版本 |

**记住这个顺序：从 `main` 建分支 → 改代码 → 提交 → 推送分支 → 合并回 `main`**

---

## 二、本项目 Git 配置

| 项目 | 值 |
|------|-----|
| 远程仓库 | `https://github.com/yigebibi/todo-reminder.git` |
| 网页入口 | https://github.com/yigebibi/todo-reminder |
| 主分支 | `main`（稳定版本，不直接提交） |
| 工作分支 | `feature/*`、`fix/*`、`docs/*`、`chore/*` |
| 本地追踪 | `main` → `origin/main` |

> **重要规则：不要直接在 `main` 分支上修改、提交或推送业务代码。** 每次改动必须先从最新 `main` 建立新分支，完成后推送该分支，再由负责人合并回 `main`。

---

## 三、哪些文件要提交、哪些不要

### ✅ 应该提交

- 前端代码：`src/` 目录（组件、视图、stores、样式等）
- 桌面端代码：`src-tauri/src/`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 等
- 配置文件：`package.json`、`pnpm-lock.yaml`、`vite.config.ts`、`tsconfig*.json`、`.gitignore`
- 文档：`AGENT.md`、`CHANGELOG.md`、`plan.md`、`docs/` 目录
- 脚本：`scripts/` 目录下的辅助脚本

### ❌ 不要提交（已在 `.gitignore` 中）

| 文件/目录 | 原因 |
|-----------|------|
| `node_modules/` | 依赖包，用 `pnpm install` 重新安装 |
| `dist/`、`dist-ssr/` | 前端构建产物 |
| `src-tauri/target/` | Rust / Tauri 编译产物、安装包 |
| `src-tauri/gen/schemas` | Tauri 自动生成的 schema |
| `bug_screenshot/`、`scratch/` | 本地调试、草稿文件 |
| `TODO.local.md`、`生圖.md` | 个人本地笔记 |
| `.env`、`.env.*` | 环境变量、密钥 |
| `*.log`、`*.err`、`.tauri-dev.err` | 运行日志 |

**原则：只提交「代码和文档」，不提交「本地数据、密钥、依赖包、构建产物」。**

> 注意：`src-tauri/target/release/bundle/` 下的安装包（`.msi`、`.exe`）虽在本地保留作发版证据，但**不纳入 Git 追踪**（见 `AGENT.md` §11.6）。版本历史靠 git tag 与 CHANGELOG 记录。

---

## 四、提交消息规范

本项目采用 [Conventional Commits](https://www.conventionalcommits.org/)，格式：

```
<类型>[(可选范围)]: <简短说明>
```

### 常用类型

| 类型 | 用途 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(calendar): 月视图农历与节假日显示` |
| `fix` | 修复 bug | `fix(tasks): 修正跨日任务提醒时间` |
| `refactor` | 重构（不改功能） | `refactor(ui): 拆分 AppToolbar 组件` |
| `chore` | 杂项维护 | `chore: 更新 .gitignore` |
| `docs` | 文档变更 | `docs: 补充 Git 管理规范` |
| `build` | 打包 / 构建配置 | `build: 调整 Tauri bundle 设置` |
| `style` | 纯样式调整 | `style: 统一看板列间距` |
| `perf` | 性能改善 | `perf(calendar): 减少月视图重渲染` |
| `test` | 测试相关 | `test: 补充 lunar 工具函数测试` |

### 撰写要求

1. 标题一行，不超过 72 字符，句末不加句号
2. 中英文均可，但一个 commit 内保持一致
3. 不要写「更新文件」「修改代码」这类空泛描述
4. 一次提交只做**一件逻辑相关**的事
5. 破坏性变更在类型后加 `!`，例：`feat(db)!: migrate tasks schema`
6. 发版提交使用固定格式：`chore(release): v<版本号>`

### 历史范例（本仓库已有）

```
feat(calendar): Fantastical-style layout + weather integration
feat(calendar): M6.2 -- month view with lunar / holidays / visual polish
feat(tasks): M6.1 -- add start_at for time-range tasks + redo TaskForm
docs(agent): add v11.6 release artifacts retention policy
chore(release): v0.2.0
chore: initial commit (v0.1.0-alpha)
```

更完整的版本与发版规则见 `AGENT.md` §11。

---

## 五、分支管理规范

### 分支命名

| 类型 | 用途 | 示例 |
|------|------|------|
| `feature/*` | 新功能、体验优化 | `feature/app-toolbar` |
| `fix/*` | bug 修复 | `fix/kanban-drag` |
| `docs/*` | 文档修改 | `docs/git-workflow` |
| `chore/*` | 维护工作 | `chore/update-deps` |

### 分支规则

1. `main` 只保留可用、稳定的版本。
2. 不要直接在 `main` 上修改、提交或推送。
3. 每次工作前，先从最新 `main` 建立新分支。
4. 工作完成后，推送工作分支到远程。
5. 由负责人确认后，再将工作分支合并回 `main`。
6. 合并完成后，可删除已完成的工作分支。

---

## 六、日常操作流程

### 场景 A：改完代码，要保存并上传

```powershell
# 1. 确认目前分支与状态
git status

# 2. 如果仍在 main，先建立工作分支
git switch main
git pull
git switch -c feature/你的改动名称

# 3. 加入要提交的文件（不要加入 node_modules/、target/、.env 等）
git add 文件名称

# 4. 提交（替换引号内的说明）
git commit -m "feat(ui): 你的改动说明"

# 5. 推送目前分支到远程
git push -u origin HEAD
```

### 场景 B：开始改代码前，先同步最新版本

```powershell
git switch main
git pull
git switch -c feature/你的改动名称
```

### 场景 C：功能分支完成后，合并回 main

> 合并前必须先保证 `main` 和工作分支都是最新的。若工作分支只有自己或 AI 在维护，推荐先将工作分支 rebase 到最新 `main`，再合并回 `main`。

```powershell
# 1. 确认工作区干净，记下目前工作分支名称
git status
git branch --show-current

# 2. 先更新 main
git switch main
git pull origin main

# 3. 回到工作分支，确认远程分支最新
git switch feature/你的改动名称
git pull --rebase

# 4. 将工作分支 rebase 到最新 main
git rebase main

# 5. rebase 会改写工作分支历史，使用较安全的 force-with-lease 推送工作分支
git push --force-with-lease

# 6. 回到 main，用 fast-forward 合并工作分支
git switch main
git merge --ff-only feature/你的改动名称
git push origin main

# 7. main 推送成功后，删除已合并的工作分支
git branch -d feature/你的改动名称
git push origin --delete feature/你的改动名称
git fetch --prune origin
```

> 只有负责人或明确被授权的人可以执行「合并并推送 `main`」。`main` 只能使用一般 `git push origin main`，禁止强推；`--force-with-lease` 只能用于工作分支。

若 `git merge --ff-only` 失败，代表分支无法快进合并。不要改用普通 merge 或强推 `main`，先停止并检查原因。

合并并推送 `main` 成功后，应清理已完成的工作分支：

- 本地分支：`git branch -d feature/你的改动名称`
- 远程分支：`git push origin --delete feature/你的改动名称`
- 若远程分支已不存在但本机仍看到 `origin/feature/你的改动名称`，执行 `git fetch --prune origin` 清理追踪缓存。

### 场景 D：发版（打 tag 并推送）

```powershell
# 1. 确认所有改动已提交，本地测试通过
git status

# 2. 执行版本 bump（见 AGENT.md §11.4）
./scripts/bump-version.ps1 <新版本>

# 3. 编辑 CHANGELOG.md 后提交
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore(release): v<新版本>"

# 4. 打 tag 并推送
git tag v<新版本>
git push origin main
git push origin v<新版本>
```

### 场景 E：只想看改了什么，还不提交

```powershell
git status          # 看哪些文件有变动
git diff            # 看具体改动内容
```

### 场景 F：改错了，还没提交，想还原某个文件

```powershell
git restore 文件名称
```

> ⚠️ `git restore` 会丢弃未提交的改动，操作前请确认。

---

## 七、常见问题

### Q1：推送时要求登录 GitHub

使用 GitHub 账号登录，或配置 [Personal Access Token](https://github.com/settings/tokens) 作为密码。Windows 上 Git Credential Manager 通常会记住凭据，只需输入一次。

### Q2：推送被拒绝（rejected），提示需要先 pull

表示远程有别人推送的新内容。先拉取再推送：

```powershell
git pull
# 若无冲突：
git push
```

> 如果目前分支是工作分支，这里只会同步并推送工作分支；不要为了解决 rejected 直接切到 `main` 推送。

### Q3：发现自己正在 main 上改代码怎么办

若还没有提交，立即把目前改动移到新分支：

```powershell
git switch -c feature/你的改动名称
```

若已经在 `main` 上提交，但还没有推送，请先停止操作，让熟悉 Git 的人协助整理分支，避免错误修改 `main` 历史。

### Q4：不小心改了不该提交的文件

确认 `.gitignore` 已包含该文件。若已被 `git add`，取消暂存：

```powershell
git restore --staged 文件名称
```

### Q5：提交后发现漏了文件

```powershell
git add 漏掉的文件
git commit --amend --no-edit   # 并入上一次提交（仅限尚未推送时）
git push
```

> 若已推送到远程，不要使用 `--amend`，应新建一次提交。

### Q6：pnpm / cargo 相关文件要不要提交？

| 文件 | 是否提交 |
|------|----------|
| `pnpm-lock.yaml` | ✅ 提交（锁定依赖版本） |
| `package.json` | ✅ 提交 |
| `src-tauri/Cargo.lock` | ✅ 提交 |
| `node_modules/` | ❌ 不提交 |
| `src-tauri/target/` | ❌ 不提交 |

---

## 八、禁止操作

以下操作可能导致数据遗失或覆盖他人工作，**非必要不要做**：

| 操作 | 风险 |
|------|------|
| 直接在 `main` 上提交或推送 | 可能把未确认的改动发布到主线 |
| `git push --force` | 覆盖远程历史，可能删除他人提交 |
| `git reset --hard` | 永久丢弃本地未提交改动 |
| 提交 `.env`、API 密钥 | 泄漏密钥 |
| 提交 `node_modules/`、`target/` | 仓库体积膨胀、无意义冲突 |
| `cargo clean`（AI 主动执行） | 清除本地安装包等发版证据 |

---

## 九、AI 助手执行规范

> **本节供 Cursor / AI 助手阅读。** 当用户要求「提交」「推送」「保存代码」「上传到 GitHub」等 Git 相关操作时，必须依照以下流程引导并代为执行。

### 9.1 触发条件

用户消息包含以下意图时，启用本规范：

- 提交 / commit / 保存改动
- 推送 / push / 上传到远程 / 同步到 GitHub
- 拉取 / pull / 同步最新代码
- 完整的「提交并推送」流程
- 合并到 main / merge main / 发布主分支
- 发版 / release / 打 tag

### 9.2 标准执行流程

每次 Git 操作，AI 必须按顺序完成：

```
① 检查状态与分支 → ② 必要时建立工作分支 → ③ 过滤敏感文件 → ④ 确认提交范围 → ⑤ 撰写 commit 消息 → ⑥ 提交 → ⑦ 推送工作分支 → ⑧ 回报结果
```

#### 步骤 ① 检查状态与分支

并行执行：

```bash
git status
git diff
git log --oneline -5
git branch --show-current
```

向用户**用表格列出**将要提交的文件，标明「新增 / 修改 / 删除」。

若当前分支是 `main`：

- 不要直接提交
- 根据改动内容建立工作分支，例如 `docs/git-workflow`、`feature/app-toolbar`、`fix/kanban-drag`
- 若已有未提交改动，可直接执行 `git switch -c <分支名>` 将改动保留在新分支

#### 步骤 ② 必要时建立工作分支

```bash
git switch main
git pull
git switch -c <工作分支名>
```

若工作区已有未提交改动，且目前就在 `main`，不要先 `pull`；直接：

```bash
git switch -c <工作分支名>
```

#### 步骤 ③ 过滤敏感文件

提交前必须排除：

- `node_modules/`、`src-tauri/target/`、`.env`、`.env.*`
- `bug_screenshot/`、`scratch/`、`TODO.local.md`
- 任何含密码、Token、私钥的文件

若用户要求提交的文件命中上述规则，**必须警告并拒绝提交**，说明原因。

#### 步骤 ④ 确认提交范围

- 若改动涉及多个无关功能，建议拆成多次提交
- 若用户未明确说「全部提交」，列出文件清单并确认
- **未经用户明确要求，不要提交**（避免过度主动）

#### 步骤 ⑤ 撰写 commit 消息

- 遵循第四节格式：`<类型>[(范围)]: <说明>`
- 根据 `git diff` 实际内容撰写，不可空泛
- 提交前向用户展示建议的 commit 消息，若改动简单明确可直接执行

#### 步骤 ⑥ 提交

```bash
git add <相关文件>
git commit -m "<类型>: <说明>"
```

- 不要 `git add .` 若其中有不该提交的文件
- 不要跳过 pre-commit hook（不加 `--no-verify`）
- 不要 `git commit --amend`，除非符合以下全部条件：
  1. 用户明确要求 amend
  2. 上一次 commit 是本次对话中建立的
  3. 该 commit 尚未推送到远程

#### 步骤 ⑦ 推送工作分支

```bash
git push -u origin HEAD
```

- 不要把日常改动直接推送到 `main`
- 首次推送工作分支：`git push -u origin HEAD`
- 不要 `git push --force`，除非用户明确要求且已警告风险
- 推送失败若提示需 pull，先 `git pull` 再重试 push
- 发版时额外执行 `git push origin v<版本号>`

#### 步骤 ⑧ 回报结果

向用户报告：

1. 提交的 commit hash 和消息
2. 推送是否成功
3. 工作分支名称
4. 远程仓库链接：https://github.com/yigebibi/todo-reminder
5. 是否需要负责人合并回 `main`
6. 若有未提交的剩余改动，列出并提醒

### 9.3 合并到 main 的 AI 执行流程

当用户明确要求「合并到 `main`」时，AI 必须按以下流程操作：

```
① 确认授权与状态 → ② 更新 main → ③ 更新工作分支 → ④ rebase 到 main → ⑤ force-with-lease 推送工作分支 → ⑥ fast-forward 合并 main → ⑦ 推送 main → ⑧ 删除工作分支 → ⑨ 回报结果
```

#### 步骤 ① 确认授权与状态

先执行：

```bash
git status
git branch --show-current
git branch -vv
git log --oneline -5
```

要求：

- 工作区必须干净，若有未提交改动，先停止并询问是否提交。
- 当前分支应是要合并的工作分支，不应直接在 `main` 上开始。
- 用户必须明确要求合并到 `main`；若只是说「推送」，不要合并 `main`。

#### 步骤 ② 更新 main

```bash
git switch main
git pull origin main
```

#### 步骤 ③ 更新工作分支

```bash
git switch <工作分支名>
git pull --rebase
```

#### 步骤 ④ rebase 到 main

```bash
git rebase main
```

若 rebase 发生冲突：

- 不要猜测解决冲突。
- 先向用户报告冲突文件。
- 需要理解代码后再修复冲突，修复后继续 `git rebase --continue`。
- 若无法安全解决，停止并请用户确认。

#### 步骤 ⑤ 推送 rebase 后的工作分支

```bash
git push --force-with-lease
```

要求：

- 只能对工作分支使用 `--force-with-lease`。
- 禁止对 `main` 使用任何 force push。
- 若 `--force-with-lease` 失败，代表远程工作分支可能被别人更新，必须停止并重新检查，不要改用 `--force`。

#### 步骤 ⑥ fast-forward 合并 main

```bash
git switch main
git merge --ff-only <工作分支名>
```

要求：

- 必须使用 `--ff-only`，保持 `main` 历史线性。
- 若 `--ff-only` 失败，不要改用普通 `git merge`，先停止并检查原因。

#### 步骤 ⑦ 推送 main

```bash
git push origin main
```

要求：

- `main` 只能使用一般 push。
- 即使用户口语说「强推 main」，也要先说明 `main` 禁止强推，并改用安全的 `git push origin main`。
- 若 `main` 推送被拒绝，停止并先 `git fetch` / `git status` 检查原因，不要改用 force push。

#### 步骤 ⑧ 删除工作分支

只有在 `main` 已成功推送到远程后，才删除已合并的工作分支：

```bash
git branch -d <工作分支名>
git push origin --delete <工作分支名>
git fetch --prune origin
```

要求：

- 先确认目前在 `main`，不要删除正在使用的分支。
- 本地分支必须用 `git branch -d`，不要用 `-D` 强删未合并分支。
- 若远程删除回报 `remote ref does not exist`，代表远程分支已不存在；执行 `git fetch --prune origin` 清理本机追踪缓存后再确认。
- 删除后用 `git branch --list <工作分支名>` 和 `git branch -r --list origin/<工作分支名>` 确认本地与远程追踪都不存在。

#### 步骤 ⑨ 回报结果

向用户报告：

1. 合并的工作分支名称
2. 合并到 `main` 的 commit hash
3. `main` 是否已成功推送
4. 远程仓库链接：https://github.com/yigebibi/todo-reminder
5. 本地工作分支是否已删除
6. 远程工作分支是否已删除或已确认不存在

### 9.4 提示话术模板

AI 在引导不熟悉 Git 的用户时，使用以下结构：

**提交前：**

> 目前有以下改动尚未提交：
>
> | 文件 | 状态 |
> |------|------|
> | ... | 修改 |
>
> 我建议的提交说明：`feat(ui): xxx`  
> 我会先建立工作分支，再提交并推送到 GitHub，不会直接操作 `main`。

**推送成功：**

> 已完成提交并推送。
> - Commit：`abc1234 feat(ui): xxx`
> - 分支：`feature/xxx`
> - 远程：https://github.com/yigebibi/todo-reminder
> - 下一步：请合并回 `main`，或由负责人操作
>
> 以下文件仍有本地改动未提交：...（若有）

**合并到 main 前：**

> 我会先更新 `main` 和目前工作分支，将工作分支 rebase 到最新 `main`，再使用 `--ff-only` 合并回 `main`。  
> 若 rebase 或 fast-forward 合并失败，我会停止并回报原因，不会强推 `main`。

**合并到 main 成功：**

> 已完成合并到 `main` 并推送。
> - 工作分支：`feature/xxx`
> - Main commit：`abc1234`
> - 远程：https://github.com/yigebibi/todo-reminder
> - 分支清理：本地与远程工作分支已删除

**遇到问题时：**

> 推送失败，原因是：...  
> 建议操作：...  
> 需要你的协助：...（如提供 GitHub 凭据、确认冲突处理）

### 9.5 禁止行为（AI）

| 禁止 | 原因 |
|------|------|
| 未确认就提交含敏感数据的文件 | 安全风险 |
| 在 `main` 上直接提交或推送日常改动 | 破坏主线稳定性 |
| 对 `main` 使用 `--force` 或 `--force-with-lease` | 可能覆盖主线历史 |
| 工作分支 rebase 后用 `--force` 代替 `--force-with-lease` | 可能覆盖他人工作 |
| `git merge --ff-only` 失败后直接改用普通 merge | 会破坏线性合并规范 |
| 修改 git config（global） | 影响用户其他项目 |
| 空泛的 commit 消息如「update files」 | 无法追溯改动 |
| 用户只问问题时主动提交 | 避免过度操作 |
| 主动执行 `cargo clean` 或删除 `target/release/bundle/` | 会清除发版产物证据 |

---

## 十、快速参考卡

```
┌──────────────────────────────────────────────────────────┐
│  建分支 → 改代码 → git add → commit → push 分支          │
├──────────────────────────────────────────────────────────┤
│  提交格式：feat/fix/docs/chore(范围): 说明                │
│  主分支：main（不要直接提交/推送）                         │
│  工作分支：feature/* fix/* docs/* chore/*                │
│  远程：origin → GitHub                                   │
│  不提交：node_modules/ target/ .env dist/                │
│  发版：bump-version → CHANGELOG → chore(release) → tag   │
└──────────────────────────────────────────────────────────┘
```
