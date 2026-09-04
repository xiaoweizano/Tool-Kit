# Proposal: data-text-tools

## Why

ToolKit 已覆盖 13 个本地优先工具,但缺少三类**文本/数据**高频场景:对比两段文本/代码差异、进制快速互转、分析生产日志。开发者每天都在做:合并代码前 diff、把 `0x1A` 或 `101010` 换成十进制、打开几十 MB 的日志找 ERROR 和异常堆栈。现状是散布在 IDE diff、各大在线进制站、Kibana/grep 手动翻日志,既不集中也无法一键复制结果。

本 change 收拢三个工具,全部本地纯前端、粘贴即出,与 ToolKit 现有体验一致。

## What Changes

新增 3 个工具,完全遵循现有 ToolDescriptor + Worker/纯函数模式,无后端:

- **文本对比**(tool 14):粘贴两段文本,高亮差异(新增绿/删除红/未变灰)。line/word/char 三种 diff 模式。
- **进制转换**(tool 17):2/8/10/16 任意互转,一条输入输出全部四种进制。支持 `0x`/`0b` 前缀自动识别源进制;BigInt 支持超大数。
- **日志分析工具**(tool 21):上传日志文件或粘贴文本,自动做 9 维分析——级别统计、时间线、异常聚类、关键词、TraceId、RequestId、IP、接口聚合、上下文定位。

不在本 change(后续 v2):日志分析迁移 worker 处理超大文件、日志格式自定义正则配置、导出分析报告。

## Capabilities

### New Capabilities

- `text-diff-tool`: 文本对比工具——两段文本差异高亮,line/word/char 三模式。
- `base-converter-tool`: 进制转换工具——2/8/10/16 任意互转,前缀识别+BigInt 大数。
- `log-analyzer-tool`: 日志分析工具——上传/粘贴日志,9 维自动分析(structured report)。

### Modified Capabilities

(无——新增独立工具,不改动既有 13 工具行为)

## Impact

- **代码**:新增 `src/renderer/src/tools/text-diff/`、`src/renderer/src/tools/base-converter/`、`src/renderer/src/tools/log-analyzer/`;`register.ts` 与 `transform.worker.ts` 各加 3 行
- **依赖**:新增 `diff`(jsdiff,文本对比)。进制转换与日志分析原生逻辑,无外部依赖
- **系统/服务**:无后端;core 纯函数本地运算
- **风险对齐**:日志分析为最大实现块——主线程分块异步处理(50MB 上限+截断警告),异常聚类用堆栈指纹去重(非字符串等值);文本对比结果转 HTML 内联样式(不依赖外部 CSS)
