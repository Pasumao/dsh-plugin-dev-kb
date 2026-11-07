---
name: dsh-upgrade-assistant
description: DeepSeek Harness (dsh) 升级助手：用户升级 dsh 版本时，用知识库里的官方升级指南（upgrade-guide/）与持久化变更记录（persistence-changes/）生成迁移检查清单、预判破坏性变更、给出回滚方案。用户提到「升级 dsh / 更新 Harness / 换版本 / upgrade」或升级 dsh 后报错时加载本技能。注意：写 NoneBot 时请用 nonebot-plugin-dev-kb，勿用本技能。
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

1. **当前版本**：读用户 profile 的安装信息（如 `%LOCALAPPDATA%` / profile 目录下的
   `package.json` 中 `@deepseek-ai/dsh` 的版本，或让用户看 Desktop 关于页）。
2. **目标版本**：`npm view @deepseek-ai/dsh version`（latest）或用户指定版本。
3. 列出区间内的版本号，形如 `v0.2.0-rc.2 → v0.2.1-rc.4`。

### 第二步：读变更（知识库检索）

1. 对区间内**每个版本**读一份指南：
   `{{KB_ROOT}}/extra/upgrade-guide/<版本>/`（目录按 `v0.1.7-rc.2` … `v0.2.2-alpha.3` 组织，
   每个子目录是一篇 guide.md / guide.zh.md，读中文版）。
2. 持久化/会话格式变更：列出 `{{KB_ROOT}}/extra/persistence-changes/` 中日期晚于当前版本
   发布日的条目（文件名即日期），只读标题相关条目判断「历史会话会不会丢/迁移」。
3. 快速定位也可用 `dsh_kb_search` 工具，如 query=`升级 upgrade-guide v0.2.1`。
4. 优先关注三类破坏点：**删除/改名的 API**（插件会静默失效）、**会话格式升级**
   （旧会话打不开或需要迁移）、**配置字段变更**（profile 的 cordis.patch.yml / package.json）。

### 第三步：给出升级检查清单（输出给用户）

清单必须包含：

- **备份**：升级前备份 profile 的 `package.json` 与 `pnpm-lock.yaml`
- **变更摘要**：区间内每个版本的破坏性变更，逐条说明「影响你吗」
- **插件兼容**：dsh 有插件兼容闸门——`peerDependencies` 不覆盖目标版本的插件会被
  **整体拒绝安装**或**启动时跳过（静默失效）**；把用户已装插件与目标版本对照，
  预先列出需要升级/移除/豁免（allow-version）的插件
- **回滚方案**：保留旧版本安装包/备份路径，回滚 = 恢复备份 + 重装旧版

### 第四步：升级后验证

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
