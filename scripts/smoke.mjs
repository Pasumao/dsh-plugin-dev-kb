// 离线冒烟：假 harness 调 apply()，真实执行 dsh_kb_search / dsh_kb_read 的 execute。
// node scripts/smoke.mjs —— 零依赖、只读，不改任何仓库文件（临时文件都在 .smoke-tmp/，退出时清理）。
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const TMP = join(root, '.smoke-tmp')
const kbDir = join(root, 'kb')
const failures = []
let passed = 0
const check = (ok, label) => { console.log(`${ok ? '✅' : '❌'} ${label}`); if (ok) passed++; else failures.push(label) }
process.on('exit', () => { try { rmSync(TMP, { recursive: true, force: true }) } catch { /* 清理失败不影响结果 */ } })

// ── kb-version 单元：版本比较与指南匹配 ─────────────────────────
const { compareVersions, detectHostVersion, matchUpgradeGuide, versionBanner } =
  await import('../lib/kb-version.js')
check(compareVersions('0.2.0-rc.2', '0.2.0-rc.10') === -1, 'compareVersions rc.2 < rc.10')
check(compareVersions('0.2.1-alpha.1', '0.2.0-rc.2') === 1, 'compareVersions 0.2.1-alpha > 0.2.0-rc')
check(compareVersions('v0.2.0-rc.2', '0.2.0-rc.2') === 0, 'compareVersions v 前缀等价')
check(compareVersions('1.0.0', '1.0.0-rc.1') === 1, 'compareVersions 正式版 > rc')
check(compareVersions('0.2.3-alpha.1', '0.2.3-alpha.2') === -1, 'compareVersions alpha.1 < alpha.2')
check(compareVersions('0.2.3-alpha.1', '0.2.2-rc.5') === 1, 'compareVersions 0.2.3-alpha > 0.2.2-rc')

// ── 宿主版本探测：源码目录 / 祖先副本 / CLI 入口 / 桌面 asar ───────
// 源码目录没装进任何 profile，当前进程也不是 dsh 入口 → null 是设计内行为（见 detectHostVersion JSDoc）
const host = detectHostVersion(root)
console.log(`   （信息）源码目录探测: ${host ? host.version + ' @ ' + host.source : 'null（设计内：未装进 profile 且非 dsh 入口进程）'}`)
check(host === null || (!!host.version && !!host.source), 'detectHostVersion(源码目录) 返回 null 或形态合法')

// 造一个伪安装：../node_modules/@deepseek-ai/dsh 存在 → 祖先副本策略命中
const fakeRoot = join(TMP, 'plugin')
const fakePkgDir = join(fakeRoot, 'node_modules', '@deepseek-ai', 'dsh')
mkdirSync(fakePkgDir, { recursive: true })
writeFileSync(join(fakePkgDir, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version: '0.2.0-rc.2' }))
const host2 = detectHostVersion(fakeRoot)
check(host2?.version === '0.2.0-rc.2' && host2?.source === '@deepseek-ai/dsh', `detectHostVersion 命中祖先目录里的伪安装（${host2?.version} @ ${host2?.source}）`)
check(matchUpgradeGuide(kbDir, host2.version) === 'v0.2.0-rc.2', 'matchUpgradeGuide 精确命中 v0.2.0-rc.2')
check(matchUpgradeGuide(kbDir, '0.2.1-rc.99') === 'v0.2.1-rc.4', 'matchUpgradeGuide 取 ≤ 宿主的最大指南（rc.99 → rc.4）')
check(matchUpgradeGuide(kbDir, '0.2.2-rc.5') === 'v0.2.2-rc.5', 'matchUpgradeGuide 精确命中 v0.2.2-rc.5')
check(matchUpgradeGuide(kbDir, '0.2.3-alpha.9') === 'v0.2.3-alpha.1', 'matchUpgradeGuide 预发布序取 ≤ 宿主的最大指南（alpha.9 → alpha.1）')
const banner = versionBanner(kbDir, host2)
check(!!banner && banner.includes('0.2.0-rc.2') && banner.includes('upgrade-guide/v0.2.0-rc.2/'), 'versionBanner 含版本 + 指南路径')
check(banner.includes('之后引入的变更'), 'versionBanner 说明指南目录记录的是该版本之后的变更')

// CLI 形态：当前宿主把 bundle 固定从 dsh 安装目录解析、profile 里没有核心包副本，
// 只能从宿主进程入口（process.argv[1] 落在核心包内）取真实运行版本
const fakeCliPkg = join(TMP, 'cli', 'node_modules', '@deepseek-ai', 'dsh')
mkdirSync(join(fakeCliPkg, 'lib'), { recursive: true })
writeFileSync(join(fakeCliPkg, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh', version: '0.2.1-rc.9' }))
const fakeOtherPkg = join(TMP, 'other', 'node_modules', '@deepseek-ai', 'dsh-desktop-host')
mkdirSync(join(fakeOtherPkg, 'lib'), { recursive: true })
writeFileSync(join(fakeOtherPkg, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh-desktop-host', version: '0.2.1-rc.9' }))
const savedArgv1 = process.argv[1]
try {
  process.argv[1] = join(fakeCliPkg, 'lib', 'bin.js')
  const viaCli = detectHostVersion(fakeRoot, null)
  check(viaCli?.version === '0.2.1-rc.9' && viaCli?.source === 'cli entry', `detectHostVersion CLI 入口优先于祖先副本（${viaCli?.version} @ ${viaCli?.source}）`)
  process.argv[1] = join(fakeCliPkg, 'lib', 'nested', 'bin.js')
  check(detectHostVersion(fakeRoot, null)?.source === 'cli entry', 'detectHostVersion CLI 入口在包内两层子目录下仍可命中')
  process.argv[1] = join(fakeOtherPkg, 'lib', 'cli.js')
  check(detectHostVersion(fakeRoot, null)?.source === '@deepseek-ai/dsh', 'detectHostVersion 入口属于非核心包时不采信、回退祖先副本')
} finally {
  process.argv[1] = savedArgv1
}

// ── desktop 分支端到端：注入合成 app.asar ───────────────────────
// fakeRoot 里的 0.2.0-rc.2 充当「落后的 profile 层副本」：壳内读到核心时必须以壳为准；
// 壳在却读不到核心时才回退，且必须在来源里说明（1.8.3–1.8.4 是静默回退，横幅把旧副本当成真实版本）。
const { packAsar } = await import('./asar-fixture.mjs')
const pkgOf = (version) => Buffer.from(JSON.stringify({ version }))
const tmpAsar = join(TMP, 'shell.asar')
mkdirSync(TMP, { recursive: true })
writeFileSync(tmpAsar, packAsar({
  'package.json': pkgOf('9.9.9'),
  'node_modules/@deepseek-ai/dsh-brand/package.json': pkgOf('0.0.0'),
  'dsh/node_modules/@deepseek-ai/dsh/package.json': pkgOf('0.2.2-rc.5'),
}))
const host3 = detectHostVersion(fakeRoot, tmpAsar)
check(host3?.version === '0.2.2-rc.5' && host3?.source === 'desktop app.asar',
  `detectHostVersion 壳内核心优先于 profile 副本（${host3?.version} @ ${host3?.source}）`)
check(versionBanner(kbDir, host3).includes('upgrade-guide/v0.2.2-rc.5/'), '壳内版本 rc.5 的横幅指向 v0.2.2-rc.5 指南')
writeFileSync(tmpAsar, packAsar({ 'package.json': pkgOf('9.9.9') }))
const host4 = detectHostVersion(fakeRoot, tmpAsar)
check(host4?.version === '0.2.0-rc.2' && host4?.source.includes('已回退'),
  `detectHostVersion 壳内读不到核心包时回退并说明来源（${host4?.source}）`)

// ── 假 harness 跑 apply ─────────────────────────────────────────
function runApply(config) {
  const reg = { skills: [], tools: {} }
  const ctx = {
    logger: { info: () => {}, warn: (m) => console.log('   [warn]', m) },
    skills: { register: (def) => { reg.skills.push(def); return () => {} } },
    tools: { register: (def) => { reg.tools[def.name] = def; return () => {} } },
    effect: (fn) => fn(),
  }
  return import('../lib/index.js').then(({ apply }) => { apply(ctx, config); return reg })
}
const SKILL_NAMES = ['dsh-plugin-dev-kb', 'dsh-plugin-starter', 'dsh-upgrade-assistant', 'dsh-dev-sandbox']
const def = await runApply(undefined)
const registered = def
check(SKILL_NAMES.every((n) => def.skills.some((s) => s.name === n)), `技能注册齐全（${def.skills.map((s) => s.name).join(' / ')}）`)
check(def.skills.every((s) => s.source === 'runtime' && s.resourceBase?.kind === 'directory' && typeof s.resourceBase?.path === 'string'),
  '技能定义：source=runtime + resourceBase(directory)')
check(def.skills.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.name)), '技能名为 kebab-case（skill 工具按 kebab-case 名寻址）')
const kbRootFwd = kbDir.replaceAll('\\', '/')
check(def.skills.every((s) => !s.content.includes('{{KB_ROOT}}') && s.content.includes(kbRootFwd)),
  '{{KB_ROOT}} 已替换为实际 kb/ 绝对路径（正斜杠，4 个技能）')
check(!!def.tools.dsh_kb_search && !!def.tools.dsh_kb_read, '工具注册: dsh_kb_search + dsh_kb_read（默认配置）')
// 两个开关相互独立（1.8.6 修复：此前 readTool 开启时 searchTool:false 不生效）
const onlyRead = await runApply({ searchTool: false })
check(!onlyRead.tools.dsh_kb_search && !!onlyRead.tools.dsh_kb_read, 'searchTool:false → 只注册 dsh_kb_read')
const onlySearch = await runApply({ readTool: false })
check(!!onlySearch.tools.dsh_kb_search && !onlySearch.tools.dsh_kb_read, 'readTool:false → 只注册 dsh_kb_search')
const none = await runApply({ searchTool: 'false', readTool: false })
check(Object.keys(none.tools).length === 0 && none.skills.length === 4, '两个开关都关（含字符串 "false"）→ 只保留技能')
check(!!def.tools.dsh_kb_read && def.tools.dsh_kb_read.parameters.properties.offset?.type === 'integer', 'kb_read schema: offset')
check(def.tools.dsh_kb_read.parameters.properties.limit?.type === 'integer', 'kb_read schema: limit')
check(!/站点\s*\d+\s*页/.test(def.tools.dsh_kb_search.description), 'kb_search 描述不写死页数（随知识库同步会过时）')
{
  // path 参数描述里的示例路径必须真实存在（1.8.6 修复：此前示例 extra/upgrade-guide/v0.2.0-rc.2/guide.zh.md 不存在）
  const examples = [...def.tools.dsh_kb_read.parameters.properties.path.description.matchAll(/"((?:site|extra|meta)\/[^"]+\.md)"/g)].map((m) => m[1])
  check(examples.length > 0 && examples.every((p) => existsSync(join(kbDir, ...p.split('/')))), `kb_read path 参数描述里的示例路径真实存在（${examples.length} 个）`)
}

// ── dsh_kb_read 真执行 ─────────────────────────────────────────
const read = async (args) => (await def.tools.dsh_kb_read.execute(args)).text
const r1 = await read({ path: 'site/develop/basic/tool.md', offset: 5, limit: 10 })
check(r1.includes('【知识库阅读】site/develop/basic/tool.md'), 'kb_read 正常窗口（中文文档）')
check(r1.includes('中英对照：site/en/develop/basic/tool.md'), 'kb_read 中→英对照提示')
const r2 = await read({ path: 'meta/topics.md' })
check(r2.includes('【知识库阅读】meta/topics.md'), 'kb_read 默认窗口')
check(!r2.includes('（未完：'), 'kb_read 默认窗口读完整文件时不出现续读提示')
const r2b = await read({ path: 'meta/topics.md', offset: 3, limit: 2 })
check(r2b.includes('窗口 L3-4') && r2b.includes('（未完：共 ') && r2b.includes('续读传 offset=5'), 'kb_read 长文件续读提示（窗口 L3-4 → offset=5）')
const r2c = await read({ path: 'meta/topics.md', offset: 3.9, limit: 2.7 })
check(r2c.includes('窗口 L3-4'), 'kb_read 非整数 offset/limit 截断为整数（3.9/2.7 → L3-4）')
const r3 = await read({ path: '../outside.md' })
check(r3.startsWith('【拒绝】路径越界'), 'kb_read 拒绝越界路径')
const r4 = await read({ path: 'not-exist.md' })
check(r4.startsWith('【读取失败】'), 'kb_read 拒绝不存在文件')
const r5 = await read({ path: 'site/../package.json' })
check(r5.startsWith('【拒绝】'), 'kb_read 拒绝非 .md（绕路径）')

// ── dsh_kb_search 真执行 ───────────────────────────────────────
const search = async (args) => def.tools.dsh_kb_search.execute(args)
const s1 = await search({ query: 'ctx.tools.register' })
check(s1.text.includes('【知识库检索】'), 'kb_search 正常命中')
check(!host || s1.text.includes('【版本提示】'), 'kb_search 输出含版本横幅（探测到宿主时）')
const s2 = await search({ query: 'SettingsForms', maxResults: 'abc' })
check(s2.kind === 'hits' && s2.text.includes('【知识库检索】'), 'kb_search 非数字 maxResults 回退默认值，不再误报「无命中」')
const s3 = await search({ query: 'SettingsForms', maxResults: 0 })
check(s3.kind === 'hits' && !s3.text.includes('另有'), 'kb_search maxResults=0 夹到 1')
const s4 = await search({ query: 'zzzz-no-such-term-zzzz' })
check(s4.kind === 'empty' && s4.text.includes('【无命中】'), 'kb_search 无命中时给出换词建议')
const s5 = await search({ query: 'topics' })
check(s5.kind === 'topics' && s5.text.includes('主题导航'), 'kb_search query=topics 返回主题导航')

if (failures.length) {
  console.error(`\n${failures.length} 项失败`)
  process.exit(1)
}
console.log(`\n[PASS] 冒烟全绿（${passed} 项）`)
