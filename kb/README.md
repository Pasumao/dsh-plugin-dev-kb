# DeepSeek Harness 文档知识库

本地镜像的 DeepSeek Harness 官方文档知识库，用于辅助 Harness **插件开发**。内容抓取自官方文档站点
<https://deepseek-harness.github.io/deepseek-harness/>，并以**仓库内原始 Markdown**（`deepseek-ai/deepseek-harness` 的 `docs/` 目录）重建，比抓取渲染后的 HTML 保真度更高、链接与代码块完整。

## 目录结构

```
knowledge/deepseek-harness/
├── README.md         本文件：总览与使用指南
├── INDEX.md          全部页面的 站点 URL ↔ 本地文件 对照索引（自动生成）
├── site/             线上站点的完整镜像（中英双语，链接已按站点路由重写）
│   ├── index.md            中文首页（/deepseek-harness/）
│   ├── guide/              入门：quickstart / providers / python-sdk
│   ├── develop/            开发：basic(第一个插件/tool/config/publish)、
│   │                       framework(生命周期/service/事件)、practice、cordis-tutorial(7 章)
│   ├── reference/          参考：架构、capability-seams、config-catalog、tool-catalog、
│   │                       cordis-api、cookbook、subsystems(43 个子系统页)…
│   └── en/                 英文站镜像（/deepseek-harness/en/...），结构同上
├── extra/            仓库 docs/ 中未发布到站点的补充文档（开发参考）
│   ├── glossary.md         术语表（capability seam 等核心概念）
│   ├── defensive-patterns.md / testing.md / development.md / rescope.md …
│   ├── module-graph.md     模块依赖全景图（125KB）
│   ├── cookbook/           adding-a-vendored-package 等仓库内 cookbook
│   ├── subsystems/         attachment / extensions / feedback
│   ├── postmortem/         事故复盘（4 篇）
│   └── i18n/               文档双语规范与术语
└── meta/
    ├── source.json         来源信息：仓库 commit、抓取时间、统计
    └── site-pages.txt      线上站点 hashmap.json 的页面清单（168 页）
```

## 插件开发学习路径（从 `site/` 开始）

1. **第一个插件** — `site/develop/basic/index.md`（插件 = 导出 `apply(ctx)` 的模块，`ctx.effect()` 自动清理）
2. **开发一个 Tool** — `site/develop/basic/tool.md`（工具定义 DSL）
3. **插件配置** — `site/develop/basic/config.md`；**打包安装** — `site/develop/basic/publish.md`
4. **框架能力** — `site/develop/framework/index.md`（生命周期）、`service.md`（服务与依赖注入）、`events.md`（事件系统）
5. **Cordis 框架教程** — `site/develop/cordis-tutorial/`（7 章：插件/生命周期/服务/事件/配置/组合与热重载/进入 Harness）
6. **实战** — `site/develop/practice/index.md`（能力三层拆分）、`llm-adapter.md`
7. **按需查阅** — `site/reference/`：
   - 架构总览 `reference/index.md`；能力服务 `reference/capability-seams.md`；Agent 生命周期 `reference/agent-lifecycle.md`
   - 插件配置目录 `reference/config-catalog.md`；Tool Schema 目录 `reference/tool-catalog.md`；持久化事件 `reference/persistence-catalog.md`
   - Cordis API `reference/cordis-api/`（Context / Events / Fiber / Registry / Service / 继承接口面）
   - Cookbook `reference/cookbook/`（新增 package / tool / LLM adapter / 设置卡片 / 扩展模式 / Conversation Node）
   - 子系统 `reference/subsystems/`（core / scope / session / tools / shell / filesystem / subagent / sandbox / approval … 共 43 页）

## 更新方法

知识库与仓库 `master` 分支对齐（见 `meta/source.json` 的 commit）。需要刷新时：

```sh
# 1. 重新克隆仓库
git clone --depth 1 https://github.com/deepseek-ai/deepseek-harness.git <tmp>

# 2. 安装投影依赖（mdast 三个包）。仓库本身是 pnpm workspace（package.json 含
#    workspace: 协议），npm 无法直接在其内安装；装到克隆目录的上级，Node 的 ESM
#    解析沿 node_modules 向上查找时即可命中。
cd <tmp>/.. && npm install --no-save --no-package-lock mdast-util-from-markdown mdast-util-gfm micromark-extension-gfm

# 3. 运行站点投影器（Node ≥ 22.19；24 默认启用 type stripping）。
#    上游已无 run-projector.ts，改为调用 scripts/project-doc-site.ts 的 projectDocs()：
cd <tmp> && node --input-type=module -e "import('./scripts/project-doc-site.ts').then(m => { m.projectDocs(); console.log('projected') })"
#    输出到 website/.generated/

# 4. 用 website/.generated/ 覆盖本插件的 kb/site/；
#    用 <tmp>/docs/ 中未发布的 Markdown 刷新 kb/extra/（对照 website/docs.ts 的
#    docsPages source/sourceAliases 集合求差集）

# 5. 在本插件根目录重新生成索引与 INDEX.md，并更新 meta/source.json 与统计
node scripts/rebuild-index.mjs
```

站点投影逻辑为仓库内 `website/docs.ts`（发布清单）+ `scripts/project-doc-site.ts`（链接重写/图片复制，由 `website/.vitepress/config.ts` 在构建时调用）。

## 统计

- 站点页面：168 个 Markdown（中文 84 + 英文 84），4 张图片
- 补充文档：52 个 Markdown（`extra/`）
- 来源 commit：`141eb6fef83422698aef7a981029e843e8161534`（master）
