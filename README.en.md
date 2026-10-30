<p align="center">
  <img src="docs/banner.svg" alt="dsh-plugin-dev-kb banner" width="100%">
</p>

# dsh-plugin-dev-kb

![npm version](https://img.shields.io/npm/v/dsh-plugin-dev-kb)
![npm downloads](https://img.shields.io/npm/dm/dsh-plugin-dev-kb)
![License](https://img.shields.io/github/license/Pasumao/dsh-plugin-dev-kb)
![Stars](https://img.shields.io/github/stars/Pasumao/dsh-plugin-dev-kb?style=social)
![AI Assisted](https://img.shields.io/badge/AI-Assisted-8A2BE2)

[中文](./README.md) | **English**

> **192-page official mirror · 439 supplementary docs · 634-file search index · 0 runtime dependencies**

**The official docs at your side whenever you write dsh plugins**: the entire content of the DeepSeek Harness official documentation site
<https://deepseek-harness.github.io/deepseek-harness/> is organized into a form natively usable by dsh —
once this plugin is installed, the agent automatically loads the knowledge base when writing plugins and locates docs by task scenario, so you never have to dig through web pages again.
It also ships the `dsh_kb_search` tool (since 1.6.0): local scored search over the knowledge base that returns matched files, line numbers, and context snippets in a single call.

## What is this

- **Complete site mirror**: the official docs (VitePress) are generated as a projection of the raw Markdown in
  `docs/` of the `deepseek-ai/deepseek-harness` repository (links rewritten to site routes, verbatim identical to the live site). 192 pages in both Chinese and English.
- **Supplementary docs**: 439 development references from the repo's `docs/` that were not published to the site (glossary, defensive patterns, module graph, testing strategy, incident postmortems, i18n specs, upgrade guides, persistence changes, etc.).
- **Agent-friendly**: the `skills/dsh-plugin-dev-kb.md` skill lets dsh auto-load it during plugin development tasks, providing the knowledge base location,
  topic navigation, and search strategy; `kb/meta/topics.md` maps task scenarios to the files to read; `kb/meta/search-index.json` provides full search coverage.
- **Local search tool**: `dsh_kb_search` performs scored search over the knowledge base (title / path / body multi-term weighting) and returns
  matched file paths, line numbers, and context snippets in a single call; supports `scope: api` (search only API-signature/catalog docs),
  `lang: en`, and an empty query returning topic navigation. The index is built lazily in memory (~60ms / 314 files), read-only.

## Features

- **Complete mirror of the official docs**: the entire content of the deepseek-ai/deepseek-harness official documentation site, organized into a form natively usable by dsh,
  192 pages in both Chinese and English, links rewritten to site routes, verbatim identical to the live site;
- **Repo supplementary docs**: 439 development references not published to the site (glossary, defensive patterns, module graph, testing strategy, incident postmortems, i18n specs, upgrade guides, persistence changes, etc.);
- **Agent-friendly**: the `dsh-plugin-dev-kb` skill lets dsh auto-load the knowledge base during plugin development tasks;
  the `dsh_kb_search` tool locates docs in a single call; `kb/meta/topics.md` maps task scenarios to the files to read, and `kb/meta/search-index.json` provides full search coverage;
- **Human-usable**: browse the `kb/` directory directly, or open `kb/INDEX.md` to look things up by URL mapping;
- Zero runtime dependencies; the single tool `dsh_kb_search` is a pure local Node implementation (no network, no file writes).

## Configuration

No configuration required — it works right after installation:

- Reads no environment variables, needs no API key / token, writes no config files;
- After mounting, the `skills/dsh-plugin-dev-kb.md` skill enters the available skills list at session startup and takes effect automatically;
- Knowledge base updates go through `npm run rebuild-index` (see "Updating the knowledge base"); there are no manual configuration items.

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
cd dsh-plugin-dev-kb
npm install
# mount into the profile as a link: dependency
```

This plugin is a "pure data + skill" plugin and does not ship with automatic bundle mounting. After installation, add one line at the end of the profile's
`cordis.patch.yml` to mount it manually (**the only one-time step, just copy it**;
it mounts as a plugin row in the profile root layer, and its `skills/` skill enters the global layer):

```yaml
- insert:
    - id: dsh-plugin-dev-kb
      name: dsh-plugin-dev-kb
```

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
│   └── dsh-plugin-dev-kb.md   ★ knowledge base usage guide (the skill the agent loads)
├── kb/
│   ├── site/          site mirror: guide/ develop/ reference/ (+ en/ English site)
│   ├── extra/         repo supplementary docs: glossary, defensive-patterns, module-graph, postmortem/, i18n/ …
│   ├── meta/
│   │   ├── topics.md         ★ topic navigation: task scenario → files
│   │   ├── search-index.json full index (634 files)
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

See `kb/README.md`: re-clone `deepseek-ai/deepseek-harness` (master branch), install the projection dependencies, then
call `projectDocs()` from `scripts/project-doc-site.ts` inside the repo to generate `website/.generated/`,
overwrite this plugin's `kb/site/` (and sync `kb/extra/` according to the publishing checklist), then run
`node scripts/rebuild-index.mjs` in this plugin's root directory to rebuild the index and INDEX.md.

## Related plugins

This plugin is part of **Pasumao's dsh plugin ecosystem**; other published plugins in the same series can be used alongside it:

| Plugin (npm) | GitHub | Description |
|---|---|---|
| [dsh-notify](https://www.npmjs.com/package/dsh-notify) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-notify) | Native Windows notifications + system tray |
| [dsh-plugin-choice-refresh](https://www.npmjs.com/package/dsh-plugin-choice-refresh) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-choice-refresh) | Choice enhancement: regenerate options / more options |
| [dsh-plugin-image-tools](https://www.npmjs.com/package/dsh-plugin-image-tools) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-image-tools) | Image choice cards + inline images in replies + image handoff for blind models |
| [dsh-plugin-table-zoom](https://www.npmjs.com/package/dsh-plugin-table-zoom) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-table-zoom) | Floating viewer for long chat tables + one-click copy as Markdown |
| [dsh-plugin-windows-guard](https://www.npmjs.com/package/dsh-plugin-windows-guard) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-windows-guard) | Windows environment pitfall prevention: rule skills + mojibake detection / dangerous-write interception / encoding diagnosis & repair |
| [dsh-plugin-workbench](https://www.npmjs.com/package/dsh-plugin-workbench) | [GitHub repo](https://github.com/Pasumao/dsh-plugin-workbench) | VS Code-style file explorer + editable preview |
| [dsh-plugin-context-trim](https://www.npmjs.com/package/dsh-plugin-context-trim) | [GitHub](https://github.com/Pasumao/dsh-plugin-context-trim) | Per-session injection gate: trim skills / tools / prompt sections |
> See [Pasumao · dsh plugins](https://github.com/Pasumao) for the rest of the series; if you find them useful, a ⭐ on GitHub is much appreciated.

## AI-generated content statement

The knowledge base content is an organized mirror of the official documentation (sources noted in `kb/meta/source.json`); the index and
navigation were AI-assisted (DeepSeek Harness), and all of it has been manually verified.

## License

MIT
