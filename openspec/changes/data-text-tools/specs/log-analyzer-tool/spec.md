# log-analyzer-tool Specification

## ADDED Requirements

### Requirement: 日志级别统计
`analyzeLog(rawText)` MUST 统计日志各级别(FATAL/ERROR/WARN/INFO/DEBUG/TRACE)出现次数与占比,返回 `LogAnalysisResult`。能识别带时间戳与 `LEVEL:` 的常见格式(logback 方括号、通用、简单)。

#### Scenario: 统计各级别计数
- **WHEN** 上传含 50 条 ERROR、200 条 INFO、30 条 WARN 的日志
- **THEN** levelStats 返回对应计数与占比

### Requirement: 异常聚类
MUST 聚类相似异常:以「异常类型 + 堆栈首帧 + 消息指纹」为聚类键,同簇合并计数并记录示例行号。相似堆栈去重,而非字符串等值。

#### Scenario: 同类型异常聚为一簇
- **WHEN** 日志含 20 次 `NullPointerException`(堆栈相似)
- **THEN** exceptions 返回一簇 count=20

### Requirement: 关键词提取
MUST 提取 ERROR/FATAL 行的高频关键词,返回 Top 20。关键词为单词(分词),排除常见停用词与纯标点。

#### Scenario: 提取高频关键词
- **WHEN** ERROR 行重复出现 "timeout"、"connection"
- **THEN** keywords 返回 count 降序的 timeout/connection 等

### Requirement: ID 提取(TraceId/RequestId/IP)
MUST 提取 traceId/requestId(含 trace_id/request_id/reqid 变体)与 IPv4(可选 IPv6)地址,各返回去重列表,记录每个 ID 的出现行数。

#### Scenario: 提取 TraceId 与 IP
- **WHEN** 日志含 traceId "abc123" 与 IP "10.0.0.1"
- **THEN** traceIds/requestIds/ips 各返回对应去重 ID 与出现次数

### Requirement: 接口聚合
MUST 识别日志中的 URL/路径,按路径聚合其关联的异常类型与计数(接口相同异常聚合)。

#### Scenario: 按接口聚合异常
- **WHEN** `/api/order` 关联 30 次超时异常
- **THEN** endpoints 返回 `/api/order` 下 errors 聚合 count=30

### Requirement: 上下文定位
MUST 支持点击某异常/ID 展示前后 N 行(默认前后各 3 行)原始日志上下文。

#### Scenario: 定位异常上下文
- **WHEN** 用户点击某异常
- **THEN** 展示该异常所在行前后各 3 行原文

### Requirement: 时间线与大文件边界
MUST 按分钟聚合日志事件数生成时间线;无时间戳日志返回空时间线并提示「无时间戳,已跳过」。输入 >50MB MUST 截断前 50MB 并返回 `ok`(对截断切片做真实分析,totalLines 反映截断后计数);空文件返回 `invalid-input`。

#### Scenario: 有时间戳生成时间线
- **WHEN** 日志含时间戳
- **THEN** timeline 返回分钟级事件计数

#### Scenario: 超大文件截断
- **WHEN** 上传 >50MB 日志
- **THEN** 返回 `{status:'ok', data:<对前50MB截断切片的分析>}`,`totalLines` 为截断后计数

### Requirement: 本地离线与分块异步
分析 MUST 全本地前端,零网络;大文件用分块异步循环处理不阻塞 UI 主线程;核心为纯函数,可脱离 UI 直接 golden 测试。

#### Scenario: 纯函数可测
- **WHEN** 直接调用 analyzeLog
- **THEN** 返回确定的 `LogAnalysisResult`,由 golden test 断言各维度输出
