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

// 1.8.3 / 1.8.5：desktop app.asar 版本探测——用合成 asar 验证头部解析、核心包落点搜索与选中
try {
  const { writeFileSync, unlinkSync } = await import("node:fs");
  const { packAsar } = await import("./asar-fixture.mjs");
  const { readAsarCoreVersion, detectHostVersion } = await import(
    pathToFileURL(join(root, "lib", "kb-version.js")).href
  );
  const pkg = (version) => Buffer.from(JSON.stringify({ version }));
  const tmpAsar = join(root, ".selfcheck-tmp.asar");
  const expectAsar = (label, files, expected) => {
    writeFileSync(tmpAsar, packAsar(files));
    const got = readAsarCoreVersion(tmpAsar);
    if (got !== expected) failures.push(`asar 版本解析错（${label}）：得到 ${JSON.stringify(got)}，期望 ${expected}`);
  };
  // 壳自身 package.json 与 @deepseek-ai 下的非核心包都是诱饵，不得被选中
  expectAsar("嵌套布局（真实桌面壳）", {
    "package.json": pkg("9.9.9"),
    "node_modules/@deepseek-ai/dsh-brand/package.json": pkg("0.0.0"),
    "dsh/node_modules/@deepseek-ai/dsh/package.json": pkg("0.2.2-rc.5"),
  }, "0.2.2-rc.5");
  expectAsar("扁平布局", {
    "package.json": pkg("9.9.9"),
    "node_modules/@deepseek-ai/dsh-base/package.json": pkg("0.2.1-rc.2"),
    "node_modules/@deepseek-ai/dsh/package.json": pkg("0.2.2-rc.4"),
  }, "0.2.2-rc.4");
  expectAsar("最浅落点优先", {
    "aaa/lib/node_modules/x/node_modules/@deepseek-ai/dsh/package.json": pkg("0.2.0-rc.2"), // 依赖私有嵌套的旧副本
    "dsh/node_modules/@deepseek-ai/dsh/package.json": pkg("0.2.2-rc.5"), // 应用自己的依赖树
  }, "0.2.2-rc.5");
  expectAsar("条目损坏回退", {
    "dsh/node_modules/@deepseek-ai/dsh/package.json": Buffer.from("{ not json"),
    "dsh/node_modules/@deepseek-ai/dsh-base/package.json": pkg("0.2.2-rc.5"),
  }, "0.2.2-rc.5");
  expectAsar("无核心包", {
    "package.json": pkg("9.9.9"),
    "node_modules/@deepseek-ai/dsh-brand/package.json": pkg("0.0.0"),
  }, null);
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
