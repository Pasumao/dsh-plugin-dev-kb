# Changelog

## [1.5.0] - 2026-10-21

- **定位升级为「dsh 插件辅助」**（插件 id / 包名 `dsh-plugin-dev-kb` 不变，避免破坏挂载与市场收录）。
- 新增 `dsh-dev-sandbox` 技能：独立 dev profile 开发沙箱工作流——开发中的插件隔离装进
  `~/.dsh/profiles/dev`（默认名，用户可指定），agent 自主后台启动（`dsh web --profile dev
  --port 3081`，npx 拉与主力同版本的 dsh CLI）、自主重启（查端口 PID → Stop-Process → 起回）、
  读 `skipping profile bundle` 警告与崩溃栈、headless 冒烟验证；插件崩了只崩沙箱，
  绝不影响主力 dsh，全程不要求用户重启。含初始化（`plugin --profile dev add file:` /
  `link:` 挂载 / 兼容闸门 / 双挂载禁令）与进主力 profile 的收尾流程。
- `lib/index.js` 无需改动：skills/ 目录自动扫描，新技能文件即插即用。

## [1.4.0] - 2026-10-10

- 知识库同步至上游 master `5badb150`（2026-10-10，对应 dsh `0.2.0-rc.2` / `0.2.1-alpha` 时期）：
  站点镜像维持 188 页（中英 94/94），全部页面内容刷新；页面集合变化：
  `subsystems/code-runtime` → `subsystems/ptc-runtime`（dsh 0.2.0 更名）、`subsystems/invariants`
  移除、新增 `guide/public-deployments`（公共部署，中英一对）、新增 `subsystems/sidebar-right`
  与 `subsystems/client-resources`（中英一对）。
- 补充文档 62 → 182 篇：新增 `upgrade-guide/`（0.1.7-rc.2 / 0.2.0-rc.2 升级指南，
  schedule-bundle-retired / remove-runtime-invariants / subpath-plugin-display-manifest 等）、
  `persistence-changes/`（持久化格式变更记录与历史格式）、`cookbook/reviewing-persistence-type-changes`、
  `subsystems/`（boot / browser-use / claude-code-mods / computer-use / deliverables / mcp /
  office-to-pdf / otel / product-telemetry / ssh / voice-input 等）。
- 更新 `kb/meta/source.json` 与 `site-pages.txt`；重建检索索引（253 → 373 文件）与 INDEX.md；
  `topics.md` 新增「版本升级与持久化变更」主题，子系统速查同步 ptc-runtime 更名与新页面。

## [1.3.0] - 2026-09-10

- 修复：移除每次加载覆写 `state.json` 的调试残留（纯数据插件本不需要持久化状态）；
- 改进：日志改用 `ctx.logger` 标准输出；
- 改进：清理逻辑改为 `ctx.effect` 标准模式（插件卸载自动撤销，零残留）；
- 文档：相关插件段补齐 dsh-plugin-context-trim 行（修复表格断行）；npm files 补 `docs/`（README 引用的 banner）。

## [1.2.0] - 2026-09-10

- 知识库同步至上游 master `aa8262ec`（2026-09-10，距上次基线 `d347e703` 跨 1167 个 commit）：
  站点镜像 184 → 188 页（中英 94/94）；上游 docs 重构进 `docs/user/` 子目录（发布清单
  `website/docs.ts` 照常投影，站点路由不变）。
- 补充文档 58 → 62 篇：新增 `cookbook/adding-a-session-format-version`（会话格式版本号新增流程，
  中英一对）与 `session-format-status`（会话格式状态，中英一对）。
- 更新 `kb/meta/source.json` 与 `site-pages.txt`；重建检索索引（245 → 253 文件）与 INDEX.md。

## [1.1.0] - 2026-09-05

- 知识库同步至上游 master `d347e703`（2026-09-05，对应 dsh `0.1.2-rc.1`）：站点镜像 182 → 184 页
  （中英 92/92），89 页内容更新（config-catalog / tool-catalog / api-gateway / 全部 46 个子系统页 /
  cookbook 3 篇 / guide providers+schedule / cordis-tutorial 07 / llm-adapter 等）；
  新增 `guide/network-proxy`（代理后运行 DSH，中英一对）。
- 补充文档 56 → 58 篇：新增 `cookbook/adding-a-remote-api`（ctx.remote 端点五步操作，中英一对）。
- 更新 `kb/meta/source.json` 与 `site-pages.txt`；重建检索索引（241 → 245 文件）与 INDEX.md；
  `topics.md` 新增 network-proxy 入口与 adding-a-remote-api 扩展条目。

## [1.0.9] - 2026-08-30

- 知识库同步至上游 master `cd5ef814`（2026-08-30）：站点镜像 168 → 182 页（中英 91/91），
  101 页内容更新；新增 `guide/github-review`、`guide/schedule`、`guide/mcp-memory`、
  `develop/practice/dynamic-cordis`、`reference/api-gateway`、`reference/subsystems/conversation|slots|web-client`
  （各中英一对）；移除上游已下线的 `reference/cookbook/adding-a-conversation-node`。
- 补充文档 52 → 56 篇：`api-gateway` 升入站点，新增 `deepseek-llm-api-wire-extensions`、
  `subsystems/todo`、`subsystems/webhook`（各中英一对）。
- 更新 `kb/meta/source.json` 与 `site-pages.txt`；重建检索索引（223 → 241 文件）与 INDEX.md；
  `topics.md` 修复断链并新增「API Gateway 与服务接入」「使用指南进阶」主题。

## [1.0.8] - 2026-08-29

- 文档：首屏数字带（168 页 · 52 篇 · 223 索引 · 0 依赖）；安装 yaml 标注「唯一的一步，复制即用」；新增「5 分钟验证」节；
- 元数据：description/keywords 搜索工程（keywords 10 → 17）；
- 新增英文版 README.en.md 与双语切换行。
## [1.0.7] - 2026-08-25

- 相关插件段新增 dsh-plugin-windows-guard（Windows 环境防坑守则 skill 插件，互相引流）。


## [1.0.6] - 2026-08-21

- 整理：package.json 补 `selfcheck` / `rebuild-index` npm 脚本（发布前可一键自检）；
  `.gitignore` 补 `*.tgz` / `*.orig` / `*.rej` / `.vscode/`；README 新增「自检」小节。

## [1.0.5] - 2026-08-21

- README 新增「相关插件」互相引用段（列出同系列已发布插件，npm / GitHub 链接 + 一句话说明），互相引流。

## [1.0.4] - 2026-08-21

- 知识库同步至上游 master `b150a551`（2026-08-21，对应 dsh `0.1.1-rc.2`）：站点镜像 104 个页面内容更新
  （config-catalog、tool-catalog、capability-seams、persistence-catalog、cookbook、subsystems 若干页等）；
  补充文档 32 篇内容更新（module-graph、event-producer-consumer、i18n、postmortem、subsystems 扩展等）。
  页面结构与中英 84/84 分档不变，仅内容对齐新版本。
- 更新 `kb/meta/source.json` 的 commit 与抓取时间；重建检索索引与 INDEX.md。

## [1.0.3] - 2026-08-20

- 修复知识库路径硬编码：技能正文中的 `D:\dsh\plugins\dsh-plugin-dev-kb\kb\` 改为
  `{{KB_ROOT}}` 占位符，`lib/index.js` 挂载时按插件实际安装位置动态注入绝对路径，
  并声明 `resourceBase`（directory）让 skill 工具渲染相对资源引导——第三方用户
  从 npm 安装后技能同样能正确定位知识库（此前发布版会指向不存在的机器路径）。
- 修复 `kb/meta/topics.md` 断链：删除对不存在的 `site/reference/subsystems/README.md`
  的引用；顶部的知识库绝对路径一并改为相对表述。

## [1.0.2] - 2026-08-20

- 知识库刷新至上游 master `141eb6f`（2026-08-19）：站点镜像 32 个页面（16 页 × 中英）内容更新
  （tool-catalog、capability-seams、architecture、subsystems 若干页等）；补充文档由 50 篇增至
  52 篇（新增 `extra/subsystems/agent-team` 中英一对）；`tool-execution-pipeline` 等页面已在上
  游最新清单内。
- 更新方法改为调用 `scripts/project-doc-site.ts` 的 `projectDocs()`（上游已移除 `run-projector.ts`）。

## [1.0.1] - 2026-08-19

- 官方文档站点完整镜像（中英 168 页）+ 仓库补充文档（50 篇）+ 主题导航与检索。
- 发布 npm、GitHub topics、dsh-market 收录（issue #39/#43）。
