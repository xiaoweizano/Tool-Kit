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

describe('自定义格式 formatDate / parseWithFormat', () => {
  it('yyyyMMdd 输出', async () => {
    const { formatDate } = await import('@tools/date-converter/transform')
    expect(formatDate(new Date(2026, 7, 26, 14, 5, 9), 'yyyyMMdd')).toBe('20260826')
  })
  it('全 token 输出', async () => {
    const { formatDate } = await import('@tools/date-converter/transform')
    expect(formatDate(new Date(2026, 7, 26, 14, 5, 9, 123), 'yyyy-MM-dd HH:mm:ss.SSS')).toBe('2026-08-26 14:05:09.123')
  })
  it('短 token 与字面量(yy/M/d H:m:s)', async () => {
    const { formatDate } = await import('@tools/date-converter/transform')
    expect(formatDate(new Date(2026, 0, 2, 3, 4, 5), 'yy/M/d H:m:s')).toBe('26/1/2 3:4:5')
  })
  it('按格式解析 yyyyMMdd', async () => {
    const { parseWithFormat } = await import('@tools/date-converter/transform')
    const d = parseWithFormat('20260826', 'yyyyMMdd')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(7)
    expect(d?.getDate()).toBe(26)
  })
  it('按格式解析含时分秒', async () => {
    const { parseWithFormat } = await import('@tools/date-converter/transform')
    const d = parseWithFormat('2026/08/26 09:30:00', 'yyyy/MM/dd HH:mm:ss')
    expect(d?.getHours()).toBe(9)
    expect(d?.getMinutes()).toBe(30)
  })
  it('非法月份解析失败返回 null', async () => {
    const { parseWithFormat } = await import('@tools/date-converter/transform')
    expect(parseWithFormat('20261301', 'yyyyMMdd')).toBeNull()
  })
})

describe('convertTimestamp 自定义格式视图与互转', () => {
  it('标准日期输入 + format 输出自定义行', () => {
    const r = convertTimestamp('2026-08-26', { format: 'yyyyMMdd' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data).toContain('自定义格式:20260826')
  })
  it('自定义格式输入可被解析互转(非标准日期串)', () => {
    const r = convertTimestamp('20260826', { format: 'yyyyMMdd' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('自定义格式:20260826')
      expect(r.data).toContain('Unix 秒:')
    }
  })
  it('无 format 时行为不变(无自定义行)', () => {
    const r = convertTimestamp('0')
    if (r.status === 'ok') expect(r.data).not.toContain('自定义格式')
  })
})

describe('convertTimestamp 互转辅助纯函数', () => {
  it('dateStrToUnix 返回秒', async () => {
    const { dateStrToUnix } = await import('@tools/date-converter/transform')
    expect(dateStrToUnix('1970-01-01T00:00:00.000Z')).toBe(0)
  })
})
