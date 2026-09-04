import { describe, it, expect } from 'vitest'
import { buildQueryDsl, parseQueryDsl, generateCode } from '@tools/es-query-builder/transform'
import type { EsQueryState, LangId } from '@tools/es-query-builder/types'

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
    if (r.status === 'error' && r.kind === 'invalid-input') { expect(r.position).toBeTypeOf('number') }
  })
  it('range 转 range 条件', () => {
    const r = parseQueryDsl(JSON.stringify({ query: { range: { price: { gte: 100, lt: 200 } } } }))
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data.rootCondition).toMatchObject({ field: 'price', op: 'range', value: { gte: 100, lt: 200 } })
  })
  it('terms 转 in 条件', () => {
    const r = parseQueryDsl(JSON.stringify({ query: { terms: { category: ['a', 'b'] } } }))
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data.rootCondition).toMatchObject({ field: 'category', op: 'in', value: ['a', 'b'] })
  })
  it('build→parse 语义一致', () => {
    const root: EsQueryState['rootCondition'] = {
      id: 'root', field: '', op: 'eq', value: '', logic: 'and', children: [
        { id: 'c1', field: 'status', op: 'eq', value: 'active' },
        { id: 'c2', field: 'price', op: 'gt', value: '100', fieldType: 'integer' }
      ]
    }
    const built = buildQueryDsl(state(root))
    if (built.status !== 'ok') throw new Error('build failed')
    const parsed = parseQueryDsl(built.data)
    expect(parsed.status).toBe('ok')
    if (parsed.status === 'ok') {
      const rebuilt = buildQueryDsl(state({ ...parsed.data.rootCondition, ...{ logic: 'and' } }))
      expect(rebuilt.status).toBe('ok')
      if (rebuilt.status === 'ok') expect(JSON.parse(rebuilt.data).query).toEqual(JSON.parse(built.data).query)
    }
  })
})

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
    if (r.status === 'ok') { expect(r.data).toContain('client.search'); expect(r.data).not.toContain('async ') }
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
    if (r.status === 'ok') { expect(r.data).toContain('go-elasticsearch'); expect(r.data).toContain('SearchRequest') }
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

describe('buildQueryDsl 空字段叶子', () => {
  it('过滤字段为空的同级条件,不再产出 {"term":{"":"value"}}', () => {
    const r = buildQueryDsl(state({
      id: 'root', field: '', op: 'eq', value: '', logic: 'and', children: [
        { id: 'a', field: 'name', op: 'eq', value: 'x' },
        { id: 'b', field: '', op: 'eq', value: 'y' },
      ],
    }))
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(JSON.parse(r.data).query).toEqual({ bool: { must: [{ term: { name: 'x' } }] } })
    }
  })
  it('全部叶子字段为空时报「至少需要一个条件」', () => {
    const r = buildQueryDsl(state({ id: 'root', field: '', op: 'eq', value: '', children: [{ id: 'a', field: '', op: 'eq', value: 'y' }] }))
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
})
