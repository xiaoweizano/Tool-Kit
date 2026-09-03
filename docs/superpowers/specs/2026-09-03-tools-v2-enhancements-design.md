# ToolKit 工具 v2 增强设计（7 工具一次批次）

> 阶段:基于已落地的工具 14-22（tools-14to22）作 v2 增强。
> 用户裁决:7 条一次性全做；密码生成+强度合并为单一「密码工具」页；JWT 补全非对称校验+友好时间+语法高亮。

## Goal

对 7 个已有工具做可用性增强，统一解决「能出结果但结果不直观 / 配置项缺省 / 检测太窄 / 冲突没约束」等问题。全部沿用现有架构（transform.ts 纯逻辑 + index.tsx UI + types.ts），只把跨工具复用 UI 抽到共享组件，不引入配置驱动表单框架。

| # | 工具 | 增强主题 | 交互风格 |
|---|---|---|---|
| 1 | 密码强度分析 | 字符集清单 + 评分进度条 + 建议独立块 | useLiveTransform（并入密码工具页 tab） |
| 2 | JWT 解析 | 算法自动补全 + 非对称校验 + 友好时间 + 语法高亮 | useLiveTransform（Worker） |
| 3 | 密码生成 | 与强度合并为单一「密码工具」页 + 生成规则增强 | 页面 tab(random/aes/bcrypt) + 强度 tab |
| 4 | 日志分析 | 异常/接口检测健壮化 + 错误率配色 + 补单位 | 按钮触发 + FileDrop |
| 5 | Docker 生成 | 常用模板 + 网络模式 + 日志驱动 + 重启策略 | 按钮触发（local） |
| 6 | nginx 配置 | SSL 分节 + root/proxy 互斥 + upstream 联动 + 强制 HTTPS 步骤 + 配置检查 + 多块 | 按钮触发（local） |
| 7 | JVM 参数 | 傻瓜式表单 + 预设 + 更多参数/勾选 | 按钮触发（local） |

## 全局约束（沿用）

- 输出统一 `ToolResult<...>`；纯函数可测；共享文件 append-only；TDD；每 task commit；中文 UI；三态无静默失败。
- **真实粘贴格式优先**（memory:json-tool-product-intent）：JWT 允许尾部空白；日志允许行首缩进/Windows 换行；容器/配置工具允许默认值兜底。
- lazy import 保路由级代码分割；web purity 不受影响；新增依赖必须浏览器安全（不新增）。

## 共享组件（新增）

- `components/StrengthBar.tsx` —— 0-100 评分进度条，颜色随 weak/medium/strong 变化。
- `components/CharsetChecklist.tsx` —— 小写/大写/数字/符号 ✓/✗ 独立块。
- `components/JsonView.tsx` —— 语法高亮 JSON 查看器（键/字符串/数字/布尔着色），基于现有 `components/highlight.ts` 扩展或新增 tokenizer。
- `components/UnitBadge.tsx`（可选）—— 数值带单位渲染。

---

## #1 密码强度分析（并入密码工具页「强度分析」tab）

**现状**：`password-strength` 独立工具，`analyzeStrength` 返回 score/level/length/checks/suggestions。UI 只显示 badge + 建议列表。

**改动**：
- **字符集清单块**：把 `checks`（length/charset/seq/keyboard/repeat/common）渲染成独立块；其中**字符集四项**（小写/大写/数字/符号）用 `CharsetChecklist` 独立展示，每项 ✓/✗。
- **评分进度条**：score 0-100 用 `StrengthBar` 展示，颜色随档位变化。
- **建议独立块**：`suggestions` 放到独立卡片，与评分、字符清单分开展示。
- **UI 分层**：抽成 `StrengthPanel.tsx` 子组件（含上述三块），`password-tools` 页直接复用。

**transform 改动**：`analyzeStrength` 的 `StrengthCheck` 增加字符集清单来源（已有 `charset` check，抽取四项明细）；保留 `improvePassword`（移到随机生成 tab 用）。不破坏现有签名与测试。

---

## #2 JWT 解析

**现状**：仅支持 HS256/384/512 校验；算法下拉固定三项；header/payload 用普通 `<pre>` 输出；无时间字段友好化。

**改动**：
- **算法下拉动态补全**：解析出 `header.alg` 后，若不在下拉列表则自动加入（如 RS256/ES256/PS256）；下拉更新为 `HS256/HS384/HS512/RS256/RS384/RS512/ES256/ES384/ES512/PS256/PS384/PS512`（可用值集）。
- **非对称校验**：新增「公钥/密钥（PEM）」输入框。校验时：HS* 用 secret；RS/ES/PS 用粘贴的 PEM 公钥（jose 支持）。签名仍默认 HS*（用 secret）。
- **友好时间转换**：`parse` 时自动识别 payload 中的 `exp/iat/nbf/updated_at/created_at` 等整型时间字段，把 Unix 秒 → `YYYY-MM-DD HH:mm:ss`（本地时区）并在 Payload JSON 旁以表格/标签展示。同时提供通用「时间戳→友好时间」输入框（可对任意字段或单独值转换）。
- **语法高亮**：header / payload 用 `JsonView` 渲染。

**transform 改动**：`parseJwt` 输出增加派生字段（如 `header.alg` 已含于 header；新增友好时间映射，不破坏原结构）；`verifyJwt` 支持传 PEM 公钥（新增 opts.key）；`signJwt` 保持 HS*。保留现有签名，新增参数可选。

---

## #3 密码生成 + 强度合并 → 单一「密码工具」页

**现状**：`password-generator`（3-tab：random/crypto/bcrypt）与 `password-strength` 是两个独立注册项、两条路由。

**改动**：
- **注册表**：删除 `password-strength`、`password-generator` 两条，新增一条 `password-tools`（id `password-tools`，name `密码工具`，route `/tools/password-tools`）。同步更新 `register.test.ts`。
- **页面**：`password-tools/index.tsx`，4 个 tab：`随机生成` / `强度分析` / `AES-RSA` / `BCrypt`。每个 tab 独立组件、各自持状态。
  - `随机生成` = 原 `RandomPanel` 增强（见下）。
  - `强度分析` = 抽出的 `StrengthPanel`（#1）。
  - `AES-RSA` / `BCrypt` = 原 `CryptoPanel` / `BcryptPanel` 原样迁移。
- **generate 增强（RandomPanel）**：`长度`、四类字符集、`自定义字符`、**排除易混字符(0/O/1/l/I)**、**生成数量**（一次出 N 条，含强度评分）、**按目标强度生成**（复用 `improvePassword` 的思路/或生成后校验到 target 档）、**避免连续/键盘序列**（生成后 pass `breakRuns`）。
- **目录结构**：新建 `tools/password-tools/`（index + 4 个子组件），保留旧 `password-strength/` 与 `password-generator/` 的 transform/types（worker 仍引用），旧页面组件随注册表删除后不再被 lint/打包引用（若残留无用 import 一并清理）。
- **worker**：`registry.set('password-tools', …)` 沿用 password-strength 的注册逻辑（analyze + generate 两个 action）。

---

## #4 日志分析

**现状 bug**：ERROR 占比很高但「异常聚类」「接口异常聚合」显示「无」。根因：异常正则 `Exception|Error|Throwable` 太窄、接口路径要求 `(GET|POST|PUT|DELETE|PATCH)` 前缀 —— 真实 Java/Spring 日志（`Caused by`、无 HTTP 动词的 `/api/...`、`Exception` 缺省等）匹配不上。

**改动**：
- **异常检测健壮化**：放宽匹配 —— 追加 `Caused by (\w+Exception)`、`(\w+(?:Exception|Error|Throwable))(?::\s*(.*))?` 已在用；新增帧提取 `at com.x.Y$Z.<method>`、堆栈缩进行识别（以 `\tat ` 为线索聚合到最近的异常类型）；对仅 `ERROR`/`FATAL` 无异常类型名的行，用「消息前 40 字符摘要」作为兜底聚类 key。
- **接口路径检测健壮化**：放宽为识别路径 token —— 保留「动词 + 路径」；新增无动词路径（`/api/v1/...`、`/users/{id}`、URL 中 `/path` 片段），用正则抽取路径并做参数归一化（`/123` → `/{id}`）再聚合。
- **时间线柱状图按错误率着色**：每个时间桶统计 `{ total, error }`，柱状颜色按 `error/total` 分级（0 → 绿、0-30% → 黄、≥30% → 红），并显示 `N 条（含 E 错误）` 带单位。
- **补单位**：`共 N 行`、`×N 次`、`占比 N%`、异常 `×N` 等统一补单位（条/次/个）。
- **错误率阈值提醒**：级别统计里 ERROR/FATAL 占比 > 阈值（默认 30%）用红色 badge 高亮并加提示文案。

**types 改动**：`TimelinePoint` 增加 `error?: number`；`LevelStat` 增加 `isHigh?: boolean`（阈值判断），其余字段不变。

---

## #5 Docker 生成

**现状**：run tab 有 name/restart/network/ports/volumes/envs；compose 有 name/image/ports/volumes/envs/depends_on；dockerfile 有 base/workdir/copy/run/expose/entrypoint。无模板、无日志、network 为自由输入、compose 无 restart。

**改动**：
- **常用模板**：新增 `data/templates.ts`，内置 `mysql/postgres/redis/nginx/mongo/node` 等预设（各含 image、推荐 ports、volumes、env、可选 healthcheck）。选模板自动填充 run/compose 表单，可再改（不强制锁死）。
- **网络模式**：run 的 `--network` 从自由输入改为下拉 `bridge/host/none/<自定义>`；compose 增 `network_mode`。
- **日志**：run 增 `--log-driver`（`json-file/syslog/journald`/无）+ `--log-opt max-size/max-file`；compose 增 `logging:`（driver + options）。
- **重启策略**：compose 服务增 `restart` 字段（`no/always/unless-stopped/on-failure`）；run 已有，保持不变。
- **便捷化**：run/compose 两个 tab 共享模板选择器 + 网络/日志/重启通用控件（抽共用小组件或复用同一份数据/model）。

**data**：`commands.ts` 保留（速查）；新增 `templates.ts`。

---

## #6 nginx 配置

**现状**：单 server 单 location；sslCert/sslKey 恒显、仅当二者都填才 emit；root 和 proxy_pass 可同时填（nginx 语义冲突）；upstream 与 proxy_pass 无联动；强制 HTTPS 无步骤引导；无校验。

**改动**：
- **SSL 分节**：`启用 SSL` 勾选后才显示 `证书路径`、`私钥路径`（两者必填校验，缺一报 invalid-input）。勾选后 listen 自动切 443、emit `ssl_certificate(_key)`。
- **root / proxy_pass 互斥**：改成「二选一」模式切换 —— `静态站点(root)` 或 `反向代理(proxy_pass)`；选 proxy_pass 时 root 输入禁用，反之亦然；生成时二选一 emit。
- **Upstream 联动 proxy_pass**：proxy_pass 目标下拉，选项含 `http://<upstream名>`（由 upstream 列表自动生成）与「自定义」；选 upstream 名后 proxy_pass 自动带出，避免手填冲突。
- **强制 HTTPS 弹配置步骤**：勾选后展示步骤说明（①填证书路径 ②选跳转方式 301/308 ③确认生成），并自动产出「80 跳转 server + 443 主 server」两个块（80 块 `return 301/308 https://$host$request_uri;`）。
- **配置检查按钮**：生成后执行静态校验，列举问题：缺 server_name、proxy_pass 指向未定义的 upstream、root/proxy 同时存在、location 冲突、listen 与 ssl 不一致、SSL 缺证书路径等。
- **多 server 块 / 多 location 块**：允许添加多个 server（列表项），每个 server 内含多个 location（类型：静态/代理/重定向/自定义），输出完整 conf（多个 `server {}`，各自 listen/server_name/location）。

**types 改动**：`NginxOptions` 重构为多 server 模型（`servers: NginxServer[]`），`NginxServer` 含 listen/ssl(root|proxy 二选一)/locations[]/强制 HTTPS 等；upstream 与 proxy 联动字段。破坏性变更，同步重写 `transform.ts` 与 `test/nginx-generator.test.ts`。

---

## #7 JVM 参数

**现状**：xms/xmx/xmn/metaspace/gc/heapDump/heapDumpPath/remoteDebugPort/printGc/jmxPort/flightRecorder/container/extra。字段无中文说明、无默认值、无预设。

**改动**：
- **傻瓜式表单**：每个字段加中文说明 + 单位默认值（如 Xms `512m`、Xmx `2g`、Xss `1m`、MetaspaceSize `256m`）；数值输入做合法性提示。
- **场景预设**：`Small`（1-2G）/ `Medium`（4G）/ `Large`（8G+）/ `容器内` 四个一键预设，带入推荐参数组合。
- **更多参数/勾选**：新增 `-server`、`-Xss 栈大小`、`-XX:MaxMetaspaceSize`、`-XX:MaxDirectMemorySize`、`-Xlog`（GC 日志，含 `-Xlog:gc`）、`-XX:+ExitOnOutOfMemoryError`、`-XX:+UseCompressedOops`、`-XX:+PrintGCDateStamps`、`-Dfile.encoding=UTF-8` 等常用开关/输入；GC 下拉保留 g1/zgc/shenandoah。
- **输出**：仍为带注释的行式参数（`-Xmx2g   # 最大堆`），可整行复制。

---

## 执行批次（SDD 任务划分）

1. 共享组件：`StrengthBar` / `CharsetChecklist` / `JsonView`（含各自测试）。
2. **密码工具合并（#1+#3）**：`password-tools` 页面 + 4 tab；`RandomPanel` 增强；`StrengthPanel` 抽出；注册表单条 + register.test 更新；删除旧两条注册。
3. **JWT（#2）**：transform 非对称/友好时间/JsonView 接入 + golden 测试。
4. **日志分析（#4）**：transform 健壮化 + 超时配色/单位 + 测试。
5. **Docker（#5）**：templates 数据 + run/compose 增强 + 测试。
6. **nginx（#6）**：多 server/多 location 重构 + SSL/互斥/联动/校验 + 测试重写。
7. **JVM（#7）**：预设 + 更多参数 + 测试。
8. 全量回归 + typecheck + lint。

## 测试策略

- **Golden 测试（必须）**：每个工具的 transform 函数对新增行为断言最少 3 例（如 JWT RS256 用固定公私钥校验、日志异常聚类对 `Caused by` 命中、nginx 互斥/校验）。
- **边界测试**：空输入、非法证书、缺失 upstream 引用、超大日志截断。
- **UI 手测**：`pnpm dev:web` 目验导航、tab 切换、进度条/高亮渲染、配置检查输出。
- **注册表测试**：`register.test.ts` 更新为只认 `password-tools`。
- **结构守门**：Docker 模板 ≥5 个（mysql/postgres/redis/nginx/mongo/node）。

## 里程碑

1. 共享组件 + 密码工具合并 → `pnpm dev:web` 手测随机生成/强度/AES-RSA/BCrypt 四 tab。
2. JWT + 日志 → 手测 RS256 粘贴校验、时间线错误率配色、接口聚合命中。
3. Docker + nginx + JVM → 手测模板、配置检查、SSL 互斥、JVM 预设。
4. 全量 → `pnpm test` 全绿；`pnpm build:web` 成功；`pnpm lint` 通过。

---

## Self-Review

1. **占位符**：无 TBD/TODO；7 工具各有具体改动点、types、测试要求。
2. **一致性**：沿用 transform/tests 分层；三态错误处理；中文 UI；真实粘贴格式优先。
3. **范围**：密码是一次最大结构性改动（删两条并入一条）；nginx 是第二（模型重构）；其余为就地增强。均可独立 TDD。
4. **歧义已消**：JWT 算法可用集与「自动识别 + 也可手动」双路径明确；nginx 多 server 模型确认；日志异常/接口用健壮化+回退（不依赖用户特定格式）；Docker 模板可改不锁死。
5. **破坏性**：nginx NginxOptions 重构、密码注册项删除是已知破坏，已列对应测试重写。
