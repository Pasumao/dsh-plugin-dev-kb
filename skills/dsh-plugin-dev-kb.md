---
name: dsh-plugin-dev-kb
description: DeepSeek Harness 官方文档知识库的使用指南：知识库位置与结构、按任务场景的阅读路径、检索策略。写 dsh 插件 / Tool / 配置 / 服务 / 事件 / 打包发布 / LLM 适配器时先加载本技能定位文档。
whenToUse: 开发 dsh 插件、查询 dsh 能力与 API、写 Tool、配置 cordis.yml、扩展 Harness 时
---
# dsh 插件开发知识库使用指南（dsh-plugin-dev-kb）

本插件内置 DeepSeek Harness 官方文档的完整镜像，供插件开发时快速定位与检索。

## 0. 知识库位置

- **知识库根**：`D:\dsh\plugins\dsh-plugin-dev-kb\kb\`（绝对路径，可直接 read/glob/grep）
- 数据来源：官方文档站点（VitePress）的仓库原始 Markdown，链接已按站点路由重写，与线上站点逐字一致（见 `kb/meta/source.json` 的 commit）

## 1. 目录结构

```
kb/
├── site/            线上站点完整镜像（中英双语，优先读这里）
│   ├── guide/       入门：quickstart / providers / python-sdk
│   ├── develop/     basic(第一个插件/tool/config/publish)、framework(生命周期/服务/事件)、
│   │                practice(能力分层/LLM适配器)、cordis-tutorial(7章)
│   ├── reference/   index(架构)、cordis-primer、capability-seams、agent-lifecycle、
│   │                config-catalog、tool-catalog、cordis-api/(6)、cookbook/(6)、subsystems/(43)
│   └── en/          英文站镜像（结构与中文站一致）
├── extra/           仓库内未发布到站点的补充文档：glossary、defensive-patterns、
│                    module-graph、testing、postmortem/(4)、i18n/、cookbook 与 subsystems 扩展
├── meta/
│   ├── topics.md    ★ 主题导航：任务场景 → 要读的文件（先用这个）
│   ├── search-index.json  全量检索索引（220 文件：path/url/title/字符数）
│   ├── source.json  来源信息（commit/时间/统计）
│   └── site-pages.txt     线上站点页面清单
├── INDEX.md         全部 站点 URL ↔ 本地文件 对照
└── README.md        知识库总览与更新方法
```

## 2. 使用流程（三选一，从快到慢）

1. **按任务找文档**：读 `kb/meta/topics.md`，找到对应主题（如"开发一个 Tool"），按核心/扩展顺序读列出的文件。
2. **按关键词检索**：对 `kb/meta/search-index.json` 用 grep 过滤（如 `grep -i "tool" search-index.json`），或直接 grep `kb/site/` 内容定位。
3. **按 URL 反查**：已知线上页面 URL 时，在 `kb/INDEX.md` 查对应本地文件。

## 3. 阅读原则

- **中文优先**：默认读 `site/` 下中文文件；需要英文原文时读 `site/en/` 对应路径。
- **大文件局部读**：`reference/config-catalog.md`、`reference/tool-catalog.md`、`extra/module-graph.md`、`reference/subsystems/session.md` 等超过 100KB，先用 grep 定位再 read 局部，禁止整读。
- **代码示例可直接引用**：文档中的 `apply(ctx)` 插件骨架、`ctx.tools.register`、`inject` 声明等可直接用于新代码；但需注意知识库是 commit 快照，若与当前安装版本 API 不一致，以实际安装包为准。
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
| 子系统能力 | `site/reference/subsystems/index.md` → 对应子系统页 |

## 5. 更新知识库

见 `kb/README.md` 的更新方法（重新克隆 `deepseek-ai/deepseek-harness` 并运行站点投影器）。
