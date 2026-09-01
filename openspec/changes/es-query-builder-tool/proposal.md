# Proposal: es-query-builder-tool

## Why

ToolKit 已覆盖 12 个本地优先工具，但缺少开发者日常高频的 **Elasticsearch 查询构造**场景。开发者手写 ES DSL JSON 耗时易错：布尔嵌套、字段类型、range 双值、terms 数组、wildcard/match 语义区分都容易写错。现状是打开 Kibana Dev Tools 或翻文档，粘贴到 IDE 后反复调试。本工具把「可视化构造 → 精确 DSL → 多语言代码」收拢为一处，粘贴字段名和值即得可复制结果，与 ToolKit 现有 12 个工具的「粘贴即出」体验一致。

## What Changes

新增第 13 个工具 **ES 查询条件构造器**，完全遵循现有 ToolDescriptor + Worker 通道模式：

- **可视化条件树**：像 Navicat 一样提供预设条件（等于/不等于/大于/小于/包含/匹配/范围/在列表中/不存在），支持 AND/OR 嵌套分组，条件可递归、可上移下移
- **DSL 结构化输出**：条件树 → 精确 ES DSL JSON，含分页（from/size），字段类型提示（text/keyword/integer/float/date/boolean）
- **DSL 反向解析**：粘贴已有 DSL JSON → 解析为可视化条件树，可编辑后重新生成（round-trip）
- **多语言代码生成**：DSL → Java(RestClient)/Python(elasticsearch-py)/Shell(curl)/HTTP(raw)/Go(v8)/Node.js(8.x) 六种代码片段，一键复制
- **错误三态**：空输入/字段缺失/range 值非法/嵌套过深 → `invalid-input` + 定位；复用现有 TriStateOutput

不在本 change（后续 change）：ES 连接执行、元数据自动发现、查询历史与模板、导出与分享（Postman/URL hash）——均标记为 v2 可选增强。

## Capabilities

### New Capabilities

- `es-query-builder-tool`: ES 查询条件构造工具——可视化条件树构建、DSL 结构化输出、DSL 反向解析 round-trip、多语言代码生成。core 为纯函数 transform，可脱离 UI 直接 golden 测试

### Modified Capabilities

(无——新增独立工具，不改动既有 12 工具行为)

## Impact

- **代码**:新增 `src/renderer/src/tools/es-query-builder/`(icon/index/transform/types + components/ConditionNode/ConditionTree/CodeOutput);`register.ts` 与 `transform.worker.ts` 各加一行
- **依赖**:无新增运行时依赖(ES DSL 构造与代码生成均原生字符串/JSON 处理)
- **系统/服务**:无后端;core 纯函数本地运算
- **风险对齐**:复用现有 Worker 通道,重计算不进 UI 主线程;条件树深度上限 10 层防止递归过深
