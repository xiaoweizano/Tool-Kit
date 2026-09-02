# Tasks: data-text-tools

## 1. 依赖与类型层

- [x] 1.1 安装 `diff`(jsdiff)
- [x] 1.2 `base-converter/types.ts`:`BaseConvResult`(bin/oct/dec/hex)
- [x] 1.3 `text-diff/types.ts`:`DiffMode`('line'|'word'|'char')
- [x] 1.4 `log-analyzer/types.ts`:`LogAnalysisResult`(totalLines/levelStats/timeline/exceptions/keywords/traceIds/requestIds/ips/endpoints)、`LevelStat`、`ExceptionCluster`、`EndpointAgg`

## 2. base-converter 纯函数层

- [x] 2.1 `convertBase(str, opts): ToolResult<BaseConvResult>`:前缀识别(0x/0b/0o)与剥离,无前缀用 opts.source;BigInt 转换;四种进制输出
- [x] 2.2 非法字符检测:按源进制校验字符集,非法→invalid-input+position

## 3. text-diff 纯函数层

- [x] 3.1 `diffText(textA, textB, mode): ToolResult<string>`:jsdiff diffLines/diffWords/diffChars→HTML 高亮(新增绿/删除红),差异文本经 HTML 转义防 XSS

## 4. log-analyzer 纯函数层

- [x] 4.1 日志格式识别(渐进式):logback 方括号/带时间戳/`LEVEL:` 简单格式;按行独立提取
- [x] 4.2 `analyzeLog(rawText): ToolResult<LogAnalysisResult>`:级别统计+时间线+关键词 Top20
- [x] 4.3 异常聚类:堆栈指纹(类型+首帧+消息)去重,同簇聚合+示例行号
- [x] 4.4 ID/IP 提取:traceId/requestId 变体正则 + IPv4(可选 IPv6);接口聚合(URL/路径→异常→计数)
- [x] 4.5 分块异步处理:主线程分块循环让出,超 50MB 截断返回 partial,空文件 invalid-input

## 5. Worker 注册与工具注册

- [x] 5.1 `transform.worker.ts`:注册 `base-converter`(useLiveTransform)与 `text-diff`(useMultiFieldTransform,opts.mode);log-analyzer 走 local 不注册 worker
- [x] 5.2 `register.ts`:新增三行 ToolDescriptor(base-converter/text-diff/log-analyzer)+ lazy import

## 6. 页面组件

- [x] 6.1 `base-converter/index.tsx`:useLiveTransform,四进制卡片展示 + CopyButton
- [x] 6.2 `text-diff/index.tsx`:useMultiFieldTransform 双 textarea + 三模式 tab + 高亮结果(`dangerouslySetInnerHTML`)
- [x] 6.3 `log-analyzer/index.tsx`:FileDrop + 粘贴 textarea + 分析按钮;九维多面板(StatsPanel/TimelinePanel/ExceptionPanel/IdPanel/ContextPanel)
- [x] 6.4 图标 + 中文文案遵循 DESIGN.md

## 7. 测试(golden)

- [x] 7.1 `test/base-converter.test.ts`:十→二/八/十六、前缀识别、BigInt 大数、非法字符定位
- [x] 7.2 `test/text-diff.test.ts`:行/词/字符差异、空输入、HTML 转义(无 XSS)
- [x] 7.3 `test/log-analyzer.test.ts`:级别统计、异常聚类去重、关键词、ids/ips、接口聚合、时间线、>50MB partial(用小样本构造)
- [x] 7.4 边界:空输入、非法格式、超长输入
- [x] 7.5 `pnpm test` 全量回归保持绿

## 8. 收尾验证

- [x] 8.1 `pnpm typecheck` 通过
- [x] 8.2 `pnpm lint` 通过
- [x] 8.3 `pnpm test` 全绿
- [x] 8.4 spec-checklist(data-text-tools)逐条核对 Scenario 通过
- [x] 8.5 `openspec validate data-text-tools` 通过
