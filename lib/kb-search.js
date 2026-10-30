/**
 * kb-search — 知识库本地打分检索（零依赖，纯函数）。
 *
 * 为 dsh_kb_search 工具提供两段式能力：
 *   buildIndex(kbDir, log)  扫描 kb/ 构建 内存索引（每文件：相对路径、标题、行数组）。
 *                           中文索引默认扫 site/（跳过 site/en/）+ extra/（跳过 *.zh.md
 *                           的英文原文对？不——extra 中英成对，跳过无 .zh 后缀的英文版）
 *                           + meta/topics.md；英文索引按需构建（lang=en）。
 *   search(index, query, opts)  按空白分词打分：标题命中 ×8、路径命中 ×4、
 *                           正文行命中 ×1（多词同现加权），返回 top N 文件，
 *                           每文件附命中行号与上下文片段（每文件最多 maxSnippets 处）。
 *
 * 设计约束：
 *   - 只读 kb/，绝不写任何文件；索引在内存，宿主重启重建（构建毫秒级）。
 *   - 大文件不整读返回：只回片段 + 行号，模型再按行号 read 局部。
 *   - 输出总量截断保护（renderChars），超出提示用文件工具局部读。
 *   - 失败安全：任何文件读不了就跳过并计数警告，绝不让索引构建抛错崩掉宿主。
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** 单文件大小上限（1.5MB）：超过则跳过正文索引，只保留标题/路径（防止异常大文件拖慢启动）。 */
const MAX_FILE_BYTES = 1_500_000

/** 递归收集目录下全部 .md 文件（相对路径，正斜杠）。 */
function listMarkdownFiles(dir, base) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      out.push(...listMarkdownFiles(full, base))
    } else if (e.isFile() && e.name.endsWith('.md')) {
      out.push(relative(base, full).split(sep).join('/'))
    }
  }
  return out
}

/** 判断相对路径是否纳入指定语言的索引。 */
function includeForLang(rel, lang) {
  if (lang === 'en') {
    // 英文：site/en/** 或 extra 下无 .zh.md 对应的英文原文；topics 导航保留（中文但导航有效）
    if (rel.startsWith('site/en/')) return true
    if (rel.startsWith('extra/')) return !isZhPair(rel)
    if (rel === 'meta/topics.md') return true
    return false
  }
  // 中文：site/ 下除 en/ 外全部；extra/ 下仅 *.zh.md；meta/topics.md
  if (rel.startsWith('site/en/')) return false
  if (rel.startsWith('site/')) return true
  if (rel.startsWith('extra/')) return rel.endsWith('.zh.md')
  if (rel === 'meta/topics.md') return true
  return false
}

/** rel 是否为 extra 下成对的中文版（*.zh.md）——中文索引收 .zh.md，英文索引收无后缀原文。 */
function isZhPair(rel) {
  return rel.endsWith('.zh.md')
}

/** 读文件并切行；读失败返回 null。 */
function readLines(absPath) {
  try {
    const st = statSync(absPath)
    if (st.size > MAX_FILE_BYTES) return null
    return readFileSync(absPath, 'utf8').split(/\r?\n/)
  } catch {
    return null
  }
}

/** 取文件首个 ATX 标题作为 title。 */
function firstHeading(lines) {
  for (const line of lines) {
    const m = /^#{1,6}\s+(.+)$/.exec(line)
    if (m) return m[1].trim()
  }
  return ''
}

/**
 * 构建索引。
 * @param {string} kbDir 知识库根（插件内 kb/ 绝对路径）
 * @param {'zh'|'en'} [lang] 中文索引（默认）：site/ 非 en + extra/*.zh.md + topics；
 *                           英文索引：site/en/** + extra/ 无 .zh 后缀原文。
 * @param {{warn:(...a:any[])=>void}} [log]
 * @returns {{ kbDir: string, lang: string, files: Array<{rel:string, abs:string, title:string, lines:string[]}> }}
 */
export function buildIndex(kbDir, lang = 'zh', log) {
  const warn = log?.warn ?? (() => {})
  const files = []
  const rels = listMarkdownFiles(kbDir, kbDir)
  for (const rel of rels) {
    if (!includeForLang(rel, lang)) continue
    const lines = readLines(join(kbDir, ...rel.split('/')))
    if (!lines) {
      warn(`索引跳过（读取失败或过大）：${rel}`)
      continue
    }
    files.push({ rel, abs: join(kbDir, ...rel.split('/')), title: firstHeading(lines), lines })
  }
  // topics.md 永远排最前候选位（搜索无结果时兜底展示）
  files.sort((a, b) => (a.rel === 'meta/topics.md' ? -1 : b.rel === 'meta/topics.md' ? 1 : a.rel < b.rel ? -1 : 1))
  return { kbDir, lang, files }
}

/** query 按空白分词 + 小写化；空结果返回 []。 */
function tokenize(query) {
  return String(query ?? '')
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // 转成正则安全串
    .filter((t) => t.length > 0)
}

/** 从主词派生标题/路径子词（ctx.tools.register → ctx/tools/register），用于路径与标题的弱匹配。 */
function derivePathTerms(terms) {
  const out = []
  for (const t of terms) {
    for (const seg of t.split(/[._/\\-]+/)) {
      if (seg.length >= 3 && !out.includes(seg)) out.push(seg)
    }
  }
  return out
}

/** API 类文件（scope='api' 时只搜这些）：签名/目录/缝合点文档。 */
const API_PATH_RE = /(tool-catalog|config-catalog|capability-seams|cordis-api\/|subsystems\/|api-gateway|agent-lifecycle|persistence-catalog)/

/**
 * 检索。
 * @param {{kbDir:string, files:Array}} index buildIndex 产物
 * @param {string} query 关键词（空白分隔多词）；空或 'topics' 返回主题导航
 * @param {{scope?:'all'|'api', maxResults?:number, maxSnippets?:number, renderChars?:number}} [opts]
 */
export function search(index, query, opts = {}) {
  const maxResults = Math.min(Math.max(opts.maxResults ?? 8, 1), 20)
  const maxSnippets = opts.maxSnippets ?? 3
  const renderChars = opts.renderChars ?? 12000
  const scope = opts.scope === 'api' ? 'api' : 'all'

  const raw = String(query ?? '').trim()
  if (!raw || raw.toLowerCase() === 'topics') {
    return topicsDigest(index, renderChars)
  }

  const terms = tokenize(raw)
  if (!terms.length) return topicsDigest(index, renderChars)
  const termRes = terms.map((t) => new RegExp(t, 'i'))
  const pathTermRes = derivePathTerms(terms).map((t) => new RegExp(t, 'i'))

  const scored = []
  for (const f of index.files) {
    if (scope === 'api' && !API_PATH_RE.test(f.rel)) continue
    let score = 0
    const hitLineNums = []
    for (let i = 0; i < f.lines.length; i++) {
      let lineHit = 0
      for (let k = 0; k < termRes.length; k++) {
        if (termRes[k].test(f.lines[i])) lineHit++
      }
      if (lineHit > 0) {
        // 多词同现的行更强：词数平方和近似
        score += lineHit * lineHit
        if (hitLineNums.length < 50) hitLineNums.push(i + 1)
      }
    }
    if (score === 0) continue
    // 教程优先：入门/开发/指南路径下的文档在同等得分时更靠前
    if (/^site\/(develop|guide)\//.test(f.rel)) score += 2
    const titleLower = f.title.toLowerCase()
    const relLower = f.rel.toLowerCase()
    for (let k = 0; k < termRes.length; k++) {
      if (termRes[k].test(titleLower)) score += 8
      if (termRes[k].test(relLower)) score += 4
    }
    for (let k = 0; k < pathTermRes.length; k++) {
      if (pathTermRes[k].test(titleLower)) score += 2
      if (pathTermRes[k].test(relLower)) score += 3
    }
    scored.push({ file: f, score, hitLineNums })
  }

  scored.sort((a, b) => b.score - a.score || (a.file.rel < b.file.rel ? -1 : 1))

  const files = []
  let used = 0
  for (const s of scored.slice(0, maxResults)) {
    const f = s.file
    const snippets = []
    // 挑前 maxSnippets 个命中行，每个给前后各 2 行上下文
    for (const ln of s.hitLineNums.slice(0, maxSnippets)) {
      const from = Math.max(1, ln - 2)
      const to = Math.min(f.lines.length, ln + 2)
      const text = f.lines.slice(from - 1, to).join('\n')
      snippets.push({ line: ln, from, text })
    }
    const entry = {
      path: f.rel,
      absPath: f.abs.replaceAll('\\', '/'),
      title: f.title,
      score: s.score,
      hitLines: s.hitLineNums.slice(0, 12),
      snippets,
    }
    // 预算控制：超过 renderChars 就不再多塞文件
    const est = JSON.stringify(entry).length
    if (used + est > renderChars && files.length > 0) break
    used += est
    files.push(entry)
  }

  if (!files.length) {
    return {
      kind: 'empty',
      query: raw,
      scope,
      hint: `无命中。建议：① 换更短的关键词（如 "tool" "config" "event"）；② query 传 "topics" 看主题导航；③ 用文件工具 grep 知识库目录。`,
      topicsPath: absOf(index, 'meta/topics.md'),
    }
  }

  return {
    kind: 'hits',
    query: raw,
    scope,
    truncatedFiles: scored.length > files.length ? scored.length - files.length : 0,
    files,
    hint: '用 read 工具按 absPath + 行号局部读取原文；大文件禁止整读。',
  }
}

/** 主题导航摘要（query 空 / 'topics' / 无命中兜底）。 */
function topicsDigest(index, renderChars) {
  const f = index.files.find((x) => x.rel === 'meta/topics.md')
  if (!f) {
    return {
      kind: 'topics',
      hint: '知识库缺 meta/topics.md；请直接用文件工具 grep 知识库目录。',
      kbRoot: index.kbDir.replaceAll('\\', '/'),
    }
  }
  return {
    kind: 'topics',
    topicsPath: f.abs.replaceAll('\\', '/'),
    text: f.lines.join('\n').slice(0, renderChars),
    hint: '按主题里的文件清单直接 read 对应文档。',
  }
}

function absOf(index, rel) {
  const f = index.files.find((x) => x.rel === rel)
  return f ? f.abs.replaceAll('\\', '/') : `${index.kbDir.replaceAll('\\', '/')}/${rel}`
}
