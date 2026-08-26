import { describe, it, expect } from 'vitest'
import { uuidV4, generateIds } from '@tools/id-generator/transform'

describe('uuidV4', () => {
  it('格式与版本位', () => {
    const u = uuidV4()
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
  it('两次不同', () => { expect(uuidV4()).not.toBe(uuidV4()) })
})

describe('generateIds', () => {
  it('uuid 批量按数量', () => {
    const r = generateIds('uuid', 5)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data.split('\n').filter(Boolean)).toHaveLength(5)
  })
  it('sequence 递增', () => {
    const r = generateIds('sequence', 3)
    if (r.status === 'ok') {
      const ids = r.data.split('\n').filter(Boolean)
      expect(Number(ids[1])).toBe(Number(ids[0]) + 1)
      expect(Number(ids[2])).toBe(Number(ids[0]) + 2)
    }
  })
  it('prefix 前缀', () => {
    const before = generateIds('sequence', 1)
    const r = generateIds('sequence', 2, { prefix: 't_' })
    if (before.status === 'ok' && r.status === 'ok') {
      const ids = r.data.split('\n')
      expect(ids[0]).toBe(`t_${Number(before.data) + 1}`)
    }
  })
  it('前缀对 uuid/snowflake 也生效', () => {
    const u = generateIds('uuid', 2, { prefix: 'u_' })
    const s = generateIds('snowflake', 2, { prefix: 's_' })
    if (u.status === 'ok') u.data.split('\n').forEach((x) => expect(x.startsWith('u_')).toBe(true))
    if (s.status === 'ok') s.data.split('\n').forEach((x) => expect(x.startsWith('s_')).toBe(true))
  })
  it('shortcode 定长字母数字', () => {
    const r = generateIds('shortcode', 4, {})
    if (r.status === 'ok') r.data.split('\n').forEach((s) => { expect(s).toMatch(/^[A-Za-z0-9]{8}$/) })
  })
  it('snowflake 每次递增或不同', () => {
    const r = generateIds('snowflake', 3)
    if (r.status === 'ok') {
      const ids = r.data.split('\n').filter(Boolean)
      expect(new Set(ids).size).toBe(3)
      expect(ids[0]).not.toBe(ids[1])
    }
  })
  it('count 上限约束', () => {
    const r = generateIds('uuid', 1000000)
    expect(r.status).toBe('error')
  })
})