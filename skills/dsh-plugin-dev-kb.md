---
name: dsh-plugin-dev-kb
description: DeepSeek Harness 官方文档知识库的使用指南：知识库位置与结构、按任务场景的阅读路径、检索策略。写 dsh 插件 / Tool / 配置 / 服务 / 事件 / 打包发布 / LLM 适配器时先加载本技能定位文档。本技能仅限 dsh（DeepSeek Harness）插件开发。
whenToUse: 开发 dsh 插件、查询 dsh 能力与 API、写 Tool、配置 cordis.yml、扩展 Harness 时
---
# dsh 插件开发知识库使用指南（dsh-plugin-dev-kb）

本插件内置 DeepSeek Harness 官方文档的完整镜像，供插件开发时快速定位与检索。

## 0. 知识库位置

- **知识库根**：`{{KB_ROOT}}`（插件挂载时由 lib/index.js 自动替换为插件内 kb/ 目录的实际绝对路径，可直接 read/glob/grep；正斜杠路径，跨机器/安装位置始终有效）
- 数据来源：官方文档站点（VitePress）的仓库原始 Markdown，链接已按站点路由重写，与线上站点逐字一致（见 `kb/meta/source.json` 的 commit）

## 1. 目录结构

```
kb/
├── site/            线上站点完整镜像（中英双语 198 页，优先读这里）
│   ├── guide/       入门：quickstart / providers / python-sdk / plugin-market / github-review / schedule / mcp-memory / network-proxy / public-deployments / desktop-uninstall-cleanup / session-control
│   ├── develop/     basic(第一个插件/tool/config/publish)、framework(生命周期/服务/事件)、
│   │                practice(能力分层/LLM适配器/动态装配)、cordis-tutorial(7章)
│   ├── reference/   index(架构)、cordis-primer、capability-seams、agent-lifecycle、
│   │                config-catalog、tool-catalog、api-gateway、cordis-api/(6)、cookbook/(6)、
│   │                subsystems/(47，含 office-kit / account)
│   └── en/          英文站镜像（结构与中文站一致）
├── extra/           仓库内未发布到站点的补充文档（658 篇）：glossary、defensive-patterns/、core-guidelines/、
│                    module-graph、testing、postmortem/、i18n/、cookbook 与 subsystems 扩展、
│                    upgrade-guide/(各版本升级指南)、persistence-changes/(持久化格式变更)、session-format-status
├── meta/
│   ├── topics.md    ★ 主题导航：任务场景 → 要读的文件（先用这个）
│   ├── search-index.json  全量检索索引（859 文件：path/url/title/字符数）
│   ├── source.json  来源信息（commit/时间/统计）
│   └── site-pages.txt     线上站点页面清单（随镜像重建同步生成）
├── INDEX.md         站点 URL ↔ 本地文件对照
└── README.md        知识库总览与更新方法
```

## 2. 使用流程（从快到慢，优先用工具）

1. **dsh_kb_search 工具检索（首选）**：调用本插件的 `dsh_kb_search` 工具，一次拿到命中文件路径 + 行号 + 上下文片段。参数：`query`（关键词，空白分词；空或 `"topics"` 返回主题导航）、`scope`（`api` = 只搜 API 签名/目录类文档，查 `ctx.*` API 用）、`lang`（默认 zh）、`maxResults`。输出自带**版本横幅**（宿主 dsh 版本 vs 知识库 master 快照 + 对应 upgrade-guide 目录），横幅提示版本差异时务必读指南。
2. **dsh_kb_read 工具按行号窗口读原文（1.8.0 起，次选）**：拿到 path + 命中行号后用 `dsh_kb_read`（参数 `path` / `offset` / `limit`）带行号窗口读上下文，输出自动提示中英对照路径与续读位置；替代通用 read 工具，防大文件整读。
3. **文件工具兜底**（工具不可用时）：读 `{{KB_ROOT}}/meta/topics.md` 按主题找文件；或对 `{{KB_ROOT}}/meta/search-index.json` / `{{KB_ROOT}}/site/` 用 grep 定位。
4. **按 URL 反查**：已知线上页面 URL 时，在 `{{KB_ROOT}}/INDEX.md` 查对应本地文件。

## 3. 阅读原则

- **中文优先**：默认读 `site/` 下中文文件；需要英文原文时读 `site/en/` 对应路径。
- **知识库是上游 master 快照，可能领先宿主**：文档或升级指南里写「已移除 / 已改名」的 API，在当前宿主上可能仍然存在。判断某个 API 在宿主上是否可用，以宿主实际安装包为准（版本探测见 `dsh-upgrade-assistant` 技能）。`extra/upgrade-guide/vX/` 收录的是 **vX 之后引入**的变更，不是 vX 已含的变更。
- **大文件局部读**：`site/reference/persistence-catalog.md`（约 385KB）、`site/reference/config-catalog.md`（约 295KB）、`extra/subsystems/forge.zh.md`、`extra/module-graph.md`、`site/reference/tool-catalog.md` 等超过 100KB，先用 grep 定位再用 `dsh_kb_read` 按行号窗口读，禁止整读。
- **代码示例可直接引用**：文档中的 `apply(ctx)` 插件骨架、`ctx.tools.register`、`inject` 声明等可直接用于新代码；引用前仍按上一条核对宿主是否已有该 API。
- **常见检索关键词**：`ctx.effect`、`ctx.on`、`ctx.tools.register`、`inject`、`Service Definition`、`cordis.yml`、`SessionEventMap`、`Branded`。

## 4. 插件开发高频路径速查

| 任务 | 先读 |
| --- | --- |
| 写第一个插件 | `site/develop/basic/index.md` |
| 开发 Tool | `site/develop/basic/tool.md` + `site/reference/cookbook/adding-a-tool.md` |
| 插件配置 | `site/develop/basic/config.md` |
| 服务与依赖 | `site/develop/framework/service.md` |
| 事件监听 | `site/develop/framework/events.md` |
| 打包发布 | `site/develop/basic/publish.md` |
| LLM 适配器 | `site/develop/practice/llm-adapter.md` |
| 能力扩展 | `site/develop/practice/index.md` + `site/reference/capability-seams.md` |
| 动态装配 Cordis | `site/develop/practice/dynamic-cordis.md` |
| API Gateway / Remote 方法 | `site/reference/api-gateway.md` |
| 子系统能力 | `site/reference/subsystems/index.md` → 对应子系统页 |
| 向系统提示词贡献指令 | `site/reference/cookbook/contributing-system-messages.md` + `site/reference/subsystems/system-prompt.md` |
| 跨 Session 发消息 | `site/guide/session-control.md` |
| 升级 dsh / 核对 API 是否已变 | `dsh-upgrade-assistant` 技能 + `extra/upgrade-guide/` |
| 沙箱挂载冒烟 | `dsh-dev-sandbox` 技能 |
| 从零新建插件 | `dsh-plugin-starter` 技能 |
| 防御规则 / 编码准则 | `extra/defensive-patterns/README.zh.md` / `extra/core-guidelines/README.zh.md` |

## 5. 更新知识库

仓库根目录 `npm run refresh-kb` 一键刷新（克隆上游 → 站点投影 → 覆盖 site/ 与 extra/ → 重建索引与元数据），
GitHub Action 每周一自动执行同一脚本；手动步骤与非 Windows 环境的做法见 `kb/README.md`「更新方法」。
