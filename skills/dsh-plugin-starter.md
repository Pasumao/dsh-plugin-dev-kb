---
name: dsh-plugin-starter
description: dsh 插件脚手架助手：从零新建一个合规的 dsh 插件骨架（package.json 含 dsh.bundle.patch、兼容闸门与 peer 声明、cordis.patch.yml、Config schema、双语 README、selfcheck、CHANGELOG、GitHub topics），逐项满足 dsh 官方约定与 dsh-market / awesome-dsh-plugin 收录门槛。用户说「新建 dsh 插件 / 做一个插件 / 插件脚手架 / starter」时加载本技能。
whenToUse: 用户要从零开始新建一个 dsh 插件，或问「插件骨架怎么搭 / 发布要准备什么文件」时
---
# dsh 插件脚手架（dsh-plugin-starter）

帮用户从零搭一个**能通过官方闸门、能进 market / awesome 收录**的 dsh 插件骨架。
原则：每生成一个文件都对照下方清单自检；知识库文档只读不猜，拿不准就先检索确认。
下表带「实测」的条目在 dsh 0.2.2-rc.5 上验证过，其余以引用的知识库文档为准。

## 0. 知识库位置

- **知识库根**：`{{KB_ROOT}}`
- 先读两篇再动手：`{{KB_ROOT}}/site/develop/basic/index.md`（插件 = 导出 `apply(ctx)` 的模块，
  `ctx.effect()` 自动清理）与 `{{KB_ROOT}}/site/develop/basic/publish.md`（组合包 / profile、安装、层顺序）。
- 配置 / 工具 / 事件写法按需检索：`dsh_kb_search`，如 query=`ctx.tools.register 工具定义`。

## 1. 骨架清单（缺一 = 发布/收录会卡）

在用户指定的目录 `<plugin-name>/` 下生成（命名规范：`dsh-plugin-<topic>` 或 `dsh-<topic>`）：

| 文件 | 要点 |
|---|---|
| `package.json` | `"type": "module"`、`"main": "./lib/index.js"`；`files` **必须含入口文件所在目录与 `cordis.patch.yml`**；**`dsh: { bundle: { patch: "./cordis.patch.yml" } }`**（没有它的包能装但不挂载；只声明 `dsh.client` 会被 awesome CI 拒）；**兼容闸门**：声明了 `engines.dsh`（SemVer 范围字符串，不能是 `workspace:`）就只看它，没声明才看 `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` 的 `peerDependencies`——实测在预发布宿主 `0.2.2-rc.5` 上 `">=0.2.0 <0.3.0"` 通过、`"^0.2.2"` 被拒（rc 排在正式版之前），所以范围要覆盖真实支持的全部版本、下界别把预发布排除在外；**导入宿主包就必须把它声明进 `peerDependencies`**（见 `lib/index.js` 行），TS 项目同时写进 `devDependencies` 供类型检查与测试；`engines.node` 写插件代码真正需要的最低 Node（宿主自 0.2.1-rc.2 之后的版本起要求 Node ≥ 24.9，见 `{{KB_ROOT}}/extra/upgrade-guide/v0.2.1-rc.2/node-24/guide.zh.md`）；`license` / `homepage` / `repository.url` / `keywords ≥3`（含 `dsh` / `dsh-plugin` / `deepseek-harness`）；`scripts.selfcheck` 指向最小自检 |
| `cordis.patch.yml` | bundle 的挂载层：`- insert: [{ id: <包名>, name: <包名> }]`；行上可带 `config:` 传配置（后应用的层按行**整体替换** `config`，不做深合并） |
| `lib/index.js` | `export const name`、`export const inject = ['tools', …]`、`export function apply(ctx, config)`；`ctx.tools.register()` / `ctx.skills.register()` 返回的就是 effect disposer，可直接交给 `ctx.effect(() => …, '说明')`。工具两种写法都受官方支持（`{{KB_ROOT}}/site/reference/cookbook/adding-a-tool.md`）：① `import { defineTool } from '@deepseek-ai/dsh-tools'` + `ctx.tools.register(defineTool({ name, description, parameters, output, async execute(args, exec) }))`，入参由宿主校验；② 零依赖的原始 JSON Schema definition（`parameters` 为标准 JSON Schema，`output: { schema, render }`）——**宿主不校验入参**（实测：类型错误、非法 JSON 都原样进入 `execute`），必须自行兜底 |
| Config（可选） | 导出 Schemastery schema：`export const Config = Schema.object({ … })`，默认值写在 schema 里（`{{KB_ROOT}}/site/develop/basic/config.md`）；不要导出普通对象——不满足 Cordis 要求的 Standard Schema 接口 |
| `README.md` | ① 顶部标题 + 一句话描述；② `## 安装` 段**必须含标准安装命令**（`git clone` / `npm install` 等——market ease 项）；③ `## 功能` + `## 配置`/`## 示例` 双标题；④ ≥2 个代码块；⑤ `## 相关插件` 互相引用段（列同系列全部**已发布**插件：npm 链 + GitHub 链 + 一句话）；⑥ 长度 >2000 字更佳；⑦ 需要 `AI 生成声明` 段 |
| `README.en.md` | 结构与中文一致（i18n 规范见 `{{KB_ROOT}}/extra/i18n/`） |
| `CHANGELOG.md` | `## x.y.z - 日期` 逐版条目：修了什么/为什么/怎么验证 |
| `LICENSE` | MIT |
| `scripts/selfcheck.mjs` | 最小结构自检（文件存在性 + package.json 关键字段），发布前必跑 |
| `.github/workflows/`（可选） | CI / 自动化（如每周内容同步） |

## 2. 命名与元数据红线

- 目录名 = npm 包名（例外如 `dsh-notify` 是历史遗留，新插件不要再造）
- **README 里写「无需配置」时必须带否定词**（"无需 / 不需要 / zero-config"）——market 的
  needsConfig 反向检测按裸关键词（`API_KEY` 等）扫描，否定语境会被先摘除；确需配置的插件
  写配置项时避免裸写这些 KEY 名
- 描述不得夸大：awesome 评审会对着源码逐条核对数字 / 命令 / API 名

## 3. GitHub 侧（骨架生成后提醒用户补）

```powershell
gh api -X PATCH repos/<owner>/<repo> -f description="…（一句话中文简介，勿夸大）" -f homepage="https://github.com/<owner>/<repo>#readme"
# topics 至少含 dsh / dsh-plugin / deepseek-harness + 主题词——缺 topics 是 market 收录失败最常见原因
gh api -X PUT repos/<owner>/<repo>/topics --input topics.json
```

## 4. 验证闭环

1. `node scripts/selfcheck.mjs` → 全部通过
2. 用 dsh-dev-sandbox 技能建独立沙箱 profile 挂载冒烟（不污染主力 dsh）。两条都要看：
   - 安装时被拒：`dsh: installation rejected: Plugin X@Y is incompatible with dsh Z`（闸门没过，安装已回滚）；
   - 启动日志**不得**出现 `dsh: skipping profile bundle "<你的插件>"` 或 `dsh: warning: N entry did not activate`
     （出现 = 静默失效，不崩但功能没了）。
3. `npm pack --dry-run` 核对发布内容（files 不夹带内部文档）
4. 发布流程与版本纪律见 `{{KB_ROOT}}/site/develop/basic/publish.md`

## 5. 红线

- **不要把同一插件挂两次**：进了 `dsh.profile.bundles` 的插件，不要再在 profile patch 里用**别的 id**
  insert 同一个包名（实测 rc.5：第二个实例激活失败并告警 `tool "…" is already registered`；旧宿主
  报 `duplicate loader entry id` 启动即崩）。要改它的配置，用**与 bundle 行相同的 id** 写条目——
  那是按 id 覆盖该行，不会重复挂载
- **导入 `@deepseek-ai/*` 宿主包必须声明 peer**：实测声明为 peer 的包在 `link:` / `file:` 两种安装形态下
  都解析到运行中 dsh 的副本；未声明的包从外部 `link:` 目录 import 会 `ERR_MODULE_NOT_FOUND`
- **不要把凭据写进入库文件**；用户凭据走 credentials ref / 环境变量
- 知识库快照可能领先宿主 dsh 版本：API 行为不符时以宿主实际安装包为准，
  版本差异读 `{{KB_ROOT}}/extra/upgrade-guide/`
