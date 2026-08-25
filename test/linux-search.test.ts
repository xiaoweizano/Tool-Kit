import { describe, it, expect } from 'vitest'
import { LINUX_ENTRIES, searchLinux } from '@tools/linux-manual/data/index'

describe('searchLinux', () => {
  it('空 query + all 返回全部(>=500)', () => { expect(searchLinux('', 'all').length).toBeGreaterThanOrEqual(500) })
  it('按名称过滤', () => { expect(searchLinux('grep', 'all').some((e) => e.name === 'grep')).toBe(true) })
  it('按分类过滤', () => { expect(searchLinux('', 'archive').every((e) => e.category === 'archive')).toBe(true) })
  it('汇总按名称排序', () => {
    const names = LINUX_ENTRIES.map((e) => e.name)
    expect([...names].sort()).toEqual(names)
  })
})
