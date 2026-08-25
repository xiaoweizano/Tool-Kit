import { describe, it, expect } from 'vitest'
import { CATEGORIES } from '@tools/linux-manual/data/types'
import { catFilesDirEntries } from '@tools/linux-manual/data/cat-files-dir'
import { catTextEntries } from '@tools/linux-manual/data/cat-text'
import { catFindEntries } from '@tools/linux-manual/data/cat-find'
import { catProcessEntries } from '@tools/linux-manual/data/cat-process'
import { catNetworkEntries } from '@tools/linux-manual/data/cat-network'

describe('linux 数据批 A(5 类)', () => {
  it('每类 50 条', () => {
    expect(catFilesDirEntries).toHaveLength(50)
    expect(catTextEntries).toHaveLength(50)
    expect(catFindEntries).toHaveLength(50)
    expect(catProcessEntries).toHaveLength(50)
    expect(catNetworkEntries).toHaveLength(50)
  })
  it('条目 schema 完整(id/name/desc/category 非空, category 属 CATEGORIES)', () => {
    for (const e of [...catFilesDirEntries, ...catTextEntries, ...catFindEntries, ...catProcessEntries, ...catNetworkEntries]) {
      expect(typeof e.id).toBe('string')
      expect(e.id.length).toBeGreaterThan(0)
      expect(typeof e.name).toBe('string')
      expect(e.name.length).toBeGreaterThan(0)
      expect(e.desc.length).toBeGreaterThan(0)
      expect(CATEGORIES).toContain(e.category)
      if (e.options) e.options.forEach((o) => { expect(o.flag.length).toBeGreaterThan(0); expect(o.desc.length).toBeGreaterThan(0) })
      if (e.examples) e.examples.forEach((ex) => expect(ex.length).toBeGreaterThan(0))
    }
  })
  it('id 唯一', () => {
    const all = [...catFilesDirEntries, ...catTextEntries, ...catFindEntries, ...catProcessEntries, ...catNetworkEntries].map((e) => e.id)
    expect(new Set(all).size).toBe(all.length)
  })
})
