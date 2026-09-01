# Design: es-query-builder-tool

> 继承 AI 设计交付物:`docs/es-query-builder-design.md`(经 CEO + Eng + 3 轮 spec review 加固)。
> 本文档为 OpenSpec 落地设计,聚焦架构与边界。

## 架构总览

```
条件树 state (React, 嵌套)
    │  useLiveTransform (防抖 150ms, 单 key 'es-query-builder' + opts.action='build')
    ▼
worker: buildQueryDsl(tree) ──────────────► DSL JSON (ToolResult<string>)
    │                                           │
    │  用户点击触发 runTransform                ▼
    │  opts.action='parse' / 'generate'   worker: generateCode(dsl, lang) ─► 语言代码
    ▼
worker: parseQueryDsl(dsl) ──► 条件树 (回填编辑)
```

## 核心类型

```
ConditionOp = 'eq'|'ne'|'gt'|'gte'|'lt'|'lte'|'contains'|'notContains'
              |'match'|'range'|'in'|'notIn'|'exists'|'notExists'

Condition {
  id: string
  field: string
  op: ConditionOp
  value: string | number | string[] | RangeObj   // 见「值类型转换」
  fieldType?: 'text'|'keyword'|'integer'|'float'|'date'|'boolean'
  children?: Condition[]                          // 仅分组节点有效
  logic?: 'and'|'or'
  minShouldMatch?: number
}
```

## 关键设计决策

### 1. Worker 分发模型(Eng Review 确认)
- **build**:走 `useLiveTransform`,输入变化防抖自动刷新(条件树 → DSL)
- **parse/generate**:用户点击触发(粘贴 DSL / 选语言),走 `runTransform` 显式调用
- 单 registry key `es-query-builder` + `opts.action` 区分,与"一工具一 transform"约定最接近

### 2. 值类型转换(explore 确认)
在 **transform 层**转换:UI 永远传字符串(符合粘贴场景),`buildQueryDsl` 根据 `fieldType`(或 DSL 上下文)将 `"100"` → `100`、日期字符串 → date。golden test 输入统一字符串,断言输出精确 DSL。这让 build 同时服务"手动输入"与"DSL 反解析回填"两条路径。

### 3. 错误处理(Eng Review 确认)
复用 `ToolResult` 错误 kind:
- `invalid-input` + `position`(定位到条件节点 id 或字符位置)——空树/字段缺失/range 值非法
- `unsupported`(structure 标注)——嵌套超 10 层 / 不支持的 DSL 节点(解析为只读叶节点+警告徽章)
- 错误信息中文,复用 TriStateOutput 的 position/failedItems 展示,无静默失败

### 4. 代码生成映射
| 语言 | 库 | 生成风格 |
|------|-----|----------|
| Java | elasticsearch-java 1.x | RestClient builder |
| Python | elasticsearch-py 8.x | Sync 默认 + async 注释 |
| Shell | curl | 完整命令 + auth/timeout |
| HTTP | raw | POST + headers |
| Go | go-elasticsearch/v8 | esapi.Search + context |
| Node.js | @elastic/elasticsearch 8.x | client.search() |

### 5. 操作符 DSL 映射
eq→term, ne→must_not.term, gt/gte/lt/lte→range, contains→wildcard(keyword 默认 case_insensitive),
notContains→must_not.wildcard, match→match, in→terms, notIn→must_not.terms, exists→exists, notExists→must_not.exists。
分组:logic 'and'→bool.must, 'or'→bool.should, minShouldMatch→minimum_should_match。

## 数据流四路径

1. **Happy**:编辑条件树 → 防抖 build → DSL 显示 + 6 语言 Tab
2. **Nil**:空条件树 → `invalid-input`(至少一个条件)
3. **Empty**:单条件无 value → `invalid-input` + 定位字段
4. **Error**:range 值非数字/字段缺失/嵌套>10层 → `invalid-input` 或 `unsupported`

## 边界与约束

- **离线优先**:v1 全本地纯函数,零网络;ES 连接执行为 v2 可选(需 CORS/Electron net 转发)
- **条件树深度上限 10 层**:超出 `unsupported`,防递归过深卡 UI
- **架构一致**:完全复用 ToolDescriptor + Worker 通道 + TriStateOutput/CopyButton
- **中文 UI**,遵循 DESIGN.md 电路工作台风格(深色底 #0A0A0A、等宽标注 11px、信号色三态)

## 不做的事(NOT in scope)

- OpenAPI spec 导出(ES 非 REST API,价值低)
- AST 级版本对比(时间戳+名称代替)
- 拖拽排序(↑↓ 按钮代替)
- ES 连接执行 / 元数据自动发现 / 查询历史模板 / Postman 导出(→ v2 单独 change)
