<p align="center">
  <img src="docs/banner.svg" alt="dsh-plugin-dev-kb banner" width="100%">
</p>

# dsh-plugin-dev-kb

![npm version](https://img.shields.io/npm/v/dsh-plugin-dev-kb)
![npm downloads](https://img.shields.io/npm/dm/dsh-plugin-dev-kb)
![License](https://img.shields.io/github/license/Pasumao/dsh-plugin-dev-kb)
![Stars](https://img.shields.io/github/stars/Pasumao/dsh-plugin-dev-kb?style=social)
![AI Assisted](https://img.shields.io/badge/AI-Assisted-8A2BE2)

[**中文**](./README.md) | [English](./README.en.md)

> **192 页官方镜像 · 439 篇补充文档 · 634 文件搜索索引 · 0 运行时依赖**

**写 dsh 插件时的随身辅助**：① 把 DeepSeek Harness 官方文档站点
<https://deepseek-harness.github.io/deepseek-harness/> 的全部内容整理为 dsh 原生可用的形态——
装了这个插件，agent 写插件时自动加载知识库，按任务场景定位文档，不用再翻网页；
② 附带 `dsh-dev-sandbox` 技能：自建独立沙箱 profile 开发沙箱工作流（沙箱名由 agent 按任务自定），
开发中的插件隔离运行，agent 自主启动 / 重启 / 冒烟验证，插件崩了不影响主力 dsh；
③ `dsh_kb_search` 工具（1.6.0 起）：知识库本地打分检索，一次调用返回命中文件 + 行号 + 上下文片段。

## 这是什么

- **站点完整镜像**：官方文档（VitePress）由仓库 `deepseek-ai/deepseek-harness` 的 `docs/` 原始 Markdown
  投影生成（链接已按站点路由重写，与线上逐字一致）。中英双语共 192 页。
- **补充文档**：仓库 `docs/` 中未发布到站点的 439 篇开发参考（术语表、防御模式、模块图、测试策略、事故复盘、i18n 规范、升级指南、持久化变更等）。
- **agent 友好**：`skills/dsh-plugin-dev-kb.md` 技能让 dsh 在插件开发任务中自动加载，获知知识库位置、
  主题导航与检索策略；`kb/meta/topics.md` 按任务场景映射要读的文件；`kb/meta/search-index.json` 提供全量检索。
- **开发沙箱**：`skills/dsh-dev-sandbox.md` 技能提供自建独立沙箱 profile 工作流（沙箱名 agent 按任务
  自定，不与主力 profile 重名）——初始化（兼容闸门 / link: 挂载）、后台启动（自选空闲端口）、自主重启、headless 冒烟验证，
  全程 agent 闭环，不要求用户重启。
- **本地检索工具**：`dsh_kb_search` 工具在知识库上做打分检索（标题 / 路径 / 正文多词加权），
  一次调用返回命中文件路径、行号与上下文片段；支持 `scope: api`（只搜 API 签名/目录类文档）、
  `lang: en`、空 query 返回主题导航。索引惰性构建于内存（约 60ms / 314 文件），只读不写。

## 功能

- **官方文档完整镜像**：deepseek-ai/deepseek-harness 官方文档站全部内容整理为 dsh 原生可用的形态，
  中英双语共 188 页，链接按站点路由重写，与线上逐字一致；
- **仓库补充文档**：未发布到站点的 182 篇开发参考（术语表、防御模式、模块图、测试策略、事故复盘、i18n 规范、升级指南、持久化变更等）；
- **agent 友好**：`dsh-plugin-dev-kb` 技能让 dsh 在插件开发任务中自动加载知识库；
  `dsh_kb_search` 工具一次调用完成检索定位；`kb/meta/topics.md` 按任务场景映射要读的文件，`kb/meta/search-index.json` 提供全量检索；
- **人侧可用**：直接浏览 `kb/` 目录，或打开 `kb/INDEX.md` 按 URL 对照查阅；
- 零运行时依赖；唯一的工具 `dsh_kb_search` 为纯 Node 本地实现（不联网、不写文件）。

## 配置

默认零配置，安装即用：

- 不读取环境变量，不需要 API Key / token，不写配置文件；
- 挂载后 `skills/dsh-plugin-dev-kb.md` 技能在会话启动时进入可用技能列表，自动生效；
- `dsh_kb_search` 工具随宿主启动注册，首次调用时构建索引（毫秒级）；如需关闭，
  在 profile 的插件配置里设 `searchTool: false`（只保留技能，不注册工具）；
- 知识库更新走 `npm run rebuild-index`（见「更新知识库」）。

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
`cordis.patch.yml` 末尾加一行手动挂载（**唯一的一次性步骤，复制即用**；
挂载为 profile 根层插件行，其 `skills/` 技能进入全局层）：

```yaml
- insert:
    - id: dsh-plugin-dev-kb
      name: dsh-plugin-dev-kb
```

> 重新启动 / 新建 dsh 会话后，`dsh-plugin-dev-kb` 技能才会出现在可用技能列表中（技能清单在会话启动时快照）。

## 5 分钟验证

重启后开一个新会话，直接问：

> 帮我写一个最小的 dsh 插件

agent 会自动加载 `dsh-plugin-dev-kb` 技能（技能清单里可见），调用 `dsh_kb_search`
（或读 `kb/meta/topics.md`）定位文档后再动手——看到它引用 `kb/site/...` 路径即验证通过。

## 目录结构

```
dsh-plugin-dev-kb/
├── cordis.patch.yml   挂载声明
├── package.json       插件元数据
├── skills/
│   └── dsh-plugin-dev-kb.md   ★ 知识库使用指南（agent 加载此技能）
├── kb/
│   ├── site/          站点镜像：guide/ develop/ reference/（+ en/ 英文站）
│   ├── extra/         仓库补充文档：glossary、defensive-patterns、module-graph、upgrade-guide/、persistence-changes/、postmortem/、i18n/ …
│   ├── meta/
│   │   ├── topics.md         ★ 主题导航：任务场景 → 文件
│   │   ├── search-index.json 全量索引（373 文件）
│   │   ├── source.json       来源 commit / 时间 / 统计
│   │   └── site-pages.txt    线上页面清单
│   ├── INDEX.md        站点 URL ↔ 本地文件 对照
│   └── README.md       知识库总览与更新方法
└── LICENSE
```

## 使用

- **agent 侧**：写插件 / Tool / 配置 / 服务 / 事件 / 打包 / LLM 适配器时，加载
  `dsh-plugin-dev-kb` 技能 → 首选调 `dsh_kb_search` 工具检索（一次拿命中文件 + 行号 + 片段，
  `scope: api` 查 `ctx.*` API 签名）→ 用 read 按行号局部读原文；工具不可用时退回
  grep `kb/` 兜底。
- **人侧**：直接浏览 `kb/` 目录，或打开 `kb/INDEX.md` 按 URL 对照查阅。

## 自检

发布前跑结构自检（离线、零依赖）：

```powershell
npm run selfcheck   # 结构完整 + 入口 / bundle patch 存在性
```

## 更新知识库

见 `kb/README.md`：重新克隆 `deepseek-ai/deepseek-harness`（master 分支），安装投影依赖后
在仓库内调用 `scripts/project-doc-site.ts` 的 `projectDocs()` 生成 `website/.generated/`，
覆盖本插件的 `kb/site/`（并按发布清单同步 `kb/extra/`），再在本插件根目录运行
`node scripts/rebuild-index.mjs` 重建索引与 INDEX.md。

## 相关插件

本插件属于 **Pasumao 的 dsh 插件生态**，同系列已发布插件可搭配使用：

| 插件（npm） | GitHub | 说明 |
|---|---|---|
| [dsh-notify](https://www.npmjs.com/package/dsh-notify) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-notify) | Windows 原生通知 + 系统托盘 |
| [dsh-plugin-choice-refresh](https://www.npmjs.com/package/dsh-plugin-choice-refresh) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-choice-refresh) | 选择增强：重新生成选项 / 更多选项 |
| [dsh-plugin-image-tools](https://www.npmjs.com/package/dsh-plugin-image-tools) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-image-tools) | 图片选择卡 + 回复内嵌图片 + 盲模型收图 |
| [dsh-plugin-table-zoom](https://www.npmjs.com/package/dsh-plugin-table-zoom) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-table-zoom) | 聊天长表格浮窗查看 + 一键复制 Markdown |
| [dsh-plugin-windows-guard](https://www.npmjs.com/package/dsh-plugin-windows-guard) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-windows-guard) | Windows 环境防坑：守则技能 + 乱码检测 / 危险写拦截 / 编码诊断修复 |
| [dsh-plugin-workbench](https://www.npmjs.com/package/dsh-plugin-workbench) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-workbench) | VS Code 风格文件浏览器 + 可编辑预览 |
| [dsh-plugin-context-trim](https://www.npmjs.com/package/dsh-plugin-context-trim) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-context-trim) | 会话注入门控：skill / tool / 提示词段落按会话裁剪 |
> 本系列其余插件见 [Pasumao · dsh 插件](https://github.com/Pasumao)；觉得好用欢迎到 GitHub 点 ⭐。

## AI 生成声明

知识库内容为官方文档的镜像整理（来源标注于 `kb/meta/source.json`），索引与
导航由 AI 辅助生成（DeepSeek Harness），均经人工核对。

## License

[MIT](./LICENSE)
