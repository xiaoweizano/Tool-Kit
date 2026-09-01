import { describe, it, expect } from 'vitest'
import { analyzeStrength } from '@tools/password-strength/transform'

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
})
