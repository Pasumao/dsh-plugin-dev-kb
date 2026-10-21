---
name: dsh-dev-sandbox
description: dsh 插件开发沙箱：用独立 dev profile 隔离开发中的插件，插件崩了只崩沙箱、绝不影响主力 dsh。所有启动 / 重启 / 看日志 / 冒烟验证都由 agent 自己完成，不要求用户重启。开发或调试 dsh 插件、需要验证插件能否加载、插件改完要重启验证时加载本技能。
whenToUse: 开发/调试 dsh 插件需要启动、重启、验证插件加载，或插件疑似把 dsh 搞挂时
---
# dsh 插件开发沙箱（dsh-dev-sandbox）

核心原则：**开发中的插件永远装在独立沙箱 profile 里，不进主力 profile**。
插件写崩 → 只有沙箱起不来，主力 dsh（desktop）照常运行，agent 还活着就能自己看日志、改代码、重启沙箱、再验证——闭环不需要用户参与。

## 1. profile 约定

- **默认沙箱 profile 名：`dev`**，目录 `%USERPROFILE%\.dsh\profiles\dev`（与 `desktop` / `web` 平级）。
- **用户指定了别的名字就用用户的**（如「用 test 沙箱」→ `profiles\test`），下文的 `dev` 全部替换。
- 沙箱与主力 profile 完全隔离：插件、patch、会话、设置各一份；provider/模型配置可从主力 profile 的 `cordis.patch.yml` 拷贝 provider 段过来（用编辑工具，UTF-8 无 BOM，勿用 PowerShell 重定向写）。

## 2. 沙箱不存在时：初始化（一次）

```powershell
# 版本与目标 dsh 对齐：先用主力安装的实际版本号替换下面的 <ver>（插件自身 peerDependencies 也要覆盖它）
npx -y "@deepseek-ai/dsh@<ver>" plugin --profile dev add file:/绝对路径/插件目录
```

- `add` 走兼容闸门：peerDependencies 不覆盖当前 dsh 版本会整体拒绝并回滚——这不是网络问题，改 peer 或按提示 `allow-version` 豁免。
- 开发中插件优先用 `link:`（目录 junction）依赖挂进沙箱 profile 的 `package.json`：**改 lib 后重启沙箱即生效**，不用反复 add。
- 改完 profile 的 `package.json` / `cordis.patch.yml` 后必须 `pnpm install`（在 profile 目录里）再启动；同一插件严禁双挂载（进 bundles 就不要再 insert）。

## 3. 启动 / 重启沙箱（agent 自己做，不找用户）

```powershell
# 后台启动（run_in_background），端口避开主力；日志里找 token 行与报错
npx -y "@deepseek-ai/dsh@<ver>" web --profile dev --port 3081
```

- 启动日志含 `dsh web: http://127.0.0.1:3081/?token=…`（token 每次启动轮换，用它开 GUI 验证 UI 类插件）。
- **逐条看 stderr 的 `dsh: skipping profile bundle "X"`**——被跳过 = 插件静默失效（不崩但功能没了），立即修，别当没看见。
- **自主重启循环**（改代码 / 改配置后）：
  1. 找进程：`Get-NetTCPConnection -LocalPort 3081 -State Listen | Select OwningProcess`；
  2. 核对 PID 后 `Stop-Process -Id <pid> -Force`；
  3. 重新后台启动，读日志验证（无 skipping 警告、无崩溃栈、端口起来）。
- **红线：沙箱操作只允许碰沙箱端口/profile；绝不 Stop 主力 dsh 进程、绝不改 `profiles\desktop` 下的东西。**

## 4. 冒烟验证（不起 GUI）

一次性 headless 跑同 profile，验证插件能加载、工具能注册：

```powershell
npx -y "@deepseek-ai/dsh@<ver>" --profile dev "列出你当前可用的工具，并调用 <插件工具名> 做一次最小调用"
```

启动即崩（exit 非 0 / 打印异常栈）= 插件破坏了 profile 启动，直接读栈修代码，主 dsh 无恙。

## 5. 收尾：进主力 profile

插件在沙箱里稳定后，才走正常流程挪进主力 profile：同步版本与 peerDependencies → 改主力 profile → `pnpm install` → 自检 → 由用户重启主力 dsh（主力重启永远由用户决定）。发布流程遵循该插件仓库自己的发布规范/CI。

## 6. 常见坑速查

| 症状 | 原因 |
|---|---|
| 插件没加载也没报错 | 被 `skipping profile bundle` 跳过（peer 不兼容）；或 inject 的服务无 provider 静默 PENDING |
| 启动即崩 `duplicate loader entry id` | 双挂载：既进 bundles 又被 insert |
| `installation rejected: incompatible` | 兼容闸门拒绝安装并回滚，改 peer 或 allow-version |
| 配置文件解析炸 | BOM / UTF-16 污染；只用编辑工具或 UTF-8 无 BOM 写 |
| 依赖装了不生效 | 改 profile package.json 后忘 `pnpm install` |

更多：dsh 能力与 API 查 `dsh-plugin-dev-kb` 技能的知识库。
