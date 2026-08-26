import { describe, it, expect } from 'vitest'
import { parseInput, applyOperation, formatOutput, batchTransform } from '@tools/batch-transform/transform'

describe('parseInput 混合解析', () => {
  it('每行一个', () => { expect(parseInput('a\nb\nc')).toEqual(['a', 'b', 'c']) })
  it('逗号(中英)', () => { expect(parseInput('a, b，c')).toEqual(['a', 'b', 'c']) })
  it('混合并保留空串(由去空行操作处理)', () => { expect(parseInput('a,\nb')).toEqual(['a', '', 'b']) })
})

describe('applyOperation 各操作', () => {
  const v = ['abc', '123']
  it('包裹五式', () => {
    expect(applyOperation(v, { id: 'wrap-squote' })).toEqual(["'abc'", "'123'"])
    expect(applyOperation(v, { id: 'wrap-dquote' })).toEqual(['"abc"', '"123"'])
    expect(applyOperation(v, { id: 'wrap-backtick' })).toEqual(['`abc`', '`123`'])
    expect(applyOperation(v, { id: 'wrap-paren' })).toEqual(['(abc)', '(123)'])
    expect(applyOperation(v, { id: 'wrap-bracket' })).toEqual(['[abc]', '[123]'])
  })
  it('前后缀', () => {
    expect(applyOperation(['x'], { id: 'affix', params: { prefix: 'pre-', suffix: '-suf' } })).toEqual(['pre-x-suf'])
  })
  it('去特殊字符(默认保留字母数字汉字与自定义保留集)', () => {
    expect(applyOperation(['a!b@c'], { id: 'strip-special' })).toEqual(['abc'])
    expect(applyOperation(['a.b#c'], { id: 'strip-special', params: { keep: '#' } })).toEqual(['ab#c'])
  })
  it('截取长度(前/后)', () => {
    expect(applyOperation(['abcdef'], { id: 'truncate', params: { len: 3 } })).toEqual(['abc'])
    expect(applyOperation(['abcdef'], { id: 'truncate', params: { len: 3, from: 'end' } })).toEqual(['def'])
  })
  it('trim/去空行/去重/排序', () => {
    expect(applyOperation([' a ', ''], { id: 'trim' })).toEqual(['a', ''])
    expect(applyOperation(['a', '', 'b'], { id: 'drop-empty' })).toEqual(['a', 'b'])
    expect(applyOperation(['a', 'b', 'a'], { id: 'dedupe' })).toEqual(['a', 'b'])
    expect(applyOperation(['b', 'a'], { id: 'sort-dict' })).toEqual(['a', 'b'])
    expect(applyOperation(['10', '2'], { id: 'sort-num' })).toEqual(['2', '10'])
  })
  it('大小写/全半角/编号', () => {
    expect(applyOperation(['aB'], { id: 'upper' })).toEqual(['AB'])
    expect(applyOperation(['aB'], { id: 'lower' })).toEqual(['ab'])
    expect(applyOperation(['１Ａ'], { id: 'width-normalize' })).toEqual(['1A'])
    expect(applyOperation(['a', 'b'], { id: 'numbering' })).toEqual(['1. a', '2. b'])
    expect(applyOperation(['a', 'b'], { id: 'numbering', params: { sep: '、' } })).toEqual(['1、a', '2、b'])
  })
  it('URL/Base64(中文安全)', () => {
    expect(applyOperation(['中 a'], { id: 'url-encode' })).toEqual(['%E4%B8%AD%20a'])
    const b = applyOperation(['中文'], { id: 'b64-encode' })
    expect(applyOperation(b, { id: 'b64-decode' })).toEqual(['中文'])
  })
})

describe('formatOutput 五格式', () => {
  it('逗号/JSON/SQL IN/换行/自定义', () => {
    const v = ["'a'", "'b'"]
    expect(formatOutput(v, 'comma')).toEqual("'a', 'b'")
    expect(formatOutput(v, 'json')).toEqual('["\'a\'","\'b\'"]')
    expect(formatOutput(v, 'sql-in')).toEqual("('a', 'b')")
    expect(formatOutput(v, 'newline')).toEqual("'a'\n'b'")
    expect(formatOutput(v, 'custom', ' | ')).toEqual("'a' | 'b'")
  })
})

describe('batchTransform 管线集成', () => {
  it('顺序即应用顺序:去特殊字符→单引号包裹→SQL IN', () => {
    const ops = [{ id: 'strip-special' }, { id: 'wrap-squote' }]
    const r = batchTransform({ raw: 'a!b, c@d', opsJson: JSON.stringify(ops), format: 'sql-in', customSep: '' })
    expect(r).toEqual({ status: 'ok', data: "('ab', 'cd')" })
  })
  it('空输入 → error', () => {
    expect(batchTransform({ raw: '  ', opsJson: '[]', format: 'comma', customSep: '' }).status).toBe('error')
  })
})
