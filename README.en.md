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

[中文](./README.md) | **English**

> **198-page official mirror · 658 exclusive supplementary docs · weekly auto-sync from upstream · 0 runtime dependencies**

**The official docs at your side whenever you write dsh plugins**: the entire content of the DeepSeek Harness official documentation site
<https://deepseek-harness.github.io/deepseek-harness/> is organized into a form natively usable by dsh —
once this plugin is installed, the agent automatically loads the knowledge base when writing plugins and locates docs by task scenario, so you never have to dig through web pages again.
It also ships the `dsh-dev-sandbox` skill: a self-built isolated sandbox-profile development workflow (the agent picks the sandbox name per task) where the plugin under development runs in isolation and the agent starts / restarts / smoke-tests it autonomously — a crashing plugin never takes down your main dsh.
The `dsh_kb_search` tool (since 1.6.0) does local scored search over the knowledge base, returning matched files, line numbers, and context snippets in a single call,
and the `dsh-upgrade-assistant` skill (since 1.7.0): when you upgrade dsh, the agent reads the official per-version upgrade guides and persistence-change records, produces a migration checklist, flags plugin compatibility-gate risks, and plans a rollback path.
Since 1.8.0 it also ships a version-aware banner plus the `dsh_kb_read` tool (tool output flags "knowledge-base snapshot vs host dsh version" drift and points at the matching upgrade guide; since 1.8.5 the desktop form reads the real core version from the shell's `app.asar`, and the banner says so when it has to fall back; line-numbered windowed reading prevents whole-file reads of huge docs) and the `dsh-plugin-starter` skill (a scaffold guide for creating compliant dsh plugins from scratch: file checklist, marketplace/awesome gates, verification loop).

## What is this

- **Complete site mirror**: the official docs (VitePress) are generated as a projection of the raw Markdown in
  `docs/` of the `deepseek-ai/deepseek-harness` repository (links rewritten to site routes, verbatim identical to the live site). 198 pages in both Chinese and English.
- **Supplementary docs**: 658 development references from the repo's `docs/` that were not published to the site (glossary, defensive patterns, coding guidelines, module graph, testing strategy, incident postmortems, i18n specs, upgrade guides, persistence changes, etc.) — this is **exclusive content from the official repo that you won't find on the live site**.
- **Agent-friendly**: the `skills/dsh-plugin-dev-kb.md` skill lets dsh auto-load it during plugin development tasks, providing the knowledge base location,
  topic navigation, and search strategy; `kb/meta/topics.md` maps task scenarios to the files to read; `kb/meta/search-index.json` provides full search coverage.
- **Development sandbox**: the `skills/dsh-dev-sandbox.md` skill provides a self-built isolated sandbox-profile workflow (the agent picks the sandbox name per task, never colliding with your main profile) — initialization (compatibility gate / link: mount), background startup on a free port, autonomous restarts, headless smoke verification; the whole loop is agent-driven and never asks the user to restart.
- **Local search tool**: `dsh_kb_search` performs scored search over the knowledge base (title / path / body multi-term weighting) and returns
  matched file paths, line numbers, and context snippets in a single call; supports `scope: api` (search only API-signature/catalog docs),
  `lang: en`, and an empty query returning topic navigation. The index is built lazily in memory (~55ms / 427 files for the Chinese index), read-only.
- **Version awareness (since 1.8.0)**: tool output carries a banner — host dsh version vs the knowledge-base
  master snapshot may drift on APIs, with the matching `extra/upgrade-guide/<vX.Y.Z>` guide path; since 1.8.5 the desktop form reads the real core version from the shell's `app.asar` (searching the archive tree layer by layer, independent of the shell's packaging layout), and when the core package cannot be read the banner explicitly says it fell back to a possibly stale copy; detection
  degrades gracefully (no banner, no error).
- **Windowed reading tool (since 1.8.0)**: `dsh_kb_read` reads originals by `path`/`offset`/`limit` line windows,
  with numbered output, whole-file-read protection, path-escape rejection, automatic zh↔en counterpart hints, and continuation pointers.

## Features

- **Complete mirror of the official docs**: the entire content of the deepseek-ai/deepseek-harness official documentation site, organized into a form natively usable by dsh,
  198 pages in both Chinese and English, links rewritten to site routes, verbatim identical to the live site;
- **Repo supplementary docs**: 658 development references not published to the site (glossary, defensive patterns, coding guidelines, module graph, testing strategy, incident postmortems, i18n specs, upgrade guides, persistence changes, etc.);
- **Weekly auto-sync**: a GitHub Action refreshes the knowledge base from upstream master on schedule (see the "kb sync" badge above for the sync date and commit);
- **Agent-friendly**: the `dsh-plugin-dev-kb` skill lets dsh auto-load the knowledge base during plugin development tasks;
  the `dsh_kb_search` tool locates docs in a single call; `kb/meta/topics.md` maps task scenarios to the files to read, and `kb/meta/search-index.json` provides full search coverage;
- **Human-usable**: browse the `kb/` directory directly, or open `kb/INDEX.md` to look things up by URL mapping;
- Zero runtime dependencies; two tools (`dsh_kb_search` / `dsh_kb_read`), pure local Node implementations (no network, no file writes).

## Verify in 30 seconds

After installation, ask the agent in any session:

> What changed in the dsh 0.2.0 settings subsystem (SettingsForms) compared to before?

- If the agent uses `dsh_kb_search` and answers with details like `SettingsForms` / `.volatile()` / revision conflict detection, it is **installed correctly**;
- If it cannot answer or the search tool is missing, the mount did not take effect — recheck the "Install" step.

## Configuration

No configuration required — it works right after installation:

- Reads no environment variables, needs no API key / token, writes no config files;
- After mounting, the `skills/dsh-plugin-dev-kb.md` skill enters the available skills list at session startup and takes effect automatically;
- The `dsh_kb_search` tool is registered at host startup and builds its index on first call (milliseconds); to disable it,
  set `searchTool: false` in the profile's plugin config (keeps the skill, skips tool registration);
- Knowledge base updates go through the repo's `npm run refresh-kb` (see "Updating the knowledge base"); the plugin runtime itself needs no configuration.

## Install / Mount

```powershell
# npm (recommended)
dsh plugin --profile web add dsh-plugin-dev-kb
# or GitHub
dsh plugin --profile web add github:Pasumao/dsh-plugin-dev-kb
```

Install from source (local development / debugging):

```bash
git clone https://github.com/Pasumao/dsh-plugin-dev-kb.git
# mount the local directory into a profile (also via dsh plugin add)
dsh plugin --profile <name> add file:/absolute/path/dsh-plugin-dev-kb
```

This plugin ships its own bundle (`package.json` declares `dsh.bundle.patch` → `cordis.patch.yml`), and `dsh plugin add`
automatically adds it to the profile's `dsh.profile.bundles` to complete the mount — you **neither need nor should**
manually `insert` a plugin row with the same id into the profile's `cordis.patch.yml`: the bundle layer already
registers it once, and inserting again is a double mount that crashes startup with `duplicate loader entry id`.
Use `dsh --profile <name> --dump-config` to confirm the `# == dsh-plugin-dev-kb` layer appears.

> Only after restarting / creating a new dsh session will the `dsh-plugin-dev-kb` skill appear in the available skills list (the skill catalog is snapshotted at session startup).

## 5-minute verification

After restarting, open a new session and simply ask:

> Help me write a minimal dsh plugin

The agent will automatically load the `dsh-plugin-dev-kb` skill (visible in the skill catalog), locate the docs via the `dsh_kb_search` tool
(or `kb/meta/topics.md`), and only then start working — if you see it referencing `kb/site/...` paths, the verification has passed.

## Directory structure

```
dsh-plugin-dev-kb/
├── cordis.patch.yml   mount declaration
├── package.json       plugin metadata
├── skills/
│   ├── dsh-plugin-dev-kb.md      ★ knowledge base usage guide (the skill the agent loads)
│   ├── dsh-dev-sandbox.md        development sandbox workflow
│   ├── dsh-upgrade-assistant.md  dsh upgrade assistant
│   └── dsh-plugin-starter.md     new-plugin scaffold
├── scripts/           refresh-kb / rebuild-index / selfcheck / smoke
├── lib/               plugin entry and tool implementations (index / kb-search / kb-version)
├── kb/
│   ├── site/          site mirror: guide/ develop/ reference/ (+ en/ English site)
│   ├── extra/         repo supplementary docs: glossary, defensive-patterns, module-graph, upgrade-guide/, persistence-changes/, postmortem/, i18n/ …
│   ├── meta/
│   │   ├── topics.md         ★ topic navigation: task scenario → files
│   │   ├── search-index.json full index (859 files)
│   │   ├── source.json       source commit / time / stats
│   │   └── site-pages.txt    list of live site pages
│   ├── INDEX.md        site URL ↔ local file mapping
│   └── README.md       knowledge base overview and update instructions
└── LICENSE
```

## Usage

- **Agent side**: when writing plugins / Tools / config / services / events / packaging / LLM adapters, load
  the `dsh-plugin-dev-kb` skill → prefer the `dsh_kb_search` tool (one call returns matched files + line numbers + snippets;
  `scope: api` for `ctx.*` API signatures) → read the source locally by line number; fall back to grepping `kb/` if the tool is unavailable.
- **Human side**: browse the `kb/` directory directly, or open `kb/INDEX.md` to look things up by URL mapping.

## Self-check

Run the structural self-check before publishing (offline, zero dependencies):

```powershell
npm run selfcheck   # structural integrity + entry / bundle patch existence
```

## Updating the knowledge base

One command from this plugin's root directory (Windows; requires git / node / robocopy):

```powershell
npm run refresh-kb   # = node scripts/refresh-kb.mjs
```

The script automatically: shallow-clones upstream `deepseek-ai/deepseek-harness` (master) → installs the projection
dependencies → runs `projectDocs()` to generate the site projection → mirrors it over `kb/site/` → rebuilds `kb/extra/`
from the publishing checklist → rebuilds the index and INDEX.md, and updates the commit / stats in `kb/meta/source.json`.
The repo also ships a GitHub Action (`.github/workflows/refresh-kb.yml`) that syncs from upstream master weekly and commits;
the "kb sync" badge above reads `source.json` to show the latest sync date and commit.

## Related plugins

This plugin is part of **Pasumao's dsh plugin ecosystem**; other published plugins in the same series can be used alongside it:

| Plugin (npm) | GitHub | Description |
|---|---|---|
| [dsh-notify](https://www.npmjs.com/package/dsh-notify) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-notify) | Native Windows notifications |
| [dsh-plugin-choice-refresh](https://www.npmjs.com/package/dsh-plugin-choice-refresh) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-choice-refresh) | Choice enhancement: regenerate options / more options |
| [dsh-plugin-image-tools](https://www.npmjs.com/package/dsh-plugin-image-tools) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-image-tools) | Image choice cards + inline images in replies + image handoff for blind models |
| [dsh-plugin-table-zoom](https://www.npmjs.com/package/dsh-plugin-table-zoom) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-table-zoom) | Floating viewer for long chat tables + one-click copy as Markdown |
| [dsh-plugin-windows-guard](https://www.npmjs.com/package/dsh-plugin-windows-guard) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-windows-guard) | Windows environment pitfall prevention: rule skills + mojibake detection / dangerous-write interception / encoding diagnosis & repair |
| [dsh-plugin-context-trim](https://www.npmjs.com/package/dsh-plugin-context-trim) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-context-trim) | Per-session injection gate: trim skills / tools / prompt sections |
| [dsh-plugin-future-session](https://www.npmjs.com/package/dsh-plugin-future-session) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-future-session) | Real/future sessions: tool calls are executed by a future session inheriting the full context; the main context keeps only "one call + one conclusion" |
| [dsh-plugin-agentos](https://www.npmjs.com/package/dsh-plugin-agentos) | Not public (private repo) | Agent OS scheduling gateway: concurrent scheduling / mixed channels / task manager |
> See [Pasumao · dsh plugins](https://github.com/Pasumao) for the rest of the series; if you find them useful, a ⭐ on GitHub is much appreciated.

## AI-generated content statement

The knowledge base content is an organized mirror of the official documentation (sources noted in `kb/meta/source.json`); the index and
navigation were AI-assisted (DeepSeek Harness), and all of it has been manually verified.

## License

[MIT](./LICENSE)
