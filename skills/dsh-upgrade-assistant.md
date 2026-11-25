---
name: dsh-upgrade-assistant
description: DeepSeek Harness (dsh) 升级助手：用户升级 dsh 版本时，用知识库里的官方升级指南（upgrade-guide/）与持久化变更记录（persistence-changes/）生成迁移检查清单、预判破坏性变更、给出回滚方案。用户提到「升级 dsh / 更新 Harness / 换版本 / upgrade」或升级 dsh 后报错时加载本技能。
whenToUse: 用户要升级 dsh / DeepSeek Harness 版本，或升级后插件不工作、会话打不开等需要排查迁移问题时
---
# dsh 升级助手（dsh-upgrade-assistant）

帮用户安全升级 DeepSeek Harness：先搞清「从哪版 → 到哪版」，再用知识库把两版之间的全部变更读出来，
生成检查清单，升级后逐条验证。

## 0. 知识库位置

- **知识库根**：`{{KB_ROOT}}`（插件挂载时自动替换为实际绝对路径，可直接 read/glob/grep）
- 升级相关内容在：`{{KB_ROOT}}/extra/upgrade-guide/`（逐版本升级指南）与
  `{{KB_ROOT}}/extra/persistence-changes/`（持久化格式变更，按日期命名）

## 1. 标准流程

### 第一步：确定版本区间

1. **当前版本**：**desktop 形态以 Desktop 关于页为准**——profile 层 `package.json` 里
   `@deepseek-ai/dsh` 是共享副本，实测会落后于桌面壳真实核心；dsh_kb_search / dsh_kb_read
   输出的版本横幅（读桌面壳 `resources/app.asar` 内的核心包）也可直接采信。
   CLI / web 形态直接看 `dsh --version`。
2. **目标版本**：`npm view @deepseek-ai/dsh dist-tags --json`——三个 tag 都看、**别只看 `latest`**：
   `latest` / `next` 可能相差好几个预发布版本，`alpha` 是更靠前的通道（2026-11-25 实测：
   latest=next=0.2.2-rc.5、alpha=0.2.3-alpha.2）。tag 之间不一致时别替用户挑，以用户实报版本
   或桌面「关于」页为准。查 `@deepseek-ai/dsh`，别查 `dsh-base`（它的 `latest` 停在
   0.0.1-rc.1，是陈旧值）。
3. 列出区间内的版本号：`npm view @deepseek-ai/dsh versions --json`（发布时间加 `time`），
   形如 `v0.2.0-rc.2 → v0.2.2-rc.5`。npm 版本与指南目录并非一一对应（如 0.2.1-rc.5
   没有对应目录），以指南目录实际清单为准。

### 第二步：读变更（知识库检索）

1. 指南的目录结构是 `extra/upgrade-guide/<版本>/<变更名>/guide.md` 与 `guide.zh.md`
   （中文版；正文固定「变更」「迁移」两节）。一个版本目录含 1～33 个变更子目录，`ls` 后逐个读，
   frontmatter 的 `description` 是一句话摘要，可先据此筛出与用户插件相关的。
2. **目录语义**：`upgrade-guide/vX/` 收录的是 **vX 之后引入**的变更，不是 vX 已含的变更。
   从 A 升到 B，读版本号落在 `[A, B)` 内的全部目录。（实测：`v0.2.3-alpha.1/node-24-22-3`
   的 Node 门槛实际落在 0.2.3-alpha.2；`v0.2.2-rc.3`、`v0.2.2-rc.5` 目录里写明「已移除」的
   `working_directory` 工具与 `ctx.sessionQuery.inspectSession`，在 0.2.2-rc.5 的包里仍然存在。）
3. 持久化/会话格式变更：列出 `extra/persistence-changes/` 中日期晚于当前版本发布日的条目
   （文件名即日期），只读标题相关条目判断「历史会话会不会丢/迁移」。
4. 快速定位也可用 `dsh_kb_search` 工具，如 query=`升级 upgrade-guide v0.2.1`。
5. 优先关注三类破坏点：**删除/改名的 API**（插件会静默失效）、**会话格式升级**
   （旧会话打不开或需要迁移）、**配置字段变更**（profile 的 cordis.patch.yml / package.json）。

### 第三步：判断某条变更是否已在宿主里

指南是上游 master 的文档，**目录名不是「变更所在版本」的可靠标识**。凡是准备据此改代码的条目，
先在目标宿主的实际安装包里核对（搜索包源码 / 类型定义里的新旧符号）：

- 桌面：`resources/app.asar` 内 `dsh/node_modules/@deepseek-ai/<包>/`；
- CLI / npx：dsh 安装目录下的 `node_modules/@deepseek-ai/<包>/`。

核对不到新符号 = 变更尚未落地，不要按「已移除 / 已改名」去改插件。

### 第四步：给出升级检查清单（输出给用户）

清单必须包含：

- **备份**：升级前备份 profile 的 `package.json` 与 `pnpm-lock.yaml`
- **运行环境门槛**：查区间内指南对 Node.js / pnpm 版本的要求，并在目标环境 `node --version` 核对
  （`npm view "@deepseek-ai/dsh@<目标版本>" engines.node`；Node ≥ 24.9 的要求始于
  `extra/upgrade-guide/v0.2.1-rc.2/node-24/`，`extra/upgrade-guide/v0.2.3-alpha.1/node-24-22-3/`
  的 `^24.22.3 || >=26.13.1` 实测从 0.2.3-alpha.2 生效——影响 npm/npx 安装、源码检出与
  `DSH_RUNTIME_MODE=node` 的 Python SDK；打包的桌面应用自带运行时，不受影响）
- **变更摘要**：区间内每个版本的破坏性变更，逐条说明「影响你吗」
- **插件兼容**：dsh 有插件兼容闸门——先看插件自己的 `engines.dsh` 范围，没有该字段才看
  `@deepseek-ai/dsh*` 的 `peerDependencies`；不覆盖目标版本的插件会被
  **整体拒绝安装**或**启动时跳过（静默失效）**；把用户已装插件与目标版本对照，
  预先列出需要升级/移除/豁免（allow-version）的插件。预发布宿主上 `^0.2.2` 这类范围
  不覆盖 `0.2.2-rc.x`，下界要写到 rc 之前
- **回滚方案**：保留旧版本安装包/备份路径，回滚 = 恢复备份 + 重装旧版

### 第五步：升级后验证

- 启动时逐条看 stderr 的 `dsh: skipping profile bundle "X"` 警告——被跳过 = 该插件静默失效
- 用一个旧会话验证历史消息正常加载（会话格式变更最常坏这里）
- 逐个核心功能冒烟：新建会话、工具调用、技能加载、设置页
- 若用户安装了 `dsh-plugin-dev-kb`，知识库可能比目标版本新（快照领先），
  文档与实际行为不符时以实际安装包为准

## 2. 红线

- **不要在未备份的情况下动 profile**；备份是第一步，不是可选项
- **不要用 allow-version 豁免兼容闸门来「绕过」不兼容插件**——除非用户明确要求并理解风险
  （静默失效比拒绝安装更难排查）
- 知识库是快照，若 upgrade-guide 目录里没有目标版本的目录（比如目标版本比知识库同步点新），
  明确告知用户「该版本的官方指南未收录」，让用户看官方 release notes，不要编造变更内容
