---
name: dsh-dev-sandbox
description: dsh 插件开发沙箱：agent 自建独立沙箱 profile 隔离开发中的插件，插件崩了只崩沙箱、绝不影响主力 dsh。所有启动 / 重启 / 看日志 / 冒烟验证都由 agent 自己完成，不要求用户重启。开发或调试 dsh 插件、需要验证插件能否加载、插件改完要重启验证时加载本技能。
whenToUse: 开发/调试 dsh 插件需要启动、重启、验证插件加载，或插件疑似把 dsh 搞挂时
---
# dsh 插件开发沙箱（dsh-dev-sandbox）

核心原则：**开发中的插件永远装在独立沙箱 profile 里，不进主力 profile**。
插件写崩 → 只有沙箱起不来，主力 dsh 照常运行，agent 还活着就能自己看日志、改代码、重启沙箱、再验证——闭环不需要用户参与。

下文命令里的 `dsh` 指 `npx -y "@deepseek-ai/dsh@<ver>"` 或桌面自带的 `dsh` 命令；`<ver>` 用主力实际版本
（如 `0.2.2-rc.5`，见 `dsh-upgrade-assistant` 技能的版本探测）。带「实测」的条目在 dsh 0.2.2-rc.5 上验证过。

## 1. 隔离：独立 DSH_HOME + 自定 profile 名

- **独立 `DSH_HOME`（推荐）**：主力 desktop 正在运行时，多个 dsh 实例共写 `~/.dsh` 会锁竞争、
  启动挂死（实测）。给沙箱进程设独立的 `DSH_HOME`（如 `%TEMP%\dsh-sb-home`），profiles / 会话 /
  设置 / 凭据全套独立，与主力零共享。harness 全部消费方都按 `$DSH_HOME`（未设则 `~/.dsh`）
  解析 home（`{{KB_ROOT}}/extra/upgrade-guide/v0.2.1-alpha.1/instruction-home-override/guide.zh.md`）。
- **profile 名由 agent 按任务自定**，如 `sb-<插件名>`（`sb-image-tools`、`sb-table-zoom`），不用固定名。
  共用 `~/.dsh` 时先列 `$DSH_HOME/profiles/`：**不得与现有 profile 重名**（尤其主力 profile，
  绝不复用、绝不写入）；`web` / `headless` 等随附模板名与 `desktop` 也不要用。一次性验证用完即删
  （删 profile 目录即可）；跨天持续开发的插件保留同名沙箱复用。
- 沙箱与主力 profile 完全隔离：插件、patch、会话、设置各一份；模型配置需要时按 §4 自行配置，
  不要从主力 profile 拷凭据。

## 2. 初始化（一次）

```powershell
# 可选：要 Web UI 的沙箱，一步从随附模板复制一份完整组合（dsh-base + dsh-web-app，与桌面 profile 同构）。
# 注意：目标 profile 已存在时会被整目录替换（含已装插件与 cordis.patch.yml）。
dsh --profile <沙箱名> --from-default-profile web --dump-config   # 随附模板：acp / headless / sdk / sdk-minimal / web

# 装入开发中的插件（首次使用会自动初始化 profile，以 @deepseek-ai/dsh-base 打底，并自动加进 dsh.profile.bundles）
dsh plugin --profile <沙箱名> add file:/绝对路径/插件目录
```

- **`--profile` 必须写在 pnpm 参数之前**：`dsh plugin --profile X add Y`，不是 `dsh plugin add Y --profile X`。
- `file:` 装的是**副本**：改了 `lib/` 要先 `dsh plugin --profile <沙箱名> remove <包名>` 再 `add` 才生效；
  `link:<目录>` 是目录 junction，改 `lib/` 后重启沙箱即生效，适合连续开发。
- 启用 HMR 的 profile（随附 profile 都是）里，对已安装的包再 `add` 会报 `already-installed`——
  换版本 / 换安装位置一律先 `remove` 再 `add`。
- `add` 走**兼容闸门**：先看包自己的 `engines.dsh`，没有才看 `@deepseek-ai/dsh*` 的 `peerDependencies`；
  不覆盖当前 dsh 版本会整体拒绝并回滚（`dsh: installation rejected: Plugin X@Y is incompatible with dsh Z`）——
  这不是网络问题，改范围或按提示 `allow-version` 豁免。
- **先核对本机 Node**：`npx` 用的是本机 Node，必须满足目标版本的 `engines.node`
  （`npm view "@deepseek-ai/dsh@<ver>" engines.node`；0.2.2-rc.5 为 `>=24.9.0`，0.2.3-alpha.2 起
  `^24.22.3 || >=26.13.1`）。桌面端自带运行时，主力能跑不代表本机 `npx` 能跑；不够就先升级 Node。
- **同一插件严禁挂两次**：进了 `dsh.profile.bundles` 就不要在 patch 里用别的 id 再 insert 同一个包名。

## 3. 启动 / 重启沙箱（agent 自己做，不找用户）

```powershell
# 后台启动；--port 0 让系统分配空闲端口，日志里的 dsh web: 行给出实际端口
dsh --profile <沙箱名> --port 0 --no-open
```

- **语法是 `dsh [--profile] <name> [app 参数]`**。`web` 本身就是 profile 名，**不要写
  `dsh web --profile <沙箱名>`**（实测报 `select a profile only once`）。端口要自选就传 `--port <空闲端口>`。
- 启动日志含 `dsh web: http://127.0.0.1:<port>/?token=…`（token 每次启动轮换，用它开 GUI 验证 UI 类插件）。
- **逐条看 stderr 的 `dsh: skipping profile bundle "X"`**——被跳过 = 插件静默失效（不崩但功能没了），
  立即修，别当没看见。`dsh: warning: N entry did not activate` 同理，其后每行是一条未激活的行与原因。
- **自主重启循环**（改代码 / 改配置后）：
  1. 找监听该端口的 PID：`netstat -ano`（或 PowerShell `Get-NetTCPConnection -LocalPort <port> -State Listen`）；
  2. 核对 PID 后结束该进程；
  3. 重新后台启动，读日志验证（无 skipping / did not activate 警告、无崩溃栈、端口起来）。
- **红线：沙箱操作只允许碰沙箱端口 / profile / 自己的 `DSH_HOME`；绝不结束主力 dsh 进程、绝不改主力 profile。**

## 4. 冒烟验证

按成本从低到高，做到能下结论为止：

1. **只看组合层（不启动）**：`dsh --profile <沙箱名> --dump-config`，确认出现 `# == <包名>` 层。
2. **看启动日志**：按 §3 启动，确认无 `skipping profile bundle` / `did not activate`、无崩溃栈、端口起来。
   默认日志级别下插件的 `info` 日志不可见，**零日志 ≠ 插件没跑**。要看技能 / 工具是否真注册上：
   在 Web UI 里问 agent；或临时放一个探针 bundle，在 `apply` 里读 `ctx.skills.list()` / `ctx.tools.definitions()`
   （宿主内同进程可直接拿到别的插件注册的工具定义并调用其 `execute`）。
3. **headless 跑一轮**（需要可用模型）：用 headless 模板的沙箱
   （`dsh --profile <沙箱名> --from-default-profile headless --dump-config` 后再装插件），
   并备好模型——隔离 home 里没有凭据，headless 组合也不挂凭据存储
   （`{{KB_ROOT}}/extra/upgrade-guide/v0.2.1-alpha.2/stored-credentials-precedence/guide.zh.md`），
   需导出提供方要求的 API Key 环境变量或配置 provider（`{{KB_ROOT}}/site/guide/providers.md`）。然后：

   ```powershell
   dsh --profile <沙箱名> "列出你当前可用的工具，并调用 <插件工具名> 做一次最小调用"
   ```

启动即崩（exit 非 0 / 打印异常栈）= 插件破坏了 profile 启动，直接读栈修代码，主 dsh 无恙。

## 5. 收尾

- 插件在沙箱里稳定后，才走正常流程挪进主力 profile：同步版本与 peer 声明 → 由用户在主力端安装
  （desktop profile 由客户端独占管理，CLI 不接管）→ 自检 → 由用户重启主力 dsh（主力重启永远由用户决定）。
  发布流程遵循该插件仓库自己的发布规范/CI。
- 沙箱功成身退：结束沙箱进程，删除对应的 `DSH_HOME`（或 profile 目录）即完全清理，不留残留。

## 6. 常见坑速查

| 症状 | 原因 |
|---|---|
| 插件没加载也没报错 | 被 `skipping profile bundle` 跳过（闸门不兼容）；或 `inject` 的服务无 provider，行停在 pending |
| `installation rejected: … incompatible with dsh` | 兼容闸门拒绝安装并回滚，改 `engines.dsh` / peer 范围或 `allow-version` 豁免。预发布宿主上 `^0.2.2` 不含 `0.2.2-rc.5`，下界要写到 rc 之前 |
| `select a profile only once` | 写了 `dsh web --profile X`；`web` 是 profile 名，改用 `dsh --profile X …` |
| `profile "desktop" is managed exclusively by the Electron application` | `desktop` profile 只能由桌面客户端管理；沙箱别叫 desktop，也别用 CLI 动它 |
| 启动告警 `tool "…" is already registered` / `1 entry did not activate` | 同一插件挂了两次（bundles 里一次 + patch 里另一个 id 的 insert）；删掉多余的 insert |
| `already-installed` | HMR profile 里对已安装的包重复 `add`；先 `remove` 再 `add` |
| `[WARN] Issues with peer dependencies found` | 声明了 profile 里没装的 peer（`dsh plugin --profile X peers check` 看明细）。导入宿主包必须声明 peer；不导入的包别声明 |
| 从 `link:` 目录 import 宿主包报 `ERR_MODULE_NOT_FOUND` | 该包没声明进 `peerDependencies`——未声明的宿主包只对装进 profile 的副本可解析 |
| 本机 Node 低于目标版本要求 | 目标版本 `engines.node` 抬高（0.2.2-rc.5 `>=24.9.0`，0.2.3-alpha.2 起 `^24.22.3 || >=26.13.1`）；npx / npm 方式受影响，先 `node --version` 再升级 Node |
| `failed to parse overlay … cordis.patch.yml` | profile 的 patch 必须是**单个**顶层 YAML 数组（`[]` 后不能再接第二个文档）；BOM / UTF-16 同样会炸，只用编辑工具或 UTF-8 无 BOM 写 |
| 依赖装了不生效 | 改 profile package.json 后忘 `pnpm install` |
| 启动长时间无输出挂死 | 与主力 desktop 锁竞争共写 `~/.dsh`——按 §1 用独立 `DSH_HOME` 隔离 |

更多：dsh 能力与 API 查 `dsh-plugin-dev-kb` 技能的知识库。
