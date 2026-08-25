import { describe, it, expect } from 'vitest'
import { convertTimestamp, detectUnit } from '@tools/date-converter/transform'

describe('detectUnit', () => {
  it('10 位为秒', () => { expect(detectUnit('1706504000')).toBe('s') })
  it('13 位为毫秒', () => { expect(detectUnit('1706504000123')).toBe('ms') })
  it('16 位为微秒', () => { expect(detectUnit('1706504000123456')).toBe('us') })
  it('含字母为日期串', () => { expect(detectUnit('2024-01-01T00:00:00Z')).toBe('date') })
  it('非数字非日期 → unknown', () => { expect(detectUnit('hello')).toBe('unknown') })
})

describe('convertTimestamp 秒', () => {
  const r = convertTimestamp('0')
  it('返回 ok', () => { expect(r.status).toBe('ok') })
  it('包含 epoch 各视图', () => {
    if (r.status === 'ok') {
      expect(r.data).toContain('检测精度:秒 (s)')
      expect(r.data).toContain('ISO:')
      expect(r.data).toContain('本地时间:')
      expect(r.data).toContain('UTC 时间:')
      expect(r.data).toContain('Unix 秒:0')
      expect(r.data).toContain('Unix 毫秒:0')
    }
  })
})

describe('convertTimestamp 毫秒/微秒', () => {
  it('毫秒正确换算', () => {
    const r = convertTimestamp('1706504000123')
    if (r.status === 'ok') expect(r.data).toContain('Unix 秒:1706504000')
  })
})

describe('convertTimestamp 日期串互转', () => {
  it('ISO 日期串 → unix 秒', () => {
    const r = convertTimestamp('1970-01-01T00:00:00.000Z')
    if (r.status === 'ok') { expect(r.data).toContain('Unix 秒:0'); expect(r.data).toContain('检测精度:日期串 (date)') }
  })
})

describe('convertTimestamp 非法输入', () => {
  it('未知串 → error invalid-input', () => {
    const r = convertTimestamp('not-a-date')
    expect(r.status).toBe('error')
    if (r.status === 'error') { expect(r.kind).toBe('invalid-input'); expect(typeof r.message).toBe('string') }
  })
})

describe('convertTimestamp 互转辅助纯函数', () => {
  it('dateStrToUnix 返回秒', async () => {
    const { dateStrToUnix } = await import('@tools/date-converter/transform')
    expect(dateStrToUnix('1970-01-01T00:00:00.000Z')).toBe(0)
  })
})
