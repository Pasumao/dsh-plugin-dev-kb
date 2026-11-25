/**
 * kb-version — 宿主 dsh 版本探测与升级指南匹配（零依赖，纯函数）。
 *
 * 目的：知识库快照同步自上游 master（领先宿主），dsh_kb_search / dsh_kb_read
 * 返回结果时按宿主实际版本附版本横幅，提示 API 可能存在的版本差异，
 * 并给出对应的 extra/upgrade-guide/<vX.Y.Z> 目录。
 *
 * 探测策略（全部失败安全，拿不到就返回 null，绝不抛错；先命中的为准）：
 *   0. 桌面形态：宿主进程可执行文件附近找 resources/app.asar，直接读打包在壳内的
 *      @deepseek-ai/dsh（desktop 真实核心在壳内，profile 层 node_modules 的共享副本
 *      版本可能落后于真实宿主，1.8.3 起优先用这个来源；1.8.5 起在 asar 文件树里按层搜索
 *      核心包，不依赖壳的打包布局）；壳在却读不到核心包时回退到 2，并在来源里说明；
 *   1. CLI 形态：宿主进程入口 process.argv[1] 落在核心包目录内（npx / 全局安装 /
 *      源码启动都是 …/@deepseek-ai/dsh/lib/bin.js 这个形态），读该包的版本。当前宿主把
 *      dsh-base / dsh-web-app 等 bundle 固定从 dsh 安装目录解析、不再装进 profile
 *      （知识库 site/develop/basic/publish.md「内置组合包名称始终从 dsh 安装目录本身
 *      解析」），profile 目录里找不到核心包，只能从这里取真实运行版本；
 *   2. 从插件安装目录向上逐层找 node_modules/@deepseek-ai/dsh/package.json
 *      （共享层布局的旧安装形态，最多回溯 6 层；这种副本可能落后于真实宿主）；
 *   3. 再试 @deepseek-ai/dsh-base（desktop 安装形态里两者同版本）。
 */

import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync } from 'node:fs'
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

/** asar 内核心包名的探测顺序：dsh 为主，dsh-base 兜底（desktop 安装形态里两者同版本）。 */
const CORE_PACKAGES = ['dsh', 'dsh-base']

/**
 * 在 asar 文件树里搜索核心包的深度上限（目录层数）。壳的打包布局不是稳定接口，所以不写死落点，
 * 按层广度优先搜 node_modules/@deepseek-ai/<核心包>/package.json，最浅的为准：最浅处是应用
 * 自己的依赖树，更深处的同名包只可能是某个依赖私有嵌套的另一份副本。
 * 实测桌面壳把整棵应用树放在 dsh/ 子目录下（dsh/node_modules/@deepseek-ai/dsh），顶层
 * node_modules/ 只有壳自身依赖——1.8.3 只认顶层扁平布局，在真实桌面上从未命中。
 */
const MAX_CORE_SEARCH_DEPTH = 6

/**
 * 解析 Electron app.asar 头部，读壳内 @deepseek-ai/dsh（或 dsh-base）的 package.json
 * 版本——desktop 形态真实核心版本所在（落点搜索见 MAX_CORE_SEARCH_DEPTH）。零依赖手工解析 asar 头：
 *   [0-3]=4（size pickle） [4-7]=header 总长 [8-11]=header pickle 载荷 [12-15]=JSON 长度
 *   [16..]=文件树 JSON；数据区起始于 8 + header 总长。
 * 任一步失败返回 null，绝不抛错。
 * @param {string} asarPath app.asar 绝对路径
 */
export function readAsarCoreVersion(asarPath) {
  let fd = null
  try {
    fd = openSync(asarPath, 'r')
    const head = Buffer.alloc(16)
    if (readSync(fd, head, 0, 16, 0) < 16) return null
    const headerLen = head.readUInt32LE(4)
    const jsonLen = head.readUInt32LE(12)
    if (!headerLen || !jsonLen || headerLen > 16 * 1024 * 1024) return null
    const headerBuf = Buffer.alloc(jsonLen)
    if (readSync(fd, headerBuf, 0, jsonLen, 16) < jsonLen) return null
    const tree = JSON.parse(headerBuf.toString('utf8'))
    const dataStart = 8 + headerLen
    /** 读一个 package.json 叶子并取 version；条目缺失、越界或损坏返回 null。 */
    const entryVersion = (entry) => {
      if (!entry || typeof entry.offset !== 'string' || !Number.isFinite(entry.size) || entry.size <= 0) return null
      const buf = Buffer.alloc(Math.min(entry.size, 64 * 1024))
      if (readSync(fd, buf, 0, buf.length, dataStart + Number(entry.offset)) < buf.length) return null
      try {
        const version = JSON.parse(buf.toString('utf8'))?.version
        return typeof version === 'string' && version ? version : null
      } catch {
        return null // 单个条目损坏不放弃其它落点
      }
    }
    let level = [tree]
    for (let depth = 0; level.length && depth <= MAX_CORE_SEARCH_DEPTH; depth++) {
      for (const node of level) {
        const scope = node?.files?.node_modules?.files?.['@deepseek-ai']
        for (const pkgName of CORE_PACKAGES) {
          const version = entryVersion(scope?.files?.[pkgName]?.files?.['package.json'])
          if (version) return version
        }
      }
      level = level.flatMap((node) => Object.values(node?.files ?? {}).filter((child) => child.files))
    }
    return null
  } catch {
    return null
  } finally {
    if (fd !== null) { try { closeSync(fd) } catch { /* 已关闭即可 */ } }
  }
}

/** 桌面壳探测：从宿主进程可执行文件位置向上找 resources/app.asar（Electron 标准布局）。
 *  非 desktop 形态（node 直跑 bin.js / 沙箱）execPath 附近无此布局，安全落空返回 null。 */
function findDesktopAsar() {
  try {
    let dir = dirname(process.execPath)
    for (let i = 0; i < 4; i++) {
      const candidate = join(dir, 'resources', 'app.asar')
      if (existsSync(candidate)) return candidate
      const parent = dirname(dir)
      if (parent === dir) return null
      dir = parent
    }
  } catch { /* execPath 不可得等情况 */ }
  return null
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

/** CLI 形态：宿主进程入口（process.argv[1]）位于核心包目录内时读其版本。
 *  自入口文件向上最多找 3 层 package.json：属于核心包就取版本，属于其它包（如 desktop
 *  的 dsh-desktop-host）或找不到则落空。非 CLI 形态（桌面子进程 / 测试）安全落空。 */
function readCliEntryVersion() {
  try {
    if (!process.argv[1]) return null
    let dir = dirname(resolve(process.argv[1]))
    for (let i = 0; i < 3; i++) {
      const pkgPath = join(dir, 'package.json')
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
        return CORE_PACKAGES.some((name) => pkg?.name === `@deepseek-ai/${name}`) ? readVersion(pkgPath) : null
      }
      const parent = dirname(dir)
      if (parent === dir) return null
      dir = parent
    }
  } catch { /* argv 不可得、package.json 损坏等情况 */ }
  return null
}

/**
 * 探测宿主 dsh 版本。
 * @param {string} pkgDir 插件**已安装副本**的包目录（lib/ 的上一级）。只有策略 2 用它：
 *   从这里沿祖先目录找 node_modules 里的核心包副本，其余策略不看这个参数。传入源码
 *   检出目录（没装进任何 profile）时只有桌面 / CLI 两条策略可能命中——在纯 node 下
 *   跑（既不在桌面壳内、argv[1] 也不是 dsh 入口）返回 null 属设计内行为，不是故障。
 * @param {string} [desktopAsar] app.asar 路径；缺省从宿主进程可执行文件附近查找（测试可注入合成 asar）
 * @returns {{ version: string, source: string } | null} null = 探测不到（工具输出不带版本横幅）
 */
export function detectHostVersion(pkgDir, desktopAsar = findDesktopAsar()) {
  // 0) desktop：真实运行的核心打包在壳内 app.asar，优先于 profile 层共享副本（可能落后）。
  // 壳在、里面却读不到核心包时照常回退，但把这件事写进来源——回退拿到的是陈旧副本，
  // 不说明就会被当成真实版本（1.8.3–1.8.4 即如此：探测落空，横幅照常报旧版本）。
  let fallbackNote = ''
  if (desktopAsar) {
    const version = readAsarCoreVersion(desktopAsar)
    if (version) return { version, source: 'desktop app.asar' }
    fallbackNote = '，app.asar 内未找到核心包、已回退到此副本，可能落后于桌面壳'
  }
  // 1) CLI：入口就在核心包里，这是实际运行的版本，优先于任何祖先目录里的副本。
  const cliVersion = readCliEntryVersion()
  if (cliVersion) return { version: cliVersion, source: 'cli entry' }
  // 2)/3) 祖先目录里的核心包副本（可能落后）。
  for (const [scope, name] of [['@deepseek-ai', 'dsh'], ['@deepseek-ai', 'dsh-base']]) {
    const dir = findPkgDir(pkgDir, scope, name)
    if (dir) {
      const version = readVersion(join(dir, 'package.json'))
      if (version) return { version, source: `${scope}/${name}${fallbackNote}` }
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
    // 目录语义：upgrade-guide/vX/ 收录的是「vX 之后引入」的变更，不是 vX 已含的变更
    // （实测：v0.2.3-alpha.1 的 Node 门槛实际落在 0.2.3-alpha.2；v0.2.2-rc.3 / rc.5 目录里
    // 写明「已移除」的 working_directory 工具、inspectSession 在 0.2.2-rc.5 包里仍然存在）。
    lines.push(`升级指南 extra/upgrade-guide/${guide}/ 记录的是 ${guide.slice(1)} 之后引入的变更——部分可能尚未进入当前宿主，判断某个 API 在宿主上是否可用，以宿主安装包为准。`)
  }
  return lines.length ? lines.join('\n') : null
}
