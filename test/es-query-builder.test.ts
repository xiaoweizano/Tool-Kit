import { describe, it, expect } from 'vitest'
import { buildQueryDsl } from '@tools/es-query-builder/transform'
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
