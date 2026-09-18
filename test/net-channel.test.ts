import { describe, it, expect } from 'vitest'
import { classifyFetchError, computeBodyBytes, DEFAULT_TIMEOUT_MS } from '@core/net-channel'

describe('classifyFetchError', () => {
  it('AbortError+user-cancel → aborted', () => {
    const e = Object.assign(new Error('canceled'), { name: 'AbortError' })
    expect(classifyFetchError(e).kind).toBe('aborted')
  })
  it('TimeoutError → timeout', () => {
    expect(classifyFetchError(Object.assign(new Error('t'), { name: 'TimeoutError' })).kind).toBe('timeout')
  })
  it('普通 TypeError(Failed to fetch) → network', () => {
    expect(classifyFetchError(Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' })).kind).toBe('network')
  })
  it('其他 → other', () => {
    expect(classifyFetchError(new Error('weird')).kind).toBe('other')
  })
})

describe('computeBodyBytes', () => {
  it('优先 Content-Length', () => { expect(computeBodyBytes('42', 'x')).toBe(42) })
  it('缺失按 UTF-8 字节数(中文 3 字节)', () => { expect(computeBodyBytes(null, '测试')).toBe(6) })
  it('DEFAULT_TIMEOUT_MS=15000', () => { expect(DEFAULT_TIMEOUT_MS).toBe(15000) })
})
