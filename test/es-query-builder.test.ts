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
