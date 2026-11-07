---
name: dsh-plugin-starter
description: dsh 插件脚手架助手：从零新建一个合规的 dsh 插件骨架（package.json 含 dsh.bundle.patch 与 peer 显式预发布范围、cordis.patch.yml、双语 README、selfcheck、CHANGELOG、GitHub topics），逐项满足 dsh 官方发布要求与 dsh-market / awesome-dsh-plugin 收录门槛。用户说「新建 dsh 插件 / 做一个插件 / 插件脚手架 / starter」时加载本技能。注意：写 NoneBot 插件时请用 nonebot-plugin-dev-kb，勿用本技能。
whenToUse: 用户要从零开始新建一个 dsh 插件，或问「插件骨架怎么搭 / 发布要准备什么文件」时
---
# dsh 插件脚手架（dsh-plugin-starter）

帮用户从零搭一个**能通过官方校验、能进 market / awesome 收录**的 dsh 插件骨架。
原则：每生成一个文件都对照下方清单自检；知识库文档只读不猜，拿不准就先检索确认。

## 0. 知识库位置

- **知识库根**：`{{KB_ROOT}}`
- 先读两篇再动手：`{{KB_ROOT}}/site/develop/basic/index.md`（插件 = 导出 `apply(ctx)` 的模块，
  `ctx.effect()` 自动清理）与 `{{KB_ROOT}}/site/develop/basic/publish.md`（打包发布）。
- 配置 / 工具 / 事件写法按需检索：`dsh_kb_search`，如 query=`ctx.tools.register 工具定义`。

## 1. 骨架清单（缺一 = 发布/收录会卡）

在用户指定的目录 `<plugin-name>/` 下生成（命名规范：`dsh-plugin-<topic>` 或 `dsh-<topic>`）：

| 文件 | 要点 |
|---|---|
| `package.json` | `"main": "./lib/index.js"`；`files` 数组**必须含 main 入口所在目录**；`license: "MIT"`；`homepage` 指 GitHub 仓库 `#readme`；`repository.url`；`keywords ≥3`（含 `dsh` / `dsh-plugin` / `deepseek-harness`）；**`dsh: { bundle: { patch: "./cordis.patch.yml" } }`**（只声明 `dsh.client` 会被 awesome CI 拒）；`engines.node >=18`；`peerDependencies` 若引 `@deepseek-ai/*`，**范围必须显式覆盖预发布分支**（如 `"^4.0.1"` 对 cordis 可行，对 dsh 主包要写 `">=0.2.0-rc.1 <0.3.0-0"` 形态，否则预发布构建被静默排除）；`scripts.selfcheck` 指向最小自检 |
| `cordis.patch.yml` | 插件自注册声明（`dsh.profile.bundles` 挂载用）；含 Config 时在此声明配置 schema |
| `lib/index.js` | `export function apply(ctx, config)`；零 `@deepseek-ai/*` 运行时 import（插件以 link:/file: 装入 profile，外部依赖按 realpath 解析不到——用原始 definition 形状注册工具，参照 dsh-plugin-windows-guard 先例）；每个注册动作包 `ctx.effect(() => ..., '说明')` |
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
2. 用 dsh-dev-sandbox 技能建独立沙箱 profile 挂载冒烟（不污染主力 dsh）：
   启动日志**不得**出现 `skipping profile bundle "<你的插件>"`（出现 = peer 闸门没过 = 静默失效）
3. `npm pack --dry-run` 核对发布内容（files 不夹带内部文档）
4. 发布流程与版本纪律见 `{{KB_ROOT}}/site/develop/basic/publish.md`

## 5. 红线

- **不要双挂载**：插件经 `dsh.profile.bundles` 进场后，profile 层不得再 insert 同 id
  （`duplicate loader entry id` 启动即崩）
- **不要在插件运行时 import `@deepseek-ai/*`**（见 lib/index.js 要点）
- **不要把凭据写进入库文件**；用户凭据走 credentials ref / 环境变量
- 知识库快照可能领先宿主 dsh 版本：API 行为不符时以宿主实际安装包为准，
  版本差异读 `{{KB_ROOT}}/extra/upgrade-guide/`
