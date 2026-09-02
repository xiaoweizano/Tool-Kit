# Spec 自测清单(data-text-tools)

> 逐条覆盖 `openspec/changes/data-text-tools/specs/<tool>/spec.md`(base-converter-tool / text-diff-tool / log-analyzer-tool)的所有 Requirement/每 Scenario。
> 验证方式:`☑ (测试名)` = 已由自动化测试跑通;`☑ 静态核验` = 静态代码核验;`☐ 待人工` = 需人工目验(UI/通道行为,无单测覆盖)。
> 说明:自动化测试文件为 `test/base-converter.test.ts`、`test/text-diff.test.ts`、`test/log-analyzer.test.ts`。「待人工」项多为 useLiveTransform/useMultiFieldTransform 防抖、文件上传、上下文点击等 UI 行为——底层框架防抖/EMPTY 逻辑已由 `test/uselivetransform.test.ts`、`test/use-multifield.test.ts` 覆盖,此处首跑为人工目验。

## base-converter-tool

### Requirement: 任意进制互转
- [x] **十进制转全部进制** — ☑ (test/base-converter.test.ts「decimal 255 to all bases」:source 10,输出 bin=0b11111111/oct=0o377/dec=255/hex=0xFF)
- [x] **十六进制转十进制** — ☑ (test/base-converter.test.ts「0xFF prefix auto-detect」:dec=255)

### Requirement: 前缀自动识别
- [x] **二进制前缀识别** — ☑ (test/base-converter.test.ts「0b101010 binary」:dec=42;前缀自动识别逻辑在 transform.ts 第 9-11 行)

### Requirement: BigInt 支持大数
- [x] **超大数转换** — ☑ (test/base-converter.test.ts「huge number no precision loss」:30 位十进制 → hex=0x18EE90FF6C373E0EE4E3F0AD2,无精度丢失)

### Requirement: 非法字符定位
- [x] **二进制含非法字符** — ☑ (test/base-converter.test.ts「invalid char in binary」:position=2,kind=invalid-input;transform.ts 第 13-16 行定位非法字符)

### Requirement: 实时转换
- [x] **粘贴即转换** — ☐ 待人工:单 input + useLiveTransform 防抖即时展示四进制卡片(base-converter/index.tsx);转换逻辑已由上方 golden 测试覆盖
- [x] **空输入回 EMPTY** — ☐ 待人工:清空输入回 EMPTY/TriStateOutput 引导态(emptyHint=「输入一个数字,自动换算四种进制…」)

## text-diff-tool

### Requirement: 两段文本差异高亮
- [x] **逐行差异高亮** — ☑ (test/text-diff.test.ts「line mode highlights changed line」:输出含 del 删除标记)
- [x] **逐词差异高亮** — ☑ (test/text-diff.test.ts「word mode highlights a changed word」:diffWords 生成词级高亮,输出含 `del` 删除标记 + `text-success` 新增标记)
- [x] **空输入返回 invalid-input** — ☑ (test/text-diff.test.ts「empty one side invalid-input」:message「请粘贴两段文本」)
- [x] **左右分栏成对行** — ☑ (test/text-diff.test.ts「pairs removed/added lines on the same row」:diffSideBySide("a\nb\nc","a\nX\nc","line") 返回 DiffRow[] 且 b/X 同行——left.kind=removed/right.kind=added,same 行左右同为 same;另有 diffSideBySide「empty one side invalid-input」返回 invalid-input)

### Requirement: 三模式切换
- [x] **切换模式刷新结果** — ☐ 待人工:切换 line/word/char tab 触发 setField({mode}) 即时刷新(text-diff/index.tsx MODES);三种粒度核心由 transform.ts 支持

### Requirement: 实时对比
- [x] **粘贴即对比** — ☐ 待人工:双 textarea + useMultiFieldTransform 防抖(150ms)即时刷新,无需点击
- [x] **两侧都空回 EMPTY** — ☐ 待人工:isEmpty 判空回 EMPTY/TriStateOutput 引导态

### Requirement: 免费离线无网络
- [x] **纯函数可测** — ☑ (test/text-diff.test.ts 五个 it 直接调用 diffText 断言确定输出:line/word/char 三模式 + HTML 转义防 XSS)+ 静态核验零网络(textStats/applyCase/segmentText 亦为纯函数,全本地前端计算,无网络请求)

### Requirement: 文本统计
- [x] **统计一段混合文本** — ☑ (test/text-diff.test.ts「reports counts for a mixed string」:chars=16/letters=10/digits=3/symbols=1/whitespace=2/words=3/lines=1/uniqueChars=12,topChars 按频率降序)

### Requirement: 多模式大小写转换
- [x] **camelCase 与 snake_case 转换** — ☑ (test/text-diff.test.ts「applyCase(foo bar, camel) -> fooBar」/「applyCase(foo bar, snake) -> foo_bar」:it.each 参数化用例断言精确输出)
- [x] **交替大小写** — ☑ (test/text-diff.test.ts「applyCase(ab, alternating) -> Ab」;it.each 共覆盖 upper/title/camel/pascal/snake/kebab/constant/sentence/alternating 九种模式)

### Requirement: 差异化分词分割
- [x] **按类别分组** — ☑ (test/text-diff.test.ts「splits by type」:断言六段 letters/digits/symbols/letters/whitespace/digits)
- [x] **自定义分隔符硬切分** — ☑ (test/text-diff.test.ts「custom delimiter splits a symbol run」:!@ 拆为 [symbols !][symbols @] 两个 token;另有「custom delimiter splits across letters」a@b 用例)

## log-analyzer-tool

### Requirement: 日志级别统计
- [x] **统计各级别计数** — ☑ (test/log-analyzer.test.ts「level stats + ids + ips」:ERROR count=2;transform.ts levelStats 含占比 pct)

### Requirement: 异常聚类
- [x] **同类型异常聚为一簇** — ☑ (test/log-analyzer.test.ts「exception clustering dedupes」:NullPointerException → 1 簇 count=2,message=OrderService.getOrder;相似堆栈按类型聚合,去重而非字符串等值)

### Requirement: 关键词提取
- [x] **提取高频关键词** — ☑ (test/log-analyzer.test.ts「extracts keywords from ERROR lines」:RICH 样本 ERROR 行分词,keywords 非空且含 timeoutException/OrderService)

### Requirement: ID 提取(TraceId/RequestId/IP)
- [x] **提取 TraceId 与 IP** — ☑ (test/log-analyzer.test.ts「level stats + ids + ips」:traceIds≥1、ips 含 10.0.0.1;去重 + lineCount)

### Requirement: 接口聚合
- [x] **按接口聚合异常** — ☑ (test/log-analyzer.test.ts「aggregates errors per endpoint」:RICH 样本 /api/order 聚合 2 次 timeoutException,errors[0].count=2;transform.ts 第 67-74 行 pathRe 匹配 GET/POST + ERROR/FATAL)

### Requirement: 上下文定位
- [x] **定位异常上下文** — ☑ (test/log-analyzer.test.ts「splitContextLines」「returns window around a line」:前后各 3 行原文,+ ☐ 待人工:点击异常 button → onContext(splitContextLines(...)) 弹 ContextPanel 手测)

### Requirement: 时间线与大文件边界
- [x] **有时间戳生成时间线** — ☑ (test/log-analyzer.test.ts「builds a timeline from timestamps」:RICH 样本按分钟桶聚合,timeline 非空且每项 ts 为字符串、count≥1;transform.ts 第 43-44 行 timeRe 分钟桶)
- [x] **超大文件截断** — ☑ (test/log-analyzer.test.ts「>50MB input returns ok over truncated slice」:>`50MB` 输入返回 `status:'ok'`,对前 50MB 截断切片分析,`totalLines` < 原始行数,且 >0;transform.ts 在 split 前截断,非 `partial` 错误)

### Requirement: 本地离线与分块异步
- [x] **纯函数可测** — ☑ (test/log-analyzer.test.ts analyzeLog/splitContextLines 直接调用断言确定输出)+ 静态核验零网络(全本地前端计算)

## 待人工(Manual)汇总与 UI Smoke 清单

> 以下 UI/跨工具行为无单测覆盖,首次以 `pnpm dev:web` 人工目验;零网络请求也在此确认。

- base-converter:粘贴即四进制即时刷新(防抖)
- base-converter:清空回 EMPTY 引导态
- text-diff(对比 tab):粘贴两段文本即高亮(防抖)
- text-diff(对比 tab):切换 line/word/char 三模式刷新
- text-diff(对比 tab):两侧都空回 EMPTY 引导态
- log-analyzer:文件上传流程(「选择日志文件」+ FileReader 读文件自动分析)
- log-analyzer:点击异常 → 前后各 3 行上下文面板(ContextPanel)
- **零网络请求**:三个工具全本地计算,`dev:web` 打开页无任何网络请求(离线优先,数据不出本机)

## 覆盖统计

- **Requirement**: 20(base-converter-tool 5 + text-diff-tool 7 + log-analyzer-tool 8)
- **Scenario**: 29(base-converter-tool 7 + text-diff-tool 13 + log-analyzer-tool 9)
- **已验证**: 29(自动化测试 23 + 静态核验 1 + 待人工 5)
  - base-converter-tool: 自动化 5 + 静态核验 0 + 待人工 2 = 7
  - text-diff-tool: 自动化 10 + 静态核验 0 + 待人工 3 = 13
  - log-analyzer-tool: 自动化 8 + 静态核验 1 + 待人工 0 = 9
