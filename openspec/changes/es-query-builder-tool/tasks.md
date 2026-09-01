# Tasks: es-query-builder-tool

## 1. 类型与纯函数层

- [ ] 1.1 创建 `src/renderer/src/tools/es-query-builder/types.ts`:定义 `ConditionOp`、`FieldType`、`Condition`(含 value 联合类型/children/logic/minShouldMatch)、`EsQueryState`(rootCondition/indexName/from/size)
- [ ] 1.2 实现 `buildQueryDsl(state): ToolResult<string>`:条件树 → ES DSL JSON。含单条件/嵌套 AND/OR(and→must, or→should)/range 双值/terms 数组/exists/notExists;输出含 query + from/size;空树→invalid-input"至少需要一个条件";嵌套>10层→unsupported
- [ ] 1.3 实现值类型转换(transform 层):根据 fieldType 将 `"100"`→100、日期串→date;无 fieldType 时按 DSL 语义回退为字符串,不抛错
- [ ] 1.4 实现 `parseQueryDsl(dsl): ToolResult<EsQueryState>`:DSL → 条件树。支持 bool(must/must_not/should/filter)、term、range、match;不支持的节点→只读叶节点标记;语法错误→invalid-input+position
- [ ] 1.5 实现 `generateCode(dsl, lang): ToolResult<string>`:六语言代码生成(Java RestClient/Python sync+async注释/curl/HTTP raw/Go v8/Node.js 8.x);不支持的 lang→unsupported
- [ ] 1.6 实现 `generateAllCodes(dsl)`:一次生成六语言(供 UI Tab 一次性渲染,避免 6 次 worker 往返)

## 2. Worker 注册与工具注册

- [ ] 2.1 `transform.worker.ts`:新增 registry key `es-query-builder`,以 `opts.action` 分发 build/parse/generate;import 三个 transform 函数
- [ ] 2.2 `register.ts`:新增 ToolDescriptor `{id:'es-query-builder', name:'ES 查询构造', route:'/tools/es-query-builder', capability:{offline:true}}` + lazy import

## 3. 递归组件层

- [ ] 3.1 `components/ConditionNode.tsx`:递归单条件节点(字段/操作符/值输入 + ↑↓× 操作);range 显示双值输入;in 显示多值输入;exists/notExists 无值输入
- [ ] 3.2 `components/ConditionTree.tsx`:递归容器(AND/OR 分组渲染 + 逻辑切换 + 添加条件/添加分组);与 ConditionNode 互递归
- [ ] 3.3 值输入控件:根据 fieldType 切换文本框/数字框(显示但保持字符串传值,转换在 transform 层)

## 4. 页面组件

- [ ] 4.1 `index.tsx`:条件树 state 管理(useState);build 走 useLiveTransform 防抖;parse/generate 走 runTransform 显式触发;分页 from/size 输入
- [ ] 4.2 `CodeOutput`:六语言 Tab 切换 + 语法高亮 + CopyButton(Ctrl+Shift+C)
- [ ] 4.3 `index.tsx` 集成:连 ES 按钮(v2 占位)/历史/模板/导出按钮置灰或隐藏(标记 v2);中文文案遵循 DESIGN.md

## 5. 测试(golden)

- [ ] 5.1 `test/es-query-builder.test.ts`:build 用例——单条件/嵌套 AND/OR/range 双值/in/terms 数组/exists/notExists/分页
- [ ] 5.2 值类型转换用例:integer 字段 "100"→100;date 串转换;无 fieldType 回退字符串
- [ ] 5.3 parse round-trip 幂等:build→parse→build 输出语义一致(golden 断言)
- [ ] 5.4 generateCode:六语言各一条 golden 断言;不支持的 lang→unsupported
- [ ] 5.5 错误路径:空树/range 值非法/嵌套超10层/非法 DSL 语法(含 position)
- [ ] 5.6 `pnpm test` 全量回归(既有 217 用例 + 新增)保持绿

## 6. 收尾验证

- [ ] 6.1 `pnpm typecheck` 通过
- [ ] 6.2 `pnpm lint` 通过
- [ ] 6.3 `pnpm test` 全绿(含新增 golden 用例)
- [ ] 6.4 spec-checklist(es-query-builder-tool)逐条核对 Scenario 通过
- [ ] 6.5 `openspec validate es-query-builder-tool` 通过
