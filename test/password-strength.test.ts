import { describe, it, expect } from 'vitest'
import { analyzeStrength, improvePassword } from '@tools/password-strength/transform'

describe('analyzeStrength', () => {
  it('弱密码 <40, 命中纯数字/顺序', () => {
    const r = analyzeStrength('123456')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.score).toBeLessThan(40)
      expect(r.data.level).toBe('weak')
    }
  })
  it('强密码 >70, 命中全字符集/长 >12', () => {
    const r = analyzeStrength('Xk9#mQ@zV2$pL5nW')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.score).toBeGreaterThan(70)
      expect(r.data.level).toBe('strong')
    }
  })
  it('空输入返回 invalid-input', () => {
    const r = analyzeStrength('')
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
  it('reports which charsets are present', () => {
    const r = analyzeStrength('Abc123!')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.charsets).toEqual({ lower: true, upper: true, digit: true, symbol: true })
    }
    const r2 = analyzeStrength('abc')
    expect(r2.status).toBe('ok')
    if (r2.status === 'ok') {
      expect(r2.data.charsets).toEqual({ lower: true, upper: false, digit: false, symbol: false })
    }
  })
})

describe('improvePassword', () => {
  it('改造输入到 strong:保留 base,补全 4 字符集+长度', () => {
    const r = improvePassword('mypassword2024', { targetLevel: 'strong' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.length).toBeGreaterThanOrEqual(12)
      expect(/[a-z]/.test(r.data)).toBe(true)
      expect(/[A-Z]/.test(r.data)).toBe(true)
      expect(/[0-9]/.test(r.data)).toBe(true)
      expect(/[^a-zA-Z0-9]/.test(r.data)).toBe(true)
      expect(r.data.length).toBeGreaterThanOrEqual('mypassword2024'.length) // 非随机,是改造输入
      const a = analyzeStrength(r.data)
      if (a.status === 'ok') expect(a.data.level).toBe('strong')
    }
  })
  it('改造输入到 medium(至少不再是弱)', () => {
    const r = improvePassword('123', { targetLevel: 'medium' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { const a = analyzeStrength(r.data); if (a.status === 'ok') expect(a.data.level).not.toBe('weak') }
  })
  it('excludeChars 排除字符不出现在结果', () => {
    const r = improvePassword('zzzzzzzz', { targetLevel: 'strong', excludeChars: '0Ol1' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(/[0Ol1]/.test(r.data)).toBe(false)
  })
  it('空输入返回 invalid-input', () => {
    const r = improvePassword('', { targetLevel: 'medium' })
    expect(r.status).toBe('error'); if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
  it('改造 Wang123456! 到 strong(打散连续段/键盘序列后≥强)', () => {
    const r = improvePassword('Wang123456!', { targetLevel: 'strong' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const a = analyzeStrength(r.data)
      if (a.status === 'ok') expect(a.data.level).toBe('strong')
      expect(a.status === 'ok' ? a.data.score : 0).toBeGreaterThan(70)
      expect(/[^a-zA-Z0-9]/.test(r.data)).toBe(true)   // all 4 charsets
      expect(/[A-Z]/.test(r.data)).toBe(true)
      expect(/[a-z]/.test(r.data)).toBe(true)
      expect(/[0-9]/.test(r.data)).toBe(true)
    }
  })
})
