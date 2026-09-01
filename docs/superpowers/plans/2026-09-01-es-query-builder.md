# ES Query Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 ToolKit 新增第 13 个工具"ES 查询构造器"——可视化条件树构建 ES DSL JSON，支持 DSL 反向解析 round-trip 与 6 语言代码生成。

**Architecture:** 完全复用现有 ToolDescriptor + Worker 通道模式。核心为纯函数 transform（`buildQueryDsl`/`parseQueryDsl`/`generateCode`），经 `transform.worker.ts` 单 registry key + `opts.action` 分发。UI 层条件树用 React state 管理，build 走 `useLiveTransform` 防抖，parse/generate 走 `runTransform` 显式触发。值类型转换在 transform 层（UI 纯字符串）。

**Tech Stack:** TypeScript 5.6、React 18、Vitest 2.1、Comlink、Tailwind 4 + daisyUI 5、zustand 5。

## Global Constraints

- renderer 目录环境无关，E SLint 禁止 import electron（用 `window.toolkitAPI` 适配器）
- 所有 transform 返回 `ToolResult<T>` 判别联合，错误 kind 限 `invalid-input`/`partial`/`unsupported`/`engine`
- 值类型转换在 transform 层，UI 永远传字符串；golden test 输入统一字符串
- 条件树深度上限 10 层，超出返回 `unsupported`
- 中文 UI 文案，遵循 DESIGN.md 电路工作台风格
- 测试文件放 `test/` 目录，命名 `<tool>.test.ts`，纯函数直接 import 测试
- 工具注册在 `register.ts` + `transform.worker.ts` 各一行

---

### Task 1: 类型定义与核心 transform 骨架

**Files:**
- Create: `src/renderer/src/tools/es-query-builder/types.ts`
- Create: `src/renderer/src/tools/es-query-builder/transform.ts`

**Interfaces:**
- Consumes: `ToolResult` from `@core/types`
- Produces:
  - `type ConditionOp` = `'eq'|'ne'|'gt'|'gte'|'lt'|'lte'|'contains'|'notContains'|'match'|'range'|'in'|'notIn'|'exists'|'notExists'`
  - `type FieldType` = `'text'|'keyword'|'integer'|'float'|'date'|'boolean'`
  - `type RangeObj` = `{ gte?: string|number; lte?: string|number; gt?: string|number; lt?: string|number }`
  - `interface Condition` = `{ id: string; field: string; op: ConditionOp; value: string|number|string[]|RangeObj; fieldType?: FieldType; children?: Condition[]; logic?: 'and'|'or'; minShouldMatch?: number }`
  - `interface EsQueryState` = `{ rootCondition: Condition; indexName: string; from?: number; size?: number }`
  - `interface LangId` = `'java'|'python'|'shell'|'http'|'go'|'node'`
  - `function buildQueryDsl(state: EsQueryState): ToolResult<string>`
  - `function parseQueryDsl(dsl: string): ToolResult<EsQueryState>`
  - `function generateCode(dsl: string, lang: LangId): ToolResult<string>`
  - `function generateAllCodes(dsl: string): Record<LangId, string>`

- [ ] **Step 1: 写 failing 测试（build 单条件）**

`test/es-query-builder.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildQueryDsl, parseQueryDsl, generateCode } from '@tools/es-query-builder/transform'
import type { EsQueryState } from '@tools/es-query-builder/types'

const state = (root: EsQueryState['rootCondition']): EsQueryState => ({
  rootCondition: root, indexName: 'products', from: 0, size: 10
})

describe('buildQueryDsl 单条件', () => {
  it('eq 转 term', () => {
    const r = buildQueryDsl(state({ id: 'c1', field: 'status', op: 'eq', value: 'active' }))
    expect(r).toEqual({ status: 'ok', data: JSON.stringify({ query: { term: { status: 'active' } }, from: 0, size: 10 }, null, 2) })
  })
  it('gt 数字字段转 range', () => {
    const r = buildQueryDsl(state({ id: 'c2', field: 'price', op: 'gt', value: '100', fieldType: 'integer' }))
    expect(r).toEqual({ status: 'ok', data: JSON.stringify({ query: { range: { price: { gt: 100 } } }, from: 0, size: 10 }, null, 2) })
  })
  it('空条件树返回 invalid-input', () => {
    const r = buildQueryDsl(state({ id: 'root', field: '', op: 'eq', value: '', children: [], logic: 'and' }))
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test -- es-query-builder.test.ts`
Expected: FAIL with "Cannot find module '@tools/es-query-builder/transform'"

- [ ] **Step 3: 写 types.ts**

```ts
export type ConditionOp =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'notContains' | 'match' | 'range'
  | 'in' | 'notIn' | 'exists' | 'notExists'

export type FieldType = 'text' | 'keyword' | 'integer' | 'float' | 'date' | 'boolean'

export type RangeObj = { gte?: string | number; lte?: string | number; gt?: string | number; lt?: string | number }

export interface Condition {
  id: string
  field: string
  op: ConditionOp
  value: string | number | string[] | RangeObj
  fieldType?: FieldType
  children?: Condition[]
  logic?: 'and' | 'or'
  minShouldMatch?: number
}

export interface EsQueryState {
  rootCondition: Condition
  indexName: string
  from?: number
  size?: number
}

export type LangId = 'java' | 'python' | 'shell' | 'http' | 'go' | 'node'

export const MAX_DEPTH = 10
export const EMPTY_CONDITION: Condition = { id: 'root', field: '', op: 'eq', value: '', children: [], logic: 'and' }
```

- [ ] **Step 4: 写 transform.ts 骨架（build 单条件 + 值转换）**

```ts
import type { ToolResult } from '@core/types'
import type { Condition, ConditionOp, EsQueryState, FieldType, LangId, RangeObj } from './types'
import { MAX_DEPTH } from './types'

// 值类型转换(transform 层):数字字段 "100" → 100;其它类型保留字符串
const coerce = (value: string, type?: FieldType): string | number => {
  if (type === 'integer' || type === 'float') {
    const n = Number(value)
    if (!Number.isNaN(n) && value.trim() !== '') return n
  }
  return value
}

const LEAF_OPS: Record<ConditionOp, (field: string, value: unknown) => unknown> = {
  eq: (f, v) => ({ term: { [f]: v } }),
  ne: (f, v) => ({ bool: { must_not: [{ term: { [f]: v } }] } }),
  gt: (f, v) => ({ range: { [f]: { gt: v } } }),
  gte: (f, v) => ({ range: { [f]: { gte: v } } }),
  lt: (f, v) => ({ range: { [f]: { lt: v } } }),
  lte: (f, v) => ({ range: { [f]: { lte: v } } }),
  contains: (f, v) => ({ wildcard: { [f]: { value: `*${v}*` } } }),
  notContains: (f, v) => ({ bool: { must_not: [{ wildcard: { [f]: { value: `*${v}*` } } }] } }),
  match: (f, v) => ({ match: { [f]: v } }),
  range: (f, v) => ({ range: { [f]: v } }),
  in: (f, v) => ({ terms: { [f]: v } }),
  notIn: (f, v) => ({ bool: { must_not: [{ terms: { [f]: v } }] } }),
  exists: (f) => ({ exists: { field: f } }),
  notExists: (f) => ({ bool: { must_not: [{ exists: { field: f } }] } })
}

const toLeaf = (c: Condition): unknown => {
  if (c.op === 'exists' || c.op === 'notExists') return LEAF_OPS[c.op](c.field, undefined)
  const v = Array.isArray(c.value)
    ? c.value
    : typeof c.value === 'object' ? c.value : coerce(String(c.value), c.fieldType)
  return LEAF_OPS[c.op](c.field, v)
}

const depth = (c: Condition): number => {
  if (!c.children || c.children.length === 0) return 1
  return 1 + Math.max(...c.children.map(depth))
}

const toBoolQuery = (c: Condition): unknown => {
  const logic = c.logic ?? 'and'
  const children = (c.children ?? []).map((child) =>
    child.children && child.children.length > 0 ? toBoolQuery(child) : toLeaf(child)
  )
  const bool: Record<string, unknown> = {}
  if (logic === 'or') {
    bool.should = children
    if (c.minShouldMatch !== undefined) bool.minimum_should_match = c.minShouldMatch
  } else {
    bool.must = children
  }
  return { bool }
}

export function buildQueryDsl(state: EsQueryState): ToolResult<string> {
  const root = state.rootCondition
  const hasLeaf = (c: Condition): boolean => !!c.field.trim()
  if (!hasLeaf(root) && (!root.children || root.children.length === 0))
    return { status: 'error', kind: 'invalid-input', message: '至少需要一个条件' }
  if (depth(root) > MAX_DEPTH)
    return { status: 'error', kind: 'unsupported', structure: '嵌套', message: `条件嵌套超过 ${MAX_DEPTH} 层,请拆分查询` }

  const query = root.children && root.children.length > 0 ? toBoolQuery(root) : toLeaf(root)
  const body: Record<string, unknown> = { query }
  if (state.from !== undefined) body.from = state.from
  if (state.size !== undefined) body.size = state.size
  return { status: 'ok', data: JSON.stringify(body, null, 2) }
}
```

（`parseQueryDsl`/`generateCode`/`generateAllCodes` 在后续任务导入时再实现——本任务先导出占位类型与 build，避免任务间未定义引用。）

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm test -- es-query-builder.test.ts`
Expected: PASS (3 assertions)

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/es-query-builder/types.ts src/renderer/src/tools/es-query-builder/transform.ts test/es-query-builder.test.ts
git commit -m "feat(es-query-builder): types + buildQueryDsl 单条件/值转换/空态"
```

---

### Task 2: build 完整操作符覆盖与嵌套

**Files:**
- Modify: `src/renderer/src/tools/es-query-builder/transform.ts`
- Modify: `test/es-query-builder.test.ts`

**Interfaces:**
- Consumes: `buildQueryDsl` (Task 1), `ConditionOp` 全集
- Produces: 无新导出；增强 `buildQueryDsl` 对 range 双值、terms 数组、exists/notExists、嵌套 AND/OR 的支持

- [ ] **Step 1: 追加 failing 测试（嵌套/range/terms）**

```ts
describe('buildQueryDsl 嵌套与完整操作符', () => {
  it('嵌套 AND/OR 输出 bool', () => {
    const root: EsQueryState['rootCondition'] = {
      id: 'root', field: '', op: 'eq', value: '', logic: 'and', children: [
        { id: 'c1', field: 'status', op: 'eq', value: 'active' },
        { id: 'g1', field: '', op: 'eq', value: '', logic: 'or', children: [
          { id: 'c2', field: 'category', op: 'eq', value: 'electronics' },
          { id: 'c3', field: 'price', op: 'range', value: { gte: '100', lt: '200' }, fieldType: 'integer' }
        ] }
      ]
    }
    const r = buildQueryDsl(state(root))
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(JSON.parse(r.data)).toEqual({
      query: { bool: { must: [
        { term: { status: 'active' } },
        { bool: { should: [
          { term: { category: 'electronics' } },
          { range: { price: { gte: 100, lt: 200 } } }
        ] } }
      ] } }, from: 0, size: 10
    })
  })
  it('in 转 terms 数组', () => {
    const r = buildQueryDsl(state({ id: 'c1', field: 'category', op: 'in', value: ['a', 'b', 'c'] }))
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(JSON.parse(r.data).query).toEqual({ terms: { category: ['a', 'b', 'c'] } })
  })
  it('exists/notExists 无值', () => {
    const r = buildQueryDsl(state({ id: 'c1', field: 'deleted_at', op: 'notExists', value: '' }))
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(JSON.parse(r.data).query).toEqual({ bool: { must_not: [{ exists: { field: 'deleted_at' } }] } })
  })
  it('嵌套超 10 层回报 unsupported', () => {
    let node: EsQueryState['rootCondition'] = { id: 'n0', field: 'a', op: 'eq', value: '1' }
    for (let i = 1; i < 12; i++) node = { id: `n${i}`, field: '', op: 'eq', value: '', logic: 'and', children: [node] }
    const r = buildQueryDsl(state(node))
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('unsupported')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test -- es-query-builder.test.ts`
Expected: FAIL (嵌套/terms/exists 断言不通过)

- [ ] **Step 3: 补全 build 实现**

在 transform.ts 的 `coerce` 后补充 range/terms 值规整，并确认 `toLeaf`/`toBoolQuery` 已覆盖（Task 1 已写，这里仅需让 `value` 联合类型正确传递）。若 `Array.isArray(c.value)` / 对象值已处理则无需改动——Task 1 骨架已含。本步确认测试绿。

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test -- es-query-builder.test.ts`
Expected: PASS (7 assertions)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/es-query-builder/transform.ts test/es-query-builder.test.ts
git commit -m "feat(es-query-builder): build 嵌套 AND/OR + terms + exists + 深度限制"
```

---

### Task 3: DSL 反向解析 parseQueryDsl

**Files:**
- Modify: `src/renderer/src/tools/es-query-builder/transform.ts`
- Modify: `test/es-query-builder.test.ts`

**Interfaces:**
- Consumes: `Condition`/`EsQueryState`/`ConditionOp`/`RangeObj` (types.ts)
- Produces: `parseQueryDsl(dsl: string): ToolResult<EsQueryState>` — 支持 bool must/should/must_not、term、range、match、wildcard、terms、exists；不支持节点→只读标记

- [ ] **Step 1: 写 failing 测试（parse round-trip）**

```ts
describe('parseQueryDsl 反向解析', () => {
  it('term 转条件树可回填', () => {
    const r = parseQueryDsl(JSON.stringify({ query: { term: { status: 'active' } } }))
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data.rootCondition).toMatchObject({ field: 'status', op: 'eq', value: 'active' })
  })
  it('bool should 转嵌套 or 分组', () => {
    const r = parseQueryDsl(JSON.stringify({ query: { bool: { should: [{ term: { a: '1' } }, { term: { b: '2' } }] } } }))
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const rc = r.data.rootCondition
      expect(rc.logic).toBe('or')
      expect(rc.children).toHaveLength(2)
    }
  })
  it('非法 DSL 报 invalid-input + position', () => {
    const r = parseQueryDsl('{ not json')
    expect(r.status).toBe('error')
    if (r.status === 'error') { expect(r.kind).toBe('invalid-input'); expect(r.position).toBeTypeOf('number') }
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test -- es-query-builder.test.ts`
Expected: FAIL (parseQueryDsl not exported)

- [ ] **Step 3: 实现 parseQueryDsl**

```ts
const parseLeaf = (node: Record<string, unknown>, id: string): Condition => {
  const key = Object.keys(node)[0]
  const body = node[key] as Record<string, unknown>
  // 逆映射:term→eq, range→gt/gte/lt/lte/range, wildcard→contains, terms→in, exists→exists
  if (key === 'term') {
    const f = Object.keys(body)[0]; const v = body[f]
    return { id, field: f, op: 'eq', value: String(v), fieldType: typeof v === 'number' ? 'integer' : undefined }
  }
  if (key === 'terms') {
    const f = Object.keys(body)[0]; const v = body[f] as unknown[]
    return { id, field: f, op: 'in', value: v.map(String) }
  }
  if (key === 'wildcard') {
    const f = Object.keys(body)[0]; const raw = body[f] as Record<string, unknown>
    const v = String(raw.value ?? '').replace(/^\*|\*$/g, '')
    return { id, field: f, op: 'contains', value: v }
  }
  if (key === 'exists') {
    return { id, field: String(body.field), op: 'exists', value: '' }
  }
  if (key === 'range') {
    const f = Object.keys(body)[0]; const r = body[f] as RangeObj
    const hasMulti = ['gt', 'gte', 'lt', 'lte'].filter((k) => r[k as keyof RangeObj] !== undefined).length > 1
    return { id, field: f, op: hasMulti ? 'range' : (Object.keys(r)[0] as ConditionOp), value: hasMulti ? r : String(Object.values(r)[0]), fieldType: typeof Object.values(r)[0] === 'number' ? 'integer' : undefined }
  }
  if (key === 'match') {
    const f = Object.keys(body)[0]
    return { id, field: f, op: 'match', value: String(body[f]) }
  }
  if (key === 'bool') {
    const logic = body.should ? 'or' : 'and'
    const childrenArr = (body.should ?? body.must ?? body.filter ?? []) as Record<string, unknown>[]
    const children = childrenArr.map((child, i) => parseNode(child, `${id}-${i}`))
    return { id, field: '', op: 'eq', value: '', logic, children, minShouldMatch: body.minimum_should_match as number | undefined }
  }
  return { id, field: key, op: 'eq', value: JSON.stringify(body), readonly: true }
}

const parseNode = (node: Record<string, unknown>, id: string): Condition => parseLeaf(node, id)

export function parseQueryDsl(dsl: string): ToolResult<EsQueryState> {
  let parsed: unknown
  try { parsed = JSON.parse(dsl) } catch (e) {
    const pos = Number((/position (\d+)/.exec((e as Error).message)?.[1] ?? '0'))
    return { status: 'error', kind: 'invalid-input', message: 'DSL 语法错误', position: pos }
  }
  const q = (parsed as Record<string, unknown>)?.query as Record<string, unknown> | undefined
  if (!q) return { status: 'error', kind: 'invalid-input', message: '缺少 query 字段' }
  const root = parseNode(structuredClone(q) as Record<string, unknown>, 'root')
  return { status: 'ok', data: { rootCondition: root, indexName: '' } }
}
```

> `Condition` 类型需给 `readonly?: boolean` 标注（只读叶节点）。在 types.ts 补:  `readonly?: boolean`。

- [ ] **Step 4: 补 Condition.readonly 字段**

在 `types.ts` 的 `Condition` 接口加 `readonly?: boolean`。

- [ ] **Step 5: 运行确认通过**

Run: `pnpm test -- es-query-builder.test.ts`
Expected: PASS (10 assertions)

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/es-query-builder/types.ts src/renderer/src/tools/es-query-builder/transform.ts test/es-query-builder.test.ts
git commit -m "feat(es-query-builder): parseQueryDsl 反向解析支持 bool/term/range/terms"
```

---

### Task 4: 多语言代码生成 generateCode + generateAllCodes

**Files:**
- Modify: `src/renderer/src/tools/es-query-builder/transform.ts`
- Modify: `test/es-query-builder.test.ts`

**Interfaces:**
- Consumes: `LangId` (types.ts)
- Produces: `generateCode(dsl: string, lang: LangId): ToolResult<string>`、`generateAllCodes(dsl: string): Record<LangId, string>`

- [ ] **Step 1: 写 failing 测试（6 语言 golden）**

```ts
describe('generateCode 多语言', () => {
  const dsl = JSON.stringify({ query: { term: { status: 'active' } } })
  it('java 生成 RestClient', () => {
    const r = generateCode(dsl, 'java')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { expect(r.data).toContain('SearchRequest'); expect(r.data).toContain('status') }
  })
  it('python 生成 sync', () => {
    const r = generateCode(dsl, 'python')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { expect(r.data).toContain('client.search'); expect(r.data).not.toContain('async') }
  })
  it('shell 生成 curl', () => {
    const r = generateCode(dsl, 'shell')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data).toContain('curl')
  })
  it('http 生成 raw POST', () => {
    const r = generateCode(dsl, 'http')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { expect(r.data).toContain('POST'); expect(r.data).toContain('_search') }
  })
  it('go v8 生成 esapi.Search', () => {
    const r = generateCode(dsl, 'go')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { expect(r.data).toContain('esapi.SearchRequest'); expect(r.data).toContain('v8') }
  })
  it('node 生成 client.search', () => {
    const r = generateCode(dsl, 'node')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { expect(r.data).toContain('client.search'); expect(r.data).toContain('@elastic/elasticsearch') }
  })
  it('不支持的 lang 报 unsupported', () => {
    const r = generateCode(dsl, 'ruby' as LangId)
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('unsupported')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test -- es-query-builder.test.ts`
Expected: FAIL (generateCode not exported)

- [ ] **Step 3: 实现 generateCode + generateAllCodes**

```ts
export function generateCode(dsl: string, lang: LangId): ToolResult<string> {
  const body = JSON.parse(dsl) as Record<string, unknown>
  const queryStr = JSON.stringify(body)
  const idx = 'your_index'
  switch (lang) {
    case 'java':
      return { status: 'ok', data: `import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.json.JsonData;

// 已构造查询体,可直接作为 source 传入
SearchRequest req = SearchRequest.of(s -> s.index("${idx}").source(
  JsonData.fromJson("${queryStr.replace(/"/g, '\\"')}"))
);` }
    case 'python':
      return { status: 'ok', data: `from elasticsearch import Elasticsearch

client = Elasticsearch()  # 或传入 host/api_key

resp = client.search(index="${idx}", body=${queryStr})
# 同步调用;如需异步可换 AsyncElasticsearch 并 await client.search(...)` }
    case 'shell':
      return { status: 'ok', data: `curl -X POST "http://localhost:9200/${idx}/_search" \\
  -H "Content-Type: application/json" \\
  -d '${queryStr}'` }
    case 'http':
      return { status: 'ok', data: `POST /${idx}/_search HTTP/1.1
Host: localhost:9200
Content-Type: application/json

${queryStr}` }
    case 'go':
      return { status: 'ok', data: `import "github.com/elastic/go-elasticsearch/v8"
import "strings"

es, _ := elasticsearch.NewClient(elasticsearch.Config{})
// v8 用 es.Search 传入 body(Body 读 io.Reader)
req := esapi.SearchRequest{Index: []string{"${idx}"}, Body: strings.NewReader(\`${queryStr}\`)}` }
    case 'node':
      return { status: 'ok', data: `import { Client } from '@elastic/elasticsearch'

const client = new Client({ node: 'http://localhost:9200' })

await client.search({ index: '${idx}', body: ${queryStr} })` }
    default:
      return { status: 'error', kind: 'unsupported', structure: lang, message: `暂不支持该语言:${lang}` }
  }
}

export function generateAllCodes(dsl: string): Record<LangId, string> {
  return Object.fromEntries((['java', 'python', 'shell', 'http', 'go', 'node'] as LangId[]).map((l) => [l, generateCode(dsl, l).status === 'ok' ? (generateCode(dsl, l) as { data: string }).data : '']))
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test -- es-query-builder.test.ts`
Expected: PASS (17 assertions)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/es-query-builder/transform.ts test/es-query-builder.test.ts
git commit -m "feat(es-query-builder): 6 语言代码生成 generateCode/generateAllCodes"
```

---

### Task 5: Worker 注册与工具注册

**Files:**
- Modify: `src/renderer/src/core/transform.worker.ts`
- Modify: `src/renderer/src/tools/register.ts`
- Create: `src/renderer/src/tools/es-query-builder/icon.tsx`

**Interfaces:**
- Consumes: `buildQueryDsl`/`parseQueryDsl`/`generateCode` from `@tools/es-query-builder/transform`
- Produces: registry key `es-query-builder` (opts.action 分发)；ToolDescriptor 注册

- [ ] **Step 1: worker 注册**

`transform.worker.ts` 顶部 import 后追加:
```ts
import { buildQueryDsl, parseQueryDsl, generateCode } from '@tools/es-query-builder/transform'
```
registry 注册（在 `registry.set('batch-transform', ...)` 后）:
```ts
registry.set('es-query-builder', ((input: unknown, opts?: TransformOpts) => {
  const action = opts?.action ?? 'build'
  if (action === 'parse') return parseQueryDsl(input as string)
  if (action === 'generate') return generateCode(input as string, (opts?.lang as TransformOpts) ?? 'java' as never)
  return buildQueryDsl(input as never)
}) as Transform<unknown, unknown, TransformOpts>)
```

- [ ] **Step 2: 注册工具**

`register.ts` 顶部 import:
```ts
import { EsIcon } from '@tools/es-query-builder/icon'
const EsQueryBuilderPageLazy = lazy(() => import('@tools/es-query-builder'))
```
`tools` 数组追加:
```ts
{
  id: 'es-query-builder', name: 'ES 查询构造', icon: EsIcon,
  route: '/tools/es-query-builder', component: EsQueryBuilderPageLazy,
  capability: { offline: true }
}
```

- [ ] **Step 3: 写 icon.tsx**

```tsx
export function EsIcon(): JSX.Element {
  return <span className="font-mono text-[13px] font-bold">ES</span>
}
```

- [ ] **Step 4: 运行类型检查 + 现有测试回归**

Run: `pnpm typecheck && pnpm test`
Expected: PASS (既有用例 + 新增 transform 用例，register/worker 无类型错误)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/core/transform.worker.ts src/renderer/src/tools/register.ts src/renderer/src/tools/es-query-builder/icon.tsx
git commit -m "feat(es-query-builder): worker + register 注册工具"
```

---

### Task 6: 递归条件树组件

**Files:**
- Create: `src/renderer/src/tools/es-query-builder/components/ConditionNode.tsx`
- Create: `src/renderer/src/tools/es-query-builder/components/ConditionTree.tsx`

**Interfaces:**
- Consumes: `Condition`/`ConditionOp`/`FieldType` (types.ts)
- Produces:
  - `ConditionNode({ node, onChange, onRemove, onMove, depth })` — 单条件/分组编辑器
  - `ConditionTree({ root, onChange })` — 递归容器，暴露增删改 move 回调

- [ ] **Step 1: 写 ConditionTree.tsx（递归容器）**

```tsx
import type { Condition, ConditionOp } from '../types'
import { ConditionNode } from './ConditionNode'

const OPS: { id: ConditionOp; label: string }[] = [
  { id: 'eq', label: '=' }, { id: 'ne', label: '≠' }, { id: 'gt', label: '>' }, { id: 'gte', label: '≥' },
  { id: 'lt', label: '<' }, { id: 'lte', label: '≤' }, { id: 'contains', label: '包含' }, { id: 'notContains', label: '不包含' },
  { id: 'match', label: '匹配' }, { id: 'range', label: '范围' }, { id: 'in', label: '在列表' }, { id: 'notIn', label: '不在列表' },
  { id: 'exists', label: '存在' }, { id: 'notExists', label: '不存在' }
]

interface Props { root: Condition; onChange: (next: Condition) => void }

export function ConditionTree({ root, onChange }: Props): JSX.Element {
  return (
    <ConditionNode
      node={root}
      depth={0}
      onChange={onChange}
      onRemove={() => { /* root 不可删 */ }}
      onMove={() => { /* root 不可移 */ }}
    />
  )
}

export { OPS }
```

- [ ] **Step 2: 写 ConditionNode.tsx（递归节点）**

```tsx
import type { Condition, ConditionOp, FieldType } from '../types'

interface Props {
  node: Condition
  depth: number
  onChange: (next: Condition) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}

const FIELD_TYPES: FieldType[] = ['text', 'keyword', 'integer', 'float', 'date', 'boolean']

function isGroup(c: Condition): boolean { return !!c.children && c.children.length > 0 }

export function ConditionNode({ node, depth, onChange, onRemove, onMove }: Props): JSX.Element {
  const isGroupNode = isGroup(node)

  const updateChild = (i: number, child: Condition): void => {
    const children = (node.children ?? []).map((c, j) => (j === i ? child : c))
    onChange({ ...node, children })
  }
  const addChild = (): void => {
    const children = [...(node.children ?? []), { id: crypto.randomUUID(), field: '', op: 'eq' as ConditionOp, value: '' }]
    onChange({ ...node, children })
  }
  const addGroup = (): void => {
    const children = [...(node.children ?? []), { id: crypto.randomUUID(), field: '', op: 'eq' as ConditionOp, value: '', logic: 'and' as 'and'|'or', children: [] }]
    onChange({ ...node, children })
  }
  const removeChild = (i: number): void => {
    onChange({ ...node, children: (node.children ?? []).filter((_, j) => j !== i) })
  }
  const moveChild = (i: number, dir: -1 | 1): void => {
    const j = i + dir; if (j < 0 || j >= (node.children?.length ?? 0)) return
    const children = [...(node.children ?? [])]; [children[i], children[j]] = [children[j], children[i]]
    onChange({ ...node, children })
  }

  return (
    <div className="border border-base-300 bg-base-100/60 p-3" style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      {isGroupNode ? (
        <>
          <div className="mb-2 flex items-center gap-2">
            <select className="select select-bordered select-xs font-mono" value={node.logic ?? 'and'}
              onChange={(e) => onChange({ ...node, logic: e.target.value as 'and' | 'or' })}>
              <option value="and">AND</option><option value="or">OR</option>
            </select>
            <button className="btn btn-ghost btn-xs" onClick={addChild}>+ 条件</button>
            <button className="btn btn-ghost btn-xs" onClick={addGroup}>+ 分组</button>
          </div>
          {(node.children ?? []).map((child, i) => (
            <ConditionNode key={child.id} node={child} depth={depth + 1}
              onChange={(c) => updateChild(i, c)}
              onRemove={() => removeChild(i)}
              onMove={(dir) => moveChild(i, dir)} />
          ))}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input className="input input-bordered input-xs w-32 font-mono" placeholder="字段"
            value={node.field} onChange={(e) => onChange({ ...node, field: e.target.value })} />
          <select className="select select-bordered select-xs font-mono" value={node.op}
            onChange={(e) => onChange({ ...node, op: e.target.value as ConditionOp })}>
            {OPS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          {node.op !== 'exists' && node.op !== 'notExists' && (
            <input className="input input-bordered input-xs w-40 font-mono" placeholder="值"
              value={typeof node.value === 'string' ? node.value : ''}
              onChange={(e) => onChange({ ...node, value: e.target.value })} />
          )}
          <select className="select select-bordered select-xs font-mono" value={node.fieldType ?? ''}
            onChange={(e) => onChange({ ...node, fieldType: (e.target.value || undefined) as FieldType | undefined })}>
            <option value="">类型</option>
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="ml-auto flex gap-1">
            <button className="btn btn-ghost btn-xs" onClick={() => onMove(-1)}>↑</button>
            <button className="btn btn-ghost btn-xs" onClick={() => onMove(1)}>↓</button>
            <button className="btn btn-ghost btn-xs text-error" onClick={onRemove}>✕</button>
          </span>
        </div>
      )}
    </div>
  )
}

export { FIELD_TYPES, isGroup }
```

> 注意:需在 ConditionTree.tsx 中 `import { OPS }` 已被 ConditionNode 引用。为避免循环，把 `OPS`/`FIELD_TYPES` 定义移到 `components/constants.ts`，两边 import。

- [ ] **Step 3: 抽 constants 避免循环导入**

Create `src/renderer/src/tools/es-query-builder/components/constants.ts`:
```ts
import type { ConditionOp, FieldType } from '../types'
export const OPS: { id: ConditionOp; label: string }[] = [ /* 同 Task6 Step1 的 OPS */ ]
export const FIELD_TYPES: FieldType[] = ['text', 'keyword', 'integer', 'float', 'date', 'boolean']
```
ConditionTree.tsx 与 ConditionNode.tsx 均改从 `./constants` import。

- [ ] **Step 4: 运行类型检查**

Run: `pnpm typecheck`
Expected: PASS (组件类型无误)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/es-query-builder/components/
git commit -m "feat(es-query-builder): 递归条件树组件 ConditionNode/ConditionTree"
```

---

### Task 7: 页面组件与代码输出

**Files:**
- Create: `src/renderer/src/tools/es-query-builder/index.tsx`
- Create: `src/renderer/src/tools/es-query-builder/components/CodeOutput.tsx`

**Interfaces:**
- Consumes: `buildQueryDsl`/`runTransform`、`ConditionTree`、`CopyButton`、`TriStateOutput`、`generateAllCodes`
- Produces: `EsQueryBuilderPage` (default export，供 register.ts lazy import)

- [ ] **Step 1: 写 CodeOutput.tsx（6 语言 Tab）**

```tsx
import { useState } from 'react'
import type { LangId } from '../types'
import { CopyButton } from '@components/CopyButton'

const LANGS: { id: LangId; label: string }[] = [
  { id: 'java', label: 'Java' }, { id: 'python', label: 'Python' }, { id: 'shell', label: 'Shell' },
  { id: 'http', label: 'HTTP' }, { id: 'go', label: 'Go' }, { id: 'node', label: 'Node' }
]

interface Props { codes: Record<LangId, string> }

export function CodeOutput({ codes }: Props): JSX.Element {
  const [lang, setLang] = useState<LangId>('java')
  const text = codes[lang] ?? ''
  return (
    <section className="border border-base-300 bg-base-200/40">
      <div className="flex items-center gap-1 border-b border-base-300 px-3 py-2">
        <span className="font-mono text-[11px] tracking-widest text-neutral">CODE ·</span>
        {LANGS.map((l) => (
          <button key={l.id} className={`btn btn-xs font-mono ${lang === l.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setLang(l.id)}>{l.label}</button>
        ))}
        <CopyButton getText={() => text} enabled={text.length > 0} />
      </div>
      <pre className="max-h-80 overflow-auto p-4 font-mono text-[13px] leading-[22px] whitespace-pre">{text}</pre>
    </section>
  )
}
```

- [ ] **Step 2: 写 index.tsx**

```tsx
import { useEffect, useMemo, useState } from 'react'
import type { Condition, EsQueryState, LangId } from './types'
import { EMPTY_CONDITION } from './types'
import { buildQueryDsl, generateAllCodes } from './transform'
import { runTransform } from '@core/transform.channel'
import type { ToolResult } from '@core/types'
import { ConditionTree } from './components/ConditionTree'
import { CodeOutput } from './components/CodeOutput'

export default function EsQueryBuilderPage(): JSX.Element {
  const [tree, setTree] = useState<Condition>(EMPTY_CONDITION)
  const [indexName, setIndexName] = useState('products')
  const [from, setFrom] = useState('0')
  const [size, setSize] = useState('10')
  const [dsl, setDsl] = useState<ToolResult<string> | null>(null)
  const [codes, setCodes] = useState<Record<LangId, string> | null>(null)

  // build 走本地 runTransform(或直接调纯函数);这里直接调纯函数,保 UI 即时
  const built = useMemo(() => buildQueryDsl({ rootCondition: tree, indexName, from: Number(from) || 0, size: Number(size) || 10 }), [tree, indexName, from, size])
  useEffect(() => {
    if (built.status === 'ok') {
      setDsl(built)
      setCodes(generateAllCodes(built.data))
    } else { setDsl(built); setCodes(null) }
  }, [built])

  // 粘贴 DSL → parse(经 worker)
  const onPasteDsl = (raw: string): void => {
    void runTransform('es-query-builder', raw, { action: 'parse' }).then((r) => {
      if (r.status === 'ok') { setTree((r as ToolResult<EsQueryState> & { status: 'ok' }).data.rootCondition) }
    })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">ES 查询构造</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">ELASTICSEARCH · QUERY BUILDER</span>
      </header>
      <section className="border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">INPUT · 条件树</span>
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <input className="input input-bordered input-xs w-40 font-mono" placeholder="索引名" value={indexName} onChange={(e) => setIndexName(e.target.value)} />
            <label className="flex items-center gap-1 text-sm text-neutral font-mono">from<input className="input input-bordered input-xs w-16 font-mono" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="flex items-center gap-1 text-sm text-neutral font-mono">size<input className="input input-bordered input-xs w-16 font-mono" value={size} onChange={(e) => setSize(e.target.value)} /></label>
            <button className="btn btn-ghost btn-xs ml-auto" onClick={() => setTree(EMPTY_CONDITION)}>重置</button>
          </div>
          <ConditionTree root={tree} onChange={setTree} />
        </div>
      </section>
      <div className="py-3">
        <span className="font-mono text-[11px] tracking-widest text-neutral">OUTPUT · JSON DSL</span>
        <textarea className="mt-2 w-full h-40 border border-base-300 bg-base-200/40 p-4 font-mono text-[13px] leading-relaxed"
          placeholder="粘贴已有 DSL 到此,点右侧解析回填上方树…"
          onChange={(e) => onPasteDsl(e.target.value)} />
      </div>
      {dsl && codes && (
        <>
          <pre className="border border-base-300 bg-base-200/40 p-4 font-mono text-[13px] leading-[22px] whitespace-pre max-h-96 overflow-auto">{dsl.status === 'ok' ? dsl.data : dsl.message}</pre>
          <CodeOutput codes={codes} />
        </>
      )}
    </div>
  )
}

export { EsQueryBuilderPage }
```

> 修正:粘贴 DSL 的 onPasteDsl 不应在 textarea onChange 里每次触发(会反复 parse)。改为点击按钮触发。调整:加一个「解析」按钮,onClick 读 textarea 的值 parse。

- [ ] **Step 3: 修正粘贴 DSL 为按钮触发**

在 `index.tsx` 用 `useState<string>` 存 `pasteText`，一个「解析回填」按钮 `onClick={() => parseText(pasteText)}`，替换 onChange 触发。

- [ ] **Step 4: 运行类型检查 + 手动 smoke**

Run: `pnpm typecheck && pnpm dev:web`
Expected: 浏览器打开 `/tools/es-query-builder`，看到树编辑 + DSL + 代码 Tab

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/es-query-builder/index.tsx src/renderer/src/tools/es-query-builder/components/CodeOutput.tsx
git commit -m "feat(es-query-builder): 页面组件 + 代码输出 Tab"
```

---

### Task 8: 完整回归与 spec 核对

**Files:**
- Modify: `docs/spec-checklist-es-query-builder.md` (Create)
- Verify: `pnpm typecheck && pnpm lint && pnpm test`

**Interfaces:**
- Consumes: 全部前期任务
- Produces: spec-checklist 记录每个 Scenario 的验证结果

- [ ] **Step 1: 写 spec-checklist**

Create `docs/spec-checklist-es-query-builder.md`，逐条列出 `specs/es-query-builder-tool/spec.md` 的 6 Requirement × 18 Scenario，每项标注验证方式（自动化测试 / 静态核验 / 待人工）。

- [ ] **Step 2: 全量回归**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: 全绿（既有 ~217 + 新增 es-query-builder 用例）

- [ ] **Step 3: Commit**

```bash
git add docs/spec-checklist-es-query-builder.md
git commit -m "docs: spec-checklist for es-query-builder-tool, full regression green"
```

---

## Self-Review

**Spec coverage:**
- 可视化条件树 → Task 6（ConditionTree/ConditionNode）
- DSL 结构化输出 → Task 1/2（buildQueryDsl，含 from/size）
- DSL 反向解析 round-trip → Task 3（parseQueryDsl）
- 值类型转换 transform 层 → Task 1（coerce）
- 多语言代码生成 → Task 4（generateCode/generateAllCodes）
- 错误三态无静默失败 → Task 1/2/3 全部返回 ToolResult 三态

**Type consistency:** `ConditionOp`/`FieldType`/`RangeObj`/`LangId`/`EsQueryState` 在各任务一致；`buildQueryDsl`/`parseQueryDsl`/`generateCode` 签名跨任务一致。`ToolResult` 判别联合、position/failedItems 字段沿用 `@core/types`。

**Notes:**
- `generateAllCodes` 每次调 `generateCode` 两次（status 检查 + data 取）——为效率可改为一次循环内判断；实现时用 `generateCode(dsl, l).status === 'ok' ? ... : ''` 的极简写法即可，风险低。
- `Condition.readonly` 在 Task 3 补齐；`OPS/FIELD_TYPES` 抽到 `components/constants.ts` 避免循环导入（Task 6 Step 3）。

Edge cases 已由测试覆盖：空树、值转换、嵌套超限、非法 DSL、不支持的 lang。
