import { describe, it, expect } from 'vitest'
import { CATEGORIES } from '@tools/linux-manual/data/types'
import { catFilesDirEntries } from '@tools/linux-manual/data/cat-files-dir'
import { catTextEntries } from '@tools/linux-manual/data/cat-text'
import { catFindEntries } from '@tools/linux-manual/data/cat-find'
import { catProcessEntries } from '@tools/linux-manual/data/cat-process'
import { catNetworkEntries } from '@tools/linux-manual/data/cat-network'
import { catPermissionUserEntries } from '@tools/linux-manual/data/cat-permission-user'
import { catDiskEntries } from '@tools/linux-manual/data/cat-disk'
import { catArchiveEntries } from '@tools/linux-manual/data/cat-archive'
import { catSystemEntries } from '@tools/linux-manual/data/cat-system'
import { catShellPkgEntries } from '@tools/linux-manual/data/cat-shell-pkg'
import { LINUX_ENTRIES } from '@tools/linux-manual/data/index'

const batchA = [catFilesDirEntries, catTextEntries, catFindEntries, catProcessEntries, catNetworkEntries]
const batchB = [catPermissionUserEntries, catDiskEntries, catArchiveEntries, catSystemEntries, catShellPkgEntries]

describe('linux 数据批 A(5 类)', () => {
  it('每类 50 条', () => {
    expect(catFilesDirEntries).toHaveLength(50)
    expect(catTextEntries).toHaveLength(50)
    expect(catFindEntries).toHaveLength(50)
    expect(catProcessEntries).toHaveLength(50)
    expect(catNetworkEntries).toHaveLength(52) // +rz/sz
  })
  it('条目 schema 完整(id/name/desc/category 非空, category 属 CATEGORIES)', () => {
    for (const e of batchA.flat()) {
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
    const all = batchA.flat().map((e) => e.id)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('linux 数据批 B(5 类)', () => {
  it('每类 50 条', () => {
    expect(catPermissionUserEntries).toHaveLength(50)
    expect(catDiskEntries).toHaveLength(50)
    expect(catArchiveEntries).toHaveLength(50)
    expect(catSystemEntries).toHaveLength(50)
    expect(catShellPkgEntries).toHaveLength(50)
  })
  it('条目 schema 完整(id/name/desc/category 非空, category 属 CATEGORIES)', () => {
    for (const e of batchB.flat()) {
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
    const all = batchB.flat().map((e) => e.id)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('linux 数据汇总(全部 10 类)', () => {
  it('总数 >= 500', () => {
    expect(LINUX_ENTRIES.length).toBeGreaterThanOrEqual(500)
  })
  it('按 name 排序', () => {
    const names = LINUX_ENTRIES.map((e) => e.name)
    expect([...names].sort()).toEqual(names)
  })
  it('id 全局唯一', () => {
    const ids = LINUX_ENTRIES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
