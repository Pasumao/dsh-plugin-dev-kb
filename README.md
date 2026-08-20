# dsh-plugin-dev-kb

![npm version](https://img.shields.io/npm/v/dsh-plugin-dev-kb)
![License](https://img.shields.io/github/license/Pasumao/dsh-plugin-dev-kb)
![AI Assisted](https://img.shields.io/badge/AI-Assisted-8A2BE2)

**写 dsh 插件时的随身官方文档**：把 DeepSeek Harness 官方文档站点
<https://deepseek-harness.github.io/deepseek-harness/> 的全部内容整理为 dsh 原生可用的形态——
装了这个插件，agent 写插件时自动加载知识库，按任务场景定位文档，不用再翻网页。

## 这是什么

- **站点完整镜像**：官方文档（VitePress）由仓库 `deepseek-ai/deepseek-harness` 的 `docs/` 原始 Markdown
  投影生成（链接已按站点路由重写，与线上逐字一致）。中英双语共 168 页。
- **补充文档**：仓库 `docs/` 中未发布到站点的 52 篇开发参考（术语表、防御模式、模块图、测试策略、事故复盘、i18n 规范等）。
- **agent 友好**：`skills/dsh-plugin-dev-kb.md` 技能让 dsh 在插件开发任务中自动加载，获知知识库位置、
  主题导航与检索策略；`kb/meta/topics.md` 按任务场景映射要读的文件；`kb/meta/search-index.json` 提供全量检索。

## 功能

- **官方文档完整镜像**：deepseek-ai/deepseek-harness 官方文档站全部内容整理为 dsh 原生可用的形态，
  中英双语共 168 页，链接按站点路由重写，与线上逐字一致；
- **仓库补充文档**：未发布到站点的 52 篇开发参考（术语表、防御模式、模块图、测试策略、事故复盘、i18n 规范等）；
- **agent 友好**：`dsh-plugin-dev-kb` 技能让 dsh 在插件开发任务中自动加载知识库；
  `kb/meta/topics.md` 按任务场景映射要读的文件，`kb/meta/search-index.json` 提供全量检索；
- **人侧可用**：直接浏览 `kb/` 目录，或打开 `kb/INDEX.md` 按 URL 对照查阅；
- 纯数据插件，零运行时依赖，不注册任何工具。

## 配置

无需任何配置，安装即用：

- 不读取环境变量，不需要 API Key / token，不写配置文件；
- 挂载后 `skills/dsh-plugin-dev-kb.md` 技能在会话启动时进入可用技能列表，自动生效；
- 知识库更新走 `npm run rebuild-index`（见「更新知识库」），无手动配置项。

## 安装 / 挂载

```powershell
# npm（推荐）
dsh plugin --profile web add dsh-plugin-dev-kb
# 或 GitHub
dsh plugin --profile web add github:Pasumao/dsh-plugin-dev-kb
```

源码安装（本地开发 / 调试）：

```bash
git clone https://github.com/Pasumao/dsh-plugin-dev-kb.git
cd dsh-plugin-dev-kb
npm install
# 以 link: 方式挂载进 profile
```

本插件是「纯数据 + 技能」插件，不自带 bundle 自动挂载，装完后在 profile 的
`cordis.patch.yml` 末尾加一行手动挂载（挂载为 profile 根层插件行，其 `skills/` 技能进入全局层）：

```yaml
- insert:
    - id: dsh-plugin-dev-kb
      name: dsh-plugin-dev-kb
```

> 重新启动 / 新建 dsh 会话后，`dsh-plugin-dev-kb` 技能才会出现在可用技能列表中（技能清单在会话启动时快照）。

## 目录结构

```
dsh-plugin-dev-kb/
├── cordis.patch.yml   挂载声明
├── package.json       插件元数据
├── skills/
│   └── dsh-plugin-dev-kb.md   ★ 知识库使用指南（agent 加载此技能）
├── kb/
│   ├── site/          站点镜像：guide/ develop/ reference/（+ en/ 英文站）
│   ├── extra/         仓库补充文档：glossary、defensive-patterns、module-graph、postmortem/、i18n/ …
│   ├── meta/
│   │   ├── topics.md         ★ 主题导航：任务场景 → 文件
│   │   ├── search-index.json 全量索引（223 文件）
│   │   ├── source.json       来源 commit / 时间 / 统计
│   │   └── site-pages.txt    线上页面清单
│   ├── INDEX.md        站点 URL ↔ 本地文件 对照
│   └── README.md       知识库总览与更新方法
└── LICENSE
```

## 使用

- **agent 侧**：写插件 / Tool / 配置 / 服务 / 事件 / 打包 / LLM 适配器时，加载
  `dsh-plugin-dev-kb` 技能 → 读 `kb/meta/topics.md` 定位 → 按需 read/grep。
- **人侧**：直接浏览 `kb/` 目录，或打开 `kb/INDEX.md` 按 URL 对照查阅。

## 更新知识库

见 `kb/README.md`：重新克隆 `deepseek-ai/deepseek-harness`（master 分支），安装投影依赖后
在仓库内调用 `scripts/project-doc-site.ts` 的 `projectDocs()` 生成 `website/.generated/`，
覆盖本插件的 `kb/site/`（并按发布清单同步 `kb/extra/`），再在本插件根目录运行
`node scripts/rebuild-index.mjs` 重建索引与 INDEX.md。

## AI 生成声明

知识库内容为官方文档的镜像整理（来源标注于 `kb/meta/source.json`），索引与
导航由 AI 辅助生成（DeepSeek Harness），均经人工核对。

## License

MIT
