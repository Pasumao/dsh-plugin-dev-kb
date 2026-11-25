<p align="center">
  <img src="docs/banner.svg" alt="dsh-plugin-dev-kb banner" width="100%">
</p>

# dsh-plugin-dev-kb

![npm version](https://img.shields.io/npm/v/dsh-plugin-dev-kb)
![npm downloads](https://img.shields.io/npm/dm/dsh-plugin-dev-kb)
![License](https://img.shields.io/github/license/Pasumao/dsh-plugin-dev-kb)
![Stars](https://img.shields.io/github/stars/Pasumao/dsh-plugin-dev-kb?style=social)
![AI Assisted](https://img.shields.io/badge/AI-Assisted-8A2BE2)
![kb sync](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FPasumao%2Fdsh-plugin-dev-kb%2Fmain%2Fkb%2Fmeta%2Fsource.json)

[**中文**](./README.md) | [English](./README.en.md)

> **198 页官方镜像 · 658 篇独占补充文档 · 每周自动同步上游 · 0 运行时依赖**

**写 dsh 插件时的随身辅助**：① 把 DeepSeek Harness 官方文档站点
<https://deepseek-harness.github.io/deepseek-harness/> 的全部内容整理为 dsh 原生可用的形态——
装了这个插件，agent 写插件时自动加载知识库，按任务场景定位文档，不用再翻网页；
② 附带 `dsh-dev-sandbox` 技能：自建独立沙箱 profile 开发沙箱工作流（沙箱名由 agent 按任务自定），
开发中的插件隔离运行，agent 自主启动 / 重启 / 冒烟验证，插件崩了不影响主力 dsh；
③ `dsh_kb_search` 工具（1.6.0 起）：知识库本地打分检索，一次调用返回命中文件 + 行号 + 上下文片段；
④ `dsh-upgrade-assistant` 技能（1.7.0 起）：升级 dsh 版本时，agent 自动读官方升级指南与持久化变更记录，
生成迁移检查清单、预判插件兼容闸门与回滚方案；
⑤ 版本感知横幅 + `dsh_kb_read` 工具（1.8.0 起）：工具输出自动标注「知识库快照 vs 宿主 dsh 版本」差异
并给出对应升级指南（desktop 形态从桌面壳 `app.asar` 读真实核心版本，避免 profile 层共享副本落后导致误报，
读不到时横幅会说明已回退；CLI / web 形态自 1.8.6 起从宿主进程入口读版本）；按路径 + 行号窗口局部阅读原文，防大文件整读、自动提示中英对照；
⑥ `dsh-plugin-starter` 技能（1.8.0 起）：从零新建合规 dsh 插件的脚手架指南（骨架清单 / 兼容闸门 / 收录门槛 / 验证闭环）。

## 这是什么

- **站点完整镜像**：官方文档（VitePress）由仓库 `deepseek-ai/deepseek-harness` 的 `docs/` 原始 Markdown
  投影生成（链接已按站点路由重写，与线上逐字一致）。中英双语共 198 页。
- **补充文档**：仓库 `docs/` 中未发布到站点的 658 篇开发参考（术语表、防御模式、编码准则、模块图、测试策略、事故复盘、i18n 规范、升级指南、持久化变更等）——这部分是**官方仓库独占内容，线上站点看不到**。
- **agent 友好**：`skills/dsh-plugin-dev-kb.md` 技能让 dsh 在插件开发任务中自动加载，获知知识库位置、
  主题导航与检索策略；`kb/meta/topics.md` 按任务场景映射要读的文件；`kb/meta/search-index.json` 提供全量检索。
- **开发沙箱**：`skills/dsh-dev-sandbox.md` 技能提供自建独立沙箱 profile 工作流（沙箱名 agent 按任务
  自定，不与主力 profile 重名）——初始化（兼容闸门 / link: 挂载）、后台启动（自选空闲端口）、自主重启、headless 冒烟验证，
  全程 agent 闭环，不要求用户重启。
- **本地检索工具**：`dsh_kb_search` 工具在知识库上做打分检索（标题 / 路径 / 正文多词加权），
  一次调用返回命中文件路径、行号与上下文片段；支持 `scope: api`（只搜 API 签名/目录类文档）、
  `lang: en`、空 query 返回主题导航。索引惰性构建于内存（中文索引 427 个文件，构建约 60–80ms），只读不写。
- **版本感知（1.8.0 起）**：工具输出自带横幅——宿主 dsh 版本 vs 知识库 master 快照可能存在的
  API 差异，并给出对应的 `extra/upgrade-guide/<vX.Y.Z>` 指南路径（该目录收录的是此版本之后引入的变更，
  部分可能尚未进入当前宿主）；探测失败自动降级（无横幅不报错）。
- **局部阅读工具（1.8.0 起）**：`dsh_kb_read` 按 `path`/`offset`/`limit` 行号窗口读原文，
  带行号输出、防大文件整读、拒绝越界路径，自动提示中英对照路径与续读位置。

## 功能

- **官方文档完整镜像**：deepseek-ai/deepseek-harness 官方文档站全部内容整理为 dsh 原生可用的形态，
  中英双语共 198 页，链接按站点路由重写，与线上逐字一致；
- **仓库补充文档**：未发布到站点的 658 篇开发参考（术语表、防御模式、编码准则、模块图、测试策略、事故复盘、i18n 规范、升级指南、持久化变更等）；
- **每周自动同步**：GitHub Action 定时从上游 master 刷新（见顶部「kb sync」badge 可查同步日期与 commit）；
- **agent 友好**：`dsh-plugin-dev-kb` 技能让 dsh 在插件开发任务中自动加载知识库；
  `dsh_kb_search` 工具一次调用完成检索定位；`kb/meta/topics.md` 按任务场景映射要读的文件，`kb/meta/search-index.json` 提供全量检索；
- **人侧可用**：直接浏览 `kb/` 目录，或打开 `kb/INDEX.md` 按 URL 对照查阅；
- 零运行时依赖；两个工具（`dsh_kb_search` / `dsh_kb_read`）为纯 Node 本地实现（不联网、不写文件）。

## 30 秒验证装好了

安装挂载后，随便开个会话问 agent：

> dsh 0.2.0 的设置子系统（SettingsForms）和以前有什么不一样？

- agent 用 `dsh_kb_search` 检索并答出 `SettingsForms` / `.volatile()` / 修订号冲突检测等细节 = **装好了**；
- 答不上来或检索工具不存在 = 挂载没生效，回看「安装 / 挂载」一步。

## 配置

默认零配置，安装即用：

- 不读取环境变量，不需要 API Key / token，不写配置文件；
- 挂载后 `skills/dsh-plugin-dev-kb.md` 等 4 个技能在会话启动时进入可用技能列表，自动生效；
- `dsh_kb_search` / `dsh_kb_read` 两个工具随宿主启动注册，首次调用时构建索引（毫秒级）；
- 两个开关相互独立，都为 `false` 时只保留技能。要关闭，在 profile 的 `cordis.patch.yml`
  （或各 profile 共享的 `$DSH_HOME/cordis.patch.yml`）里用**与本插件 bundle 行相同的 id** 写一条覆盖行：

  ```yaml
  - id: dsh-plugin-dev-kb
    config:
      searchTool: false   # 不注册 dsh_kb_search
      readTool: false     # 不注册 dsh_kb_read
  ```

  按 id 写的条目是覆盖该行、不是重复挂载；后应用的层会整体替换 `config`，所以需要的键要写全。
- 知识库更新走仓库的 `npm run refresh-kb`（见「更新知识库」）；插件运行时本身不需要任何配置。

## 安装 / 挂载

**DSH Desktop 客户端**：`desktop` profile 由客户端独占管理（CLI 会拒绝：
`profile "desktop" is managed exclusively by the Electron application`），请在客户端自带的插件管理界面里安装
npm 包 `dsh-plugin-dev-kb`。

**CLI / Web**（`dsh` 命令行，profile 名以 `web` 为例）：

```powershell
# npm（推荐）
dsh plugin --profile web add dsh-plugin-dev-kb
# 或 GitHub
dsh plugin --profile web add github:Pasumao/dsh-plugin-dev-kb
```

源码安装（本地开发 / 调试）：

```bash
git clone https://github.com/Pasumao/dsh-plugin-dev-kb.git
# 以本地目录装进 profile（同样走 dsh plugin add；--profile 必须写在 pnpm 参数之前）
dsh plugin --profile <name> add file:/绝对路径/dsh-plugin-dev-kb
```

本插件自带 bundle（`package.json` 声明 `dsh.bundle.patch` → `cordis.patch.yml`），`dsh plugin add`
会自动把它加入 profile 的 `dsh.profile.bundles` 完成挂载，不需要再手动 insert。**不要用别的 id
再 insert 同一个包名**——那才是双挂载：第二个实例会因工具重名激活失败
（`tool "dsh_kb_search" is already registered`），旧版宿主则启动即崩。可用
`dsh --profile <name> --dump-config` 确认出现 `# == dsh-plugin-dev-kb` 层。

> 刚安装后如果当前会话里还看不到 `dsh-plugin-dev-kb` 技能，新开一个会话即可（技能目录在后续模型步骤前重新观测）。

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
│   ├── dsh-plugin-dev-kb.md      ★ 知识库使用指南（agent 加载此技能）
│   ├── dsh-dev-sandbox.md        开发沙箱工作流
│   ├── dsh-upgrade-assistant.md  dsh 升级助手
│   └── dsh-plugin-starter.md     新建插件脚手架
├── scripts/           refresh-kb / rebuild-index / selfcheck / smoke
├── lib/               插件入口与工具实现（index / kb-search / kb-version）
├── kb/
│   ├── site/          站点镜像：guide/ develop/ reference/（+ en/ 英文站）
│   ├── extra/         仓库补充文档：glossary、defensive-patterns、module-graph、upgrade-guide/、persistence-changes/、postmortem/、i18n/ …
│   ├── meta/
│   │   ├── topics.md         ★ 主题导航：任务场景 → 文件
│   │   ├── search-index.json 全量索引（859 文件）
│   │   ├── source.json       来源 commit / 时间 / 统计
│   │   └── site-pages.txt    线上页面清单
│   ├── INDEX.md        站点 URL ↔ 本地文件 对照
│   └── README.md       知识库总览与更新方法
└── LICENSE
```

## 使用

- **agent 侧**：写插件 / Tool / 配置 / 服务 / 事件 / 打包 / LLM 适配器时，加载
  `dsh-plugin-dev-kb` 技能 → 首选调 `dsh_kb_search` 工具检索（一次拿命中文件 + 行号 + 片段，
  `scope: api` 查 `ctx.*` API 签名）→ 再用 `dsh_kb_read` 按行号窗口读上下文；工具不可用时退回
  grep `kb/` 兜底。
- **人侧**：直接浏览 `kb/` 目录，或打开 `kb/INDEX.md` 按 URL 对照查阅。

## 自检

发布前跑结构自检与离线冒烟（零依赖、不改仓库文件）：

```powershell
npm run selfcheck   # 结构完整 + 入口 / bundle patch 存在性 + 派生清单与镜像一致
npm run smoke        # 假 harness 真执行两个工具：版本探测、技能 / 工具注册、入参兜底
```

## 更新知识库

在本插件根目录一条命令完成（Windows，需 git / node / robocopy）：

```powershell
npm run refresh-kb   # = node scripts/refresh-kb.mjs
```

脚本自动执行：浅克隆上游 `deepseek-ai/deepseek-harness`（master，公开仓库，无需 token）→ 安装投影依赖 →
`projectDocs()` 生成站点投影 → 镜像覆盖 `kb/site/` → 按发布清单重建 `kb/extra/` →
重建索引与 INDEX.md（含 `kb/meta/site-pages.txt` 页面清单），并更新 `kb/meta/source.json` 的 commit / 统计。
仓库还带 GitHub Action（`.github/workflows/refresh-kb.yml`）每周自动同步上游并提交，
顶部「kb sync」badge 即读取 `source.json` 显示最近同步日期与 commit。

## 相关插件

本插件属于 **Pasumao 的 dsh 插件生态**，同系列已发布插件可搭配使用：

| 插件（npm） | GitHub | 说明 |
|---|---|---|
| [dsh-notify](https://www.npmjs.com/package/dsh-notify) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-notify) | Windows 原生通知 |
| [dsh-plugin-image-tools](https://www.npmjs.com/package/dsh-plugin-image-tools) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-image-tools) | 图片选择卡 + 回复内嵌图片 + 盲模型收图 |
| [dsh-plugin-table-zoom](https://www.npmjs.com/package/dsh-plugin-table-zoom) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-table-zoom) | 聊天长表格浮窗查看 + 一键复制 Markdown |
| [dsh-plugin-windows-guard](https://www.npmjs.com/package/dsh-plugin-windows-guard) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-windows-guard) | Windows 环境防坑：守则技能 + 乱码检测 / 危险写拦截 / 编码诊断修复 |
| [dsh-plugin-context-trim](https://www.npmjs.com/package/dsh-plugin-context-trim) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-context-trim) | 会话注入门控：skill / tool / 提示词段落按会话裁剪 |
| [dsh-plugin-future-session](https://www.npmjs.com/package/dsh-plugin-future-session) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-future-session) | 现实/未来会话：工具调用由继承全部上下文的未来会话代执行，主上下文只保留「一次调用+一份结论」 |
| [dsh-plugin-agentos](https://www.npmjs.com/package/dsh-plugin-agentos) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-agentos) | Agent OS 调度网关：并发/队列/重试/优雅停机 + 混合通道智能调度 |

> 本系列其余插件见 [Pasumao · dsh 插件](https://github.com/Pasumao)；觉得好用欢迎到 GitHub 点 ⭐。

## AI 生成声明

知识库内容为官方文档的镜像整理（来源标注于 `kb/meta/source.json`），索引与
导航由 AI 辅助生成（DeepSeek Harness），均经人工核对。

## License

[MIT](./LICENSE)
