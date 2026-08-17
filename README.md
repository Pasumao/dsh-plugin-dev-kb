# dsh-plugin-dev-kb

DeepSeek Harness（dsh）**插件开发知识库**：把官方文档站点
<https://deepseek-harness.github.io/deepseek-harness/> 的全部内容整理为 dsh 原生可用的形态。

## 这是什么

- **站点完整镜像**：官方文档（VitePress）由仓库 `deepseek-ai/deepseek-harness` 的 `docs/` 原始 Markdown
  投影生成（链接已按站点路由重写，与线上逐字一致）。中英双语共 168 页。
- **补充文档**：仓库 `docs/` 中未发布到站点的 50 篇开发参考（术语表、防御模式、模块图、测试策略、事故复盘、i18n 规范等）。
- **agent 友好**：`skills/dsh-plugin-dev-kb.md` 技能让 dsh 在插件开发任务中自动加载，获知知识库位置、
  主题导航与检索策略；`kb/meta/topics.md` 按任务场景映射要读的文件；`kb/meta/search-index.json` 提供全量检索。

## 安装 / 挂载

插件目录放在 `D:\dsh\plugins\dsh-plugin-dev-kb\`（与本机其他 dsh 插件同级）。
`cordis.patch.yml` 声明 `- insert: { id: dsh-plugin-dev-kb, name: dsh-plugin-dev-kb }`，
挂载为 profile 根层插件行；其 `skills/` 技能进入全局层。

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
│   │   ├── search-index.json 全量索引（220 文件）
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

见 `kb/README.md`：重新克隆 `deepseek-ai/deepseek-harness`，安装投影依赖后运行
`scripts/project-doc-site.ts` 生成 `website/.generated/`，覆盖 `kb/site/`，再重新生成索引。

## License

MIT
