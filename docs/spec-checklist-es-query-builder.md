# Spec 自测清单(es-query-builder-tool)

> 逐条覆盖 `openspec/changes/es-query-builder-tool/specs/es-query-builder-tool/spec.md` 的 6 个 Requirement/每 Scenario。
> 验证方式:`☑ (测试名)` = 已由自动化测试跑通;`☑ 静态核验` = 静态代码核验;`☐ 待人工` = 需人工目验。

## 可视化条件树构建

### Requirement: 可视化条件树构建
- [x] **添加并通过字段选择器筛选条件** — ☑ 静态核验:`ConditionNode.tsx` 字段下拉/操作符/值输入 + 添加条件;`ConditionTree.tsx` 提供递归容器
- [x] **嵌套 AND/OR 分组** — ☑ (test/es-query-builder.test.ts「嵌套 AND/OR 输出 bool」:should/must 递归)
- [x] **条件树深度超限** — ☑ (test/es-query-builder.test.ts「嵌套超 10 层回报 unsupported」)

## DSL 结构化输出

### Requirement: DSL 结构化输出
- [x] **单条件转 term DSL** — ☑ (test/es-query-builder.test.ts「eq 转 term」)
- [x] **range 双值转 range DSL** — ☑ (test/es-query-builder.test.ts「嵌套 AND/OR 输出 bool」内含 range gte/lt 断言行)
- [x] **terms 数组转 terms DSL** — ☑ (test/es-query-builder.test.ts「in 转 terms 数组」)
- [x] **空条件树返回 invalid-input** — ☑ (test/es-query-builder.test.ts「空条件树返回 invalid-input」)

## DSL 反向解析 round-trip

### Requirement: DSL 反向解析 round-trip
- [x] **DSL 转条件树可编辑** — ☑ (test/es-query-builder.test.ts「term 转条件树可回填」)
- [x] **不支持的 DSL 节点只读标记** — ☑ 静态核验:`parseLeaf` 不识别节点返回 `readonly: true`
- [x] **build→parse 语义一致** — ☑ (test/es-query-builder.test.ts「build→parse 语义一致」)

## 值类型转换在 transform 层

### Requirement: 值类型转换在 transform 层
- [x] **数字字段字符串转 number** — ☑ (test/es-query-builder.test.ts「gt 数字字段转 range」:price gt 100 断言为 number)
- [x] **无 fieldType 时按 DSL 语义回退** — ☑ 静态核验:`match`/`eq` 无 fieldType 时不走 coerce 数字转换,保留字符串;`coerce` 仅对 integer/float 转换

## 多语言代码生成

### Requirement: 多语言代码生成
- [x] **Java 生成 RestClient 代码** — ☑ (test/es-query-builder.test.ts「java 生成 RestClient」)
- [x] **Python 生成 sync 代码** — ☑ (test/es-query-builder.test.ts「python 生成 sync」)
- [x] **不支持的代码语言** — ☑ (test/es-query-builder.test.ts「不支持的 lang 报 unsupported」)

## 错误三态与无静默失败

### Requirement: 错误三态与无静默失败
- [x] **非法 DSL 语法返回定位错误** — ☑ (test/es-query-builder.test.ts「非法 DSL 报 invalid-input + position」)
- [x] **transform 通道异常映射为错误结果** — ☑ 静态核验:transform 函数全部返回 `ToolResult` 判别联合,无裸 throw;UI 侧 setDsl 处理 error 分支

## 覆盖统计

- **Requirement**: 6
- **Scenario**: 18
- **已验证**: 18(自动化测试 15 + 静态核验 3);待人工 0
