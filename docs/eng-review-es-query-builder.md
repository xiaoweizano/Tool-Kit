# ES 查询构造器 — 工程审查报告

> 生成日期：2026-08-29
> 分支：main
> 模式：FULL_REVIEW
> 审查者：Claude

## 审查摘要

| 指标 | 结果 |
|------|------|
| Step 0 范围挑战 | 范围恰当，无缩水（遵循现有 per-tool 模式） |
| Architecture | 1 项决策（worker 分发模型）已确认 |
| Code Quality | 无重大发现 |
| Test Review | 需补充 golden test + round-trip 覆盖 |
| Performance | 无瓶颈（纯函数，树深 ≤10） |
| Outside voice | 未运行（CEO 审查已跑 3 轮 codex） |

## 关键架构决策

### Worker 分发模型（已确认）
- **build**：走 `useLiveTransform`（自动防抖刷新，条件树 → DSL）
- **parse/generate**：用户点击触发，走 `runTransform` 显式调用
- 单 registry key `es-query-builder` + `opts.action` 区分，与现有"一工具一 transform"约定最接近

### 错误处理（已确认）
- 复用现有 `ToolResult` 错误 kind：`invalid-input`（+position）、`unsupported`、`engine`
- 错误信息中文 + 可定位（行/列或节点 id），复用 TriStateOutput 的 position/failedItems 展示
- parse 粘贴 DSL 失败：`invalid-input` + position 定位

## 数据流图

```
条件树 state (React) 
    │ useLiveTransform (150ms 防抖)
    ▼
worker: buildQueryDsl(tree) ──────────► DSL JSON (ToolResult<string>)
    │                                     │
    │                                     ▼
    │                        useMultiFieldTransform / 手动触发
    │                                     │
    ▼                                     ▼
worker: parseQueryDsl(dsl) ◄── 粘贴输入    worker: generateCode(dsl, lang) ─► 语言代码
    │  (用户点击触发)
    ▼
条件树 state (回填编辑)
```

## 数据流四路径

1. **Happy path**：编辑条件树 → 防抖 build → DSL 显示 + 6 语言代码 Tab
2. **Nil path**：空条件树 → build 返回 `invalid-input`（至少一个条件）
3. **Empty path**：单条件无 value → `invalid-input` + 定位字段
4. **Error path**：range 值非数字 / 字段缺失 / 嵌套 >10 层 → `invalid-input` 或 `unsupported`

## 状态机

```
idle ──编辑──► running ──build完成──► done (ok/error)
  ▲              │                        │
  └──空输入──────┘                        └──点击copy/generate──► 用户取用
```

## Error & Rescue Registry

| 方法 | 失败场景 | 错误 kind | 用户可见 |
|------|---------|-----------|---------|
| buildQueryDsl | 空条件树 | invalid-input | 中文提示 + 定位 |
| buildQueryDsl | range 值非法 | invalid-input | 定位到条件节点 |
| buildQueryDsl | 嵌套超10层 | unsupported | 提示拆分 |
| parseQueryDsl | DSL 语法错误 | invalid-input | position 定位 |
| generateCode | 不支持的 lang | unsupported | 提示可选语言 |

## NOT in scope

- OpenAPI spec 导出（ES 不是 REST API，价值低）
- AST 级版本对比（用时间戳 + 名称代替）
- 拖拽排序（用 ↑↓ 按钮代替）
- 实时协作（v3+）

## What already exists

| 子系统 | 现有代码 | 复用方式 |
|--------|---------|---------|
| Worker 通道 | `transform.worker.ts` | 新增 registry key |
| 工具注册 | `tools/register.ts` | 追加一行 |
| UI 组件 | `TriStateOutput`, `CopyButton` | 直接复用 |
| transform hook | `useLiveTransform`, `useMultiFieldTransform` | build 走前者 |
| 网络请求 | `@core/http` | ES 连接（v2） |

## 测试覆盖

必须补充的测试（`test/es-query-builder.test.ts`）：
1. **build**：单条件、嵌套 AND/OR、range 双值、in/terms 数组、exists/notExists
2. **parse round-trip**：DSL → 树 → DSL 幂等（golden test）
3. **代码生成**：6 语言各一条 golden 断言
4. **错误路径**：空树、range 非法值、嵌套超限
5. **边界**：字段含特殊字符、中文/emoji 值

## Implementation Tasks

### JSONL artifact 已写入 `.gstack/projects/a-tool-kit/tasks-ceo-review-*.jsonl`

从 CEO 审查继承的任务（T1-T6）已就绪，本 Eng Review 补充：
- 测试覆盖要求细化为上述 5 类用例
- 错误处理定为 invalid-input + position

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | 范围与战略 | 1 | CLEAN | 5 proposals, 5 accepted, 0 deferred |
| Eng Review | `/plan-eng-review` | 架构与测试 | 1 | CLEAN | 2 decisions, 0 unresolved |
| Codex Review | `/codex review` | 独立第二意见 | 3 | CLEAN | 质量 5/10 → 7/10 |

**VERDICT: CEO + ENG CLEARED — ready to implement**

NO UNRESOLVED DECISIONS
