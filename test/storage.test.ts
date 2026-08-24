import { describe, it, expect, beforeEach } from 'vitest'
import { storageGet, storageSet } from '@core/storage'

describe('storage 单一出口', () => {
  beforeEach(() => localStorage.clear())
  it('set 后 get 返回同值', () => {
    storageSet('k', { a: 1 })
    expect(storageGet('k', null)).toEqual({ a: 1 })
  })
  it('缺键返回 fallback', () => {
    expect(storageGet('missing', 'fb')).toBe('fb')
  })
})
