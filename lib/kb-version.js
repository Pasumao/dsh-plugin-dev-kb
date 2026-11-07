/**
 * kb-version — 宿主 dsh 版本探测与升级指南匹配（零依赖，纯函数）。
 *
 * 目的：知识库快照同步自上游 master（领先宿主），dsh_kb_search / dsh_kb_read
 * 返回结果时按宿主实际版本附版本横幅，提示 API 可能存在的版本差异，
 * 并给出对应的 extra/upgrade-guide/<vX.Y.Z> 目录。
 *
 * 探测策略（全部失败安全，拿不到就返回 null，绝不抛错）：
 *   1. 从插件安装目录向上逐层找 node_modules/@deepseek-ai/dsh/package.json
 *      （兼容 link: junction / file: 安装的 realpath 落点差异，最多回溯 6 层）；
 *   2. 再试 @deepseek-ai/dsh-base（desktop 安装形态里两者同版本）。
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

/** 读 package.json 的 version；失败返回 null。 */
function readVersion(pkgPath) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return typeof pkg?.version === 'string' && pkg.version ? pkg.version : null
  } catch {
    return null
  }
}

/** 逐层向上找包目录；找不到返回 null。 */
function findPkgDir(startDir, scope, name, maxUp = 6) {
  let dir = resolve(startDir)
  for (let i = 0; i <= maxUp; i++) {
    const candidate = join(dir, 'node_modules', scope, name)
    if (existsSync(join(candidate, 'package.json'))) return candidate
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
  return null
}

/** 比较 dsh 预发布版本号（x.y.z-rc.N / -alpha.N）；返回 -1/0/1。只比数字段 + 预发布序，不做完整 semver。 */
export function compareVersions(a, b) {
  const parse = (v) => {
    const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)\.?(\d+))?$/i.exec(String(v).trim())
    if (!m) return null
    const stageRank = { alpha: 0, beta: 1, rc: 2 }
    return {
      nums: [Number(m[1]), Number(m[2]), Number(m[3])],
      stage: m[4] ? stageRank[m[4].toLowerCase()] ?? -1 : 3,
      stageNum: m[5] ? Number(m[5]) : 0,
    }
  }
  const pa = parse(a)
  const pb = parse(b)
  if (!pa || !pb) return 0
  for (let i = 0; i < 3; i++) {
    if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] < pb.nums[i] ? -1 : 1
  }
  if (pa.stage !== pb.stage) return pa.stage < pb.stage ? -1 : 1
  if (pa.stageNum !== pb.stageNum) return pa.stageNum < pb.stageNum ? -1 : 1
  return 0
}

/**
 * 探测宿主 dsh 版本。
 * @param {string} pkgDir 插件包目录（lib/ 的上一级）
 * @returns {{ version: string, source: string } | null}
 */
export function detectHostVersion(pkgDir) {
  for (const [scope, name] of [['@deepseek-ai', 'dsh'], ['@deepseek-ai', 'dsh-base']]) {
    const dir = findPkgDir(pkgDir, scope, name)
    if (dir) {
      const version = readVersion(join(dir, 'package.json'))
      if (version) return { version, source: `${scope}/${name}` }
    }
  }
  return null
}

/**
 * 在 extra/upgrade-guide/ 下为宿主版本选最合适的指南目录：
 * 精确命中优先；否则取 ≤ 宿主版本的最大目录（宿主版本由若干指南逐版到达，
 * 其后的指南描述的是「比宿主新」的变更，正是「文档领先宿主」的差异来源）。
 * @returns {string | null} 目录名（如 'v0.2.0-rc.2'）
 */
export function matchUpgradeGuide(kbDir, hostVersion) {
  const guideRoot = join(kbDir, 'extra', 'upgrade-guide')
  let dirs = []
  try {
    dirs = readdirSync(guideRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((n) => /^v/.test(n))
  } catch {
    return null
  }
  if (!dirs.length || !hostVersion) return null
  if (dirs.includes(`v${hostVersion}`)) return `v${hostVersion}`
  const lower = dirs.filter((d) => compareVersions(d, `v${hostVersion}`) <= 0)
  if (lower.length) return lower.sort((a, b) => compareVersions(a, b))[lower.length - 1]
  return null
}

/**
 * 组装版本横幅文本（search / read 工具共用）。
 * @returns {string | null} null = 无版本信息，不加横幅
 */
export function versionBanner(kbDir, host, kbSyncNote = true) {
  if (!host) return null
  const guide = matchUpgradeGuide(kbDir, host.version)
  const lines = []
  if (kbSyncNote) {
    lines.push(`【版本提示】宿主 dsh ${host.version}（探测自 ${host.source}）；知识库快照同步自上游 master，可能领先宿主——API 行为不符时以宿主实际安装包为准。`)
  }
  if (guide) {
    lines.push(`版本差异请读升级指南：extra/upgrade-guide/${guide}/（含 ${guide.slice(1)} 前后的破坏性变更与迁移项）。`)
  }
  return lines.length ? lines.join('\n') : null
}
