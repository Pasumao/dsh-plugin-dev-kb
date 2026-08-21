# Changelog

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
