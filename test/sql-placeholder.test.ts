import { describe, it, expect } from 'vitest'
import { fillPlaceholders, autoFillDefaults, unfillLiterals, formatSql } from '@tools/sql-placeholder/transform'

describe('fillPlaceholders 基础替换', () => {
  it('字符串值加引号并转义', () => {
    const r = fillPlaceholders({ sql: "SELECT * FROM t WHERE a=? AND b=?", params: ["O'Brien", "2"] })
    expect(r).toEqual({ status: 'ok', data: "SELECT * FROM t WHERE a='O''Brien' AND b=2" })
  })
  it('数字/bool/null 原样', () => {
    expect(fillPlaceholders({ sql: 'a=? b=? c=?', params: ['1', 'true', 'null'] })).toEqual({ status: 'ok', data: 'a=1 b=true c=null' })
  })
  it('参数不足保留 ?', () => {
    const r = fillPlaceholders({ sql: 'a=? b=?', params: ['1'] })
    expect(r.status).toBe('error')
    if (r.status === 'error') {
      expect(r.kind).toBe('partial')
      if (r.kind === 'partial') expect(r.failedItems).toEqual([1])
    }
  })
})

describe('autoFillDefaults', () => {
  it('为每个 ? 生成字符串默认值', () => {
    expect(autoFillDefaults('a=? b=?')).toEqual(["'arg_1'", "'arg_2'"])
  })
})

describe('unfillLiterals 反向', () => {
  it("把 'xx' 和数字换回 ?", () => {
    expect(unfillLiterals("a='x' b=2")).toEqual({ status: 'ok', data: 'a=? b=?' })
  })
})

describe('formatSql', () => {
  it('压多空格并关键字换行', () => {
    const r = formatSql('select  a,  b  from t where  a=1')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { expect(r.data).toContain('FROM'); expect(r.data).not.toContain('  from ') }
  })
})
