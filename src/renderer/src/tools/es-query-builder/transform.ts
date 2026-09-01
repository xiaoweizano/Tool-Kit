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

// range 对象:逐边界字段按 fieldType 转换数值
const coerceRange = (v: RangeObj, type?: FieldType): RangeObj => {
  const out: RangeObj = {}
  for (const [k, val] of Object.entries(v)) {
    out[k as keyof RangeObj] = typeof val === 'string' ? coerce(val, type) : val
  }
  return out
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
    : typeof c.value === 'object' ? coerceRange(c.value as RangeObj, c.fieldType) : coerce(String(c.value), c.fieldType)
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

// parse/generate 在后续任务补齐
const parseLeaf = (node: Record<string, unknown>, id: string): Condition => {
  const key = Object.keys(node)[0]
  const body = node[key] as Record<string, unknown>
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
    const keys = ['gt', 'gte', 'lt', 'lte'].filter((k) => r[k as keyof RangeObj] !== undefined)
    const hasMulti = keys.length > 1
    const isNum = typeof Object.values(r)[0] === 'number'
    if (hasMulti) return { id, field: f, op: 'range', value: r, fieldType: isNum ? 'integer' : undefined }
    const op = keys[0] as ConditionOp
    const val = r[op as keyof RangeObj]
    return { id, field: f, op, value: String(val), fieldType: isNum ? 'integer' : undefined }
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
export function generateCode(dsl: string, lang: LangId): ToolResult<string> {
  let body: Record<string, unknown>
  try { body = JSON.parse(dsl) as Record<string, unknown> } catch {
    return { status: 'error', kind: 'invalid-input', message: 'DSL 语法错误' }
  }
  const queryStr = JSON.stringify(body)
  const idx = 'your_index'
  switch (lang) {
    case 'java':
      return { status: 'ok', data: `import co.elastic.clients.elasticsearch.ElasticsearchClient;\nimport co.elastic.clients.elasticsearch.core.SearchRequest;\nimport co.elastic.clients.json.JsonData;\n\n// 已构造查询体,可直接作为 source 传入\nSearchRequest req = SearchRequest.of(s -> s.index("${idx}").source(\n  JsonData.fromJson("${queryStr.replace(/"/g, '\\"')}"))\n);` }
    case 'python':
      return { status: 'ok', data: `from elasticsearch import Elasticsearch\n\nclient = Elasticsearch()  # 或传入 host/api_key\n\nresp = client.search(index="${idx}", body=${queryStr})\n# 同步调用;如需异步可换 AsyncElasticsearch 并 await client.search(...)` }
    case 'shell':
      return { status: 'ok', data: `curl -X POST "http://localhost:9200/${idx}/_search" \\\n  -H "Content-Type: application/json" \\\n  -d '${queryStr}'` }
    case 'http':
      return { status: 'ok', data: `POST /${idx}/_search HTTP/1.1\nHost: localhost:9200\nContent-Type: application/json\n\n${queryStr}` }
    case 'go':
      return { status: 'ok', data: `import "github.com/elastic/go-elasticsearch/v8"\nimport "strings"\n\n// v8 用 es.Search 传入 body(Body 读 io.Reader)\nreq := esapi.SearchRequest{Index: []string{"${idx}"}, Body: strings.NewReader(\`${queryStr}\`)}` }
    case 'node':
      return { status: 'ok', data: `import { Client } from '@elastic/elasticsearch'\n\nconst client = new Client({ node: 'http://localhost:9200' })\n\nawait client.search({ index: '${idx}', body: ${queryStr} })` }
    default:
      return { status: 'error', kind: 'unsupported', structure: lang, message: `暂不支持该语言:${lang}` }
  }
}

export function generateAllCodes(dsl: string): Record<LangId, string> {
  const langs: LangId[] = ['java', 'python', 'shell', 'http', 'go', 'node']
  const out = {} as Record<LangId, string>
  for (const l of langs) {
    const r = generateCode(dsl, l)
    out[l] = r.status === 'ok' ? r.data : ''
  }
  return out
}
