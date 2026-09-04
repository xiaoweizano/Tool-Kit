# jvm-params-tool Specification

## ADDED Requirements

### Requirement: 堆内存参数生成
`generateJvmParams(options)` MUST 按分类生成 JVM 启动参数:输入堆内存(-Xms/-Xmx/-Xmn/-XX:MetaspaceSize)等。返回 `ToolResult<string>`(每行参数 + `# 注释`)。

#### Scenario: 生成堆内存参数
- **WHEN** 用户填 Xms=512m、Xmx=2g、Xmn=256m
- **THEN** 输出 `-Xms512m -Xmx2g -Xmn256m` 及对应行注释

### Requirement: GC 策略参数
选择 GC 策略(G1 默认/ZGC/Shenandoah)MUST 输出对应 `-XX:+UseG1GC` 等与调优参数。

#### Scenario: 选 G1 GC
- **WHEN** 用户选 G1
- **THEN** 输出 `-XX:+UseG1GC` 与 G1 调优参数

#### Scenario: 选 ZGC
- **WHEN** 用户选 ZGC
- **THEN** 输出 `-XX:+UseZGC` 与 ZGC 相关参数

### Requirement: 调试与监控参数
勾选调试/监控类 MUST 输出:HeapDumpOnOutOfMemoryError、HeapDumpPath、远程调试端口、PrintGCDetails、JMX、Flight Recorder 等对应参数。

#### Scenario: 生成调试参数
- **WHEN** 用户勾选 OOM 堆转储与远程调试
- **THEN** 输出 `-XX:+HeapDumpOnOutOfMemoryError`、`-XX:HeapDumpPath=...`、远程调试 `-agentlib:jdwp`

### Requirement: 容器感知参数
勾选容器感知 MUST 输出 `-XX:+UseContainerSupport` 与 `-XX:MaxRAMPercentage` 等容器内推荐的 JVM 参数。

#### Scenario: 生成容器感知参数
- **WHEN** 用户勾选容器感知
- **THEN** 输出 UseContainerSupport 与 MaxRAMPercentage

### Requirement: 自定义参数与空态
MUST 支持用户逐行输入自定义额外参数;合并进最终输出。无任何选项时 MUST 返回 EMPTY 引导态(非错误)。返回 `ToolResult<string>`。

#### Scenario: 合并自定义参数
- **WHEN** 用户额外输入 `-Dspring.profiles.active=prod`
- **THEN** 输出末尾含该自定义参数行

#### Scenario: 无选项回 EMPTY
- **WHEN** 用户未选任何分类未填参数即生成
- **THEN** 回到 EMPTY 引导态

### Requirement: 本地离线与复制
生成 MUST 全本地纯前端零网络;结果可一键复制;核心为纯函数可 golden 测试。

#### Scenario: 纯函数可测
- **WHEN** 直接调用 generateJvmParams
- **THEN** 返回确定 `ToolResult<string>`,由 golden test 断言精确参数
