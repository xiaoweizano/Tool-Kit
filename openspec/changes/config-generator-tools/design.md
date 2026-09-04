# Design: config-generator-tools

> 继承 AI 设计交付物:`docs/superpowers/specs/2026-09-01-tools-14to22-design.md`。
> 本文档为 OpenSpec 落地设计,聚焦架构与边界。

## 架构总览

三个工具均**按钮触发(local, id-generator 先例)**,页面表单 → 纯函数生成字符串 → 展示/复制。不注册 worker。

```
┌─ docker-tools (local, 6 tab) ───────────────────────────────┐
│  表单 → generateRun/generateCompose/generateDockerfile/      │
│        parseImageName/parseRegistryUrl / 命令速查数据         │
└──────────────────────────────────────────────────────────────┘
┌─ nginx-generator (local, 表单) ─────────────────────────────┐
│  功能开关 → generateNginxConfig(servers/ssl/proxy/cache/… )  │
└──────────────────────────────────────────────────────────────┘
┌─ jvm-params (local, 表单) ──────────────────────────────────┐
│  分类选项 → generateJvmParams(heap/gc/debug/monitor/custom)  │
└──────────────────────────────────────────────────────────────┘
```

## 关键设计决策

### 1. 全部纯模板,零依赖
三个工具均为「表单 state → 模板字符串拼接」的纯函数。`transform.ts` 导出纯函数,返回 `ToolResult<string>`。无任何外部库。

### 2. docker-tools 多 tab 结构
一个工具承载全部 Docker 生成能力(用户裁决:一个 Docker 工具而非拆分):
| tab | 函数 | 输入 | 输出 |
|---|---|---|---|
| Run | generateRun | image/name/ports/volumes/env/restart/network | `docker run ...` |
| Compose | generateCompose | services(名称/image/port/vol/env/depends_on) | docker-compose.yml |
| Dockerfile | generateDockerfile | base/workdir/copy/run/port/entrypoint | Dockerfile |
| 命令速查 | data/commands.ts | 搜索/分类 | 命令说明+示例 |
| 镜像名解析 | parseImageName | 镜像全名 | registry/namespace/repo/tag |
| 注册表解析 | parseRegistryUrl | registry URL | scheme/host/port/path |

Dockerfile 遵循 multi-stage 最佳实践;Compose 版本用 `3.8`。每 tab 的 transform 独立纯函数,不耦合。

### 3. nginx-generator 功能开关
`generateNginxConfig(options)` 按勾选项生成 conf 片段组合:
- server_name/listen/root
- proxy_pass + WebSocket(proxy_set_header upgrade/connection)
- SSL(cert/redirect/HSTS)
- 静态缓存(expires/缓存规则)
- gzip(on/off/类型)
- 安全头(X-Frame-Options/CSP/server_tokens off)
- upstream(server 列表+策略轮询/least_conn/ip_hash)

输出带注释说明每段用途;非法输入(server 列表空但勾了 upstream)→ invalid-input。

### 4. jvm-params 分类生成
`generateJvmParams(options)` 按分类输出参数行(每行 `-XX:...` + `# 注释`):
- 堆内存:-Xms/-Xmx/-Xmn/-XX:MetaspaceSize
- GC:G1(默认)/ZGC/Shenandoah + 对应调优参数
- 调试:HeapDumpOnOutOfMemoryError/HeapDumpPath/远程调试
- 监控:PrintGCDetails/JMX/FlightRecorder
- 容器感知:UseContainerSupport/MaxRAMPercentage
- 自定义:逐行额外参数

## 数据流与错误三态

| 工具 | Happy | Nil/Empty | Error |
|---|---|---|---|
| docker-tools | 表单→配置 | 缺必填(image)→invalid-input | 非法格式(镜像名/URL)→invalid-input |
| nginx-generator | 勾选→conf | 无 server_name→invalid-input | upstream 空列表→invalid-input |
| jvm-params | 选项→参数 | 无任何选项→EMPTY 引导 | 无 |

## 边界与约束

- **离线优先**:全本地,零网络。
- **架构一致**:复用 ToolDescriptor + CopyButton;均按钮触发不经 Worker。
- **中文 UI**,遵循 DESIGN.md 电路工作台风格。
- **输出可复制**到终端/文件使用。

## 不做的事(NOT in scope)

- 配置模板库保存/复用——v2
- 导出 .yml/.conf 文件下载(展示+复制够用)——v2
- 多服务 Compose 编排向导——v2
- nginx 直接校验(未装 nginx,不做语法执行)——v2
