# ES 查询条件构造器 — 设计文档

> 工具编号: 13
> 创建日期: 2026-08-29
> 分支: main
> 继承自 CEO Plan: `.gstack/ceo-plans/2026-08-29-es-query-builder.md`

## 概述

在 ToolKit 中添加第 13 个工具：ES 查询条件构造器。像 Navicat 一样提供可视化条件构建界面，支持嵌套 AND/OR 条件树，输出 ES DSL JSON 及多种编程语言代码片段。

## 用户需求

- **核心场景**：开发者日常构造 Elasticsearch 查询条件，避免手写 JSON 的繁琐
- **输入来源**：从日志/控制台复制字段名和值，粘贴构建查询
- **输出目标**：复制到 IDE 使用（Java client / Python / curl / HTTP）
- **进阶需求**：可选连接 ES 实例执行查询，验证结果

## 功能规格

### 条件构建器

- **条件模板**：等于、不等于、大于、大于等于、小于、小于等于、包含、不包含、匹配（regexp）、范围（range）、在列表中、不存在
- **字段类型提示**：text、keyword、integer、float、date、boolean（手动指定为 v1，从 ES mapping 自动获取为 v2 功能）
- **嵌套条件树**：支持 AND/OR 分组，条件可递归嵌套
- **可视化操作**：添加条件、删除条件、移动条件（上移/下移）、复制条件、切换 AND/OR 逻辑

### 代码生成

- **目标语言**：Java (RestClient)、Python (elasticsearch-py)、Shell (curl)、HTTP (raw JSON)、Go、Node.js
- **输出格式**：可复制的代码片段 + 语法高亮
- **一键复制**：CopyButton 组件，支持 Ctrl+Shift+C 快捷键

### ES 连接执行（可选增强）

- **配置方式**：在设置页统一配置 ES 地址（与 translate 工具一致）
- **执行能力**：构建完成后点击"执行"按钮，将 DSL 发送到配置的 ES 实例
- **结果显示**：在输出区展示查询结果（命中数、前几条文档）
- **元数据自动发现**：连接 ES 后自动获取 index pattern 和字段 mapping，条件选择器智能过滤

### 查询历史与模板

- **历史保存**：每次构建的查询自动保存到 localStorage
- **命名与收藏**：支持命名查询、标记收藏
- **版本对比**：简化为时间戳 + 名称展示，不做 AST diff
- **模板系统**：支持创建模板（如"生产环境查询"、"日志分析"），一键应用

### DSL 反向解析

- **粘贴解析**：用户粘贴已有的 ES DSL JSON，工具自动解析为可视化条件树
- **支持范围**：bool 查询（must/must_not/should/filter）、term、range、match
- **不支持的 DSL 节点**：解析为只读叶节点并显示警告徽章

### 导出与分享

- **导出格式**：Postman collection、cURL 命令
- **分享链接**：查询状态编码为 URL hash（限制深度，超出时降级为复制 JSON）

## 技术架构

### 文件结构

```
src/renderer/src/tools/es-query-builder/
├── icon.tsx              # 工具图标（elasticsearch 图标）
├── index.tsx             # 页面组件
├── transform.ts          # 核心逻辑（条件树 ↔ DSL、DSL → 代码、DSL 解析）
├── types.ts              # 类型定义
└── components/
    ├── ConditionNode.tsx  # 递归条件节点组件
    ├── ConditionTree.tsx  # 条件树容器
    └── CodeOutput.tsx     # 代码输出组件

src/renderer/src/core/es-connection.ts   # ES 连接配置（复用 @core/http）
```

### 类型定义

```typescript
// src/renderer/src/tools/es-query-builder/types.ts

// 操作符类型
export type ConditionOp =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'notContains' | 'match' | 'range'
  | 'in' | 'notIn' | 'exists' | 'notExists'

// 字段类型
export type FieldType = 'text' | 'keyword' | 'integer' | 'float' | 'date' | 'boolean'

// 条件节点（支持嵌套）
export interface Condition {
  id: string
  field: string
  op: ConditionOp
  value: string | number | string[] | { gte?: string | number; lte?: string | number; gt?: string | number; lt?: string | number }
  fieldType?: FieldType  // 可选，从 ES mapping 获取或手动指定；exists/notExists 不需要
  children?: Condition[]  // 嵌套子条件（仅分组节点有效）
  logic?: 'and' | 'or'    // 分组逻辑（仅在有 children 时有效）
  minShouldMatch?: number  // should 分组的最小匹配数（可选，映射到 ES minimum_should_match）
}

// 查询状态（包含分页排序）
export interface EsQueryState {
  rootCondition: Condition
  indexName: string
  from?: number
  size?: number
  sort?: { field: string; order?: 'asc' | 'desc' }[]
  history?: QueryHistoryEntry[]
  templates?: QueryTemplate[]
}

// 历史条目
export interface QueryHistoryEntry {
  id: string
  name: string
  state: EsQueryState
  createdAt: number
  isFavorite?: boolean
}

// 模板
export interface QueryTemplate {
  id: string
  name: string
  description: string
  state: EsQueryState
  tags?: string[]
}

// 代码生成函数（按语言返回单个代码片段）
export function generateCode(dsl: string, lang: string): ToolResult<string>

// 辅助：获取所有语言代码（供 UI 一次性生成）
export function generateAllCodes(dsl: string): { java: string; python: string; shell: string; http: string; go: string; node: string }
```

### Transform 函数

```typescript
// src/renderer/src/tools/es-query-builder/transform.ts
// 所有 transform 函数返回 ToolResult<T>，定义见 @core/types

// 条件树 → ES DSL JSON
export function buildQueryDsl(state: EsQueryState): ToolResult<string>

// ES DSL JSON → 条件树（反向解析）
export function parseQueryDsl(dsl: string): ToolResult<EsQueryState>

// ES DSL JSON → 单语言代码
export function generateCode(dsl: string, lang: string): ToolResult<string>

// ES DSL JSON → 所有语言代码（供 UI Tab 渲染）
export function generateAllCodes(dsl: string): { java: string; python: string; shell: string; http: string; go: string; node: string }

// 辅助：生成分页 DSL（from/size）
export function buildPaginationDsl(state: EsQueryState): Record<string, unknown>
```

### 代码生成映射规则

| 语言 | 库 | 生成风格 |
|------|-----|----------|
| Java | elasticsearch-java (1.x+) | RestClient builder 风格，包含 error handling |
| Python | elasticsearch-py (8.x+) | Sync 风格（默认），注释标注 async 变体，包含 timeout |
| Shell | curl | 完整 curl 命令，包含认证和超时 |
| HTTP | raw | HTTP POST 请求体，包含 headers |
| Go | github.com/elastic/go-elasticsearch/v8 | esapi.Search 调用，包含 context |
| Node.js | @elastic/elasticsearch (8.x+) | client.search() 调用，包含 error handling |

### 操作符 DSL 映射

| 操作符 | ES DSL | 说明 |
|--------|--------|------|
| eq | `term` | 精确匹配 |
| ne | `bool.must_not.term` | 取反 |
| gt/gte/lt/lte | `range` | 范围查询（支持 string 和 number） |
| contains | `wildcard` | 通配符匹配（keyword 字段默认 case_insensitive） |
| notContains | `bool.must_not.wildcard` | 取反通配符 |
| match | `match` | 全文检索 |
| in | `terms` | 多值匹配 |
| notIn | `bool.must_not.terms` | 取反多值 |
| exists | `exists` | 字段存在 |
| notExists | `bool.must_not.exists` | 字段不存在 |

**分组节点 DSL 映射：**

| 字段 | ES DSL | 说明 |
|------|--------|------|
| logic: 'and' | `bool.must` | AND 分组 |
| logic: 'or' | `bool.should` | OR 分组 |
| minShouldMatch | `minimum_should_match` | should 分组的最小匹配数 |

### 注册

```typescript
// src/renderer/src/tools/register.ts
{
  id: 'es-query-builder',
  name: 'ES 查询构造',
  icon: EsIcon,  // 使用 <span className="font-mono">ES</span> 标签
  route: '/tools/es-query-builder',
  component: EsQueryBuilderPageLazy,
  capability: { offline: true }  // ES 连接为可选增强，不标记 network
}
```

### Worker 注册

```typescript
// src/renderer/src/core/transform.worker.ts
// 每个工具一个 registry key，复杂操作通过 opts 参数区分

registry.set('es-query-builder', ((input: EsQueryState, opts?: TransformOpts) => {
  // 根据 opts.action 分发到不同函数
  const action = opts?.action ?? 'build'
  if (action === 'parse') return parseQueryDsl(input as unknown as string)
  if (action === 'generate') return generateCode(input as unknown as string, opts?.lang as string)
  return buildQueryDsl(input)
}) as Transform<unknown, unknown, TransformOpts>)

// 或者拆分为多个 registry key（更清晰）：
// registry.set('es-query-builder', buildQueryDsl)
// registry.set('es-query-builder-parse', parseQueryDsl)
// registry.set('es-query-builder-generate', generateCode)
```

## UI 布局

```
┌──────────────────────────────────────────────────────────────────────┐
│  ES 查询条件构造器                    [连接 ES] [历史] [模板] [导出] │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─ 条件树编辑器 ────────────────────────────────────────────────┐  │
│  │  索引: [products]      分页: from [0] size [10]               │  │
│  │                                                               │  │
│  │  AND                                                          │  │
│  │  ├─ field: [status ▼]        op: [= ▼]     value: [active   ] [↑][↓][×] │
│  │  ├─ field: [price ▼]         op: [> ▼]      value: [100     ] [↑][↓][×] │
│  │  └─ OR                                                          │  │
│  │     ├─ field: [category ▼]   op: [= ▼]     value: [electronics][↑][↓][×]│
│  │     └─ field: [stock ▼]      op: [> ▼]      value: [0       ] [↑][↓][×] │
│  │                                                               │  │
│  │  [+ 添加条件]  [+ 添加分组]                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─ 输出预览 ────────────────────────────────────────────────────┐  │
│  │  [JSON DSL] [Java] [Python] [Shell] [HTTP] [Go] [Node] [导出] │  │
│  │                                                               │  │
│  │  ```json                                                      │  │
│  │  {                                                            │  │
│  │    "query": {                                                │  │
│  │      "bool": {                                               │  │
│  │        "must": [                                             │  │
│  │          { "term": { "status": "active" } },                 │  │
│  │          { "range": { "price": { "gt": 100 } } },            │  │
│  │          {                                                    │  │
│  │            "bool": {                                         │  │
│  │              "should": [                                     │  │
│  │                { "term": { "category": "electronics" } },    │  │
│  │                { "range": { "stock": { "gt": 0 } } }         │  │
│  │              ]                                                │  │
│  │            }                                                  │  │
│  │          }                                                    │  │
│  │        ]                                                      │  │
│  │      }                                                        │  │
│  │    },                                                        │  │
│  │    "from": 0, "size": 10                                     │  │
│  │  }                                                            │  │
│  │  ```                                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**分页与排序输入：** 在条件树编辑器顶部添加 `from`（起始位置，默认 0）和 `size`（每页数量，默认 10）输入框。排序功能在 v2 中实现。

**移动条件：** 每个条件卡片提供 ↑ 和 ↓ 按钮实现上移/下移，不实现拖拽。

**URL hash 分享：** 限制查询节点数 ≤ 10（每个 Condition 对象计为一个节点，不包括分组包装），超出时禁用分享按钮并提示"查询过深，无法生成分享链接"。

## 实现计划

### 阶段 1：核心条件构建器（v1 必选）
1. 创建 `types.ts` 类型定义
2. 实现 `transform.ts` 核心逻辑（条件树 → DSL、分页排序 DSL）
3. 创建递归条件节点组件 `ConditionNode.tsx`
4. 创建条件树容器组件 `ConditionTree.tsx`
5. 实现页面组件 `index.tsx`
6. 注册工具到 `register.ts` 和 `transform.worker.ts`
7. 编写单元测试（`test/es-query-builder.test.ts`）

### 阶段 2：DSL 反向解析（v1 必选）
1. 实现 `parseQueryDsl` 函数（支持 bool/match/term/range）
2. 添加"粘贴 DSL"输入框
3. 不支持的 DSL 节点标记为只读并显示警告

### 阶段 3：代码生成（v1 必选）
1. 实现 6 语言代码生成函数（在 `transform.ts` 中）
2. 创建代码输出组件 `CodeOutput.tsx`
3. 集成 Tab 切换和 CopyButton

### 阶段 4：ES 连接执行（v2 可选增强）
1. 在设置页添加 ES 连接配置（复用 translate 工具的设置模式）
2. 创建 `core/es-connection.ts` 模块
3. 实现执行按钮和结果展示
4. 实现元数据自动发现（获取 index mapping）
5. 条件选择器智能过滤（基于 mapping）
6. 处理认证失败、CORS、网络超时等错误状态

### 阶段 5：查询历史与模板（v2 可选增强）
1. 实现历史保存/加载逻辑（localStorage）
2. 实现模板系统
3. 添加历史面板和模板面板
4. 版本对比简化为时间戳 + 名称（不做 AST diff）

### 阶段 6：导出与分享（v2 可选增强）
1. 实现 Postman collection 导出
2. 实现 cURL 命令导出（已在代码生成中覆盖，此处为独立导出）
3. 实现 URL hash 分享（限制查询深度，超出时提示）

## 设计约束

- **离线优先**：核心功能无需网络，ES 连接为可选增强
- **架构一致**：完全复用 ToolDescriptor + Worker 通道模式
- **中文界面**：所有标签、提示使用中文
- **设计系统**：遵循 DESIGN.md 的电路工作台风格（深色底 #0A0A0A、等宽标注 11px、信号色三态）
- **测试覆盖**：核心 transform 函数必须有单元测试
- **错误处理**：每个 transform 函数明确错误类型和提示（参考 `@core/types` 的 `ToolResult` 定义）
- **ES 连接限制**：浏览器环境需 ES 实例开启 CORS，或依赖 Electron net 模块转发

## 成功标准

**v1 成功标准：**
- 用户能够可视化构建嵌套 ES 查询条件
- 支持 DSL 反向解析（粘贴 JSON → 条件树）
- 一键生成 6 种语言的代码片段
- 与现有 12 个工具体验一致

**v2 增强（可选）：**
- 连接 ES 执行查询验证结果
- 查询历史与模板系统
- 导出与分享功能
