// Rebuilds kb/INDEX.md (site URL ↔ local file) and kb/meta/search-index.json.
// Run from the plugin root:  node scripts/rebuild-index.mjs
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), '..')
// Normalize to forward slashes so `rel` derivation matches walk() output on Windows.
const KB = join(PLUGIN, 'kb').replace(/\\/g, '/')
const BASE = 'https://deepseek-harness.github.io/deepseek-harness'

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    if (statSync(abs).isDirectory()) out.push(...walk(abs))
    else out.push(abs)
  }
  return out
}

function stripFrontmatter(text) {
  if (!text.startsWith('---\n')) return text
  const end = text.indexOf('\n---\n', 4)
  return end === -1 ? text : text.slice(end + 5)
}

function firstHeading(text) {
  for (const line of stripFrontmatter(text).split('\n')) {
    const m = line.match(/^#\s+(.+)$/)
    if (m) return m[1].trim()
  }
  return ''
}

function routeToUrl(rel) {
  let p = rel.replace(/\.md$/, '')
  if (p.endsWith('/index')) p = p.slice(0, -6)
  else if (p === 'index') p = ''
  return p === '' ? BASE : `${BASE}/${p}`
}

// ---- collect entries ----
const entries = []
for (const abs of walk(KB)) {
  if (!abs.endsWith('.md')) continue
  const rel = abs.replace(/\\/g, '/').replace(KB + '/', '')
  const text = readFileSync(abs, 'utf8')
  entries.push({
    path: `kb/${rel}`,
    url: rel.startsWith('site/') ? routeToUrl(rel.slice(5)) : '',
    title: firstHeading(text),
    chars: text.length,
    rel,
  })
}
entries.sort((a, b) => a.rel.localeCompare(b.rel))

// ---- search-index.json ----
const indexRows = entries.map(({ path, url, title, chars }) => ({ path, url, title, chars }))
mkdirSync(join(KB, 'meta'), { recursive: true })
writeFileSync(join(KB, 'meta', 'search-index.json'), JSON.stringify(indexRows, null, 1) + '\n', 'utf8')

// ---- INDEX.md ----
const siteRows = entries.filter(e => e.rel.startsWith('site/'))
const en = (rel) => rel.startsWith('site/en/')
const group = (pred) => siteRows.filter(r => pred(r.rel))
const table = (rows) => rows.length === 0
  ? '_（无）_'
  : ['| 页面 | 站点 URL | 本地文件 |', '| --- | --- | --- |']
    .concat(rows.map(r => `| ${r.title || r.rel} | [${r.url}](${r.url}) | \`site/${r.rel.slice(5)}\` |`))
    .join('\n')

const md = []
md.push('# DeepSeek Harness 文档索引', '')
md.push(`> 由 \`scripts/rebuild-index.mjs\` 自动生成。共 ${siteRows.length} 个站点页面（中英双语），另有 ${entries.length - siteRows.length} 个补充文档在 \`extra/\`。`, '')
md.push('## 中文站点（根路径）', '')
md.push('### 首页', '', table(group(rel => rel === 'site/index.md')), '')
md.push('### 入门（/guide/）', '', table(group(rel => !en(rel) && rel.startsWith('site/guide/'))), '')
md.push('### 开发（/develop/）', '', table(group(rel => !en(rel) && rel.startsWith('site/develop/'))), '')
md.push('### 参考（/reference/）', '', table(group(rel => !en(rel) && rel.startsWith('site/reference/'))), '')
md.push('## 英文站点（/en/）', '')
md.push('### 首页', '', table(group(rel => rel === 'site/en/index.md')), '')
md.push('### 全部英文页面（/en/...）', '', table(group(rel => en(rel) && rel !== 'site/en/index.md')), '')
md.push('---', '', `*站点页面：${siteRows.length}（中文 ${siteRows.filter(r => !en(r.rel)).length}，英文 ${siteRows.filter(r => en(r.rel)).length}）*`, '')
writeFileSync(join(KB, 'INDEX.md'), md.join('\n') + '\n', 'utf8')

console.log(`rebuilt INDEX.md + search-index.json (${entries.length} files)`)
