<p align="center">
  <img src="assets/icon.svg" alt="ToolKit 图标" width="84" height="84" />
</p>

<h1 align="center">ToolKit</h1>

<p align="center">
  <em>本地优先的中文开发者工具箱<br/>
  一套代码，双输出:Electron 桌面 + 静态 Web。</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-38BDF8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/daisyUI-5-5A0FC8" alt="daisyUI" />
  <img src="https://img.shields.io/badge/license-MIT-success" alt="MIT" />
  <img src="https://img.shields.io/badge/platform-Win%20%7C%20macOS-lightgrey" alt="平台" />
</p>

> **The Circuit Workbench** —— 一块带电的开发者工作台。21 个高频开发苦力活挂在同一条线路上,电流流过即点亮:粘贴即出、复制即用。

**ToolKit** 把日常开发里反复出现的「苦力活」集中到一处——拼批量 SQL、解析日志里复制的 JSON、时间戳互转、md↔Word、查 Linux 命令。流程始终如一:**从日志/控制台复制 → 粘贴 → 即时结果 → 一键复制回 IDE/终端**。所有工具纯前端本地运算、本地优先,没有服务器到期这回事,也不用注册登录。

**English:** [README.md](README.md)

## ✨ 特性

- **粘贴即出结果** —— 输入到结果之间不设「转换」按钮,自动识别 + 即时转换(防抖 ≤ 200ms)。
- **离线完整** —— 全部工具纯前端本地运算;即使在线版服务器到期,桌面版照样完整可用。
- **一套代码,双输出** —— `src/renderer` 环境无关;同一套代码 → Electron 桌面(产品本体)+ 静态 Web(在线过渡形态)。
- **注册表驱动,21 个工具** —— 加工具 = 加一个目录 + `register.ts` 一行 + `transform.worker.ts` 一行。
- **无静默失败** —— 每个错误都被看见并定位(OK / ERROR / EMPTY 三态)。
- **多主题** —— daisyUI 主题系统:深色工作台 / 纸白 / 焦糖,支持自定义。

## 🧰 工具清单(21)

### 数据与格式
| 工具 | 图标 | 说明 |
|---|---|---|
| [JSON 解析](src/renderer/src/tools/json-parser) | 🗂 | 解析/格式化 JSON,容错日志转义与双重编码 |
| [时间戳互转](src/renderer/src/tools/date-converter) | 🕒 | Unix 时间戳 ↔ 日期,自动识别秒/毫秒/微秒/纳秒 |
| [进制转换](src/renderer/src/tools/base-converter) | 🔢 | 二/八/十/十六进制互转,带前缀自动识别 |
| [文本处理](src/renderer/src/tools/text-diff) | 📝 | 文本对比与差异 |

### 查询与 SQL
| 工具 | 图标 | 说明 |
|---|---|---|
| [SQL 占位符](src/renderer/src/tools/sql-placeholder) | 🧩 | SQL 在 `?` 占位符与 `:命名` 参数之间互转 |
| [租户 SQL 组装](src/renderer/src/tools/sql-builder) | 🏗 | 拼装多租户 SQL |
| [测试数据生成](src/renderer/src/tools/testdata-gen) | 🎲 | 随机测试数据 |
| [ES 查询构造](src/renderer/src/tools/es-query-builder) | 🔍 | 构造 Elasticsearch 查询 DSL,支持粘贴回填解析 |
| [正则生成/测试](src/renderer/src/tools/regex-generator) | 🧠 | 生成并测试正则 |

### 文档与导出
| 工具 | 图标 | 说明 |
|---|---|---|
| [Markdown↔Word](src/renderer/src/tools/md-word) | 📄 | Markdown 与 Word 互转 |
| [Excel↔Markdown](src/renderer/src/tools/excel-md) | 📊 | Excel 与 Markdown 互转 |

### 安全与加密
| 工具 | 图标 | 说明 |
|---|---|---|
| [密码工具](src/renderer/src/tools/password-tools) | 🔐 | 密码生成、强度分析、AES/RSA、bcrypt |
| [JWT 解析](src/renderer/src/tools/jwt-tool) | 🪪 | 解析/校验/签名/续期 JWT(HS/RS/ES/PS) |
| [ID 生成](src/renderer/src/tools/id-generator) | 🆔 | UUID / snowflake 等 ID 生成器 |

### 配置与基础设施
| 工具 | 图标 | 说明 |
|---|---|---|
| [Docker 生成](src/renderer/src/tools/docker-tools) | 🐳 | 生成 `docker run`、`docker-compose`、`Dockerfile` |
| [nginx 配置](src/renderer/src/tools/nginx-generator) | ⚙️ | 多 server 的 nginx 配置,含 SSL/代理/upstream/location |
| [JVM 参数](src/renderer/src/tools/jvm-params) | ☕ | 生成调优过的 JVM 参数(预设 + 复选框) |
| [Linux 命令大全](src/renderer/src/tools/linux-manual) | 🐧 | 可搜索的常见 Linux 命令 |

### 开发工具
| 工具 | 图标 | 说明 |
|---|---|---|
| [批处理值转换](src/renderer/src/tools/batch-transform) | 🔁 | 批量值转换/重编码 |
| [翻译](src/renderer/src/tools/translate) | 🌐 | 翻译(联网增强,默认关闭) |
| [日志分析](src/renderer/src/tools/log-analyzer) | 📈 | 日志错误率分析与时间线 |

## 🚀 快速开始

```bash
pnpm install
pnpm dev:web      # 仅浏览器(最快)
pnpm dev          # Electron 桌面壳 + HMR
```

测试、类型检查与构建:

```bash
pnpm test         # Vitest(golden-file 转换测试)
pnpm typecheck    # tsc --noEmit
pnpm build:web    # 静态产物 → dist/web
pnpm build:desktop  # Win nsis / Mac dmg(未签名;见「首次运行」)
```

## 🏗 架构:一套代码,双输出

```
┌──────────── src/renderer(环境无关,不引 Electron)────────────────────┐
│ app 壳 · 首页总览 · 设置 · 工具页(注册表驱动) · core                 │
│   (类型/存储/Web Worker 转换)                                        │
└──────────────────────────┬──────────────────────────────┬────────────┘
                    vite 静态构建                  electron-vite + Electron 壳
             ┌───────────▼──────────▐        ┌───────────▼──────────▐
             │ GitHub Pages / 静态服  │        │  Win nsis · Mac dmg    │
             │ 在线版(过渡)          │        │  桌面版(本体)          │
             └────────────────────────┘        └────────────────────────┘
```

工具本质是一个纯函数:输入字符串 → `ToolResult`。跑在 Web Worker 里,重型转换不阻塞 UI;golden-file 测试锁定转换保真。加一个 = `src/tools/<id>/` + `register.ts` 一行 + `transform.worker.ts` 一行。

## ☁️ 部署静态在线版

在线版是纯静态产物(`dist/web`)——HashRouter + 相对路径,任意静态服务器零回退配置。

```bash
# 本机构建(或 CI 构建后上传 dist/web)
pnpm build:web

# 上传 dist/web 与 deploy/ 到服务器后:
cd deploy && docker compose up -d
# 访问 http://<服务器IP>:8080
```

`deploy/docker-compose.yml` 用 `nginx:alpine` 只读挂载 `../dist/web`(gzip、assets 长缓存、入口 no-cache)。更新版本 = 重新 `pnpm build:web` → 覆盖 `dist/web` → `docker compose restart`。与 GitHub Pages 并存不冲突:Pages 是免费到期的长期镜像,自有服务器是过渡期的自控部署。

## 首次运行(未签名阶段)

- **Windows**:SmartScreen 可能拦截安装包 → 点「更多信息」→「仍要运行」。
- **macOS**:dmg 安装后首次打开若被 Gatekeeper 拦截 → 在「访达」中对 ToolKit **右键→打开**→再点「打开」(Apple Silicon 已含 ad-hoc 签名)。

## 📄 许可

[MIT](LICENSE) © 2026 xiaoweizano
