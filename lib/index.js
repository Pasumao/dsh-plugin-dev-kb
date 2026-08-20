/**
 * dsh-plugin-dev-kb — 主机插件（纯技能载体，无工具/命令）。
 *
 * 挂载于 profile 根层（全局层），唯一职责：把 skills/ 目录下的
 * dsh-plugin-dev-kb 技能注册为 runtime skill，让每个会话的 agent
 * 在插件开发 / 查询 dsh 能力 / 写 Tool / 配置 cordis.yml 类任务时，
 * 能按技能 description 自动加载，从而获知知识库位置与阅读路径。
 *
 * 知识库数据（kb/ 目录：site/ 站点镜像 + extra/ 补充文档 + meta/
 * 主题导航与索引）是纯文档，模型通过文件工具按技能指示直接读取。
 *
 * 依赖纪律：本模块不 import 任何 @deepseek-ai/* 运行时包（插件以
 * link: 方式装入 profile，Node ESM 按 realpath 解析链接包，外部依赖
 * 从插件目录解析不到；这里本来也不需要）。
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-plugin-dev-kb'
export const inject = ['skills']

const PKG_DIR = dirname(fileURLToPath(import.meta.url))
const SKILLS_DIR = join(PKG_DIR, '..', 'skills')
const KB_DIR = join(PKG_DIR, '..', 'kb')

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
function loadSkills() {
  const out = []
  if (!existsSync(SKILLS_DIR)) {
    console.warn('[dsh-plugin-dev-kb] skills 目录缺失，技能未加载：' + SKILLS_DIR)
    return out
  }
  for (const file of readdirSync(SKILLS_DIR)) {
    if (!file.endsWith('.md')) continue
    try {
      const fm = parseFrontmatter(readFileSync(join(SKILLS_DIR, file), 'utf8'))
      if (!fm.name || !fm.description) {
        console.warn(`[dsh-plugin-dev-kb] 技能文件缺少 name/description frontmatter，已跳过：${file}`)
        continue
      }
      out.push({
        name: fm.name,
        description: fm.description,
        whenToUse: fm.whenToUse,
        body: fm.body
      })
    } catch (err) {
      console.warn(`[dsh-plugin-dev-kb] 技能文件读取失败，已跳过：${file}（${err?.message ?? err}）`)
    }
  }
  return out
}

/** 挂载状态文件（自诊断：$DSH_HOME/dsh-plugin-dev-kb.state.json）。 */
function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

export function apply(ctx, config) {
  const disposers = []
  const state = { skills: [] }

  // 契约（dsh-skill validateDefinition）：定义必须含 name/description/
  // source/content 四个字符串；provider 缺省为 'runtime'。
  //
  // 路径注入：技能正文中的 {{KB_ROOT}} 占位符在此替换为插件实际的 kb/
  // 绝对路径（正斜杠，Windows 反斜杠会破坏 Markdown 转义），并声明
  // resourceBase 让 skill 工具渲染相对资源引导——知识库位置随插件安装
  // 位置动态解析，不依赖任何写死的机器路径。
  const kbRoot = KB_DIR.replaceAll('\\', '/')
  for (const skill of loadSkills()) {
    try {
      disposers.push(ctx.skills.register({
        name: skill.name,
        description: skill.description,
        ...(skill.whenToUse ? { whenToUse: skill.whenToUse } : {}),
        source: 'runtime',
        content: skill.body.replaceAll('{{KB_ROOT}}', kbRoot),
        resourceBase: { kind: 'directory', path: KB_DIR }
      }))
      state.skills.push(skill.name)
      console.log(`[dsh-plugin-dev-kb] 技能已注册：${skill.name}`)
    } catch (err) {
      console.warn(`[dsh-plugin-dev-kb] 技能注册失败：${skill.name}（${err?.message ?? err}）`)
    }
  }

  try {
    writeFileSync(join(dshHome(), 'dsh-plugin-dev-kb.state.json'), JSON.stringify({
      plugin: 'dsh-plugin-dev-kb',
      mountedAt: new Date().toISOString(),
      skills: state.skills
    }, null, 2), 'utf8')
  } catch { /* 状态文件写入失败不影响挂载 */ }

  console.log(`[dsh-plugin-dev-kb] 已挂载：${state.skills.length} 技能（知识库在 kb/ 目录）`)

  // 卸载清理（HMR 重载时避免重复注册）。
  return () => {
    for (const dispose of disposers) {
      try { dispose() } catch { /* ignore */ }
    }
  }
}
