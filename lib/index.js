/**
 * dsh-plugin-dev-kb — 主机插件（技能载体 + 知识库检索工具）。
 *
 * 挂载于 profile 根层（全局层），两部分职责：
 *
 * A. 技能层：把 skills/ 目录下的 dsh-plugin-dev-kb / dsh-dev-sandbox 技能
 *    注册为 runtime skill，让每个会话的 agent 在插件开发 / 查询 dsh 能力 /
 *    写 Tool / 配置 cordis.yml 类任务时按技能 description 自动加载。
 *
 * B. 工具层（1.6.0 起）：注册 dsh_kb_search 工具——知识库本地打分检索，
 *    一次调用返回命中文件 + 行号 + 上下文片段，替代 agent 多轮 grep/read。
 *    索引在内存（宿主启动时构建中文索引，英文索引按需惰性构建），只读不写。
 *
 * 知识库数据（kb/ 目录）是纯文档，模型仍可通过文件工具按技能指示直接读取。
 *
 * 依赖纪律：本模块不 import 任何 @deepseek-ai/* 运行时包（插件以
 * link: 方式装入 profile，Node ESM 按 realpath 解析链接包，外部依赖
 * 从插件目录解析不到）；工具走 ctx.tools.register 的原始 definition
 * 形状（标准 JSON Schema，参照 dsh-plugin-windows-guard 的先例）。
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildIndex, search as kbSearch } from './kb-search.js'
import { detectHostVersion, versionBanner } from './kb-version.js'

export const name = 'dsh-plugin-dev-kb'
export const inject = ['skills', 'tools']

const PKG_DIR = dirname(fileURLToPath(import.meta.url))
const SKILLS_DIR = join(PKG_DIR, '..', 'skills')
const KB_DIR = join(PKG_DIR, '..', 'kb')

const DEFAULT_CONFIG = {
  /** 注册 dsh_kb_search 知识库检索工具（false = 只保留技能，不注册工具）。 */
  searchTool: true,
  /** 注册 dsh_kb_read 知识库局部阅读工具（1.8.0 起，false = 只用 search）。 */
  readTool: true,
}

// ---------------------------------------------------------------------------
// dsh_kb_search 工具（原始 definition 形状，零依赖）
// ---------------------------------------------------------------------------

/** 把 search 结果渲染为模型可读 Markdown。 */
function renderResult(value) {
  if (value.kind === 'topics') {
    return [
      `【知识库主题导航】${value.topicsPath ?? ''}`,
      value.text ?? '',
      value.hint ?? '',
    ].filter(Boolean).join('\n')
  }
  if (value.kind === 'empty') {
    return `【无命中】query: ${value.query}\n${value.hint}`
  }
  const lines = [`【知识库检索】query: ${value.query}（scope=${value.scope}，命中 ${value.files.length} 个文件${value.truncatedFiles ? `，另有 ${value.truncatedFiles} 个未展示` : ''}）`]
  for (const f of value.files) {
    lines.push('')
    lines.push(`### ${f.path}（score ${f.score}${f.title ? `，标题「${f.title}」` : ''}）`)
    lines.push(`绝对路径：${f.absPath}｜命中行：${f.hitLines.join(', ')}`)
    for (const s of f.snippets) {
      lines.push('')
      lines.push(`--- L${s.from} 起（命中行 L${s.line}）---`)
      lines.push(s.text)
    }
  }
  lines.push('')
  lines.push(value.hint ?? '')
  return lines.join('\n')
}

/** dsh_kb_search 工具定义。 */
function kbSearchTool(getIndex, hostVersion) {
  return {
    name: 'dsh_kb_search',
    description:
      'dsh 插件开发知识库本地打分检索（零 token、毫秒级）：在官方文档完整镜像（站点 194 页 + 仓库补充文档）中' +
      '按关键词检索，返回命中文件路径、行号与上下文片段，用 read 工具按行号局部读原文。' +
      'query 为空或 "topics" 返回主题导航（任务场景 → 文档清单）。写 dsh 插件 / Tool / 配置 / 服务 / 事件 /' +
      '查 ctx.* API 签名 / 打包发布 / LLM 适配器时先用本工具定位文档，找不到再用文件工具 grep。' +
      '仅限 dsh（DeepSeek Harness）插件开发知识库。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          description:
            '检索关键词，空白分隔多词（如 "ctx.tools.register"、"插件配置 发布"）；空串或 "topics" 返回主题导航。'
        },
        scope: {
          type: 'string',
          enum: ['all', 'api'],
          description:
            'all = 全部文档（默认）；api = 只搜 API 签名/目录类文档（tool-catalog、config-catalog、capability-seams、cordis-api、subsystems 等），适合查 ctx.* API。'
        },
        lang: {
          type: 'string',
          enum: ['zh', 'en'],
          description: '文档语言（默认 zh；en 首次调用会现场建英文索引，稍慢）'
        },
        maxResults: {
          type: 'integer',
          description: '返回文件数上限（默认 8，最大 20）'
        }
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'text'],
        properties: {
          kind: { type: 'string', enum: ['hits', 'empty', 'topics'] },
          text: { type: 'string' }
        }
      },
      render: (_args, value) => [{ type: 'text', text: value.text }]
    },
    async execute(args) {
      const { index, error } = getIndex(args.lang === 'en' ? 'en' : 'zh')
      if (error) throw new Error(error)
      const result = kbSearch(index, args.query, {
        scope: args.scope === 'api' ? 'api' : 'all',
        maxResults: args.maxResults,
      })
      const banner = versionBanner(index.kbDir, hostVersion)
      return { kind: result.kind, text: banner ? `${banner}\n\n${renderResult(result)}` : renderResult(result) }
    }
  }
}

/** dsh_kb_read 工具定义（1.8.0）：知识库局部阅读，带行号窗口 + 中英对照提示。 */
function kbReadTool(getIndex, hostVersion) {
  return {
    name: 'dsh_kb_read',
    description:
      'dsh 插件开发知识库局部阅读：按知识库相对路径 + 行号窗口读原文，输出带行号，' +
      '自动防大文件整读（单次窗口有上限）、自动处理编码，并提示中英对照版本的对应路径。' +
      '通常与 dsh_kb_search 配套：先 search 拿到 path + 命中行号，再用本工具按行号窗口读上下文。' +
      '仅限知识库目录内的 .md 文件（路径越界会被拒绝）。' +
      '仅限 dsh（DeepSeek Harness）插件开发知识库。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['path'],
      properties: {
        path: {
          type: 'string',
          description: '知识库相对路径（正斜杠，如 "site/develop/basic/tool.md"、"extra/upgrade-guide/v0.2.0-rc.2/guide.zh.md"）'
        },
        offset: {
          type: 'integer',
          description: '起始行（1 基，默认 1）'
        },
        limit: {
          type: 'integer',
          description: '读取行数（默认 120，最大 400）'
        }
      }
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'text'],
        properties: {
          kind: { type: 'string', enum: ['text', 'error'] },
          text: { type: 'string' }
        }
      },
      render: (_args, value) => [{ type: 'text', text: value.text }]
    },
    async execute(args) {
      const { index, error } = getIndex('zh')
      if (error) throw new Error(error)
      const rel = String(args.path ?? '').replaceAll('\\', '/').replace(/^\/+/, '')
      if (!rel || !rel.endsWith('.md')) {
        return { kind: 'error', text: `【拒绝】path 必须是知识库内的 .md 相对路径，收到：${rel || '(空)'}` }
      }
      const abs = resolve(index.kbDir, ...rel.split('/'))
      const kbRootResolved = resolve(index.kbDir)
      if (abs !== kbRootResolved && !abs.startsWith(kbRootResolved + sep)) {
        return { kind: 'error', text: `【拒绝】路径越界：${rel}（只允许知识库目录内的文件）` }
      }
      let lines
      try {
        const st = statSync(abs)
        if (st.size > 8_000_000) {
          return { kind: 'error', text: `【拒绝】文件过大（${st.size} 字节）：${rel}` }
        }
        lines = readFileSync(abs, 'utf8').split(/\r?\n/)
      } catch (err) {
        return { kind: 'error', text: `【读取失败】${rel}（${err?.message ?? err}）。提示：先用 dsh_kb_search 确认路径是否在索引内。` }
      }
      const total = lines.length
      const offset = Math.min(Math.max(Number(args.offset) > 0 ? Number(args.offset) : 1, 1), Math.max(total, 1))
      const limit = Math.min(Math.max(Number(args.limit) > 0 ? Number(args.limit) : 120, 1), 400)
      const end = Math.min(offset - 1 + limit, total)
      const width = String(end).length
      const body = lines.slice(offset - 1, end)
        .map((l, i) => `${String(offset + i).padStart(width)}| ${l}`)
        .join('\n')
      const footer = []
      if (end < total) footer.push(`（未完：共 ${total} 行，已读 L${offset}-${end}；续读传 offset=${end + 1}）`)
      const alt = altLangPath(rel)
      if (alt) footer.push(`中英对照：${alt.exists ? alt.rel : alt.rel + '（未收录）'}`)
      const banner = versionBanner(index.kbDir, hostVersion)
      const text = [
        banner ?? '',
        `【知识库阅读】${rel}（共 ${total} 行，窗口 L${offset}-${end}）`,
        body,
        ...footer,
      ].filter(Boolean).join('\n')
      return { kind: 'text', text }
    }
  }
}

/** 中英对照路径推导：site/ ↔ site/en/，extra/*.zh.md ↔ extra/*.md。存在性现场检查。 */
function altLangPath(rel) {
  let counter
  if (rel.startsWith('site/en/')) counter = rel.replace('site/en/', 'site/')
  else if (rel.startsWith('site/')) counter = rel.replace('site/', 'site/en/')
  else if (rel.startsWith('extra/') && rel.endsWith('.zh.md')) counter = rel.slice(0, -'.zh.md'.length) + '.md'
  else if (rel.startsWith('extra/') && rel.endsWith('.md') && !rel.endsWith('.zh.md')) counter = rel.slice(0, -'.md'.length) + '.zh.md'
  else return null
  const abs = join(KB_DIR, ...counter.split('/'))
  return { rel: counter, exists: existsSync(abs) }
}

/** logger 拿不到时降级 console。 */
function makeLogger(ctx, tag) {
  return {
    info: (...args) => (ctx.logger?.info ? ctx.logger.info(...args) : console.log(tag, ...args)),
    warn: (...args) => (ctx.logger?.warn ? ctx.logger.warn(...args) : console.warn(tag, ...args))
  }
}

/** 极简 frontmatter 解析（name/description/whenToUse）。 */
function parseFrontmatter(md) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md)
  if (!match) return { name: undefined, description: undefined, whenToUse: undefined, body: md }
  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i <= 0) continue
    const key = line.slice(0, i).trim()
    if (key) meta[key] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return { ...meta, body: md.slice(match[0].length) }
}

/** 从 skills/ 目录加载技能定义（文件缺失/无 frontmatter 时跳过并警告，绝不让插件挂载失败）。 */
function loadSkills(log) {
  const out = []
  if (!existsSync(SKILLS_DIR)) {
    log.warn('skills 目录缺失，技能未加载：' + SKILLS_DIR)
    return out
  }
  for (const file of readdirSync(SKILLS_DIR)) {
    if (!file.endsWith('.md')) continue
    try {
      const fm = parseFrontmatter(readFileSync(join(SKILLS_DIR, file), 'utf8'))
      if (!fm.name || !fm.description) {
        log.warn(`技能文件缺少 name/description frontmatter，已跳过：${file}`)
        continue
      }
      out.push({
        name: fm.name,
        description: fm.description,
        whenToUse: fm.whenToUse,
        body: fm.body
      })
    } catch (err) {
      log.warn(`技能文件读取失败，已跳过：${file}（${err?.message ?? err}）`)
    }
  }
  return out
}

export function apply(ctx, config) {
  const log = makeLogger(ctx, '[dsh-plugin-dev-kb]')
  const cfg = { ...DEFAULT_CONFIG, ...(config ?? {}) }
  // 显式布尔归一（patch 配置可能是字符串）
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    if (typeof cfg[key] === 'string') cfg[key] = cfg[key] === 'true'
  }

  // 契约（dsh-skill validateDefinition）：定义必须含 name/description/
  // source/content 四个字符串；provider 缺省为 'runtime'。
  //
  // 路径注入：技能正文中的 {{KB_ROOT}} 占位符在此替换为插件实际的 kb/
  // 绝对路径（正斜杠，Windows 反斜杠会破坏 Markdown 转义），并声明
  // resourceBase 让 skill 工具渲染相对资源引导——知识库位置随插件安装
  // 位置动态解析，不依赖任何写死的机器路径。
  const kbRoot = KB_DIR.replaceAll('\\', '/')
  for (const skill of loadSkills(log)) {
    ctx.effect(() => ctx.skills.register({
      name: skill.name,
      description: skill.description,
      ...(skill.whenToUse ? { whenToUse: skill.whenToUse } : {}),
      source: 'runtime',
      content: skill.body.replaceAll('{{KB_ROOT}}', kbRoot),
      resourceBase: { kind: 'directory', path: KB_DIR }
    }), `dsh-plugin-dev-kb: register skill ${skill.name}`)
    log.info(`技能已注册：${skill.name}`)
  }

  // B. 检索工具（1.6.0 起）+ 局部阅读工具（1.8.0 起）：
  //    索引惰性构建（首次调用时建，宿主启动零开销），zh/en 各缓存一份；
  //    宿主版本探测一次性完成（拿不到 → 工具输出不带版本横幅）；
  //    kb 目录缺失 → 工具执行时报错并提示退回文件工具检索。
  const hostVersion = detectHostVersion(PKG_DIR)
  if (hostVersion) {
    log.info(`宿主 dsh 版本探测：${hostVersion.version}（${hostVersion.source}）`)
  } else {
    log.warn('宿主 dsh 版本探测失败（工具输出将不带版本横幅）')
  }
  if (cfg.searchTool || cfg.readTool) {
    if (typeof ctx.tools?.register === 'function') {
      const indexCache = new Map()
      const getIndex = (lang) => {
        if (indexCache.has(lang)) return { index: indexCache.get(lang), error: undefined }
        if (!existsSync(KB_DIR)) {
          return {
            index: undefined,
            error: `知识库目录缺失：${KB_DIR.replaceAll('\\', '/')}（插件安装不完整？请改用文件工具 grep 检索，或重装插件）`
          }
        }
        try {
          const t0 = Date.now()
          const index = buildIndex(KB_DIR, lang, log)
          indexCache.set(lang, index)
          log.info(`知识库${lang} 索引就绪：${index.files.length} 个文件（${Date.now() - t0}ms）`)
          return { index, error: undefined }
        } catch (err) {
          return {
            index: undefined,
            error: `知识库索引构建失败：${err?.message ?? err}（请改用文件工具 grep 检索知识库目录）`
          }
        }
      }
      ctx.effect(() => ctx.tools.register(kbSearchTool(getIndex, hostVersion), 'dsh-plugin-dev-kb: register dsh_kb_search'), 'dsh-plugin-dev-kb: register dsh_kb_search')
      log.info('工具已注册：dsh_kb_search')
      if (cfg.readTool) {
        ctx.effect(() => ctx.tools.register(kbReadTool(getIndex, hostVersion), 'dsh-plugin-dev-kb: register dsh_kb_read'), 'dsh-plugin-dev-kb: register dsh_kb_read')
        log.info('工具已注册：dsh_kb_read')
      }
    } else {
      log.warn('ctx.tools.register 不可用，dsh_kb_search 未注册（工具子系统的注入可能失败）')
    }
  }

  log.info(`已挂载（知识库在 kb/ 目录）`)
}
