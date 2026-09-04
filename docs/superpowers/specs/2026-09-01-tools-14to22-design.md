# ToolKit 工具 14-22 实现设计（9 工具 3 批次）

> 阶段:工具箱扩展批次 2（工具 11-13 已落地:batch-transform / translate / es-query-builder）。
> 用户裁决:按领域分 3 个独立 OpenSpec change（密码加密 / 数据文本 / 配置生成），真实现全部 9 个工具。

## Goal

新增 9 个工具，覆盖三类开发者高频场景：

| 组 | 工具 | 集成风格 | 核心库（新增） |
|---|---|---|---|
| 密码加密 | 15 密码生成器 | 按钮触发（local） | `bcryptjs` |
| 密码加密 | 16 密码强度分析 | useLiveTransform（Worker） | 无（纯逻辑） |
| 密码加密 | 18 JWT 解析 | useLiveTransform（Worker） | `jose` |
| 数据文本 | 14 文本对比 | useMultiFieldTransform（Worker） | `diff`（jsdiff） |
| 数据文本 | 17 进制转换 | useLiveTransform（Worker） | 无（纯逻辑） |
| 数据文本 | 21 日志分析 | 按钮触发（local,FileDrop） | 无（纯逻辑） |
| 配置生成 | 19 Docker 生成 | 按钮触发（local） | 无（模板） |
| 配置生成 | 20 nginx 生成 | 按钮触发（local） | 无（模板） |
| 配置生成 | 22 JVM 参数 | 按钮触发（local） | 无（模板） |

## 全局约束（沿用前批次）

- 输出统一 `ToolResult<string>` 或 `ToolResult<StructuredResult>`（21 日志分析返回结构化报告）
- 纯函数可测；共享文件 append-only；TDD；每 task commit；中文 UI；三态无静默失败
- **真实粘贴格式优先**（memory:json-tool-product-intent）：JWT 允许尾部空白/换行；日志允许行首缩进/Windows 换行
- lazy import 保路由级代码分割；web purity 不受影响

---

## Change 1：密码加密组（tools 15/16/18）

### Tool 15：密码生成器

**交互风格**:按钮触发（id-generator 先例）。页面含三个功能面板：

**Panel A — 随机密码生成**
- 选项：长度（8-128，默认 16）、字符集（大小写/数字/符号/自定义）
- 输出：随机密码 + 复制按钮

**Panel B — 双向加密（RSA / AES，原生 Web Crypto）**
- AES：输入明文 + 密钥（Passphrase，经 PBKDF2 派生，GCM 模式）→ 加密；输入密文 + 密钥 → 解密
- RSA：生成密钥对 / 输入 PEM + 明文 → 加密（RSA-OAEP）；输入 PEM + 密文 → 解密
- 输出：密文/明文 Base64 + 复制按钮
- **安全决策**：不用 crypto-js（默认 KDF 用 MD5，弱）也不用 jsencrypt（重）；用浏览器原生 Web Crypto API（async，经 comlink 无类型改动）
- BCrypt 用 `bcryptjs`（spring-security BCryptPasswordEncoder 等价，sync）

**Panel C — 单向哈希（BCrypt，默认）**
- 默认 BCryptPasswordEncoder（Spring Security 规范，salt 由算法内部生成）
- 输入：明文 → 输出：BCrypt hash（`bcryptjs`）
- 验证：输入明文 + 已有 hash → 校验是否匹配（`bcrypt.compareSync`）
- 不做 SHA/MD5（已有 id-generator 覆盖，BCrypt 是 Java 后端最常用场景）

**类型定义**:
```typescript
interface PasswordGenResult {
  password?: string           // Panel A 输出
  encrypted?: string          // Panel B 密文
  decrypted?: string          // Panel B 明文
  rsaPublicKey?: string       // Panel B RSA 公钥（生成时）
  rsaPrivateKey?: string      // Panel B RSA 私钥（生成时）
  bcryptHash?: string         // Panel C 输出
  bcryptMatch?: boolean       // Panel C 验证结果
}
```

**文件结构**:
```
src/renderer/src/tools/password-generator/
├── icon.tsx
├── index.tsx          # 三面板页面
├── transform.ts       # generatePassword / encryptAes / encryptRsa / hashBcrypt
├── types.ts
└── components/
    ├── RandomPanel.tsx
    ├── CryptoPanel.tsx
    └── BcryptPanel.tsx
```

**错误处理**:空输入 → invalid-input；BCrypt hash 格式非法 → invalid-input；RSA key 格式错误 → invalid-input

---

### Tool 16：密码强度分析

**交互风格**:useLiveTransform（Worker）。粘贴密码即时分析。

**分析维度（全部前端计算，无需库）**:
- **长度评分**：<8 弱 / 8-12 中 / >12 强
- **字符集多样性**：小写 / 大写 / 数字 / 符号，覆盖种类计分
- **常见模式检测**：纯数字、连续字符（abc/123）、键盘序列（qwerty）、重复字符（aaa）
- **综合评分**：0-100，分三档（弱 <40 / 中 40-70 / 强 >70），文字标签 + 色彩（红/黄/绿）

**强度建议**:按缺失维度逐一给出中文建议（如"增加符号""避免连续字符"）

**密码生成**（opts.action='generate'）:
- 输入：目标强度（weak/medium/strong）+ 可选自定义规则（长度、必含字符集、排除字符）
- 输出：符合目标强度的随机密码（循环生成直到达标）

**Opts 设计**:
```typescript
interface PasswordStrengthOpts {
  action?: 'analyze' | 'generate'   // 默认 'analyze'
  targetLevel?: 'weak' | 'medium' | 'strong'
  rules?: { minLength?: number; requireCharsets?: string[]; excludeChars?: string }
}
```

**文件结构**: `tools/password-strength/{icon.tsx, index.tsx, transform.ts, types.ts}`

---

### Tool 18：JWT 解析

**交互风格**:useLiveTransform（Worker）。粘贴 JWT 即时解析，opts 切换模式。

**模式**:
- `parse`（默认）：Base64 decode header + payload，格式化输出（JSON，高亮关键字段：exp/iat/sub/iss/aud）
- `verify`：输入 JWT + 密钥/公钥 → 验证签名（opts.algorithm: HS256/HS384/HS512/RS256/RS384/RS512，默认 HS256）
- `sign`：输入 payload JSON + 密钥 + 算法 → 生成 JWT
- `renew`：输入 JWT + 密钥 → 更新 exp（opts.newExpiry，如 '1h'/'7d'，默认 '1h'）

**前置解析**:JWT 格式容错——允许尾部空白/换行，自动 trim；非三段格式 → invalid-input（明确提示"不是合法 JWT"）

**类型定义**:
```typescript
interface JwtResult {
  header?: object             // parse 输出
  payload?: object            // parse 输出
  isValid?: boolean           // verify 输出
  verifyError?: string        // verify 失败原因
  token?: string              // sign / renew 输出
  expiresAt?: string          // 过期时间 ISO8601（parse/renew 时计算）
}
```

**关键库**:`jose`（浏览器原生 JWT/JWS/JWE 库，支持所有主流算法，tree-shakeable）

**文件结构**: `tools/jwt-tool/{icon.tsx, index.tsx, transform.ts, types.ts}`

---

## Change 2：数据文本组（tools 14/17/21）

### Tool 14：文本对比

**交互风格**:useMultiFieldTransform（Worker）。

**输入**:`{ textA: string, textB: string }`

**输出**:HTML 字符串，差异高亮（绿色新增 / 红色删除 / 灰色未变）

**Diff 模式（opts.mode）**:
- `line`（默认）：逐行对比，差异行整行高亮
- `word`：逐词对比（适合单行文本）
- `char`：逐字符对比（适合短字符串）

**实现**:直接使用 `diff` 库（jsdiff）的 `diffLines` / `diffWords` / `diffChars`，输出 → HTML 字符串（内联样式，不依赖外部 CSS）。

**空输入处理**:textA 和 textB 都为空 → EMPTY；只有一侧为空 → invalid-input（提示"请粘贴两段文本"）

**文件结构**: `tools/text-diff/{icon.tsx, index.tsx, transform.ts, types.ts}`

---

### Tool 17：进制转换

**交互风格**:useLiveTransform（Worker）。粘贴数字，opts 指定源进制，输出全部进制。

**输入**:数字字符串（允许 0x 前缀、0b 前缀自动识别源进制；无前缀时用 opts.source 指定，默认 10）

**Opts**:
```typescript
interface BaseConvOpts {
  source?: 2 | 8 | 10 | 16    // 默认 10；输入含前缀时自动忽略此字段
}
```

**输出**:
```typescript
interface BaseConvResult {
  bin: string     // 0b 前缀
  oct: string     // 0 前缀
  dec: string
  hex: string     // 0x 前缀（大写）
}
```

**边界**:非法字符（如 "1g" 对二进制）→ invalid-input（具体指出哪个字符非法）；超大数用 BigInt 处理（TypeScript 原生支持）

**文件结构**: `tools/base-converter/{icon.tsx, index.tsx, transform.ts, types.ts}`

---

### Tool 21：日志分析工具

**交互风格**:按钮触发 + FileDrop（文件上传，不走 Worker）。这是最复杂的工具。

**输入方式**:FileDrop 上传日志文件（.log / .txt / .out，浏览器 FileReader 读取）；也支持粘贴文本（textarea 直接输入）

**分析模块（全部前端计算）**:

| 模块 | 说明 | 输出 |
|---|---|---|
| 级别统计 | ERROR/WARN/INFO/DEBUG/FATAL 数量 | 计数 + 占比（条形图渲染） |
| 时间线 | 按分钟聚合事件数 | 时间轴数据（仅在有时间戳时生效） |
| 异常聚类 | 相似堆栈去重，按异常类型 + 消息哈希分组 | 去重后异常列表 + 每组出现次数 |
| 关键词 | 提取 ERROR/FATAL 行的高频关键词 | Top 20 关键词 |
| TraceId | 提取 traceId/trace_id/traceid 字段 | 去重 ID 列表 + 每个 ID 关联的日志行数 |
| RequestId | 提取 requestid/request_id 字段 | 同上 |
| IP | 正则提取 IPv4/IPv6 地址 | 去重 IP 列表 + 每个 IP 出现次数 |
| 接口聚合 | 识别日志中 URL/路径，按路径聚合异常 | 路径 → 异常类型 → 出现次数 |
| 上下文定位 | 点击某异常/ID → 展示前后 N 行上下文 | 原始日志切片 |

**输出类型**（结构化，非纯字符串）:
```typescript
interface LogAnalysisResult {
  totalLines: number
  levelStats: { level: string; count: number; pct: number }[]
  timeline: { ts: string; count: number }[]
  exceptions: { type: string; message: string; count: number; sampleLine: number; stackHash: string }[]
  keywords: { word: string; count: number }[]
  traceIds: { id: string; lineCount: number }[]
  requestIds: { id: string; lineCount: number }[]
  ips: { ip: string; count: number }[]
  endpoints: { path: string; errors: { type: string; count: number }[] }[]
}
```

**日志格式识别**（渐进式，与 json-parser 的 parseProgressive 思路一致）:
1. 标准 Java logback: `[2026-08-29 14:30:00] [ERROR] [thread-name] [traceId] ...`
2. 带时间戳的通用格式: `[2026-08-29T14:30:00Z] ERROR ...`
3. 无时间戳的简单格式: `ERROR: message`
4. 按行分析，每行独立提取（不依赖全局结构）

**文件结构**:
```
src/renderer/src/tools/log-analyzer/
├── icon.tsx
├── index.tsx          # FileDrop + 粘贴 textarea + 分析结果多面板
├── transform.ts       # analyzeLog(rawText): ToolResult<LogAnalysisResult>
├── types.ts
└── components/
    ├── StatsPanel.tsx      # 级别统计面板
    ├── TimelinePanel.tsx   # 时间线面板
    ├── ExceptionPanel.tsx  # 异常聚类面板
    ├── ContextPanel.tsx    # 上下文定位面板
    └── IdPanel.tsx         # TraceId/RequestId/IP 面板
```

**边界**:空文件 → invalid-input；超大文件（>50MB）→ 警告并截断前 50MB 分析（不静默失败）；无时间戳日志 → 时间线面板显示"无时间戳，已跳过"

---

## Change 3：配置生成组（tools 19/20/22）

### Tool 19：Docker 全家桶

**交互风格**:按钮触发（local）。多 tab 页面，每个 tab 是一个子生成器。

**Tab 设计**:

| Tab | 输入 | 输出 |
|---|---|---|
| Docker 运行 | 命令选项（image、port、volume、env、restart、network） | `docker run ...` 命令字符串 |
| Docker Compose | 服务名、image、port、volume、env、depends_on | `docker-compose.yml` YAML 字符串 |
| Dockerfile | base image、工作目录、复制文件、安装命令、暴露端口、启动命令 | `Dockerfile` 内容 |
| Docker 命令速查 | 搜索/分类浏览（类似 linux-manual） | 命令说明 + 示例 |
| 镜像名解析 | 粘贴镜像全名 | registry / namespace / repo / tag 拆解 |
| 注册表 URL | 粘贴 registry URL | scheme / host / port / path 拆解 |

**生成器逻辑**:全部模板字符串拼接（无外部依赖）。Dockerfile 和 Compose 遵循最佳实践默认值（multi-stage、.dockerignore 提示）。

**文件结构**:
```
src/renderer/src/tools/docker-tools/
├── icon.tsx
├── index.tsx          # 多 tab 容器
├── transform.ts       # generateRun / generateCompose / generateDockerfile / parseImageName / parseRegistryUrl
├── types.ts
├── components/
│   ├── RunTab.tsx
│   ├── ComposeTab.tsx
│   ├── DockerfileTab.tsx
│   ├── CheatSheetTab.tsx
│   ├── ImageParseTab.tsx
│   └── RegistryParseTab.tsx
└── data/
    └── commands.ts    # Docker 命令速查数据
```

---

### Tool 20：nginx 配置生成器

**交互风格**:按钮触发（local）。表单页面，勾选需要的功能。

**功能开关**:
- 基础：server_name / listen port / root
- 反向代理：proxy_pass 地址 / WebSocket 支持
- SSL：证书路径 / 强制 HTTPS / HSTS
- 缓存：静态文件缓存 / expires 时间
- 压缩：gzip on/off / 类型列表
- 安全：X-Frame-Options / Content-Security-Policy / 隐藏 Server 头
- 负载均衡：upstream 列表 / 策略（轮询/最少连接/IP hash）

**输出**:格式化的 `nginx.conf` 字符串（带注释说明每段用途）

**文件结构**: `tools/nginx-generator/{icon.tsx, index.tsx, transform.ts, types.ts}`

---

### Tool 22：JVM 参数生成器

**交互风格**:按钮触发（local）。表单页面。

**参数分类（侧栏选择）**:
- 堆内存：`-Xms` / `-Xmx` / `-Xmn` / `-XX:MetaspaceSize`
- GC 策略：G1 / ZGC / Shenandoah / CMS（每种选中后展开对应参数）
- 调试：`-XX:+HeapDumpOnOutOfMemoryError` / `-XX:HeapDumpPath` / 远程调试端口
- 性能监控：`-XX:+PrintGCDetails` / JMX 端口 / Flight Recorder
- 容器感知：`-XX:+UseContainerSupport` / `-XX:MaxRAMPercentage`
- 自定义：手动输入额外参数（逐行）

**输出**:完整 JVM 启动参数字符串（带换行 + 行注释说明每行作用）

**文件结构**: `tools/jvm-params/{icon.tsx, index.tsx, transform.ts, types.ts}`

---

## 执行批次（SDD 任务划分）

### Change 1：密码加密组（tools 15/16/18）
1. 安装依赖 `bcryptjs` + `jose`
2. `password-strength` transform + golden 测试
3. `password-strength` 页面 + 注册
4. `jwt-tool` transform（parse/verify/sign） + golden 测试
5. `jwt-tool` 页面 + 注册
6. `password-generator` transform（generate/encrypt/hash） + golden 测试
7. `password-generator` 三面板页面 + 注册
8. 全量回归 + typecheck + lint

### Change 2：数据文本组（tools 14/17/21）
9. 安装依赖 `diff`（jsdiff）
10. `base-converter` transform + golden 测试 + 页面 + 注册
11. `text-diff` transform + golden 测试 + 页面 + 注册
12. `log-analyzer` transform（level stats / exception clustering / id extraction）
13. `log-analyzer` 多面板页面 + FileDrop + 注册
14. 全量回归 + typecheck + lint

### Change 3：配置生成组（tools 19/20/22）
15. `docker-tools` transform（run/compose/dockerfile/parse） + golden 测试
16. `docker-tools` 多 tab 页面 + 注册
17. `nginx-generator` transform + golden 测试 + 页面 + 注册
18. `jvm-params` transform + golden 测试 + 页面 + 注册
19. 全量回归 + typecheck + lint

## 测试策略

- **Golden 测试（必须）**:每个工具的 transform 函数至少 5 个输入/输出断言用例
- **边界测试（必须）**:空输入、非法格式、超长输入
- **结构守门**:工具 19 Docker 命令速查数据 ≥50 条（linux-manual 先例）
- **不测 UI 渲染**:工具页面只做手动目验（`pnpm dev`），golden 测试覆盖纯函数层

## 里程碑

1. Change 1 完成 → `pnpm dev:web` 手测 3 个密码工具（BCrypt 默认、JWT 解析、强度分析）
2. Change 2 完成 → 手测文本对比、进制转换、上传日志文件分析
3. Change 3 完成 → 手测 Docker Compose 生成、nginx 配置生成、JVM 参数生成
4. 全量 → `pnpm test` 全绿；`pnpm build:web` 成功

---

## Self-Review

1. 无占位符；9 工具各有具体类型定义、文件结构、交互风格、边界说明。
2. 一致性：沿用 id-generator / useLiveTransform / useMultiFieldTransform 三种集成模式；三态错误处理。
3. 范围：日志分析是唯一大工具（多面板 + FileDrop + 聚类算法），其余均为模板/表单类简单工具。
4. 歧义已消：BCrypt 用 bcryptjs（纯 JS）；JWT 用 jose（浏览器原生）；日志格式渐进识别；Docker 子工具用 tab 而非独立工具。
