// 最小自检：发布前验证结构完整（离线、零依赖）。node scripts/selfcheck.mjs
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
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

// 1.8.0：局部阅读工具 + 版本感知 + starter 技能
if (!existsSync(join(root, "lib", "kb-version.js"))) {
  failures.push("缺 lib/kb-version.js（宿主版本探测）");
} else {
  const idxMod = readFileSync(join(root, "lib", "index.js"), "utf8");
  if (!idxMod.includes("dsh_kb_read")) failures.push("lib/index.js 未注册 dsh_kb_read");
  if (!idxMod.includes("kb-version.js")) failures.push("lib/index.js 未接入版本探测");
}
if (!existsSync(join(root, "skills", "dsh-plugin-starter.md"))) {
  failures.push("缺 skills/dsh-plugin-starter.md（脚手架技能）");
} else {
  const starter = readFileSync(join(root, "skills", "dsh-plugin-starter.md"), "utf8");
  if (!starter.includes("dsh.bundle.patch")) failures.push("starter 技能未覆盖 dsh.bundle.patch 门槛");
  if (!starter.includes("{{KB_ROOT}}")) failures.push("starter 技能缺 KB_ROOT 占位符");
}
const mainSkill = readFileSync(join(root, "skills", "dsh-plugin-dev-kb.md"), "utf8");
if (!mainSkill.includes("dsh_kb_read")) failures.push("技能正文未提及 dsh_kb_read");

// 1.8.3：desktop app.asar 版本探测——用合成最小 asar 验证头部解析与 @deepseek-ai/dsh 选中
try {
  const { writeFileSync, unlinkSync } = await import("node:fs");
  const tmpAsar = join(root, ".selfcheck-tmp.asar");
  const dshPkg = Buffer.from(JSON.stringify({ name: "@deepseek-ai/dsh", version: "0.2.2-rc.4" }));
  const appPkg = Buffer.from(JSON.stringify({ name: "dsh-desktop", version: "9.9.9" }));
  const mk = (files) => ({ files });
  const tree = mk({
    "package.json": { size: appPkg.length, offset: String(dshPkg.length) }, // 诱饵：壳自身 package.json
    node_modules: mk({ "@deepseek-ai": mk({ dsh: mk({ "package.json": { size: dshPkg.length, offset: "0" } }) }) }),
  });
  const json = Buffer.from(JSON.stringify(tree));
  const pad = (4 - (json.length % 4)) % 4;
  const headerLen = 8 + json.length + pad; // headerPickle 总长 = 4(前缀) + 4(jsonLen) + 载荷
  const head = Buffer.alloc(16);
  head.writeUInt32LE(4, 0);
  head.writeUInt32LE(headerLen, 4);
  head.writeUInt32LE(4 + json.length + pad, 8);
  head.writeUInt32LE(json.length, 12);
  writeFileSync(tmpAsar, Buffer.concat([head, json, Buffer.alloc(pad), Buffer.alloc(headerLen - 8 - json.length - pad), dshPkg, appPkg]));
  const { readAsarCoreVersion, detectHostVersion } = await import(
    pathToFileURL(join(root, "lib", "kb-version.js")).href
  );
  const got = readAsarCoreVersion(tmpAsar);
  if (got !== "0.2.2-rc.4") failures.push(`asar 版本解析错：得到 ${JSON.stringify(got)}，期望 0.2.2-rc.4`);
  if (readAsarCoreVersion(join(root, "不存在的.asar")) !== null) failures.push("asar 解析对不存在文件未返回 null");
  unlinkSync(tmpAsar);
  // 探测主入口仍可用（本机环境探测结果不断言，只断言不抛错且形态合法）
  const det = detectHostVersion(root);
  if (det !== null && (!det.version || !det.source)) failures.push("detectHostVersion 返回形态非法");
} catch (e) {
  failures.push(`asar 探测自检异常：${e?.message || e}`);
}

if (failures.length) {
  for (const f of failures) console.error(`[FAIL] ${f}`);
  console.error(`${failures.length} 项失败`);
  process.exit(1);
}
console.log("[PASS] 结构完整，可发布");
