// 最小自检：发布前验证结构完整（离线、零依赖）。node scripts/selfcheck.mjs
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const pkgPath = join(root, "package.json");
if (!existsSync(pkgPath)) failures.push("缺 package.json");
else {
  let pkg;
  try { pkg = JSON.parse(readFileSync(pkgPath, "utf8")); }
  catch { failures.push("package.json 解析失败"); pkg = {}; }
  if (pkg.name && pkg.main && !existsSync(join(root, pkg.main)))
    failures.push(`入口不存在: ${pkg.main}`);
  if (pkg.dsh?.bundle?.patch && !existsSync(join(root, pkg.dsh.bundle.patch)))
    failures.push(`bundle patch 不存在: ${pkg.dsh.bundle.patch}`);
}

for (const f of ["README.md", "LICENSE"]) {
  if (!existsSync(join(root, f))) failures.push(`缺 ${f}`);
}

// 1.6.0：检索工具完整性
if (!existsSync(join(root, "lib", "kb-search.js"))) {
  failures.push("缺 lib/kb-search.js（dsh_kb_search 工具实现）");
} else {
  const idxMod = readFileSync(join(root, "lib", "index.js"), "utf8");
  if (!idxMod.includes("dsh_kb_search")) failures.push("lib/index.js 未注册 dsh_kb_search");
  const skill = readFileSync(join(root, "skills", "dsh-plugin-dev-kb.md"), "utf8");
  if (!skill.includes("dsh_kb_search")) failures.push("技能正文未提及 dsh_kb_search");
}

if (failures.length) {
  for (const f of failures) console.error(`[FAIL] ${f}`);
  console.error(`${failures.length} 项失败`);
  process.exit(1);
}
console.log("[PASS] 结构完整，可发布");
