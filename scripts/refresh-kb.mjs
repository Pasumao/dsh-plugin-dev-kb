// One-shot knowledge-base refresh: sync kb/ from upstream deepseek-harness master.
// Usage:  node scripts/refresh-kb.mjs [--keep-tmp]
// Steps (see kb/README.md「更新方法」):
//   1. shallow-clone upstream repo into a temp dir
//   2. install mdast projection deps next to the clone
//   3. run scripts/project-doc-site.ts -> website/.generated
//   4. mirror .generated -> kb/site
//   5. rebuild kb/extra = docs/ md NOT in the published set (docsPages source/aliases)
//   6. npm run rebuild-index; update kb/meta/source.json + kb/README.md stats
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KB = path.join(PLUGIN, 'kb');
const REPO_URL = 'https://github.com/deepseek-ai/deepseek-harness.git';
const TMP = path.join(PLUGIN, '.refresh-tmp');
const CLONE = path.join(TMP, 'deepseek-harness');
const KEEP = process.argv.includes('--keep-tmp');

function pathToFileUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/');
}

function run(cmd, opts = {}) {
  const r = spawnSync(cmd, { shell: true, stdio: 'inherit', cwd: CLONE, ...opts });
  if (r.status !== 0) { console.error(`FAILED: ${cmd} (cwd=${opts.cwd || CLONE})`); process.exit(r.status ?? 1); }
}

// robocopy: exit codes 0-7 all mean success (1 = files copied)
function robocopy(src, dest, extra = '') {
  const r = spawnSync(`robocopy "${src}" "${dest}" /MIR /NFL /NDL /NJH /NJS ${extra}`, { shell: true, stdio: 'inherit' });
  if (r.status === null || r.status > 7) { console.error(`robocopy FAILED (${r.status}): ${src} -> ${dest}`); process.exit(r.status ?? 1); }
}

function countMd(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countMd(path.join(dir, e.name));
    else if (e.name.endsWith('.md')) n++;
  }
  return n;
}

console.log('[1/6] cloning upstream ...');
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
run(`git clone --depth 1 ${REPO_URL} "${CLONE}"`, { cwd: PLUGIN });
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: CLONE, encoding: 'utf8' }).stdout.trim();
console.log('  commit:', commit);

console.log('[2/6] installing projection deps ...');
run('npm install --no-save --no-package-lock mdast-util-from-markdown mdast-util-gfm micromark-extension-gfm', { cwd: TMP });

console.log('[3/6] projecting doc site ...');
run('node --input-type=module -e "import(\'./scripts/project-doc-site.ts\').then(m => m.projectDocs()).then(() => console.log(\'projected\'))"');

console.log('[4/6] mirroring kb/site ...');
robocopy(path.join(CLONE, 'website', '.generated'), path.join(KB, 'site'));

console.log('[5/6] rebuilding kb/extra from published-set diff ...');
const { docsPages } = await import(pathToFileUrl(path.join(CLONE, 'website', 'docs.ts')));
const norm = s => String(s).replace(/\\/g, '/').replace(/^docs\//, '');
const published = new Set();
for (const p of docsPages) {
  published.add(norm(p.source));
  for (const a of p.sourceAliases || []) published.add(norm(a));
}
const DOCS = path.join(CLONE, 'docs');
const wanted = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.md')) wanted.push(full);
  }
})(DOCS);
const extraRel = wanted
  .map(f => path.relative(DOCS, f).replace(/\\/g, '/'))
  .filter(r => !published.has(r));
const EXTRA = path.join(KB, 'extra');
let copied = 0;
for (const rel of extraRel) {
  const dest = path.join(EXTRA, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(DOCS, rel), dest);
  copied++;
}
let removed = 0;
(function prune(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) prune(full);
    else if (e.name.endsWith('.md')) {
      const rel = path.relative(EXTRA, full).replace(/\\/g, '/');
      if (!extraRel.includes(rel)) { fs.unlinkSync(full); removed++; }
    }
  }
})(EXTRA);
(function pruneDirs(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      const full = path.join(dir, e.name);
      pruneDirs(full);
      if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
    }
  }
})(EXTRA);
console.log(`  extra: copied ${copied}, removed ${removed}, total ${countMd(EXTRA)}`);

console.log('[6/6] rebuilding index + metadata ...');
run('npm run rebuild-index', { cwd: PLUGIN });

const siteFiles = fs.readdirSync(path.join(KB, 'site'), { recursive: true, withFileTypes: true });
let siteMd = 0, siteImages = 0;
for (const e of siteFiles) {
  if (!e.isFile()) continue;
  if (e.name.endsWith('.md')) siteMd++;
  else if (/\.(png|jpe?g|svg|webp|gif)$/i.test(e.name)) siteImages++;
}
const extraMd = countMd(EXTRA);
const today = new Date().toISOString().slice(0, 10);
const source = JSON.parse(fs.readFileSync(path.join(KB, 'meta', 'source.json'), 'utf8'));
const short = commit.slice(0, 7);
source.commit = commit;
source.fetchedAt = today;
source.publishedMarkdownPages = siteMd;
source.siteFiles = siteMd + siteImages;
source.images = siteImages;
source.extraFiles = extraMd;
source.note = `内容同步（${today}）：site/ 与 extra/ 刷新至上游 master @ ${short}（refresh-kb.mjs 自动执行），extra 共 ${extraMd} 篇。`;
source.schemaVersion = 1;               // shields.io dynamic JSON badge fields
source.label = 'kb sync';
source.message = `${today} @ ${short}`;
source.color = 'blue';
fs.writeFileSync(path.join(KB, 'meta', 'source.json'), JSON.stringify(source, null, 2) + '\n', 'utf8');

const readmePath = path.join(KB, 'README.md');
let readme = fs.readFileSync(readmePath, 'utf8');
readme = readme
  .replace(/- 站点页面：\d+ 个 Markdown（中文 \d+ \+ 英文 \d+），\d+ 张图片/,
    `- 站点页面：${siteMd} 个 Markdown，${siteImages} 张图片`)
  .replace(/- 补充文档：\d+ 个 Markdown（`extra\/`）/,
    `- 补充文档：${extraMd} 个 Markdown（\`extra/\`）`)
  .replace(/- 来源 commit：`[0-9a-f]+`（master，[\d-]+ 同步）/,
    `- 来源 commit：\`${commit}\`（master，${today} 同步）`);
fs.writeFileSync(readmePath, readme, 'utf8');

if (!KEEP) fs.rmSync(TMP, { recursive: true, force: true });
console.log(`DONE: kb synced to upstream @ ${short} (${today}).`);
console.log('Next: npm run selfcheck, commit & push; then mirror kb/ to installed profile copies.');

