# es-query-builder-tool Specification

## ADDED Requirements

### Requirement: 可视化条件树构建
用户 MUST 能通过可视化树形界面构建 ES 查询条件:每个条件含字段(field)、操作符(op)、值(value);支持 AND/OR 逻辑分组;条件可添加、删除、上移/下移;嵌套层级不限但深度上限 10 层(超出报 `unsupported` 提示拆分)。

#### Scenario: 添加并通过字段选择器筛选条件
- **WHEN** 用户在条件树中点「添加条件」并选择字段、操作符、输入值
- **THEN** 生成一个条件节点,对应的 DSL 片段即时出现

#### Scenario: 嵌套 AND/OR 分组
- **WHEN** 用户添加一个条件分组并选择 OR 逻辑,内部嵌套多个条件
- **THEN** 该分组输出 `bool.should` DSL,子条件递归生成

#### Scenario: 条件树深度超限
- **WHEN** 嵌套层级超过 10 层
- **THEN** 返回 `unsupported` 错误并提示拆分查询

### Requirement: DSL 结构化输出
`buildQueryDsl` MUST 将条件树转换为精确的 ES DSL JSON(含 `query` 与分页 `from`/`size`);返回 `ToolResult<string>`。空树/字段缺失/range 值非法 MUST 返回 `invalid-input` 并携带定位信息。

#### Scenario: 单条件转 term DSL
- **WHEN** 一个条件 `{field: 'status', op: 'eq', value: 'active'}`
- **THEN** 输出 `{"query":{"term":{"status":"active"}}}`(缩进格式化)

#### Scenario: range 双值转 range DSL
- **WHEN** 一个条件 `{field: 'price', op: 'range', value: {gte: '100', lte: '200'}}`
- **THEN** 输出 `{"query":{"range":{"price":{"gte":100,"lte":200}}}}`,字符串值按 fieldType 转为 number

#### Scenario: terms 数组转 terms DSL
- **WHEN** 一个条件 `{field: 'category', op: 'in', value: ['a','b','c']}`
- **THEN** 输出 `{"query":{"terms":{"category":["a","b","c"]}}}`

#### Scenario: 空条件树返回 invalid-input
- **WHEN** 条件树没有条件节点
- **THEN** 返回 `{status:'error', kind:'invalid-input', message:'至少需要一个条件'}`

### Requirement: DSL 反向解析 round-trip
`parseQueryDsl` MUST 将粘贴的 ES DSL JSON 解析回可视化条件树;支持的 DSL 节点(bool must/must_not/should/filter、term、range、match)解析为可编辑条件;不支持的节点解析为只读叶节点并显示警告徽章。解析后再 build 应与原 DSL 语义一致(幂等)。

#### Scenario: DSL 转条件树可编辑
- **WHEN** 用户粘贴 `{"query":{"term":{"status":"active"}}}`
- **THEN** 解析为一个条件节点 `{field:'status', op:'eq', value:'active'}`,可回填且可编辑

#### Scenario: 不支持的 DSL 节点只读标记
- **WHEN** 用户粘贴含 `geohash` 等不支持节点的 DSL
- **THEN** 该节点解析为只读叶节点,界面显示警告徽章

#### Scenario: build→parse 语义一致
- **WHEN** 条件树 build 出 DSL,再 parse 回条件树,再次 build
- **THEN** 两次 build 输出语义一致(round-trip 幂等,由 golden test 锁定)

### Requirement: 值类型转换在 transform 层
UI 层 MUST 只传字符串值;`buildQueryDsl` SHALL 根据 `fieldType`(或 DSL 上下文)将字符串转换为 `number`/`date`。转换逻辑在 transform 层,不在 UI 层。golden test 输入统一字符串,断言输出精确 DSL。

#### Scenario: 数字字段字符串转 number
- **WHEN** 条件 `{field:'price', op:'gt', value:'100', fieldType:'integer'}` 进入 build
- **THEN** 输出 `{"query":{"range":{"price":{"gt":100}}}}`,值为 number 而非字符串

#### Scenario: 无 fieldType 时按 DSL 语义回退
- **WHEN** 条件未声明 fieldType 但值无法解析为 number
- **THEN** 值按字符串处理,不抛错(如 `match` 字段默认字符串)

### Requirement: 多语言代码生成
`generateCode` MUST 将 DSL 转换为六种语言的代码片段(Java RestClient / Python elasticsearch-py / Shell curl / HTTP raw / Go v8 / Node.js 8.x);返回 `ToolResult<string>`。不支持的 lang 返回 `unsupported`。代码片段 MUST 可直接复制到 IDE 使用。

#### Scenario: Java 生成 RestClient 代码
- **WHEN** 用户选择 Java 并调用 generateCode(DSL, 'java')
- **THEN** 返回含 elasticsearch-java RestClient 调用的代码片段

#### Scenario: Python 生成 sync 代码
- **WHEN** 用户选择 Python 并调用 generateCode(DSL, 'python')
- **THEN** 返回 elasticsearch-py 同步代码,注释标注 async 变体

#### Scenario: 不支持的代码语言
- **WHEN** 调用 generateCode(DSL, 'ruby')
- **THEN** 返回 `{status:'error', kind:'unsupported', structure:'ruby', message:'暂不支持该语言'}`

### Requirement: 错误三态与无静默失败
核心 transform 函数 MUST 遵循 ToolKit 错误三态约定:OK / ERROR / EMPTY,复用 `ToolResult` 判别联合与现有 `TriStateOutput`。每个失败路径 MUST 返回明确的错误 kind 与中文定位信息,绝不静默挂起(级联 `invalid-input`/`unsupported` 到 UI 展示)。

#### Scenario: 非法 DSL 语法返回定位错误
- **WHEN** 用户粘贴非法 DSL JSON
- **THEN** 返回 `{status:'error', kind:'invalid-input', message:'...', position: N}`,TriStateOutput 显示定位

#### Scenario: transform 通道异常映射为错误结果
- **WHEN** worker/通道崩溃
- **THEN** 映射为 `{status:'error', kind:'unsupported', structure:'transform-channel'}`,UI 显示「转换通道异常,请重试」,绝不静默挂起
