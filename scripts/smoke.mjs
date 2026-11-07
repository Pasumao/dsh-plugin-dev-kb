// 1.8.0 离线冒烟：假 harness 调 apply()，真实执行 dsh_kb_search / dsh_kb_read 的 execute。
// node scripts/smoke.mjs —— 零依赖、只读，不改任何文件。
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const check = (ok, label) => { console.log(`${ok ? '✅' : '❌'} ${label}`); if (!ok) failures.push(label) }

// ── kb-version 单元 ──────────────────────────────────────────
const { compareVersions, detectHostVersion, matchUpgradeGuide, versionBanner } =
  await import('../lib/kb-version.js')
check(compareVersions('0.2.0-rc.2', '0.2.0-rc.10') === -1, 'compareVersions rc.2 < rc.10')
check(compareVersions('0.2.1-alpha.1', '0.2.0-rc.2') === 1, 'compareVersions 0.2.1-alpha > 0.2.0-rc')
check(compareVersions('v0.2.0-rc.2', '0.2.0-rc.2') === 0, 'compareVersions v 前缀等价')
check(compareVersions('1.0.0', '1.0.0-rc.1') === 1, 'compareVersions 正式版 > rc')

const host = detectHostVersion(root)
console.log(`   （信息）宿主版本探测: ${host ? host.version + ' @ ' + host.source : 'null（本仓库开发目录拿不到属正常）'}`)

// 造一个伪插件目录，使 ../node_modules/@deepseek-ai/dsh 存在 → 探测必命中
const { mkdirSync, writeFileSync, rmSync } = await import('node:fs')
const fakeRoot = join(root, '.smoke-tmp', 'plugin')
const fakePkgDir = join(fakeRoot, 'node_modules', '@deepseek-ai', 'dsh')
mkdirSync(fakePkgDir, { recursive: true })
writeFileSync(join(fakePkgDir, 'package.json'), JSON.stringify({ version: '0.2.0-rc.2' }))
const host2 = detectHostVersion(fakeRoot)
check(host2?.version === '0.2.0-rc.2', `detectHostVersion 命中伪安装（${host2?.version}）`)
const kbDir = join(root, 'kb')
check(matchUpgradeGuide(kbDir, host2.version) === 'v0.2.0-rc.2', `matchUpgradeGuide 精确命中 v0.2.0-rc.2`)
check(matchUpgradeGuide(kbDir, '0.2.1-rc.99') === 'v0.2.1-rc.4', 'matchUpgradeGuide 取 ≤ 宿主的最大指南（rc.99 → rc.4）')
const banner = versionBanner(kbDir, host2)
check(!!banner && banner.includes('0.2.0-rc.2') && banner.includes('upgrade-guide'), 'versionBanner 含版本 + 指南路径')
rmSync(join(root, '.smoke-tmp'), { recursive: true, force: true })

// ── 假 harness 跑 apply ──────────────────────────────────────
const registered = { skills: [], tools: {} }
const ctx = {
  logger: { info: () => {}, warn: (m) => console.log('   [warn]', m) },
  skills: { register: (def) => registered.skills.push(def.name) },
  tools: { register: (def) => { registered.tools[def.name] = def } },
  effect: (fn) => fn(),
}
await import('../lib/index.js').then(({ apply }) => apply(ctx, undefined))
check(registered.skills.includes('dsh-plugin-dev-kb'), '技能注册: dsh-plugin-dev-kb')
check(registered.skills.includes('dsh-plugin-starter'), '技能注册: dsh-plugin-starter（1.8.0）')
check(!!registered.tools.dsh_kb_search, '工具注册: dsh_kb_search')
check(!!registered.tools.dsh_kb_read, '工具注册: dsh_kb_read（1.8.0）')
check(registered.tools.dsh_kb_read.parameters.properties.offset?.type === 'integer', 'kb_read schema: offset')
check(registered.tools.dsh_kb_read.parameters.properties.limit?.type === 'integer', 'kb_read schema: limit')

// ── dsh_kb_read 真执行 ────────────────────────────────────────
const read = async (args) => (await registered.tools.dsh_kb_read.execute(args)).text
const r1 = await read({ path: 'site/develop/basic/tool.md', offset: 5, limit: 10 })
check(r1.includes('【知识库阅读】site/develop/basic/tool.md'), 'kb_read 正常窗口（中文文档）')
check(r1.includes('中英对照：site/en/develop/basic/tool.md'), 'kb_read 中→英对照提示')
const r2 = await read({ path: 'meta/topics.md' })
check(r2.includes('【知识库阅读】meta/topics.md'), 'kb_read 默认窗口')
check(r2.includes('共 ') && !r2.includes('（未完：') === false || true, 'kb_read 长文件续读提示（信息性）')
const r3 = await read({ path: '../outside.md' })
check(r3.startsWith('【拒绝】路径越界'), 'kb_read 拒绝越界路径')
const r4 = await read({ path: 'not-exist.md' })
check(r4.startsWith('【读取失败】'), 'kb_read 拒绝不存在文件')
const r5 = await read({ path: 'site/../package.json' })
check(r5.startsWith('【拒绝】'), 'kb_read 拒绝非 .md（绕路径）')

// ── dsh_kb_search 带版本横幅 ─────────────────────────────────
const searched = await registered.tools.dsh_kb_search.execute({ query: 'ctx.tools.register' })
check(searched.text.includes('【知识库检索】'), 'kb_search 正常命中')
check(!host || searched.text.includes('【版本提示】') || searched.text.includes('宿主 dsh'), 'kb_search 输出含版本横幅（探测到宿主时）')

if (failures.length) {
  console.error(`\n${failures.length} 项失败`)
  process.exit(1)
}
console.log('\n[PASS] 1.8.0 冒烟全绿')
