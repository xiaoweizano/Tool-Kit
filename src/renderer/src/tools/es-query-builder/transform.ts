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

// parse/generate 在后续任务补齐
export function parseQueryDsl(_dsl: string): ToolResult<EsQueryState> {
  return { status: 'error', kind: 'unsupported', structure: 'parse', message: '待实现' }
}
export function generateCode(_dsl: string, _lang: LangId): ToolResult<string> {
  return { status: 'error', kind: 'unsupported', structure: 'generate', message: '待实现' }
}
export function generateAllCodes(_dsl: string): Record<LangId, string> {
  return { java: '', python: '', shell: '', http: '', go: '', node: '' }
}
