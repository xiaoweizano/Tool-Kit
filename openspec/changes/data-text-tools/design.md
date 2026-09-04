# Design: data-text-tools

> 继承 AI 设计交付物:`docs/superpowers/specs/2026-09-01-tools-14to22-design.md`。
> 本文档为 OpenSpec 落地设计,聚焦架构与边界。

## 架构总览

```
┌─ text-diff (worker: useMultiFieldTransform) ─────────────────┐
│  {textA,textB} ──▶ diffLines/Words/Chars ──▶ HTML 差异高亮    │
└──────────────────────────────────────────────────────────────┘
┌─ base-converter (worker: useLiveTransform + opts) ───────────┐
│  数字串 ──▶ convertBase(str, {source}) ──▶ {bin,oct,dec,hex}   │
└──────────────────────────────────────────────────────────────┘
┌─ log-analyzer (local: FileDrop + 按钮触发) ──────────────────┐
│  日志文本 ──▶ analyzeLog(raw) ──▶ LogAnalysisResult (9 维)     │
│  分块异步处理, 主线程不阻塞                                    │
└──────────────────────────────────────────────────────────────┘
```

## 关键设计决策

### 1. text-diff 用 jsdiff + HTML 输出
- 直接使用 `diff`(jsdiff)的 `diffLines` / `diffWords` / `diffChars`。
- 输出 HTML 字符串(内联样式:新增绿底、删除红底),由页面 `dangerouslySetInnerHTML` 渲染(仅工具自产 HTML,无用户注入风险;差异文本经 HTML 转义,避免 XSS)。
- 集成:useMultiFieldTransform(`{textA,textB}`),opts.mode 区分 line/word/char,防抖实时刷新。
- 空输入:textA/textB 都空 → EMPTY;一侧空 → invalid-input。

### 2. base-converter 纯逻辑 + BigInt
- `convertBase(str, {source})`:输入字符串;识别 `0x`/`0b`/`0o` 前缀自动定源进制并剥离;无前缀用 opts.source(默认 10)。
- 用 `BigInt` 承载任意长度整数;输出全部四种进制(`0b/bin`、`0o/oct`、`dec`、`0x/hex` 大写)。
- 非法字符(如二进制里的 "2")→ invalid-input,定位非法字符位置。
- 集成:useLiveTransform,粘贴即输出全部四进制。

### 3. log-analyzer 分块异步处理(主线程)
- FileDrop 读文件(FileReader)或 textarea 粘贴;文本送入 `analyzeLog(raw)`。
- 分析在**分块异步循环**中进行(每次处理固定行数后 `await` 让出主线程,`requestIdleCallback` 风格),避免大文件卡 UI。
- 50MB 上限:超出截断并返回 `partial`(message 指明截断)。空文件 → invalid-input。
- 日志格式**渐进式识别**(json-parser 的 parseProgressive 思路):先认 logback 方括号格式,再认带时间戳通用格式,再认 `LEVEL:` 简单格式,最后按行提取(不依赖全局结构)。
- 异常聚类:用「异常类型 + 堆栈首帧 + 消息指纹」哈希做聚类键,同簇聚合并计数,不靠字符串等值。

### 4. 分析模块输出（structured，非纯字符串）
`analyzeLog` 返回 `LogAnalysisResult`(9 维结构化对象),页面多面板渲染(StatsPanel/TimelinePanel/ExceptionPanel/IdPanel/ContextPanel)。非纯字符串输出,故不经 TriStateOutput,页面自绘。

### 5. TraceId/RequestId/IP 提取
正则提取:TraceId(`traceId`/`trace_id`/`traceid` 字段后值)、RequestId(`requestId`/`request_id`/`reqid`)、IP(IPv4 + 可选 IPv6)。每个 ID 记录出现行数与行号,可点击定位上下文。

## 数据流与错误三态

| 工具 | Happy | Nil/Empty | Error |
|---|---|---|---|
| text-diff | 两段文本→高亮 | 一侧空→invalid-input | 通道异常→engine |
| base-converter | 数字→四进制 | 空→EMPTY | 非法字符→invalid-input+position |
| log-analyzer | 日志→9 维报告 | 空文件→invalid-input | >50MB→partial(截断) |

## 边界与约束

- **离线优先**:全本地,零网络。
- **架构一致**:复用 ToolDescriptor + Worker 通道 + TriStateOutput(文本对比/进制转换)+ CopyButton。
- **中文 UI**,遵循 DESIGN.md 电路工作台风格。
- **日志分析经 HTML 转义**:拼接前转义,无 XSS。

## 不做的事(NOT in scope)

- 日志分析迁移 worker 处理超大文件(>50MB 主线程分块够用;不够再迁)
- 日志格式自定义正则配置(内置格式识别够用)——v2
- 导出分析报告(JSON/PDF)——v2
- 文本对比三方合并(merge 三方 diff)——v2
