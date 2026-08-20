# 主题导航（Topics）

> 用途：按**任务场景**快速定位要读的文档。路径相对于知识库根 `kb/`（绝对路径：`D:\dsh\plugins\dsh-plugin-dev-kb\kb\`）。
> 中文优先读 `site/` 下的文件；英文原文在 `site/en/` 对应路径（如 `site/en/develop/basic/index.md`）。
> 每个主题：**核心** = 先读这些；**扩展** = 需要细节时再读。

## 1. 入门：第一个插件
- 核心：`site/develop/basic/index.md`（插件 = 导出 `apply(ctx)` 的模块；`ctx.effect()` 自动清理；三种插件形态：函数/对象/类）
- 扩展：`site/develop/cordis-tutorial/01-first-plugin.md`、`site/develop/framework/index.md`

## 2. 开发一个 Tool
- 核心：`site/develop/basic/tool.md`（工具定义 DSL）、`site/reference/cookbook/adding-a-tool.md`（完整步骤 + 验证）
- 扩展：`site/reference/tool-catalog.md`（全部内置工具 schema，大文件请 grep）、`site/reference/subsystems/tools.md`（注册表与执行流水线）、`site/reference/tool-execution-pipeline.md`

## 3. 插件配置
- 核心：`site/develop/basic/config.md`、`site/develop/cordis-tutorial/05-config.md`
- 扩展：`site/reference/config-catalog.md`（全量配置项，大文件请 grep）

## 4. 服务与依赖注入
- 核心：`site/develop/framework/service.md`、`site/develop/cordis-tutorial/03-services.md`
- 扩展：`site/reference/cordis-api/service.md`、`site/reference/capability-seams.md`（能力三层：Service Definition / Provider / Consumer）

## 5. 事件系统
- 核心：`site/develop/framework/events.md`、`site/develop/cordis-tutorial/04-events.md`
- 扩展：`site/reference/cordis-api/events.md`、`site/reference/persistence-catalog.md`（持久化事件目录）、`extra/event-producer-consumer.md`

## 6. 生命周期与副作用
- 核心：`site/develop/framework/index.md`、`site/develop/cordis-tutorial/02-lifecycle-and-effects.md`
- 扩展：`site/reference/agent-lifecycle.md`、`site/reference/cordis-api/context.md`、`extra/defensive-patterns.md`（生命周期/并发/子进程防御模式）

## 7. 打包与发布插件
- 核心：`site/develop/basic/publish.md`
- 扩展：`extra/cookbook/adding-a-vendored-package.md`（vendored 包）

## 8. LLM 适配器
- 核心：`site/develop/practice/llm-adapter.md`、`site/reference/cookbook/adding-an-llm-adapter.md`
- 扩展：`site/reference/subsystems/llm-streaming.md`（流式响应/Message/ContentBlock/StreamChunk）

## 9. 扩展点与能力分层
- 核心：`site/develop/practice/index.md`（能力三层拆分）、`site/reference/capability-seams.md`
- 扩展：`site/reference/cookbook/extension-cookbook.md`（扩展模式）、`site/reference/cookbook/adding-a-conversation-node.md`

## 10. 新增 Package / 设置卡片 / Conversation Node
- 核心：`site/reference/cookbook/adding-a-package.md`、`site/reference/cookbook/adding-a-settings-card.md`、`site/reference/cookbook/adding-a-conversation-node.md`

## 11. 子系统能力速查（按需）
- 总览：`site/reference/subsystems/index.md`；README 约定见 `site/reference/subsystems/README.md`
- 内核与作用域：`core.md`、`scope.md`、`invariants.md`（运行时不变式）
- 会话与持久化：`session.md`、`session-query.md`、`session-reference.md`、`session-title.md`、`session-projection.md`、`persistence.md`、`spill.md`、`session-telemetry.md`
- 模型与上下文：`llm-streaming.md`、`token-meter.md`、`system-prompt.md`、`compaction.md`（上下文压缩）
- 执行与工具：`tools.md`、`shell.md`（Bash）、`subprocess.md`、`terminal.md`（PTY）、`jobs.md`（后台任务）、`filesystem.md`、`lsp.md`、`code-runtime.md`、`web.md`、`skills.md`、`workflow.md`、`subagent.md`
- 策略与交互：`approval.md`（审批）、`permission-presets.md`、`sandbox.md`、`plan.md`（计划模式）、`user-questions.md`、`commands.md`、`goal.md`、`schedule.md`
- 平台与接入：`web-server.md`（HTTP 服务器）、`typert.md`、`client-modules.md`、`storage.md`、`workspace.md`、`settings.md`、`credentials.md`
- 以上均在 `site/reference/subsystems/` 下（如 `site/reference/subsystems/session.md`）

## 12. 架构与核心概念
- 核心：`site/reference/index.md`（架构总览：组合、核心包、循环、seam、扩展点）、`site/reference/cordis-primer.md`（Cordis 入门）
- 扩展：`extra/glossary.md`（术语表：capability seam 等）、`extra/module-graph.md`（模块依赖全景图，大文件请 grep）、`extra/graph-atlas.md`

## 13. 系统提示词 / Token / 上下文压缩
- `site/reference/subsystems/system-prompt.md`、`token-meter.md`、`compaction.md`

## 14. 测试与防御
- `extra/testing.md`（测试策略：快照/e2e/单测边界）、`extra/defensive-patterns.md`、`extra/postmortem/`（事故复盘 4 篇，含沙箱/进程故障模式）

## 15. 文档规范与贡献
- `extra/AGENTS.md`（文档分层标准：tutorial/reference、字数预算）、`extra/development.md`（开发环境与工作流）、`extra/i18n/`（双语规范与术语）

## 16. 中英对照
- 英文站：`site/en/`（结构与中文站一致：`guide/`、`develop/`、`reference/`）；`INDEX.md` 有全部 URL ↔ 文件对照

## 检索技巧
- 全量索引：`meta/search-index.json`（223 个文件的 path/url/title/字符数）
- 大文件（config-catalog / tool-catalog / module-graph / subsystems/session 等 ≥100KB）先用 grep 定位关键行，再 read 局部，不要整读
- 常用检索关键词：`ctx.effect`、`ctx.on`、`ctx.tools.register`、`inject`、`Service Definition`、`cordis.yml`、`SessionEventMap`
